export const SIZE_IT_UP_CHALLENGE_TYPE = 'sizeItUp';
export const SIZE_IT_UP_CHALLENGE_ID = 'size-it-up';
export const SIZE_IT_UP_POOL_VERSION = 2;
export const SIZE_IT_UP_DURATION_SECONDS = 30;
export const SIZE_IT_UP_ACCURACY_THRESHOLD_PERCENT = 15;
export const SIZE_IT_UP_MIN_RATIO = 0.1;
export const SIZE_IT_UP_MAX_RATIO = 5;

export const getDimensionMeta = (axis = 'height') => (
  axis === 'length'
    ? {
      axis: 'length',
      badge: '↔ LENGTH',
      directionHint: 'end to end',
      label: 'LENGTH',
      symbol: '↔',
    }
    : {
      axis: 'height',
      badge: '↕ HEIGHT',
      directionHint: 'bottom to top',
      label: 'HEIGHT',
      symbol: '↕',
    }
);

const item = ({
  axis = 'height',
  category,
  id,
  label,
  metres,
  silhouette,
  sourceLabel,
  sourceUrl,
}) => ({
  axis,
  category,
  id,
  label,
  metres,
  silhouette,
  sourceLabel,
  sourceUrl,
});

const ITEMS = {
  human: item({
    id: 'human', label: 'Adult traveller', metres: 1.75, category: 'animals',
    silhouette: 'person', sourceLabel: 'Our World in Data',
    sourceUrl: 'https://ourworldindata.org/human-height',
  }),
  giraffe: item({
    id: 'giraffe', label: 'Giraffe', metres: 5.5, category: 'animals',
    silhouette: 'giraffe', sourceLabel: 'Encyclopaedia Britannica',
    sourceUrl: 'https://www.britannica.com/animal/giraffe',
  }),
  elephant: item({
    id: 'elephant', label: 'African elephant', metres: 3.3, category: 'animals',
    silhouette: 'elephant', sourceLabel: 'Encyclopaedia Britannica',
    sourceUrl: 'https://www.britannica.com/animal/African-elephant',
  }),
  dog: item({
    id: 'dog', label: 'Large dog', metres: 0.7, category: 'animals',
    silhouette: 'dog', sourceLabel: 'American Kennel Club',
    sourceUrl: 'https://www.akc.org/dog-breeds/great-dane/',
  }),
  ostrich: item({
    id: 'ostrich', label: 'Ostrich', metres: 2.7, category: 'animals',
    silhouette: 'ostrich', sourceLabel: 'San Diego Zoo',
    sourceUrl: 'https://animals.sandiegozoo.org/animals/ostrich',
  }),
  seaTurtle: item({
    id: 'sea-turtle', label: 'Green sea turtle', metres: 1.2, axis: 'length', category: 'animals',
    silhouette: 'turtle', sourceLabel: 'NOAA Fisheries',
    sourceUrl: 'https://www.fisheries.noaa.gov/species/green-turtle',
  }),
  bicycle: item({
    id: 'bicycle', label: 'Touring bicycle', metres: 1.75, axis: 'length', category: 'vehicles',
    silhouette: 'bicycle', sourceLabel: 'Bicycle reference dimensions',
    sourceUrl: 'https://en.wikipedia.org/wiki/Bicycle',
  }),
  camperVan: item({
    id: 'camper-van', label: 'Camper van', metres: 4.9, axis: 'length', category: 'vehicles',
    silhouette: 'road-vehicle', sourceLabel: 'Volkswagen California specifications',
    sourceUrl: 'https://www.volkswagen-vans.co.uk/en/new-vehicles/california.html',
  }),
  cityBus: item({
    id: 'city-bus', label: 'City bus', metres: 12, axis: 'length', category: 'vehicles',
    silhouette: 'bus', sourceLabel: 'European Commission vehicle dimensions',
    sourceUrl: 'https://transport.ec.europa.eu/transport-themes/vehicles/weights-and-dimensions_en',
  }),
  blueWhale: item({
    id: 'blue-whale', label: 'Blue whale', metres: 27, axis: 'length', category: 'animals',
    silhouette: 'whale', sourceLabel: 'NOAA Fisheries',
    sourceUrl: 'https://www.fisheries.noaa.gov/species/blue-whale',
  }),
  tukTuk: item({
    id: 'tuk-tuk', label: 'Tuk-tuk', metres: 2.65, axis: 'length', category: 'vehicles',
    silhouette: 'tuk-tuk', sourceLabel: 'Bajaj RE specifications',
    sourceUrl: 'https://www.bajajauto.com/three-wheelers/re',
  }),
  minivan: item({
    id: 'minivan', label: 'Minivan', metres: 5.1, axis: 'length', category: 'vehicles',
    silhouette: 'road-vehicle', sourceLabel: 'Volkswagen Multivan specifications',
    sourceUrl: 'https://www.volkswagen-vans.co.uk/en/new-vehicles/multivan.html',
  }),
  airliner: item({
    id: 'airliner', label: 'Airbus A320', metres: 37.57, axis: 'length', category: 'vehicles',
    silhouette: 'airliner', sourceLabel: 'Airbus aircraft characteristics',
    sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a320-family',
  }),
  carryOn: item({
    id: 'carry-on', label: 'Carry-on suitcase', metres: 0.55, category: 'objects',
    silhouette: 'luggage', sourceLabel: 'IATA baggage guidance',
    sourceUrl: 'https://www.iata.org/en/programs/ops-infra/baggage/check-bag/',
  }),
  guitar: item({
    id: 'guitar', label: 'Acoustic guitar', metres: 1.02, category: 'objects',
    silhouette: 'guitar', sourceLabel: 'Common full-size guitar dimensions',
    sourceUrl: 'https://en.wikipedia.org/wiki/Acoustic_guitar',
  }),
  wineBottle: item({
    id: 'wine-bottle', label: 'Wine bottle', metres: 0.3, category: 'objects',
    silhouette: 'bottle', sourceLabel: 'Standard wine bottle reference',
    sourceUrl: 'https://en.wikipedia.org/wiki/Wine_bottle',
  }),
  bowlingPin: item({
    id: 'bowling-pin', label: 'Bowling pin', metres: 0.381, category: 'objects',
    silhouette: 'bowling-pin', sourceLabel: 'USBC equipment specifications',
    sourceUrl: 'https://bowl.com/equipment-specifications',
  }),
  umbrella: item({
    id: 'beach-umbrella', label: 'Beach umbrella', metres: 2.1, category: 'objects',
    silhouette: 'umbrella', sourceLabel: 'Typical commercial beach umbrella',
    sourceUrl: 'https://en.wikipedia.org/wiki/Umbrella',
  }),
  palmTree: item({
    id: 'palm-tree', label: 'Date palm', metres: 8, category: 'objects',
    silhouette: 'palm', sourceLabel: 'Royal Botanic Gardens, Kew',
    sourceUrl: 'https://powo.science.kew.org/',
  }),
  backpack: item({
    id: 'backpack', label: 'Travel backpack', metres: 0.5, category: 'objects',
    silhouette: 'backpack', sourceLabel: 'Typical carry-on backpack',
    sourceUrl: 'https://en.wikipedia.org/wiki/Backpack',
  }),
  kayak: item({
    id: 'sea-kayak', label: 'Sea kayak', metres: 5.2, axis: 'length', category: 'objects',
    silhouette: 'kayak', sourceLabel: 'Typical touring kayak',
    sourceUrl: 'https://en.wikipedia.org/wiki/Sea_kayak',
  }),
  statueLiberty: item({
    id: 'statue-liberty', label: 'Statue of Liberty', metres: 93, category: 'landmarks',
    silhouette: 'statue', sourceLabel: 'US National Park Service',
    sourceUrl: 'https://www.nps.gov/stli/learn/historyculture/statue-statistics.htm',
  }),
  eiffelTower: item({
    id: 'eiffel-tower', label: 'Eiffel Tower', metres: 330, category: 'landmarks',
    silhouette: 'eiffel', sourceLabel: 'Eiffel Tower official site',
    sourceUrl: 'https://www.toureiffel.paris/en/the-monument/key-figures',
  }),
  pisaTower: item({
    id: 'pisa-tower', label: 'Leaning Tower of Pisa', metres: 56.67, category: 'landmarks',
    silhouette: 'tower', sourceLabel: 'Opera della Primaziale Pisana',
    sourceUrl: 'https://www.opapisa.it/en/square-of-miracles/tower/',
  }),
  elizabethTower: item({
    id: 'elizabeth-tower', label: 'Elizabeth Tower', metres: 96, category: 'landmarks',
    silhouette: 'clock-tower', sourceLabel: 'UK Parliament',
    sourceUrl: 'https://www.parliament.uk/about/living-heritage/building/palace/big-ben/',
  }),
  atomium: item({
    id: 'atomium', label: 'Atomium', metres: 102, category: 'landmarks',
    silhouette: 'atomium', sourceLabel: 'Atomium official site',
    sourceUrl: 'https://www.atomium.be/discover',
  }),
  londonEye: item({
    id: 'london-eye', label: 'London Eye', metres: 135, category: 'landmarks',
    silhouette: 'wheel', sourceLabel: 'London Eye official facts',
    sourceUrl: 'https://www.londoneye.com/our-company/about-us/',
  }),
  arcTriomphe: item({
    id: 'arc-triomphe', label: 'Arc de Triomphe', metres: 50, category: 'landmarks',
    silhouette: 'arch', sourceLabel: 'Centre des monuments nationaux',
    sourceUrl: 'https://www.paris-arc-de-triomphe.fr/en/discover/history-of-the-arc-de-triomphe',
  }),
  colosseum: item({
    id: 'colosseum', label: 'Colosseum', metres: 48, category: 'landmarks',
    silhouette: 'colosseum', sourceLabel: 'Parco archeologico del Colosseo',
    sourceUrl: 'https://colosseo.it/en/area/the-colosseum/',
  }),
};

