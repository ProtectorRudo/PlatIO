# PlatIO Mobile

Aplicación nativa de PlatIO para Android e iOS.

## Objetivo de UX

La app no expone ADC, porcentajes ni umbrales en la experiencia normal. La persona ve estados humanos:

- 💚 Está cómoda.
- 🌤️ Se está secando; todavía puede esperar.
- 💧 Le vendría bien agua hoy.
- 🌱 Estoy aprendiendo esta maceta.

Los datos técnicos siguen disponibles en el firmware para diagnóstico.

## Notificaciones

La app usa `expo-notifications` y Expo Push Service. El flujo es:

1. La app pide permiso para notificaciones.
2. Obtiene su `ExpoPushToken`.
3. Detecta la central en la red local.
4. Registra automáticamente el token en `POST /api/push/register`.
5. Cuando una planta necesita agua, el ESP32 envía una notificación a Expo Push Service.
6. Expo entrega la notificación mediante FCM en Android o APNs en iOS.

No hay WhatsApp y el MVP no necesita un backend propio.

## Estado de v0.4

Implementado:

- Interfaz inicial de la app.
- Descubrimiento local básico por `platio.local` y fallback `192.168.4.1`.
- Registro automático del token push.
- Vista amigable de las 8 plantas.
- Notificación de prueba.
- Apertura de alertas.
- Android/iOS desde una misma base React Native + Expo.

Pendiente para lograr onboarding realmente cero-fricción:

- Provisionamiento por Bluetooth desde la app.
- Catálogo de especies y buscador.
- Selección “Maceta 1 → Jazmín” sin parámetros técnicos.
- Autocalibración y aprendizaje de cada maceta.
- Detección de humedad excesiva sostenida.
- Historial amigable.
- Modo diagnóstico oculto.
- Credenciales reales de FCM/APNs y proyecto EAS.

## Configuración de Expo

La app requiere un proyecto de Expo/EAS real. Al ejecutar `eas init`, reemplazar el placeholder `REPLACE_WITH_EAS_PROJECT_ID` en `app.json` por el Project ID generado.

Para push en Android se deben configurar credenciales FCM v1. Para iOS, las credenciales APNs requieren cuenta Apple Developer.

## Desarrollo

Requiere Node 22.13+ para Expo SDK 57.

```bash
cd mobile
npm install
npx expo-doctor
npx expo start
```

Las notificaciones push no funcionan en Expo Go; se requiere un development build.

```bash
eas build --platform android --profile development
```
