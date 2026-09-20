#include <Arduino.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <ctype.h>
#include <string.h>

#include "Plant8Types.h"
#include "PlantLogic.h"

using namespace plant8;

namespace {
constexpr char FIRMWARE_VERSION[] = "0.4.0";
constexpr char EXPO_PUSH_URL[] = "https://exp.host/--/api/v2/push/send";
constexpr char DEVICE_HOSTNAME[] = "platio";
constexpr char SETUP_AP_PASSWORD[] = "platiosetup";

constexpr uint8_t ADC_PIN = 34; // ADC1, compatible with active Wi-Fi on ESP32.
constexpr uint8_t MUX_S0 = 16;
constexpr uint8_t MUX_S1 = 17;
constexpr uint8_t MUX_S2 = 18;
constexpr uint8_t MUX_S3 = 19;
constexpr uint8_t MUX_EN = 23;  // CD74HC4067 EN is active LOW.

constexpr uint32_t READ_INTERVAL_MS = 5UL * 60UL * 1000UL;
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 30000;
constexpr uint8_t SAMPLE_COUNT = 15;
constexpr uint8_t DISCARD_READS = 3;
constexpr uint16_t MUX_SETTLE_MS = 8;
constexpr uint16_t BETWEEN_SAMPLES_MS = 3;
constexpr uint16_t ADC_MIN_HEALTHY = 50;
constexpr uint16_t ADC_MAX_HEALTHY = 4040;

DeviceConfig config;
PlantRuntime runtimeData[PLANT_COUNT];
Preferences prefs;
WebServer server(80);
DNSServer dnsServer;

uint32_t lastReadAt = 0;
uint32_t lastWifiAttemptAt = 0;
bool accessPointMode = false;
bool mdnsReady = false;

const char DASHBOARD_HTML[] PROGMEM = R"HTML(
<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PlatIO</title>
<style>:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#173b29;background:#f4f7f4}body{margin:0;padding:22px;max-width:760px;margin:auto}.card{background:#fff;border:1px solid #dfe9e1;border-radius:18px;padding:18px;margin:14px 0}h1{margin-bottom:4px}.muted{color:#6c7b70}.ok{color:#187a46}.warn{color:#9b6a00}.dry{color:#ad2d2d}button,input{font:inherit;border-radius:10px;padding:10px;border:1px solid #ccd8cf}button{background:#173f2b;color:white;border:0;cursor:pointer}.row{display:flex;gap:8px;flex-wrap:wrap}.row>*{flex:1}</style>
</head><body>
<h1>🌱 PlatIO</h1><p class="muted">Panel técnico de respaldo. La experiencia principal vive en la app PlatIO.</p>
<div id="plants"></div>
<div class="card"><h3>Wi‑Fi</h3><div class="row"><input id="ssid" placeholder="Nombre de red"><input id="wifiPass" type="password" placeholder="Contraseña"></div><p><button onclick="saveWifi()">Guardar Wi‑Fi</button></p><p id="push" class="muted">Notificaciones de app: comprobando…</p></div>
<script>
const labels={OK:'Está cómoda',WARNING:'Se está secando',NEEDS_WATER:'Le vendría bien agua hoy',UNCALIBRATED:'Aprendiendo esta maceta'};
async function api(url,opt){const r=await fetch(url,opt);if(!r.ok)throw new Error(await r.text());return r.headers.get('content-type')?.includes('json')?r.json():r.text()}
async function refresh(){const d=await api('/api/status');document.getElementById('ssid').value=d.ssid||'';document.getElementById('push').textContent=d.pushConfigured?'Notificaciones de app: listas ✅':'Notificaciones de app: falta vincular la app';document.getElementById('plants').innerHTML=d.plants.map(p=>`<div class="card"><b>${p.name}</b><p class="${p.state==='OK'?'ok':p.state==='NEEDS_WATER'?'dry':'warn'}">${labels[p.state]||p.state}</p><small class="muted">Sensor ${p.healthy?'conectado':'para revisar'} · canal ${p.channel}</small></div>`).join('')}
async function saveWifi(){const body=new URLSearchParams({ssid:document.getElementById('ssid').value,password:document.getElementById('wifiPass').value});alert(await api('/api/network',{method:'POST',body}))}
refresh();setInterval(refresh,30000);
</script></body></html>
)HTML";

