# PlatIO

Central doméstica para monitorear **8 macetas** con un ESP32, un CD74HC4067 y sensores capacitivos analógicos. El hardware queda preparado para evolucionar a 16 canales.

PlatIO avisa por **WhatsApp** cuando una planta realmente necesita agua y vuelve a avisar cuando recupera un nivel de humedad correcto.

## v0.3

- 8 plantas independientes.
- Una única entrada ADC1 (GPIO34) mediante CD74HC4067.
- Mediana de 15 muestras + EMA para reducir ruido.
- Calibración seco/húmedo individual por maceta.
- Umbrales configurables por planta.
- Tres confirmaciones secas antes de declarar `NEEDS_WATER`.
- Histéresis y confirmaciones de recuperación para evitar avisos que van y vienen.
- Configuración persistente con `Preferences`.
- Wi‑Fi configurable desde el navegador, sin recompilar.
- Modo de configuración propio si la central no logra conectarse al Wi‑Fi.
- Panel web responsive servido directamente por el ESP32.
- Avisos por **WhatsApp Business Cloud API oficial de Meta**.
- Dos plantillas configurables: falta de agua y recuperación.
- El Access Token nunca se devuelve por la API ni se muestra nuevamente en el panel.
- Detección básica de sensor desconectado o lectura eléctrica fuera de rango.
- Tests de la lógica y compilación automática con GitHub Actions.

## Arquitectura

```text
Sensor 1 ─┐
Sensor 2 ─┤
Sensor 3 ─┤
   ...    ├── CD74HC4067 ── GPIO34 / ADC1 ── ESP32 ── Wi‑Fi ── WhatsApp Cloud API
Sensor 8 ─┘
```

El CD74HC4067 tiene 16 canales. La primera central usa 8, por lo que quedan 8 canales disponibles para una futura ampliación.

## Primer encendido

1. Encender la central.
2. Si aún no tiene Wi‑Fi, conectarse a `PlatIO-Setup-...` con contraseña `platiosetup`.
3. Abrir `http://192.168.4.1`.
4. Guardar los datos del Wi‑Fi y la configuración de WhatsApp.
5. Una vez conectada a la red doméstica, abrir `http://platio.local` o la IP mostrada por el router.
6. Poner nombre a cada maceta.
7. Calibrar el punto seco y húmedo de cada sensor.

## Calibración

Cada maceta tiene referencias propias:

- **Seco:** lectura del sustrato en el punto en que queremos considerar que necesita agua.
- **Húmedo:** lectura después de un riego normal, una vez distribuida la humedad.

El porcentaje se calcula entre esos dos puntos. La lógica funciona aunque el ADC del sensor aumente o disminuya al humedecerse.

No existe un “30 % universal”: una planta sin sus dos referencias válidas queda en estado `UNCALIBRATED` y no envía alertas.

## WhatsApp

PlatIO usa la API oficial **WhatsApp Business Cloud API**. Para mensajes automáticos iniciados por el dispositivo usa plantillas aprobadas en Meta.

Configuración necesaria en el panel:

- `Phone Number ID` de WhatsApp Business.
- Access Token.
- Número destinatario con código de país. Se guardan sólo los dígitos.
- Nombre de la plantilla de alerta, por defecto `platio_necesita_agua`.
- Nombre de la plantilla de recuperación, por defecto `platio_humedad_ok`.
- Código de idioma de las plantillas, por defecto `es_AR`.

Las dos plantillas deben tener **dos variables de texto en el cuerpo**, en este orden:

1. Nombre de la planta.
2. Porcentaje de humedad.

Ejemplo conceptual de alerta:

`💧 {{1}} necesita agua. Humedad actual: {{2}}%.`

Ejemplo conceptual de recuperación:

`✅ {{1}} volvió a un nivel correcto. Humedad actual: {{2}}%.`

Ver [`docs/WHATSAPP.md`](docs/WHATSAPP.md) para la configuración completa.

## Seguridad / estado MVP

La v0.3 realiza la llamada a Meta directamente desde el ESP32 para mantener el prototipo sin servidor. El token queda almacenado en la memoria persistente del dispositivo y **no se devuelve al navegador una vez guardado**.

Para una eventual versión comercial se recomienda mover el token permanente a un backend propio y reemplazar el TLS relajado del prototipo por validación estricta de certificados.

## Hardware previsto

- 1 × ESP32 WROOM-32 DevKit de 30 pines.
- 1 × base/expansor con borneras compatible.
- 1 × CD74HC4067.
- 8 × sensores capacitivos analógicos de humedad.
- Fuente USB 5 V / 2 A.
- Cableado y caja.

Ver [`docs/WIRING.md`](docs/WIRING.md) para el cableado propuesto.

## Desarrollo

El proyecto usa PlatformIO.

```sh
pio test -e native
pio run -e esp32dev
```

Cada `push` y `pull_request` ejecuta automáticamente ambos comandos mediante GitHub Actions.

## Origen y licencia

El firmware toma como referencia software MIT del proyecto **Smart Plant Moisture Monitor** de Tikita Tolley. Se conserva la atribución correspondiente en [`LICENSE`](LICENSE) y [`THIRD_PARTY.md`](THIRD_PARTY.md).

No se reutilizan sus fotografías, CAD, modelos 3D ni otros materiales Creative Commons.
