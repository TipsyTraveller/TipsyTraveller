import test from 'node:test';
import assert from 'node:assert/strict';
import { createBetaPreset } from '../app/GameScreen/constants/betaScenario.js';
import { createBetaRoomRecords, reduceBetaLobby, transactBetaLobby, runBetaLobbyTransaction } from '../app/Lobby/betaLobbyState.js';
import { chooseTeamForJoin, chooseTeamForLocalPlayer, countPlayers, getLobbyReadiness } from '../app/Lobby/lobbyState.js';
import { getRoomRoute } from '../app/shared/roomNavigation.js';
import {
  BETA_DRAFT_KEY, createBetaDraft, editBetaChallenge, editBetaRoute, editBetaTeamContent,
  loadBetaDraft, saveBetaDraft, saveBetaTextChallenge, editBetaChallengeDrinks,
} from '../app/shared/dev/betaDraft.js';
import { DEFAULT_COUNTRY_STOPS } from '../app/GameScreen/constants/countryStops.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const gameID = '1234';
const options = () => ({
  scenario: createBetaPreset(), hostName: ' Host ', deviceID: 'phone1', createdAt: 100,
  playerIds: ['host', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'],
  guestNames: { team1: ['Ada', 'Bram'], team2: ['Cleo', 'Daan'], team3: ['Eva', 'Finn'] },
});
const rootWithSeven = () => {
  const { gameData, teamMembers } = createBetaRoomRecords(options());
  return { games: { [gameID]: gameData, other: { status: 'game' } }, players: { [gameID]: teamMembers, other: { playerCounter: 2 } }, gameContent: { keep: true } };
};
const action = (kind, extra = {}) => ({ gameID, kind, deviceID: 'phone1', now: 200, ...extra });
const join = (number) => action('join', { deviceID: `phone${number}`, playerId: `leader${number}`, name: `Leader ${number}` });
const rootWithNine = () => reduceBetaLobby(reduceBetaLobby(rootWithSeven(), join(2)).root, join(3)).root;

test('creation registers exactly seven real participants and snapshots route/content independently', () => {
  const input = options();
  const { gameData, teamMembers } = createBetaRoomRecords(input);
  assert.equal(countPlayers(teamMembers), 7);
  assert.equal(teamMembers.playerCounter, 7);
  assert.equal(gameData.HostName, 'Host');
  assert.equal(gameData.devTurnTesting, undefined);
  assert.deepEqual(Object.keys(teamMembers.team1), ['g1', 'g2', 'host']);
  assert.equal(teamMembers.team1.host.deviceID, 'phone1');
  for (const key of ['team1', 'team2', 'team3']) {
    assert.equal(Object.values(teamMembers[key]).filter((player) => !player.deviceID).length, 2);
    assert.ok(Object.values(teamMembers[key]).every((player) => !player.isBot));
  }
  input.scenario.routeStops[0].position.x = 999;
  input.scenario.betaScenario.stops.ireland.contentByTeam.team1.word = 'changed';
  assert.deepEqual({ routeStops: gameData.routeStops, betaScenario: gameData.betaScenario }, createBetaPreset());
  assert.equal(getLobbyReadiness(gameData, teamMembers).isReady, false);
});

test('creation rejects missing names, bot host and repeated registration keys', () => {
  for (const edit of [
    (input) => { input.hostName = ' '; },
    (input) => { input.guestNames.team3[1] = ''; },
    (input) => { input.guestNames.team2.pop(); },
    (input) => { input.deviceID = 'dev-bot-host'; },
    (input) => { input.playerIds[1] = input.playerIds[0]; },
  ]) { const input = options(); edit(input); assert.throws(() => createBetaRoomRecords(input)); }
});

test('seven registrations → two phone joins → nine players → vehicle selection → game', () => {
  let root = rootWithSeven();
  const initial = clone(root);
  const second = reduceBetaLobby(root, join(2));
  assert.equal(second.outcome.teamKey, 'team2'); root = second.root;
  assert.equal(root.players[gameID].playerCounter, 8);
  assert.equal(reduceBetaLobby(root, action('start')).outcome.code, 'not_ready');
  const third = reduceBetaLobby(root, join(3));
  assert.equal(third.outcome.teamKey, 'team3'); root = third.root;
  assert.equal(root.players[gameID].playerCounter, 9);
  assert.equal(getLobbyReadiness(root.games[gameID], root.players[gameID]).isReady, true);
  assert.equal(reduceBetaLobby(root, join(4)).outcome.code, 'full');
  const started = reduceBetaLobby(root, action('start'));
  assert.equal(started.outcome.ok, true); root = started.root;
  assert.equal(root.games[gameID].status, 'characterSelection');
  const navigate = getRoomRoute({ gameID, gameData: root.games[gameID], teamMembers: root.players[gameID] });
  assert.equal(navigate.name, 'CharacterSelection');
  assert.deepEqual(navigate.params.gameData.betaScenario, initial.games[gameID].betaScenario);
  const initializeGameplay = () => ({ sessionId: 'fixed-session', phase: 'waiting', revision: 0 });
  assert.equal(reduceBetaLobby(root, action('beginGame', { initializeGameplay })).outcome.code, 'not_ready');
  root.games[gameID].teamModels = { team1: 'car1', team2: 'car2', team3: 'car3' };
  const result = reduceBetaLobby(root, action('beginGame', { initializeGameplay }));
  assert.equal(result.outcome.ok, true);
  assert.equal(result.root.games[gameID].status, 'game');
  assert.equal(getRoomRoute({ gameID, gameData: result.root.games[gameID], teamMembers: root.players[gameID] }).name, 'GameScreen');
  assert.deepEqual(result.root.games[gameID].routeStops, initial.games[gameID].routeStops);
  assert.deepEqual(result.root.games[gameID].betaScenario, initial.games[gameID].betaScenario);
  assert.deepEqual(result.root.games.other, initial.games.other);
  assert.deepEqual(result.root.players.other, initial.players.other);
  assert.deepEqual(result.root.gameContent, initial.gameContent);
});

test('same-device retries and reconnects never insert another leader or change the snapshot', () => {
  for (const status of ['lobby', 'characterSelection', 'game']) {
    const root = rootWithNine(); root.games[gameID].status = status;
    const before = clone(root);
    const result = reduceBetaLobby(root, { ...join(2), playerId: 'new-push-key' });
    assert.deepEqual(result.outcome, { ok: true, existing: true, teamKey: 'team2', playerId: 'leader2' });
    assert.deepEqual(result.root, before);
    assert.deepEqual(root, before);
  }
});

test('start rejects duplicate leader phones, bots, an incomplete team and a tenth player', () => {
  for (const edit of [
    (root) => { root.players[gameID].team3.leader3.deviceID = 'phone2'; },
    (root) => { root.players[gameID].team2.leader2.deviceID = 'dev-bot-t2'; },
    (root) => { root.players[gameID].team2.leader2.isBot = true; },
    (root) => { delete root.players[gameID].team3.g6; },
    (root) => { root.players[gameID].team1.extra = { name: 'Tenth', isLeader: false }; },
    (root) => { root.players[gameID].team2.g3.isLeader = true; },
  ]) {
    const root = rootWithNine(); edit(root); const before = clone(root);
    assert.equal(getLobbyReadiness(root.games[gameID], root.players[gameID]).isReady, false);
    assert.equal(reduceBetaLobby(root, action('start')).outcome.ok, false);
    assert.deepEqual(root, before);
  }
});

test('host-only roster changes preserve leader reservations and cannot invent a phone', () => {
  const root = rootWithSeven();
  assert.equal(chooseTeamForLocalPlayer(root.games[gameID], root.players[gameID]), undefined);
  const addGuest = ({ players }) => ({ players: { ...players, team2: { ...players.team2, extra: { name: 'Extra', isLeader: false } } } });
  assert.equal(reduceBetaLobby(root, action('roster', { mutate: addGuest })).outcome.ok, false);
  assert.equal(reduceBetaLobby(root, action('roster', { deviceID: 'intruder', mutate: addGuest })).outcome.code, 'forbidden');
  const inventPhone = ({ players }) => ({ players: { ...players, team2: { ...players.team2, leader: { name: 'Fake phone', isLeader: true, deviceID: 'made-up' } } } });
  assert.equal(reduceBetaLobby(root, action('roster', { mutate: inventPhone })).outcome.code, 'real_joins_only');
  const removed = reduceBetaLobby(root, action('roster', { mutate: ({ players }) => { delete players.team3.g6; return { players }; } }));
  assert.equal(removed.outcome.ok, true);
  assert.equal(countPlayers(root.players[gameID]), 7, 'callback input is detached');
  assert.equal(chooseTeamForLocalPlayer(removed.root.games[gameID], removed.root.players[gameID]), 'team3');
  assert.equal(removed.root.players[gameID].playerCounter, 6);
});

test('closed, expired and foreign-host actions are rejected at transaction time', () => {
  const root = rootWithNine();
  assert.equal(reduceBetaLobby(root, action('start', { deviceID: 'phone2' })).outcome.code, 'forbidden');
  root.games[gameID].disconnectedAt = 1;
  assert.equal(reduceBetaLobby(root, action('start', { now: 700000 })).outcome.code, 'expired');
  delete root.games[gameID].disconnectedAt;
  root.games[gameID].status = 'characterSelection';
  assert.equal(reduceBetaLobby(root, action('roster', { mutate: () => { throw new Error('Must not run'); } })).outcome.code, 'closed');
  assert.equal(reduceBetaLobby(root, join(4)).outcome.code, 'started');
  assert.equal(reduceBetaLobby(root, action('start')).outcome.code, 'closed');
});

// Optimistic transaction harness: both callbacks see the same initial revision,
// then the second is retried against the first commit, like an RTDB conflict.
const memoryTransactions = (initial) => {
  let root = clone(initial);
  let revision = 0;
  const transact = async (updater) => {
    const before = revision;
    let next = updater(clone(root));
    await Promise.resolve();
    if (before !== revision) next = updater(clone(root));
    if (next === undefined) return { committed: false };
    root = clone(next); revision += 1;
    return { committed: true };
  };
  return { transact, getRoot: () => clone(root) };
};

test('concurrent joins are retried against current roster; only two new leader phones fit', async () => {
  const database = memoryTransactions(rootWithSeven());
  const results = await Promise.all([2, 3, 4].map((i) => transactBetaLobby(database.transact, join(i))));
  assert.equal(results.filter((result) => result.ok).length, 2);
  assert.equal(results.filter((result) => result.code === 'full').length, 1);
  const root = database.getRoot();
  assert.equal(countPlayers(root.players[gameID]), 9);
  assert.equal(root.players[gameID].playerCounter, 9);
  assert.equal(getLobbyReadiness(root.games[gameID], root.players[gameID]).isReady, true);
});

test('simultaneous requests from the same phone are idempotent', async () => {
  const database = memoryTransactions(rootWithSeven());
  const results = await Promise.all(['key-a', 'key-b'].map((playerId) => transactBetaLobby(database.transact, { ...join(2), playerId })));
  assert.ok(results.every((result) => result.ok));
  assert.equal(results.filter((result) => result.existing).length, 1);
  assert.equal(countPlayers(database.getRoot().players[gameID]), 8);
});

test('a fresh phone waits for the complete active snapshot before transacting and releases it afterwards', async () => {
  const database = memoryTransactions(rootWithSeven());
  let ready;
  let listening = false;
  let transactions = 0;
  const request = runBetaLobbyTransaction({
    subscribe: (onReady) => { ready = onReady; listening = true; return () => { listening = false; }; },
    transact: (update) => { assert.equal(listening, true); transactions += 1; return database.transact(update); },
  }, join(2));
  await Promise.resolve();
  assert.equal(transactions, 0);
  ready();
  assert.equal((await request).ok, true);
  assert.equal(transactions, 1);
  assert.equal(listening, false);
  assert.equal(database.getRoot().players[gameID].playerCounter, 8);
});

test('snapshot permission errors and transaction errors release their subscription', async () => {
  for (const stage of ['subscribe', 'transact']) {
    let listening = false;
    await assert.rejects(runBetaLobbyTransaction({
      subscribe: (ready, fail) => {
        listening = true;
        if (stage === 'subscribe') fail(new Error('permission denied'));
        else ready();
        return () => { listening = false; };
      },
      transact: async () => { throw new Error('transaction failed'); },
    }, join(2)), stage === 'subscribe' ? /permission denied/ : /transaction failed/);
    assert.equal(listening, false);
  }
});

test('start and roster removal conflict atomically in both orders', async () => {
  const removal = action('roster', { mutate: ({ players }) => { delete players.team2.g3; return { players }; } });
  for (const actions of [[action('start'), removal], [removal, action('start')]]) {
    const database = memoryTransactions(rootWithNine());
    const results = await Promise.all(actions.map((value) => transactBetaLobby(database.transact, value)));
    assert.equal(results.filter((result) => result.ok).length, 1);
    const root = database.getRoot();
    assert.ok(root.games[gameID].status === 'lobby' || getLobbyReadiness(root.games[gameID], root.players[gameID]).isReady);
    if (root.games[gameID].status === 'characterSelection') assert.equal(countPlayers(root.players[gameID]), 9);
  }
});

test('repeated starts cannot reset a game or duplicate initialization', async () => {
  const database = memoryTransactions(rootWithNine());
  const results = await Promise.all([1, 2].map(() => transactBetaLobby(database.transact, action('start'))));
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => result.code === 'closed').length, 1);
});

