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
  didTriggerRoadsideDuel,
  GEO_GUESSR_CHALLENGE_TYPE,
  getChallengeForStop,
  getChallengeIdForStop,
  getCountryWordRound,
  getGeoGuessrRound,
  getTeamPlayers,
  isBotOnlyTeam,
} from '../constants/challenges';
import {
  calculateBoardDistanceKm,
  evaluateGeoGuessrGuesses,
  generateFallbackPin,
} from '../constants/monumentPool';
import { getCachedMonumentPool } from '../services/countryStopsService';

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
          });
          if (geoData) {
            challengeRound = geoData.round;
            usedMonumentIds = geoData.nextUsedMonumentIds;
          }
        } else {
          challengeRound = getCountryWordRound(challenge, players, action.id);
        }

        return {
          ...current,
          phase: 'challenge',
          revision: (current.revision || 0) + 1,
          teamProgress,
          challengeStop: action.targetLeg,
          challengeId,
          challengeRound,
          usedMonumentIds,
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
    if (!enabled || !gameID) return false;

    const actionType = typeof action === 'object' && action !== null ? action.type : action;
    const isGeoPinSubmit = actionType === 'submitPin';

    // Any team leader can submit their own team's GeoGuessr pin; other stage transitions
    // require the active team's leader.
    if (isGeoPinSubmit) {
      if (!identity.isTeamLeader || !identity.localTeamId) return false;
    } else if (!canControlTurn) {
      return false;
    }

    const result = await runTransaction(ref(db, `games/${gameID}/gameplay`), (current) => {
      const round = current?.challengeRound;
      if (!current || current.phase !== 'challenge' || !round) {
        return undefined;
      }

      const challenge = getChallengeForStop(
        current.challengeStop,
        routeModel.countryStops,
        current.challengeId
      );
      const updatedAt = now();

      if (challenge.type === GEO_GUESSR_CHALLENGE_TYPE) {
        if (actionType === 'startPinning' && round.stage === 'photo') {
          if (current.activeTeamId !== identity.localTeamId) return undefined;
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
            },
            updatedAt,
          };
        }

        if ((actionType === 'timeoutPinning' || actionType === 'finalizePinning') && round.stage === 'pinning') {
          if (current.activeTeamId !== identity.localTeamId) return undefined;
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
            },
            updatedAt,
          };
        }

        return undefined;
      }

      if (current.activeTeamId !== identity.localTeamId) {
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
      if (!['guessed', 'failed', 'timeout'].includes(actionType) || round.stage !== 'playing') {
        return undefined;
      }

      if (challenge.type !== COUNTRY_WORD_CHALLENGE_TYPE) return undefined;
      const guessed = actionType === 'guessed';
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
          result: guessed ? 'guessed' : actionType,
          pointsAwarded,
        },
        updatedAt,
      };
    });

    return result.committed;
  }, [canControlTurn, enabled, gameID, identity.isTeamLeader, identity.localTeamId, now, routeModel.countryStops]);

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
