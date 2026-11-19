import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BETA_PRESET_ID, BETA_TEAM_IDS, createBetaPreset, createBetaSnapshot,
  createBetaStopPlan, getBetaContentOptions, getBetaPlannedChallenge,
  getBetaReservedMonumentIds, validateBetaScenario,
} from '../app/GameScreen/constants/betaScenario.js';
import { DEFAULT_COUNTRY_STOPS, validateGeneratedRoute } from '../app/GameScreen/constants/countryStops.js';
import { DEFAULT_MONUMENT_POOL } from '../app/GameScreen/constants/monumentPool.js';
import { PERSONAL_MATCH_QUESTIONS } from '../app/GameScreen/constants/personalMatch.js';
import { SIZE_IT_UP_ROUNDS } from '../app/GameScreen/constants/sizeItUp.js';

const expectedRoute = [
  'iceland', 'ireland', 'united-kingdom', 'belgium', 'germany', 'denmark',
  'norway', 'sweden', 'estonia', 'lithuania', 'poland', 'czechia', 'switzerland',
  'monaco', 'italy', 'bosnia-herzegovina', 'albania', 'greece',
];
const clone = (value) => JSON.parse(JSON.stringify(value));
const plan = (draft, id) => draft.betaScenario.stops[id];
const content = (draft, id, teamId = 'team1') => plan(draft, id).contentByTeam[teamId];

test('preset has the requested 18-country route, geometry and challenge assignments', () => {
  const draft = createBetaPreset();
  assert.deepEqual(draft.routeStops.map((stop) => stop.id), expectedRoute);
  assert.deepEqual(draft.routeStops.map((stop) => stop.order), expectedRoute.map((_, index) => index));
  assert.equal(validateGeneratedRoute(draft.routeStops), true);
  assert.equal(new Set(expectedRoute).size, 18);
  assert.equal(draft.betaScenario.schemaVersion, 1);
  assert.equal(draft.betaScenario.presetId, BETA_PRESET_ID);
  assert.equal(draft.betaScenario.playerCount, 9);
  assert.equal(Object.keys(draft.betaScenario.stops).length, 16);
  const expectedChallenges = {
    ireland: 'guess-country-word', sweden: 'guess-country-word', switzerland: 'guess-country-word',
    'united-kingdom': 'personal-match', estonia: 'personal-match', 'bosnia-herzegovina': 'personal-match',
    germany: 'geo-guessr-duel', lithuania: 'geo-guessr-duel', albania: 'geo-guessr-duel',
    denmark: 'size-it-up', czechia: 'size-it-up', belgium: 'trappist-toast',
    norway: 'norway-captain-coordination', poland: 'pierogi-pitch',
    monaco: 'grand-prix-pitstop', italy: 'pasta-pitch',
  };
  for (const [id, challengeId] of Object.entries(expectedChallenges)) {
    const entry = plan(draft, id);
    assert.equal(entry.challenge.id, challengeId);
    assert.ok(entry.challenge.minPlayers <= 3);
    assert.deepEqual(Object.keys(entry.contentByTeam), BETA_TEAM_IDS);
  }
  assert.deepEqual(validateBetaScenario(draft), { valid: true, errors: [] });
});

test('preset picks complete, distinct bundled variants in fixed route/team order', () => {
  const draft = createBetaPreset();
  const questions = [];
  const monuments = [];
  const rounds = [];
  const words = [];
  for (const entry of Object.values(draft.betaScenario.stops)) {
    for (const fixed of Object.values(entry.contentByTeam)) {
      if (fixed.type === 'countryWordGuess') {
        words.push(fixed.word);
        assert.ok(entry.challenge.words.includes(fixed.word));
      }
      if (fixed.type === 'personalMatch') questions.push(fixed.question);
      if (fixed.type === 'geoGuessr') monuments.push(fixed.monument);
      if (fixed.type === 'sizeItUp') rounds.push(fixed.round);
    }
  }
  assert.equal(words.length, 9);
  assert.equal(new Set(words).size, 9);
  assert.deepEqual(BETA_TEAM_IDS.map((id) => content(draft, 'ireland', id).word), plan(draft, 'ireland').challenge.words.slice(0, 3));
  assert.deepEqual(questions, PERSONAL_MATCH_QUESTIONS.slice(0, 9));
  assert.deepEqual(monuments, DEFAULT_MONUMENT_POOL.slice(0, 9));
  assert.deepEqual(rounds, SIZE_IT_UP_ROUNDS.slice(0, 6));
  for (const entries of [questions, monuments, rounds]) {
    assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  }
  assert.deepEqual(getBetaReservedMonumentIds(draft.betaScenario), monuments.map((entry) => entry.id));
});

