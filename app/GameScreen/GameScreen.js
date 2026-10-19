import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import ChallengePopup from './components/ChallengePopup';
import GameHud from './components/GameHud';
import GameScene from './components/GameScene';
import TourControl from './components/TourControl';
import { getChallengeForStop } from './constants/challenges';
import { DICE_RESULT_DURATION, DICE_RESULT_EXIT_BUFFER } from './constants/diceBounds';
import { createInitialTeamProgress, getGamePiecesForGame } from './constants/gamePieces';
import { getDefaultModelOption, getModelOption } from './constants/modelOptions';
import { devEventBus } from '../shared/dev/devEventBus';
import useMultiplayerGame from './hooks/useMultiplayerGame';
import {
  DRIVE_LEGS,
  getPathRevealDuration,
  ROUTE,
  STOP_NAMES,
  STOP_PROGRESS,
} from './constants/route';

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
  const gameData = route?.params?.gameData || {};
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
  const activeCarProgressRef = useRef(0);
  const visualActionIdRef = useRef(null);
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
    teamMembers,
  });

  gamePieces.forEach((piece) => {
    if (!pieceRefs.current[piece.id]) pieceRefs.current[piece.id] = React.createRef();
  });

  useEffect(() => {
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
      activeCarProgressRef.current = STOP_PROGRESS[action.fromLeg] ?? 0;
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
      setCurrentChallenge(getChallengeForStop(gameplay.challengeStop));
      setState('challenge');
      return;
    }

    setCurrentChallenge(null);
    setLastRoll(null);
    visualActionIdRef.current = null;
    setState(gameplay.phase === 'done' ? 'done' : 'waiting');
  }, [gamePieces, multiplayer.gameplay, multiplayerEnabled]);

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
    const targetLeg = Math.min(startLeg + value, DRIVE_LEGS.length);
    activeCarProgressRef.current = STOP_PROGRESS[startLeg] ?? 0;
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
    const hasFinishedRoute = landedLeg >= DRIVE_LEGS.length;
    const nextTeamProgress = {
      ...teamProgress,
      [pieceId]: {
        currentLeg: hasFinishedRoute ? DRIVE_LEGS.length : landedLeg,
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
    if (hasFinishedRoute) {
      if (nextActiveTeamIndex === null) {
        setState('done');
        return;
      }
      setLastRoll(null);
      setActiveTeamIndex(nextActiveTeamIndex);
      setState('waiting');
      return;
    }

    setCurrentChallenge(getChallengeForStop(landedLeg));
    setState('challenge');
  };

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
      setCurrentChallenge(getChallengeForStop(stopIndex));
      setState('challenge');
    });
    const unsubRestart = devEventBus.on('dev:restart', () => handleRestartRef.current?.());
    return () => {
      unsubRoll();
      unsubChallenge();
      unsubRestart();
    };
  }, [multiplayerEnabled]);

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
  const pathRevealDuration = getPathRevealDuration(
    moveTargetLeg !== null ? Math.max(0, moveTargetLeg - moveStartLeg) : 0
  );
  const cameraMode = state === 'moving' && isCarDriving ? 'follow' : 'done';
  const targetRef = pieceRefs.current[focusedPiece?.id];
  const hudCurrentLeg = state === 'moving' ? passedLeg : currentLeg;
  const fromName = STOP_NAMES[hudCurrentLeg];
  const toName = STOP_NAMES[Math.min(
    state === 'moving' && moveTargetLeg !== null ? moveTargetLeg : hudCurrentLeg + 1,
    STOP_NAMES.length - 1
  )];
  const progress = `${currentLeg + 1} / ${ROUTE.length - 1}`;
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
        diceEnabled={canRoll}
        driving={state === 'moving'}
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
        pieceRefs={pieceRefs.current}
        rollAction={multiplayerEnabled ? multiplayer.gameplay?.currentAction : null}
        targetRef={targetRef}
        teamProgress={teamProgress}
        vehicleInMotion={isCarDriving}
      />

      <GameHud
        activeTeamLabel={activePiece?.label}
        fromName={fromName}
        lastRoll={lastRoll}
        progress={progress}
        remainingMoves={remainingMoves}
        state={state}
        toName={toName}
      />
      <TourControl
        activeTeamLabel={activePiece?.label}
        canRestart={!multiplayerEnabled || multiplayer.isHost}
        canRoll={canRoll}
        isConnected={!multiplayerEnabled || multiplayer.isConnected}
        lastRoll={lastRoll}
        onRestart={handleRestart}
        onRoll={() => requestRoll()}
        state={multiplayerEnabled && multiplayer.isLoading ? 'loading' : state}
      />
      <ChallengePopup
        canComplete={!multiplayerEnabled || multiplayer.canControlTurn}
        challenge={currentChallenge}
        teamLabel={activePiece?.label}
        visible={state === 'challenge'}
        onComplete={handleChallengeComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#223144' },
  canvas: { flex: 1, backgroundColor: 'transparent' },
});

export default GameScreen;