void copyString(char *dst, size_t size, const String &src) {
  if (size == 0) return;
  src.substring(0, size - 1).toCharArray(dst, size);
  dst[size - 1] = '\0';
}

String jsonEscape(const char *text) {
  String out;
  while (*text) {
    const char c = *text++;
    if (c == '\\' || c == '"') { out += '\\'; out += c; }
    else if (c == '\n') out += "\\n";
    else if (static_cast<uint8_t>(c) >= 0x20) out += c;
  }
  return out;
}

void setDefaultConfig() {
  memset(&config, 0, sizeof(config));
  config.version = CONFIG_VERSION;
  for (uint8_t i = 0; i < PLANT_COUNT; ++i) {
    snprintf(config.plants[i].name, sizeof(config.plants[i].name), "Planta %u", i + 1);
    config.plants[i].muxChannel = i;
    config.plants[i].enabled = true;
    config.plants[i].calibrated = false;
    config.plants[i].thresholds = Thresholds{};
  }
}

bool saveConfig() {
  if (!prefs.begin("plant8", false)) return false;
  const size_t written = prefs.putBytes("config", &config, sizeof(config));
  prefs.end();
  return written == sizeof(config);
}

void loadConfig() {
  bool valid = false;
  if (prefs.begin("plant8", true)) {
    if (prefs.getBytesLength("config") == sizeof(config)) {
      prefs.getBytes("config", &config, sizeof(config));
      valid = config.version == CONFIG_VERSION;
    }
    prefs.end();
  }
  if (!valid) {
    setDefaultConfig();
    saveConfig();
  }
}

void selectMuxChannel(uint8_t channel) {
  channel &= 0x0F;
  digitalWrite(MUX_S0, (channel & 0x01) ? HIGH : LOW);
  digitalWrite(MUX_S1, (channel & 0x02) ? HIGH : LOW);
  digitalWrite(MUX_S2, (channel & 0x04) ? HIGH : LOW);
  digitalWrite(MUX_S3, (channel & 0x08) ? HIGH : LOW);
}

void sortSamples(uint16_t *samples, uint8_t count) {
  for (uint8_t i = 1; i < count; ++i) {
    const uint16_t key = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > key) {
      samples[j + 1] = samples[j];
      --j;
    }
    samples[j + 1] = key;
  }
}

uint16_t readMuxMedian(uint8_t channel) {
  selectMuxChannel(channel);
  delay(MUX_SETTLE_MS);
  for (uint8_t i = 0; i < DISCARD_READS; ++i) {
    (void)analogRead(ADC_PIN);
    delay(2);
  }
  uint16_t samples[SAMPLE_COUNT];
  for (uint8_t i = 0; i < SAMPLE_COUNT; ++i) {
    samples[i] = static_cast<uint16_t>(analogRead(ADC_PIN));
    delay(BETWEEN_SAMPLES_MS);
  }
  sortSamples(samples, SAMPLE_COUNT);
  return samples[SAMPLE_COUNT / 2];
}

float applyEma(float previous, float current) {
  constexpr float alpha = 0.35f;
  return previous < 0.0f ? current : previous + alpha * (current - previous);
}

bool pushConfigured() {
  const String token(config.expoPushToken);
  return token.length() >= 20 && token.length() < sizeof(config.expoPushToken) &&
         token.indexOf("PushToken[") >= 0;
}