test('preset is deterministic, does not use randomness and returns fresh nested data', () => {
  const first = createBetaPreset();
  const originalRandom = Math.random;
  try {
    Math.random = () => { throw new Error('Preset must not use random selection'); };
    const second = createBetaPreset();
    assert.deepEqual(second, first);
    content(second, 'germany').monument.palette[0] = '#000000';
    plan(second, 'ireland').challenge.words[0] = 'Changed';
    second.routeStops[0].position.x += 1;
    assert.deepEqual(createBetaPreset(), first);
  } finally {
    Math.random = originalRandom;
  }
});

test('editor can select another existing challenge and exact team variants', () => {
  const draft = createBetaPreset();
  const stop = draft.routeStops.find((entry) => entry.id === 'belgium');
  const options = getBetaContentOptions(stop, 'guess-country-word');
  draft.betaScenario.stops.belgium = createBetaStopPlan({
    stop, challengeId: 'guess-country-word',
    contentIdsByTeam: Object.fromEntries(BETA_TEAM_IDS.map((id, index) => [id, options[index + 2].id])),
  });
  assert.equal(validateBetaScenario(draft).valid, true);
  assert.deepEqual(BETA_TEAM_IDS.map((id) => content(draft, 'belgium', id).word), options.slice(2, 5).map((option) => option.id));
  options[2].fixedContent.word = 'Changed after selection';
  assert.notEqual(content(draft, 'belgium').word, options[2].fixedContent.word);
  assert.deepEqual(getBetaContentOptions(stop, 'trappist-toast'), []);
  assert.throws(() => createBetaStopPlan({ stop, challengeId: 'personal-match' }), /Select valid fixed content/);
  assert.throws(() => getBetaContentOptions(stop, 'missing'), /Unknown challenge/);
});

test('editor content options respect photo country and Lethal eligibility', () => {
  const stop = DEFAULT_COUNTRY_STOPS.find((entry) => entry.id === 'iceland');
  assert.ok(getBetaContentOptions(stop, 'geo-guessr-duel').every((option) => option.fixedContent.monument.countryId !== 'iceland'));
  assert.equal(getBetaContentOptions(stop, 'personal-match').length, 36);
  assert.equal(getBetaContentOptions(stop, 'personal-match', { difficulty: 'hard' }).length, 48);
  assert.equal(getBetaContentOptions(stop, 'personal-match', { difficulty: 'lethal' }).length, 48);
  const draft = createBetaPreset();
  content(draft, 'united-kingdom').question = clone(PERSONAL_MATCH_QUESTIONS.find((question) => question.lethalOnly));
  assert.equal(validateBetaScenario(draft).valid, false);
  assert.equal(validateBetaScenario(draft, { difficulty: 'hard' }).valid, true);
  assert.equal(createBetaSnapshot(draft, { difficulty: 'hard' }).betaScenario.playerCount, 9);
});

test('edited routes may remove an optional stop while keeping geometry and content valid', () => {
  const draft = createBetaPreset();
  draft.routeStops = draft.routeStops.filter((stop) => stop.id !== 'switzerland');
  delete draft.betaScenario.stops.switzerland;
  assert.equal(draft.routeStops.length, 17);
  assert.equal(validateBetaScenario(draft).valid, true);
  assert.deepEqual(createBetaSnapshot(draft), draft);
});

