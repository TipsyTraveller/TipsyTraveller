import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onValue, ref, runTransaction } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import {
  buildRollAction,
  createInitialGameplay,
  getFinishPosition,
  getNextActiveTeamId,
  getRequiredTeamIds,
  getTeamScore,
} from '../gameplayState';
import {
  COUNTRY_WORD_CHALLENGE_TYPE,
  getChallengeForStop,
  getChallengeIdForStop,
  getCountryWordRound,
  getTeamPlayers,
} from '../constants/challenges';

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

export default function useMultiplayerGame({ enabled, gameData, gameID, routeModel, teamMembers }) {
  const [gameplay, setGameplay] = useState(gameData?.gameplay || null);
  const [deviceID, setDeviceID] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [isConnected, setIsConnected] = useState(!enabled);
  const [isLoading, setIsLoading] = useState(enabled);
  const gameDataRef = useRef(gameData);
  gameDataRef.current = gameData;
  const teamMembersRef = useRef(teamMembers);
  teamMembersRef.current = teamMembers;

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
    const connectedRef = ref(db, '.info/connected');
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsubscribeGameplay = onValue(gameplayRef, (snapshot) => {
      setGameplay(snapshot.exists() ? snapshot.val() : null);
      setIsLoading(false);
    });
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      setIsConnected(snapshot.val() === true);
    });
    const unsubscribeOffset = onValue(offsetRef, (snapshot) => {
      setServerOffset(Number(snapshot.val()) || 0);
    });

    return () => {
      unsubscribeGameplay();
      unsubscribeConnected();
      unsubscribeOffset();
    };
  }, [enabled, gameID]);

  const identity = useMemo(
    () => findLocalPlayer(teamMembers, deviceID),
    [deviceID, teamMembers]
  );
  const isHost = Boolean(deviceID && gameData?.hostDeviceID === deviceID);
  const canControlTurn = Boolean(
    identity.isTeamLeader
    && identity.localTeamId
    && identity.localTeamId === gameplay?.activeTeamId
  );
  const now = useCallback(() => Date.now() + serverOffset, [serverOffset]);

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

      return {
        ...current,
        phase: 'moving',
        revision: (current.revision || 0) + 1,
        currentAction: action,
        challengeStop: null,
        challengeId: null,
        challengeRound: null,
        updatedAt: action.startedAt,
      };
    });

    return result.committed;
  }, [canControlTurn, deviceID, enabled, gameID, gameplay, identity.localTeamId, now, routeModel]);

  const completeMovement = useCallback(async (actionId) => {
    if (!enabled || !gameID || !actionId) return false;

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
      const hasFinishedRoute = action.targetLeg >= routeModel.finalStopIndex;
      const finishPosition = hasFinishedRoute
        ? getFinishPosition(current.teamProgress)
        : null;
      const previousProgress = current.teamProgress?.[action.teamId] || {};
      const challengePoints = Number(previousProgress.challengePoints) || 0;
      const teamProgress = {
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

      if (!hasFinishedRoute) {
        const stop = routeModel.countryStops[action.targetLeg];
        const players = getTeamPlayers(teamMembersRef.current, action.teamId);
        const challengeId = getChallengeIdForStop(stop, action.id, {
          teamPlayerCount: players.length,
        });
        const challenge = getChallengeForStop(action.targetLeg, routeModel.countryStops, challengeId);
        return {
          ...current,
          phase: 'challenge',
          revision: (current.revision || 0) + 1,
          teamProgress,
          challengeStop: action.targetLeg,
          challengeId,
          challengeRound: getCountryWordRound(challenge, players, action.id),
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
        challengeId: null,
        challengeRound: null,
        updatedAt: completedAt,
      };
    });

    return result.committed;
  }, [enabled, gameID, now, routeModel]);

  const updateCountryWordChallenge = useCallback(async (action) => {
    if (!enabled || !gameID || !canControlTurn) return false;

    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      const round = current?.challengeRound;
      if (
        !current
        || current.phase !== 'challenge'
        || current.activeTeamId !== identity.localTeamId
        || !round
      ) {
        return undefined;
      }

      const updatedAt = now();
      if ((action === 'start' || action === 'ready') && (round.stage === 'intro' || round.stage === 'secret')) {
        return {
          ...current,
          revision: (current.revision || 0) + 1,
          challengeRound: { ...round, stage: 'playing', startedAt: updatedAt },
          updatedAt,
        };
      }
      if (!['guessed', 'failed', 'timeout'].includes(action) || round.stage !== 'playing') {
        return undefined;
      }

      const guessed = action === 'guessed';
      const challenge = getChallengeForStop(
        current.challengeStop,
        routeModel.countryStops,
        current.challengeId
      );
      if (challenge.type !== COUNTRY_WORD_CHALLENGE_TYPE) return undefined;
      const pointsAwarded = guessed ? (Number(challenge.successPoints) || 10) : 0;
      const activeProgress = current.teamProgress?.[current.activeTeamId] || {};
      const challengePoints = (Number(activeProgress.challengePoints) || 0) + pointsAwarded;

      return {
        ...current,
        revision: (current.revision || 0) + 1,
        teamProgress: {
          ...current.teamProgress,
          [current.activeTeamId]: {
            ...activeProgress,
            challengePoints,
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
          result: guessed ? 'guessed' : action,
          pointsAwarded,
        },
        updatedAt,
      };
    });

    return result.committed;
  }, [canControlTurn, enabled, gameID, identity.localTeamId, now, routeModel.countryStops]);

  const completeChallenge = useCallback(async () => {
    if (!enabled || !gameID || !canControlTurn) return false;

    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      if (
        !current
        || current.phase !== 'challenge'
        || current.activeTeamId !== identity.localTeamId
        || (current.challengeRound && current.challengeRound.stage !== 'result')
      ) {
        return undefined;
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
        challengeId: null,
        challengeRound: null,
        updatedAt: now(),
      };
    });

    return result.committed;
  }, [canControlTurn, enabled, gameID, identity.localTeamId, now]);

  const restart = useCallback(async () => {
    if (!enabled || !gameID || !isHost) return false;

    const nextGameplay = createInitialGameplay(gameDataRef.current, now());
    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      if (!current || current.phase !== 'done') return undefined;
      return nextGameplay;
    });

    return result.committed;
  }, [enabled, gameID, isHost, now]);

  return {
    ...identity,
    canControlTurn,
    completeChallenge,
    completeMovement,
    deviceID,
    gameplay,
    isConnected,
    isHost,
    isLoading,
    restart,
    serverNow: now,
    submitRoll,
    updateCountryWordChallenge,
  };
}
