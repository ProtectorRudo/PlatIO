#pragma once

#include <stdint.h>
#include <string.h>
#include "PlantLogic.h"

namespace plant8 {

enum class WaterProfile : uint8_t {
  Arid = 0,
  DryDown,
  Balanced,
  EvenMoist,
  Moist
};

inline const char *waterProfileName(WaterProfile profile) {
  switch (profile) {
    case WaterProfile::Arid: return "ARID";
    case WaterProfile::DryDown: return "DRY_DOWN";
    case WaterProfile::Balanced: return "BALANCED";
    case WaterProfile::EvenMoist: return "EVEN_MOIST";
    case WaterProfile::Moist: return "MOIST";
    default: return "BALANCED";
  }
}

inline bool parseWaterProfile(const char *text, WaterProfile &out) {
  if (!text) return false;
  if (strcmp(text, "ARID") == 0) { out = WaterProfile::Arid; return true; }
  if (strcmp(text, "DRY_DOWN") == 0) { out = WaterProfile::DryDown; return true; }
  if (strcmp(text, "BALANCED") == 0) { out = WaterProfile::Balanced; return true; }
  if (strcmp(text, "EVEN_MOIST") == 0) { out = WaterProfile::EvenMoist; return true; }
  if (strcmp(text, "MOIST") == 0) { out = WaterProfile::Moist; return true; }
  return false;
}

inline Thresholds thresholdsForProfile(WaterProfile profile) {
  Thresholds t;
  switch (profile) {
    case WaterProfile::Arid:
      t.dryPercent = 15.0f;
      t.warningPercent = 28.0f;
      t.recoveryPercent = 55.0f;
      t.dryConfirmations = 4;
      t.recoveryConfirmations = 2;
      break;
    case WaterProfile::DryDown:
      t.dryPercent = 24.0f;
      t.warningPercent = 40.0f;
      t.recoveryPercent = 60.0f;
      t.dryConfirmations = 3;
      t.recoveryConfirmations = 2;
      break;
    case WaterProfile::Balanced:
      t.dryPercent = 34.0f;
      t.warningPercent = 50.0f;
      t.recoveryPercent = 66.0f;
      t.dryConfirmations = 3;
      t.recoveryConfirmations = 2;
      break;
    case WaterProfile::EvenMoist:
      t.dryPercent = 44.0f;
      t.warningPercent = 58.0f;
      t.recoveryPercent = 70.0f;
      t.dryConfirmations = 2;
      t.recoveryConfirmations = 2;
      break;
    case WaterProfile::Moist:
      t.dryPercent = 54.0f;
      t.warningPercent = 68.0f;
      t.recoveryPercent = 78.0f;
      t.dryConfirmations = 2;
      t.recoveryConfirmations = 2;
      break;
  }
  return t;
}


inline WetRiskPolicy wetRiskPolicyForProfile(WaterProfile profile) {
  WetRiskPolicy p;
  // PlatIO samples every 5 minutes. These conservative windows intentionally
  // ignore the normal high-moisture period immediately after watering.
  switch (profile) {
    case WaterProfile::Arid:
      p.saturatedPercent = 92.0f;
      p.clearPercent = 82.0f;
      p.saturatedConfirmations = 216; // ~18 h
      p.clearConfirmations = 3;
      break;
    case WaterProfile::DryDown:
      p.saturatedPercent = 93.0f;
      p.clearPercent = 84.0f;
      p.saturatedConfirmations = 288; // ~24 h
      p.clearConfirmations = 3;
      break;
    case WaterProfile::Balanced:
      p.saturatedPercent = 94.0f;
      p.clearPercent = 86.0f;
      p.saturatedConfirmations = 432; // ~36 h
      p.clearConfirmations = 3;
      break;
    case WaterProfile::EvenMoist:
      p.saturatedPercent = 96.0f;
      p.clearPercent = 88.0f;
      p.saturatedConfirmations = 576; // ~48 h
      p.clearConfirmations = 3;
      break;
    case WaterProfile::Moist:
      // Papyrus/carnivorous profiles are intentionally exempt: persistent
      // moisture is expected for these plants and should not create noise.
      p.enabled = false;
      p.saturatedConfirmations = 0;
      break;
  }
  return p;
}

} // namespace plant8