test('route validation rejects excessive turns and crossings using the existing geometry rules', () => {
  const draft = createBetaPreset();
  const ids = ['iceland', 'belgium', 'norway', 'italy', 'greece'];
  draft.routeStops = ids.map((id) => draft.routeStops.find((stop) => stop.id === id));
  draft.betaScenario.stops = Object.fromEntries(ids.slice(1, -1).map((id) => [id, plan(draft, id)]));
  const setPositions = (points) => points.forEach(([x, y], index) => { draft.routeStops[index].position = { x, y }; });
  setPositions([[0, 0], [4, 0], [4, 4], [2, 4], [2, 2]]);
  assert.equal(validateBetaScenario(draft).valid, true);
  // All corners are 90 degrees, but the final leg now crosses the first.
  setPositions([[0, 0], [4, 0], [4, 4], [2, 4], [2, -2]]);
  assert.ok(validateBetaScenario(draft).errors.some((error) => error.code === 'invalid_geometry'));
  // No crossing or short legs; the second leg reverses the heading by 135 degrees.
  setPositions([[0, 0], [4, 0], [2, 2], [0, 4], [-2, 6]]);
  assert.ok(validateBetaScenario(draft).errors.some((error) => error.code === 'invalid_geometry'));
});

const invalidEdits = [
  ['unsupported schema', 'unsupported_schema', (draft) => { draft.betaScenario.schemaVersion = 2; }],
  ['missing preset ID', 'required', (draft) => { delete draft.betaScenario.presetId; }],
  ['wrong player count', 'player_count', (draft) => { draft.betaScenario.playerCount = 10; }],
  ['missing Belgium', 'required_country', (draft) => { draft.routeStops = draft.routeStops.filter((stop) => stop.id !== 'belgium'); }],
  ['missing Italy', 'required_country', (draft) => { draft.routeStops = draft.routeStops.filter((stop) => stop.id !== 'italy'); }],
  ['duplicate country', 'duplicate_country', (draft) => { draft.routeStops[2] = clone(draft.routeStops[1]); }],
  ['invalid start', 'invalid_start', (draft) => { draft.routeStops[0] = clone(DEFAULT_COUNTRY_STOPS.find((stop) => stop.id === 'france')); }],
  ['wrong finish', 'invalid_finish', (draft) => { draft.routeStops.pop(); }],
  ['missing position', 'invalid_route', (draft) => { delete draft.routeStops[3].position; }],
  ['too-close markers', 'invalid_geometry', (draft) => { draft.routeStops[2].position = clone(draft.routeStops[1].position); }],
  ['invalid reordering', 'invalid_geometry', (draft) => { [draft.routeStops[5], draft.routeStops[8]] = [draft.routeStops[8], draft.routeStops[5]]; }],
  ['plan at start', 'unexpected_plan', (draft) => { draft.betaScenario.stops.iceland = clone(plan(draft, 'ireland')); }],
  ['plan at finish', 'unexpected_plan', (draft) => { draft.betaScenario.stops.greece = clone(plan(draft, 'ireland')); }],
  ['missing stop plan', 'missing_plan', (draft) => { delete draft.betaScenario.stops.ireland; }],
  ['missing team', 'invalid_teams', (draft) => { delete plan(draft, 'ireland').contentByTeam.team2; }],
  ['extra team', 'invalid_teams', (draft) => { plan(draft, 'ireland').contentByTeam.team4 = { type: 'ordinary' }; }],
  ['wrong content type', 'invalid_content_type', (draft) => { content(draft, 'ireland').type = 'ordinary'; }],
  ['four-player challenge', 'team_size', (draft) => { plan(draft, 'ireland').challenge.minPlayers = 4; }],
  ['unknown challenge', 'unknown_challenge', (draft) => { plan(draft, 'ireland').challenge.id = 'invented'; }],
  ['unsupported challenge type', 'unsupported_challenge', (draft) => { plan(draft, 'ireland').challenge.type = 'invented'; }],
  ['missing instructions', 'incomplete_content', (draft) => { delete plan(draft, 'belgium').challenge.prompt; }],
  ['invalid penalty', 'invalid_challenge_rules', (draft) => { plan(draft, 'belgium').challenge.penaltySips = -1; }],
  ['invalid timer', 'invalid_challenge_rules', (draft) => { plan(draft, 'ireland').challenge.durationSeconds = 0; }],
  ['invalid role', 'invalid_targeting', (draft) => { plan(draft, 'norway').challenge.targeting.role = 'leader'; }],
  ['missing pool version', 'invalid_version', (draft) => { delete content(draft, 'germany').poolVersion; }],
  ['word outside country list', 'invalid_word', (draft) => { content(draft, 'ireland').word = 'No such word'; }],
  ['duplicate word', 'duplicate_content', (draft) => { content(draft, 'ireland', 'team2').word = content(draft, 'ireland').word; }],
  ['incomplete question', 'incomplete_content', (draft) => { delete content(draft, 'united-kingdom').question.prompt; }],
  ['three answer options', 'invalid_question', (draft) => { content(draft, 'united-kingdom').question.options.pop(); }],
  ['duplicate answer options', 'invalid_question', (draft) => { const { options } = content(draft, 'united-kingdom').question; options[1] = options[0]; }],
  ['duplicate question across stops', 'duplicate_content', (draft) => { content(draft, 'estonia').question = clone(content(draft, 'united-kingdom').question); }],
  ['missing photo attribution', 'incomplete_content', (draft) => { delete content(draft, 'germany').monument.imageAuthor; }],
  ['invalid photo URL', 'invalid_monument', (draft) => { content(draft, 'germany').monument.imageUrl = 'not a URL'; }],
  ['invalid coordinates', 'invalid_monument', (draft) => { content(draft, 'germany').monument.coordinates = [500, 64]; }],
  ['landing country photo', 'landing_country_photo', (draft) => { content(draft, 'germany').monument = clone(DEFAULT_MONUMENT_POOL.find((item) => item.countryId === 'germany')); }],
  ['duplicate photo across stops', 'duplicate_content', (draft) => { content(draft, 'albania').monument = clone(content(draft, 'germany').monument); }],
  ['missing size silhouette', 'incomplete_content', (draft) => { delete content(draft, 'denmark').round.reference.silhouette; }],
  ['zero measurement', 'invalid_size_item', (draft) => { content(draft, 'denmark').round.target.metres = 0; }],
  ['unreachable size ratio', 'invalid_size_pair', (draft) => { content(draft, 'denmark').round.target.metres = 50000; }],
  ['duplicate pair across stops', 'duplicate_content', (draft) => { content(draft, 'czechia').round = clone(content(draft, 'denmark').round); }],
  ['duplicate pair with new ID', 'duplicate_content', (draft) => { content(draft, 'czechia').round = { ...clone(content(draft, 'denmark').round), id: 'different-id' }; }],
];

