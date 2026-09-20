# WhatsApp en PlatIO

PlatIO v0.3 envía alertas mediante la **WhatsApp Business Cloud API oficial de Meta**.

## Por qué usa plantillas

Las alertas de PlatIO se originan automáticamente en el dispositivo. Para este tipo de mensajes conviene utilizar plantillas aprobadas en WhatsApp Business Platform en lugar de depender de una conversación abierta con el destinatario.

## Datos que necesita PlatIO

Desde el panel web de la central se configuran:

- **Phone Number ID:** identificador del número remitente en WhatsApp Business Platform.
- **Access Token:** token autorizado para enviar mensajes.
- **Destinatario:** número que recibirá las alertas. El firmware elimina espacios, `+`, guiones y cualquier otro carácter y conserva sólo dígitos.
- **Plantilla de alerta:** por defecto `platio_necesita_agua`.
- **Plantilla de recuperación:** por defecto `platio_humedad_ok`.
- **Idioma:** debe coincidir exactamente con el idioma en que fue aprobada la plantilla; por defecto `es_AR`.

## Plantillas recomendadas

### `platio_necesita_agua`

Cuerpo sugerido:

```text
💧 {{1}} necesita agua. Humedad actual: {{2}}%.
```

Parámetros enviados por PlatIO:

1. Nombre de la planta.
2. Porcentaje de humedad redondeado.

### `platio_humedad_ok`

Cuerpo sugerido:

```text
✅ {{1}} volvió a un nivel correcto de humedad. Humedad actual: {{2}}%.
```

Parámetros enviados por PlatIO:

1. Nombre de la planta.
2. Porcentaje de humedad redondeado.

Los nombres y el código de idioma son configurables desde el panel, por lo que no es necesario recompilar el firmware si Meta aprueba las plantillas con otros nombres.

## Prueba

Después de guardar la configuración hay un botón **Probar WhatsApp**. La central intenta enviar la plantilla de alerta con:

- planta: `PlatIO prueba`
- humedad: `50`

Si falla, el puerto serie imprime el código HTTP y la respuesta devuelta por Meta para diagnosticar token, Phone Number ID, destinatario o plantilla.

## Seguridad

En esta versión MVP el ESP32 llama directamente a `graph.facebook.com` y guarda el Access Token en `Preferences`.

El token:

- no está en el repositorio;
- no se incluye en `/api/status`;
- no se vuelve a mostrar en el panel una vez guardado.

Para una versión comercial, el diseño previsto es mover esa credencial a un backend propio para que ningún dispositivo vendido contenga un token permanente de Meta.