const round = (id, reference, target) => ({ id, reference, target });

export const SIZE_IT_UP_ROUNDS = [
  round('cross-bottle-dog', ITEMS.wineBottle, ITEMS.dog),
  round('cross-bowling-dog', ITEMS.bowlingPin, ITEMS.dog),
  round('cross-dog-guitar', ITEMS.dog, ITEMS.guitar),
  round('cross-backpack-turtle', ITEMS.backpack, ITEMS.seaTurtle),
  round('cross-turtle-carryon', ITEMS.seaTurtle, ITEMS.carryOn),
  round('cross-guitar-bicycle', ITEMS.guitar, ITEMS.bicycle),
  round('cross-turtle-bicycle', ITEMS.seaTurtle, ITEMS.bicycle),
  round('cross-carryon-human', ITEMS.carryOn, ITEMS.human),
  round('cross-human-guitar', ITEMS.human, ITEMS.guitar),
  round('cross-human-tuktuk', ITEMS.human, ITEMS.tukTuk),
  round('cross-bicycle-ostrich', ITEMS.bicycle, ITEMS.ostrich),
  round('cross-umbrella-ostrich', ITEMS.umbrella, ITEMS.ostrich),
  round('cross-ostrich-bicycle', ITEMS.ostrich, ITEMS.bicycle),
  round('cross-umbrella-elephant', ITEMS.umbrella, ITEMS.elephant),
  round('cross-tuktuk-elephant', ITEMS.tukTuk, ITEMS.elephant),
  round('cross-elephant-camper', ITEMS.elephant, ITEMS.camperVan),
  round('cross-camper-elephant', ITEMS.camperVan, ITEMS.elephant),
  round('cross-elephant-kayak', ITEMS.elephant, ITEMS.kayak),
  round('cross-tuktuk-giraffe', ITEMS.tukTuk, ITEMS.giraffe),
  round('cross-giraffe-palm', ITEMS.giraffe, ITEMS.palmTree),
  round('cross-minivan-palm', ITEMS.minivan, ITEMS.palmTree),
  round('cross-bus-giraffe', ITEMS.cityBus, ITEMS.giraffe),
  round('cross-palm-bus', ITEMS.palmTree, ITEMS.cityBus),
  round('cross-bus-whale', ITEMS.cityBus, ITEMS.blueWhale),
  round('cross-whale-airliner', ITEMS.blueWhale, ITEMS.airliner),
  round('cross-whale-colosseum', ITEMS.blueWhale, ITEMS.colosseum),
  round('cross-airliner-arc', ITEMS.airliner, ITEMS.arcTriomphe),
  round('cross-pisa-airliner', ITEMS.pisaTower, ITEMS.airliner),
  round('cross-airliner-liberty', ITEMS.airliner, ITEMS.statueLiberty),
  round('cross-elizabeth-airliner', ITEMS.elizabethTower, ITEMS.airliner),
  round('cross-atomium-whale', ITEMS.atomium, ITEMS.blueWhale),
  round('cross-airliner-londoneye', ITEMS.airliner, ITEMS.londonEye),
];