bool sendAppNotification(const String &title, const String &body, const String &plantName,
                         const char *state, float moisturePercent) {
  if (WiFi.status() != WL_CONNECTED || !pushConfigured()) return false;

  WiFiClientSecure client;
  client.setInsecure(); // MVP. Production should validate the CA chain.
  HTTPClient http;
  if (!http.begin(client, EXPO_PUSH_URL)) return false;
  http.addHeader("Content-Type", "application/json");

  String payload;
  payload.reserve(700);
  payload += "{\"to\":\"";
  payload += jsonEscape(config.expoPushToken);
  payload += "\",\"sound\":\"default\",\"title\":\"";
  payload += jsonEscape(title.c_str());
  payload += "\",\"body\":\"";
  payload += jsonEscape(body.c_str());
  payload += "\",\"data\":{\"plant\":\"";
  payload += jsonEscape(plantName.c_str());
  payload += "\",\"state\":\"";
  payload += jsonEscape(state);
  payload += "\",\"moisture\":";
  payload += String(moisturePercent, 1);
  payload += "}}";

  const int code = http.POST(payload);
  const String response = http.getString();
  Serial.printf("Expo Push HTTP %d: %s\n", code, response.c_str());
  http.end();
  return code >= 200 && code < 300;
}

bool sendNeedsWaterNotification(const PlantConfig &p, float moisturePercent) {
  return sendAppNotification(String("💧 ") + p.name + " pide agua",
                             "Hoy es un buen momento para regarla.",
                             String(p.name), "NEEDS_WATER", moisturePercent);
}

bool sendRecoveredNotification(const PlantConfig &p, float moisturePercent) {
  return sendAppNotification(String("🌿 ") + p.name + " quedó bien",
                             "Listo, volvió a estar bien hidratada.",
                             String(p.name), "RECOVERED", moisturePercent);
}

void samplePlant(uint8_t index, bool allowNotifications) {
  PlantConfig &p = config.plants[index];
  PlantRuntime &r = runtimeData[index];
  if (!p.enabled || p.muxChannel >= MUX_CAPACITY) return;

  r.raw = readMuxMedian(p.muxChannel);
  r.sensorHealthy = r.raw >= ADC_MIN_HEALTHY && r.raw <= ADC_MAX_HEALTHY;
  if (!r.sensorHealthy) {
    r.percent = -1.0f;
    r.emaPercent = -1.0f;
    r.logic = RuntimeState{};
    return;
  }

  if (p.calibrated && validCalibration(p.dryRaw, p.wetRaw)) {
    r.percent = rawToPercent(r.raw, p.dryRaw, p.wetRaw);
    r.emaPercent = applyEma(r.emaPercent, r.percent);
  } else {
    p.calibrated = false;
    r.percent = -1.0f;
    r.emaPercent = -1.0f;
  }

  const UpdateResult update = updateState(r.logic, r.emaPercent, p.thresholds, p.calibrated);
  if (!allowNotifications) return;

  // Retry on later scan cycles if Wi-Fi/push delivery was unavailable.
  if (r.logic.state == PlantState::NeedsWater && !r.alertSent) {
    if (sendNeedsWaterNotification(p, r.emaPercent)) r.alertSent = true;
  }
  if (r.logic.state != PlantState::NeedsWater && r.alertSent) {
    if (sendRecoveredNotification(p, r.emaPercent)) r.alertSent = false;
  }
}

void sampleAllPlants(bool allowNotifications) {
  for (uint8_t i = 0; i < PLANT_COUNT; ++i) samplePlant(i, allowNotifications);
}

