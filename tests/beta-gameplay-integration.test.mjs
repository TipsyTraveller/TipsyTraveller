import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_COUNTRY_STOPS } from '../app/GameScreen/constants/countryStops.js';
import { DEFAULT_MONUMENT_POOL } from '../app/GameScreen/constants/monumentPool.js';
import { PERSONAL_MATCH_QUESTIONS } from '../app/GameScreen/constants/personalMatch.js';
import { SIZE_IT_UP_ROUNDS } from '../app/GameScreen/constants/sizeItUp.js';
import { createInitialGameplay } from '../app/GameScreen/gameplayState.js';
import { resolveLandingChallenge } from '../app/GameScreen/landingChallenge.js';
import {
  getBetaReservedMonumentIds,
  getBetaStopPlan,
} from '../app/GameScreen/betaPlannedContent.js';
import { selectMonumentFromPool } from '../app/GameScreen/constants/monumentPool.js';

const TEAMS = ['team1', 'team2', 'team3'];
const byId = (id) => DEFAULT_COUNTRY_STOPS.find((stop) => stop.id === id);

// Route: start, five planned stops, finish. Stop order is what the plan refers to by id.
const ROUTE = ['iceland', 'ireland', 'united-kingdom', 'germany', 'denmark', 'belgium', 'greece']
  .map(byId);
const INDEX = Object.fromEntries(ROUTE.map((stop, index) => [stop.id, index]));
const ordinaryBelgiumId = byId('belgium').challenges.find((challenge) => !challenge.type).id;

const monumentFor = (index) => {
  const monument = DEFAULT_MONUMENT_POOL[index];
  assert.ok(monument?.id, `monument ${index} exists`);
  return monument;
};

const BETA_SCENARIO = {
  schemaVersion: 1,
  presetId: 'friends-18',
  playerCount: 9,
  stops: [
    {
      stopId: 'ireland',
      challengeId: 'guess-country-word',
      content: {
        team1: { secretWord: 'Leprechaun-1' },
        team2: { secretWord: 'Leprechaun-2' },
        team3: { secretWord: 'Leprechaun-3' },
      },
    },
    {
      stopId: 'united-kingdom',
      challengeId: 'personal-match',
      content: Object.fromEntries(TEAMS.map((teamId, index) => {
        const question = PERSONAL_MATCH_QUESTIONS[index];
        return [teamId, {
          questionId: question.id,
          prompt: question.prompt,
          options: question.options,
        }];
      })),
    },
    {
      stopId: 'germany',
      challengeId: 'geo-guessr-duel',
      content: Object.fromEntries(TEAMS.map((teamId, index) => [
        teamId,
        { monument: monumentFor(index * 5) },
      ])),
    },
    {
      stopId: 'denmark',
      challengeId: 'size-it-up',
      content: Object.fromEntries(TEAMS.map((teamId, index) => [
        teamId,
        { sizeRoundId: SIZE_IT_UP_ROUNDS[index + 3].id },
      ])),
    },
    { stopId: 'belgium', challengeId: ordinaryBelgiumId, content: {} },
  ],
};

const player = (teamId, index) => ({
  playerId: `${teamId}-p${index}`,
  name: `${teamId} player ${index}`,
  deviceID: index === 0 ? `${teamId}-phone` : '',
});
const PLAYERS = Object.fromEntries(TEAMS.map((teamId) => [teamId, [0, 1, 2].map((i) => player(teamId, i))]));

const baseGameplay = () => ({
  ...createInitialGameplay({ nrOfPlayers: 3 }, 1000, {}),
});

const land = ({
  betaScenario = BETA_SCENARIO,
  current = baseGameplay(),
  stopId,
  teamId = 'team1',
  actionId = `action-${stopId}-${teamId}`,
  fromLeg = 0,
} = {}) => resolveLandingChallenge({
  betaScenario,
  actionId,
  current,
  difficulty: 'medium',
  fromLeg,
  monumentPool: DEFAULT_MONUMENT_POOL,
  players: PLAYERS[teamId],
  requiredTeamIds: TEAMS,
  routeStops: ROUTE,
  startedAt: 5000,
  stopIndex: INDEX[stopId],
  teamId,
  timerPace: 'relaxed',
});

/** Applies one landing the way the multiplayer transaction does. */
const apply = (current, landing) => ({ ...current, ...landing.history });

