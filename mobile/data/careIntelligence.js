// Human-readable care language for PlatIO.
// The firmware owns sensor math; this module turns its states into useful,
// species-aware guidance without exposing percentages or ADC values.

const PROFILE_COPY = {
  ARID: {
    ok: 'Está bien así. Prefiere pasar bastante tiempo con el sustrato seco.',
    warning: 'Está entrando en una zona seca que suele tolerar bien. Todavía puede esperar.',
    water: 'Ya se secó lo suficiente. Podés regarla bien y dejar que drene.',
  },
  DRY_DOWN: {
    ok: 'Tiene la humedad que necesita y agradece que el sustrato se airee entre riegos.',
    warning: 'Se está secando de a poco. No hace falta adelantarse todavía.',
    water: 'Ya llegó a un punto en el que conviene regarla hoy.',
  },
  BALANCED: {
    ok: 'Está en un punto cómodo. No hace falta hacer nada.',
    warning: 'Se está secando. Podés esperar un poco y PlatIO te avisa.',
    water: 'Le vendría bien agua hoy. Regá hasta humedecer bien el sustrato.',
  },
  EVEN_MOIST: {
    ok: 'Está cómoda con una humedad bastante pareja.',
    warning: 'Está perdiendo humedad. Conviene seguirla de cerca.',
    water: 'Ya está más seca de lo que le gusta. Conviene regarla hoy.',
  },
  MOIST: {
    ok: 'Está cómoda y conserva la humedad que necesita.',
    warning: 'Empieza a faltarle humedad. Mejor no dejar que se seque demasiado.',
    water: 'Necesita recuperar humedad hoy. Regá y evitá que el sustrato quede seco.',
  },
};

const DEFAULT_PROFILE = PROFILE_COPY.BALANCED;

export function getPlantStatusCopy(plant, species) {
  if (!plant?.speciesId) {
    return {
      emoji: '➕',
      title: 'Elegí qué planta hay acá',
      detail: 'Con eso PlatIO adapta automáticamente cómo interpreta este sensor.',
    };
  }

  if (!plant.healthy) {
    return {
      emoji: '🛠️',
      title: 'Quiero revisar este sensor',
      detail: 'La lectura no parece confiable. Revisá que el sensor esté conectado y dentro de la tierra.',
    };
  }

  const profile = PROFILE_COPY[species?.profile ?? plant.waterProfile] ?? DEFAULT_PROFILE;

  switch (plant.state) {
    case 'OK':
      return { emoji: '💚', title: 'Está cómoda', detail: profile.ok };
    case 'WARNING':
      return { emoji: '🌤️', title: 'Se está secando', detail: profile.warning };
    case 'NEEDS_WATER':
      return { emoji: '💧', title: 'Le vendría bien agua hoy', detail: profile.water };
    default:
      return {
        emoji: '🌱',
        title: 'Estoy aprendiendo esta maceta',
        detail: 'PlatIO está observando cómo responde el sensor antes y después del riego para conocer esta maceta.',
      };
  }
}

export function getHomeSummary(plants = []) {
  const configured = plants.filter((plant) => Boolean(plant.speciesId));
  const urgent = configured.filter((plant) => plant.state === 'NEEDS_WATER' && plant.healthy);
  const sensorIssues = configured.filter((plant) => !plant.healthy);

  if (!configured.length) {
    return {
      title: 'Empecemos por tus plantas',
      text: 'Tocá una maceta y decime qué planta hay. PlatIO configura el resto.',
    };
  }

  if (sensorIssues.length) {
    const count = sensorIssues.length;
    return {
      title: count === 1 ? 'Hay un sensor para revisar' : 'Hay sensores para revisar',
      text: count === 1
        ? 'Una maceta no está dando una lectura confiable.'
        : `${count} macetas no están dando una lectura confiable.`,
    };
  }

  if (urgent.length) {
    const count = urgent.length;
    return {
      title: count === 1 ? 'Una planta pide atención' : 'Hay plantas que piden atención',
      text: count === 1
        ? `${urgent[0].name} necesita agua hoy.`
        : `${count} plantas necesitan agua hoy.`,
    };
  }

  const pending = Math.max(plants.length - configured.length, 0);
  if (pending > 0) {
    return {
      title: 'Todo en calma',
      text: `Tus plantas configuradas están bien. Te quedan ${pending} maceta${pending === 1 ? '' : 's'} por identificar.`,
    };
  }

  return {
    title: 'Todo en calma',
    text: 'No hay nada urgente. PlatIO sigue mirando por vos.',
  };
}
