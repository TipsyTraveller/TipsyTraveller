import { useRef } from 'react';
import GamePiece from './GamePiece';

const getParkingOffsetFactor = (parkingAssignments, pieceId) => {
  const occupiedCount = parkingAssignments.filter(Boolean).length;
  const parkingIndex = parkingAssignments.indexOf(pieceId);

  if (occupiedCount <= 1 || parkingIndex < 0) return 0;
  if (occupiedCount === 3) return [0, 1, -1][parkingIndex] ?? 0;
  if (parkingIndex === 1) return 0.5;
  if (parkingIndex === 2) return -0.5;

  return parkingAssignments[1] ? -0.5 : 0.5;
};

const assignToOpenParkingSlot = (parkingAssignments, pieceId) => {
  if (parkingAssignments.includes(pieceId)) return parkingAssignments;

  const nextAssignments = [...parkingAssignments];
  const openSlot = nextAssignments.findIndex((assignedPieceId) => !assignedPieceId);
  if (openSlot >= 0) nextAssignments[openSlot] = pieceId;
  return nextAssignments;
};

const GamePieces = ({
  activeCarProgressRef,
  driving,
  gamePieces,
  moveStartDelay,
  movingPieceId,
  moveTargets,
  onDriveStart,
  onLegPass,
  onMoveComplete,
  pathRevealDuration,
  pieceRefs,
  teamProgress,
  vehicleInMotion,
}) => {
  const parkingAssignmentsByLegRef = useRef({});
  const parkedIdsByLeg = gamePieces.reduce((piecesByLeg, piece) => {
    if (vehicleInMotion && piece.id === movingPieceId) return piecesByLeg;

    const leg = teamProgress[piece.id]?.currentLeg ?? 0;
    piecesByLeg[leg] = [...(piecesByLeg[leg] || []), piece.id];
    return piecesByLeg;
  }, {});

  Object.entries(parkedIdsByLeg).forEach(([leg, parkedIds]) => {
    const previousAssignments = parkingAssignmentsByLegRef.current[leg] || [null, null, null];
    let nextAssignments = previousAssignments.map((pieceId) => (
      parkedIds.includes(pieceId) ? pieceId : null
    ));

    parkedIds.forEach((pieceId) => {
      nextAssignments = assignToOpenParkingSlot(nextAssignments, pieceId);
    });

    parkingAssignmentsByLegRef.current[leg] = nextAssignments;
  });

  Object.keys(parkingAssignmentsByLegRef.current).forEach((leg) => {
    if (!parkedIdsByLeg[leg]) delete parkingAssignmentsByLegRef.current[leg];
  });

  const movingTargetLeg = vehicleInMotion && movingPieceId ? moveTargets[movingPieceId] : null;
  const destinationAssignments = movingTargetLeg === null || movingTargetLeg === undefined
    ? null
    : assignToOpenParkingSlot(
      parkingAssignmentsByLegRef.current[movingTargetLeg] || [null, null, null],
      movingPieceId
    );

  return (
    <>
      {gamePieces.map((piece, index) => {
        const progress = teamProgress[piece.id] || { currentLeg: 0, isDone: false };
        const targetLeg = moveTargets[piece.id] ?? progress.currentLeg;
        const isPieceDriving = driving && movingPieceId === piece.id && !progress.isDone;
        const passedVehicleLegs = isPieceDriving
          ? gamePieces.reduce((distances, otherPiece) => {
            if (otherPiece.id === piece.id) return distances;

            const otherLeg = teamProgress[otherPiece.id]?.currentLeg ?? 0;
            if (otherLeg <= progress.currentLeg || otherLeg >= targetLeg) return distances;

            return [...distances, otherLeg];
          }, [])
          : [];
        const currentAssignments = progress.currentLeg === movingTargetLeg && destinationAssignments
          ? destinationAssignments
          : (parkingAssignmentsByLegRef.current[progress.currentLeg] || [null, null, null]);
        const predictedDestinationAssignments = isPieceDriving
          ? assignToOpenParkingSlot(
            parkingAssignmentsByLegRef.current[targetLeg] || [null, null, null],
            piece.id
          )
          : currentAssignments;
        const parkingOffsetFactor = getParkingOffsetFactor(
          predictedDestinationAssignments,
          piece.id
        );

        return (
          <GamePiece
            key={`${piece.id}-${piece.model.id}`}
            activeCarProgressRef={isPieceDriving ? activeCarProgressRef : null}
            currentLeg={progress.currentLeg}
            driving={isPieceDriving}
            moveStartDelay={moveStartDelay}
            onDriveStart={isPieceDriving ? onDriveStart : null}
            onLegPass={isPieceDriving ? onLegPass : null}
            onMoveComplete={onMoveComplete}
            parkingOffsetFactor={parkingOffsetFactor}
            passedVehicleLegs={passedVehicleLegs}
            pathRevealDuration={pathRevealDuration}
            piece={piece}
            pieceRef={pieceRefs[piece.id]}
            targetLeg={targetLeg}
            teamCount={gamePieces.length}
            teamIndex={index}
          />
        );
      })}
    </>
  );
};

export default GamePieces;
