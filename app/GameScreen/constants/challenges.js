export const COUNTRY_FLAGS = {
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
  Italy: {
    layout: 'vertical',
    stripes: ['#009246', '#FFFFFF', '#CE2B37'],
    banner: ['#009246', '#FFFFFF', '#CE2B37'],
  },
  Germany: {
    layout: 'horizontal',
    stripes: ['#222222', '#DD0000', '#FFCE00'],
    banner: ['#222222', '#DD0000', '#FFCE00'],
  },
  Belgium: {
    layout: 'vertical',
    stripes: ['#222222', '#FDDA24', '#EF3340'],
    banner: ['#222222', '#FDDA24', '#EF3340'],
  },
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
    return {
      stopIndex,
      country: stop.name,
      accent: stop.accent || '#1ba39c',
      ...STOP_VISUALS[stop.id],
      ...selected,
    };
  }

  return {
    stopIndex,
    ...(CHALLENGES_BY_STOP[stopIndex] || { ...DEFAULT_CHALLENGE, country: stop?.name || DEFAULT_CHALLENGE.country }),
  };
};
