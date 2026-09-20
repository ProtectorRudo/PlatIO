#pragma once

#include <stdint.h>
#include <string.h>

namespace plant8 {

constexpr uint16_t HISTORY_VERSION = 1;
constexpr uint8_t HISTORY_CAPACITY = 48;

enum class PlantEventKind : uint8_t {
  NeedsWater = 1,
  Recovered = 2,
  TooWet = 3,
  WetCleared = 4,
  AutoCalibrated = 5
};

struct PlantEvent {
  uint32_t timestamp = 0;
  uint8_t plantIndex = 0;
  PlantEventKind kind = PlantEventKind::NeedsWater;
  char plantName[32] = {};
};

struct HistoryStore {
  uint16_t version = HISTORY_VERSION;
  uint8_t next = 0;
  uint8_t count = 0;
  PlantEvent entries[HISTORY_CAPACITY] = {};
};

inline void resetHistory(HistoryStore &store) {
  memset(&store, 0, sizeof(store));
  store.version = HISTORY_VERSION;
}

inline bool validHistoryStore(const HistoryStore &store) {
  return store.version == HISTORY_VERSION &&
         store.next < HISTORY_CAPACITY &&
         store.count <= HISTORY_CAPACITY;
}

inline void appendHistory(
    HistoryStore &store,
    uint32_t timestamp,
    uint8_t plantIndex,
    PlantEventKind kind,
    const char *plantName) {
  if (!validHistoryStore(store)) resetHistory(store);

  PlantEvent &event = store.entries[store.next];
  event.timestamp = timestamp;
  event.plantIndex = plantIndex;
  event.kind = kind;
  memset(event.plantName, 0, sizeof(event.plantName));
  if (plantName) {
    strncpy(event.plantName, plantName, sizeof(event.plantName) - 1);
    event.plantName[sizeof(event.plantName) - 1] = '\0';
  }

  store.next = static_cast<uint8_t>((store.next + 1) % HISTORY_CAPACITY);
  if (store.count < HISTORY_CAPACITY) ++store.count;
}

inline const PlantEvent *historyNewest(const HistoryStore &store, uint8_t offset) {
  if (!validHistoryStore(store) || offset >= store.count) return nullptr;
  const int index =
      (static_cast<int>(store.next) + HISTORY_CAPACITY - 1 - offset) % HISTORY_CAPACITY;
  return &store.entries[index];
}

inline const PlantEvent *latestEventForPlant(const HistoryStore &store, uint8_t plantIndex) {
  for (uint8_t i = 0; i < store.count; ++i) {
    const PlantEvent *event = historyNewest(store, i);
    if (event && event->plantIndex == plantIndex) return event;
  }
  return nullptr;
}

inline const char *plantEventKindName(PlantEventKind kind) {
  switch (kind) {
    case PlantEventKind::NeedsWater: return "NEEDS_WATER";
    case PlantEventKind::Recovered: return "RECOVERED";
    case PlantEventKind::TooWet: return "TOO_WET";
    case PlantEventKind::WetCleared: return "WET_CLEARED";
    case PlantEventKind::AutoCalibrated: return "AUTO_CALIBRATED";
    default: return "UNKNOWN";
  }
}

} // namespace plant8
