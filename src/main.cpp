#include <Arduino.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <ctype.h>
#include <string.h>

#include "Plant8Types.h"
#include "PlantLogic.h"

using namespace plant8;

namespace {
constexpr char FIRMWARE_VERSION[] = "0.3.0";
constexpr char META_GRAPH_API_VERSION[] = "v26.0";
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
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PlatIO</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1d2a22;background:#f5f7f5}body{margin:0;padding:18px;max-width:980px;margin:auto}h1{margin:0 0 4px}.muted{color:#66756b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:18px 0}.card{background:white;border:1px solid #dfe7e1;border-radius:16px;padding:16px;box-shadow:0 3px 18px #0000000a}.pct{font-size:2rem;font-weight:750}.ok{color:#168246}.warning{color:#a36b00}.dry{color:#b42727}.uncal{color:#667085}.bad{color:#b42727}button,input{font:inherit;border-radius:10px;border:1px solid #cdd8d0;padding:9px}button{cursor:pointer;background:#173f2b;color:white;border:0}.secondary{background:#edf2ee;color:#173f2b}.row{display:flex;gap:8px;flex-wrap:wrap}.row>*{flex:1}.small{font-size:.86rem}details{margin-top:10px}label{display:block;margin:8px 0 3px}.status{display:inline-block;padding:4px 8px;border-radius:999px;background:#eef3ef}.top{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}</style>
</head>
<body>
<div class="top"><div><h1>🌱 PlatIO</h1><div id="device" class="muted">Cargando…</div></div><button class="secondary" onclick="refresh()">Actualizar</button></div>
<div id="plants" class="grid"></div>
<div class="card"><h2>Wi‑Fi y avisos por WhatsApp</h2><div class="row"><div><label>Wi‑Fi</label><input id="ssid" placeholder="Nombre de red"></div><div><label>Contraseña</label><input id="wifiPass" type="password" placeholder="Contraseña"></div></div><div class="row"><div><label>WhatsApp Phone Number ID</label><input id="waPhoneId" placeholder="123456789012345"></div><div><label>Número que recibe las alertas</label><input id="waRecipient" placeholder="549221... (se guardan sólo dígitos)"></div></div><label>Access Token de WhatsApp Cloud API</label><input id="waToken" type="password" placeholder="Pegalo sólo al configurarlo; nunca se muestra después" style="width:100%;box-sizing:border-box"><div class="row"><div><label>Plantilla: necesita agua</label><input id="waAlertTemplate" placeholder="platio_necesita_agua"></div><div><label>Plantilla: recuperada</label><input id="waRecoveryTemplate" placeholder="platio_humedad_ok"></div><div><label>Idioma</label><input id="waLanguage" placeholder="es_AR"></div></div><div class="row" style="margin-top:10px"><button onclick="saveNetwork()">Guardar conexión</button><button class="secondary" onclick="testWhatsApp()">Probar WhatsApp</button></div><p class="small muted">Las alertas automáticas usan plantillas aprobadas de WhatsApp Business Cloud API. Si cambiás el Wi‑Fi, la central reinicia.</p></div>
<script>
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stateLabel=s=>({OK:'🟢 Bien',WARNING:'🟡 Secándose',NEEDS_WATER:'🔴 Regar',UNCALIBRATED:'⚪ Calibrar'}[s]||s);
async function api(url,opt){const r=await fetch(url,opt);if(!r.ok)throw new Error(await r.text());return r.headers.get('content-type')?.includes('json')?r.json():r.text()}
async function refresh(){try{const d=await api('/api/status');document.getElementById('device').textContent=`${d.ip} · Wi‑Fi ${d.wifi?'conectado':'sin conexión'} · firmware ${d.firmware}`;document.getElementById('ssid').value=d.ssid||'';document.getElementById('waPhoneId').value=d.whatsappPhoneNumberId||'';document.getElementById('waRecipient').value=d.whatsappRecipient||'';document.getElementById('waAlertTemplate').value=d.whatsappAlertTemplate||'';document.getElementById('waRecoveryTemplate').value=d.whatsappRecoveryTemplate||'';document.getElementById('waLanguage').value=d.whatsappTemplateLanguage||'';document.getElementById('plants').innerHTML=d.plants.map(p=>`<div class="card"><div class="top"><b>${esc(p.name)}</b><span class="status ${p.healthy?'':'bad'}">${p.healthy?'sensor OK':'revisar sensor'}</span></div><div class="pct ${p.state==='OK'?'ok':p.state==='WARNING'?'warning':p.state==='NEEDS_WATER'?'dry':'uncal'}">${p.calibrated?p.percent.toFixed(0)+'%':'—'}</div><div>${stateLabel(p.state)}</div><div class="small muted">Lectura ${p.raw} · canal ${p.channel}</div><details><summary>Configurar</summary><label>Nombre</label><input id="name${p.index}" value="${esc(p.name)}"><div class="row"><div><label>Alerta ≤ %</label><input id="dry${p.index}" type="number" min="0" max="100" value="${p.dry}"></div><div><label>Aviso ≤ %</label><input id="warn${p.index}" type="number" min="0" max="100" value="${p.warning}"></div><div><label>Recupera ≥ %</label><input id="rec${p.index}" type="number" min="0" max="100" value="${p.recovery}"></div></div><div class="row" style="margin-top:8px"><button onclick="savePlant(${p.index})">Guardar</button><button class="secondary" onclick="cal(${p.index},'dry')">Calibrar seco</button><button class="secondary" onclick="cal(${p.index},'wet')">Calibrar húmedo</button></div><p class="small muted">Seco=${p.dryRaw} · Húmedo=${p.wetRaw}</p></details></div>`).join('')}catch(e){document.getElementById('device').textContent='No pude comunicarme con la central: '+e.message}}
async function savePlant(i){const body=new URLSearchParams({index:i,name:document.getElementById('name'+i).value,dry:document.getElementById('dry'+i).value,warning:document.getElementById('warn'+i).value,recovery:document.getElementById('rec'+i).value});await api('/api/plant',{method:'POST',body});refresh()}
async function cal(i,mode){if(!confirm(`¿Guardar la lectura actual como referencia ${mode==='dry'?'SECA':'HÚMEDA'}?`))return;const body=new URLSearchParams({index:i,mode});alert(await api('/api/calibrate',{method:'POST',body}));refresh()}
async function saveNetwork(){const body=new URLSearchParams({ssid:document.getElementById('ssid').value,password:document.getElementById('wifiPass').value,waPhoneId:document.getElementById('waPhoneId').value,waRecipient:document.getElementById('waRecipient').value,waToken:document.getElementById('waToken').value,waAlertTemplate:document.getElementById('waAlertTemplate').value,waRecoveryTemplate:document.getElementById('waRecoveryTemplate').value,waLanguage:document.getElementById('waLanguage').value});alert(await api('/api/network',{method:'POST',body}))}
async function testWhatsApp(){alert(await api('/api/whatsapp/test',{method:'POST'}))}
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
  strncpy(config.whatsappAlertTemplate, "platio_necesita_agua", sizeof(config.whatsappAlertTemplate) - 1);
  strncpy(config.whatsappRecoveryTemplate, "platio_humedad_ok", sizeof(config.whatsappRecoveryTemplate) - 1);
  strncpy(config.whatsappTemplateLanguage, "es_AR", sizeof(config.whatsappTemplateLanguage) - 1);
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

bool whatsappConfigured() {
  return config.whatsappAccessToken[0] != '\0' &&
         config.whatsappPhoneNumberId[0] != '\0' &&
         config.whatsappRecipient[0] != '\0' &&
         config.whatsappAlertTemplate[0] != '\0' &&
         config.whatsappRecoveryTemplate[0] != '\0' &&
         config.whatsappTemplateLanguage[0] != '\0';
}

void copyDigits(char *dst, size_t size, const String &src) {
  if (size == 0) return;
  size_t pos = 0;
  for (size_t i = 0; i < src.length() && pos + 1 < size; ++i) {
    const char c = src[i];
    if (c >= '0' && c <= '9') dst[pos++] = c;
  }
  dst[pos] = '\0';
}

bool plausibleWhatsAppNumber(const char *digits) {
  const size_t len = strlen(digits);
  return len >= 8 && len <= 18;
}

bool sendWhatsAppTemplate(const char *templateName, const String &plantName, float moisturePercent) {
  if (WiFi.status() != WL_CONNECTED || !whatsappConfigured()) return false;
  if (!plausibleWhatsAppNumber(config.whatsappRecipient)) return false;

  // Prototype: direct Cloud API call keeps the system serverless. Before a commercial
  // release, move the permanent token behind a backend and enable strict TLS validation.
  NetworkClientSecure client;
  client.setInsecure();
  HTTPClient http;
  const String url = String("https://graph.facebook.com/") + META_GRAPH_API_VERSION + "/" +
                     config.whatsappPhoneNumberId + "/messages";
  if (!http.begin(client, url)) return false;

  http.addHeader("Authorization", String("Bearer ") + config.whatsappAccessToken);
  http.addHeader("Content-Type", "application/json");

  const String percent = String(moisturePercent, 0);
  String payload;
  payload.reserve(700);
  payload += "{\"messaging_product\":\"whatsapp\",\"recipient_type\":\"individual\",\"to\":\"";
  payload += jsonEscape(config.whatsappRecipient);
  payload += "\",\"type\":\"template\",\"template\":{\"name\":\"";
  payload += jsonEscape(templateName);
  payload += "\",\"language\":{\"code\":\"";
  payload += jsonEscape(config.whatsappTemplateLanguage);
  payload += "\"},\"components\":[{\"type\":\"body\",\"parameters\":[{\"type\":\"text\",\"text\":\"";
  payload += jsonEscape(plantName.c_str());
  payload += "\"},{\"type\":\"text\",\"text\":\"";
  payload += jsonEscape(percent.c_str());
  payload += "\"}]}]}}";

  const int code = http.POST(payload);
  const String response = http.getString();
  Serial.printf("WhatsApp HTTP %d: %s\n", code, response.c_str());
  http.end();
  return code >= 200 && code < 300;
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

  // Retry a notification on later scan cycles if Wi-Fi/WhatsApp was unavailable.
  if (r.logic.state == PlantState::NeedsWater && !r.alertSent) {
    if (sendWhatsAppTemplate(config.whatsappAlertTemplate, String(p.name), r.emaPercent)) r.alertSent = true;
  }
  if (r.logic.state != PlantState::NeedsWater && r.alertSent) {
    if (sendWhatsAppTemplate(config.whatsappRecoveryTemplate, String(p.name), r.emaPercent)) r.alertSent = false;
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
  json += "\"whatsappConfigured\":" + String(whatsappConfigured() ? "true" : "false") + ",";
  json += "\"whatsappPhoneNumberId\":\"" + jsonEscape(config.whatsappPhoneNumberId) + "\",";
  json += "\"whatsappRecipient\":\"" + jsonEscape(config.whatsappRecipient) + "\",";
  json += "\"whatsappAlertTemplate\":\"" + jsonEscape(config.whatsappAlertTemplate) + "\",";
  json += "\"whatsappRecoveryTemplate\":\"" + jsonEscape(config.whatsappRecoveryTemplate) + "\",";
  json += "\"whatsappTemplateLanguage\":\"" + jsonEscape(config.whatsappTemplateLanguage) + "\",";
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
    if (server.hasArg("waPhoneId")) copyDigits(config.whatsappPhoneNumberId, sizeof(config.whatsappPhoneNumberId), server.arg("waPhoneId"));
    if (server.hasArg("waRecipient")) copyDigits(config.whatsappRecipient, sizeof(config.whatsappRecipient), server.arg("waRecipient"));
    if (server.hasArg("waToken") && server.arg("waToken").length()) copyString(config.whatsappAccessToken, sizeof(config.whatsappAccessToken), server.arg("waToken"));
    if (server.hasArg("waAlertTemplate") && server.arg("waAlertTemplate").length()) copyString(config.whatsappAlertTemplate, sizeof(config.whatsappAlertTemplate), server.arg("waAlertTemplate"));
    if (server.hasArg("waRecoveryTemplate") && server.arg("waRecoveryTemplate").length()) copyString(config.whatsappRecoveryTemplate, sizeof(config.whatsappRecoveryTemplate), server.arg("waRecoveryTemplate"));
    if (server.hasArg("waLanguage") && server.arg("waLanguage").length()) copyString(config.whatsappTemplateLanguage, sizeof(config.whatsappTemplateLanguage), server.arg("waLanguage"));
    saveConfig();
    server.send(200, "text/plain", "Configuración guardada. La central reiniciará en 2 segundos.");
    delay(2000);
    ESP.restart();
  });

  server.on("/api/whatsapp/test", HTTP_POST, []() {
    if (!whatsappConfigured()) { server.send(400, "text/plain", "Primero completá la configuración de WhatsApp Cloud API"); return; }
    const bool sent = sendWhatsAppTemplate(config.whatsappAlertTemplate, "PlatIO prueba", 50.0f);
    server.send(sent ? 200 : 500, "text/plain", sent ? "Plantilla enviada por WhatsApp" : "No se pudo enviar; revisá token, Phone Number ID, destinatario y plantilla aprobada");
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
