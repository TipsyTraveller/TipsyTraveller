import { memo, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { DONE_POS } from '../constants/camera';
import CameraController from './CameraController';
import BoardDice from './BoardDice';
import CountryMarkers from './CountryMarkers';
import DottedRouteLine from './DottedRouteLine';
import GamePieces from './GamePieces';
import MapPlane, { OCEAN_COLOR } from './MapPlane';
import RoadblockFigure from './RoadblockFigure';
import DetourRouteLine from './DetourRouteLine';
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
          position={[position.x + index * 0.12, position.y - index * 0.09, MAP_Z + 0.12]}
        >
          <boxGeometry args={[0.22, 0.14, 0.11]} />
          <meshStandardMaterial color={piece.color} roughness={0.5} />
        </mesh>
      );
    })}
  </>
);

const CountryMarkersFallback = ({
  currentLeg,
  movingMarkerIndex = -1,
  occupiedMarkerIndexes,
  routeModel,
  targetLeg,
}) => {
  const isMovePlacement = movingMarkerIndex >= 0;
  const destinationLeg = targetLeg !== undefined && targetLeg !== null && targetLeg > currentLeg
    ? targetLeg
    : currentLeg + 1;
  const activeMarker = isMovePlacement
    ? -1
    : Math.min(destinationLeg, routeModel.markers.length - 1);

  return (
    <>
      {routeModel.markers.map((position, index) => {
        const isMoving = isMovePlacement && index === movingMarkerIndex;
        if (occupiedMarkerIndexes.has(index) && !isMoving) return null;

        return (
          <group key={`${position.x}-${position.y}-${index}`} position={[position.x, position.y, MAP_Z + 0.09]}>
            <mesh>
              <circleGeometry args={[isMoving ? 0.22 : (index === activeMarker ? 0.145 : 0.11), 16]} />
              <meshBasicMaterial color={isMoving ? '#00E5FF' : (index === activeMarker ? '#FFD700' : '#E53935')} />
            </mesh>
            <mesh position={[0, 0, -0.003]}>
              <ringGeometry args={[isMoving ? 0.24 : (index === activeMarker ? 0.16 : 0.12), isMoving ? 0.34 : (index === activeMarker ? 0.22 : 0.17), 16]} />
              <meshBasicMaterial color={isMoving ? '#00E5FF' : '#1BA39C'} />
            </mesh>
          </group>
        );
      })}
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
  diceVisible = true,
  driving,
  lowPower,
  gamePieces,
  moveFromLeg,
  moveStartDelay,
  moveTargetLeg,
  movingMarkerIndex = -1,
  movingMarkerStop = null,
  movingPieceId,
  moveTargets,
  movementRouteModel = null,
  parkAtMovementEnd = false,
  onDiceRoll,
  onDiceRollStart,
  onDriveStart,
  onLegPass,
  onMoveComplete,
  onMapPointSelected,
  pathRevealDuration,
  placementActive,
  pieceRefs,
  roadblocks = [],
  detourPreviewModel = null,
  detourPreviewSelected = false,
  showDetourPreview = false,
  rollAction,
  targetRef,
  teamProgress,
  routeModel,
  vehicleInMotion,
}) => {
  const occupiedMarkerIndexes = useMemo(() => new Set(
    gamePieces
      .filter((piece) => !(vehicleInMotion && piece.id === movingPieceId))
      .map((piece) => teamProgress[piece.id]?.currentLeg ?? 0)
  ), [gamePieces, movingPieceId, teamProgress, vehicleInMotion]);

  return (
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
      movementRouteModel={movementRouteModel}
    />
    <DetourRouteLine
      routeModel={detourPreviewModel}
      selected={detourPreviewSelected}
      visible={showDetourPreview}
    />
    {roadblocks && roadblocks.length > 0 && (
      <group name="roadblocks">
        {roadblocks.map((roadblock) => (
          <RoadblockFigure
            key={roadblock.id || `${roadblock.position?.[0]}-${roadblock.position?.[1]}`}
            {...roadblock}
          />
        ))}
      </group>
    )}
    <Suspense fallback={<GamePiecesFallback gamePieces={gamePieces} routeModel={routeModel} teamProgress={teamProgress} />}>
      <GamePieces
        activeCarProgressRef={activeCarProgressRef}
        driving={driving}
        gamePieces={gamePieces}
        moveStartDelay={moveStartDelay}
        movingPieceId={movingPieceId}
        moveTargets={moveTargets}
        movementRouteModel={movementRouteModel}
        parkAtMovementEnd={parkAtMovementEnd}
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
    {showDetourPreview && detourPreviewModel && (
      <Suspense fallback={null}>
        <CountryMarkers
          currentLeg={0}
          occupiedMarkerIndexes={new Set([0, detourPreviewModel.finalStopIndex])}
          routeModel={detourPreviewModel}
          showLabels
          showStopNumbers={false}
          targetLeg={1}
        />
      </Suspense>
    )}
    <Suspense fallback={
      <CountryMarkersFallback
        currentLeg={currentLeg}
        movingMarkerIndex={movingMarkerIndex}
        occupiedMarkerIndexes={occupiedMarkerIndexes}
        routeModel={routeModel}
        targetLeg={moveTargetLeg}
      />
    }>
      <CountryMarkers
        activeCarProgressRef={movementRouteModel ? null : activeCarProgressRef}
        currentLeg={currentLeg}
        movementStartLeg={moveFromLeg}
        movementTargetLeg={moveTargetLeg}
        movingMarkerIndex={movingMarkerIndex}
        movingMarkerStop={movingMarkerStop}
        occupiedMarkerIndexes={occupiedMarkerIndexes}
        routeModel={routeModel}
        targetLeg={moveTargetLeg}
        vehicleInMotion={vehicleInMotion}
      />
    </Suspense>
    <CameraController
      mode={cameraMode}
      overviewFocusOffset={showDetourPreview ? 0.38 : 0}
      overviewPositions={showDetourPreview ? (detourPreviewModel?.route || []) : []}
      overviewScaleMultiplier={showDetourPreview ? 1.48 : 1}
      overviewTargetPosition={
        movingMarkerIndex >= 0 && routeModel.route[movingMarkerIndex]
          ? routeModel.route[movingMarkerIndex]
          : routeModel.route[Math.min(
              driving && moveTargetLeg > currentLeg ? moveTargetLeg : currentLeg + 1,
              routeModel.finalStopIndex
            )]
      }
      pieceRefs={movingMarkerIndex >= 0 ? null : pieceRefs}
      targetRef={targetRef}
    />
    <BoardDice
      enabled={diceEnabled}
      onRollComplete={onDiceRoll}
      onRollStart={onDiceRollStart}
      rollAction={rollAction}
      visible={diceVisible}
    />
    </Canvas>
  );
});

export default GameScene;
