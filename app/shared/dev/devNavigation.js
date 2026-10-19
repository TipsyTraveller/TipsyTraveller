import { createNavigationContainerRef } from '@react-navigation/native';
import { getOrCreateDevDeviceId, createLiveTestRoom } from './devFirebaseService';

export const navigationRef = createNavigationContainerRef();

export const navigate = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    console.warn('[devNavigation] Navigation container not ready.');
  }
};

export const resetRoot = (routes) => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: routes.length - 1,
      routes,
    });
  }
};

export const getCurrentRouteInfo = () => {
  if (!navigationRef.isReady()) return null;
  const current = navigationRef.getCurrentRoute();
  return {
    name: current?.name || 'Unknown',
    params: current?.params || {},
  };
};

/**
 * Starts GameScreen directly with mock data, bypassing lobby and character selection entirely.
 */
export const startInstantGameScreen = async ({ teamCount = 2, teamModels } = {}) => {
  const isThreeTeams = teamCount === 3;
  const deviceID = await getOrCreateDevDeviceId();

  const mockGameData = {
    difficulty: 'medium',
    duration: 'short',
    nrOfPlayers: isThreeTeams ? '9-12' : '1-4',
    HostName: 'Dev Host',
    status: 'game',
    teamModels: teamModels || {
      team1: 'car1',
      team2: 'car2',
      ...(isThreeTeams ? { team3: 'car3' } : {}),
    },
  };

  const mockTeamMembers = {
    playerCounter: isThreeTeams ? 3 : 2,
    team1: {
      devHost: {
        name: 'Dev Host',
        isLeader: true,
        deviceID,
      },
    },
    team2: {
      devBot2: {
        name: 'Dev Rival (T2)',
        isLeader: true,
        deviceID: 'dev-bot-team2',
      },
    },
    ...(isThreeTeams
      ? {
          team3: {
            devBot3: {
              name: 'Dev Rival (T3)',
              isLeader: true,
              deviceID: 'dev-bot-team3',
            },
          },
        }
      : { team3: '' }),
  };

  navigate('GameScreen', {
    gameID: 'DEV-INSTANT',
    isDevGame: true,
    gameData: mockGameData,
    teamMembers: mockTeamMembers,
  });
};

/**
 * Starts CharacterSelection screen with mock team members,
 * assigning the current device as the Team 1 leader.
 */
export const startInstantCharacterSelection = async ({ teamCount = 2 } = {}) => {
  const isThreeTeams = teamCount === 3;
  const deviceID = await getOrCreateDevDeviceId();

  const mockGameData = {
    difficulty: 'medium',
    duration: 'short',
    nrOfPlayers: isThreeTeams ? '9-12' : '1-4',
    HostName: 'Dev Host',
    hostDeviceID: deviceID,
    status: 'characterSelection',
    teamModels: {},
  };

  const mockTeamMembers = {
    playerCounter: isThreeTeams ? 3 : 2,
    team1: {
      devHost: {
        name: 'Dev Host',
        isLeader: true,
        deviceID,
      },
    },
    team2: {
      devBot2: {
        name: 'Dev Rival (T2)',
        isLeader: true,
        deviceID: 'dev-bot-team2',
      },
    },
    ...(isThreeTeams
      ? {
          team3: {
            devBot3: {
              name: 'Dev Rival (T3)',
              isLeader: true,
              deviceID: 'dev-bot-team3',
            },
          },
        }
      : { team3: '' }),
  };

  navigate('CharacterSelection', {
    gameID: 'DEV-MOCK',
    gameData: mockGameData,
    teamMembers: mockTeamMembers,
  });
};

/**
 * Creates a real Firebase test room and opens the Lobby.
 */
export const startLiveTestLobby = async ({ nrOfPlayers = '1-4' } = {}) => {
  const { gameID, gameData } = await createLiveTestRoom({ nrOfPlayers });
  navigate('LobbyScreen', {
    gameID,
    isHost: true,
    hostName: 'Dev Host',
    gameSettings: gameData,
  });
  return gameID;
};
