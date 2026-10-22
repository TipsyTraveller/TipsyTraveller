export const COUNTRY_FLAGS = {
  Albania: { stripes: ['#E41E20', '#111111', '#E41E20'] },
  Andorra: { stripes: ['#10069F', '#FEDD00', '#D50032'] },
  Armenia: { stripes: ['#D90012', '#0033A0', '#F2A800'] },
  Austria: { stripes: ['#ED2939', '#FFFFFF', '#ED2939'] },
  Azerbaijan: { stripes: ['#00B5E2', '#EF3340', '#509E2F'] },
  Belarus: { stripes: ['#D22730', '#00AF66', '#FFFFFF'] },
  'Bosnia and Herzegovina': { stripes: ['#002395', '#FECB00', '#FFFFFF'] },
  Bulgaria: { stripes: ['#FFFFFF', '#00966E', '#D62612'] },
  Croatia: { stripes: ['#FF0000', '#FFFFFF', '#171796'] },
  Cyprus: { stripes: ['#FFFFFF', '#D57800', '#4E5B31'] },
  Czechia: { stripes: ['#FFFFFF', '#D7141A', '#11457E'] },
  Denmark: { stripes: ['#C8102E', '#FFFFFF', '#C8102E'] },
  Estonia: { stripes: ['#4891D9', '#222222', '#FFFFFF'] },
  Finland: { stripes: ['#FFFFFF', '#003580', '#FFFFFF'] },
  France: {
    layout: 'vertical',
    stripes: ['#0055A4', '#FFFFFF', '#EF4135'],
    banner: ['#0055A4', '#FFFFFF', '#EF4135'],
  },
  Spain: {
    layout: 'horizontal',
    stripes: ['#C60B1E', '#FFC400', '#C60B1E'],
    stripeWeights: [1, 1.8, 1],
    banner: ['#C60B1E', '#FFC400', '#C60B1E'],
  },
  Portugal: {
    layout: 'portugal',
    stripes: ['#006600', '#DA291C'],
    stripeWeights: [1.1, 1.7],
    emblemColor: '#FFD700',
    banner: ['#006600', '#FFD700', '#DA291C'],
  },
  Georgia: { stripes: ['#FFFFFF', '#FF0000', '#FFFFFF'] },
  Greece: { stripes: ['#0D5EAF', '#FFFFFF', '#0D5EAF'] },
  Hungary: { stripes: ['#CE2939', '#FFFFFF', '#477050'] },
  Iceland: { stripes: ['#02529C', '#FFFFFF', '#DC1E35'] },
  Ireland: { stripes: ['#169B62', '#FFFFFF', '#FF883E'] },
  Italy: {
    layout: 'vertical',
    stripes: ['#009246', '#FFFFFF', '#CE2B37'],
    banner: ['#009246', '#FFFFFF', '#CE2B37'],
  },
  Kazakhstan: { stripes: ['#00AFCA', '#FEC50C', '#00AFCA'] },
  Kosovo: { stripes: ['#244AA5', '#D0A650', '#FFFFFF'] },
  Latvia: { stripes: ['#9E3039', '#FFFFFF', '#9E3039'], stripeWeights: [2, 1, 2] },
  Liechtenstein: { stripes: ['#002B7F', '#CE1126', '#FFD83D'] },
  Lithuania: { stripes: ['#FDB913', '#006A44', '#C1272D'] },
  Luxembourg: { stripes: ['#EF3340', '#FFFFFF', '#00A3E0'] },
  Malta: { stripes: ['#FFFFFF', '#CF142B'] },
  Moldova: { stripes: ['#0046AE', '#FFD200', '#CC092F'] },
  Monaco: { stripes: ['#CE1126', '#FFFFFF'] },
  Montenegro: { stripes: ['#D3AE3B', '#C40308', '#D3AE3B'] },
  Netherlands: { stripes: ['#AE1C28', '#FFFFFF', '#21468B'] },
  'North Macedonia': { stripes: ['#D20000', '#FFE600', '#D20000'] },
  Norway: { stripes: ['#BA0C2F', '#FFFFFF', '#00205B'] },
  Poland: { stripes: ['#FFFFFF', '#DC143C'] },
  Germany: {
    layout: 'horizontal',
    stripes: ['#222222', '#DD0000', '#FFCE00'],
    banner: ['#222222', '#DD0000', '#FFCE00'],
  },
  Romania: { stripes: ['#002B7F', '#FCD116', '#CE1126'] },
  Russia: { stripes: ['#FFFFFF', '#0039A6', '#D52B1E'] },
  'San Marino': { stripes: ['#FFFFFF', '#5EB6E4'] },
  Serbia: { stripes: ['#C6363C', '#0C4076', '#FFFFFF'] },
  Slovakia: { stripes: ['#FFFFFF', '#0B4EA2', '#EE1C25'] },
  Slovenia: { stripes: ['#FFFFFF', '#005DA4', '#ED1C24'] },
  Belgium: {
    layout: 'vertical',
    stripes: ['#222222', '#FDDA24', '#EF3340'],
    banner: ['#222222', '#FDDA24', '#EF3340'],
  },
  Sweden: { stripes: ['#006AA7', '#FECC02', '#006AA7'] },
  Switzerland: { stripes: ['#DA291C', '#FFFFFF', '#DA291C'] },
  Turkey: { stripes: ['#E30A17', '#FFFFFF', '#E30A17'] },
  Ukraine: { stripes: ['#0057B7', '#FFD700'] },
  'United Kingdom': { stripes: ['#012169', '#FFFFFF', '#C8102E'] },
  'Vatican City': { stripes: ['#FFE000', '#FFFFFF'] },
  Europe: {
    layout: 'horizontal',
    stripes: ['#003399', '#FFCC00', '#003399'],
    banner: ['#003399', '#FFCC00', '#003399'],
  },
};