test('stop plans are found by stop id, also after a Realtime Database object round trip', () => {
  assert.equal(getBetaStopPlan(BETA_SCENARIO, byId('ireland'))?.challengeId, 'guess-country-word');
  const asObject = JSON.parse(JSON.stringify({
    ...BETA_SCENARIO,
    stops: Object.fromEntries(BETA_SCENARIO.stops.map((plan, index) => [String(index), plan])),
  }));
  assert.equal(getBetaStopPlan(asObject, byId('germany'))?.challengeId, 'geo-guessr-duel');
  assert.equal(getBetaStopPlan(BETA_SCENARIO, byId('iceland')), null);
  assert.equal(getBetaStopPlan({ ...BETA_SCENARIO, schemaVersion: 2 }, byId('ireland')), null);
});

test('Guess the Country Word uses the fixed word for each team', () => {
  TEAMS.forEach((teamId, index) => {
    const landing = land({ stopId: 'ireland', teamId });
    assert.equal(landing.challengeId, 'guess-country-word');
    assert.equal(landing.challengeRound.secretWord, `Leprechaun-${index + 1}`);
    assert.equal(landing.challengeRound.stage, 'intro');
    assert.ok(landing.challengeRound.resolvedPenaltySips > 0);
  });
});

test('Match Your Teammate uses the fixed question and a respondent without their own phone', () => {
  const first = land({ stopId: 'united-kingdom', teamId: 'team2' });
  assert.equal(first.challengeRound.personalQuestionId, PERSONAL_MATCH_QUESTIONS[1].id);
  assert.deepEqual(first.challengeRound.personalQuestionOptions, PERSONAL_MATCH_QUESTIONS[1].options);
  // Rotation starts with the phone holder and moves on to players that have no phone.
  assert.equal(first.challengeRound.selectedPlayerId, 'team2-p0');
  const second = land({
    stopId: 'united-kingdom',
    teamId: 'team2',
    current: apply(baseGameplay(), first),
    actionId: 'later',
  });
  assert.equal(second.challengeRound.selectedPlayerId, 'team2-p1');
  assert.equal(second.challengeRound.personalQuestionId, PERSONAL_MATCH_QUESTIONS[1].id);
});

test('GeoGuessr uses the fixed photo for each team and keeps its own answer position', () => {
  TEAMS.forEach((teamId, index) => {
    const landing = land({ stopId: 'germany', teamId });
    const expected = monumentFor(index * 5);
    assert.equal(landing.challengeRound.monumentId, expected.id);
    assert.equal(landing.challengeRound.monumentImageUrl, expected.imageUrl);
    assert.deepEqual(landing.challengeRound.targetPosition, expected.position);
    assert.equal(landing.challengeRound.stage, 'photo');
  });
});

test('Size It Up uses the fixed comparison for each team', () => {
  TEAMS.forEach((teamId, index) => {
    const landing = land({ stopId: 'denmark', teamId });
    assert.equal(landing.challengeRound.sizeRoundId, SIZE_IT_UP_ROUNDS[index + 3].id);
    assert.ok(landing.challengeRound.trueRatio > 0);
  });
});

test('planned content survives changing seeds, used-content history and earlier team visits', () => {
  const visited = baseGameplay();
  // Earlier teams already visited the stop and the history lists are saturated.
  Object.assign(visited, {
    usedChallengeKeys: TEAMS.flatMap((_, i) => ['ireland', 'germany', 'denmark', 'united-kingdom']
      .map((id) => `${id}:${byId(id).challenges[0].id}`)).concat([
      'ireland:guess-country-word',
      'germany:geo-guessr-duel',
      'denmark:size-it-up',
      'united-kingdom:personal-match',
    ]),
    usedMonumentIds: DEFAULT_MONUMENT_POOL.map((monument) => monument.id),
    usedSizeRoundIds: SIZE_IT_UP_ROUNDS.map((round) => round.id),
    usedPersonalQuestionIds: PERSONAL_MATCH_QUESTIONS.map((question) => question.id),
  });
  ['seed-a', 'seed-b', 'seed-c'].forEach((actionId) => {
    assert.equal(land({ stopId: 'ireland', teamId: 'team3', actionId, current: visited })
      .challengeRound.secretWord, 'Leprechaun-3');
    assert.equal(land({ stopId: 'germany', teamId: 'team3', actionId, current: visited })
      .challengeRound.monumentId, monumentFor(10).id);
    assert.equal(land({ stopId: 'denmark', teamId: 'team3', actionId, current: visited })
      .challengeRound.sizeRoundId, SIZE_IT_UP_ROUNDS[5].id);
    assert.equal(land({ stopId: 'united-kingdom', teamId: 'team3', actionId, current: visited })
      .challengeRound.personalQuestionId, PERSONAL_MATCH_QUESTIONS[2].id);
  });
});