for (const [label, code, edit] of invalidEdits) {
  test(`validation rejects ${label} without silently repairing the draft`, () => {
    const draft = createBetaPreset();
    edit(draft);
    const before = clone(draft);
    const validation = validateBetaScenario(draft);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.code === code), JSON.stringify(validation.errors));
    assert.ok(validation.errors.every((error) => error.path && error.message));
    assert.throws(() => createBetaSnapshot(draft), (error) => error.code === 'INVALID_BETA_SCENARIO' && error.errors.length > 0);
    assert.deepEqual(draft, before);
  });
}

test('malformed drafts and non-Firebase JSON are rejected without a validation crash', () => {
  for (const value of [undefined, null, [], {}, 'text', { routeStops: [], betaScenario: {} }]) {
    assert.equal(validateBetaScenario(value).valid, false);
    assert.throws(() => createBetaSnapshot(value), { code: 'INVALID_BETA_SCENARIO' });
  }
  for (const value of [undefined, NaN, Infinity, 1n, () => {}, new Date()]) {
    const draft = createBetaPreset();
    draft.badValue = value;
    assert.equal(validateBetaScenario(draft).errors[0].code, 'invalid_json');
  }
  const circular = createBetaPreset();
  circular.loop = circular;
  assert.equal(validateBetaScenario(circular).errors[0].code, 'invalid_json');
  const badKey = createBetaPreset();
  badKey['bad/key'] = true;
  assert.equal(validateBetaScenario(badKey).errors[0].code, 'invalid_key');
  for (const stopId of ['ireland', 'united-kingdom', 'germany', 'denmark']) {
    for (const value of [null, [], 5, {}, 'broken']) {
      const draft = createBetaPreset();
      plan(draft, stopId).contentByTeam.team1 = value;
      assert.equal(validateBetaScenario(draft).valid, false);
    }
  }
});

