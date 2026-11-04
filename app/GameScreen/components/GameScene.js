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

const GameScene = memo(({
  activeCarProgressRef,
  activeDetourTeamId = null,
  cameraMode,
  canvasStyle,
  currentLeg,
  diceEnabled,
  fastDiceAnimations = false,
  diceVisible = true,
  detourRouteModels,
  driving,
  lowPower,
  gamePieces,
  moveFromLeg,
  moveStartDelay,
  moveTargetLeg,
  movingMarkerIndex = -1,
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
  detourCurrentLeg = 0,
  detourOccupiedIndexes,
  detourTargetLeg = 1,
  isRoadblockState = false,
  rollAction,
  targetRef,
  teamProgress,
  routeModel,
  vehicleInMotion,
}) => {
  const occupiedMarkerIndexes = useMemo(() => new Set(
    gamePieces
      .filter((piece) => !(vehicleInMotion && piece.id === movingPieceId))
      .filter((piece) => !(Number(teamProgress[piece.id]?.detour?.step) > 0))
      .map((piece) => teamProgress[piece.id]?.currentLeg ?? 0)
  ), [gamePieces, movingPieceId, teamProgress, vehicleInMotion]);

  const onDetour = activeDetourTeamId !== null && detourPreviewModel;
  const detourHasNextWaypoint = onDetour && detourTargetLeg < detourPreviewModel.finalStopIndex;
  const drivingDetour = vehicleInMotion && onDetour && movementRouteModel;
  const mainTargetLeg = onDetour
    ? routeModel.countryStops.findIndex((stop) => stop.id === detourPreviewModel.countryStops.at(-1)?.id)
    : moveTargetLeg;

  return (
    <Canvas
    style={canvasStyle}
    // Pause the GL loop while a challenge or route overview covers the board.
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
      driving={driving}
      fromLeg={moveFromLeg}
      pathRevealDuration={pathRevealDuration}
      toLeg={moveTargetLeg}
      routeModel={routeModel}
      movementRouteModel={movementRouteModel}
    />
    {showDetourPreview && detourPreviewModel && <DetourRouteLine routeModel={detourPreviewModel} />}
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
        detourRouteModels={detourRouteModels}
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
      <CountryMarkers
        activeCarProgressRef={activeCarProgressRef}
        currentLeg={detourCurrentLeg}
        labelMode={detourPreviewSelected ? 'next-and-finish' : 'all'}
        movementRouteModel={movementRouteModel}
        movementStartLeg={detourCurrentLeg}
        movementTargetLeg={detourTargetLeg}
        occupiedMarkerIndexes={detourOccupiedIndexes}
        routeModel={detourPreviewModel}
        targetLeg={detourTargetLeg}
        variant="detour"
        vehicleInMotion={Boolean(drivingDetour)}
      />
    )}
    {Object.entries(detourRouteModels || {}).map(([teamId, detourModel]) => {
      if (!detourModel || teamId === activeDetourTeamId) return null;
      const detourStep = Number(teamProgress[teamId]?.detour?.step) || 0;

      return (
        <group key={teamId}>
          <DetourRouteLine routeModel={detourModel} />
          <CountryMarkers
            currentLeg={detourStep}
            labelMode="none"
            occupiedMarkerIndexes={new Set([detourStep])}
            routeModel={detourModel}
            variant="detour"
          />
        </group>
      );
    })}
    <CountryMarkers
      activeCarProgressRef={activeCarProgressRef}
      animateArrival={!drivingDetour || !detourHasNextWaypoint}
      animateDeparture={!drivingDetour || detourCurrentLeg === 0}
      currentLeg={currentLeg}
      highlightDestination={!detourHasNextWaypoint}
      movementRouteModel={movementRouteModel}
      movementStartLeg={moveFromLeg}
      movementTargetLeg={moveTargetLeg}
      movingMarkerIndex={movingMarkerIndex}
      occupiedMarkerIndexes={occupiedMarkerIndexes}
      routeModel={routeModel}
      targetLeg={mainTargetLeg}
      vehicleInMotion={vehicleInMotion}
    />
    <CameraController
      mode={cameraMode}
      overviewFocusOffset={isRoadblockState ? 0.62 : 0}
      overviewPositions={showDetourPreview ? (detourPreviewModel?.route || []) : []}
      overviewScaleMultiplier={isRoadblockState ? 1.32 : 1}
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
      fastAnimations={fastDiceAnimations}
      onRollComplete={onDiceRoll}
      onRollStart={onDiceRollStart}
      rollAction={rollAction}
      visible={diceVisible}
    />
    </Canvas>
  );
});

export default GameScene;
