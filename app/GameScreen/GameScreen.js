import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { onValue, ref } from 'firebase/database';
import { db } from '../../firebaseConfig';
import ChallengePopup from './components/ChallengePopup';
import GameOnboarding from './components/GameOnboarding';
import GameHud from './components/GameHud';
import GameScene from './components/GameScene';
import RaceProgressTracker from './components/RaceProgressTracker';
import RoadblockOverlay from './components/RoadblockOverlay';
import TurnHandoff from './components/TurnHandoff';
import {
  COUNTRY_WORD_CHALLENGE_TYPE,
  didTriggerRoadsideDuel,
  GEO_GUESSR_CHALLENGE_TYPE,
  getChallengeForStop,
  getChallengeIdForStop,
  getChallengeKey,
  getCountryWordRound,
  getGeoGuessrRound,
  getResolvedPenaltySips,
  getTeamPlayers,
  getTargetCursorKey,
  getTargetedChallengeRound,
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
import {
  addDrinksByRule,
  addDrinksToPlayer,
  addDrinksToTeam,
  createPlayerDrinkLedger,
} from './drinkLedger';
import { getPathRevealDuration, createRouteModel } from './constants/route';
import {
  createRoadblockEvent,
  createRoadblockDetourSegment,
  createRoadblockMovementPath,
  createRoadblockOnRoute,
  createRoadblockRouteModel,
  getDetourDirection,
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
  getFreshRouteSnapshotForDuration,
  subscribeCountryStops,
  updateCountryStop,
} from './services/countryStopsService';
import CountryStopPlacementForm from './components/CountryStopPlacementForm';
import ConnectionOverlay from './components/ConnectionOverlay';
import { getFinishPosition, getTeamScore } from './gameplayState';
import {
  getDiceTimingMultiplier,
  getRoomRules,
  resolveTimerSeconds,
} from './constants/roomRules';
import {
  completeGameplayOnboarding,
  DEFAULT_SETTINGS,
  getSettings,
  hasCompletedGameplayOnboarding,
} from '../shared/storage/userSettings';
import useGameFeedback from './hooks/useGameFeedback';

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

const GameScreen = ({ navigation, route }) => {
  const gameData = route?.params?.gameData || EMPTY_GAME_DATA;
  const roomRules = useMemo(() => getRoomRules(gameData), [gameData?.roomRules]);
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
  const [multiplayerRouteStops, setMultiplayerRouteStops] = useState(null);
  const [placementRequest, setPlacementRequest] = useState(null);
  const [placementPosition, setPlacementPosition] = useState(null);
  const [isDevDrive, setIsDevDrive] = useState(false);
  const [roadblocks, setRoadblocks] = useState([]);
  const [localRoadblock, setLocalRoadblock] = useState(null);
  const [localPendingAction, setLocalPendingAction] = useState(null);
  const [localMovementPath, setLocalMovementPath] = useState(null);
  const [localTurnNumber, setLocalTurnNumber] = useState(1);
  const [localSettings, setLocalSettings] = useState(DEFAULT_SETTINGS);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const activeCarProgressRef = useRef(0);
  const visualActionIdRef = useRef(null);
  const multiplayerSessionIdRef = useRef(null);
  const usedMonumentIdsRef = useRef([]);
  const usedChallengeKeysRef = useRef([]);
  const targetCursorsRef = useRef({});
  const devForceChallengeTypeRef = useRef(null);
  const localRoadblockHistoryRef = useRef([]);
  const feedbackEventRef = useRef({ dice: null, challenge: null, movement: null, result: null, roadblock: null, victory: null });
  const feedback = useGameFeedback(localSettings);
  const routeStops = useMemo(
    () => devRouteStops || multiplayerRouteStops || resolveGameRouteStops(gameData),
    [devRouteStops, gameData?.duration, gameData?.routeStops, multiplayerRouteStops]
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
    createInitialTeamProgress(getGamePiecesForGame(gameData), teamMembers)
  ));
  const pieceRefs = useRef({});
  const multiplayer = useMultiplayerGame({
    enabled: multiplayerEnabled,
    gameData,
    gameID,
    routeModel,
    teamMembers,
  });
  const currentTeamMembers = multiplayerEnabled ? multiplayer.teamMembers : teamMembers;

  gamePieces.forEach((piece) => {
    if (!pieceRefs.current[piece.id]) pieceRefs.current[piece.id] = React.createRef();
  });

  useEffect(() => {
    let active = true;
    Promise.all([getSettings(), hasCompletedGameplayOnboarding()]).then(([settings, completed]) => {
      if (!active) return;
      setLocalSettings(settings);
      setShowOnboarding(!completed);
    });
    return () => { active = false; };
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    completeGameplayOnboarding();
  }, []);

  useEffect(() => {
    setDevRouteStops(null);
    setPlacementRequest(null);
    setPlacementPosition(null);
  }, [gameData]);

  useEffect(() => {
    if (!multiplayerEnabled) {
      setMultiplayerRouteStops(null);
      return undefined;
    }

    return onValue(ref(db, `games/${gameID}/routeStops`), (snapshot) => {
      if (snapshot.exists()) setMultiplayerRouteStops(snapshot.val());
    });
  }, [gameID, multiplayerEnabled]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => ScreenOrientation.unlockAsync();
  }, []);

  useEffect(() => {
    const sessionId = multiplayer.gameplay?.sessionId;
    if (!multiplayerEnabled || !sessionId || multiplayerSessionIdRef.current === sessionId) return;

    multiplayerSessionIdRef.current = sessionId;
    activeCarProgressRef.current = 0;
    visualActionIdRef.current = null;
    feedbackEventRef.current = { dice: null, challenge: null, movement: null, result: null, roadblock: null, victory: null };
    setLastRoll(null);
    setRemainingMoves(0);
    setMovingPieceId(null);
    setMoveStartDelay(0);
    setMoveStartLeg(0);
    setPassedLeg(0);
    setIsCarDriving(false);
    setMoveTargets({});
    setCurrentChallenge(null);
    setRoadblocks([]);
  }, [multiplayer.gameplay?.sessionId, multiplayerEnabled]);

  useEffect(() => {
    if (multiplayerEnabled) return;

    activeCarProgressRef.current = 0;
    usedMonumentIdsRef.current = [];
    usedChallengeKeysRef.current = [];
    targetCursorsRef.current = {};
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
    setTeamProgress(createInitialTeamProgress(baseGamePieces, currentTeamMembers));
  }, [baseGamePieces, currentTeamMembers, multiplayerEnabled]);

  useEffect(() => {
    if (!multiplayerEnabled || !multiplayer.gameplay) return;

    const gameplay = multiplayer.gameplay;
    const nextActiveIndex = Math.max(
      gamePieces.findIndex((piece) => piece.id === gameplay.activeTeamId),
      0
    );
    const action = gameplay.currentAction;

    setActiveTeamIndex(nextActiveIndex);
    setTeamProgress(gameplay.teamProgress || createInitialTeamProgress(gamePieces, currentTeamMembers));

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
      activeCarProgressRef.current = action.roadblockChoice === 'detour'
        ? 0
        : (routeModel.stopProgress[action.fromLeg] ?? 0);
      setLastRoll(action.value);
      setMoveStartLeg(action.fromLeg);
      setPassedLeg(action.fromLeg);
      setIsCarDriving(false);
      setRemainingMoves(action.roadblockChoice === 'detour'
        ? Math.max(1, (Number(action.detourStep) || 0) - (Number(action.detourStartStep) || 0))
        : action.targetLeg - action.fromLeg);
      setMovingPieceId(action.teamId);
      setMoveStartDelay(
        action.roadblockChoice && action.detourStartStep === undefined
          ? 0
          : Math.max(0, (Number(action.movementStartsAt) - multiplayer.serverNow()) / 1000)
      );
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
      const challenge = getChallengeForStop(
        challengeStopIndex,
        challengeStops,
        gameplay.challengeId
      );
      setCurrentChallenge({
        ...challenge,
        ...(Number.isFinite(Number(challenge.durationSeconds))
          ? {
              durationSeconds: resolveTimerSeconds(
                challenge.durationSeconds,
                roomRules.challengeTimerPace
              ),
            }
          : {}),
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
  }, [
    gamePieces,
    multiplayer.gameplay,
    multiplayerEnabled,
    roomRules.challengeTimerPace,
    routeModel,
    routeStops,
  ]);

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

  useEffect(() => {
    const actionId = multiplayerEnabled
      ? multiplayer.gameplay?.currentAction?.id
      : (lastRoll === null ? null : `local:${localTurnNumber}:${lastRoll}`);
    if (!actionId || feedbackEventRef.current.dice === actionId) return;
    feedbackEventRef.current.dice = actionId;
    feedback.dice();
  }, [feedback, lastRoll, localTurnNumber, multiplayer.gameplay?.currentAction?.id, multiplayerEnabled]);

  useEffect(() => {
    if (state !== 'challenge' || !currentChallenge) return;
    const challengeKey = `${multiplayerEnabled ? multiplayer.gameplay?.turnNumber : localTurnNumber}:${currentChallenge.id}`;
    if (feedbackEventRef.current.challenge !== challengeKey) {
      feedbackEventRef.current.challenge = challengeKey;
      feedback.challenge();
    }
    if (currentChallenge.stage === 'result' && feedbackEventRef.current.result !== challengeKey) {
      feedbackEventRef.current.result = challengeKey;
      feedback.result();
    }
  }, [currentChallenge, feedback, localTurnNumber, multiplayer.gameplay?.turnNumber, multiplayerEnabled, state]);

  useEffect(() => {
    if (state !== 'moving') return;
    const actionId = multiplayerEnabled
      ? multiplayer.gameplay?.currentAction?.id
      : localPendingAction?.id;
    if (!actionId || feedbackEventRef.current.movement === actionId) return;
    feedbackEventRef.current.movement = actionId;
    feedback.movement();
  }, [feedback, localPendingAction?.id, multiplayer.gameplay?.currentAction?.id, multiplayerEnabled, state]);

  const createLocalChallenge = (
    stopIndex,
    pieceId,
    seed,
    { fromLeg = 0, currentTeamProgress = teamProgress, forceType = null } = {}
  ) => {
    const stop = routeStops[stopIndex];
    const players = getTeamPlayers(currentTeamMembers, pieceId);
    const isRoadsideDuel = didTriggerRoadsideDuel({
      fromLeg,
      targetLeg: stopIndex,
      teamId: pieceId,
      teamProgress: currentTeamProgress,
    });
    const effectiveForceType = forceType || (isRoadsideDuel ? GEO_GUESSR_CHALLENGE_TYPE : null);
    const challengeId = getChallengeIdForStop(stop, seed, {
      teamPlayerCount: Math.max(players.length, 1),
      forceType: effectiveForceType,
      usedChallengeKeys: usedChallengeKeysRef.current,
    });
    const challenge = getChallengeForStop(stopIndex, routeStops, challengeId);
    const challengeKey = getChallengeKey(stop, challengeId);
    if (challengeKey) {
      usedChallengeKeysRef.current = [...new Set([...usedChallengeKeysRef.current, challengeKey])];
    }

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
        difficulty: gameData?.difficulty,
        timerPace: roomRules.challengeTimerPace,
      });
      if (geoData) {
        usedMonumentIdsRef.current = geoData.nextUsedMonumentIds;
        return {
          ...challenge,
          ...geoData.round,
        };
      }
    }

    const role = challenge.targeting?.role;
    const cursorKey = role ? getTargetCursorKey(pieceId, role) : null;
    const challengeRound = challenge.type === COUNTRY_WORD_CHALLENGE_TYPE
      ? getCountryWordRound(
          challenge,
          players,
          seed,
          gameData?.difficulty,
          roomRules.challengeTimerPace,
          targetCursorsRef.current[getTargetCursorKey(pieceId, 'describer')]
        )
      : role
        ? getTargetedChallengeRound(
            challenge,
            players,
            targetCursorsRef.current[cursorKey],
            gameData?.difficulty
          )
        : null;
    if (challengeRound) {
      const resolvedCursorKey = getTargetCursorKey(pieceId, challengeRound.targetRole);
      targetCursorsRef.current[resolvedCursorKey] = (Number(targetCursorsRef.current[resolvedCursorKey]) || 0) + 1;
    }

    return {
      ...challenge,
      ...(Number.isFinite(Number(challenge.durationSeconds))
        ? {
            durationSeconds: resolveTimerSeconds(
              challenge.durationSeconds,
              roomRules.challengeTimerPace
            ),
          }
        : {}),
      ...(challengeRound || {}),
    };
  };

  const resetLocalGame = () => {
    activeCarProgressRef.current = 0;
    usedMonumentIdsRef.current = [];
    usedChallengeKeysRef.current = [];
    targetCursorsRef.current = {};
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
    setTeamProgress(createInitialTeamProgress(gamePieces, currentTeamMembers));
  };

  const handleRematch = async () => {
    if (multiplayerEnabled) {
      multiplayer.rematch().catch((error) => console.log('Unable to start rematch', error));
      return;
    }
    setDevRouteStops(await getFreshRouteSnapshotForDuration(
      gameData?.duration || 'long',
      routeStops
    ));
    resetLocalGame();
  };

  const returnHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }, [navigation]);

  const handleLeaveGame = useCallback(() => {
    const hostMessage = multiplayerEnabled && multiplayer.isHost
      ? 'The room will report that the host disconnected. Transfer host first if the group should keep playing.'
      : 'You can rejoin with the same room code and this device to restore the current game.';
    Alert.alert('Leave game?', hostMessage, [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave Game',
        style: 'destructive',
        onPress: async () => {
          if (multiplayerEnabled) await multiplayer.leaveGame().catch(() => {});
          returnHome();
        },
      },
    ]);
  }, [multiplayer, multiplayerEnabled, returnHome]);

  const handleTransferHost = useCallback(async (nextHostDeviceID) => {
    try {
      const transferred = await multiplayer.transferHost(nextHostDeviceID);
      if (!transferred) {
        Alert.alert('Could not transfer host', 'That team leader is no longer connected.');
      }
      return transferred;
    } catch (error) {
      console.log('Unable to transfer host', error);
      Alert.alert('Could not transfer host', 'Check your connection and try again.');
      return false;
    }
  }, [multiplayer]);

  const handleReplaceLeader = useCallback(async (replacement) => {
    try {
      const replaced = await multiplayer.replaceTeamLeader(replacement);
      if (!replaced) {
        Alert.alert('Could not replace leader', 'That player is no longer connected.');
      }
      return replaced;
    } catch (error) {
      console.log('Unable to replace team leader', error);
      Alert.alert('Could not replace leader', 'Check your connection and try again.');
      return false;
    }
  }, [multiplayer]);

  const handleChallengeComplete = () => {
    if (multiplayerEnabled) {
      multiplayer.completeChallenge().catch((error) => {
        console.log('Unable to complete synchronized challenge', error);
      });
      return;
    }

    if (localRoadblock?.choice === 'detour' && localRoadblock.status === 'detourChallenge') {
      const activeProgressForDetour = teamProgress[activePiece.id] || {};
      const nextTeamProgress = {
        ...teamProgress,
        [activePiece.id]: {
          ...activeProgressForDetour,
          detour: {
            ...(activeProgressForDetour.detour || localRoadblock),
            status: 'pending',
          },
        },
      };
      const nextActiveTeamIndex = getNextActiveTeamIndex(
        gamePieces,
        nextTeamProgress,
        activeTeamIndex
      );
      setTeamProgress(nextTeamProgress);
      setCurrentChallenge(null);
      setLocalMovementPath(null);
      setLocalPendingAction(null);
      setLocalRoadblock(null);
      setMovingPieceId(null);
      setIsCarDriving(false);
      setLastRoll(null);
      if (nextActiveTeamIndex === null) {
        setState('done');
        return;
      }
      setActiveTeamIndex(nextActiveTeamIndex);
      setLocalTurnNumber((turn) => turn + 1);
      setState('waiting');
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

  const handleCancelAutoAdvance = () => {
    if (multiplayerEnabled) {
      multiplayer.cancelAutoAdvance().catch((error) => {
        console.log('Unable to cancel synchronized auto-advance', error);
      });
      return;
    }
    setCurrentChallenge((challenge) => challenge
      ? { ...challenge, autoAdvanceCancelled: true }
      : challenge);
  };

  const handleCountryWordAction = (action) => {
    if (multiplayerEnabled) {
      multiplayer.updateChallenge(action).catch((error) => {
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
          requiredTeamIds.forEach((teamId) => {
            if (!evaluation.winnerTeamIds.includes(teamId)) {
              const prev = next[teamId] || {};
              const playerDrinks = createPlayerDrinkLedger(
                currentTeamMembers,
                teamId,
                prev.playerDrinks,
                prev.drinks
              );
              next[teamId] = {
                ...prev,
                playerDrinks: addDrinksToTeam(
                  playerDrinks,
                  getResolvedPenaltySips(currentChallenge, gameData?.difficulty)
                ),
              };
              delete next[teamId].drinks;
            }
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
          drinkAwardId: `local:${localTurnNumber}:geo-penalty`,
          resultAt: Date.now(),
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
          requiredTeamIds.forEach((teamId) => {
            if (!evaluation.winnerTeamIds.includes(teamId)) {
              const prev = next[teamId] || {};
              const playerDrinks = createPlayerDrinkLedger(
                currentTeamMembers,
                teamId,
                prev.playerDrinks,
                prev.drinks
              );
              next[teamId] = {
                ...prev,
                playerDrinks: addDrinksToTeam(
                  playerDrinks,
                  getResolvedPenaltySips(currentChallenge, gameData?.difficulty)
                ),
              };
              delete next[teamId].drinks;
            }
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
          drinkAwardId: `local:${localTurnNumber}:geo-penalty`,
          resultAt: Date.now(),
        });
      }
      return;
    }

    if (currentChallenge.type !== COUNTRY_WORD_CHALLENGE_TYPE) {
      const ordinaryResult = String(actionType || '').toLowerCase();
      if (!['completed', 'failed'].includes(ordinaryResult) || currentChallenge.stage !== 'playing') {
        return;
      }
      const succeeded = ordinaryResult === 'completed';
      const drinkRule = succeeded
        ? currentChallenge.drinkRules?.success
        : currentChallenge.drinkRules?.failure;
      setTeamProgress((progress) => addDrinksByRule({
        amount: getResolvedPenaltySips(currentChallenge, gameData?.difficulty),
        playerId: currentChallenge.selectedPlayerId,
        rule: drinkRule,
        teamId: activePiece.id,
        teamMembers: currentTeamMembers,
        teamProgress: progress,
      }));
      setCurrentChallenge({
        ...currentChallenge,
        stage: 'result',
        result: ordinaryResult,
        resultActionId: `local:${localTurnNumber}:${ordinaryResult}`,
        drinkAwardId: drinkRule && drinkRule !== 'none'
          ? `local:${localTurnNumber}:${ordinaryResult}`
          : null,
      });
      return;
    }

    if ((actionType === 'start' || actionType === 'ready') && (currentChallenge.stage === 'intro' || currentChallenge.stage === 'secret')) {
      setCurrentChallenge({ ...currentChallenge, stage: 'playing', startedAt: Date.now() });
      return;
    }
    if (!['guessed', 'failed', 'timeout'].includes(actionType) || currentChallenge.stage !== 'playing') {
      return;
    }

    const guessed = actionType === 'guessed';
    const pointsAwarded = guessed ? (Number(currentChallenge.successPoints) || 10) : 0;
    const penaltySips = getResolvedPenaltySips(currentChallenge, gameData?.difficulty);
    if ((pointsAwarded || penaltySips) && activePiece?.id) {
      setTeamProgress((progress) => {
        const current = progress[activePiece.id] || {};
        const challengePoints = (Number(current.challengePoints) || 0) + pointsAwarded;
        const prevPlayerDrinks = createPlayerDrinkLedger(
          currentTeamMembers,
          activePiece.id,
          current.playerDrinks,
          current.drinks
        );
        const selectedPlayerId = currentChallenge.selectedPlayerId || getTeamPlayers(
          currentTeamMembers,
          activePiece.id
        ).find((player) => player.name === currentChallenge.selectedPlayerName)?.playerId;
        const withAward = addDrinksByRule({
          amount: penaltySips,
          playerId: selectedPlayerId,
          rule: guessed
            ? (currentChallenge.drinkRules?.success || 'teamExceptTarget')
            : (currentChallenge.drinkRules?.failure || 'target'),
          teamId: activePiece.id,
          teamMembers: currentTeamMembers,
          teamProgress: {
            ...progress,
            [activePiece.id]: {
              ...current,
              playerDrinks: prevPlayerDrinks,
            },
          },
        });
        const nextPlayerDrinks = withAward[activePiece.id]?.playerDrinks || prevPlayerDrinks;
        const { drinks: _legacyDrinks, ...currentWithoutLegacyTotal } = current;
        return {
          ...withAward,
          [activePiece.id]: {
            ...currentWithoutLegacyTotal,
            challengePoints,
            playerDrinks: nextPlayerDrinks,
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
      resultActionId: `local:${localTurnNumber}:${actionType}`,
      drinkAwardId: penaltySips > 0 ? `local:${localTurnNumber}:${actionType}` : null,
      resultAt: Date.now(),
    });
  };

  const handleAdjustDrinks = useCallback(({ teamId, delta = 1, playerId = null } = {}) => {
    if (!teamId || !Number.isFinite(Number(delta)) || Number(delta) === 0) return;

    if (multiplayerEnabled) {
      multiplayer.adjustDrinks({ teamId, delta, playerId }).catch((error) => {
        console.log('Unable to synchronize drink adjustment', error);
      });
      return;
    }

    const safeDelta = Math.round(Number(delta));
    setTeamProgress((progress) => {
      const prevTeam = progress[teamId];
      if (!prevTeam) return progress;

      const prevPlayerDrinks = createPlayerDrinkLedger(
        currentTeamMembers,
        teamId,
        prevTeam.playerDrinks,
        prevTeam.drinks
      );
      const nextPlayerDrinks = playerId
        ? addDrinksToPlayer(prevPlayerDrinks, playerId, safeDelta)
        : addDrinksToTeam(prevPlayerDrinks, safeDelta);
      if (JSON.stringify(nextPlayerDrinks) === JSON.stringify(prevPlayerDrinks)) return progress;
      const { drinks: _legacyDrinks, ...teamWithoutLegacyTotal } = prevTeam;

      return {
        ...progress,
        [teamId]: {
          ...teamWithoutLegacyTotal,
          playerDrinks: nextPlayerDrinks,
        },
      };
    });
  }, [currentTeamMembers, multiplayer, multiplayerEnabled]);

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

    if (activeProgress.detour) {
      const detour = activeProgress.detour;
      const startStep = Number(detour.step) || 0;
      const finalStep = (detour.detourStops?.length || 0) + 1;
      const targetStep = Math.min(startStep + safeValue, finalStep);
      const movementPath = createRoadblockDetourSegment({
        event: detour,
        routeModel,
        step: startStep,
        targetStep,
      });
      if (!movementPath) return;
      const detourAction = {
        ...action,
        fromLeg: detour.fromLeg,
        targetLeg: detour.targetLeg,
        roadblockChoice: 'detour',
        detourStartStep: startStep,
        detourStep: targetStep,
        detourSegmentType: targetStep >= finalStep ? 'destination' : 'waypoint',
      };
      activeCarProgressRef.current = 0;
      setLastRoll(safeValue);
      setMoveStartLeg(detour.fromLeg);
      setPassedLeg(detour.fromLeg);
      setIsCarDriving(false);
      setRemainingMoves(targetStep - startStep);
      setMovingPieceId(activePiece.id);
      setMoveStartDelay(resultDisplayDelay);
      setMoveTargets((previousTargets) => ({
        ...previousTargets,
        [activePiece.id]: detour.targetLeg,
      }));
      setLocalMovementPath(movementPath);
      setLocalPendingAction(detourAction);
      setLocalRoadblock({
        ...detour,
        status: 'travelling',
        choice: 'detour',
        detourStep: targetStep,
      });
      setState('moving');
      return;
    }

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
    if (shouldTriggerRoadblock({ action, gameplay: localGameplay })) {
      const event = createRoadblockEvent({
        action,
        routeModel,
        timerPace: roomRules.challengeTimerPace,
        turnNumber: localTurnNumber,
      });
      if (!event) {
        setLocalPendingAction(null);
        setLocalRoadblock(null);
        setState('moving');
        return;
      }
      localRoadblockHistoryRef.current = [...localRoadblockHistoryRef.current, {
        id: event.id,
        teamId: event.teamId,
        turnNumber: event.turnNumber,
      }].slice(-8);
      const roadblockAction = { ...action, targetLeg: event.targetLeg };
      setRemainingMoves(event.targetLeg - startLeg);
      setMoveTargets((previousTargets) => ({
        ...previousTargets,
        [activePiece.id]: event.targetLeg,
      }));
      setMovingPieceId(null);
      setLocalPendingAction(roadblockAction);
      setLocalRoadblock(event);
      setState('roadblock');
      return;
    }

    setLocalPendingAction(null);
    setLocalRoadblock(null);
    setState('moving');
  };

  const startLocalRoadblockTest = () => {
    if (
      !['waiting', 'rolling'].includes(state)
      || !activePiece
      || activeProgress.isDone
      || activeProgress.detour
    ) return;

    const currentLeg = activeProgress.currentLeg;
    const targetLeg = Math.min(currentLeg + 1, routeModel.finalStopIndex);
    if (targetLeg <= currentLeg) return;
    const action = {
      id: `local-roadblock-test-${currentLeg}-${Date.now()}`,
      type: 'roll',
      teamId: activePiece.id,
      value: 1,
      fromLeg: currentLeg,
      targetLeg,
      finalStopIndex: routeModel.finalStopIndex,
    };
    const event = createRoadblockEvent({
      action,
      allowFallbackDetour: true,
      routeModel,
      timerPace: roomRules.challengeTimerPace,
      turnNumber: localTurnNumber,
    });
    if (!event) return;

    activeCarProgressRef.current = routeModel.stopProgress[currentLeg] ?? 0;
    setLastRoll(action.value);
    setMoveStartLeg(currentLeg);
    setPassedLeg(currentLeg);
    setIsCarDriving(false);
    setRemainingMoves(1);
    setMovingPieceId(null);
    setMoveStartDelay(0);
    setMoveTargets((previous) => ({ ...previous, [activePiece.id]: action.targetLeg }));
    setLocalMovementPath(null);
    setLocalPendingAction(action);
    setLocalRoadblock(event);
    setState('roadblock');
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

    const takesDetour = choice === 'detour' || choice === 'timeout';
    const brokeThrough = choice === 'completed' && localRoadblock.status === 'challenge';
    if (!takesDetour && !brokeThrough) return;

    const resolvedAt = Date.now();
    const nextTeamProgress = takesDetour
      ? {
          ...teamProgress,
          [localPendingAction.teamId]: {
            ...teamProgress[localPendingAction.teamId],
            detour: {
              ...localRoadblock,
              status: 'pending',
              choice: 'detour',
              step: 0,
              detourStep: 0,
              resolvedAt,
            },
          },
        }
      : teamProgress;
    const nextActiveTeamIndex = getNextActiveTeamIndex(
      gamePieces,
      nextTeamProgress,
      activeTeamIndex
    );
    setTeamProgress(nextTeamProgress);
    setLastRoll(null);
    setRemainingMoves(0);
    setMovingPieceId(null);
    setLocalMovementPath(null);
    setLocalPendingAction(null);
    setLocalRoadblock(null);
    if (nextActiveTeamIndex === null) {
      setState('done');
      return;
    }
    setActiveTeamIndex(nextActiveTeamIndex);
    setLocalTurnNumber((turn) => turn + 1);
    setState('waiting');
  };

  const requestRoll = async (value = rollDice(), inputMethod = 'shortcut') => {
    if (!multiplayerEnabled) {
      startLocalRoll(value, inputMethod === 'boardDice'
        ? (DICE_RESULT_DURATION + DICE_RESULT_EXIT_BUFFER) * getDiceTimingMultiplier(roomRules)
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
      const stop = localRoadblock.detourStops?.[detourStep - 1];
      if (!stop) return;
      const detourPlayers = getTeamPlayers(currentTeamMembers, pieceId);
      const challengeId = getChallengeIdForStop(stop, `detour:${localTurnNumber}:${pieceId}`, {
        teamPlayerCount: Math.max(detourPlayers.length, 1),
        usedChallengeKeys: usedChallengeKeysRef.current,
      });
      const challengeKey = getChallengeKey(stop, challengeId);
      if (challengeKey) {
        usedChallengeKeysRef.current = [...new Set([...usedChallengeKeysRef.current, challengeKey])];
      }
      const detourChallenge = getChallengeForStop(0, [stop], challengeId);
      const targetRole = detourChallenge.targeting?.role;
      const cursorKey = targetRole ? getTargetCursorKey(pieceId, targetRole) : null;
      const detourRound = detourChallenge.type === COUNTRY_WORD_CHALLENGE_TYPE
        ? getCountryWordRound(
            detourChallenge,
            detourPlayers,
            `detour:${localTurnNumber}:${pieceId}`,
            gameData?.difficulty,
            roomRules.challengeTimerPace,
            targetCursorsRef.current[cursorKey]
          )
        : targetRole
          ? getTargetedChallengeRound(
            detourChallenge,
            detourPlayers,
            targetCursorsRef.current[cursorKey],
            gameData?.difficulty
          )
          : null;
      if (detourRound) {
        targetCursorsRef.current[cursorKey] = (Number(targetCursorsRef.current[cursorKey]) || 0) + 1;
      }
      const previousProgress = teamProgress[pieceId] || {};
      setTeamProgress({
        ...teamProgress,
        [pieceId]: {
          ...previousProgress,
          detour: {
            ...(previousProgress.detour || localRoadblock),
            status: 'challenge',
            step: detourStep,
            detourStep,
          },
        },
      });
      setIsCarDriving(false);
      setRemainingMoves(0);
      setLocalRoadblock({ ...localRoadblock, status: 'detourChallenge', detourStep });
      setCurrentChallenge({
        ...detourChallenge,
        ...(detourRound || {}),
        markerPosition: stop.position,
        isDetour: true,
      });
      setState('challenge');
      return;
    }

    const hasFinishedRoute = landedLeg >= routeModel.finalStopIndex;
    const completedRoadblock = Boolean(localPendingAction?.roadblockChoice);
    const finishPosition = hasFinishedRoute ? getFinishPosition(teamProgress) : null;
    const previousProgress = teamProgress[pieceId] || {};
    const { detour: _completedDetour, ...progressWithoutDetour } = previousProgress;
    const challengePoints = Number(previousProgress.challengePoints) || 0;
    const nextTeamProgress = {
      ...teamProgress,
      [pieceId]: {
        ...(localPendingAction?.roadblockChoice === 'detour'
          ? progressWithoutDetour
          : previousProgress),
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
    if ((hasFinishedRoute || completedRoadblock) && !activeDevDrive) {
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
  const stableRoadblockTest = useLatestCallback(startLocalRoadblockTest);
  const requestRollRef = useRef(requestRoll);
  requestRollRef.current = requestRoll;
  const handleRestartRef = useRef(handleRematch);
  handleRestartRef.current = handleRematch;
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
      stableRoadblockTest();
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
  }, [multiplayerEnabled, routeStops, stableDevDriveToStop, stableRoadblockTest]);

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
  const activeDetour = teamProgress[activePiece?.id]?.detour || null;
  const roadblockEvent = (multiplayerEnabled ? multiplayer.gameplay?.roadblock : localRoadblock)
    || activeDetour;
  useEffect(() => {
    if (state !== 'roadblock' || !roadblockEvent?.id) return;
    const eventKey = `${roadblockEvent.id}:${roadblockEvent.status || 'choice'}`;
    if (feedbackEventRef.current.roadblock === eventKey) return;
    feedbackEventRef.current.roadblock = eventKey;
    feedback.roadblock();
  }, [feedback, roadblockEvent?.id, roadblockEvent?.status, state]);

  useEffect(() => {
    if (state !== 'done') return;
    const victoryKey = multiplayerEnabled
      ? (multiplayer.gameplay?.sessionId || 'multiplayer')
      : `local:${gameData?.createdAt || 'game'}`;
    if (feedbackEventRef.current.victory === victoryKey) return;
    feedbackEventRef.current.victory = victoryKey;
    feedback.victory();
  }, [feedback, gameData?.createdAt, multiplayer.gameplay?.sessionId, multiplayerEnabled, state]);
  const movementPath = multiplayerEnabled
    ? multiplayer.gameplay?.currentAction?.movementPath
    : localMovementPath;
  const movementRouteModel = useMemo(
    () => movementPath?.stops?.length >= 2 ? createRoadblockRouteModel(movementPath) : null,
    [movementPath]
  );
  const detourRouteModels = useMemo(() => Object.fromEntries(
    Object.entries(teamProgress).flatMap(([teamId, progressEntry]) => {
      const detour = progressEntry?.detour;
      if (!detour?.detourStops?.length) return [];
      const path = createRoadblockMovementPath({ event: detour, routeModel, type: 'detour' });
      return path?.stops?.length >= 2
        ? [[teamId, createRoadblockRouteModel(path)]]
        : [];
    })
  ), [routeModel, teamProgress]);
  const detourPreviewPath = useMemo(() => (
    roadblockEvent?.detourStops?.length
      ? createRoadblockMovementPath({ event: roadblockEvent, routeModel, type: 'detour' })
      : null
  ), [roadblockEvent, routeModel]);
  const detourPreviewModel = useMemo(
    () => detourPreviewPath?.stops?.length >= 2 ? createRoadblockRouteModel(detourPreviewPath) : null,
    [detourPreviewPath]
  );
  const liveRoadblock = useMemo(() => (
    roadblockEvent && roadblockEvent.choice !== 'challenge'
      ? createRoadblockOnRoute(
          routeModel,
          roadblockEvent.obstacleLeg || Math.min(roadblockEvent.fromLeg + 1, roadblockEvent.targetLeg),
          roadblockEvent.progressAlongLeg ?? 0.48,
          {
            id: roadblockEvent.id,
            detourDirection: getDetourDirection({ event: roadblockEvent, routeModel }),
          }
        )
      : null
  ), [roadblockEvent, routeModel]);
  const isDetourActive = Boolean(
    roadblockEvent && (
      state === 'roadblock' ||
      roadblockEvent.choice === 'detour' ||
      roadblockEvent.status === 'travelling' ||
      roadblockEvent.status === 'detourChallenge'
    )
  );
  const detourStep = Number(roadblockEvent?.detourStep) || 0;
  const activeMovementAction = multiplayerEnabled
    ? multiplayer.gameplay?.currentAction
    : localPendingAction;
  const detourCurrentLeg = state === 'roadblock'
    ? 0
    : state === 'moving'
      ? (Number(activeMovementAction?.detourStartStep) || 0)
      : detourStep;
  const detourTargetLeg = state === 'roadblock'
    ? 1
    : state === 'moving'
      ? detourStep
      : Math.min(detourStep + 1, (detourPreviewModel?.finalStopIndex ?? 3));
  const detourOccupiedIndexes = useMemo(() => {
    const set = new Set([0, detourPreviewModel?.finalStopIndex ?? 3]);
    if (state === 'challenge' && roadblockEvent?.status === 'detourChallenge') {
      set.add(detourStep);
    }
    return set;
  }, [detourPreviewModel?.finalStopIndex, detourStep, roadblockEvent?.status, state]);
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
          ? 1
          : (moveTargetLeg !== null ? Math.max(0, moveTargetLeg - moveStartLeg) : 0)
      ) * getDiceTimingMultiplier(roomRules);
  const cameraMode = localSettings.cameraFollow && state === 'moving' && isCarDriving
    ? 'follow'
    : 'done';
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
        fastDiceAnimations={roomRules.fastDiceAnimations}
        diceVisible={!placementRequest && state !== 'roadblock'}
        detourRouteModels={detourRouteModels}
        activeDetourTeamId={activeDetour ? activePiece?.id : null}
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
        showDetourPreview={isDetourActive}
        isRoadblockState={state === 'roadblock'}
        detourCurrentLeg={detourCurrentLeg}
        detourTargetLeg={detourTargetLeg}
        detourOccupiedIndexes={detourOccupiedIndexes}
        rollAction={multiplayerEnabled ? multiplayer.gameplay?.currentAction : null}
        targetRef={targetRef}
        teamProgress={teamProgress}
        routeModel={routeModel}
        vehicleInMotion={isCarDriving}
      />

      <GameHud
        activeTeamColor={activePiece?.color}
        activeTeamId={activePiece?.id}
        activeTeamLabel={activePiece?.label}
        activeTeamScore={activeProgress.score || 0}
        canRematch={!multiplayerEnabled || multiplayer.isHost}
        fromName={fromName}
        gamePieces={gamePieces}
        isDetour={Boolean(activeDetour || (roadblockEvent && roadblockEvent.choice === 'detour'))}
        lastRoll={lastRoll}
        onAdjustDrinks={handleAdjustDrinks}
        onLeaveGame={handleLeaveGame}
        onRematch={handleRematch}
        progress={progress}
        remainingMoves={remainingMoves}
        routeStopNames={routeModel.stopNames}
        state={state}
        teamMembers={currentTeamMembers}
        teamProgress={teamProgress}
        toName={toName}
        totalStops={routeModel.finalStopIndex + 1}
        turnNumber={multiplayerEnabled ? (multiplayer.gameplay?.turnNumber || 1) : localTurnNumber}
      />
      <ConnectionOverlay
        activeLeader={multiplayerEnabled ? multiplayer.activeLeader : null}
        canClaimHost={multiplayerEnabled && multiplayer.canClaimHost}
        connectedPlayers={multiplayerEnabled ? multiplayer.connectedPlayers : []}
        isConnected={!multiplayerEnabled || multiplayer.isConnected}
        isHost={multiplayerEnabled && multiplayer.isHost}
        isLoading={multiplayerEnabled && multiplayer.isLoading}
        isRoomExpired={multiplayerEnabled && multiplayer.isRoomExpired}
        leaders={multiplayerEnabled ? multiplayer.leaders : []}
        localDeviceID={multiplayerEnabled ? multiplayer.deviceID : null}
        onLeave={handleLeaveGame}
        onReturnHome={returnHome}
        onReplaceLeader={handleReplaceLeader}
        onTransferHost={handleTransferHost}
        presenceLoaded={!multiplayerEnabled || multiplayer.presenceLoaded}
        roomMeta={multiplayerEnabled ? multiplayer.roomMeta : {}}
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
      <TurnHandoff
        activeTeamId={activePiece?.id}
        activeTeamLabel={activePiece?.label || 'Team'}
        isConnected={!multiplayerEnabled || multiplayer.isConnected}
        localTeamId={multiplayer.localTeamId}
        multiplayerEnabled={multiplayerEnabled}
        visible={state === 'waiting' && (!multiplayerEnabled || !multiplayer.isLoading) && !showOnboarding}
      />
      <RoadblockOverlay
        canChoose={!multiplayerEnabled || multiplayer.canControlTurn}
        canFinalizeTimeout={!multiplayerEnabled || (
          multiplayer.isConnected && !multiplayer.isRoomExpired
        )}
        event={roadblockEvent}
        getNow={multiplayerEnabled ? multiplayer.serverNow : Date.now}
        onAction={handleRoadblockAction}
        teamLabel={activePiece?.label}
        visible={state === 'roadblock'}
      />
      <ChallengePopup
        autoAdvance={roomRules.autoAdvance}
        canComplete={!multiplayerEnabled || multiplayer.canControlTurn}
        canFinalizeTimeout={!multiplayerEnabled || (
          multiplayer.isConnected && !multiplayer.isRoomExpired
        )}
        challenge={currentChallenge}
        difficulty={gameData?.difficulty}
        gamePieces={gamePieces}
        getNow={multiplayerEnabled ? multiplayer.serverNow : Date.now}
        isTeamLeader={!multiplayerEnabled || multiplayer.isTeamLeader}
        localTeamId={multiplayerEnabled ? multiplayer.localTeamId : activePiece?.id}
        multiplayerEnabled={multiplayerEnabled}
        teamLabel={activePiece?.label}
        visible={state === 'challenge'}
        onChallengeAction={handleCountryWordAction}
        onCancelAutoAdvance={handleCancelAutoAdvance}
        onComplete={handleChallengeComplete}
        pieceRefs={pieceRefs.current}
        routeModel={routeModel}
      />
      <GameOnboarding onDismiss={dismissOnboarding} visible={showOnboarding} />
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
