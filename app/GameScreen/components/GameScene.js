import { memo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { DONE_POS } from '../constants/camera';
import CameraController from './CameraController';
import BoardDice from './BoardDice';
import CountryMarkers from './CountryMarkers';
import DottedRouteLine from './DottedRouteLine';
import GamePieces from './GamePieces';
import MapPlane, { OCEAN_COLOR } from './MapPlane';
import { MAP_CY, MAP_Z } from '../constants/mapCoordinates';
import { MARKERS, ROUTE } from '../constants/route';

const MapFallback = () => (
  <mesh position={[0, MAP_CY, MAP_Z]}>
    <planeGeometry args={[240, 180]} />
    <meshBasicMaterial color={OCEAN_COLOR} toneMapped={false} />
  </mesh>
);

const GamePiecesFallback = ({ gamePieces, teamProgress }) => (
  <>
    {gamePieces.map((piece, index) => {
      const currentLeg = teamProgress[piece.id]?.currentLeg || 0;
      const position = ROUTE[currentLeg] || ROUTE[0];

      return (
        <mesh
          key={piece.id}
          position={[position.x + index * 0.16, position.y - index * 0.12, MAP_Z + 0.16]}
        >
          <boxGeometry args={[0.3, 0.2, 0.16]} />
          <meshStandardMaterial color={piece.color} roughness={0.5} />
        </mesh>
      );
    })}
  </>
);

const CountryMarkersFallback = ({ currentLeg, targetLeg }) => {
  const destinationLeg = targetLeg !== undefined && targetLeg !== null && targetLeg > currentLeg
    ? targetLeg
    : currentLeg + 1;
  const activeMarker = destinationLeg % MARKERS.length;

  return (
    <>
      {MARKERS.map((position, index) => (
        <group key={`${position.x}-${position.y}-${index}`} position={[position.x, position.y, MAP_Z + 0.09]}>
          <mesh>
            <circleGeometry args={[index === activeMarker ? 0.1 : 0.075, 16]} />
            <meshBasicMaterial color={index === activeMarker ? '#FFD700' : '#E53935'} />
          </mesh>
          <mesh position={[0, 0, -0.003]}>
            <ringGeometry args={[0.11, 0.15, 16]} />
            <meshBasicMaterial color="#1BA39C" />
          </mesh>
        </group>
      ))}
    </>
  );
};

const GameScene = memo(({
  activeCarProgressRef,
  activeTeamColor,
  cameraMode,
  canvasStyle,
  currentLeg,
  diceEnabled,
  driving,
  gamePieces,
  moveFromLeg,
  moveStartDelay,
  moveTargetLeg,
  movingPieceId,
  moveTargets,
  onDiceRoll,
  onDiceRollStart,
  onDriveStart,
  onLegPass,
  onMoveComplete,
  pathRevealDuration,
  pieceRefs,
  targetRef,
  teamProgress,
}) => (
  <Canvas
    style={canvasStyle}
    camera={{ position: DONE_POS.toArray(), fov: 50 }}
    dpr={[1, 1.5]}
    gl={{
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    }}
  >
    <color attach="background" args={[OCEAN_COLOR]} />
    <ambientLight intensity={0.72} />
    <hemisphereLight args={['#fff1cd', '#223144', 0.42]} />
    <directionalLight position={[8, -7, 9]} intensity={1.25} />
    <directionalLight position={[-6, 5, 4]} intensity={0.32} color="#8fd8ff" />

    <Suspense fallback={<MapFallback />}>
      <MapPlane />
    </Suspense>
    <DottedRouteLine
      activeCarProgressRef={activeCarProgressRef}
      activeColor={activeTeamColor}
      driving={driving}
      fromLeg={moveFromLeg}
      pathRevealDuration={pathRevealDuration}
      toLeg={moveTargetLeg}
    />
    <Suspense fallback={<GamePiecesFallback gamePieces={gamePieces} teamProgress={teamProgress} />}>
      <GamePieces
        activeCarProgressRef={activeCarProgressRef}
        driving={driving}
        gamePieces={gamePieces}
        moveStartDelay={moveStartDelay}
        movingPieceId={movingPieceId}
        moveTargets={moveTargets}
        onDriveStart={onDriveStart}
        onLegPass={onLegPass}
        onMoveComplete={onMoveComplete}
        pathRevealDuration={pathRevealDuration}
        pieceRefs={pieceRefs}
        teamProgress={teamProgress}
      />
    </Suspense>
    <Suspense fallback={<CountryMarkersFallback currentLeg={currentLeg} targetLeg={moveTargetLeg} />}>
      <CountryMarkers currentLeg={currentLeg} targetLeg={moveTargetLeg} />
    </Suspense>
    <CameraController mode={cameraMode} targetRef={targetRef} />
    <BoardDice enabled={diceEnabled} onRollComplete={onDiceRoll} onRollStart={onDiceRollStart} />
  </Canvas>
));

export default GameScene;
