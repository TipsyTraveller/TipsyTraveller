import { ROUTE_START_IDS, validateGeneratedRoute } from './countryStops.js';
import { SIZE_IT_UP_MIN_RATIO, SIZE_IT_UP_MAX_RATIO } from './sizeItUp.js';

export const BETA_SCHEMA_VERSION = 1;
export const BETA_PLAYER_COUNT = 9;
export const BETA_TEAM_IDS = Object.freeze(['team1', 'team2', 'team3']);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const positive = (value) => Number.isFinite(value) && value > 0;
const position = (value) => isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
const httpsUrl = (value) => {
  try { return text(value) && new URL(value).protocol === 'https:'; } catch { return false; }
};
const supportedTypes = ['ordinary', 'countryWordGuess', 'personalMatch', 'geoGuessr', 'sizeItUp'];
const roles = ['describer', 'performer', 'judge', 'captain', 'respondent'];
const recipients = ['none', 'target', 'teamExceptTarget', 'wholeTeam', 'opponents'];

// Check before copying: JSON.stringify silently drops undefined and converts NaN
// to null. Neither is acceptable in a saved plan or a Firebase room snapshot.
const validateJson = (value, path, add, ancestors = new Set()) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || value === null || ancestors.has(value)
    || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) {
    add(path, 'invalid_json', 'Use finite numbers and plain JSON data without circular references.');
    return;
  }
  ancestors.add(value);
  const entries = Array.isArray(value)
    ? Array.from(value, (item, index) => [String(index), item])
    : Object.entries(value);
  entries.forEach(([key, item]) => {
    if (!key || /[.#$\[\]/\u0000-\u001f\u007f]/.test(key)) {
      add(path, 'invalid_key', 'Snapshot keys must be valid Firebase keys.');
    }
    validateJson(item, `${path}.${key}`, add, ancestors);
  });
  ancestors.delete(value);
};

