import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import ChallengePopup from './components/ChallengePopup';
import GameHud from './components/GameHud';
import GameScene from './components/GameScene';
import RaceProgressTracker from './components/RaceProgressTracker';
import { getChallengeForStop, getChallengeIdForStop } from './constants/challenges';
import { DICE_RESULT_DURATION, DICE_RESULT_EXIT_BUFFER } from './constants/diceBounds';
import { createInitialTeamProgress, getGamePiecesForGame } from './constants/gamePieces';
import { getDefaultModelOption, getModelOption } from './constants/modelOptions';
import { devEventBus } from '../shared/dev/devEventBus';
import useMultiplayerGame from './hooks/useMultiplayerGame';
import { getPathRevealDuration, createRouteModel } from './constants/route';
import { resolveGameRouteStops } from './constants/countryStops';
import { updateCountryStop } from './services/countryStopsService';
import CountryStopPlacementForm from './components/CountryStopPlacementForm';

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

const rollDice = () => Math.floor(Math.random() * 6) + 1;

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
  const activeCarProgressRef = useRef(0);
  const visualActionIdRef = useRef(null);
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

    if (gameplay.phase === 'moving' && action) {
      if (visualActionIdRef.current === action.id) return;

      visualActionIdRef.current = action.id;
      activeCarProgressRef.current = routeModel.stopProgress[action.fromLeg] ?? 0;
      setLastRoll(action.value);
      setMoveStartLeg(action.fromLeg);
      setPassedLeg(action.fromLeg);
      setIsCarDriving(false);
      setRemainingMoves(action.targetLeg - action.fromLeg);
      setMovingPieceId(action.teamId);
      setMoveStartDelay(DICE_RESULT_DURATION + DICE_RESULT_EXIT_BUFFER);
      setMoveTargets((previousTargets) => ({
        ...previousTargets,
        [action.teamId]: action.targetLeg,
      }));
      setCurrentChallenge(null);
      setState('moving');
      return;
    }

    setIsCarDriving(false);
    setMovingPieceId(null);
    setRemainingMoves(0);

    if (gameplay.phase === 'challenge') {
      setLastRoll(action?.value ?? null);
      setCurrentChallenge(getChallengeForStop(gameplay.challengeStop, routeStops, gameplay.challengeId));
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

  const resetLocalGame = () => {
    activeCarProgressRef.current = 0;
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

    const nextActiveTeamIndex = getNextActiveTeamIndex(gamePieces, teamProgress, activeTeamIndex);
    setCurrentChallenge(null);
    if (nextActiveTeamIndex === null) {
      setState('done');
      return;
    }
    setLastRoll(null);
    setActiveTeamIndex(nextActiveTeamIndex);
    setState('waiting');
  };

  const handleDiceRollStart = () => {
    if (state === 'waiting' && (!multiplayerEnabled || multiplayer.canControlTurn)) {
      setState('rolling');
    }
  };

  const startLocalRoll = (value = rollDice(), resultDisplayDelay = 0) => {
    if (!['waiting', 'rolling'].includes(state) || !activePiece || activeProgress.isDone) return;

    const startLeg = activeProgress.currentLeg;
    const targetLeg = Math.min(startLeg + value, routeModel.finalStopIndex);
    activeCarProgressRef.current = routeModel.stopProgress[startLeg] ?? 0;
    setLastRoll(value);
    setMoveStartLeg(startLeg);
    setPassedLeg(startLeg);
    setIsCarDriving(false);
    setRemainingMoves(targetLeg - startLeg);
    setMovingPieceId(activePiece.id);
    setMoveStartDelay(resultDisplayDelay);
    setMoveTargets((previousTargets) => ({ ...previousTargets, [activePiece.id]: targetLeg }));
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
    if (isDevDrive) {
      setIsDevDrive(false);
    }

    const hasFinishedRoute = landedLeg >= routeModel.finalStopIndex;
    const nextTeamProgress = {
      ...teamProgress,
      [pieceId]: {
        currentLeg: hasFinishedRoute ? routeModel.finalStopIndex : landedLeg,
        isDone: hasFinishedRoute,
      },
    };
    setTeamProgress(nextTeamProgress);
    setIsCarDriving(false);
    setMovingPieceId(null);
    setRemainingMoves(0);

    if (multiplayerEnabled) {
      multiplayer.completeMovement(multiplayer.gameplay?.currentAction?.id).catch((error) => {
        console.log('Unable to complete synchronized movement', error);
      });
      return;
    }

    const nextActiveTeamIndex = getNextActiveTeamIndex(gamePieces, nextTeamProgress, activeTeamIndex);
    if (hasFinishedRoute && !activeDevDrive) {
      if (nextActiveTeamIndex === null) {
        setState('done');
        return;
      }
      setLastRoll(null);
      setActiveTeamIndex(nextActiveTeamIndex);
      setState('waiting');
      return;
    }

    setCurrentChallenge(getChallengeForStop(
      landedLeg,
      routeStops,
      getChallengeIdForStop(routeStops[landedLeg], Math.random()),
    ));
    setState('challenge');
  };

  const startDevDriveToStop = (stopIndex) => {
    if (multiplayerEnabled) return;

    const currentActivePiece = gamePieces[activeTeamIndex] || gamePieces[0];
    if (!currentActivePiece) return;

    const targetLeg = Math.min(Math.max(1, stopIndex), routeModel.finalStopIndex);
    const currentProgress = teamProgress[currentActivePiece.id] || { currentLeg: 0, isDone: false };
    const currentLeg = currentProgress.currentLeg ?? 0;

    const startLeg = currentLeg < targetLeg ? currentLeg : Math.max(0, targetLeg - 1);

    if (startLeg === targetLeg) {
      setIsDevDrive(false);
      setCurrentChallenge(getChallengeForStop(
        targetLeg,
        routeStops,
        getChallengeIdForStop(routeStops[targetLeg], Math.random()),
      ));
      setState('challenge');
      return;
    }

    setIsDevDrive(true);

    setTeamProgress((previous) => ({
      ...previous,
      [currentActivePiece.id]: {
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

  const stableDevDriveToStop = useLatestCallback(startDevDriveToStop);
  const requestRollRef = useRef(requestRoll);
  requestRollRef.current = requestRoll;
  const handleRestartRef = useRef(handleRestart);
  handleRestartRef.current = handleRestart;

  useEffect(() => {
    const unsubRoll = devEventBus.on('dev:forceRoll', ({ value }) => {
      requestRollRef.current?.(value, 'shortcut');
    });
    const unsubChallenge = devEventBus.on('dev:testChallenge', ({ stopIndex }) => {
      if (multiplayerEnabled) return;
      stableDevDriveToStop(stopIndex);
    });
    const unsubPlacement = devEventBus.on('dev:beginCountryPlacement', (request) => {
      if (Platform.OS !== 'web' || multiplayerEnabled) return;
      setDevRouteStops(request.countryStops || null);
      setPlacementRequest(request);
      setPlacementPosition(null);
    });
    const unsubRestart = devEventBus.on('dev:restart', () => handleRestartRef.current?.());
    return () => {
      unsubRoll();
      unsubChallenge();
      unsubPlacement();
      unsubRestart();
    };
  }, [multiplayerEnabled, routeStops, stableDevDriveToStop]);

  const handleMapPointSelected = async (point) => {
    if (!placementRequest) return;
    const position = { x: point.x, y: point.y };
    if (placementRequest.mode === 'move' && placementRequest.stop?.id) {
      await updateCountryStop(placementRequest.stop.id, { position });
      setDevRouteStops((current) => current?.map((stop) => (
        stop.id === placementRequest.stop.id ? { ...stop, position } : stop
      )) || current);
      setPlacementRequest(null);
      return;
    }
    setPlacementPosition(position);
  };

  const stableDiceRollStart = useLatestCallback(handleDiceRollStart);
  const stableBoardDiceRoll = useLatestCallback(handleBoardDiceRoll);
  const stableDriveStart = useLatestCallback(handleDriveStart);
  const stableLegPass = useLatestCallback(handleLegPass);
  const stableMoveComplete = useLatestCallback(handleMoveComplete);
  const focusedPiece = activePiece || getFocusedPiece(gamePieces, teamProgress);
  const focusedProgress = teamProgress[focusedPiece?.id] || { currentLeg: 0, isDone: false };
  const currentLeg = focusedProgress.currentLeg;
  const moveTargetLeg = state === 'moving'
    ? (moveTargets[activePiece?.id] ?? currentLeg)
    : null;
  const pathRevealDuration = isDevDrive
    ? 0.25
    : getPathRevealDuration(
        moveTargetLeg !== null ? Math.max(0, moveTargetLeg - moveStartLeg) : 0
      );
  const cameraMode = state === 'moving' && isCarDriving ? 'follow' : 'done';
  const targetRef = pieceRefs.current[focusedPiece?.id];
  const hudCurrentLeg = state === 'moving' ? passedLeg : currentLeg;
  const fromName = routeModel.stopNames[hudCurrentLeg];
  const toName = routeModel.stopNames[Math.min(
    state === 'moving' && moveTargetLeg !== null ? moveTargetLeg : hudCurrentLeg + 1,
    routeModel.stopNames.length - 1
  )];
  const progress = `${currentLeg + 1} / ${routeModel.finalStopIndex}`;
  const canRoll = state === 'waiting'
    && !activeProgress.isDone
    && (!multiplayerEnabled || (multiplayer.canControlTurn && multiplayer.isConnected));

  return (
    <View style={styles.container}>
      <GameScene
        activeCarProgressRef={activeCarProgressRef}
        activeTeamColor={activePiece?.color}
        cameraMode={cameraMode}
        canvasStyle={styles.canvas}
        currentLeg={currentLeg}
        diceEnabled={canRoll && !placementRequest}
        driving={state === 'moving'}
        lowPower={state === 'challenge'}
        gamePieces={gamePieces}
        moveFromLeg={moveStartLeg}
        moveStartDelay={moveStartDelay}
        moveTargetLeg={moveTargetLeg ?? currentLeg}
        movingPieceId={movingPieceId}
        moveTargets={moveTargets}
        onDiceRollStart={stableDiceRollStart}
        onDiceRoll={stableBoardDiceRoll}
        onDriveStart={stableDriveStart}
        onLegPass={stableLegPass}
        onMoveComplete={stableMoveComplete}
        pathRevealDuration={pathRevealDuration}
        placementActive={Boolean(placementRequest) && !placementPosition}
        onMapPointSelected={handleMapPointSelected}
        pieceRefs={pieceRefs.current}
        rollAction={multiplayerEnabled ? multiplayer.gameplay?.currentAction : null}
        targetRef={targetRef}
        teamProgress={teamProgress}
        routeModel={routeModel}
        vehicleInMotion={isCarDriving}
      />

      <GameHud
        activeTeamLabel={activePiece?.label}
        canRestart={!multiplayerEnabled || multiplayer.isHost}
        fromName={fromName}
        lastRoll={lastRoll}
        onRestart={handleRestart}
        progress={progress}
        remainingMoves={remainingMoves}
        state={state}
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
      <ChallengePopup
        canComplete={!multiplayerEnabled || multiplayer.canControlTurn}
        challenge={currentChallenge}
        teamLabel={activePiece?.label}
        visible={state === 'challenge'}
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
