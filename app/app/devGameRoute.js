export const START_ON_DEV_GAME_SCREEN = false;

export const DEV_GAME_ROUTE_PARAMS = {
  gameID: 'DEV-0000',
  isDevGame: true,
  gameData: {
    difficulty: 'medium',
    duration: 'short',
    nrOfPlayers: '1-4',
    HostName: 'Dev Host',
    status: 'game',
    teamModels: {
      team1: 'car1',
      team2: 'car1',
    },
  },
  teamMembers: {
    playerCounter: 2,
    team1: {
      devPlayer1: {
        name: 'Dev Team 1',
        isLeader: true,
        deviceID: 'dev-device-team-1',
      },
    },
    team2: {
      devPlayer2: {
        name: 'Dev Team 2',
        isLeader: true,
        deviceID: 'dev-device-team-2',
      },
    },
    team3: '',
  },
};
