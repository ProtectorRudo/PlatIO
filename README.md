# PlatIO

PlatIO es una central doméstica para monitorear **8 macetas** con un ESP32, un CD74HC4067 y sensores capacitivos analógicos. El hardware queda preparado para evolucionar a 16 canales.

La experiencia principal vive en la **app PlatIO**: el usuario no necesita interpretar porcentajes, ADC ni umbrales técnicos. Ve estados humanos como “Está cómoda”, “Se está secando” o “Le vendría bien agua hoy”, y recibe notificaciones nativas de la app.

## v0.4

- 8 plantas independientes.
- Una única entrada ADC1 (GPIO34) mediante CD74HC4067.
- Mediana de 15 muestras + EMA para reducir ruido.
- Calibración por maceta en la capa técnica.
- Tres confirmaciones secas antes de declarar NEEDS_WATER.
- Histéresis y confirmaciones de recuperación.
- Configuración persistente con Preferences.
- Wi‑Fi con panel web de respaldo.
- App nativa Android/iOS en mobile/.
- Notificaciones push mediante Expo Push Service.
- El ESP32 registra el token de la app en runtime; no hay tokens personales en GitHub.
- Detección básica de sensor desconectado o lectura fuera de rango.
- Tests de lógica y compilación automática del firmware con GitHub Actions.

## Arquitectura

~~~text
Sensor 1 ─┐
Sensor 2 ─┤
Sensor 3 ─┤
   ...    ├── CD74HC4067 ── GPIO34 / ADC1 ── ESP32 ── Wi‑Fi ── Expo Push Service ── App PlatIO
Sensor 8 ─┘
~~~

El CD74HC4067 tiene 16 canales. La primera central usa 8.

## Principio de producto

**Decime qué planta es. Del resto se ocupa PlatIO.**

El objetivo de UX es que una persona pueda configurar:

**Maceta 1 → Jazmín**

sin definir porcentajes, valores ADC, intervalos o reglas de riego.

El catálogo de especies elegirá internamente el perfil hídrico correspondiente y PlatIO aprenderá el comportamiento real de esa maceta y su sustrato.

## App

La app vive en [mobile/](mobile/README.md).

Estados visibles previstos:

- 💚 **Está cómoda** — no hay que hacer nada.
- 🌤️ **Se está secando** — todavía puede esperar.
- 💧 **Le vendría bien agua hoy**.
- 🌱 **Estoy aprendiendo esta maceta**.

El porcentaje de humedad seguirá disponible sólo en modo diagnóstico.

Cuando la central confirma que una planta necesita agua, envía una notificación nativa a la app. El MVP usa Expo Push Service para evitar un backend propio.

## API local relevante

- GET /api/status — estado de la central y las 8 macetas.
- POST /api/network — configuración Wi‑Fi de respaldo.
- POST /api/push/register — la app registra su Expo Push Token.
- POST /api/push/test — prueba de notificación.
- POST /api/plant — configuración técnica de una maceta.
- POST /api/calibrate — calibración técnica de respaldo.

## Siguiente etapa

Para acercarnos a onboarding de fricción casi cero:

1. Provisionamiento inicial por Bluetooth desde la app.
2. Catálogo amplio de especies y sinónimos en español.
3. Selección Maceta → especie.
4. Autocalibración después del riego.
5. Detección de exceso de humedad sostenido.
6. Historial expresado en lenguaje humano.
7. Modo técnico oculto.

## Hardware previsto

- 1 × ESP32 WROOM-32 DevKit de 30 pines.
- 1 × base/expansor con borneras compatible.
- 1 × CD74HC4067.
- 8 × sensores capacitivos analógicos de humedad.
- Fuente USB 5 V / 2 A.
- Cableado y caja.

Ver [docs/WIRING.md](docs/WIRING.md).

## Desarrollo del firmware

~~~sh
pio test -e native
pio run -e esp32dev
~~~

## Origen y licencia

El firmware toma como referencia software MIT del proyecto **Smart Plant Moisture Monitor** de Tikita Tolley. Se conserva la atribución correspondiente en [LICENSE](LICENSE) y [THIRD_PARTY.md](THIRD_PARTY.md).

No se reutilizan fotografías, CAD, modelos 3D ni otros materiales Creative Commons del proyecto original.