export const getCountryFlag = (country) => (
  COUNTRY_FLAGS[country] || COUNTRY_FLAGS.Europe
);

const CHALLENGES_BY_STOP = {
  1: {
    country: 'France',
    title: 'Cafe Charades',
    prompt: 'Act out ordering the fanciest drink in Paris without using words.',
    penalty: 'If your team cannot guess it in 20 seconds, take 1 sip.',
    accent: '#d71920',
  },
  2: {
    country: 'Spain',
    title: 'Tapas Tempo',
    prompt: 'Name three tapas dishes before the other team counts down from five.',
    penalty: 'Miss one? Tell a travel story or take 1 sip.',
    accent: '#f2c94c',
  },
  3: {
    country: 'Portugal',
    title: 'Fado Face-Off',
    prompt: 'Give your most dramatic 5-second performance about missing the last train.',
    penalty: 'No drama, no glory: take 1 sip.',
    accent: '#27ae60',
  },
  4: {
    country: 'Spain',
    title: 'Flamenco Freeze',
    prompt: 'Strike a flamenco pose. Your team must copy it perfectly.',
    penalty: 'Worst pose takes 1 sip.',
    accent: '#eb5757',
  },
  5: {
    country: 'Italy',
    title: 'Pasta Pitch',
    prompt: 'Invent a pasta dish and sell it like a luxury commercial.',
    penalty: 'If nobody would order it, take 1 sip.',
    accent: '#2f80ed',
  },
  6: {
    country: 'Germany',
    title: 'Autobahn Answers',
    prompt: 'Name two German cities and one German food before time runs out.',
    penalty: 'If you stall, take 1 sip.',
    accent: '#f2994a',
  },
  7: {
    country: 'Belgium',
    title: 'Trappist Toast',
    prompt: 'Make a grand toast to the whole table in your best royal voice.',
    penalty: 'If the toast gets no applause, take 1 sip.',
    accent: '#1ba39c',
  },
};

const DEFAULT_CHALLENGE = {
  country: 'Europe',
  title: 'Border Check',
  prompt: 'Tell the table where your team is travelling next and why.',
  penalty: 'If the story is boring, take 1 sip.',
  accent: '#1ba39c',
};

// Ticket presentation per default stop id: the two-letter country code, the
// destination city, and the landmark drawn in `CityLandmark`. Stops without an
// entry (for example custom stops) simply render without a landmark.
const STOP_VISUALS = {
  france: { code: 'FR', city: 'Paris', landmark: 'paris' },
  'spain-north': { code: 'ES', city: 'Madrid', landmark: 'madrid' },
  portugal: { code: 'PT', city: 'Lisbon', landmark: 'lisbon' },
  'spain-south': { code: 'ES', city: 'Sevilla', landmark: 'sevilla' },
  italy: { code: 'IT', city: 'Rome', landmark: 'rome' },
  germany: { code: 'DE', city: 'Berlin', landmark: 'berlin' },
  'belgium-finish': { code: 'BE', city: 'Brussels', landmark: 'brussels' },
};

// Short badge for the failure penalty, taken from the penalty sentence unless a
// challenge sets an explicit `penaltyTag`.
export const getPenaltyTag = (challenge) => {
  if (challenge.penaltyTag) return challenge.penaltyTag;
  const penalty = challenge.penalty ?? '';
  if (/\bdown/i.test(penalty)) return 'DOWN IT';
  const sips = penalty.match(/(\d+)\s+sips?/i);
  if (sips) return `${sips[1]} ${sips[1] === '1' ? 'SIP' : 'SIPS'}`;
  return 'DRINK';
};

// Optional timer chip, taken from the first "N seconds" in the challenge text.
export const getChallengeTimer = (challenge) => {
  const match = `${challenge.prompt ?? ''} ${challenge.penalty ?? ''}`.match(/(\d+)\s*-?\s*seconds?/i);
  return match ? `${match[1]} SEC` : null;
};

export const getChallengeIdForStop = (stop, seed = '') => {
  const challenges = Array.isArray(stop?.challenges)
    ? stop.challenges
    : Object.values(stop?.challenges || {});
  if (!challenges.length) return null;
  const hash = String(seed).split('').reduce((total, character) => (
    ((total * 31) + character.charCodeAt(0)) >>> 0
  ), 0);
  return challenges[hash % challenges.length]?.id || challenges[0]?.id || null;
};

export const getChallengeForStop = (stopIndex, routeStops, challengeId) => {
  const stop = routeStops?.[stopIndex];
  const challenges = Array.isArray(stop?.challenges)
    ? stop.challenges
    : Object.values(stop?.challenges || {});
  const selected = challenges.find((challenge) => challenge.id === challengeId) || challenges[0];

  if (stop && selected) {
    const defaultVisuals = STOP_VISUALS[stop.id] || {};
    return {
      stopIndex,
      country: stop.name,
      accent: stop.accent || '#1ba39c',
      ...defaultVisuals,
      code: stop.code || defaultVisuals.code,
      city: stop.city || defaultVisuals.city,
      landmark: stop.landmark || defaultVisuals.landmark,
      ...selected,
    };
  }

  return {
    stopIndex,
    ...(CHALLENGES_BY_STOP[stopIndex] || { ...DEFAULT_CHALLENGE, country: stop?.name || DEFAULT_CHALLENGE.country }),
  };
};