test('snapshot envelopes survive serialized preview/room/reconnect/rematch copies independently', () => {
  const draft = createBetaPreset();
  const preview = createBetaSnapshot(draft);
  const room = createBetaSnapshot(draft);
  const reconnect = createBetaSnapshot(clone(room));
  const rematch = createBetaSnapshot(reconnect);
  const expected = clone(room);
  draft.routeStops[0].position.x = 999;
  plan(draft, 'ireland').challenge.words[0] = 'Changed draft';
  content(draft, 'germany').monument.imageUrl = 'https://example.com/new.jpg';
  content(draft, 'united-kingdom').question.options[0] = 'Changed draft';
  content(draft, 'denmark').round.target.metres = 999;
  for (const snapshot of [preview, room, reconnect, rematch]) assert.deepEqual(snapshot, expected);
  content(preview, 'germany').monument.coordinates[0] += 1;
  content(rematch, 'denmark').round.target.label = 'Changed rematch copy';
  assert.deepEqual(room, expected);
  assert.deepEqual(reconnect, expected);
});

test('saved plans ignore changed catalogues, pools, seeds and prior visits', () => {
  const snapshot = createBetaPreset();
  const original = clone(snapshot);
  const country = DEFAULT_COUNTRY_STOPS.find((stop) => stop.id === 'ireland');
  const wordChallenge = country.challenges.find((challenge) => challenge.type === 'countryWordGuess');
  const savedValues = [wordChallenge.words[0], DEFAULT_MONUMENT_POOL[0].imageUrl,
    PERSONAL_MATCH_QUESTIONS[0].prompt, SIZE_IT_UP_ROUNDS[0].target.metres];
  try {
    wordChallenge.words[0] = 'New local word';
    DEFAULT_MONUMENT_POOL[0].imageUrl = 'https://example.com/new.jpg';
    PERSONAL_MATCH_QUESTIONS[0].prompt = 'New local question';
    SIZE_IT_UP_ROUNDS[0].target.metres = 999;
    for (const seed of ['first-turn', 'different-device', 'rematch']) {
      const unrelatedState = {
        seed, usedChallengeKeys: ['ireland:guess-country-word'],
        usedMonumentIds: getBetaReservedMonumentIds(snapshot.betaScenario),
        usedPersonalQuestionIds: PERSONAL_MATCH_QUESTIONS.map((question) => question.id),
        usedSizeRoundIds: SIZE_IT_UP_ROUNDS.map((round) => round.id),
      };
      for (const stopId of expectedRoute.slice(1, -1)) {
        for (const teamId of BETA_TEAM_IDS) {
          // Selection takes only saved plan + stop + team. Extra state cannot reroll it.
          assert.deepEqual(getBetaPlannedChallenge(snapshot.betaScenario, stopId, teamId, unrelatedState), {
            challenge: plan(original, stopId).challenge, fixedContent: content(original, stopId, teamId),
          });
        }
      }
    }
    assert.deepEqual(createBetaSnapshot(snapshot), original);
    const selection = getBetaPlannedChallenge(snapshot.betaScenario, 'germany', 'team1');
    selection.fixedContent.monument.position.x += 10;
    selection.challenge.title = 'Changed consumer';
    assert.deepEqual(snapshot, original);
  } finally {
    [wordChallenge.words[0], DEFAULT_MONUMENT_POOL[0].imageUrl,
      PERSONAL_MATCH_QUESTIONS[0].prompt, SIZE_IT_UP_ROUNDS[0].target.metres] = savedValues;
  }
});

test('ordinary rooms and endpoint lookups have no plan; unknown versions/teams fail explicitly', () => {
  const { betaScenario } = createBetaPreset();
  assert.equal(getBetaPlannedChallenge(undefined, 'ireland', 'team1'), null);
  assert.equal(getBetaPlannedChallenge(null, 'ireland', 'team1'), null);
  assert.deepEqual(getBetaReservedMonumentIds(undefined), []);
  for (const stopId of ['iceland', 'greece']) {
    assert.equal(getBetaPlannedChallenge(betaScenario, stopId, 'team1'), null);
  }
  assert.throws(() => getBetaPlannedChallenge(betaScenario, 'ireland', 'team4'), /Unknown beta team/);
  const unsupported = { ...betaScenario, schemaVersion: 2 };
  assert.throws(() => getBetaPlannedChallenge(unsupported, 'ireland', 'team1'), /Unsupported/);
  assert.throws(() => getBetaReservedMonumentIds(unsupported), /Unsupported/);
});
