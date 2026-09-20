const EVENT_COPY = {
  NEEDS_WATER: {
    emoji: '💧',
    text: (name) => `${name} empezó a pedir agua.`,
  },
  RECOVERED: {
    emoji: '🌿',
    text: (name) => `${name} volvió a estar bien hidratada.`,
  },
  TOO_WET: {
    emoji: '💦',
    text: (name) => `${name} lleva demasiado tiempo muy húmeda.`,
  },
  WET_CLEARED: {
    emoji: '🌱',
    text: (name) => `La humedad de ${name} volvió a una zona segura.`,
  },
  AUTO_CALIBRATED: {
    emoji: '✨',
    text: (name) => `PlatIO aprendió cómo responde la maceta de ${name}.`,
  },
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function formatHistoryTime(timestamp, now = new Date()) {
  if (!timestamp) return 'Reciente';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return 'Reciente';

  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (sameLocalDay(date, now)) return `Hoy · ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameLocalDay(date, yesterday)) return `Ayer · ${time}`;

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)} · ${time}`;
}

export function humanHistoryEvent(event) {
  const copy = EVENT_COPY[event?.kind] ?? {
    emoji: '🌱',
    text: (name) => `Hubo un cambio en ${name}.`,
  };
  const name = event?.plantName || `Maceta ${(event?.plantIndex ?? 0) + 1}`;
  return {
    emoji: copy.emoji,
    text: copy.text(name),
  };
}

function humanDuration(seconds) {
  const hours = Math.round(seconds / 3600);
  if (hours < 48) return `${Math.max(hours, 1)} h`;
  const days = Math.round(hours / 24);
  return `${days} día${days === 1 ? '' : 's'}`;
}

export function latestCycleInsight(events = [], plantIndex) {
  const needsPosition = events.findIndex(
    (event) =>
      event.plantIndex === plantIndex &&
      event.kind === 'NEEDS_WATER' &&
      event.timestamp > 0,
  );
  if (needsPosition < 0) return null;

  const needs = events[needsPosition];
  for (let i = needsPosition + 1; i < events.length; ++i) {
    const recovered = events[i];
    if (
      recovered.plantIndex === plantIndex &&
      recovered.kind === 'RECOVERED' &&
      recovered.timestamp > 0 &&
      recovered.timestamp < needs.timestamp
    ) {
      const seconds = needs.timestamp - recovered.timestamp;
      if (seconds < 6 * 3600 || seconds > 90 * 24 * 3600) return null;
      return `Último ciclo · ${humanDuration(seconds)} hasta volver a pedir agua`;
    }
  }
  return null;
}