test('normal rooms retain their existing capacity and least-populated team behavior', () => {
  const game = { nrOfPlayers: '9-12' };
  const players = { team1: { a: { name: 'A', isLeader: true, deviceID: 'a' } }, team2: { b: { name: 'B', isLeader: true, deviceID: 'b' } }, team3: { c: { name: 'C', isLeader: true, deviceID: 'c' } } };
  assert.equal(getLobbyReadiness(game, players).capacity, 12);
  assert.equal(getLobbyReadiness(game, players).isReady, true);
  assert.equal(chooseTeamForJoin(game, players), 'team1');
  assert.equal(chooseTeamForLocalPlayer(game, players), 'team1');
});

test('one local draft round-trips route, content and seven names; corrupt saves do not overwrite storage', async () => {
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key), setItem: async (key, value) => values.set(key, value) };
  const draft = await loadBetaDraft(storage);
  draft.hostName = 'Host'; draft.guestNames = options().guestNames;
  await saveBetaDraft(storage, draft);
  assert.equal(values.size, 1);
  assert.deepEqual(await loadBetaDraft(storage), draft);
  const saved = values.get(BETA_DRAFT_KEY);
  draft.scenario.betaScenario.stops.ireland.contentByTeam.team1.word = 'invalid';
  await assert.rejects(saveBetaDraft(storage, draft));
  assert.equal(values.get(BETA_DRAFT_KEY), saved);
  values.set(BETA_DRAFT_KEY, '{bad json');
  await assert.rejects(loadBetaDraft(storage));
  assert.equal(values.get(BETA_DRAFT_KEY), '{bad json');
});