String statusJson() {
  String json;
  json.reserve(3500);
  json += "{\"firmware\":\"" + String(FIRMWARE_VERSION) + "\",";
  json += "\"wifi\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  json += "\"ip\":\"" + String(accessPointMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString()) + "\",";
  json += "\"ssid\":\"" + jsonEscape(config.wifiSsid) + "\",";
  json += "\"pushConfigured\":" + String(pushConfigured() ? "true" : "false") + ",";
  json += "\"plants\":[";
  for (uint8_t i = 0; i < PLANT_COUNT; ++i) {
    if (i) json += ',';
    const PlantConfig &p = config.plants[i];
    const PlantRuntime &r = runtimeData[i];
    json += "{\"index\":" + String(i) + ",";
    json += "\"name\":\"" + jsonEscape(p.name) + "\",";
    json += "\"channel\":" + String(p.muxChannel) + ",";
    json += "\"enabled\":" + String(p.enabled ? "true" : "false") + ",";
    json += "\"calibrated\":" + String(p.calibrated ? "true" : "false") + ",";
    json += "\"healthy\":" + String(r.sensorHealthy ? "true" : "false") + ",";
    json += "\"raw\":" + String(r.raw) + ",";
    json += "\"percent\":" + String(r.emaPercent < 0 ? 0 : r.emaPercent, 1) + ",";
    json += "\"state\":\"" + String(stateName(r.logic.state)) + "\",";
    json += "\"dryRaw\":" + String(p.dryRaw) + ",\"wetRaw\":" + String(p.wetRaw) + ",";
    json += "\"dry\":" + String(p.thresholds.dryPercent, 0) + ",";
    json += "\"warning\":" + String(p.thresholds.warningPercent, 0) + ",";
    json += "\"recovery\":" + String(p.thresholds.recoveryPercent, 0) + "}";
  }
  json += "]}";
  return json;
}

bool parsePlantIndex(int &index) {
  if (!server.hasArg("index")) return false;
  index = server.arg("index").toInt();
  return index >= 0 && index < PLANT_COUNT;
}

void setupWebRoutes() {
  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html; charset=utf-8", DASHBOARD_HTML); });
  server.on("/api/status", HTTP_GET, []() { server.send(200, "application/json", statusJson()); });

  server.on("/api/plant", HTTP_POST, []() {
    int index;
    if (!parsePlantIndex(index)) { server.send(400, "text/plain", "Índice inválido"); return; }
    PlantConfig &p = config.plants[index];
    if (server.hasArg("name") && server.arg("name").length()) copyString(p.name, sizeof(p.name), server.arg("name"));
    const float dry = server.arg("dry").toFloat();
    const float warning = server.arg("warning").toFloat();
    const float recovery = server.arg("recovery").toFloat();
    if (!(dry >= 0 && dry <= 100 && warning >= dry && warning <= 100 && recovery > dry && recovery <= 100)) {
      server.send(400, "text/plain", "Umbrales inválidos"); return;
    }
    p.thresholds.dryPercent = dry;
    p.thresholds.warningPercent = warning;
    p.thresholds.recoveryPercent = recovery;
    saveConfig();
    server.send(200, "text/plain", "Guardado");
  });

  server.on("/api/calibrate", HTTP_POST, []() {
    int index;
    if (!parsePlantIndex(index) || !server.hasArg("mode")) { server.send(400, "text/plain", "Solicitud inválida"); return; }
    const String mode = server.arg("mode");
    if (mode != "dry" && mode != "wet") { server.send(400, "text/plain", "Modo inválido"); return; }
    PlantConfig &p = config.plants[index];
    const uint16_t raw = readMuxMedian(p.muxChannel);
    if (raw < ADC_MIN_HEALTHY || raw > ADC_MAX_HEALTHY) { server.send(400, "text/plain", "Lectura fuera de rango; revisá el sensor"); return; }
    if (mode == "dry") p.dryRaw = raw; else p.wetRaw = raw;
    p.calibrated = validCalibration(p.dryRaw, p.wetRaw);
    runtimeData[index] = PlantRuntime{};
    saveConfig();
    samplePlant(index, false);
    server.send(200, "text/plain", p.calibrated ? "Calibración completa guardada" : "Referencia guardada; falta el otro punto de calibración");
  });

  server.on("/api/network", HTTP_POST, []() {
    if (server.hasArg("ssid")) copyString(config.wifiSsid, sizeof(config.wifiSsid), server.arg("ssid"));
    if (server.hasArg("password") && server.arg("password").length()) copyString(config.wifiPassword, sizeof(config.wifiPassword), server.arg("password"));
    saveConfig();
    server.send(200, "text/plain", "Wi‑Fi guardado. PlatIO reiniciará en 2 segundos.");
    delay(2000);
    ESP.restart();
  });

  server.on("/api/push/register", HTTP_POST, []() {
    if (!server.hasArg("token")) { server.send(400, "text/plain", "Falta token"); return; }
    const String token = server.arg("token");
    if (token.length() < 20 || token.length() >= sizeof(config.expoPushToken) || token.indexOf("PushToken[") < 0) {
      server.send(400, "text/plain", "Token push inválido");
      return;
    }
    copyString(config.expoPushToken, sizeof(config.expoPushToken), token);
    saveConfig();
    server.send(200, "text/plain", "App vinculada");
  });

  server.on("/api/push/test", HTTP_POST, []() {
    if (!pushConfigured()) { server.send(400, "text/plain", "Primero vinculá la app PlatIO"); return; }
    const bool sent = sendAppNotification("🌱 PlatIO está conectado", "Las notificaciones están listas.", "PlatIO", "TEST", 0.0f);
    server.send(sent ? 200 : 500, "text/plain", sent ? "Notificación enviada" : "No se pudo enviar la notificación");
  });

  server.onNotFound([]() {
    if (accessPointMode) {
      server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString(), true);
      server.send(302, "text/plain", "");
    } else {
      server.send(404, "text/plain", "No encontrado");
    }
  });
}

