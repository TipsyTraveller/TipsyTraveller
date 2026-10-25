import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import ChallengePopup from './components/ChallengePopup';
import GameHud from './components/GameHud';
import GameScene from './components/GameScene';
import RaceProgressTracker from './components/RaceProgressTracker';
import RoadblockOverlay from './components/RoadblockOverlay';
import {
  COUNTRY_WORD_CHALLENGE_TYPE,
  didTriggerRoadsideDuel,
  GEO_GUESSR_CHALLENGE_TYPE,
  getChallengeForStop,
  getChallengeIdForStop,
  getCountryWordRound,
  getGeoGuessrRound,
  getTeamPlayers,
} from './constants/challenges';
import {
  calculateBoardDistanceKm,
  evaluateGeoGuessrGuesses,
} from './constants/monumentPool';
import {
  DICE_MAX_RESULT,
  DICE_RESULT_DURATION,
  DICE_RESULT_EXIT_BUFFER,
} from './constants/diceBounds';
import { createInitialTeamProgress, getGamePiecesForGame } from './constants/gamePieces';
import { getDefaultModelOption, getModelOption } from './constants/modelOptions';
import { devEventBus } from '../shared/dev/devEventBus';
import useMultiplayerGame from './hooks/useMultiplayerGame';
import { getPathRevealDuration, createRouteModel } from './constants/route';
import {
  createRoadblockEvent,
  createRoadblockDetourSegment,
  createRoadblockMovementPath,
  createRoadblockOnRoute,
  shouldTriggerRoadblock,
} from './constants/roadblocks';
import {
  COUNTRY_POSITION_VERSION,
  getStopsForDuration,
  mergeRouteStopsWithCatalogue,
  resolveGameRouteStops,
} from './constants/countryStops';
import {
  getCachedMonumentPool,
  subscribeCountryStops,
  updateCountryStop,
} from './services/countryStopsService';
import CountryStopPlacementForm from './components/CountryStopPlacementForm';
import { getFinishPosition, getTeamScore } from './gameplayState';

const EMPTY_GAME_DATA = {};

const getFocusedPiece = (gamePieces, teamProgress) => (
  gamePieces.find((piece) => !teamProgress[piece.id]?.isDone) || gamePieces[0]
);

const getNextActiveTeamIndex = (gamePieces, teamProgress, currentIndex) => {
  if (gamePieces.length === 0) return null;

  for (let offset = 1; offset <= gamePieces.length; offset += 1) {
    const nextIndex = (currentIndex + offset) % gamePieces.length;
    const nextPiece = gamePieces[nextIndex];
    if (!teamProgress[nextPiece.id]?.isDone) return nextIndex;
  }

  return null;
};

const rollDice = () => Math.floor(Math.random() * DICE_MAX_RESULT) + 1;

const useLatestCallback = (callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  return useCallback((...args) => callbackRef.current(...args), []);
};