const hashSeed = (seed) => String(seed).split('').reduce((total, character) => (
  ((total * 31) + character.charCodeAt(0)) >>> 0
), 0);

export const clampSizeEstimate = (value) => Math.min(
  SIZE_IT_UP_MAX_RATIO,
  Math.max(SIZE_IT_UP_MIN_RATIO, Number(value) || 1)
);

export const evaluateSizeEstimate = ({
  accuracyThresholdPercent = SIZE_IT_UP_ACCURACY_THRESHOLD_PERCENT,
  estimatedRatio,
  trueRatio,
}) => {
  const safeTrueRatio = Math.max(Number(trueRatio) || 1, Number.EPSILON);
  const safeEstimate = clampSizeEstimate(estimatedRatio);
  const errorPercent = Math.abs(safeEstimate - safeTrueRatio) / safeTrueRatio * 100;
  return {
    estimatedRatio: safeEstimate,
    errorPercent,
    passed: errorPercent <= Number(accuracyThresholdPercent) + 1e-9,
  };
};

export const selectSizeItUpRound = ({ seed = '', usedRoundIds = [] } = {}) => {
  const used = new Set(Array.isArray(usedRoundIds) ? usedRoundIds : []);
  const unused = SIZE_IT_UP_ROUNDS.filter(({ id }) => !used.has(id));
  const candidates = unused.length ? unused : SIZE_IT_UP_ROUNDS;
  const selected = candidates[hashSeed(seed) % candidates.length] || SIZE_IT_UP_ROUNDS[0];
  const nextUsedRoundIds = unused.length
    ? [...used, selected.id]
    : [selected.id];
  return { round: selected, nextUsedRoundIds };
};

export const formatSizeMeasurement = (metres) => {
  const value = Number(metres) || 0;
  if (value < 1) return `${Math.round(value * 100)} cm`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} km`;
  if (value >= 100) return `${Math.round(value)} m`;
  const formatted = value.toFixed(value < 10 ? 2 : 1).replace(/\.?0+$/, '');
  return `${formatted} m`;
};
