import { DEFAULT_COUNTRY_STOPS } from './countryStops.js';
import { DEFAULT_MONUMENT_POOL, MONUMENT_POOL_VERSION } from './monumentPool.js';
import { getEligiblePersonalMatchQuestions, PERSONAL_MATCH_POOL_VERSION } from './personalMatch.js';
import { SIZE_IT_UP_ROUNDS, SIZE_IT_UP_POOL_VERSION } from './sizeItUp.js';
import {
  BETA_SCHEMA_VERSION, BETA_PLAYER_COUNT, BETA_TEAM_IDS, validateBetaScenario,
} from './betaScenarioValidation.js';

export { BETA_SCHEMA_VERSION, BETA_PLAYER_COUNT, BETA_TEAM_IDS, validateBetaScenario };
export const BETA_PRESET_ID = 'nine-friends-2026-11-20';

// Stable route/challenge IDs. No random seed, remote content or session state.
const PRESET_STOPS = [
  ['iceland', null],
  ['ireland', 'guess-country-word'],
  ['united-kingdom', 'personal-match'],
  ['belgium', 'trappist-toast'],
  ['germany', 'geo-guessr-duel'],
  ['denmark', 'size-it-up'],
  ['norway', 'norway-captain-coordination'],
  ['sweden', 'guess-country-word'],
  ['estonia', 'personal-match'],
  ['lithuania', 'geo-guessr-duel'],
  ['poland', 'pierogi-pitch'],
  ['czechia', 'size-it-up'],
  ['switzerland', 'guess-country-word'],
  ['monaco', 'grand-prix-pitstop'],
  ['italy', 'pasta-pitch'],
  ['bosnia-herzegovina', 'personal-match'],
  ['albania', 'geo-guessr-duel'],
  ['greece', null],
];

const copy = (value) => JSON.parse(JSON.stringify(value));
const findChallenge = (stop, challengeId) => {
  const challenge = stop?.challenges?.find((item) => item.id === challengeId);
  if (!challenge) throw new Error(`Unknown challenge ${challengeId} for ${stop?.id}.`);
  return challenge;
};

export const getBetaContentOptions = (stop, challengeId, { difficulty = 'easy' } = {}) => {
  const challenge = findChallenge(stop, challengeId);
  let options;
  switch (challenge.type) {
    case 'countryWordGuess':
      options = challenge.words.map((word) => ({
        id: word, label: word,
        fixedContent: { type: challenge.type, word, wordListVersion: challenge.wordListVersion },
      }));
      break;
    case 'personalMatch':
      options = getEligiblePersonalMatchQuestions(difficulty)
        .map((question) => ({
          id: question.id, label: question.prompt,
          fixedContent: { type: challenge.type, question, poolVersion: PERSONAL_MATCH_POOL_VERSION },
        }));
      break;
    case 'geoGuessr':
      options = DEFAULT_MONUMENT_POOL.filter((monument) => monument.countryId !== stop.id)
        .map((monument) => ({
          id: monument.id, label: `${monument.name} (${monument.countryName})`,
          fixedContent: { type: challenge.type, monument, poolVersion: MONUMENT_POOL_VERSION },
        }));
      break;
    case 'sizeItUp':
      options = SIZE_IT_UP_ROUNDS.map((round) => ({
        id: round.id, label: `${round.reference.label} / ${round.target.label}`,
        fixedContent: { type: challenge.type, round, poolVersion: SIZE_IT_UP_POOL_VERSION },
      }));
      break;
    default:
      if (challenge.type && challenge.type !== 'ordinary') throw new Error(`Unsupported beta challenge type: ${challenge.type}.`);
      options = [];
  }
  return copy(options);
};

export const createBetaStopPlan = ({ stop, challengeId, contentIdsByTeam = {}, difficulty = 'easy' }) => {
  const challenge = findChallenge(stop, challengeId);
  const options = getBetaContentOptions(stop, challengeId, { difficulty });
  const contentByTeam = Object.fromEntries(BETA_TEAM_IDS.map((teamId) => {
    if (!challenge.type || challenge.type === 'ordinary') return [teamId, { type: 'ordinary' }];
    const option = options.find((item) => item.id === contentIdsByTeam[teamId]);
    if (!option) throw new Error(`Select valid fixed content for ${stop.id}/${teamId}.`);
    return [teamId, option.fixedContent];
  }));
  return copy({ challenge, contentByTeam });
};

export const createBetaSnapshot = (draft, options) => {
  const { valid, errors } = validateBetaScenario(draft, options);
  if (!valid) {
    const error = new Error(`Invalid beta scenario: ${errors.map((item) => `${item.path}: ${item.message}`).join(' ')}`);
    error.code = 'INVALID_BETA_SCENARIO';
    error.errors = errors;
    throw error;
  }
  return copy({ routeStops: draft.routeStops, betaScenario: draft.betaScenario });
};

export const createBetaPreset = () => {
  const routeStops = PRESET_STOPS.map(([id], order) => {
    const stop = DEFAULT_COUNTRY_STOPS.find((item) => item.id === id);
    if (!stop) throw new Error(`Missing beta country: ${id}.`);
    return { ...copy(stop), order };
  });
  const stops = {};
  const used = new Set();
  PRESET_STOPS.forEach(([, challengeId], index) => {
    if (!challengeId) return;
    const stop = routeStops[index];
    const challenge = findChallenge(stop, challengeId);
    const options = getBetaContentOptions(stop, challengeId);
    const contentIdsByTeam = {};
    if (challenge.type) {
      BETA_TEAM_IDS.forEach((teamId) => {
        const option = options.find((item) => !used.has(`${challenge.type}:${item.id}`));
        if (!option) throw new Error(`Not enough unique beta content for ${stop.id}.`);
        used.add(`${challenge.type}:${option.id}`);
        contentIdsByTeam[teamId] = option.id;
      });
    }
    stops[stop.id] = createBetaStopPlan({ stop, challengeId, contentIdsByTeam });
  });
  return createBetaSnapshot({
    routeStops,
    betaScenario: { schemaVersion: BETA_SCHEMA_VERSION, presetId: BETA_PRESET_ID, playerCount: BETA_PLAYER_COUNT, stops },
  });
};

const checkSchema = (betaScenario) => {
  if (betaScenario.schemaVersion !== BETA_SCHEMA_VERSION) throw new Error('Unsupported beta scenario schema.');
};

// Call only after special-event precedence has been resolved by the game owner.
// Read saved content directly; never look it up in current local/remote pools.
export const getBetaPlannedChallenge = (betaScenario, stopId, teamId) => {
  if (betaScenario == null) return null;
  checkSchema(betaScenario);
  if (!BETA_TEAM_IDS.includes(teamId)) throw new Error(`Unknown beta team: ${teamId}.`);
  const plan = betaScenario.stops?.[stopId];
  if (!plan) return null;
  if (!plan.challenge || !plan.contentByTeam?.[teamId]) throw new Error(`Incomplete beta plan: ${stopId}/${teamId}.`);
  return copy({ challenge: plan.challenge, fixedContent: plan.contentByTeam[teamId] });
};

export const getBetaReservedMonumentIds = (betaScenario) => {
  if (betaScenario == null) return [];
  checkSchema(betaScenario);
  return [...new Set(Object.values(betaScenario.stops || {}).flatMap((plan) => (
    Object.values(plan.contentByTeam || {})
      .filter((content) => content.type === 'geoGuessr')
      .map((content) => content.monument.id)
  )))];
};
