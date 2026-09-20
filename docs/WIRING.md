# Cableado propuesto — PlatIO v0.3

## ESP32 -> CD74HC4067

| Función | ESP32 | CD74HC4067 |
|---|---:|---|
| Señal analógica | GPIO34 | SIG / COM |
| Selector 0 | GPIO16 | S0 |
| Selector 1 | GPIO17 | S1 |
| Selector 2 | GPIO18 | S2 |
| Selector 3 | GPIO19 | S3 |
| Enable | GPIO23 | EN |
| Alimentación | 3V3 | VCC |
| Masa | GND | GND |

## Sensores

- Sensor 1 AOUT -> C0
- Sensor 2 AOUT -> C1
- ...
- Sensor 8 AOUT -> C7
- Todos los sensores: VCC -> 3V3, GND -> GND.

La placa final se valida físicamente antes de energizarla. Los nombres impresos en algunos módulos clon pueden variar; se debe confirmar el pinout de la unidad comprada.
