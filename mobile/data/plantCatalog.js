// PlatIO plant catalog v0.5
// Profiles describe how much dry-down a species generally tolerates.
// They are intentionally qualitative. The ESP32 applies the profile to the
// calibration learned from the real pot/sensor instead of pretending that
// every substrate shares one absolute moisture percentage.

const P = (id, name, scientific, profile, category, aliases = []) => ({
  id, name, scientific, profile, category, aliases,
});

export const WATER_PROFILE_LABELS = {
  ARID: 'Prefiere secarse mucho entre riegos',
  DRY_DOWN: 'Prefiere secarse bastante entre riegos',
  BALANCED: 'Prefiere un ciclo equilibrado',
  EVEN_MOIST: 'Prefiere humedad bastante pareja',
  MOIST: 'Prefiere mantenerse húmeda',
};

export const PLANT_CATALOG = [
  // Interior populares
  P('epipremnum-aureum', 'Potus', 'Epipremnum aureum', 'DRY_DOWN', 'Interior', ['pothos','poto','potus dorado']),
  P('monstera-deliciosa', 'Monstera', 'Monstera deliciosa', 'DRY_DOWN', 'Interior', ['costilla de adán','costilla de adam']),
  P('philodendron-hederaceum', 'Filodendro corazón', 'Philodendron hederaceum', 'DRY_DOWN', 'Interior', ['philodendron scandens','filodendro scandens']),
  P('philodendron-birkin', 'Filodendro Birkin', 'Philodendron Birkin', 'BALANCED', 'Interior', ['birkin']),
  P('philodendron-erubescens', 'Filodendro rojo', 'Philodendron erubescens', 'BALANCED', 'Interior', ['philodendron rojo']),
  P('dracaena-trifasciata', 'Lengua de suegra', 'Dracaena trifasciata', 'ARID', 'Interior', ['sansevieria','espada de san jorge','lengua de tigre']),
  P('zamioculcas-zamiifolia', 'Zamioculca', 'Zamioculcas zamiifolia', 'ARID', 'Interior', ['zz plant','zamioculcas']),
  P('chlorophytum-comosum', 'Lazo de amor', 'Chlorophytum comosum', 'DRY_DOWN', 'Interior', ['cinta','mala madre','planta araña']),
  P('spathiphyllum', 'Espatifilo', 'Spathiphyllum spp.', 'EVEN_MOIST', 'Interior', ['cuna de moisés','lirio de la paz','peace lily']),
  P('aglaonema', 'Aglaonema', 'Aglaonema spp.', 'BALANCED', 'Interior', ['aglaonema china']),
  P('dieffenbachia', 'Diefembaquia', 'Dieffenbachia spp.', 'BALANCED', 'Interior', ['dieffenbachia']),
  P('syngonium-podophyllum', 'Singonio', 'Syngonium podophyllum', 'BALANCED', 'Interior', ['syngonium']),
  P('scindapsus-pictus', 'Potus satinado', 'Scindapsus pictus', 'DRY_DOWN', 'Interior', ['scindapsus']),
  P('ficus-elastica', 'Gomero', 'Ficus elastica', 'DRY_DOWN', 'Interior', ['ficus elastica','árbol del caucho']),
  P('ficus-benjamina', 'Ficus benjamina', 'Ficus benjamina', 'BALANCED', 'Interior', ['benjamina']),
  P('ficus-lyrata', 'Ficus lyrata', 'Ficus lyrata', 'BALANCED', 'Interior', ['higuera hoja de violín','fiddle leaf fig']),
  P('dracaena-fragrans', 'Palo de agua', 'Dracaena fragrans', 'DRY_DOWN', 'Interior', ['tronco de brasil','dracena fragrans']),
  P('dracaena-marginata', 'Drácena marginata', 'Dracaena marginata', 'DRY_DOWN', 'Interior', ['dracena marginata']),
  P('beaucarnea-recurvata', 'Pata de elefante', 'Beaucarnea recurvata', 'ARID', 'Interior', ['beaucarnea','nolina']),
  P('schefflera-arboricola', 'Cheflera', 'Schefflera arboricola', 'BALANCED', 'Interior', ['schefflera']),
  P('pachira-aquatica', 'Pachira', 'Pachira aquatica', 'BALANCED', 'Interior', ['árbol del dinero','money tree']),
  P('hoya-carnosa', 'Flor de cera', 'Hoya carnosa', 'DRY_DOWN', 'Interior', ['hoya']),
  P('peperomia-obtusifolia', 'Peperomia', 'Peperomia obtusifolia', 'DRY_DOWN', 'Interior', ['peperomia verde']),
  P('pilea-peperomioides', 'Pilea', 'Pilea peperomioides', 'BALANCED', 'Interior', ['planta china del dinero']),
  P('fittonia', 'Fitonia', 'Fittonia albivenis', 'MOIST', 'Interior', ['fittonia']),
  P('maranta-leuconeura', 'Maranta', 'Maranta leuconeura', 'EVEN_MOIST', 'Interior', ['planta de la oración']),
  P('calathea-orbifolia', 'Calathea orbifolia', 'Goeppertia orbifolia', 'EVEN_MOIST', 'Interior', ['calatea orbifolia']),
  P('calathea-makoyana', 'Calathea makoyana', 'Goeppertia makoyana', 'EVEN_MOIST', 'Interior', ['calatea pavo real']),
  P('calathea-medallion', 'Calathea medallion', 'Goeppertia roseopicta', 'EVEN_MOIST', 'Interior', ['calatea medallón']),
  P('stromanthe-triostar', 'Stromanthe Triostar', 'Stromanthe sanguinea', 'EVEN_MOIST', 'Interior', ['triostar']),
  P('alocasia-amazonica', 'Alocasia amazónica', 'Alocasia × amazonica', 'EVEN_MOIST', 'Interior', ['oreja de elefante amazónica']),
  P('alocasia-polly', 'Alocasia Polly', 'Alocasia × amazonica Polly', 'EVEN_MOIST', 'Interior', ['alocasia polly']),
  P('colocasia-esculenta', 'Oreja de elefante', 'Colocasia esculenta', 'MOIST', 'Interior', ['colocasia']),
  P('begonia-rex', 'Begonia rex', 'Begonia rex-cultorum', 'EVEN_MOIST', 'Interior', ['begonia de hoja']),
  P('anthurium-andraeanum', 'Anturio', 'Anthurium andraeanum', 'EVEN_MOIST', 'Interior', ['anturio rojo']),
  P('nephrolepis-exaltata', 'Helecho de Boston', 'Nephrolepis exaltata', 'MOIST', 'Interior', ['helecho espada']),
  P('adiantum-raddianum', 'Culantrillo', 'Adiantum raddianum', 'MOIST', 'Interior', ['helecho culantrillo']),
  P('asplenium-nidus', 'Helecho nido de ave', 'Asplenium nidus', 'EVEN_MOIST', 'Interior', ['asplenium']),
  P('croton-codiaeum', 'Croton', 'Codiaeum variegatum', 'BALANCED', 'Interior', ['crotón']),
  P('areca-dypsis', 'Palmera areca', 'Dypsis lutescens', 'BALANCED', 'Interior', ['areca']),
  P('chamaedorea-elegans', 'Palmera de salón', 'Chamaedorea elegans', 'BALANCED', 'Interior', ['chamaedorea']),
  P('strelitzia-nicolai', 'Ave del paraíso blanca', 'Strelitzia nicolai', 'BALANCED', 'Interior', ['strelitzia nicolai']),
  P('strelitzia-reginae', 'Ave del paraíso', 'Strelitzia reginae', 'BALANCED', 'Interior', ['strelitzia']),

  // Cactus y suculentas
  P('aloe-vera', 'Aloe vera', 'Aloe vera', 'ARID', 'Suculenta', ['sábila','sabila']),
  P('echeveria', 'Echeveria', 'Echeveria spp.', 'ARID', 'Suculenta', ['rosa de alabastro']),
  P('crassula-ovata', 'Árbol de jade', 'Crassula ovata', 'ARID', 'Suculenta', ['jade']),
  P('haworthia', 'Haworthia', 'Haworthia spp.', 'ARID', 'Suculenta', []),
  P('sedum', 'Sedum', 'Sedum spp.', 'ARID', 'Suculenta', []),
  P('kalanchoe-blossfeldiana', 'Kalanchoe', 'Kalanchoe blossfeldiana', 'ARID', 'Suculenta', ['calanchoe']),
  P('portulacaria-afra', 'Portulacaria', 'Portulacaria afra', 'ARID', 'Suculenta', ['arbusto elefante']),
  P('euphorbia-trigona', 'Euphorbia trigona', 'Euphorbia trigona', 'ARID', 'Suculenta', ['cactus catedral']),
  P('agave-americana', 'Agave', 'Agave americana', 'ARID', 'Suculenta', ['maguey']),
  P('schlumbergera', 'Cactus de Navidad', 'Schlumbergera spp.', 'DRY_DOWN', 'Suculenta', ['cactus navideño']),
  P('cactus-generic', 'Cactus', 'Cactaceae', 'ARID', 'Cactus', ['cactus genérico']),

  // Flores, balcón y jardín
  P('jasminum-officinale', 'Jazmín común', 'Jasminum officinale', 'BALANCED', 'Jardín', ['jazmín','jazmin','jazmín blanco']),
  P('jasminum-polyanthum', 'Jazmín chino', 'Jasminum polyanthum', 'EVEN_MOIST', 'Jardín', ['jazmín de china']),
  P('trachelospermum-jasminoides', 'Jazmín estrella', 'Trachelospermum jasminoides', 'BALANCED', 'Jardín', ['jazmín de leche','falso jazmín']),
  P('gardenia-jasminoides', 'Jazmín del cabo', 'Gardenia jasminoides', 'EVEN_MOIST', 'Jardín', ['gardenia']),
  P('rosa', 'Rosa', 'Rosa spp.', 'BALANCED', 'Jardín', ['rosal']),
  P('pelargonium', 'Geranio', 'Pelargonium spp.', 'DRY_DOWN', 'Jardín', ['malvón','malvon']),
  P('petunia', 'Petunia', 'Petunia × atkinsiana', 'BALANCED', 'Jardín', []),
  P('viola', 'Pensamiento', 'Viola × wittrockiana', 'BALANCED', 'Jardín', ['viola']),
  P('chrysanthemum', 'Crisantemo', 'Chrysanthemum × morifolium', 'BALANCED', 'Jardín', []),
  P('dahlia', 'Dalia', 'Dahlia spp.', 'BALANCED', 'Jardín', []),
  P('hydrangea-macrophylla', 'Hortensia', 'Hydrangea macrophylla', 'EVEN_MOIST', 'Jardín', []),
  P('azalea', 'Azalea', 'Rhododendron spp.', 'EVEN_MOIST', 'Jardín', []),
  P('lavandula-angustifolia', 'Lavanda', 'Lavandula angustifolia', 'DRY_DOWN', 'Jardín', ['lavanda inglesa']),
  P('rosemary', 'Romero', 'Salvia rosmarinus', 'DRY_DOWN', 'Aromática', ['rosmarinus officinalis']),
  P('salvia-officinalis', 'Salvia', 'Salvia officinalis', 'DRY_DOWN', 'Aromática', []),
  P('bougainvillea', 'Santa Rita', 'Bougainvillea spp.', 'DRY_DOWN', 'Jardín', ['buganvilla','bugambilia']),
  P('hibiscus-rosa-sinensis', 'Hibisco', 'Hibiscus rosa-sinensis', 'BALANCED', 'Jardín', ['rosa china']),
  P('dipladenia', 'Dipladenia', 'Mandevilla spp.', 'BALANCED', 'Jardín', ['mandevilla']),
  P('lantana-camara', 'Lantana', 'Lantana camara', 'DRY_DOWN', 'Jardín', ['banderita española']),
  P('impatiens-walleriana', 'Alegría del hogar', 'Impatiens walleriana', 'EVEN_MOIST', 'Jardín', ['alegría']),
  P('cyclamen-persicum', 'Ciclamen', 'Cyclamen persicum', 'EVEN_MOIST', 'Jardín', ['violeta de los alpes']),
  P('primula', 'Prímula', 'Primula spp.', 'EVEN_MOIST', 'Jardín', ['primavera']),
  P('gerbera-jamesonii', 'Gerbera', 'Gerbera jamesonii', 'BALANCED', 'Jardín', []),
  P('marguerite-daisy', 'Margarita', 'Leucanthemum × superbum', 'BALANCED', 'Jardín', ['margarita blanca']),
  P('gypsophila-paniculata', 'Gipsófila', 'Gypsophila paniculata', 'DRY_DOWN', 'Jardín', ['velo de novia','coronita de novia']),
  P('plumbago-auriculata', 'Jazmín del cielo', 'Plumbago auriculata', 'BALANCED', 'Jardín', ['plumbago','celestina']),
  P('abelia', 'Abelia', 'Abelia × grandiflora', 'BALANCED', 'Jardín', []),
  P('oleander', 'Laurel de jardín', 'Nerium oleander', 'DRY_DOWN', 'Jardín', ['adelfa']),
  P('boxwood', 'Boj', 'Buxus sempervirens', 'BALANCED', 'Jardín', ['buxus']),
  P('ficus-pumila', 'Enamorada del muro', 'Ficus pumila', 'BALANCED', 'Jardín', ['ficus rastrero']),
  P('hedera-helix', 'Hiedra', 'Hedera helix', 'BALANCED', 'Jardín', ['hiedra inglesa']),

  // Aromáticas y huerta
  P('ocimum-basilicum', 'Albahaca', 'Ocimum basilicum', 'EVEN_MOIST', 'Aromática', ['basil']),
  P('mentha', 'Menta', 'Mentha spp.', 'MOIST', 'Aromática', ['hierbabuena']),
  P('parsley', 'Perejil', 'Petroselinum crispum', 'EVEN_MOIST', 'Aromática', []),
  P('cilantro', 'Cilantro', 'Coriandrum sativum', 'EVEN_MOIST', 'Aromática', ['coriandro']),
  P('thyme', 'Tomillo', 'Thymus vulgaris', 'DRY_DOWN', 'Aromática', []),
  P('oregano', 'Orégano', 'Origanum vulgare', 'DRY_DOWN', 'Aromática', ['oregano']),
  P('chives', 'Ciboulette', 'Allium schoenoprasum', 'BALANCED', 'Aromática', ['cebollín','cebollino']),
  P('lemon-balm', 'Melisa', 'Melissa officinalis', 'BALANCED', 'Aromática', ['toronjil']),
  P('tomato', 'Tomate', 'Solanum lycopersicum', 'EVEN_MOIST', 'Huerta', ['tomatera']),
  P('cherry-tomato', 'Tomate cherry', 'Solanum lycopersicum var. cerasiforme', 'EVEN_MOIST', 'Huerta', ['cherry']),
  P('pepper', 'Morrón', 'Capsicum annuum', 'BALANCED', 'Huerta', ['pimiento','ají morrón','aji morron']),
  P('chili', 'Ají', 'Capsicum spp.', 'BALANCED', 'Huerta', ['chile','ají picante']),
  P('lettuce', 'Lechuga', 'Lactuca sativa', 'EVEN_MOIST', 'Huerta', []),
  P('arugula', 'Rúcula', 'Eruca vesicaria', 'EVEN_MOIST', 'Huerta', ['rucula']),
  P('spinach', 'Espinaca', 'Spinacia oleracea', 'EVEN_MOIST', 'Huerta', []),
  P('strawberry', 'Frutilla', 'Fragaria × ananassa', 'EVEN_MOIST', 'Huerta', ['fresa']),
  P('cucumber', 'Pepino', 'Cucumis sativus', 'EVEN_MOIST', 'Huerta', []),
  P('zucchini', 'Zapallito zucchini', 'Cucurbita pepo', 'BALANCED', 'Huerta', ['zucchini','calabacín']),
  P('pumpkin', 'Zapallo', 'Cucurbita spp.', 'BALANCED', 'Huerta', ['calabaza']),
  P('eggplant', 'Berenjena', 'Solanum melongena', 'BALANCED', 'Huerta', []),
  P('green-bean', 'Chaucha', 'Phaseolus vulgaris', 'BALANCED', 'Huerta', ['judía verde','ejote']),
  P('pea', 'Arveja', 'Pisum sativum', 'BALANCED', 'Huerta', ['guisante']),
  P('carrot', 'Zanahoria', 'Daucus carota subsp. sativus', 'EVEN_MOIST', 'Huerta', []),
  P('radish', 'Rabanito', 'Raphanus sativus', 'EVEN_MOIST', 'Huerta', ['rábano']),
  P('onion', 'Cebolla', 'Allium cepa', 'BALANCED', 'Huerta', []),
  P('garlic', 'Ajo', 'Allium sativum', 'BALANCED', 'Huerta', []),

  // Frutales en maceta/jardín
  P('lemon', 'Limonero', 'Citrus limon', 'BALANCED', 'Frutal', ['limón']),
  P('orange', 'Naranjo', 'Citrus × sinensis', 'BALANCED', 'Frutal', ['naranja']),
  P('mandarin', 'Mandarino', 'Citrus reticulata', 'BALANCED', 'Frutal', ['mandarina']),
  P('kumquat', 'Kumquat', 'Citrus japonica', 'BALANCED', 'Frutal', ['quinoto']),
  P('avocado', 'Palta', 'Persea americana', 'EVEN_MOIST', 'Frutal', ['aguacate']),
  P('blueberry', 'Arándano', 'Vaccinium corymbosum', 'EVEN_MOIST', 'Frutal', ['arandano']),
  P('raspberry', 'Frambuesa', 'Rubus idaeus', 'EVEN_MOIST', 'Frutal', []),
  P('fig', 'Higuera', 'Ficus carica', 'DRY_DOWN', 'Frutal', ['higo']),
  P('olive', 'Olivo', 'Olea europaea', 'DRY_DOWN', 'Frutal', ['oliva']),

  // Muy húmedas / especiales
  P('cyperus-papyrus', 'Papiro', 'Cyperus papyrus', 'MOIST', 'Acuática', ['papiro egipcio']),
  P('cyperus-alternifolius', 'Paragüita', 'Cyperus alternifolius', 'MOIST', 'Acuática', ['papiro paraguas']),
  P('sarracenia', 'Sarracenia', 'Sarracenia spp.', 'MOIST', 'Carnívora', ['planta jarra']),
  P('dionaea-muscipula', 'Venus atrapamoscas', 'Dionaea muscipula', 'MOIST', 'Carnívora', ['venus flytrap']),
  P('drosera', 'Drosera', 'Drosera spp.', 'MOIST', 'Carnívora', ['rocío del sol']),
];

export function normalizePlantSearch(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function searchPlants(query, limit = 30) {
  const q = normalizePlantSearch(query);
  if (!q) return PLANT_CATALOG.slice(0, limit);

  return PLANT_CATALOG
    .map((plant) => {
      const haystack = normalizePlantSearch(
        [plant.name, plant.scientific, plant.category, ...plant.aliases].join(' '),
      );
      const exactName = normalizePlantSearch(plant.name) === q ? 0 : 1;
      const starts = haystack.startsWith(q) ? 0 : 1;
      const contains = haystack.includes(q) ? 0 : 1;
      return { plant, rank: exactName * 100 + starts * 10 + contains };
    })
    .filter(({ rank }) => rank < 111)
    .sort((a, b) => a.rank - b.rank || a.plant.name.localeCompare(b.plant.name, 'es'))
    .slice(0, limit)
    .map(({ plant }) => plant);
}

export function plantById(id) {
  return PLANT_CATALOG.find((plant) => plant.id === id) ?? null;
}
