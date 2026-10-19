import React, { useEffect, useMemo, useRef, useState } from 'react';
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

    if (!teamProgress[nextPiece.id]?.isDone) {
      return nextIndex;
    }
  }

  return null;
};

const rollDice = () => Math.floor(Math.random() * 6) + 1;

const GameScreen = ({ route }) => {
  const gameData = route?.params?.gameData;
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

  gamePieces.forEach((piece) => {
    if (!pieceRefs.current[piece.id]) {
      pieceRefs.current[piece.id] = React.createRef();
    }
  });

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => ScreenOrientation.unlockAsync();
  }, []);

  useEffect(() => {
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
  }, [baseGamePieces]);

  const activePiece = gamePieces[activeTeamIndex] || gamePieces[0];
  const activeProgress = teamProgress[activePiece?.id] || { currentLeg: 0, isDone: false };

  const handleRestart = () => {
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

  const handleChallengeComplete = () => {
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
    if (state === 'waiting') {
      setState('rolling');
    }
  };

  const handleRoll = (value = rollDice(), resultDisplayDelay = 0) => {
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
    setMoveTargets((previousTargets) => ({
      ...previousTargets,
      [activePiece.id]: targetLeg,
    }));
    setState('moving');
  };

  const handleBoardDiceRoll = (value) => {
    handleRoll(value, DICE_RESULT_DURATION + DICE_RESULT_EXIT_BUFFER);
  };

  const handleDriveStart = () => {
    setIsCarDriving(true);
  };

  const handleLegPass = (crossedLeg) => {
    const activeTarget = moveTargets[activePiece?.id] ?? activeProgress.currentLeg;
    setPassedLeg(crossedLeg);
    setRemainingMoves(Math.max(activeTarget - crossedLeg, 1));
  };

  const handleMoveComplete = (pieceId, landedLeg) => {
    const hasFinishedRoute = landedLeg >= DRIVE_LEGS.length;
    const nextTeamProgress = {
      ...teamProgress,
      [pieceId]: hasFinishedRoute
        ? { currentLeg: DRIVE_LEGS.length, isDone: true }
        : { currentLeg: landedLeg, isDone: false },
    };
    const nextActiveTeamIndex = getNextActiveTeamIndex(gamePieces, nextTeamProgress, activeTeamIndex);

    setTeamProgress((previousProgress) => {
      return {
        ...previousProgress,
        [pieceId]: nextTeamProgress[pieceId],
      };
    });
    setIsCarDriving(false);
    setMovingPieceId(null);
    setRemainingMoves(0);

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

  // Handlers close over fresh state each render; the subscription itself is stable.
  const devHandlersRef = useRef({});
  devHandlersRef.current = { handleRoll, handleRestart };

  useEffect(() => {
    const unsubRoll = devEventBus.on('dev:forceRoll', ({ value }) => {
      devHandlersRef.current.handleRoll(value, 0);
    });
    const unsubChallenge = devEventBus.on('dev:testChallenge', ({ stopIndex }) => {
      setCurrentChallenge(getChallengeForStop(stopIndex));
      setState('challenge');
    });
    const unsubRestart = devEventBus.on('dev:restart', () => {
      devHandlersRef.current.handleRestart();
    });
    return () => {
      unsubRoll();
      unsubChallenge();
      unsubRestart();
    };
  }, []);

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
  const canRoll = state === 'waiting' && !activeProgress.isDone;

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
        onDiceRollStart={handleDiceRollStart}
        onDiceRoll={handleBoardDiceRoll}
        onDriveStart={handleDriveStart}
        onLegPass={handleLegPass}
        onMoveComplete={handleMoveComplete}
        pathRevealDuration={pathRevealDuration}
        pieceRefs={pieceRefs.current}
        targetRef={targetRef}
        teamProgress={teamProgress}
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
        canRoll={canRoll}
        lastRoll={lastRoll}
        onRestart={handleRestart}
        onRoll={() => handleRoll()}
        state={state}
      />
      <ChallengePopup
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
