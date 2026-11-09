import { memo, Suspense, useMemo } from 'react';
import GameCanvas from '../../shared/components/GameCanvas';
import { DONE_POS } from '../constants/camera';
import CameraController from './CameraController';
import BoardDice from './BoardDice';
import CountryMarkers, { DestinationLabel } from './CountryMarkers';
import LegacyDetourMarkers from './LegacyDetourMarkers';
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
      .filter((piece) => !teamProgress[piece.id]?.detour)
      .map((piece) => teamProgress[piece.id]?.currentLeg ?? 0)
  ), [gamePieces, movingPieceId, teamProgress, vehicleInMotion]);

  const destinationModel = movementRouteModel || routeModel;
  const destinationIndex = movementRouteModel ? movementRouteModel.finalStopIndex : moveTargetLeg;
  const destinationStop = driving && vehicleInMotion && !placementActive
    ? destinationModel.countryStops[destinationIndex]
    : null;

  return (
    <GameCanvas
    style={canvasStyle}
    camera={{ position: DONE_POS.toArray(), fov: 50, near: 0.5, far: 40 }}
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
      moveStartDelay={moveStartDelay}
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
      <Suspense fallback={null}>
        <LegacyDetourMarkers
          currentLeg={detourCurrentLeg ?? 0}
          occupiedMarkerIndexes={detourOccupiedIndexes || new Set([0, detourPreviewModel.finalStopIndex])}
          routeModel={detourPreviewModel}
          targetLeg={detourTargetLeg ?? 1}
        />
      </Suspense>
    )}
    {Object.entries(detourRouteModels || {}).map(([teamId, detourModel]) => {
      if (!detourModel || teamId === activeDetourTeamId) return null;
      const detourStep = Math.min(
        Number(teamProgress[teamId]?.detour?.step) || 0,
        detourModel.finalStopIndex
      );
      const occupiedIndexes = new Set([0, detourModel.finalStopIndex]);
      if (detourStep > 0 && detourStep < detourModel.finalStopIndex) {
        occupiedIndexes.add(detourStep);
      }

      return (
        <Suspense key={`inactive-detour-pins-${teamId}`} fallback={null}>
          <LegacyDetourMarkers
            currentLeg={detourStep}
            occupiedMarkerIndexes={occupiedIndexes}
            routeModel={detourModel}
            targetLeg={Math.min(detourStep + 1, detourModel.finalStopIndex)}
          />
        </Suspense>
      );
    })}
    <CountryMarkers
      activeCarProgressRef={movementRouteModel ? null : activeCarProgressRef}
      currentLeg={currentLeg}
      movementStartLeg={moveFromLeg}
      movementTargetLeg={moveTargetLeg}
      movingMarkerIndex={movingMarkerIndex}
      movingMarkerStop={movingMarkerStop}
      occupiedMarkerIndexes={occupiedMarkerIndexes}
      routeModel={routeModel}
      targetLeg={destinationStop && destinationStop.id === routeModel.countryStops[moveTargetLeg]?.id
        ? moveTargetLeg
        : -1}
      vehicleInMotion={vehicleInMotion}
    />
    {destinationStop?.name && (
      <DestinationLabel stop={destinationStop} position={destinationModel.markers[destinationIndex]} />
    )}
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
    </GameCanvas>
  );
});

export default GameScene;
