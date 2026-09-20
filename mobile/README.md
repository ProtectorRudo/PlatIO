# PlatIO Mobile

Aplicación nativa de PlatIO para Android e iOS.

## Estado actual · v0.7

La experiencia normal evita ADC, porcentajes y umbrales. La persona ve información accionable:

- 💚 Está cómoda.
- 🌤️ Se está secando; todavía puede esperar.
- 💧 Le vendría bien agua hoy.
- 💦 Lleva demasiado tiempo muy húmeda.
- 🌱 PlatIO está aprendiendo esta maceta.

También muestra una cronología de cambios relevantes y, cuando ya existe un ciclo completo, cuánto tiempo pasó entre quedar hidratada y volver a pedir agua.

## Onboarding

El provisionamiento por Bluetooth ya está implementado. La app encuentra una central PlatIO, lista redes Wi‑Fi y transmite las credenciales sin obligar a la persona a entrar a un panel técnico.

Después, el flujo principal es simplemente:

**Maceta → elegir planta**

El catálogo incorpora 125 entradas específicas y 4 perfiles genéricos de respaldo para continuar aunque la persona no conozca el nombre exacto.

## Notificaciones

La app usa `expo-notifications` y Expo Push Service.

1. Pide permiso para notificaciones.
2. Obtiene su `ExpoPushToken`.
3. Detecta la central en la red local.
4. Registra automáticamente el token en `POST /api/push/register`.
5. El ESP32 envía avisos sólo cuando existe un cambio relevante confirmado.
6. Expo entrega la notificación mediante FCM en Android o APNs en iOS.

No hay WhatsApp y el MVP no necesita un backend propio.

## Memoria local

El firmware v0.7 conserva hasta 48 eventos importantes en un almacenamiento separado de la configuración principal. La app consulta `GET /api/history` y traduce esos eventos a lenguaje humano.

Se registran:

- pedido confirmado de agua;
- recuperación de humedad;
- exceso de humedad sostenido;
- salida de una situación de exceso de humedad;
- autocalibración de una maceta.

No se guarda una lectura cada cinco minutos, reduciendo escrituras innecesarias en la flash.

## Exceso de humedad sostenido

La alerta no aparece simplemente después de regar. El firmware exige muchas lecturas consecutivas cerca de la referencia húmeda: aproximadamente 18 a 48 horas según el perfil. Las plantas del perfil `MOIST`, para las que la humedad permanente puede ser normal, quedan exentas.

## Configuración de Expo

La app requiere un proyecto Expo/EAS real. Al ejecutar `eas init`, hay que reemplazar `REPLACE_WITH_EAS_PROJECT_ID` en `app.json` por el Project ID generado.

Para push en Android se deben configurar credenciales FCM v1. Para iOS, las credenciales APNs requieren una cuenta Apple Developer.

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
