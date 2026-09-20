# PlatIO — principios de UX "cero fricción"

## Regla principal

PlatIO habla de plantas, no de sensores.

Nunca presentar como pantalla principal:

> Humedad: 22%

Presentar:

> Tu jazmín ya está pidiendo agua.

## Estados visibles

### Todo bien
"Está cómoda 🌿"

### Se acerca
"Va a necesitar agua pronto."

### Regar
"Ya está pidiendo agua 💧"

### Recuperada
"Listo, ya tiene el agua que necesitaba ✅"

### Sensor
"No estoy recibiendo bien esta maceta. Revisá que el sensor siga clavado."

## Home

Cada tarjeta muestra:

- nombre/foto o ícono de la planta;
- habitación opcional;
- estado humano;
- tendencia corta;
- última actualización.

Ejemplo:

**Jazmín**
Balcón
🌿 Está cómoda

No mostrar números salvo que el usuario toque "Ver detalles".

## Agregar maceta

1. Elegir Maceta 1…8.
2. Campo de búsqueda: "¿Qué planta tenés acá?"
3. Resultados por nombre común, con nombre científico pequeño.
4. Confirmar.
5. Terminado.

Si el nombre es ambiguo, mostrar fotos/rasgos después; no bloquear con preguntas botánicas innecesarias.

## Aprendizaje inicial

Evitar una pantalla llamada "Calibración".

Usar lenguaje humano:

"¿La acabás de regar?"
- Sí, está recién regada.
- No.

Ese evento ayuda a PlatIO a aprender el extremo húmedo sin que la persona sepa qué es una calibración.

Para el extremo seco, PlatIO aprende del primer ciclo y del momento en que la regla botánica de la especie indica que debe avisar.

## Notificaciones

Enviar sólo eventos accionables.

No:
- mensajes repetidos;
- recordatorios cada pocos minutos;
- datos técnicos.

Sí:
- primer aviso de riego;
- confirmación de recuperación;
- sensor desconectado;
- comportamiento anormal persistente.

## Modo avanzado

Los usuarios curiosos pueden abrir:
"Detalles del sensor"

Allí sí:
- señal relativa;
- lectura cruda;
- curva de secado;
- última lectura;
- diagnóstico.

Nunca es necesario para usar PlatIO.
