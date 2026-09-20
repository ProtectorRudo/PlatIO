#pragma once

#include <stdint.h>
#include "PlantLogic.h"

namespace plant8 {

constexpr uint8_t PLANT_COUNT = 8;
constexpr uint8_t MUX_CAPACITY = 16;
constexpr uint16_t CONFIG_VERSION = 3;

struct PlantConfig {
  char name[24];
  uint8_t muxChannel;
  bool enabled;
  bool calibrated;
  uint16_t dryRaw;
  uint16_t wetRaw;
  Thresholds thresholds;
};

struct DeviceConfig {
  uint16_t version;
  char wifiSsid[33];
  char wifiPassword[65];
  char whatsappAccessToken[256];
  char whatsappPhoneNumberId[32];
  char whatsappRecipient[24];
  char whatsappAlertTemplate[64];
  char whatsappRecoveryTemplate[64];
  char whatsappTemplateLanguage[16];
  PlantConfig plants[PLANT_COUNT];
};

struct PlantRuntime {
  uint16_t raw = 0;
  float percent = -1.0f;
  float emaPercent = -1.0f;
  RuntimeState logic;
  bool sensorHealthy = true;
  bool alertSent = false;
};

} // namespace plant8
