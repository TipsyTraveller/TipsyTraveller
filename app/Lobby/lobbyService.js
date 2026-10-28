import { push, ref, runTransaction } from 'firebase/database';
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
      const finalized = await runTransaction(ref(db), (root) => {
        if (root?.games?.[gameID]?.reservationToken !== reservationToken) return undefined;
        return {
          ...root,
          games: { ...(root.games || {}), [gameID]: createGame() },
          players: { ...(root.players || {}), [gameID]: createPlayers() },
        };
      });
      if (!finalized.committed) throw new Error('Room reservation was lost before setup completed.');
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

  const transaction = await runTransaction(ref(db), (root) => {
    const game = root?.games?.[gameID];
    if (!game) {
      outcome = transactionError('not_found', 'Enter a valid game ID.');
      return undefined;
    }
    const players = root?.players?.[gameID] || {};
    const existingPlayer = findPlayerByDevice(players, deviceID);
    if (existingPlayer) {
      outcome = { ok: true, existing: true, teamKey: existingPlayer.teamKey };
      return root;
    }
    if (game.status !== 'lobby') {
      outcome = transactionError('started', 'This game has already started.');
      return undefined;
    }
    if (game.disconnectedAt && Date.now() - game.disconnectedAt > 10 * 60 * 1000) {
      outcome = transactionError('expired', 'This game expired after the host disconnected.');
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

    return {
      ...root,
      players: { ...(root.players || {}), [gameID]: nextPlayers },
    };
  });

  return transaction.committed && outcome.ok
    ? outcome
    : { ...outcome, ok: false };
};

export const mutateLobbyRoster = async ({ gameID, hostDeviceID, mutate }) => {
  let outcome = transactionError('unavailable', 'The lobby changed before the action completed.');
  const transaction = await runTransaction(ref(db), (root) => {
    const game = root?.games?.[gameID];
    if (!game || game.status !== 'lobby') {
      outcome = transactionError('closed', 'The room is no longer accepting lobby changes.');
      return undefined;
    }
    if (!hostDeviceID || game.hostDeviceID !== hostDeviceID) {
      outcome = transactionError('forbidden', 'Only the host can manage the roster.');
      return undefined;
    }

    const players = root?.players?.[gameID] || {};
    const result = mutate({ game, players });
    if (!result?.players) {
      outcome = result?.error || outcome;
      return undefined;
    }

    outcome = { ok: true };
    return {
      ...root,
      players: {
        ...(root.players || {}),
        [gameID]: withPlayerCounter(result.players),
      },
    };
  });

  return transaction.committed && outcome.ok ? outcome : { ...outcome, ok: false };
};

export const startCharacterSelection = async ({ gameID, hostDeviceID }) => {
  let outcome = transactionError('unavailable', 'The lobby changed before the game could start.');
  const transaction = await runTransaction(ref(db), (root) => {
    const game = root?.games?.[gameID];
    const players = root?.players?.[gameID] || {};
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
    return {
      ...root,
      games: {
        ...(root.games || {}),
        [gameID]: { ...game, status: 'characterSelection', teamModels: null },
      },
    };
  });

  return transaction.committed && outcome.ok ? outcome : { ...outcome, ok: false };
};
