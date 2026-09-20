#pragma once
#include <stdint.h>

namespace plant8 {

struct AutoLearnState {
  uint16_t previousRaw = 0;
  uint16_t candidateBefore = 0;
  uint16_t candidateAfter = 0;
  uint8_t baselineSamples = 0;
  uint8_t candidateConfirmations = 0;
  bool hasPrevious = false;
};

struct AutoLearnResult {
  bool learned = false;
  uint16_t dryRaw = 0;
  uint16_t wetRaw = 0;
};

inline int rawDistance(uint16_t a, uint16_t b) {
  const int d = static_cast<int>(a) - static_cast<int>(b);
  return d < 0 ? -d : d;
}

inline AutoLearnResult observeForAutoCalibration(
    AutoLearnState &state,
    uint16_t raw,
    uint16_t minJump = 120,
    uint16_t stableTolerance = 70,
    uint8_t baselineRequired = 3,
    uint8_t confirmationsRequired = 2) {
  if (!state.hasPrevious) {
    state.previousRaw = raw;
    state.hasPrevious = true;
    state.baselineSamples = 1;
    return {};
  }

  if (state.candidateConfirmations > 0) {
    if (rawDistance(raw, state.candidateAfter) <= stableTolerance) {
      if (state.candidateConfirmations < 255) ++state.candidateConfirmations;
      state.previousRaw = raw;
      if (state.candidateConfirmations >= confirmationsRequired) {
        AutoLearnResult result;
        result.learned = true;
        result.dryRaw = state.candidateBefore;
        result.wetRaw = state.candidateAfter;
        state = AutoLearnState{};
        return result;
      }
      return {};
    }
    state.candidateConfirmations = 0;
    state.baselineSamples = 1;
    state.previousRaw = raw;
    return {};
  }

  const int delta = rawDistance(raw, state.previousRaw);
  if (state.baselineSamples >= baselineRequired && delta >= minJump) {
    state.candidateBefore = state.previousRaw;
    state.candidateAfter = raw;
    state.candidateConfirmations = 1;
    state.previousRaw = raw;
    return {};
  }

  if (state.baselineSamples < 255) ++state.baselineSamples;
  state.previousRaw = raw;
  return {};
}

}
