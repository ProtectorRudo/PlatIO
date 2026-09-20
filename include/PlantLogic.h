#pragma once

#include <stdint.h>

namespace plant8 {

enum class PlantState : uint8_t {
  Uncalibrated = 0,
  Ok,
  Warning,
  NeedsWater
};

struct Thresholds {
  float dryPercent = 25.0f;
  float warningPercent = 40.0f;
  float recoveryPercent = 38.0f;
  uint8_t dryConfirmations = 3;
  uint8_t recoveryConfirmations = 2;
};

struct RuntimeState {
  PlantState state = PlantState::Uncalibrated;
  uint8_t dryCount = 0;
  uint8_t recoveryCount = 0;
};

struct UpdateResult {
  PlantState state;
  bool becameNeedsWater;
  bool recovered;
};

inline float clampPercent(float value) {
  if (value < 0.0f) return 0.0f;
  if (value > 100.0f) return 100.0f;
  return value;
}

inline bool validCalibration(uint16_t dryRaw, uint16_t wetRaw) {
  const int diff = static_cast<int>(dryRaw) - static_cast<int>(wetRaw);
  return diff > 100 || diff < -100;
}

// Works whether a given sensor increases or decreases its raw ADC value when wet.
inline float rawToPercent(uint16_t raw, uint16_t dryRaw, uint16_t wetRaw) {
  if (!validCalibration(dryRaw, wetRaw)) return -1.0f;
  const float numerator = static_cast<float>(raw) - static_cast<float>(dryRaw);
  const float denominator = static_cast<float>(wetRaw) - static_cast<float>(dryRaw);
  return clampPercent((numerator / denominator) * 100.0f);
}

inline UpdateResult updateState(RuntimeState &rt, float percent, const Thresholds &t, bool calibrated) {
  const PlantState previous = rt.state;

  if (!calibrated || percent < 0.0f) {
    rt.state = PlantState::Uncalibrated;
    rt.dryCount = 0;
    rt.recoveryCount = 0;
    return {rt.state, false, false};
  }

  if (rt.state == PlantState::Uncalibrated) {
    rt.state = percent <= t.warningPercent ? PlantState::Warning : PlantState::Ok;
  }

  if (rt.state == PlantState::NeedsWater) {
    if (percent >= t.recoveryPercent) {
      if (rt.recoveryCount < 255) ++rt.recoveryCount;
      if (rt.recoveryCount >= t.recoveryConfirmations) {
        rt.state = percent <= t.warningPercent ? PlantState::Warning : PlantState::Ok;
        rt.dryCount = 0;
        rt.recoveryCount = 0;
      }
    } else {
      rt.recoveryCount = 0;
    }
  } else {
    if (percent <= t.dryPercent) {
      if (rt.dryCount < 255) ++rt.dryCount;
      if (rt.dryCount >= t.dryConfirmations) {
        rt.state = PlantState::NeedsWater;
        rt.recoveryCount = 0;
      } else {
        rt.state = PlantState::Warning;
      }
    } else {
      rt.dryCount = 0;
      rt.state = percent <= t.warningPercent ? PlantState::Warning : PlantState::Ok;
    }
  }

  return {
    rt.state,
    previous != PlantState::NeedsWater && rt.state == PlantState::NeedsWater,
    previous == PlantState::NeedsWater && rt.state != PlantState::NeedsWater
  };
}

inline const char* stateName(PlantState state) {
  switch (state) {
    case PlantState::Ok: return "OK";
    case PlantState::Warning: return "WARNING";
    case PlantState::NeedsWater: return "NEEDS_WATER";
    default: return "UNCALIBRATED";
  }
}

} // namespace plant8
