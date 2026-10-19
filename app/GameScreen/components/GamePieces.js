import GamePiece from './GamePiece';

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
}) => (
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

export default GamePieces;
