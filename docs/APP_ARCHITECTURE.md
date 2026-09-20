# PlatIO v0.4 — arquitectura app-first

## Decisión

PlatIO deja de usar WhatsApp como canal de alerta. La experiencia principal será una app móvil propia para Android e iOS.

La central ESP32 queda reducida a cuatro responsabilidades:

1. leer los sensores;
2. filtrar y validar las lecturas;
3. mantener la asociación física canal ↔ maceta;
4. enviar telemetría/eventos al backend.

La app concentra identidad de plantas, configuración, historial, estados humanos y notificaciones.

## Experiencia objetivo

Primer uso:

1. Abrir PlatIO.
2. La app crea una sesión anónima; no pide email ni contraseña.
3. Escanear el QR de la central.
4. La app provisiona el Wi‑Fi del ESP32 por BLE.
5. Aparecen 8 macetas vacías.
6. Tocar "Maceta 1" y buscar "Jazmín".
7. Elegir la especie si hay más de una coincidencia.
8. Repetir sólo para las macetas utilizadas.
9. PlatIO comienza a aprender cada maceta.

Objetivo: desde abrir la caja hasta monitorear la primera planta sin entrar en una IP, copiar tokens, escribir porcentajes ni comprender electrónica.

## Stack propuesto

### App
- React Native + Expo SDK 57.
- TypeScript.
- expo-notifications para push.
- Build de desarrollo/producción con EAS.
- Integración nativa con el provisioning BLE oficial de Espressif.

### Backend
- Supabase Auth con sign-in anónimo.
- PostgreSQL para dispositivos, macetas, perfiles y lecturas.
- Row Level Security por usuario.
- Edge Functions para ingesta del ESP32 y envío de push.
- Expo Push Service para Android/iOS en el MVP.

### Firmware
- ESP32.
- CD74HC4067.
- 8 sensores en la primera central.
- Wi‑Fi provisionado desde la app.
- Identidad de dispositivo + secreto de emparejamiento generado en fabricación.
- Envío HTTPS de lecturas/eventos al backend.

## Notificaciones

No mostrar porcentajes por defecto.

Ejemplos:

- "💧 Tu jazmín ya está pidiendo agua."
- "🌿 El potus está bien. No hace falta regarlo todavía."
- "✅ Listo, tu jazmín ya tiene el agua que necesitaba."
- "⚠️ La lavanda está secándose más rápido de lo normal."

El porcentaje relativo queda disponible únicamente en una vista avanzada/diagnóstico.

## Catálogo

La app buscará por:
- nombre común;
- nombre científico;
- sinónimos;
- categoría.

El catálogo base se construirá con fuentes reutilizables comercialmente. La especie define un perfil agronómico, no un supuesto porcentaje ADC universal.

## Modelo de humedad

Un sensor capacitivo económico no mide un porcentaje universal transferible entre macetas.

PlatIO separa:

1. **Necesidad botánica:** baja / moderada / alta; tolerancia a secado; preferencia por humedad continua.
2. **Comportamiento de la maceta real:** máximos, mínimos y velocidad de secado observados por el sensor.
3. **Estado para el usuario:** cómoda / acercándose al riego / necesita agua / recién regada.

El perfil de especie aporta el prior inicial. La central aprende la curva real de la maceta con el uso.

## Cero fricción

El usuario NO configura:
- Access Tokens;
- Phone Number IDs;
- URLs;
- IP local;
- canales del multiplexor;
- límites porcentuales;
- dryRaw/wetRaw;
- nombres de plantillas;
- claves de API.

El usuario SÍ hace:
- escanear QR;
- elegir Wi‑Fi;
- indicar qué planta hay en cada maceta.

## Cuenta

El MVP usa autenticación anónima para no pedir registro. Más adelante el usuario puede vincular Google, Apple, email o teléfono sin perder sus dispositivos y plantas.

## Emparejamiento

Cada central llevará un QR con:
- device_id;
- transport = BLE;
- proof-of-possession / pairing secret.

La app lo escanea y usa provisioning seguro de Espressif para pasar Wi‑Fi y reclamar el dispositivo.

## Fuente de verdad

- El ESP32 mantiene medición y seguridad básica incluso sin internet.
- El backend mantiene catálogo, asociaciones, reglas y eventos.
- La app es la interfaz principal.
