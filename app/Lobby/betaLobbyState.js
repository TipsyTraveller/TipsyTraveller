import { createBetaSnapshot } from '../GameScreen/constants/betaScenario.js';
import {
  ALL_TEAM_KEYS, chooseTeamForJoin, findPlayerByDevice, getBetaRosterIssues,
  getLobbyReadiness, getTeamEntries, withPlayerCounter,
} from './lobbyState.js';

const failure = (code, message) => ({ outcome: { ok: false, code, message } });

export const createBetaRoomRecords = ({ scenario, hostName, guestNames, deviceID, playerIds, roomRules, badge, profileId, createdAt }) => {
  const snapshot = createBetaSnapshot(scenario);
  if (typeof hostName !== 'string' || !hostName.trim() || typeof deviceID !== 'string' || !deviceID.trim()) {
    throw new Error('Enter the host name and use a valid device identity.');
  }
  if (!Array.isArray(playerIds) || playerIds.length !== 7 || new Set(playerIds).size !== 7
    || playerIds.some((id) => typeof id !== 'string' || !id || /[.#$\[\]/]/.test(id))) {
    throw new Error('Seven unique player IDs are required.');
  }
  if (ALL_TEAM_KEYS.some((key) => !Array.isArray(guestNames?.[key]) || guestNames[key].length !== 2
    || guestNames[key].some((name) => typeof name !== 'string' || !name.trim()))) {
    throw new Error('Enter two players without a phone for each team.');
  }
  const gameData = {
    ...snapshot, difficulty: 'easy', duration: 'long', nrOfPlayers: '9-12',
    HostName: hostName.trim(), hostDeviceID: deviceID, createdAt, status: 'lobby',
    ...(roomRules ? { roomRules } : {}),
  };
  let index = 1;
  const players = Object.fromEntries(ALL_TEAM_KEYS.map((key) => [key, Object.fromEntries(
    guestNames[key].map((name) => [playerIds[index++], { name: name.trim(), isLeader: false }])
  )]));
  players.team1[playerIds[0]] = {
    name: hostName.trim(), deviceID, isLeader: true,
    ...(badge ? { badge } : {}), ...(profileId ? { profileId } : {}),
  };
  const teamMembers = withPlayerCounter(players);
  const issues = getBetaRosterIssues(gameData, teamMembers);
  if (issues.length) throw new Error(issues[0]);
  return { gameData, teamMembers };
};

// The same callback checks both database paths on EVERY Firebase retry.
// It never generates IDs, timestamps or random values inside the transaction.
export const reduceBetaLobby = (root, { gameID, kind, deviceID, playerId, name, badge, profileId, now, mutate, initializeGameplay }) => {
  const game = root?.games?.[gameID];
  const players = root?.players?.[gameID];
  if (!game?.betaScenario || !players) return failure('unavailable', 'This beta room is unavailable.');
  if (game.disconnectedAt && now - game.disconnectedAt > 10 * 60 * 1000) return failure('expired', 'This room expired after the host disconnected.');
  const existingIssues = getBetaRosterIssues(game, players);
  if (existingIssues.length) return failure('invalid_roster', existingIssues[0]);
  let nextGame = game;
  let nextPlayers = players;
  let outcome = { ok: true };
  if (kind === 'join') {
    if (!['lobby', 'characterSelection', 'game'].includes(game.status)) return failure('closed', 'This room is not accepting joins.');
    const existing = findPlayerByDevice(players, deviceID);
    if (existing) return { root, outcome: { ok: true, existing: true, teamKey: existing.teamKey, playerId: existing.playerId } };
    if (game.status !== 'lobby') return failure('started', 'This game has already started.');
    if (typeof deviceID !== 'string' || !deviceID.trim() || deviceID.startsWith('dev-bot-')) return failure('invalid_device', 'Join from a real team leader phone.');
    if (typeof name !== 'string' || !name.trim()) return failure('name_required', 'Enter a username to join.');
    if (!playerId || ALL_TEAM_KEYS.some((key) => Object.hasOwn(players[key] || {}, playerId))) return failure('invalid_player', 'The player identity is already in use.');
    const teamKey = chooseTeamForJoin(game, players);
    if (!teamKey) return failure('full', 'All three leader phones have joined. The beta is full.');
    nextPlayers = withPlayerCounter({ ...players, [teamKey]: {
      ...Object.fromEntries(getTeamEntries(players, teamKey)),
      [playerId]: { name: name.trim(), deviceID, isLeader: true, ...(badge ? { badge } : {}), ...(profileId ? { profileId } : {}) },
    } });
    outcome = { ok: true, existing: false, teamKey, playerId };
  } else {
    if (!deviceID || game.hostDeviceID !== deviceID) return failure('forbidden', 'Only the host can manage this room.');
    if (kind === 'roster') {
      if (game.status !== 'lobby') return failure('closed', 'The room is no longer accepting lobby changes.');
      // Give existing UI callbacks detached data so a rejected callback cannot mutate Firebase's input.
      const result = mutate({ game: JSON.parse(JSON.stringify(game)), players: JSON.parse(JSON.stringify(players)) });
      if (!result?.players) return failure(result?.error?.code || 'invalid_roster', result?.error?.message || 'Invalid roster change.');
      nextPlayers = withPlayerCounter(result.players);
      const phoneIds = (roster) => ALL_TEAM_KEYS.flatMap((key) => getTeamEntries(roster, key)
        .filter(([, player]) => player?.deviceID).map(([, player]) => player.deviceID)).sort();
      if (JSON.stringify(phoneIds(players)) !== JSON.stringify(phoneIds(nextPlayers))) return failure('real_joins_only', 'Leader phones must join using the room PIN.');
    } else if (kind === 'start' || kind === 'beginGame') {
      const expectedStatus = kind === 'start' ? 'lobby' : 'characterSelection';
      if (game.status !== expectedStatus) return failure('closed', 'The room has already moved on.');
      const readiness = getLobbyReadiness(game, players, { requireVehicles: kind === 'beginGame' });
      if (!readiness.isReady) return failure('not_ready', readiness.reason);
      // Validate without replacing the saved route or content.
      try { createBetaSnapshot(game, { difficulty: game.difficulty }); }
      catch { return failure('invalid_scenario', 'The saved beta scenario is invalid.'); }
      nextGame = kind === 'start'
        ? { ...game, status: 'characterSelection', teamModels: null }
        : { ...game, status: 'game', gameplay: initializeGameplay(game, players) };
    } else return failure('invalid_action', 'Unknown beta lobby action.');
  }
  const issues = getBetaRosterIssues(nextGame, nextPlayers);
  if (issues.length) return failure('invalid_roster', issues[0]);
  return {
    root: { ...root, games: { ...root.games, [gameID]: nextGame }, players: { ...root.players, [gameID]: nextPlayers } },
    outcome,
  };
};

export const transactBetaLobby = async (transact, action) => {
  let outcome = { ok: false, code: 'unavailable', message: 'The room changed. Try again.' };
  const result = await transact((root) => {
    const reduced = reduceBetaLobby(root, action);
    outcome = reduced.outcome;
    return reduced.root;
  });
  return result.committed ? outcome : { ...outcome, ok: false };
};

export const runBetaLobbyTransaction = async ({ subscribe, transact }, action) => {
  // RTDB caches only active queries. A get() followed by a root transaction can
  // start with null/partial local data and abort before contacting the server.
  // Hold a complete root subscription through the commit and all retries.
  let unsubscribe;
  try {
    await new Promise((resolve, reject) => { unsubscribe = subscribe(resolve, reject); });
    return await transactBetaLobby(transact, action);
  } finally {
    unsubscribe?.();
  }
};