test('ordinary planned challenges are chosen even when the same card was used before', () => {
  const current = { ...baseGameplay(), usedChallengeKeys: [`belgium:${ordinaryBelgiumId}`] };
  const landing = land({ stopId: 'belgium', teamId: 'team2', current });
  assert.equal(landing.challengeId, ordinaryBelgiumId);
});

test('a re-run transaction on the same state is deterministic and does not double-count', () => {
  const current = baseGameplay();
  const first = land({ stopId: 'united-kingdom', teamId: 'team1', current });
  const rerun = land({ stopId: 'united-kingdom', teamId: 'team1', current });
  assert.deepEqual(rerun, first);
  assert.equal(first.history.targetCursors['team1:respondent'], 1);
  // The input record is never mutated, so a retry starts from the same cursor.
  assert.equal(current.targetCursors['team1:respondent'], undefined);
});

test('a Roadside Duel replaces the plan and avoids planned photos of other teams', () => {
  const progress = baseGameplay();
  progress.teamProgress.team2 = { ...progress.teamProgress.team2, currentLeg: INDEX.germany };
  const reserved = new Set(getBetaReservedMonumentIds(BETA_SCENARIO));
  assert.equal(reserved.size, 3);

  const seen = new Set();
  for (let i = 0; i < 40; i += 1) {
    const duel = land({
      stopId: 'denmark',
      teamId: 'team1',
      fromLeg: INDEX.ireland,
      current: progress,
      actionId: `duel-${i}`,
    });
    assert.equal(duel.isRoadsideDuel, true);
    assert.equal(duel.challengeId, 'geo-guessr-duel', 'duel replaces planned Size It Up');
    assert.equal(duel.challengeRound.isRoadsideDuel, true);
    assert.equal(reserved.has(duel.challengeRound.monumentId), false, 'planned photo not spoiled');
    seen.add(duel.challengeRound.monumentId);
  }
  assert.ok(seen.size > 3, 'duel photos still vary');
});

test('a duel on a planned GeoGuessr stop is random, not the planned photo content', () => {
  const progress = baseGameplay();
  progress.teamProgress.team2 = { ...progress.teamProgress.team2, currentLeg: INDEX.germany };
  const duel = land({
    stopId: 'germany',
    teamId: 'team1',
    fromLeg: INDEX.ireland,
    current: progress,
  });
  assert.equal(duel.isRoadsideDuel, true);
  assert.equal(getBetaReservedMonumentIds(BETA_SCENARIO).includes(duel.challengeRound.monumentId), false);
});

test('special-event photo reservation never empties the pool', () => {
  const all = DEFAULT_MONUMENT_POOL.map((monument) => monument.id);
  const { monument } = selectMonumentFromPool({
    pool: DEFAULT_MONUMENT_POOL,
    reservedMonumentIds: all,
    seed: 'x',
  });
  assert.ok(monument.id);
});

test('ordinary rooms without a scenario keep their existing selection', () => {
  const current = baseGameplay();
  const withoutField = land({ betaScenario: null, stopId: 'ireland', current });
  const withOldVersion = land({
    betaScenario: { ...BETA_SCENARIO, schemaVersion: 99 },
    stopId: 'ireland',
    current,
  });
  assert.deepEqual(withOldVersion, withoutField);
  assert.notEqual(withoutField.challengeRound?.secretWord, 'Leprechaun-1');
});

test('a stop missing from the plan falls back to ordinary selection', () => {
  const landing = land({ stopId: 'denmark', betaScenario: { ...BETA_SCENARIO, stops: [] } });
  assert.ok(landing.challengeId);
});

test('a planned challenge the team cannot play falls back instead of stalling', () => {
  const landing = resolveLandingChallenge({
    betaScenario: BETA_SCENARIO,
    actionId: 'solo',
    current: baseGameplay(),
    difficulty: 'easy',
    fromLeg: 0,
    monumentPool: DEFAULT_MONUMENT_POOL,
    players: [PLAYERS.team1[0]],
    requiredTeamIds: TEAMS,
    routeStops: ROUTE,
    startedAt: 5000,
    stopIndex: INDEX.ireland,
    teamId: 'team1',
    timerPace: 'relaxed',
  });
  assert.notEqual(landing.challengeId, 'guess-country-word');
});
