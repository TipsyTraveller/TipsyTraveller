export const getRoomRoute = ({ gameID, gameData, teamMembers }) => {
  if (gameData?.status === 'game' && gameData?.gameplay) {
    return {
      name: 'GameScreen',
      params: { gameID, gameData, teamMembers },
    };
  }

  if (gameData?.status === 'characterSelection') {
    return {
      name: 'CharacterSelection',
      params: { gameID, gameData, teamMembers },
    };
  }

  return {
    name: 'LobbyScreen',
    params: { gameID, gameSettings: gameData },
  };
};
