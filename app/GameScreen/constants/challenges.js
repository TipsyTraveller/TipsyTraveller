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
    penaltySips: 1,
    accent: '#d71920',
  },
  2: {
    country: 'Spain',
    title: 'Tapas Tempo',
    prompt: 'Name three tapas dishes before the other team counts down from five.',
    penalty: 'Miss one? Tell a travel story or take 1 sip.',
    penaltySips: 1,
    accent: '#f2c94c',
  },
  3: {
    country: 'Portugal',
    title: 'Fado Face-Off',
    prompt: 'Give your most dramatic 5-second performance about missing the last train.',
    penalty: 'No drama, no glory: take 1 sip.',
    penaltySips: 1,
    accent: '#27ae60',
  },
  4: {
    country: 'Spain',
    title: 'Flamenco Freeze',
    prompt: 'Strike a flamenco pose. Your team must copy it perfectly.',
    penalty: 'Worst pose takes 1 sip.',
    penaltySips: 1,
    accent: '#eb5757',
  },
  5: {
    country: 'Italy',
    title: 'Pasta Pitch',
    prompt: 'Invent a pasta dish and sell it like a luxury commercial.',
    penalty: 'If nobody would order it, take 1 sip.',
    penaltySips: 1,
    accent: '#2f80ed',
  },
  6: {
    country: 'Germany',
    title: 'Autobahn Answers',
    prompt: 'Name two German cities and one German food before time runs out.',
    penalty: 'If you stall, take 1 sip.',
    penaltySips: 1,
    accent: '#f2994a',
  },
  7: {
    country: 'Belgium',
    title: 'Trappist Toast',
    prompt: 'Make a grand toast to the whole table in your best royal voice.',
    penalty: 'If the toast gets no applause, take 1 sip.',
    penaltySips: 1,
    accent: '#1ba39c',
  },
};

