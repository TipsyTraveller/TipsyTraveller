import {
  get, onDisconnect, push, ref, runTransaction, serverTimestamp, set, update,
} from 'firebase/database';
import { db } from '../../firebaseConfig';
import {
  chooseTeamForJoin,
  countPlayers,
  findPlayerByDevice,
  getLobbyReadiness,
  getTeamEntries,
  PLAYER_CAPACITY,
  withPlayerCounter,
} from './lobbyState';

const transactionError = (code, message) => ({ code, message });

export const restoreHostConnection = async ({ gameID, gameData, deviceID }) => {
  if (!gameID || !deviceID || gameData?.hostDeviceID !== deviceID) return false;
  const disconnectedAtRef = ref(db, `games/${gameID}/disconnectedAt`);
  await onDisconnect(disconnectedAtRef).set(serverTimestamp());
  await set(disconnectedAtRef, null);
  return true;
};

export const reserveRoomCode = async ({ createGame, createPlayers, maxAttempts = 50 }) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const gameID = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const reservationToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const gameRef = ref(db, `games/${gameID}`);
    const reservation = await runTransaction(gameRef, (currentGame) => (
      currentGame === null
        ? { status: 'reserving', reservationToken, createdAt: Date.now() }
        : undefined
    ));
    if (!reservation.committed) continue;

    try {
      await update(ref(db), {
        [`games/${gameID}`]: createGame(),
        [`players/${gameID}`]: createPlayers(),
      });
      return gameID;
    } catch (error) {
      await runTransaction(gameRef, (currentGame) => (
        currentGame?.reservationToken === reservationToken ? null : undefined
      )).catch(() => {});
      throw error;
    }
  }

  throw new Error('Could not reserve an available room code.');
};

export const joinRoomTransaction = async ({ gameID, deviceID, name, badge = null, profileId = null }) => {
  const playerId = push(ref(db, `players/${gameID}/team1`)).key;
  let outcome = transactionError('unavailable', 'This room is unavailable.');
  const gameSnapshot = await get(ref(db, `games/${gameID}`));
  if (!gameSnapshot.exists()) {
    return transactionError('not_found', 'Enter a valid game ID.');
  }

  const game = gameSnapshot.val();
  if (game.disconnectedAt && Date.now() - game.disconnectedAt > 10 * 60 * 1000) {
    return transactionError('expired', 'This game expired after the host disconnected.');
  }
  if (game.status !== 'lobby') {
    const playersSnapshot = await get(ref(db, `players/${gameID}`));
    const existingPlayer = findPlayerByDevice(playersSnapshot.val() || {}, deviceID);
    if (existingPlayer && ['characterSelection', 'game'].includes(game.status)) {
      return {
        ok: true,
        existing: true,
        teamKey: existingPlayer.teamKey,
        playerId: existingPlayer.playerId,
      };
    }
    return transactionError('started', 'This game has already started.');
  }
  const transaction = await runTransaction(ref(db, `players/${gameID}`), (currentPlayers) => {
    const players = currentPlayers || {};
    const existingPlayer = findPlayerByDevice(players, deviceID);
    if (existingPlayer) {
      outcome = { ok: true, existing: true, teamKey: existingPlayer.teamKey };
      return players;
    }
    if (!name?.trim()) {
      outcome = transactionError('name_required', 'Enter a username to join this room.');
      return undefined;
    }
    const capacity = PLAYER_CAPACITY[game.nrOfPlayers];
    if (!capacity || countPlayers(players) >= capacity) {
      outcome = transactionError('full', 'This game is full.');
      return undefined;
    }

    const teamKey = chooseTeamForJoin(game, players);
    if (!teamKey) {
      outcome = transactionError('invalid_room', 'This room has invalid team settings.');
      return undefined;
    }

    const team = Object.fromEntries(getTeamEntries(players, teamKey));
    const isLeader = !Object.values(team).some((player) => player?.isLeader && player?.deviceID);
    const nextPlayers = withPlayerCounter({
      ...players,
      [teamKey]: {
        ...team,
        [playerId]: {
          name,
          isLeader,
          deviceID,
          ...(badge ? { badge } : {}),
          ...(profileId ? { profileId } : {}),
        },
      },
    });
    outcome = { ok: true, existing: false, teamKey, playerId };

    return nextPlayers;
  });

  return transaction.committed && outcome.ok
    ? outcome
    : { ...outcome, ok: false };
};

export const mutateLobbyRoster = async ({ gameID, hostDeviceID, mutate }) => {
  let outcome = transactionError('unavailable', 'The lobby changed before the action completed.');
  const gameSnapshot = await get(ref(db, `games/${gameID}`));
  const game = gameSnapshot.val();
  if (!game || game.status !== 'lobby') {
    return { ...transactionError('closed', 'The room is no longer accepting lobby changes.'), ok: false };
  }
  if (!hostDeviceID || game.hostDeviceID !== hostDeviceID) {
    return { ...transactionError('forbidden', 'Only the host can manage the roster.'), ok: false };
  }

  const transaction = await runTransaction(ref(db, `players/${gameID}`), (currentPlayers) => {
    const players = currentPlayers || {};
    const result = mutate({ game, players });
    if (!result?.players) {
      outcome = result?.error || outcome;
      return undefined;
    }

    outcome = { ok: true };
    return withPlayerCounter(result.players);
  });

  return transaction.committed && outcome.ok ? outcome : { ...outcome, ok: false };
};

export const startCharacterSelection = async ({ gameID, hostDeviceID }) => {
  let outcome = transactionError('unavailable', 'The lobby changed before the game could start.');
  const playersSnapshot = await get(ref(db, `players/${gameID}`));
  const players = playersSnapshot.val() || {};

  const transaction = await runTransaction(ref(db, `games/${gameID}`), (game) => {
    if (!game || game.status !== 'lobby') {
      outcome = transactionError('closed', 'The room has already moved on from the lobby.');
      return undefined;
    }
    if (!hostDeviceID || game.hostDeviceID !== hostDeviceID) {
      outcome = transactionError('forbidden', 'Only the host can start the game.');
      return undefined;
    }

    const readiness = getLobbyReadiness(game, players);
    if (!readiness.isReady) {
      outcome = transactionError('not_ready', readiness.reason);
      return undefined;
    }

    outcome = { ok: true };
    return { ...game, status: 'characterSelection', teamModels: null };
  });

  return transaction.committed && outcome.ok ? outcome : { ...outcome, ok: false };
};