void startAccessPoint() {
  accessPointMode = true;
  WiFi.mode(WIFI_AP_STA);
  const String apName = String("PlatIO-Setup-") + String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX).substring(4);
  WiFi.softAP(apName.c_str(), SETUP_AP_PASSWORD);
  dnsServer.start(53, "*", WiFi.softAPIP());
  Serial.printf("Setup AP: %s / %s / http://%s\n", apName.c_str(), SETUP_AP_PASSWORD, WiFi.softAPIP().toString().c_str());
}

void connectWifiOrSetupAp() {
  if (config.wifiSsid[0] == '\0') {
    startAccessPoint();
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_HOSTNAME);
  WiFi.begin(config.wifiSsid, config.wifiPassword);
  Serial.printf("Conectando a Wi-Fi %s", config.wifiSsid);
  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    accessPointMode = false;
    Serial.printf("Wi-Fi conectado: %s\n", WiFi.localIP().toString().c_str());
    mdnsReady = MDNS.begin(DEVICE_HOSTNAME);
    if (mdnsReady) MDNS.addService("http", "tcp", 80);
  } else {
    Serial.println("No se pudo conectar; iniciando modo de configuración.");
    startAccessPoint();
    lastWifiAttemptAt = millis();
  }
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (accessPointMode) {
      dnsServer.stop();
      WiFi.softAPdisconnect(true);
      accessPointMode = false;
      Serial.printf("Wi-Fi recuperado: %s\n", WiFi.localIP().toString().c_str());
    }
    if (!mdnsReady) {
      mdnsReady = MDNS.begin(DEVICE_HOSTNAME);
      if (mdnsReady) MDNS.addService("http", "tcp", 80);
    }
    return;
  }
  if (config.wifiSsid[0] == '\0' || millis() - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS) return;
  lastWifiAttemptAt = millis();
  WiFi.begin(config.wifiSsid, config.wifiPassword);
}

void setupPins() {
  pinMode(MUX_S0, OUTPUT); pinMode(MUX_S1, OUTPUT); pinMode(MUX_S2, OUTPUT); pinMode(MUX_S3, OUTPUT);
  pinMode(MUX_EN, OUTPUT); digitalWrite(MUX_EN, LOW);
  analogReadResolution(12);
  analogSetPinAttenuation(ADC_PIN, ADC_11db);
}

} // namespace

void setup() {
  Serial.begin(115200);
  delay(400);
  setupPins();
  loadConfig();
  connectWifiOrSetupAp();
  setupWebRoutes();
  server.begin();
  sampleAllPlants(false);
  lastReadAt = millis();
  Serial.printf("PlatIO firmware %s listo.\n", FIRMWARE_VERSION);
}

void loop() {
  if (accessPointMode) dnsServer.processNextRequest();
  server.handleClient();
  maintainWifi();

  const uint32_t now = millis();
  if (now - lastReadAt >= READ_INTERVAL_MS) {
    lastReadAt = now;
    sampleAllPlants(true);
  }
  delay(2);
}