const DEFAULT_CHALLENGE = {
  country: 'Europe',
  title: 'Border Check',
  prompt: 'Tell the table where your team is travelling next and why.',
  penalty: 'If the story is boring, take 1 sip.',
  penaltySips: 1,
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

export const MAX_PENALTY_SIPS = 9;

export const DIFFICULTY_MULTIPLIERS = {
  easy: 1,
  medium: 2,
  hard: 3,
  lethal: 3,
};

export const getDifficultyMultiplier = (difficulty) => (
  DIFFICULTY_MULTIPLIERS[String(difficulty || '').toLowerCase()] || 1
);

export const resolvePenaltySips = (basePenaltySips, difficulty = 'easy') => {
  const base = Number(basePenaltySips);
  if (!Number.isFinite(base)) return 0;
  return Math.min(
    Math.max(0, Math.round(base)) * getDifficultyMultiplier(difficulty),
    MAX_PENALTY_SIPS
  );
};

export const getResolvedPenaltySips = (challenge, difficulty = 'easy') => {
  if (Number.isFinite(Number(challenge?.resolvedPenaltySips))) {
    return Math.min(MAX_PENALTY_SIPS, Math.max(0, Math.round(Number(challenge.resolvedPenaltySips))));
  }
  return resolvePenaltySips(challenge?.penaltySips, difficulty);
};

// Short badge for the resolved numeric penalty unless a challenge uses a custom tag.
export const getPenaltyTag = (challenge, difficulty = 'easy') => {
  if (challenge.penaltyTag) return challenge.penaltyTag;
  const sips = getResolvedPenaltySips(challenge, difficulty);
  return `${sips} ${sips === 1 ? 'SIP' : 'SIPS'}`;
};

// Optional timer chip, taken from the first "N seconds" in the challenge text.
export const getChallengeTimer = (challenge) => {
  if (Number.isFinite(Number(challenge.durationSeconds))) {
    return `${Number(challenge.durationSeconds)} SEC`;
  }
  const match = `${challenge.prompt ?? ''} ${challenge.penalty ?? ''}`.match(/(\d+)\s*-?\s*seconds?/i);
  return match ? `${match[1]} SEC` : null;
};

import {
  DEFAULT_MONUMENT_POOL,
  GEO_GUESSR_CHALLENGE_ID,
  GEO_GUESSR_CHALLENGE_TYPE,
  GEO_GUESSR_PHOTO_SECONDS,
  GEO_GUESSR_PIN_SECONDS,
  GEO_GUESSR_SUCCESS_POINTS,
  selectMonumentFromPool,
} from './monumentPool.js';
import { getTeamPlayers } from '../drinkLedger';
import { resolveTimerSeconds } from './roomRules';

export {
  GEO_GUESSR_CHALLENGE_ID,
  GEO_GUESSR_CHALLENGE_TYPE,
  GEO_GUESSR_PHOTO_SECONDS,
  GEO_GUESSR_PIN_SECONDS,
  GEO_GUESSR_SUCCESS_POINTS,
};

export const COUNTRY_WORD_CHALLENGE_TYPE = 'countryWordGuess';
export const COUNTRY_WORD_EXPLANATION_SECONDS = 7;

const hashSeed = (seed) => String(seed).split('').reduce((total, character) => (
  ((total * 31) + character.charCodeAt(0)) >>> 0
), 0);

export { getTeamPlayers };

export const isBotOnlyTeam = (teamMembers, teamId) => {
  const players = getTeamPlayers(teamMembers, teamId);
  if (!players.length) return false;
  return players.every((player) => (
    !player.deviceID || String(player.deviceID).startsWith('bot-') || String(player.deviceID).startsWith('local-')
  ));
};

/**
 * Returns true when the active team lands on a stop already occupied by another
 * team, or passes over (kickflips) another parked team along their move.
 */
export const didTriggerRoadsideDuel = ({ fromLeg = 0, targetLeg = 0, teamId, teamProgress = {} }) => {
  if (targetLeg <= 0) return false;
  return Object.entries(teamProgress || {}).some(([otherTeamId, progress]) => {
    if (!otherTeamId.startsWith('team') || otherTeamId === teamId || progress?.isDone) {
      return false;
    }
    const otherLeg = Number(progress?.currentLeg) || 0;
    if (otherLeg <= 0) return false;
    return otherLeg === targetLeg || (otherLeg > fromLeg && otherLeg < targetLeg);
  });
};

export const getChallengeIdForStop = (
  stop,
  seed = '',
  { teamPlayerCount = 0, forceType = null, usedChallengeKeys = [] } = {}
) => {
  const challenges = Array.isArray(stop?.challenges)
    ? stop.challenges
    : Object.values(stop?.challenges || {});
  if (forceType) {
    const forced = challenges.find((challenge) => challenge?.type === forceType);
    if (forced?.id) return forced.id;
  }
  const used = new Set(Array.isArray(usedChallengeKeys) ? usedChallengeKeys : []);
  const eligibleChallenges = challenges.filter((challenge) => (
    teamPlayerCount >= (Number(challenge?.minPlayers) || (
      challenge?.type === COUNTRY_WORD_CHALLENGE_TYPE ? 2 : 1
    ))
    && !used.has(`${stop?.id}:${challenge?.id}`)
  ));
  if (!eligibleChallenges.length) return null;
  const hash = hashSeed(seed);
  return eligibleChallenges[hash % eligibleChallenges.length]?.id || eligibleChallenges[0]?.id || null;
};

export const getChallengeKey = (stop, challengeId) => (
  stop?.id && challengeId ? `${stop.id}:${challengeId}` : null
);

export const getTargetCursorKey = (teamId, role = 'performer') => `${teamId}:${role}`;

export const getTargetedChallengeRound = (
  challenge,
  players,
  targetCursor = 0,
  difficulty = 'easy'
) => {
  const role = challenge?.targeting?.role;
  if (!role || !players.length) return null;
  const cursor = Math.max(0, Math.round(Number(targetCursor) || 0));
  const selectedPlayer = players[cursor % players.length];
  return {
    stage: 'result',
    selectedPlayerId: selectedPlayer.playerId,
    selectedPlayerName: selectedPlayer.name,
    targetRole: role,
    targetCursor: cursor,
    resolvedPenaltySips: resolvePenaltySips(challenge.penaltySips, difficulty),
  };
};

export const getCountryWordRound = (
  challenge,
  players,
  seed = '',
  difficulty = 'easy',
  timerPace = 'relaxed',
  targetCursor = 0
) => {
  if (challenge?.type !== COUNTRY_WORD_CHALLENGE_TYPE || players.length < 2) return null;
  const words = Array.isArray(challenge.words) ? challenge.words.filter(Boolean) : [];
  if (!words.length) return null;

  const cursor = Math.max(0, Math.round(Number(targetCursor) || 0));
  const selectedPlayer = players[cursor % players.length];
  return {
    stage: 'intro',
    selectedPlayerId: selectedPlayer.playerId,
    selectedPlayerName: selectedPlayer.name,
    secretWord: words[hashSeed(`${seed}:word`) % words.length],
    startedAt: null,
    result: null,
    pointsAwarded: 0,
    durationSeconds: resolveTimerSeconds(Number(challenge.durationSeconds) || 30, timerPace),
    resolvedPenaltySips: resolvePenaltySips(challenge.penaltySips, difficulty),
    targetRole: challenge.targeting?.role || 'describer',
    targetCursor: cursor,
  };
};

export const getGeoGuessrRound = ({
  challenge,
  isRoadsideDuel = false,
  monumentPool = DEFAULT_MONUMENT_POOL,
  requiredTeamIds = ['team1', 'team2'],
  seed = '',
  startedAt = Date.now(),
  stopCountryId = null,
  usedMonumentIds = [],
  difficulty = 'easy',
  timerPace = 'relaxed',
}) => {
  if (challenge?.type !== GEO_GUESSR_CHALLENGE_TYPE) return null;

  const { monument, nextUsedMonumentIds } = selectMonumentFromPool({
    pool: monumentPool,
    usedMonumentIds,
    excludeCountryId: stopCountryId,
    seed,
  });

  return {
    nextUsedMonumentIds,
    round: {
      stage: 'photo',
      isRoadsideDuel: Boolean(isRoadsideDuel),
      monumentId: monument.id,
      monumentName: monument.name,
      monumentCity: monument.city,
      monumentCountryId: monument.countryId,
      monumentCountryName: monument.countryName,
      monumentClue: monument.clue,
      monumentCategory: monument.category,
      monumentSubjectType: monument.subjectType,
      monumentPalette: monument.palette,
      monumentImageUrl: monument.imageUrl,
      monumentImageSourceUrl: monument.imageSourceUrl,
      monumentImageAuthor: monument.imageAuthor,
      monumentImageLicense: monument.imageLicense,
      targetPosition: monument.position,
      photoStartedAt: startedAt + 1650,
      photoDurationSeconds: resolveTimerSeconds(
        Number(challenge.durationSeconds) || GEO_GUESSR_PHOTO_SECONDS,
        timerPace
      ),
      pinStartedAt: null,
      pinDurationSeconds: resolveTimerSeconds(
        Number(challenge.pinDurationSeconds) || GEO_GUESSR_PIN_SECONDS,
        timerPace
      ),
      requiredTeamIds: Array.isArray(requiredTeamIds) && requiredTeamIds.length
        ? requiredTeamIds
        : ['team1', 'team2'],
      activePinTeamIndex: 0,
      guesses: {},
      winnerTeamIds: [],
      bestDistanceKm: null,
      pointsAwarded: 0,
      resolvedPenaltySips: resolvePenaltySips(challenge.penaltySips, difficulty),
    },
  };
};

export const getChallengeForStop = (stopIndex, routeStops, challengeId) => {
  const stop = routeStops?.[stopIndex];
  const challenges = Array.isArray(stop?.challenges)
    ? stop.challenges
    : Object.values(stop?.challenges || {});
  const selected = challenges.find((challenge) => challenge.id === challengeId) || challenges[0];

  if (stop && selected) {
    const defaultVisuals = STOP_VISUALS[stop.id] || {};
    const penaltySips = Number.isFinite(Number(selected.penaltySips))
      ? Math.max(0, Math.round(Number(selected.penaltySips)))
      : selected.type === GEO_GUESSR_CHALLENGE_TYPE ? 2 : 1;
    return {
      stopIndex,
      country: stop.name,
      accent: stop.accent || '#1ba39c',
      ...defaultVisuals,
      code: stop.code || defaultVisuals.code,
      city: stop.city || defaultVisuals.city,
      landmark: stop.landmark || defaultVisuals.landmark,
      ...selected,
      penaltySips,
    };
  }

  return {
    stopIndex,
    ...(CHALLENGES_BY_STOP[stopIndex] || { ...DEFAULT_CHALLENGE, country: stop?.name || DEFAULT_CHALLENGE.country }),
    penaltySips: 1,
  };
};
