# PlatIO

PlatIO es un sistema para monitorear plantas en maceta con una central ESP32 y una app móvil propia.

La primera central está diseñada para **8 macetas** con un ESP32, un CD74HC4067 y sensores capacitivos analógicos. El hardware queda preparado para evolucionar a 16 canales.

## Dirección v0.4

La experiencia deja de depender de WhatsApp y pasa a ser **app-first**:

- la central mide;
- el backend interpreta y sincroniza;
- la app configura cada maceta;
- las alertas llegan como notificaciones push del celular;
- el usuario trabaja con nombres de plantas y estados humanos, no con porcentajes eléctricos.

Ejemplo:

> 💧 Tu jazmín ya está pidiendo agua.

En lugar de:

> Humedad actual: 22%.

## Experiencia objetivo

1. Abrir PlatIO.
2. Escanear el QR de la central.
3. Conectar la central al Wi‑Fi desde la app mediante Bluetooth.
4. Ver las 8 macetas disponibles.
5. Elegir “Maceta 1”.
6. Buscar “Jazmín”.
7. Confirmar la especie.
8. Listo.

Sin IPs, sin panel técnico, sin tokens, sin calibraciones con números y sin crear una cuenta obligatoria.

## Arquitectura

```text
Sensor 1 ─┐
Sensor 2 ─┤
Sensor 3 ─┤
   ...    ├── CD74HC4067 ── ESP32 ── Wi‑Fi ── backend ── app móvil
Sensor 8 ─┘                                      │
                                                  └── push notifications
```

## Firmware

La base actual ya incluye:

- 8 plantas independientes;
- una única entrada ADC1 mediante CD74HC4067;
- mediana de múltiples muestras;
- filtrado EMA;
- detección de sensor fuera de rango;
- lógica con confirmaciones e histéresis;
- persistencia con `Preferences`;
- tests nativos;
- compilación automática del firmware con GitHub Actions.

La v0.4 reemplazará la configuración web/WhatsApp por provisioning desde la app y envío seguro de telemetría al backend.

## App

Stack decidido para el MVP:

- React Native;
- Expo SDK 57 estable;
- TypeScript;
- Expo Notifications;
- Supabase;
- provisioning BLE seguro del ESP32.

Ver:

- [Arquitectura app-first](docs/APP_ARCHITECTURE.md)
- [UX cero fricción](docs/UX_ZERO_FRICTION.md)
- [Workspace móvil](mobile/README.md)

## Catálogo de plantas

PlatIO incorporará un catálogo amplio con nombre común, nombre científico, sinónimos y perfil hídrico.

Importante: un sensor capacitivo económico no entrega un “porcentaje de humedad universal” comparable entre macetas. Por eso la especie define un **perfil de necesidad de agua**, y PlatIO adapta ese perfil a la curva real de cada maceta.

El usuario verá estados como:

- 🌿 Está cómoda.
- 🟡 Va a necesitar agua pronto.
- 💧 Ya está pidiendo agua.
- ✅ Listo, ya tiene el agua que necesitaba.

Los valores técnicos quedan reservados para una pantalla avanzada de diagnóstico.

## Hardware previsto

- 1 × ESP32 WROOM-32 DevKit de 30 pines;
- 1 × base/expansor con borneras;
- 1 × CD74HC4067;
- 8 × sensores capacitivos analógicos;
- fuente USB 5 V / 2 A;
- cableado y caja.

Ver [docs/WIRING.md](docs/WIRING.md).

## Desarrollo firmware

```sh
pio test -e native
pio run -e esp32dev
```

Cada push y pull request ejecuta automáticamente tests y compilación mediante GitHub Actions.

## Origen y licencia

El firmware toma como referencia software MIT del proyecto **Smart Plant Moisture Monitor** de Tikita Tolley. Se conserva la atribución correspondiente en [LICENSE](LICENSE) y [THIRD_PARTY.md](THIRD_PARTY.md).

No se reutilizan sus fotografías, CAD, modelos 3D ni otros materiales Creative Commons.