test('editor rejects illegal route changes and preserves valid selections when adding/removing countries', () => {
  const preset = createBetaPreset();
  const original = clone(preset);
  const ids = preset.routeStops.map((stop) => stop.id);
  for (const remove of ['belgium', 'italy', 'greece']) assert.throws(() => editBetaRoute(preset, ids.filter((id) => id !== remove)));
  assert.throws(() => editBetaRoute(preset, [...ids.slice(0, -1), 'belgium', 'greece']));
  assert.throws(() => editBetaRoute(preset, ['france', ...ids.slice(1)]));
  const removed = editBetaRoute(preset, ids.filter((id) => id !== 'switzerland'));
  assert.equal(removed.routeStops.length, 17);
  const restored = editBetaRoute(removed, ids);
  assert.equal(restored.routeStops.length, 18);
  assert.deepEqual(restored.betaScenario.stops.ireland, original.betaScenario.stops.ireland);
  assert.ok(restored.betaScenario.stops.switzerland.challenge);
  assert.deepEqual(preset, original);
});

test('editor changes challenge and exact team content without changing other teams', () => {
  let scenario = editBetaChallenge(createBetaPreset(), 'belgium', 'guess-country-word');
  const before = clone(scenario);
  const stop = DEFAULT_COUNTRY_STOPS.find((item) => item.id === 'belgium');
  const words = stop.challenges.find((item) => item.id === 'guess-country-word').words;
  scenario = editBetaTeamContent(scenario, 'belgium', 'team1', words[5]);
  assert.equal(scenario.betaScenario.stops.belgium.contentByTeam.team1.word, words[5]);
  assert.deepEqual(scenario.betaScenario.stops.belgium.contentByTeam.team2, before.betaScenario.stops.belgium.contentByTeam.team2);
  assert.deepEqual(editBetaChallenge(scenario, 'belgium', 'guess-country-word'), scenario);
  assert.deepEqual(editBetaTeamContent(scenario, 'belgium', 'team1', words[5]), scenario);
  assert.throws(() => editBetaTeamContent(scenario, 'belgium', 'team2', words[5]));
  assert.throws(() => editBetaChallenge(scenario, 'greece', 'guess-country-word'));
});


