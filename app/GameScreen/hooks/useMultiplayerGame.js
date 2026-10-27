import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  serverTimestamp,
  set,
} from 'firebase/database';
import { db } from '../../../firebaseConfig';
import {
  addDrinksByRule,
  addDrinksToPlayer,
  addDrinksToTeam,
  createPlayerDrinkLedger,
  normalizeTeamProgressDrinks,
} from '../drinkLedger';
import {
  buildRollAction,
  createInitialGameplay,
  GAMEPLAY_SCHEMA_VERSION,
  getFinishPosition,
  getNextActiveTeamId,
  getRequiredTeamIds,
  getTeamScore,
} from '../gameplayState';
import {
  COUNTRY_WORD_CHALLENGE_TYPE,
  didTriggerRoadsideDuel,
  GEO_GUESSR_CHALLENGE_TYPE,
  getChallengeForStop,
  getChallengeIdForStop,
  getChallengeRound,
  getGeoGuessrRound,
  getResolvedPenaltySips,
  getTeamPlayers,
  isBotOnlyTeam,
} from '../constants/challenges';
import {
  calculateBoardDistanceKm,
  evaluateGeoGuessrGuesses,
  generateFallbackPin,
} from '../constants/monumentPool';
import { getCachedMonumentPool } from '../services/countryStopsService';
import {
  createRoadblockEvent,
  createRoadblockDetourSegment,
  getRoadblockMovementTiming,
  shouldTriggerRoadblock,
} from '../constants/roadblocks';

const findLocalPlayer = (teamMembers, deviceID) => {
  if (!deviceID) return { localTeamId: null, isTeamLeader: false };

  for (const [teamId, members] of Object.entries(teamMembers || {})) {
    if (!teamId.startsWith('team') || !members || typeof members !== 'object') continue;

    const player = Object.values(members).find((member) => member?.deviceID === deviceID);
    if (player) {
      return { localTeamId: teamId, isTeamLeader: Boolean(player.isLeader) };
    }
  }

  return { localTeamId: null, isTeamLeader: false };
};

const getTeamLeaders = (teamMembers, presence = {}) => (
  Object.entries(teamMembers || {}).flatMap(([teamId, members]) => {
    if (!teamId.startsWith('team') || !members || typeof members !== 'object') return [];
    const leaderEntry = Object.entries(members).find(([, member]) => (
      member?.isLeader && member?.deviceID
    ));
    if (!leaderEntry) return [];
    const [playerId, leader] = leaderEntry;
    return [{
      playerId,
      teamId,
      name: leader.name || 'Team leader',
      deviceID: leader.deviceID,
      connected: presence?.[leader.deviceID]?.connected === true,
    }];
  })
);

const getConnectedPlayers = (teamMembers, presence = {}) => (
  Object.entries(teamMembers || {}).flatMap(([teamId, members]) => {
    if (!teamId.startsWith('team') || !members || typeof members !== 'object') return [];
    return Object.entries(members).flatMap(([playerId, player]) => (
      player?.deviceID && presence?.[player.deviceID]?.connected === true
        ? [{
            playerId,
            teamId,
            name: player.name || 'Player',
            deviceID: player.deviceID,
            isLeader: Boolean(player.isLeader),
          }]
        : []
    ));
  })
);

const ROOM_EXPIRY_MS = 10 * 60 * 1000;