export const validateBetaScenario = (draft, { difficulty = 'easy' } = {}) => {
  const errors = [];
  const add = (path, code, message) => errors.push({ path, code, message });
  const result = () => ({ valid: errors.length === 0, errors });
  validateJson(draft, 'scenario', add);
  if (errors.length) return result();
  if (!isRecord(draft) || !Array.isArray(draft.routeStops) || !isRecord(draft.betaScenario)) {
    add('scenario', 'invalid_shape', 'A beta scenario requires routeStops and betaScenario.');
    return result();
  }
  const { routeStops, betaScenario } = draft;
  if (betaScenario.schemaVersion !== BETA_SCHEMA_VERSION) {
    add('betaScenario.schemaVersion', 'unsupported_schema', 'Expected beta schema version 1.');
  }
  if (!text(betaScenario.presetId)) add('betaScenario.presetId', 'required', 'A preset ID is required.');
  if (betaScenario.playerCount !== BETA_PLAYER_COUNT) {
    add('betaScenario.playerCount', 'player_count', 'The beta requires nine players in three teams of three.');
  }
  const stopsValid = routeStops.every((stop) => isRecord(stop) && text(stop.id)
    && text(stop.name) && text(stop.code) && text(stop.city) && position(stop.position)
    && Array.isArray(stop.challenges));
  if (routeStops.length < 4 || !stopsValid) {
    add('routeStops', 'invalid_route', 'Provide complete country snapshots including start, Belgium, Italy and finish.');
    return result();
  }
  const ids = routeStops.map((stop) => stop.id);
  if (new Set(ids).size !== ids.length) add('routeStops', 'duplicate_country', 'Countries must be unique.');
  ['belgium', 'italy'].forEach((id) => {
    if (!ids.includes(id)) add('routeStops', 'required_country', `The route must include ${id}.`);
  });
  if (!ROUTE_START_IDS.includes(ids[0])) add('routeStops.0', 'invalid_start', 'Use an allowed edge-country start.');
  if (ids.at(-1) !== 'greece') add('routeStops', 'invalid_finish', 'The route must finish in Greece.');
  if (!validateGeneratedRoute(routeStops)) {
    add('routeStops', 'invalid_geometry', 'The route violates country spacing, turn or crossing constraints.');
  }
  if (!isRecord(betaScenario.stops)) {
    add('betaScenario.stops', 'required', 'Every interior stop needs a challenge plan.');
    return result();
  }
  const interiorIds = new Set(ids.slice(1, -1));
  Object.keys(betaScenario.stops).forEach((id) => {
    if (!interiorIds.has(id)) add(`betaScenario.stops.${id}`, 'unexpected_plan', 'Only interior route stops can have a plan.');
  });
  const seen = new Set();
  const unique = (type, id, path) => {
    if (!text(id)) return;
    const key = `${type}:${id.trim().toLowerCase()}`;
    if (seen.has(key)) add(path, 'duplicate_content', 'Each planned minigame variant must be unique across stops and teams.');
    seen.add(key);
  };
  const requireFields = (record, fields, path) => {
    if (!isRecord(record) || fields.some((field) => !text(record[field]))) {
      add(path, 'incomplete_content', `Required text fields: ${fields.join(', ')}.`);
      return false;
    }
    return true;
  };
  routeStops.slice(1, -1).forEach((stop) => {
    const path = `betaScenario.stops.${stop.id}`;
    const plan = betaScenario.stops[stop.id];
    if (!isRecord(plan) || !isRecord(plan.challenge) || !isRecord(plan.contentByTeam)) {
      add(path, 'missing_plan', 'A full challenge and content for all three teams are required.');
      return;
    }
    const { challenge, contentByTeam } = plan;
    const type = challenge.type || 'ordinary';
    requireFields(challenge, ['id', 'title', 'prompt', 'penalty'], `${path}.challenge`);
    if (!supportedTypes.includes(type)) add(path, 'unsupported_challenge', 'This challenge type is not supported.');
    if (!stop.challenges.some((entry) => isRecord(entry) && entry.id === challenge.id && (entry.type || 'ordinary') === type)) {
      add(path, 'unknown_challenge', 'The chosen challenge must belong to the route stop snapshot.');
    }
    if (!Number.isInteger(challenge.minPlayers) || challenge.minPlayers < 1 || challenge.minPlayers > 3) {
      add(path, 'team_size', 'The challenge must support a three-player team.');
    }
    if (!positive(challenge.durationSeconds) || !positive(challenge.expectedDurationSeconds)
      || !Number.isInteger(challenge.penaltySips) || challenge.penaltySips < 0 || challenge.penaltySips > 9
      || !recipients.includes(challenge.drinkRules?.success) || !recipients.includes(challenge.drinkRules?.failure)) {
      add(path, 'invalid_challenge_rules', 'Complete duration, sip penalty and drink rules are required.');
    }
    if (challenge.targeting && (!roles.includes(challenge.targeting.role) || challenge.targeting.selection !== 'rotate')) {
      add(path, 'invalid_targeting', 'Named challenges must use an existing rotating player role.');
    }
    if (['countryWordGuess', 'personalMatch', 'geoGuessr'].includes(type) && !positive(challenge.successPoints)) {
      add(path, 'invalid_challenge_rules', 'This minigame requires success points.');
    }
    if (type === 'geoGuessr' && !positive(challenge.pinDurationSeconds)) {
      add(path, 'invalid_challenge_rules', 'GeoGuessr requires a pinning duration.');
    }
    if (type === 'sizeItUp' && !positive(challenge.accuracyThresholdPercent)) {
      add(path, 'invalid_challenge_rules', 'Size It Up requires an accuracy threshold.');
    }
    if (Object.keys(contentByTeam).length !== BETA_TEAM_IDS.length
      || BETA_TEAM_IDS.some((teamId) => !Object.hasOwn(contentByTeam, teamId))) {
      add(`${path}.contentByTeam`, 'invalid_teams', 'Provide exactly team1, team2 and team3.');
    }
    BETA_TEAM_IDS.forEach((teamId) => {
      const contentPath = `${path}.contentByTeam.${teamId}`;
      const content = contentByTeam[teamId];
      if (!isRecord(content) || content.type !== type) {
        add(contentPath, 'invalid_content_type', 'Fixed content must match the selected challenge type.');
        return;
      }
      if (type === 'ordinary') return;
      const version = type === 'countryWordGuess' ? content.wordListVersion : content.poolVersion;
      if (!Number.isInteger(version) || version < 1) add(contentPath, 'invalid_version', 'A positive content version is required.');
      if (type === 'countryWordGuess') {
        if (!text(content.word) || !Array.isArray(challenge.words) || !challenge.words.includes(content.word)
          || content.wordListVersion !== challenge.wordListVersion) {
          add(contentPath, 'invalid_word', 'Select a word from the snapshotted country word list.');
        }
        unique(type, content.word, contentPath);
      }
      if (type === 'personalMatch') {
        const { question } = content;
        requireFields(question, ['id', 'prompt'], contentPath);
        if (!Array.isArray(question?.options) || question.options.length !== 4
          || !question.options.every(text) || new Set(question.options).size !== 4
          || (question.lethalOnly !== undefined && typeof question.lethalOnly !== 'boolean')) {
          add(contentPath, 'invalid_question', 'A question requires four distinct answer options and a valid eligibility flag.');
        }
        if (question?.lethalOnly && !['hard', 'lethal'].includes(String(difficulty).toLowerCase())) {
          add(contentPath, 'ineligible_question', 'This question is only available at Lethal difficulty.');
        }
        unique(type, question?.id, contentPath);
      }
      if (type === 'geoGuessr') {
        const { monument } = content;
        requireFields(monument, ['id', 'name', 'city', 'countryId', 'countryName', 'clue', 'category', 'imageAuthor', 'imageLicense'], contentPath);
        if (!position(monument?.position) || !Array.isArray(monument?.coordinates)
          || monument.coordinates.length !== 2 || !monument.coordinates.every(Number.isFinite)
          || Math.abs(monument.coordinates[0]) > 180 || Math.abs(monument.coordinates[1]) > 90
          || !Array.isArray(monument?.svgPosition) || monument.svgPosition.length !== 2
          || !monument.svgPosition.every(Number.isFinite)
          || !httpsUrl(monument?.imageUrl) || !httpsUrl(monument?.imageSourceUrl)
          || !['place', 'landmark'].includes(monument?.subjectType)
          || !Array.isArray(monument?.palette) || monument.palette.length < 3 || !monument.palette.every(text)) {
          add(contentPath, 'invalid_monument', 'A photo requires complete map coordinates, attribution, HTTPS URLs and display metadata.');
        }
        if (monument?.countryId === stop.id) add(contentPath, 'landing_country_photo', 'The photo must be outside the landing country.');
        unique(type, monument?.id, contentPath);
      }
      if (type === 'sizeItUp') {
        const { round } = content;
        requireFields(round, ['id'], contentPath);
        [round?.reference, round?.target].forEach((item) => {
          requireFields(item, ['id', 'label', 'category', 'silhouette', 'sourceLabel'], contentPath);
          if (!positive(item?.metres) || !['height', 'length'].includes(item?.axis) || !httpsUrl(item?.sourceUrl)) {
            add(contentPath, 'invalid_size_item', 'Measured items need a positive measurement, axis, silhouette and source.');
          }
        });
        const ratio = round?.target?.metres / round?.reference?.metres;
        if (!positive(ratio) || ratio < SIZE_IT_UP_MIN_RATIO || ratio > SIZE_IT_UP_MAX_RATIO
          || round?.reference?.category === round?.target?.category) {
          add(contentPath, 'invalid_size_pair', 'Use a cross-category pair whose ratio is reachable with the existing controls.');
        }
        unique(type, round?.id, contentPath);
        unique('sizeItems', `${round?.reference?.id}:${round?.target?.id}`, contentPath);
      }
    });
  });
  return result();
};
