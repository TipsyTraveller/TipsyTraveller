export const GAME_PIECES = [
  {
    id: 'team1',
    label: 'Team 1',
    color: '#d71920',
    startDelay: 0,
  },
  {
    id: 'team2',
    label: 'Team 2',
    color: '#1ba39c',
    startDelay: 1.5,
  },
  {
    id: 'team3',
    label: 'Team 3',
    color: '#2f80ed',
    startDelay: 3,
  },
];

export const getGamePiecesForGame = (gameData) => {
  const teamCount = gameData?.nrOfPlayers === '9-12' ? 3 : 2;
  return GAME_PIECES.slice(0, teamCount);
};

export const createInitialTeamProgress = (gamePieces) => (
  gamePieces.reduce((progress, piece) => ({
    ...progress,
    [piece.id]: {
      currentLeg: 0,
      isDone: false,
      score: 0,
      challengePoints: 0,
      drinks: 0,
      playerDrinks: {},
      finishPosition: null,
    },
  }), {})
);