const GameScreen = ({ route }) => {
  const gameData = route?.params?.gameData || EMPTY_GAME_DATA;
  const gameID = route?.params?.gameID;
  const teamMembers = route?.params?.teamMembers;
  const multiplayerEnabled = Boolean(gameID && !String(gameID).startsWith('DEV-'));
  const [state, setState] = useState('waiting');
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [lastRoll, setLastRoll] = useState(null);
  const [remainingMoves, setRemainingMoves] = useState(0);
  const [movingPieceId, setMovingPieceId] = useState(null);
  const [moveStartDelay, setMoveStartDelay] = useState(0);
  const [moveStartLeg, setMoveStartLeg] = useState(0);
  const [passedLeg, setPassedLeg] = useState(0);
  const [isCarDriving, setIsCarDriving] = useState(false);
  const [moveTargets, setMoveTargets] = useState({});
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [devRouteStops, setDevRouteStops] = useState(null);
  const [placementRequest, setPlacementRequest] = useState(null);
  const [placementPosition, setPlacementPosition] = useState(null);
  const [isDevDrive, setIsDevDrive] = useState(false);
  const [roadblocks, setRoadblocks] = useState([]);
  const [localRoadblock, setLocalRoadblock] = useState(null);
  const [localPendingAction, setLocalPendingAction] = useState(null);
  const [localMovementPath, setLocalMovementPath] = useState(null);
  const [localTurnNumber, setLocalTurnNumber] = useState(1);
  const activeCarProgressRef = useRef(0);
  const visualActionIdRef = useRef(null);
  const usedMonumentIdsRef = useRef([]);
  const devForceChallengeTypeRef = useRef(null);
  const devForceRoadblockRef = useRef(false);
  const localRoadblockHistoryRef = useRef([]);
  const routeStops = useMemo(
    () => devRouteStops || resolveGameRouteStops(gameData),
    [devRouteStops, gameData?.duration, gameData?.routeStops]
  );
  const routeModel = useMemo(() => createRouteModel(routeStops), [routeStops]);
  const baseGamePieces = useMemo(() => getGamePiecesForGame(gameData), [gameData?.nrOfPlayers]);
  const gamePieces = useMemo(() => (
    baseGamePieces.map((piece, index) => ({
      ...piece,
      startDelay: 0,
      model: gameData?.teamModels?.[piece.id]
        ? getModelOption(gameData.teamModels[piece.id])
        : getDefaultModelOption(index),
    }))
  ), [baseGamePieces, gameData?.teamModels]);
  const [teamProgress, setTeamProgress] = useState(() => (
    createInitialTeamProgress(getGamePiecesForGame(gameData))
  ));
  const pieceRefs = useRef({});
  const multiplayer = useMultiplayerGame({
    enabled: multiplayerEnabled,
    gameData,
    gameID,
    routeModel,
    teamMembers,
  });

  gamePieces.forEach((piece) => {
    if (!pieceRefs.current[piece.id]) pieceRefs.current[piece.id] = React.createRef();
  });

  useEffect(() => {
    setDevRouteStops(null);
    setPlacementRequest(null);
    setPlacementPosition(null);
  }, [gameData]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => ScreenOrientation.unlockAsync();
  }, []);

  useEffect(() => {
    if (multiplayerEnabled) return;

    activeCarProgressRef.current = 0;
    usedMonumentIdsRef.current = [];
    setState('waiting');
    setActiveTeamIndex(0);
    setLastRoll(null);
    setRemainingMoves(0);
    setMovingPieceId(null);
    setMoveStartDelay(0);
    setMoveStartLeg(0);
    setPassedLeg(0);
    setIsCarDriving(false);
    setMoveTargets({});
    setCurrentChallenge(null);
    setIsDevDrive(false);
    setLocalRoadblock(null);
    setLocalPendingAction(null);
    setLocalMovementPath(null);
    setLocalTurnNumber(1);
    localRoadblockHistoryRef.current = [];
    setTeamProgress(createInitialTeamProgress(baseGamePieces));
  }, [baseGamePieces, multiplayerEnabled]);

  useEffect(() => {
    if (!multiplayerEnabled || !multiplayer.gameplay) return;

    const gameplay = multiplayer.gameplay;
    const nextActiveIndex = Math.max(
      gamePieces.findIndex((piece) => piece.id === gameplay.activeTeamId),
      0
    );
    const action = gameplay.currentAction;

    setActiveTeamIndex(nextActiveIndex);
    setTeamProgress(gameplay.teamProgress || createInitialTeamProgress(gamePieces));

    if (gameplay.phase === 'roadblock' && action && gameplay.roadblock) {
      visualActionIdRef.current = `${action.id}:roadblock`;
      activeCarProgressRef.current = routeModel.stopProgress[action.fromLeg] ?? 0;
      setLastRoll(action.value);
      setMoveStartLeg(action.fromLeg);
      setPassedLeg(action.fromLeg);
      setIsCarDriving(false);
      setRemainingMoves(action.targetLeg - action.fromLeg);
      setMovingPieceId(null);
      setMoveTargets((previousTargets) => ({
        ...previousTargets,
        [action.teamId]: action.targetLeg,
      }));
      setCurrentChallenge(null);
      setState('roadblock');
      return;
    }

    if (gameplay.phase === 'moving' && action) {
      const visualActionKey = `${action.id}:moving:${action.detourStep ?? 'main'}:${action.detourSegmentType || 'direct'}`;
      if (visualActionIdRef.current === visualActionKey) return;

      visualActionIdRef.current = visualActionKey;
      activeCarProgressRef.current = routeModel.stopProgress[action.fromLeg] ?? 0;
      setLastRoll(action.value);
      setMoveStartLeg(action.fromLeg);
      setPassedLeg(action.fromLeg);
      setIsCarDriving(false);
      setRemainingMoves(action.targetLeg - action.fromLeg);
      setMovingPieceId(action.teamId);
      setMoveStartDelay(action.roadblockChoice ? 0 : DICE_RESULT_DURATION + DICE_RESULT_EXIT_BUFFER);
      setMoveTargets((previousTargets) => ({
        ...previousTargets,
        [action.teamId]: action.targetLeg,
      }));
      setCurrentChallenge(null);
      setState('moving');
      return;
    }

    setIsCarDriving(false);
    setMovingPieceId(gameplay.challengeStopData ? action?.teamId || null : null);
    setRemainingMoves(0);

    if (gameplay.phase === 'challenge') {
      setLastRoll(action?.value ?? null);
      const challengeStops = gameplay.challengeStopData
        ? [gameplay.challengeStopData]
        : routeStops;
      const challengeStopIndex = gameplay.challengeStopData ? 0 : gameplay.challengeStop;
      setCurrentChallenge({
        ...getChallengeForStop(challengeStopIndex, challengeStops, gameplay.challengeId),
        ...(gameplay.challengeRound || {}),
        ...(gameplay.challengeStopData
          ? { markerPosition: gameplay.challengeStopData.position, isDetour: true }
          : {}),
      });
      setState('challenge');
      return;
    }

    setCurrentChallenge(null);
    setLastRoll(null);
    visualActionIdRef.current = null;
    setState(gameplay.phase === 'done' ? 'done' : 'waiting');
  }, [gamePieces, multiplayer.gameplay, multiplayerEnabled, routeModel, routeStops]);

  useEffect(() => {
    const action = multiplayer.gameplay?.currentAction;
    if (!multiplayerEnabled || multiplayer.gameplay?.phase !== 'moving' || !action?.movementEndsAt) {
      return undefined;
    }

    const delay = Math.max(0, action.movementEndsAt - multiplayer.serverNow()) + 1500;
    const timeout = setTimeout(() => {
      multiplayer.completeMovement(action.id).catch((error) => {
        console.log('Unable to finalize synchronized movement', error);
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [multiplayer.completeMovement, multiplayer.gameplay, multiplayer.serverNow, multiplayerEnabled]);

  const activePiece = gamePieces[activeTeamIndex] || gamePieces[0];
  const activeProgress = teamProgress[activePiece?.id] || { currentLeg: 0, isDone: false };

  const createLocalChallenge = (
    stopIndex,
    pieceId,
    seed,
    { fromLeg = 0, currentTeamProgress = teamProgress, forceType = null } = {}
  ) => {
    const stop = routeStops[stopIndex];
    const players = getTeamPlayers(teamMembers, pieceId);
    const isRoadsideDuel = didTriggerRoadsideDuel({
      fromLeg,
      targetLeg: stopIndex,
      teamId: pieceId,
      teamProgress: currentTeamProgress,
    });
    const effectiveForceType = forceType || (isRoadsideDuel ? GEO_GUESSR_CHALLENGE_TYPE : null);
    const challengeId = getChallengeIdForStop(stop, seed, {
      teamPlayerCount: Math.max(players.length, 2),
      forceType: effectiveForceType,
    });
    const challenge = getChallengeForStop(stopIndex, routeStops, challengeId);

    if (challenge.type === GEO_GUESSR_CHALLENGE_TYPE) {
      const geoData = getGeoGuessrRound({
        challenge,
        isRoadsideDuel,
        monumentPool: getCachedMonumentPool(),
        requiredTeamIds: gamePieces.map((piece) => piece.id),
        seed,
        startedAt: Date.now(),
        stopCountryId: stop?.id || null,
        usedMonumentIds: usedMonumentIdsRef.current,
      });
      if (geoData) {
        usedMonumentIdsRef.current = geoData.nextUsedMonumentIds;
        return {
          ...challenge,
          ...geoData.round,
        };
      }
    }

    return {
      ...challenge,
      ...(getCountryWordRound(challenge, players, seed) || {}),
    };
  };

  const resetLocalGame = () => {
    activeCarProgressRef.current = 0;
    usedMonumentIdsRef.current = [];
    setState('waiting');
    setActiveTeamIndex(0);
    setLastRoll(null);
    setRemainingMoves(0);
    setMovingPieceId(null);
    setMoveStartDelay(0);
    setMoveStartLeg(0);
    setPassedLeg(0);
    setIsCarDriving(false);
    setMoveTargets({});
    setCurrentChallenge(null);
    setIsDevDrive(false);
    setRoadblocks([]);
    setLocalRoadblock(null);
    setLocalPendingAction(null);
    setLocalMovementPath(null);
    setLocalTurnNumber(1);
    localRoadblockHistoryRef.current = [];
    setTeamProgress(createInitialTeamProgress(gamePieces));
  };

  const handleRestart = () => {
    if (multiplayerEnabled) {
      multiplayer.restart().catch((error) => console.log('Unable to restart game', error));
      return;
    }
    resetLocalGame();
  };

  const handleChallengeComplete = () => {
    if (multiplayerEnabled) {
      multiplayer.completeChallenge().catch((error) => {
        console.log('Unable to complete synchronized challenge', error);
      });
      return;
    }

    if (localRoadblock?.choice === 'detour' && localRoadblock.status === 'detourChallenge') {
      const completedStep = Number(localRoadblock.detourStep) || 0;
      const nextStep = completedStep + 1;
      const movementPath = createRoadblockDetourSegment({
        event: localRoadblock,
        routeModel,
        step: nextStep,
      });
      if (!movementPath || !localPendingAction) return;
      const headingToDestination = nextStep >= (localRoadblock.detourStops?.length || 0);
      setCurrentChallenge(null);
      setLocalMovementPath(movementPath);
      setLocalPendingAction({
        ...localPendingAction,
        detourStep: nextStep,
        detourSegmentType: headingToDestination ? 'destination' : 'waypoint',
      });
      setLocalRoadblock({ ...localRoadblock, status: 'travelling', detourStep: nextStep });
      setMovingPieceId(localPendingAction.teamId);
      setMoveStartDelay(0);
      setIsCarDriving(false);
      setState('moving');
      return;
    }

    const nextActiveTeamIndex = getNextActiveTeamIndex(gamePieces, teamProgress, activeTeamIndex);
    setCurrentChallenge(null);
    if (nextActiveTeamIndex === null) {
      setState('done');
      return;
    }
    setLastRoll(null);
    setActiveTeamIndex(nextActiveTeamIndex);
    setLocalTurnNumber((turn) => turn + 1);
    setState('waiting');
  };

  const handleCountryWordAction = (action) => {
    if (multiplayerEnabled) {
      multiplayer.updateCountryWordChallenge(action).catch((error) => {
        console.log('Unable to update synchronized challenge', error);
      });
      return;
    }

    if (!currentChallenge) return;
    const actionType = typeof action === 'object' && action !== null ? action.type : action;

    if (currentChallenge.type === GEO_GUESSR_CHALLENGE_TYPE) {
      const requiredTeamIds = Array.isArray(currentChallenge.requiredTeamIds) && currentChallenge.requiredTeamIds.length
        ? currentChallenge.requiredTeamIds
        : gamePieces.map((piece) => piece.id);

      if (actionType === 'startPinning' && currentChallenge.stage === 'photo') {
        setCurrentChallenge({
          ...currentChallenge,
          stage: 'pinning',
          pinStartedAt: Date.now(),
          activePinTeamIndex: 0,
        });
        return;
      }

      if (actionType === 'submitPin' && currentChallenge.stage === 'pinning') {
        const currentPinIndex = Number(currentChallenge.activePinTeamIndex) || 0;
        const pinTeamId = action?.teamId || requiredTeamIds[currentPinIndex] || activePiece?.id;
        const pos = action?.position;
        if (!pinTeamId || !pos) return;

        const cleanPos = { x: Number(pos.x), y: Number(pos.y) };
        const nextGuesses = {
          ...(currentChallenge.guesses || {}),
          [pinTeamId]: {
            x: cleanPos.x,
            y: cleanPos.y,
            distanceKm: calculateBoardDistanceKm(cleanPos, currentChallenge.targetPosition),
            lockedAt: Date.now(),
          },
        };

        const nextPinIndex = currentPinIndex + 1;
        if (nextPinIndex < requiredTeamIds.length) {
          setCurrentChallenge({
            ...currentChallenge,
            guesses: nextGuesses,
            activePinTeamIndex: nextPinIndex,
            pinStartedAt: Date.now(),
          });
          return;
        }

        const evaluation = evaluateGeoGuessrGuesses({
          guesses: nextGuesses,
          requiredTeamIds,
          targetPosition: currentChallenge.targetPosition,
          seed: `local-eval-${Date.now()}`,
          autoFillMissing: true,
        });
        const pointsAwarded = Number(currentChallenge.successPoints) || 15;

        setTeamProgress((progress) => {
          const next = { ...progress };
          evaluation.winnerTeamIds.forEach((winnerId) => {
            const prev = next[winnerId] || {};
            const nextChallengePoints = (Number(prev.challengePoints) || 0) + pointsAwarded;
            next[winnerId] = {
              ...prev,
              challengePoints: nextChallengePoints,
              score: getTeamScore({
                challengePoints: nextChallengePoints,
                currentLeg: prev.currentLeg,
                finishPosition: prev.finishPosition,
              }),
            };
          });
          return next;
        });

        setCurrentChallenge({
          ...currentChallenge,
          stage: 'result',
          guesses: evaluation.guesses,
          winnerTeamIds: evaluation.winnerTeamIds,
          bestDistanceKm: evaluation.bestDistanceKm,
          pointsAwarded,
        });
        return;
      }

      if ((actionType === 'timeoutPinning' || actionType === 'finalizePinning') && currentChallenge.stage === 'pinning') {
        const evaluation = evaluateGeoGuessrGuesses({
          guesses: currentChallenge.guesses || {},
          requiredTeamIds,
          targetPosition: currentChallenge.targetPosition,
          seed: `local-eval-${Date.now()}`,
          autoFillMissing: true,
        });
        const pointsAwarded = Number(currentChallenge.successPoints) || 15;

        setTeamProgress((progress) => {
          const next = { ...progress };
          evaluation.winnerTeamIds.forEach((winnerId) => {
            const prev = next[winnerId] || {};
            const nextChallengePoints = (Number(prev.challengePoints) || 0) + pointsAwarded;
            next[winnerId] = {
              ...prev,
              challengePoints: nextChallengePoints,
              score: getTeamScore({
                challengePoints: nextChallengePoints,
                currentLeg: prev.currentLeg,
                finishPosition: prev.finishPosition,
              }),
            };
          });
          return next;
        });

        setCurrentChallenge({
          ...currentChallenge,
          stage: 'result',
          guesses: evaluation.guesses,
          winnerTeamIds: evaluation.winnerTeamIds,
          bestDistanceKm: evaluation.bestDistanceKm,
          pointsAwarded,
        });
      }
      return;
    }

    if (currentChallenge.type !== COUNTRY_WORD_CHALLENGE_TYPE) return;
    if ((actionType === 'start' || actionType === 'ready') && (currentChallenge.stage === 'intro' || currentChallenge.stage === 'secret')) {
      setCurrentChallenge({ ...currentChallenge, stage: 'playing', startedAt: Date.now() });
      return;
    }
    if (!['guessed', 'failed', 'timeout'].includes(actionType) || currentChallenge.stage !== 'playing') {
      return;
    }

    const guessed = actionType === 'guessed';
    const pointsAwarded = guessed ? (Number(currentChallenge.successPoints) || 10) : 0;
    if (pointsAwarded && activePiece?.id) {
      setTeamProgress((progress) => {
        const current = progress[activePiece.id] || {};
        const challengePoints = (Number(current.challengePoints) || 0) + pointsAwarded;
        return {
          ...progress,
          [activePiece.id]: {
            ...current,
            challengePoints,
            score: getTeamScore({
              challengePoints,
              currentLeg: current.currentLeg,
              finishPosition: current.finishPosition,
            }),
          },
        };
      });
    }

    setCurrentChallenge({
      ...currentChallenge,
      stage: 'result',
      result: guessed ? 'guessed' : actionType,
      pointsAwarded,
    });
  };

  const handleDiceRollStart = () => {
    if (state === 'waiting' && (!multiplayerEnabled || multiplayer.canControlTurn)) {
      setState('rolling');
    }
  };

  const startLocalRoll = (value = rollDice(), resultDisplayDelay = 0) => {
    if (!['waiting', 'rolling'].includes(state) || !activePiece || activeProgress.isDone) return;

    const safeValue = Math.max(1, Math.min(Math.round(Number(value) || 1), DICE_MAX_RESULT));
    const startLeg = activeProgress.currentLeg;
    const targetLeg = Math.min(startLeg + safeValue, routeModel.finalStopIndex);
    const action = {
      id: `local-roll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'roll',
      teamId: activePiece.id,
      value: safeValue,
      fromLeg: startLeg,
      targetLeg,
      finalStopIndex: routeModel.finalStopIndex,
    };
    activeCarProgressRef.current = routeModel.stopProgress[startLeg] ?? 0;
    setLastRoll(safeValue);
    setMoveStartLeg(startLeg);
    setPassedLeg(startLeg);
    setIsCarDriving(false);
    setRemainingMoves(targetLeg - startLeg);
    setMovingPieceId(activePiece.id);
    setMoveStartDelay(resultDisplayDelay);
    setMoveTargets((previousTargets) => ({ ...previousTargets, [activePiece.id]: targetLeg }));
    setLocalMovementPath(null);

    const localGameplay = {
      activeTeamId: activePiece.id,
      teamProgress,
      turnNumber: localTurnNumber,
      roadblockHistory: localRoadblockHistoryRef.current,
    };
    const forceRoadblock = devForceRoadblockRef.current;
    devForceRoadblockRef.current = false;
    if (forceRoadblock || shouldTriggerRoadblock({ action, gameplay: localGameplay })) {
      const event = createRoadblockEvent({ action, routeModel, turnNumber: localTurnNumber });
      localRoadblockHistoryRef.current = [...localRoadblockHistoryRef.current, {
        id: event.id,
        teamId: event.teamId,
        turnNumber: event.turnNumber,
      }].slice(-8);
      setMovingPieceId(null);
      setLocalPendingAction(action);
      setLocalRoadblock(event);
      setState('roadblock');
      return;
    }

    setLocalPendingAction(null);
    setLocalRoadblock(null);
    setState('moving');
  };

  const handleRoadblockAction = (choice) => {
    if (multiplayerEnabled) {
      multiplayer.resolveRoadblock(choice).catch((error) => {
        console.log('Unable to resolve synchronized roadblock', error);
      });
      return;
    }

    if (!localRoadblock || !localPendingAction) return;
    if (choice === 'challenge' && localRoadblock.status === 'choice') {
      setLocalRoadblock({
        ...localRoadblock,
        status: 'challenge',
        challengeStartedAt: Date.now(),
      });
      return;
    }

    const takesDetour = choice === 'detour';
    const brokeThrough = choice === 'completed' && localRoadblock.status === 'challenge';
    if (!takesDetour && !brokeThrough) return;

    const movementPath = takesDetour
      ? createRoadblockDetourSegment({ event: localRoadblock, routeModel, step: 0 })
      : createRoadblockMovementPath({ event: localRoadblock, routeModel, type: 'direct' });
    if (!movementPath) return;
    setLocalMovementPath(movementPath);
    setLocalPendingAction({
      ...localPendingAction,
      roadblockChoice: takesDetour ? 'detour' : 'challenge',
      detourStep: takesDetour ? 0 : null,
      detourSegmentType: takesDetour ? 'waypoint' : null,
    });
    setLocalRoadblock({
      ...localRoadblock,
      status: takesDetour ? 'travelling' : 'resolved',
      choice: takesDetour ? 'detour' : 'challenge',
      detourStep: takesDetour ? 0 : null,
      resolvedAt: Date.now(),
    });
    setMovingPieceId(localPendingAction.teamId);
    setMoveStartDelay(0);
    setState('moving');
  };

  const requestRoll = async (value = rollDice(), inputMethod = 'shortcut') => {
    if (!multiplayerEnabled) {
      startLocalRoll(value, inputMethod === 'boardDice'
        ? DICE_RESULT_DURATION + DICE_RESULT_EXIT_BUFFER
        : 0);
      return;
    }

    if (!multiplayer.canControlTurn || !multiplayer.isConnected) return;
    if (inputMethod === 'shortcut') setState('rolling');
    try {
      const committed = await multiplayer.submitRoll(value, inputMethod);
      if (!committed) setState('waiting');
    } catch (error) {
      console.log('Unable to synchronize dice roll', error);
      setState('waiting');
    }
  };

  const handleBoardDiceRoll = (value) => requestRoll(value, 'boardDice');
  const handleDriveStart = () => setIsCarDriving(true);

  const handleLegPass = (crossedLeg) => {
    const activeTarget = moveTargets[activePiece?.id] ?? activeProgress.currentLeg;
    setPassedLeg(crossedLeg);
    setRemainingMoves(Math.max(activeTarget - crossedLeg, 1));
  };

  const handleMoveComplete = (pieceId, landedLeg) => {
    const activeDevDrive = isDevDrive;
    const forcedChallengeType = devForceChallengeTypeRef.current;
    devForceChallengeTypeRef.current = null;
    if (isDevDrive) {
      setIsDevDrive(false);
    }

    if (multiplayerEnabled) {
      setIsCarDriving(false);
      multiplayer.completeMovement(multiplayer.gameplay?.currentAction?.id).catch((error) => {
        console.log('Unable to complete synchronized movement', error);
      });
      return;
    }

    const isLocalDetourWaypoint = localRoadblock?.choice === 'detour'
      && localRoadblock.status === 'travelling'
      && localPendingAction?.detourSegmentType === 'waypoint';

    if (isLocalDetourWaypoint) {
      const detourStep = Number(localPendingAction.detourStep) || 0;
      const stop = localRoadblock.detourStops?.[detourStep];
      if (!stop) return;
      const challengeId = stop.challenges?.[0]?.id || null;
      setIsCarDriving(false);
      setRemainingMoves(0);
      setLocalRoadblock({ ...localRoadblock, status: 'detourChallenge', detourStep });
      setCurrentChallenge({
        ...getChallengeForStop(0, [stop], challengeId),
        markerPosition: stop.position,
        isDetour: true,
      });
      setState('challenge');
      return;
    }

    const hasFinishedRoute = landedLeg >= routeModel.finalStopIndex;
    const finishPosition = hasFinishedRoute ? getFinishPosition(teamProgress) : null;
    const previousProgress = teamProgress[pieceId] || {};
    const challengePoints = Number(previousProgress.challengePoints) || 0;
    const nextTeamProgress = {
      ...teamProgress,
      [pieceId]: {
        ...previousProgress,
        currentLeg: hasFinishedRoute ? routeModel.finalStopIndex : landedLeg,
        isDone: hasFinishedRoute,
        challengePoints,
        score: getTeamScore({ challengePoints, currentLeg: landedLeg, finishPosition }),
        finishPosition,
      },
    };
    setTeamProgress(nextTeamProgress);
    setIsCarDriving(false);
    setMovingPieceId(null);
    setRemainingMoves(0);
    setLocalMovementPath(null);
    setLocalPendingAction(null);
    setLocalRoadblock(null);

    const nextActiveTeamIndex = getNextActiveTeamIndex(gamePieces, nextTeamProgress, activeTeamIndex);
    if (hasFinishedRoute && !activeDevDrive) {
      if (nextActiveTeamIndex === null) {
        setState('done');
        return;
      }
      setLastRoll(null);
      setActiveTeamIndex(nextActiveTeamIndex);
      setLocalTurnNumber((turn) => turn + 1);
      setState('waiting');
      return;
    }

    const challengeSeed = `local-${Date.now()}-${Math.random()}`;
    setCurrentChallenge(
      createLocalChallenge(landedLeg, pieceId, challengeSeed, {
        fromLeg: moveStartLeg,
        currentTeamProgress: teamProgress,
        forceType: forcedChallengeType,
      })
    );
    setState('challenge');
  };

  const startDevDriveToStop = (stopIndex, forceType = null) => {
    if (multiplayerEnabled) return;

    const currentActivePiece = gamePieces[activeTeamIndex] || gamePieces[0];
    if (!currentActivePiece) return;

    const targetLeg = Math.min(Math.max(1, stopIndex), routeModel.finalStopIndex);
    const currentProgress = teamProgress[currentActivePiece.id] || { currentLeg: 0, isDone: false };
    const currentLeg = currentProgress.currentLeg ?? 0;

    const startLeg = currentLeg < targetLeg ? currentLeg : Math.max(0, targetLeg - 1);

    if (startLeg === targetLeg) {
      setIsDevDrive(false);
      devForceChallengeTypeRef.current = null;
      const challengeSeed = `dev-${Date.now()}-${Math.random()}`;
      setCurrentChallenge(
        createLocalChallenge(targetLeg, currentActivePiece.id, challengeSeed, {
          fromLeg: startLeg,
          currentTeamProgress: teamProgress,
          forceType,
        })
      );
      setState('challenge');
      return;
    }

    devForceChallengeTypeRef.current = forceType;
    setIsDevDrive(true);

    setTeamProgress((previous) => ({
      ...previous,
      [currentActivePiece.id]: {
        ...(previous[currentActivePiece.id] || {}),
        currentLeg: startLeg,
        isDone: false,
      },
    }));

    activeCarProgressRef.current = routeModel.stopProgress[startLeg] ?? 0;
    setLastRoll(targetLeg - startLeg);
    setMoveStartLeg(startLeg);
    setPassedLeg(startLeg);
    setIsCarDriving(false);
    setRemainingMoves(targetLeg - startLeg);
    setMovingPieceId(currentActivePiece.id);
    setMoveStartDelay(0);
    setMoveTargets((previousTargets) => ({
      ...previousTargets,
      [currentActivePiece.id]: targetLeg,
    }));
    setCurrentChallenge(null);
    setState('moving');
  };

  const handleSkipChallenge = () => {
    if (multiplayerEnabled) {
      if (multiplayer.gameplay?.phase === 'challenge') {
        multiplayer.completeChallenge({ force: true }).catch((error) => {
          console.log('Unable to skip synchronized challenge', error);
        });
        return;
      }
      if (
        multiplayer.gameplay?.phase === 'roadblock'
        && multiplayer.gameplay?.roadblock?.status === 'challenge'
      ) {
        multiplayer.resolveRoadblock('completed').catch((error) => {
          console.log('Unable to skip synchronized roadblock challenge', error);
        });
        return;
      }
      return;
    }

    if (state === 'challenge' || currentChallenge) {
      handleChallengeComplete();
      return;
    }
    if (state === 'roadblock' && localRoadblock?.status === 'challenge') {
      handleRoadblockAction('completed');
    }
  };

  const stableDevDriveToStop = useLatestCallback(startDevDriveToStop);
  const requestRollRef = useRef(requestRoll);
  requestRollRef.current = requestRoll;
  const handleRestartRef = useRef(handleRestart);
  handleRestartRef.current = handleRestart;
  const handleSkipChallengeRef = useRef(handleSkipChallenge);
  handleSkipChallengeRef.current = handleSkipChallenge;
  const activeProgressRef = useRef(activeProgress);
  activeProgressRef.current = activeProgress;
  const routeModelRef = useRef(routeModel);
  routeModelRef.current = routeModel;

  useEffect(() => {
    if (Platform.OS !== 'web' || multiplayerEnabled) return undefined;
    return subscribeCountryStops(
      (authoredStops) => {
        setDevRouteStops((currentStops) => {
          if (currentStops?.length >= 2) {
            return mergeRouteStopsWithCatalogue(currentStops, authoredStops);
          }
          if (gameData?.routeStops) {
            return mergeRouteStopsWithCatalogue(
              resolveGameRouteStops(gameData),
              authoredStops
            );
          }
          return getStopsForDuration(authoredStops, gameData?.duration || 'long');
        });
      },
      (error) => {
        console.warn('Unable to subscribe to authored country stops:', error);
      }
    );
  }, [gameData?.duration, multiplayerEnabled]);

  useEffect(() => {
    const unsubRoll = devEventBus.on('dev:forceRoll', ({ value }) => {
      requestRollRef.current?.(value, 'shortcut');
    });
    const unsubChallenge = devEventBus.on('dev:testChallenge', ({ stopIndex, forceType }) => {
      if (multiplayerEnabled) return;
      stableDevDriveToStop(stopIndex, forceType || null);
    });
    const unsubSkipChallenge = devEventBus.on('dev:skipChallenge', () => {
      handleSkipChallengeRef.current?.();
    });
    const unsubSpawnRoadblock = devEventBus.on('dev:spawnRoadblock', (data = {}) => {
      const activeModel = routeModelRef.current;
      const currentLeg = activeProgressRef.current?.currentLeg ?? 0;
      const leg = data.legIndex ?? Math.min(currentLeg + 1, activeModel.finalStopIndex);
      const newRoadblock = createRoadblockOnRoute(activeModel, leg, data.progressAlongLeg ?? 0.5, data);
      setRoadblocks((prev) => {
        const filtered = prev.filter((r) => r.id !== newRoadblock.id);
        return [...filtered, newRoadblock];
      });
    });
    const unsubTestRoadblock = devEventBus.on('dev:testRoadblock', () => {
      if (multiplayerEnabled) return;
      devForceRoadblockRef.current = true;
      requestRollRef.current?.(1, 'shortcut');
    });
    const unsubClearRoadblocks = devEventBus.on('dev:clearRoadblocks', () => {
      setRoadblocks([]);
    });
    const unsubToggleRoadblock = devEventBus.on('dev:toggleRoadblock', (data = {}) => {
      const activeModel = routeModelRef.current;
      const currentLeg = activeProgressRef.current?.currentLeg ?? 0;
      const leg = data.legIndex ?? Math.min(currentLeg + 1, activeModel.finalStopIndex);
      const targetId = `roadblock-leg-${leg}`;
      setRoadblocks((prev) => {
        const exists = prev.some((r) => r.id === targetId);
        if (exists) {
          return prev.filter((r) => r.id !== targetId);
        }
        return [...prev, createRoadblockOnRoute(activeModel, leg, data.progressAlongLeg ?? 0.5, data)];
      });
    });
    const unsubPlacement = devEventBus.on('dev:beginCountryPlacement', (request) => {
      if (Platform.OS !== 'web' || multiplayerEnabled) return;
      setDevRouteStops((current) => {
        if (current?.length >= 2 && request.countryStops?.length >= 2) {
          const currentById = new Map(current.map((stop) => [stop.id, stop]));
          return request.countryStops.map((stop) => {
            const existing = currentById.get(stop.id);
            if (existing && (Number(existing.updatedAt) || 0) >= (Number(stop.updatedAt) || 0)) {
              return existing;
            }
            return stop;
          });
        }
        return request.countryStops || current || null;
      });
      setPlacementRequest(request);
      setPlacementPosition(null);
    });
    const unsubRestart = devEventBus.on('dev:restart', () => {
      setRoadblocks([]);
      handleRestartRef.current?.();
    });
    return () => {
      unsubRoll();
      unsubChallenge();
      unsubSkipChallenge();
      unsubSpawnRoadblock();
      unsubTestRoadblock();
      unsubClearRoadblocks();
      unsubToggleRoadblock();
      unsubPlacement();
      unsubRestart();
    };
  }, [multiplayerEnabled, routeStops, stableDevDriveToStop]);

  const handleMapPointSelected = async (point) => {
    if (!placementRequest || !point) return;
    const position = {
      x: Number(point.x.toFixed(2)),
      y: Number(point.y.toFixed(2)),
    };
    if (placementRequest.mode === 'move' && placementRequest.stop?.id) {
      const stopId = placementRequest.stop.id;
      const updatedAt = Date.now();
      setDevRouteStops((current) => {
        const baseStops = current?.length >= 2 ? current : routeStops;
        return baseStops.map((stop) => (
          stop.id === stopId
            ? { ...stop, position, positionVersion: COUNTRY_POSITION_VERSION, updatedAt }
            : stop
        ));
      });
      setPlacementRequest(null);
      try {
        await updateCountryStop(stopId, { position, positionVersion: COUNTRY_POSITION_VERSION, updatedAt });
      } catch (saveError) {
        console.warn('Unable to persist updated country stop position:', saveError);
      }
      return;
    }
    setPlacementPosition(position);
  };

  const stableDiceRollStart = useLatestCallback(handleDiceRollStart);
  const stableBoardDiceRoll = useLatestCallback(handleBoardDiceRoll);
  const stableDriveStart = useLatestCallback(handleDriveStart);
  const stableLegPass = useLatestCallback(handleLegPass);
  const stableMoveComplete = useLatestCallback(handleMoveComplete);
  const roadblockEvent = multiplayerEnabled ? multiplayer.gameplay?.roadblock : localRoadblock;
  const movementPath = multiplayerEnabled
    ? multiplayer.gameplay?.currentAction?.movementPath
    : localMovementPath;
  const movementRouteModel = useMemo(
    () => movementPath?.stops?.length >= 2 ? createRouteModel(movementPath.stops) : null,
    [movementPath]
  );
  const detourPreviewPath = useMemo(() => (
    roadblockEvent?.detourStops?.length
      ? createRoadblockMovementPath({ event: roadblockEvent, routeModel, type: 'detour' })
      : null
  ), [roadblockEvent, routeModel]);
  const detourPreviewModel = useMemo(
    () => detourPreviewPath?.stops?.length >= 2 ? createRouteModel(detourPreviewPath.stops) : null,
    [detourPreviewPath]
  );
  const liveRoadblock = useMemo(() => (
    roadblockEvent && roadblockEvent.choice !== 'challenge'
      ? createRoadblockOnRoute(
          routeModel,
          roadblockEvent.obstacleLeg || Math.min(roadblockEvent.fromLeg + 1, roadblockEvent.targetLeg),
          roadblockEvent.progressAlongLeg ?? 0.48,
          { id: roadblockEvent.id, detourDirection: 'both' }
        )
      : null
  ), [roadblockEvent, routeModel]);
  const visibleRoadblocks = useMemo(
    () => liveRoadblock ? [...roadblocks.filter((item) => item.id !== liveRoadblock.id), liveRoadblock] : roadblocks,
    [liveRoadblock, roadblocks]
  );
  const focusedPiece = activePiece || getFocusedPiece(gamePieces, teamProgress);
  const focusedProgress = teamProgress[focusedPiece?.id] || { currentLeg: 0, isDone: false };
  const currentLeg = focusedProgress.currentLeg;
  const moveTargetLeg = state === 'moving'
    ? (moveTargets[activePiece?.id] ?? currentLeg)
    : null;
  const pathRevealDuration = isDevDrive
    ? 0.25
    : getPathRevealDuration(
        movementRouteModel
          ? movementRouteModel.finalStopIndex
          : (moveTargetLeg !== null ? Math.max(0, moveTargetLeg - moveStartLeg) : 0)
      );
  const cameraMode = state === 'moving' && isCarDriving ? 'follow' : 'done';
  const parkAtMovementEnd = state === 'challenge'
    && roadblockEvent?.choice === 'detour'
    && roadblockEvent.status === 'detourChallenge';
  const targetRef = pieceRefs.current[focusedPiece?.id];
  const hudCurrentLeg = state === 'moving' ? passedLeg : currentLeg;
  const fromName = routeModel.stopNames[hudCurrentLeg];
  const toName = routeModel.stopNames[Math.min(
    state === 'moving' && moveTargetLeg !== null ? moveTargetLeg : hudCurrentLeg + 1,
    routeModel.stopNames.length - 1
  )];
  const progress = `${currentLeg + 1} / ${routeModel.finalStopIndex + 1}`;
  const canRoll = state === 'waiting'
    && !activeProgress.isDone
    && (!multiplayerEnabled || (multiplayer.canControlTurn && multiplayer.isConnected));
  const movingStop = placementRequest?.mode === 'move' ? placementRequest.stop : null;
  const movingStopIndex = movingStop
    ? routeStops.findIndex((stop) => stop.id === movingStop.id)
    : -1;

  return (
    <View style={styles.container}>
      <GameScene
        activeCarProgressRef={activeCarProgressRef}
        activeTeamColor={activePiece?.color}
        cameraMode={cameraMode}
        canvasStyle={styles.canvas}
        currentLeg={currentLeg}
        diceEnabled={canRoll && !placementRequest}
        diceVisible={!placementRequest}
        driving={state === 'moving'}
        lowPower={state === 'challenge'}
        gamePieces={gamePieces}
        moveFromLeg={moveStartLeg}
        moveStartDelay={moveStartDelay}
        moveTargetLeg={moveTargetLeg ?? currentLeg}
        movingMarkerIndex={movingStopIndex}
        movingMarkerStop={movingStop}
        movingPieceId={movingPieceId}
        moveTargets={moveTargets}
        movementRouteModel={movementRouteModel}
        parkAtMovementEnd={parkAtMovementEnd}
        onDiceRollStart={stableDiceRollStart}
        onDiceRoll={stableBoardDiceRoll}
        onDriveStart={stableDriveStart}
        onLegPass={stableLegPass}
        onMoveComplete={stableMoveComplete}
        pathRevealDuration={pathRevealDuration}
        placementActive={Boolean(placementRequest) && !placementPosition}
        onMapPointSelected={handleMapPointSelected}
        pieceRefs={pieceRefs.current}
        roadblocks={visibleRoadblocks}
        detourPreviewModel={detourPreviewModel}
        detourPreviewSelected={roadblockEvent?.choice === 'detour'}
        showDetourPreview={Boolean(roadblockEvent && state === 'roadblock')}
        rollAction={multiplayerEnabled ? multiplayer.gameplay?.currentAction : null}
        targetRef={targetRef}
        teamProgress={teamProgress}
        routeModel={routeModel}
        vehicleInMotion={isCarDriving}
      />

      <GameHud
        activeTeamLabel={activePiece?.label}
        activeTeamScore={activeProgress.score || 0}
        canRestart={!multiplayerEnabled || multiplayer.isHost}
        fromName={fromName}
        lastRoll={lastRoll}
        onRestart={handleRestart}
        progress={progress}
        remainingMoves={remainingMoves}
        state={state}
        gamePieces={gamePieces}
        teamProgress={teamProgress}
        toName={toName}
      />
      <RaceProgressTracker
        activeTeamId={activePiece?.id}
        canRoll={canRoll}
        gamePieces={gamePieces}
        isConnected={!multiplayerEnabled || multiplayer.isConnected}
        onRoll={() => requestRoll()}
        routeModel={routeModel}
        teamProgress={teamProgress}
        visible={state === 'waiting' && (!multiplayerEnabled || !multiplayer.isLoading)}
      />
      <RoadblockOverlay
        canChoose={!multiplayerEnabled || multiplayer.canControlTurn}
        event={roadblockEvent}
        getNow={multiplayerEnabled ? multiplayer.serverNow : Date.now}
        onAction={handleRoadblockAction}
        teamLabel={activePiece?.label}
        visible={state === 'roadblock'}
      />
      <ChallengePopup
        canComplete={!multiplayerEnabled || multiplayer.canControlTurn}
        challenge={currentChallenge}
        gamePieces={gamePieces}
        getNow={multiplayerEnabled ? multiplayer.serverNow : Date.now}
        isTeamLeader={!multiplayerEnabled || multiplayer.isTeamLeader}
        localTeamId={multiplayerEnabled ? multiplayer.localTeamId : activePiece?.id}
        multiplayerEnabled={multiplayerEnabled}
        teamLabel={activePiece?.label}
        visible={state === 'challenge'}
        onChallengeAction={handleCountryWordAction}
        onComplete={handleChallengeComplete}
        pieceRefs={pieceRefs.current}
        routeModel={routeModel}
      />
      {placementRequest && (
        <CountryStopPlacementForm
          mode={placementRequest.mode}
          position={placementPosition}
          stop={placementRequest.stop}
          onCancel={() => {
            setPlacementRequest(null);
            setPlacementPosition(null);
          }}
          onSaved={(newStop) => {
            if (newStop) setDevRouteStops((current) => [
              ...(current?.length >= 2 ? current : routeStops),
              newStop,
            ]);
            setPlacementRequest(null);
            setPlacementPosition(null);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#223144' },
  canvas: { flex: 1, backgroundColor: 'transparent' },
});

export default GameScreen;
