import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultiplayerHarness } from '../scripts/test-support/multiplayerHarness.mjs';
import {
  getChallengeIdForStop, getPersonalMatchRound, getTargetedChallengeRound, normalizeTargetedChallengeRound,
} from '../app/GameScreen/constants/challenges.js';
import { DEFAULT_COUNTRY_STOPS } from '../app/GameScreen/constants/countryStops.js';

for (const type of ['sizeItUp', 'countryWordGuess', 'personalMatch']) {
  test(`${type}: deadline rejects late success, then timeout resolves exactly once`, async () => {
    const h = createMultiplayerHarness();
    await h.land(type);
    const act = action => h.client().updateChallenge(action);
    if (type === 'countryWordGuess') assert.equal(await act('start'), true);
    if (type === 'personalMatch') {
      assert.equal(await act('startPersonalAnswering'), true);
      assert.equal(await act({ type: 'submitPersonalAnswer', answerIndex: 1 }), true);
      assert.equal(await act('startPersonalGuessing'), true);
    }
    const round = h.room.gameplay.challengeRound;
    const late = type === 'sizeItUp' ? { type: 'submitSizeEstimate', estimatedRatio: round.trueRatio }
      : type === 'countryWordGuess' ? 'guessed' : { type: 'submitPersonalGuess', guessIndex: 1 };
    const timeout = type === 'sizeItUp' ? 'timeoutSizeEstimate'
      : type === 'countryWordGuess' ? 'timeout' : 'timeoutPersonalGuess';
    assert.equal(await act(timeout), false, 'early timeout rejected');
    h.setTime((round.guessStartedAt ?? round.startedAt) + round.durationSeconds * 1000);
    const before = structuredClone(h.room.gameplay);
    assert.equal(await act(late), false, 'submission at deadline rejected');
    assert.deepEqual(h.room.gameplay, before);
    h.advance(5000);
    assert.equal(await act(late), false, 'submission after deadline rejected');
    assert.equal(await act(timeout), true);
    const once = structuredClone(h.room.gameplay);
    assert.equal(await act(timeout), false);
    assert.deepEqual(h.room.gameplay, once);
  });
}

test('Size It Up recovery waits for grace and ignores another leader’s supplied estimate', async () => {
  const h = createMultiplayerHarness();
  await h.land('sizeItUp');
  assert.equal(await h.client('team2').updateChallenge({ type: 'updateSizeEstimate', estimatedRatio: 2 }), false);
  assert.equal(await h.client().updateChallenge({ type: 'updateSizeEstimate', estimatedRatio: 1.2 }), true);
  const round = h.room.gameplay.challengeRound;
  h.setTime((round.guessStartedAt ?? round.startedAt) + round.durationSeconds * 1000);
  const recover = () => h.client('team2').updateChallenge({ type: 'timeoutSizeEstimate', estimatedRatio: round.trueRatio });
  assert.equal(await recover(), false);
  h.advance(1199);
  assert.equal(await recover(), false);
  h.advance(1);
  assert.equal(await recover(), true);
  assert.equal(h.room.gameplay.challengeRound.estimatedRatio, 1.2);
});

test('Size It Up controlling leader can finalize its local estimate at expiry', async () => {
  const h = createMultiplayerHarness();
  await h.land('sizeItUp');
  const round = h.room.gameplay.challengeRound;
  h.setTime((round.guessStartedAt ?? round.startedAt) + round.durationSeconds * 1000);
  assert.equal(await h.client().updateChallenge({ type: 'timeoutSizeEstimate', estimatedRatio: round.trueRatio }), true);
  assert.equal(h.room.gameplay.challengeRound.result, 'passed');
});

for (const result of ['COMPLETED', 'FAILED']) {
  test(`targeted text challenge shows playable instructions before ${result} and awards drinks once`, async () => {
    const h = createMultiplayerHarness();
    // Use the real beta landing path with a fixed ordinary targeted card.
    const stop = h.room.routeStops[1];
    const card = DEFAULT_COUNTRY_STOPS.flatMap(s => s.challenges).find(c => !c.type && c.targeting?.role && c.drinkRules?.failure === 'target');
    h.room.betaScenario.stops[stop.id].challenge = structuredClone(card);
    h.room.betaScenario.stops[stop.id].contentByTeam = {};
    h.room.betaScenario.stops[stop.id].mustPlay = true;
    await h.land(undefined);
    const round = h.room.gameplay.challengeRound;
    assert.equal(round.stage, 'playing');
    assert.equal(round.result, undefined);
    assert.equal(await h.client().completeChallenge(), false, 'cannot skip unresolved result');
    const before = structuredClone(h.room.gameplay.teamProgress);
    assert.equal(await h.client('team2').updateChallenge(result), false);
    assert.equal(await h.client().updateChallenge(result), true);
    assert.equal(h.room.gameplay.challengeRound.result, result.toLowerCase());
    for (const [id, player] of Object.entries(h.room.gameplay.teamProgress.team1.playerDrinks)) {
      const expected = result === 'FAILED' && id === round.selectedPlayerId ? round.resolvedPenaltySips : 0;
      assert.equal(player.drinks - before.team1.playerDrinks[id].drinks, expected);
    }
    const once = structuredClone(h.room.gameplay);
    assert.equal(await h.client().updateChallenge(result), false);
    assert.deepEqual(h.room.gameplay, once);
    assert.equal(await h.client().completeChallenge(), true);
    assert.equal(h.room.gameplay.activeTeamId, 'team2');
  });
}

test('forced teammate challenge respects minimum players and produces a handoff with two teammates', () => {
  const stop = DEFAULT_COUNTRY_STOPS[1];
  const id = getChallengeIdForStop(stop, 'forced', { forceType: 'personalMatch', teamPlayerCount: 1 });
  assert.notEqual(id, 'personal-match');
  const challengeId = getChallengeIdForStop(stop, 'forced', { forceType: 'personalMatch', teamPlayerCount: 2 });
  const challenge = stop.challenges.find(c => c.id === challengeId);
  const players = [{ playerId: 'a', name: 'A' }, { playerId: 'b', name: 'B' }];
  assert.equal(getPersonalMatchRound({ challenge, players }).round.stage, 'handoff');
  const text = stop.challenges.find(c => !c.type && c.targeting);
  assert.equal(getTargetedChallengeRound(text, players).stage, 'playing');
});

test('existing broken text rounds recover without reopening completed results or typed challenges', () => {
  const card = DEFAULT_COUNTRY_STOPS.flatMap(s => s.challenges).find(c => !c.type && c.targeting);
  const broken = { stage: 'result', selectedPlayerId: 'player', targetCursor: 2, resolvedPenaltySips: 3 };
  const repaired = normalizeTargetedChallengeRound(card, broken);
  assert.equal(repaired.stage, 'playing');
  assert.equal(repaired.selectedPlayerId, 'player');
  assert.equal(repaired.targetCursor, 2);
  assert.deepEqual(repaired.drinkRules, card.drinkRules);
  assert.equal(broken.stage, 'result', 'do not mutate transaction input');
  for (const result of ['completed', 'failed']) {
    const completed = { ...broken, result };
    assert.equal(normalizeTargetedChallengeRound(card, completed), completed);
  }
  assert.equal(normalizeTargetedChallengeRound({ ...card, type: 'personalMatch' }, broken), broken);
});
