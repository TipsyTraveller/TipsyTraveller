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