export default function useMultiplayerGame({ enabled, gameData, gameID, routeModel, teamMembers }) {
  const [gameplay, setGameplay] = useState(gameData?.gameplay || null);
  const [liveTeamMembers, setLiveTeamMembers] = useState(teamMembers || {});
  const [deviceID, setDeviceID] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [isConnected, setIsConnected] = useState(!enabled);
  const [isLoading, setIsLoading] = useState(enabled);
  const [presence, setPresence] = useState({});
  const [presenceLoaded, setPresenceLoaded] = useState(!enabled);
  const [roomMeta, setRoomMeta] = useState(() => ({
    disconnectedAt: gameData?.disconnectedAt || null,
    hostDeviceID: gameData?.hostDeviceID || null,
    status: gameData?.status || null,
  }));
  const [expiryClock, setExpiryClock] = useState(Date.now());
  const presenceRegistrationRef = useRef(null);
  const gameDataRef = useRef(gameData);
  gameDataRef.current = gameData;
  const teamMembersRef = useRef(liveTeamMembers);
  teamMembersRef.current = liveTeamMembers;
  const now = useCallback(() => Date.now() + serverOffset, [serverOffset]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('deviceID').then((value) => {
      if (active) setDeviceID(value);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const gameplayRef = ref(db, `games/${gameID}/gameplay`);
    const playersRef = ref(db, `players/${gameID}`);
    const connectedRef = ref(db, '.info/connected');
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const presenceRef = ref(db, `games/${gameID}/presence`);
    const hostRef = ref(db, `games/${gameID}/hostDeviceID`);
    const disconnectedAtRef = ref(db, `games/${gameID}/disconnectedAt`);
    const statusRef = ref(db, `games/${gameID}/status`);
    const unsubscribeGameplay = onValue(gameplayRef, (snapshot) => {
      setGameplay(snapshot.exists() ? snapshot.val() : null);
      setIsLoading(false);
    });
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      setLiveTeamMembers(snapshot.exists() ? snapshot.val() : {});
    });
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      setIsConnected(connected);
      if (!connected) setIsLoading(true);
    });
    const unsubscribeOffset = onValue(offsetRef, (snapshot) => {
      setServerOffset(Number(snapshot.val()) || 0);
    });
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      setPresence(snapshot.exists() ? snapshot.val() : {});
      setPresenceLoaded(true);
    });
    const unsubscribeHost = onValue(hostRef, (snapshot) => {
      setRoomMeta((current) => ({ ...current, hostDeviceID: snapshot.val() || null }));
    });
    const unsubscribeDisconnectedAt = onValue(disconnectedAtRef, (snapshot) => {
      setRoomMeta((current) => ({ ...current, disconnectedAt: snapshot.val() || null }));
    });
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      setRoomMeta((current) => ({ ...current, status: snapshot.val() || null }));
    });

    return () => {
      unsubscribeGameplay();
      unsubscribePlayers();
      unsubscribeConnected();
      unsubscribeOffset();
      unsubscribePresence();
      unsubscribeHost();
      unsubscribeDisconnectedAt();
      unsubscribeStatus();
    };
  }, [enabled, gameID]);

  useEffect(() => {
    if (!enabled) setLiveTeamMembers(teamMembers || {});
  }, [enabled, teamMembers]);

  useEffect(() => {
    if (!enabled || !gameID || !gameplay?.teamProgress || !Object.keys(liveTeamMembers).length) {
      return;
    }

    runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      if (!current?.teamProgress) return undefined;
      const normalized = normalizeTeamProgressDrinks(current.teamProgress, liveTeamMembers);
      if (
        JSON.stringify(normalized) === JSON.stringify(current.teamProgress)
        && Number(current.schemaVersion) >= GAMEPLAY_SCHEMA_VERSION
      ) return undefined;

      return {
        ...current,
        schemaVersion: Math.max(Number(current.schemaVersion) || 0, GAMEPLAY_SCHEMA_VERSION),
        revision: (current.revision || 0) + 1,
        teamProgress: normalized,
        updatedAt: now(),
      };
    }).catch((error) => {
      console.log('Unable to initialize player drink ledgers', error);
    });
  }, [enabled, gameID, gameplay?.teamProgress, liveTeamMembers, now]);

  const identity = useMemo(
    () => findLocalPlayer(liveTeamMembers, deviceID),
    [deviceID, liveTeamMembers]
  );
  const leaders = useMemo(
    () => getTeamLeaders(liveTeamMembers, presence),
    [liveTeamMembers, presence]
  );
  const connectedPlayers = useMemo(
    () => getConnectedPlayers(liveTeamMembers, presence),
    [liveTeamMembers, presence]
  );
  const isHost = Boolean(deviceID && roomMeta.hostDeviceID === deviceID);
  const isRoomExpired = Boolean(
    roomMeta.disconnectedAt
    && expiryClock + serverOffset - Number(roomMeta.disconnectedAt) >= ROOM_EXPIRY_MS
  );
  const activeLeader = leaders.find((leader) => leader.teamId === gameplay?.activeTeamId) || null;
  const isActiveLeaderConnected = !activeLeader || activeLeader.connected;
  const canClaimHost = Boolean(
    isConnected
    && !isRoomExpired
    && !isHost
    && identity.isTeamLeader
    && roomMeta.disconnectedAt
  );
  const canControlTurn = Boolean(
    isConnected
    && !isRoomExpired
    && identity.isTeamLeader
    && identity.localTeamId
    && identity.localTeamId === gameplay?.activeTeamId
  );

  useEffect(() => {
    if (!enabled) return undefined;
    const interval = setInterval(() => setExpiryClock(Date.now()), 15000);
    return () => clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !gameID || !deviceID || !identity.localTeamId) return undefined;

    const presenceRef = ref(db, `games/${gameID}/presence/${deviceID}`);
    const disconnectedValue = {
      connected: false,
      isLeader: identity.isTeamLeader,
      lastSeenAt: serverTimestamp(),
      teamId: identity.localTeamId,
    };
    const connectedValue = {
      connected: true,
      isLeader: identity.isTeamLeader,
      lastSeenAt: serverTimestamp(),
      teamId: identity.localTeamId,
    };
    const disconnectRegistration = onDisconnect(presenceRef);
    presenceRegistrationRef.current = { disconnectRegistration, presenceRef, disconnectedValue };

    const markConnected = async () => {
      await disconnectRegistration.set(disconnectedValue);
      await set(presenceRef, connectedValue);
    };
    const markDisconnected = () => set(presenceRef, disconnectedValue);

    if (isConnected) {
      markConnected().catch((error) => console.log('Unable to register game presence', error));
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isConnected) {
        markConnected().catch((error) => console.log('Unable to restore game presence', error));
      } else if (nextState !== 'active') {
        markDisconnected().catch(() => {});
      }
    });

    return () => {
      appStateSubscription.remove();
      presenceRegistrationRef.current = null;
      disconnectRegistration.cancel().catch(() => {});
      markDisconnected().catch(() => {});
    };
  }, [deviceID, enabled, gameID, identity.isTeamLeader, identity.localTeamId, isConnected]);

  useEffect(() => {
    if (!enabled || !gameID || !deviceID || !isHost) return undefined;

    const disconnectedAtRef = ref(db, `games/${gameID}/disconnectedAt`);
    const disconnectRegistration = onDisconnect(disconnectedAtRef);
    const clearIfRecoverable = () => runTransaction(disconnectedAtRef, (current) => {
      if (current && now() - Number(current) >= ROOM_EXPIRY_MS) return undefined;
      return null;
    });
    if (isConnected) {
      disconnectRegistration.set(serverTimestamp())
        .then(clearIfRecoverable)
        .catch((error) => console.log('Unable to register host recovery marker', error));
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        clearIfRecoverable().catch(() => {});
      } else {
        set(disconnectedAtRef, serverTimestamp()).catch(() => {});
      }
    });

    return () => {
      appStateSubscription.remove();
      disconnectRegistration.cancel().catch(() => {});
    };
  }, [deviceID, enabled, gameID, isConnected, isHost, now]);

  const leaveGame = useCallback(async () => {
    const registration = presenceRegistrationRef.current;
    if (registration) {
      await registration.disconnectRegistration.cancel().catch(() => {});
      await set(registration.presenceRef, registration.disconnectedValue);
    }
    if (isHost) {
      await set(ref(db, `games/${gameID}/disconnectedAt`), serverTimestamp());
    }
    return true;
  }, [gameID, isHost]);

  const transferHost = useCallback(async (nextHostDeviceID) => {
    const isClaimingDisconnectedHost = canClaimHost && nextHostDeviceID === deviceID;
    if (
      !enabled || !gameID || !deviceID || (!isHost && !isClaimingDisconnectedHost) || !isConnected
      || isRoomExpired || !nextHostDeviceID
    ) return false;

    const result = await runTransaction(ref(db), (root) => {
      const game = root?.games?.[gameID];
      const players = root?.players?.[gameID];
      if (!game || !players) return undefined;

      const callerIsCurrentHost = game.hostDeviceID === deviceID;
      const currentHostIsDisconnected = Boolean(
        game.disconnectedAt
        && game.presence?.[game.hostDeviceID]?.connected !== true
      );
      if (
        !callerIsCurrentHost
        && !(currentHostIsDisconnected && nextHostDeviceID === deviceID)
      ) return undefined;

      const nextHostIsConnectedLeader = getTeamLeaders(
        players,
        game.presence || {}
      ).some((leader) => (
        leader.deviceID === nextHostDeviceID && leader.connected
      ));
      if (!nextHostIsConnectedLeader) return undefined;

      return {
        ...root,
        games: {
          ...(root.games || {}),
          [gameID]: {
            ...game,
            hostDeviceID: nextHostDeviceID,
            disconnectedAt: null,
            hostTransferredAt: Date.now(),
          },
        },
      };
    });

    return result.committed;
  }, [canClaimHost, deviceID, enabled, gameID, isConnected, isHost, isRoomExpired]);

  const replaceTeamLeader = useCallback(async ({ teamId, playerId }) => {
    if (
      !enabled || !gameID || !deviceID || !isHost || !isConnected
      || isRoomExpired || !teamId || !playerId
    ) return false;

    const result = await runTransaction(ref(db), (root) => {
      const game = root?.games?.[gameID];
      const players = root?.players?.[gameID];
      const team = players?.[teamId];
      const candidate = team?.[playerId];
      if (
        !game
        || game.hostDeviceID !== deviceID
        || !candidate?.deviceID
        || game.presence?.[candidate.deviceID]?.connected !== true
      ) return undefined;

      const nextTeam = Object.fromEntries(Object.entries(team).map(([id, player]) => [
        id,
        { ...player, isLeader: id === playerId },
      ]));
      return {
        ...root,
        players: {
          ...(root.players || {}),
          [gameID]: { ...players, [teamId]: nextTeam },
        },
      };
    });

    return result.committed;
  }, [deviceID, enabled, gameID, isConnected, isHost, isRoomExpired]);
  const submitRoll = useCallback(async (value, inputMethod = 'shortcut') => {
    if (!enabled || !gameID || !canControlTurn || !deviceID) return false;

    const gameplayRef = ref(db, `games/${gameID}/gameplay`);
    const expectedSessionId = gameplay?.sessionId;
    const expectedRevision = gameplay?.revision;
    const action = buildRollAction({
      deviceID,
      gameplay,
      inputMethod,
      now: now(),
      routeModel,
      value,
    });
    const result = await runTransaction(gameplayRef, (current) => {
      if (
        !current
        || current.sessionId !== expectedSessionId
        || current.revision !== expectedRevision
        || current.phase !== 'waiting'
        || current.activeTeamId !== identity.localTeamId
        || current.teamProgress?.[current.activeTeamId]?.isDone
      ) {
        return undefined;
      }

      const activeDetour = current.teamProgress?.[current.activeTeamId]?.detour;
      if (activeDetour) {
        const startStep = Number(activeDetour.step) || 0;
        const finalStep = (activeDetour.detourStops?.length || 0) + 1;
        const targetStep = Math.min(startStep + action.value, finalStep);
        const movementPath = createRoadblockDetourSegment({
          event: activeDetour,
          routeModel,
          step: startStep,
          targetStep,
        });
        if (!movementPath) return undefined;
        const timing = getRoadblockMovementTiming({
          movementPath,
          movementStartsAt: action.movementStartsAt,
          now: action.startedAt,
        });

        return {
          ...current,
          phase: 'moving',
          revision: (current.revision || 0) + 1,
          currentAction: {
            ...action,
            ...timing,
            fromLeg: activeDetour.fromLeg,
            targetLeg: activeDetour.targetLeg,
            movementPath,
            roadblockChoice: 'detour',
            detourStartStep: startStep,
            detourStep: targetStep,
            detourSegmentType: targetStep >= finalStep ? 'destination' : 'waypoint',
          },
          challengeStop: null,
          challengeStopData: null,
          challengeId: null,
          challengeRound: null,
          roadblock: {
            ...activeDetour,
            status: 'travelling',
            choice: 'detour',
            detourStep: targetStep,
          },
          updatedAt: action.startedAt,
        };
      }

      const roadblock = shouldTriggerRoadblock({ action, gameplay: current })
        ? createRoadblockEvent({ action, routeModel, turnNumber: current.turnNumber })
        : null;
      const nextAction = roadblock
        ? {
            ...action,
            targetLeg: roadblock.targetLeg,
            movementStartsAt: null,
            movementEndsAt: null,
          }
        : action;

      return {
        ...current,
        phase: roadblock ? 'roadblock' : 'moving',
        revision: (current.revision || 0) + 1,
        currentAction: nextAction,
        challengeStop: null,
        challengeStopData: null,
        challengeId: null,
        challengeRound: null,
        roadblock,
        roadblockHistory: roadblock
          ? [...(Array.isArray(current.roadblockHistory) ? current.roadblockHistory : []), {
              id: roadblock.id,
              teamId: roadblock.teamId,
              turnNumber: roadblock.turnNumber,
            }].slice(-8)
          : (current.roadblockHistory || []),
        updatedAt: action.startedAt,
      };
    });

    return result.committed;
  }, [canControlTurn, deviceID, enabled, gameID, gameplay, identity.localTeamId, now, routeModel]);

  const resolveRoadblock = useCallback(async (choice) => {
    const isTimeout = choice === 'timeout';
    if (
      !enabled
      || !gameID
      || !isConnected
      || isRoomExpired
      || (!canControlTurn && !isTimeout)
    ) return false;

    const resolvedAt = now();
    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      const roadblock = current?.roadblock;
      const action = current?.currentAction;
      if (
        !current
        || current.phase !== 'roadblock'
        || !roadblock
        || !action
        || (!isTimeout && current.activeTeamId !== identity.localTeamId)
      ) {
        return undefined;
      }

      if (choice === 'challenge' && roadblock.status === 'choice') {
        return {
          ...current,
          revision: (current.revision || 0) + 1,
          roadblock: {
            ...roadblock,
            status: 'challenge',
            challengeStartedAt: resolvedAt,
          },
          updatedAt: resolvedAt,
        };
      }

      if (isTimeout) {
        const durationMs = (Number(roadblock.challenge?.durationSeconds) || 15) * 1000;
        if (
          roadblock.status !== 'challenge'
          || resolvedAt < (Number(roadblock.challengeStartedAt) || 0) + durationMs
        ) {
          return undefined;
        }
      }

      const takesDetour = choice === 'detour' || isTimeout;
      const brokeThrough = choice === 'completed' && roadblock.status === 'challenge';
      if (!takesDetour && !brokeThrough) return undefined;

      const teamIds = getRequiredTeamIds(gameDataRef.current);
      const nextTeamId = getNextActiveTeamId(teamIds, current.teamProgress, action.teamId);
      const nextTeamProgress = takesDetour
        ? {
            ...current.teamProgress,
            [action.teamId]: {
              ...current.teamProgress?.[action.teamId],
              detour: {
                ...roadblock,
                choice: 'detour',
                status: 'pending',
                step: 0,
                detourStep: 0,
                resolvedAt,
              },
            },
          }
        : current.teamProgress;

      return {
        ...current,
        phase: nextTeamId ? 'waiting' : 'done',
        activeTeamId: nextTeamId || action.teamId,
        turnNumber: nextTeamId ? (current.turnNumber || 1) + 1 : current.turnNumber,
        revision: (current.revision || 0) + 1,
        teamProgress: nextTeamProgress,
        currentAction: null,
        challengeStop: null,
        challengeStopData: null,
        challengeId: null,
        challengeRound: null,
        roadblock: null,
        updatedAt: resolvedAt,
      };
    });

    return result.committed;
  }, [
    canControlTurn,
    enabled,
    gameID,
    identity.localTeamId,
    isConnected,
    isRoomExpired,
    now,
    routeModel,
  ]);

  useEffect(() => {
    const roadblock = gameplay?.roadblock;
    if (!enabled || gameplay?.phase !== 'roadblock' || roadblock?.status !== 'challenge') {
      return undefined;
    }

    const durationMs = (Number(roadblock.challenge?.durationSeconds) || 15) * 1000;
    const timeoutAt = (Number(roadblock.challengeStartedAt) || now()) + durationMs;
    const timeout = setTimeout(() => {
      resolveRoadblock('timeout').catch((error) => {
        console.log('Unable to finalize roadblock challenge timeout', error);
      });
    }, Math.max(0, timeoutAt - now()) + 120);

    return () => clearTimeout(timeout);
  }, [enabled, gameplay, now, resolveRoadblock]);

  const completeMovement = useCallback(async (actionId) => {
    if (!enabled || !gameID || !actionId || !isConnected || isRoomExpired) return false;

    const completedAt = now();
    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      const action = current?.currentAction;
      if (
        !current
        || current.phase !== 'moving'
        || action?.id !== actionId
        || completedAt + 250 < action.movementEndsAt
      ) {
        return undefined;
      }

      const teamIds = getRequiredTeamIds(gameDataRef.current);
      const isDetourMovement = action.roadblockChoice === 'detour'
        && current.roadblock?.choice === 'detour';

      if (isDetourMovement && action.detourSegmentType === 'waypoint') {
        // Schema 6 stored zero-based waypoint indexes. Schema 7 stores the
        // current detour node, where 0 is the branch and 1/2 are waypoints.
        const detourStep = action.detourStartStep === undefined
          ? (Number(action.detourStep) || 0) + 1
          : (Number(action.detourStep) || 0);
        const stop = current.roadblock.detourStops?.[detourStep - 1];
        if (!stop) return undefined;
        const challengeId = stop.challenges?.[0]?.id || null;
        const previousProgress = current.teamProgress?.[action.teamId] || {};
        const challenge = getChallengeForStop(0, [stop], challengeId);
        const roundData = getChallengeRound({
          challenge,
          difficulty: gameDataRef.current?.difficulty,
          players: getTeamPlayers(teamMembersRef.current, action.teamId),
          seed: action.id,
          targetCursor: previousProgress.targetCursor,
        });

        return {
          ...current,
          phase: 'challenge',
          revision: (current.revision || 0) + 1,
          teamProgress: {
            ...current.teamProgress,
            [action.teamId]: {
              ...previousProgress,
              detour: {
                ...(previousProgress.detour || current.roadblock),
                status: 'challenge',
                step: detourStep,
                detourStep,
              },
              targetCursor: roundData.nextTargetCursor,
            },
          },
          challengeStop: null,
          challengeStopData: stop,
          challengeId,
          challengeRound: roundData.round,
          roadblock: {
            ...current.roadblock,
            status: 'detourChallenge',
            detourStep,
          },
          updatedAt: completedAt,
        };
      }

      if (isDetourMovement) {
        const hasFinishedRoute = current.roadblock.targetLeg >= routeModel.finalStopIndex;
        const finishPosition = hasFinishedRoute ? getFinishPosition(current.teamProgress) : null;
        const previousProgress = current.teamProgress?.[action.teamId] || {};
        const challengePoints = Number(previousProgress.challengePoints) || 0;
        const { detour: _completedDetour, ...progressWithoutDetour } = previousProgress;
        const teamProgress = {
          ...current.teamProgress,
          [action.teamId]: {
            ...progressWithoutDetour,
            currentLeg: current.roadblock.targetLeg,
            isDone: hasFinishedRoute,
            challengePoints,
            score: getTeamScore({
              challengePoints,
              currentLeg: current.roadblock.targetLeg,
              finishPosition,
            }),
            finishPosition,
          },
        };
        const nextTeamId = getNextActiveTeamId(teamIds, teamProgress, action.teamId);

        return {
          ...current,
          phase: nextTeamId ? 'waiting' : 'done',
          activeTeamId: nextTeamId || action.teamId,
          turnNumber: nextTeamId ? (current.turnNumber || 1) + 1 : current.turnNumber,
          revision: (current.revision || 0) + 1,
          teamProgress,
          currentAction: null,
          challengeStop: null,
          challengeStopData: null,
          challengeId: null,
          challengeRound: null,
          roadblock: null,
          updatedAt: completedAt,
        };
      }

      const hasFinishedRoute = action.targetLeg >= routeModel.finalStopIndex;
      const finishPosition = hasFinishedRoute
        ? getFinishPosition(current.teamProgress)
        : null;
      const previousProgress = current.teamProgress?.[action.teamId] || {};
      const challengePoints = Number(previousProgress.challengePoints) || 0;
      let teamProgress = {
        ...current.teamProgress,
        [action.teamId]: {
          ...previousProgress,
          currentLeg: action.targetLeg,
          isDone: hasFinishedRoute,
          challengePoints,
          score: getTeamScore({ challengePoints, currentLeg: action.targetLeg, finishPosition }),
          finishPosition,
        },
      };

      if (action.roadblockChoice) {
        const nextTeamId = getNextActiveTeamId(teamIds, teamProgress, action.teamId);
        return {
          ...current,
          phase: nextTeamId ? 'waiting' : 'done',
          activeTeamId: nextTeamId || action.teamId,
          turnNumber: nextTeamId ? (current.turnNumber || 1) + 1 : current.turnNumber,
          revision: (current.revision || 0) + 1,
          teamProgress,
          currentAction: null,
          challengeStop: null,
          challengeStopData: null,
          challengeId: null,
          challengeRound: null,
          roadblock: null,
          updatedAt: completedAt,
        };
      }

      if (!hasFinishedRoute) {
        const stop = routeModel.countryStops[action.targetLeg];
        const players = getTeamPlayers(teamMembersRef.current, action.teamId);
        const isRoadsideDuel = didTriggerRoadsideDuel({
          fromLeg: action.fromLeg,
          targetLeg: action.targetLeg,
          teamId: action.teamId,
          teamProgress: current.teamProgress,
        });
        const challengeId = getChallengeIdForStop(stop, action.id, {
          teamPlayerCount: players.length,
          forceType: isRoadsideDuel ? GEO_GUESSR_CHALLENGE_TYPE : null,
        });
        const challenge = getChallengeForStop(action.targetLeg, routeModel.countryStops, challengeId);
        let challengeRound = null;
        let usedMonumentIds = Array.isArray(current.usedMonumentIds) ? current.usedMonumentIds : [];

        if (challenge.type === GEO_GUESSR_CHALLENGE_TYPE) {
          const geoData = getGeoGuessrRound({
            challenge,
            isRoadsideDuel,
            monumentPool: getCachedMonumentPool(),
            requiredTeamIds: teamIds,
            seed: action.id,
            startedAt: completedAt,
            stopCountryId: stop?.id || null,
            usedMonumentIds,
            difficulty: gameDataRef.current?.difficulty,
          });
          if (geoData) {
            challengeRound = geoData.round;
            usedMonumentIds = geoData.nextUsedMonumentIds;
          }
        } else {
          const roundData = getChallengeRound({
            challenge,
            difficulty: gameDataRef.current?.difficulty,
            players,
            seed: action.id,
            targetCursor: teamProgress[action.teamId]?.targetCursor,
          });
          challengeRound = roundData.round;
          teamProgress = {
            ...teamProgress,
            [action.teamId]: {
              ...teamProgress[action.teamId],
              targetCursor: roundData.nextTargetCursor,
            },
          };
        }

        return {
          ...current,
          phase: 'challenge',
          revision: (current.revision || 0) + 1,
          teamProgress,
          challengeStop: action.targetLeg,
          challengeStopData: null,
          challengeId,
          challengeRound,
          usedMonumentIds,
          roadblock: null,
          updatedAt: completedAt,
        };
      }

      const nextTeamId = getNextActiveTeamId(teamIds, teamProgress, action.teamId);
      return {
        ...current,
        phase: nextTeamId ? 'waiting' : 'done',
        activeTeamId: nextTeamId || action.teamId,
        turnNumber: nextTeamId ? (current.turnNumber || 1) + 1 : current.turnNumber,
        revision: (current.revision || 0) + 1,
        teamProgress,
        currentAction: null,
        challengeStop: null,
        challengeStopData: null,
        challengeId: null,
        challengeRound: null,
        roadblock: null,
        updatedAt: completedAt,
      };
    });

    return result.committed;
  }, [enabled, gameID, isConnected, isRoomExpired, now, routeModel]);

  const updateChallenge = useCallback(async (action) => {
    if (!enabled || !gameID || !isConnected || isRoomExpired) return false;

    const actionType = typeof action === 'object' && action !== null ? action.type : action;
    const isGeoPinSubmit = actionType === 'submitPin';
    const isAutomaticDeadlineAction = ['startPinning', 'timeoutPinning', 'timeout'].includes(actionType);

    // Any team leader can submit their own team's GeoGuessr pin; other stage transitions
    // require the active team's leader.
    if (isGeoPinSubmit) {
      if (!identity.isTeamLeader || !identity.localTeamId) return false;
    } else if (isAutomaticDeadlineAction) {
      if (!isConnected || isRoomExpired) return false;
    } else if (!canControlTurn) {
      return false;
    }

    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      const round = current?.challengeRound;
      if (!current || current.phase !== 'challenge' || !round) {
        return undefined;
      }

      const challenge = getChallengeForStop(
        current.challengeStopData ? 0 : current.challengeStop,
        current.challengeStopData ? [current.challengeStopData] : routeModel.countryStops,
        current.challengeId
      );
      const updatedAt = now();

      if (challenge.type === GEO_GUESSR_CHALLENGE_TYPE) {
        if (actionType === 'startPinning' && round.stage === 'photo') {
          const photoDeadline = Number(round.photoStartedAt)
            + (Number(round.photoDurationSeconds) || 0) * 1000;
          if (!photoDeadline || updatedAt < photoDeadline) return undefined;
          return {
            ...current,
            revision: (current.revision || 0) + 1,
            challengeRound: {
              ...round,
              stage: 'pinning',
              pinStartedAt: updatedAt,
            },
            updatedAt,
          };
        }

        const requiredTeamIds = Array.isArray(round.requiredTeamIds) && round.requiredTeamIds.length
          ? round.requiredTeamIds
          : getRequiredTeamIds(gameDataRef.current);

        if (actionType === 'submitPin' && round.stage === 'pinning') {
          const pinTeamId = action?.teamId || identity.localTeamId;
          if (!pinTeamId || pinTeamId !== identity.localTeamId) return undefined;
          const pos = action?.position;
          if (!pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y))) {
            return undefined;
          }

          const cleanPos = { x: Number(pos.x), y: Number(pos.y) };
          const nextGuesses = {
            ...(round.guesses || {}),
            [pinTeamId]: {
              x: cleanPos.x,
              y: cleanPos.y,
              distanceKm: calculateBoardDistanceKm(cleanPos, round.targetPosition),
              lockedAt: updatedAt,
            },
          };

          // Auto-generate pins for any bot-only teams so human teams don't wait on bots
          requiredTeamIds.forEach((teamId) => {
            if (!nextGuesses[teamId] && isBotOnlyTeam(teamMembersRef.current, teamId)) {
              const botPos = generateFallbackPin(
                round.targetPosition,
                teamId,
                `${current.sessionId}:${current.turnNumber}`
              );
              nextGuesses[teamId] = {
                x: botPos.x,
                y: botPos.y,
                distanceKm: calculateBoardDistanceKm(botPos, round.targetPosition),
                isAutoPin: true,
                lockedAt: updatedAt,
              };
            }
          });

          const allLocked = requiredTeamIds.every((teamId) => Boolean(nextGuesses[teamId]));
          if (!allLocked) {
            return {
              ...current,
              revision: (current.revision || 0) + 1,
              challengeRound: {
                ...round,
                guesses: nextGuesses,
              },
              updatedAt,
            };
          }

          const evaluation = evaluateGeoGuessrGuesses({
            guesses: nextGuesses,
            requiredTeamIds,
            targetPosition: round.targetPosition,
            seed: `${current.sessionId}:${current.turnNumber}`,
            autoFillMissing: true,
          });
          const pointsAwarded = Number(challenge.successPoints) || 15;
          const nextTeamProgress = { ...current.teamProgress };

          evaluation.winnerTeamIds.forEach((winnerId) => {
            const prev = nextTeamProgress[winnerId] || {};
            const nextChallengePoints = (Number(prev.challengePoints) || 0) + pointsAwarded;
            nextTeamProgress[winnerId] = {
              ...prev,
              challengePoints: nextChallengePoints,
              score: getTeamScore({
                challengePoints: nextChallengePoints,
                currentLeg: prev.currentLeg,
                finishPosition: prev.finishPosition,
              }),
            };
          });
          requiredTeamIds.forEach((teamId) => {
            if (!evaluation.winnerTeamIds.includes(teamId)) {
              const prev = nextTeamProgress[teamId] || {};
              const playerDrinks = createPlayerDrinkLedger(
                teamMembersRef.current,
                teamId,
                prev.playerDrinks,
                prev.drinks
              );
              nextTeamProgress[teamId] = {
                ...prev,
                playerDrinks: addDrinksToTeam(playerDrinks, getResolvedPenaltySips(
                  round.resolvedPenaltySips === undefined ? challenge : round,
                  gameDataRef.current?.difficulty
                )),
              };
              delete nextTeamProgress[teamId].drinks;
            }
          });

          return {
            ...current,
            revision: (current.revision || 0) + 1,
            teamProgress: nextTeamProgress,
            challengeRound: {
              ...round,
              stage: 'result',
              guesses: evaluation.guesses,
              winnerTeamIds: evaluation.winnerTeamIds,
              bestDistanceKm: evaluation.bestDistanceKm,
              pointsAwarded,
              drinkAwardId: `${current.sessionId}:${current.turnNumber}:geo-penalty`,
            },
            updatedAt,
          };
        }

        if ((actionType === 'timeoutPinning' || actionType === 'finalizePinning') && round.stage === 'pinning') {
          if (actionType === 'timeoutPinning') {
            const pinDeadline = Number(round.pinStartedAt)
              + (Number(round.pinDurationSeconds) || 0) * 1000;
            if (!pinDeadline || updatedAt < pinDeadline) return undefined;
          } else if (current.activeTeamId !== identity.localTeamId) {
            return undefined;
          }
          const evaluation = evaluateGeoGuessrGuesses({
            guesses: round.guesses || {},
            requiredTeamIds,
            targetPosition: round.targetPosition,
            seed: `${current.sessionId}:${current.turnNumber}`,
            autoFillMissing: true,
          });
          const pointsAwarded = Number(challenge.successPoints) || 15;
          const nextTeamProgress = { ...current.teamProgress };

          evaluation.winnerTeamIds.forEach((winnerId) => {
            const prev = nextTeamProgress[winnerId] || {};
            const nextChallengePoints = (Number(prev.challengePoints) || 0) + pointsAwarded;
            nextTeamProgress[winnerId] = {
              ...prev,
              challengePoints: nextChallengePoints,
              score: getTeamScore({
                challengePoints: nextChallengePoints,
                currentLeg: prev.currentLeg,
                finishPosition: prev.finishPosition,
              }),
            };
          });
          requiredTeamIds.forEach((teamId) => {
            if (!evaluation.winnerTeamIds.includes(teamId)) {
              const prev = nextTeamProgress[teamId] || {};
              const playerDrinks = createPlayerDrinkLedger(
                teamMembersRef.current,
                teamId,
                prev.playerDrinks,
                prev.drinks
              );
              nextTeamProgress[teamId] = {
                ...prev,
                playerDrinks: addDrinksToTeam(playerDrinks, getResolvedPenaltySips(
                  round.resolvedPenaltySips === undefined ? challenge : round,
                  gameDataRef.current?.difficulty
                )),
              };
              delete nextTeamProgress[teamId].drinks;
            }
          });

          return {
            ...current,
            revision: (current.revision || 0) + 1,
            teamProgress: nextTeamProgress,
            challengeRound: {
              ...round,
              stage: 'result',
              guesses: evaluation.guesses,
              winnerTeamIds: evaluation.winnerTeamIds,
              bestDistanceKm: evaluation.bestDistanceKm,
              pointsAwarded,
              drinkAwardId: `${current.sessionId}:${current.turnNumber}:geo-penalty`,
            },
            updatedAt,
          };
        }

        return undefined;
      }

      if (current.activeTeamId !== identity.localTeamId && actionType !== 'timeout') {
        return undefined;
      }

      if ((actionType === 'start' || actionType === 'ready') && (round.stage === 'intro' || round.stage === 'secret')) {
        return {
          ...current,
          revision: (current.revision || 0) + 1,
          challengeRound: { ...round, stage: 'playing', startedAt: updatedAt },
          updatedAt,
        };
      }

      const ordinaryResult = String(actionType || '').toLowerCase();
      if (
        challenge.type !== COUNTRY_WORD_CHALLENGE_TYPE
        && ['completed', 'failed'].includes(ordinaryResult)
        && round.stage === 'playing'
      ) {
        const succeeded = ordinaryResult === 'completed';
        const resultActionId = `${current.sessionId}:${current.turnNumber}:${ordinaryResult}`;
        const drinkRule = succeeded ? round.drinkRules?.success : round.drinkRules?.failure;
        const nextTeamProgress = addDrinksByRule({
          amount: getResolvedPenaltySips(
            round.resolvedPenaltySips === undefined ? challenge : round,
            gameDataRef.current?.difficulty
          ),
          playerId: round.selectedPlayerId,
          rule: drinkRule,
          teamId: current.activeTeamId,
          teamMembers: teamMembersRef.current,
          teamProgress: current.teamProgress,
        });
        return {
          ...current,
          revision: (current.revision || 0) + 1,
          teamProgress: nextTeamProgress,
          challengeRound: {
            ...round,
            stage: 'result',
            result: succeeded ? 'completed' : 'failed',
            resultActionId,
            drinkAwardId: drinkRule && drinkRule !== 'none' ? resultActionId : null,
          },
          updatedAt,
        };
      }

      if (!['guessed', 'failed', 'timeout'].includes(actionType) || round.stage !== 'playing') {
        return undefined;
      }

      if (challenge.type !== COUNTRY_WORD_CHALLENGE_TYPE) return undefined;
      if (actionType === 'timeout') {
        const challengeDeadline = Number(round.startedAt)
          + (Number(round.durationSeconds) || Number(challenge.durationSeconds) || 30) * 1000;
        if (!challengeDeadline || updatedAt < challengeDeadline) return undefined;
      } else if (current.activeTeamId !== identity.localTeamId) {
        return undefined;
      }
      const guessed = actionType === 'guessed';
      const pointsAwarded = guessed ? (Number(challenge.successPoints) || 10) : 0;
      const penaltySips = getResolvedPenaltySips(
        round.resolvedPenaltySips === undefined ? challenge : round,
        gameDataRef.current?.difficulty
      );
      const activeProgress = current.teamProgress?.[current.activeTeamId] || {};
      const challengePoints = (Number(activeProgress.challengePoints) || 0) + pointsAwarded;
      const prevPlayerDrinks = createPlayerDrinkLedger(
        teamMembersRef.current,
        current.activeTeamId,
        activeProgress.playerDrinks,
        activeProgress.drinks
      );
      const selectedPlayerId = round.selectedPlayerId || getTeamPlayers(
        teamMembersRef.current,
        current.activeTeamId
      ).find((player) => player.name === round.selectedPlayerName)?.playerId;
      const resultActionId = `${current.sessionId}:${current.turnNumber}:${actionType}`;
      const wordDrinkRule = guessed
        ? (round.drinkRules?.success || 'teamExceptTarget')
        : (round.drinkRules?.failure || 'target');
      const nextTeamProgress = addDrinksByRule({
        amount: penaltySips,
        playerId: selectedPlayerId,
        rule: wordDrinkRule,
        teamId: current.activeTeamId,
        teamMembers: teamMembersRef.current,
        teamProgress: {
          ...current.teamProgress,
          [current.activeTeamId]: {
            ...activeProgress,
            playerDrinks: prevPlayerDrinks,
          },
        },
      });
      const nextPlayerDrinks = nextTeamProgress[current.activeTeamId]?.playerDrinks || prevPlayerDrinks;
      const { drinks: _legacyDrinks, ...activeProgressWithoutLegacyTotal } = activeProgress;

      return {
        ...current,
        revision: (current.revision || 0) + 1,
        teamProgress: {
          ...nextTeamProgress,
          [current.activeTeamId]: {
            ...activeProgressWithoutLegacyTotal,
            challengePoints,
            playerDrinks: nextPlayerDrinks,
            score: getTeamScore({
              challengePoints,
              currentLeg: activeProgress.currentLeg,
              finishPosition: activeProgress.finishPosition,
            }),
          },
        },
        challengeRound: {
          ...round,
          stage: 'result',
          result: guessed ? 'guessed' : actionType,
          pointsAwarded,
          resultActionId,
          drinkAwardId: penaltySips > 0 ? resultActionId : null,
        },
        updatedAt,
      };
    });

    return result.committed;
  }, [
    canControlTurn,
    enabled,
    gameID,
    identity.isTeamLeader,
    identity.localTeamId,
    isConnected,
    isRoomExpired,
    now,
    routeModel.countryStops,
  ]);

  const completeChallenge = useCallback(async (options = {}) => {
    const { force = false } = options;
    if (!enabled || !gameID || (!canControlTurn && !force)) return false;

    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      if (
        !current
        || current.phase !== 'challenge'
        || (!force && current.activeTeamId !== identity.localTeamId)
        || (!force && current.challengeRound && current.challengeRound.stage !== 'result')
      ) {
        return undefined;
      }

      if (current.roadblock?.choice === 'detour' && current.roadblock.status === 'detourChallenge') {
        const updatedAt = now();
        const teamIds = getRequiredTeamIds(gameDataRef.current);
        const nextTeamId = getNextActiveTeamId(
          teamIds,
          current.teamProgress,
          current.activeTeamId
        );
        const activeProgress = current.teamProgress?.[current.activeTeamId] || {};
        const completedStep = activeProgress.detour?.step ?? (
          current.currentAction?.detourStartStep === undefined
            ? (Number(current.roadblock.detourStep) || 0) + 1
            : (Number(current.roadblock.detourStep) || 0)
        );

        return {
          ...current,
          phase: nextTeamId ? 'waiting' : 'done',
          activeTeamId: nextTeamId || current.activeTeamId,
          turnNumber: nextTeamId ? (current.turnNumber || 1) + 1 : current.turnNumber,
          revision: (current.revision || 0) + 1,
          teamProgress: {
            ...current.teamProgress,
            [current.activeTeamId]: {
              ...activeProgress,
              detour: {
                ...(activeProgress.detour || current.roadblock),
                status: 'pending',
                step: completedStep,
                detourStep: completedStep,
              },
            },
          },
          currentAction: null,
          challengeStop: null,
          challengeStopData: null,
          challengeId: null,
          challengeRound: null,
          roadblock: null,
          updatedAt,
        };
      }

      const teamIds = getRequiredTeamIds(gameDataRef.current);
      const nextTeamId = getNextActiveTeamId(
        teamIds,
        current.teamProgress,
        current.activeTeamId
      );

      return {
        ...current,
        phase: nextTeamId ? 'waiting' : 'done',
        activeTeamId: nextTeamId || current.activeTeamId,
        turnNumber: nextTeamId ? (current.turnNumber || 1) + 1 : current.turnNumber,
        revision: (current.revision || 0) + 1,
        currentAction: null,
        challengeStop: null,
        challengeStopData: null,
        challengeId: null,
        challengeRound: null,
        roadblock: null,
        updatedAt: now(),
      };
    });

    return result.committed;
  }, [canControlTurn, enabled, gameID, identity.localTeamId, now, routeModel]);

  const adjustDrinks = useCallback(async ({ teamId, delta = 1, playerId = null } = {}) => {
    if (
      !enabled
      || !gameID
      || !isConnected
      || isRoomExpired
      || !teamId
      || !Number.isFinite(Number(delta))
      || Number(delta) === 0
    ) {
      return false;
    }

    const safeDelta = Math.round(Number(delta));
    const updatedAt = now();
    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      if (!current || !current.teamProgress?.[teamId]) return undefined;

      const prevTeam = current.teamProgress[teamId] || {};
      const prevPlayerDrinks = createPlayerDrinkLedger(
        teamMembersRef.current,
        teamId,
        prevTeam.playerDrinks,
        prevTeam.drinks
      );
      const nextPlayerDrinks = playerId
        ? addDrinksToPlayer(prevPlayerDrinks, playerId, safeDelta)
        : addDrinksToTeam(prevPlayerDrinks, safeDelta);
      if (JSON.stringify(nextPlayerDrinks) === JSON.stringify(prevPlayerDrinks)) return undefined;
      const { drinks: _legacyDrinks, ...teamWithoutLegacyTotal } = prevTeam;

      return {
        ...current,
        revision: (current.revision || 0) + 1,
        teamProgress: {
          ...current.teamProgress,
          [teamId]: {
            ...teamWithoutLegacyTotal,
            playerDrinks: nextPlayerDrinks,
          },
        },
        updatedAt,
      };
    });

    return result.committed;
  }, [enabled, gameID, isConnected, isRoomExpired, now]);

  const restart = useCallback(async () => {
    if (!enabled || !gameID || !isHost || !isConnected || isRoomExpired) return false;

    const nextGameplay = createInitialGameplay(gameDataRef.current, now(), teamMembersRef.current);
    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      if (!current || current.phase !== 'done') return undefined;
      return nextGameplay;
    });

    return result.committed;
  }, [enabled, gameID, isConnected, isHost, isRoomExpired, now]);

  return {
    ...identity,
    activeLeader,
    adjustDrinks,
    canClaimHost,
    canControlTurn,
    connectedPlayers,
    completeChallenge,
    completeMovement,
    deviceID,
    gameplay,
    isConnected,
    isActiveLeaderConnected,
    isHost,
    isLoading,
    isRoomExpired,
    leaders,
    leaveGame,
    presence,
    presenceLoaded,
    replaceTeamLeader,
    restart,
    resolveRoadblock,
    roomMeta,
    serverNow: now,
    submitRoll,
    teamMembers: liveTeamMembers,
    transferHost,
    updateChallenge,
  };
}
