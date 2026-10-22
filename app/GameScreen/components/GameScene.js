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

const MapFallback = () => (
  <mesh position={[0, MAP_CY, MAP_Z]}>
    <planeGeometry args={[240, 180]} />
    <meshBasicMaterial color={OCEAN_COLOR} toneMapped={false} />
  </mesh>
);

const GamePiecesFallback = ({ gamePieces, routeModel, teamProgress }) => (
  <>
    {gamePieces.map((piece, index) => {
      const currentLeg = teamProgress[piece.id]?.currentLeg || 0;
      const position = routeModel.route[currentLeg] || routeModel.route[0];

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

const CountryMarkersFallback = ({ currentLeg, routeModel, targetLeg }) => {
  const destinationLeg = targetLeg !== undefined && targetLeg !== null && targetLeg > currentLeg
    ? targetLeg
    : currentLeg + 1;
  const activeMarker = Math.min(destinationLeg, routeModel.markers.length - 1);

  return (
    <>
      {routeModel.markers.map((position, index) => (
        <group key={`${position.x}-${position.y}-${index}`} position={[position.x, position.y, MAP_Z + 0.09]}>
          <mesh>
            <circleGeometry args={[index === activeMarker ? 0.145 : 0.11, 16]} />
            <meshBasicMaterial color={index === activeMarker ? '#FFD700' : '#E53935'} />
          </mesh>
          <mesh position={[0, 0, -0.003]}>
            <ringGeometry args={[index === activeMarker ? 0.16 : 0.12, index === activeMarker ? 0.22 : 0.17, 16]} />
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
  lowPower,
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
  onMapPointSelected,
  pathRevealDuration,
  placementActive,
  pieceRefs,
  rollAction,
  targetRef,
  teamProgress,
  routeModel,
  vehicleInMotion,
}) => (
  <Canvas
    style={canvasStyle}
    // Paused while a challenge card is on screen: the board is covered by the dim
    // backdrop, and a running GL loop competes with the card animation on phones.
    frameloop={lowPower ? 'never' : 'always'}
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
      <MapPlane placementActive={placementActive} onMapPointSelected={onMapPointSelected} />
    </Suspense>
    <DottedRouteLine
      activeCarProgressRef={activeCarProgressRef}
      activeColor={activeTeamColor}
      driving={driving}
      fromLeg={moveFromLeg}
      pathRevealDuration={pathRevealDuration}
      toLeg={moveTargetLeg}
      routeModel={routeModel}
    />
    <Suspense fallback={<GamePiecesFallback gamePieces={gamePieces} routeModel={routeModel} teamProgress={teamProgress} />}>
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
        routeModel={routeModel}
        vehicleInMotion={vehicleInMotion}
      />
    </Suspense>
    <Suspense fallback={<CountryMarkersFallback currentLeg={currentLeg} routeModel={routeModel} targetLeg={moveTargetLeg} />}>
      <CountryMarkers currentLeg={currentLeg} routeModel={routeModel} targetLeg={moveTargetLeg} />
    </Suspense>
    <CameraController
      mode={cameraMode}
      overviewTargetPosition={routeModel.route[Math.min(
        driving && moveTargetLeg > currentLeg ? moveTargetLeg : currentLeg + 1,
        routeModel.finalStopIndex
      )]}
      pieceRefs={pieceRefs}
      targetRef={targetRef}
    />
    <BoardDice
      enabled={diceEnabled}
      onRollComplete={onDiceRoll}
      onRollStart={onDiceRollStart}
      rollAction={rollAction}
    />
  </Canvas>
));

export default GameScene;