test('beta text authoring survives storage and room creation without changing the source preset', async () => {
  const source = createBetaPreset();
  const before = clone(source);
  let scenario = saveBetaTextChallenge(source, 'belgium', { title: ' Toast ', prompt: ' Say hello. ', penaltySips: 0 });
  const id = scenario.betaScenario.stops.belgium.challenge.id;
  scenario = saveBetaTextChallenge(scenario, 'belgium', { id, title: 'New title', prompt: 'New text', penaltySips: 4 });
  assert.deepEqual(source, before);
  assert.equal(scenario.routeStops.find((stop) => stop.id === 'belgium').challenges.filter((item) => item.id === id).length, 1);
  assert.equal(scenario.betaScenario.stops.belgium.challenge.prompt, 'New text');
  assert.deepEqual(scenario.betaScenario.stops.belgium.contentByTeam.team3, { type: 'ordinary' });
  let saved;
  const storage = { setItem: async (_, value) => { saved = value; }, getItem: async () => saved };
  await saveBetaDraft(storage, { ...createBetaDraft(), scenario });
  const loaded = await loadBetaDraft(storage);
  const room = createBetaRoomRecords({ ...options(), scenario: loaded.scenario });
  assert.equal(room.gameData.betaScenario.stops.belgium.challenge.penaltySips, 4);
  assert.equal(room.gameData.betaScenario.stops.belgium.challenge.id, id);
  assert.throws(() => saveBetaTextChallenge(source, 'greece', { title: 'a', prompt: 'b' }));
  assert.throws(() => saveBetaTextChallenge(source, 'belgium', { title: ' ', prompt: 'b' }));
  assert.throws(() => saveBetaTextChallenge(source, 'ireland', { id: 'guess-country-word', title: 'a', prompt: 'b' }));
});

test('drink counts apply to every selected challenge type and survive switching cards', () => {
  const source = createBetaPreset();
  for (const [stopId, plan] of Object.entries(source.betaScenario.stops)) {
    const changed = editBetaChallengeDrinks(source, stopId, 0);
    assert.equal(changed.betaScenario.stops[stopId].challenge.penaltySips, 0);
    assert.deepEqual(changed.betaScenario.stops[stopId].contentByTeam, plan.contentByTeam);
    const stop = changed.routeStops.find((item) => item.id === stopId);
    const other = stop.challenges.find((item) => item.id !== plan.challenge.id && item.minPlayers <= 3 && !item.type);
    const switched = editBetaChallenge(editBetaChallenge(changed, stopId, other.id), stopId, plan.challenge.id);
    assert.equal(switched.betaScenario.stops[stopId].challenge.penaltySips, 0);
  }
  for (const count of [-1, 10, 1.5, NaN, '2']) assert.throws(() => editBetaChallengeDrinks(source, 'belgium', count));
});
