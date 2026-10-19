import { child, get, push, ref, remove, runTransaction, serverTimestamp, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../firebaseConfig';

export const getOrCreateDevDeviceId = async () => {
  let deviceID = await AsyncStorage.getItem('deviceID');
  if (!deviceID) {
    deviceID = 'dev-device-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    await AsyncStorage.setItem('deviceID', deviceID);
  }
  return deviceID;
};

export const regenerateDeviceId = async () => {
  const newId = 'dev-device-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  await AsyncStorage.setItem('deviceID', newId);
  return newId;
};

/**
 * Adds a bot player to the specified team in Firebase.
 */
export const addBotPlayer = async (gameID, targetTeamNr = 2, customName) => {
  if (!gameID) {
    throw new Error('Please enter or select a game PIN.');
  }

  const playersRef = ref(db, `players/${gameID}`);
  const snapshot = await get(playersRef);
  const playersData = snapshot.exists() ? snapshot.val() : {};

  const teamKey = `team${targetTeamNr}`;
  const currentTeam = playersData[teamKey] || {};
  const isTeamEmpty = Object.keys(currentTeam).length === 0;

  const botName = customName || `Bot T${targetTeamNr} #${Math.floor(Math.random() * 900 + 100)}`;
  const botDeviceID = `dev-bot-t${targetTeamNr}-${Date.now().toString(36)}`;

  const teamRef = ref(db, `players/${gameID}/${teamKey}`);
  await push(teamRef, {
    name: botName,
    isLeader: isTeamEmpty,
    deviceID: botDeviceID,
  });

  // Calculate updated player counter
  let newCounter = 0;
  for (const key of ['team1', 'team2', 'team3']) {
    const teamObj = key === teamKey
      ? { ...currentTeam, tempKey: true }
      : (playersData[key] || {});
    newCounter += Object.keys(teamObj).length;
  }

  await set(ref(db, `players/${gameID}/playerCounter`), newCounter);

  return { success: true, botName, teamNr: targetTeamNr, isLeader: isTeamEmpty };
};

/**
 * Automatically adds minimum required bot players so the lobby can be started immediately.
 */
export const autoFillLobby = async (gameID) => {
  if (!gameID) {
    throw new Error('Please enter or select a game PIN.');
  }

  const gameSnap = await get(ref(db, `games/${gameID}`));
  const gameData = gameSnap.exists() ? gameSnap.val() : {};
  const isThreeTeams = gameData?.nrOfPlayers === '9-12';
  const requiredTeams = isThreeTeams ? [1, 2, 3] : [1, 2];

  const playersSnap = await get(ref(db, `players/${gameID}`));
  const playersData = playersSnap.exists() ? playersSnap.val() : {};

  let addedCount = 0;

  for (const teamNr of requiredTeams) {
    const teamKey = `team${teamNr}`;
    const teamPlayers = playersData[teamKey] || {};
    const teamHasPlayers = Object.keys(teamPlayers).length > 0;

    if (!teamHasPlayers) {
      await addBotPlayer(gameID, teamNr, `Dev Leader T${teamNr}`);
      addedCount += 1;
    }
  }

  return { success: true, addedCount };
};

/**
 * Automatically sets vehicle selections for all required teams in Firebase,
 * allowing the CharacterSelection screen to transition to GameScreen.
 */
export const readyUpTeams = async (gameID) => {
  if (!gameID) {
    throw new Error('Please enter or select a game PIN.');
  }

  const gameSnap = await get(ref(db, `games/${gameID}`));
  const gameData = gameSnap.exists() ? gameSnap.val() : {};
  const isThreeTeams = gameData?.nrOfPlayers === '9-12';
  const requiredTeams = isThreeTeams ? ['team1', 'team2', 'team3'] : ['team1', 'team2'];

  const defaultModels = {
    team1: 'car1',
    team2: 'car2',
    team3: 'car3',
  };

  const existingTeamModels = gameData?.teamModels || {};
  const updatedTeamModels = { ...existingTeamModels };

  requiredTeams.forEach((teamKey) => {
    if (!updatedTeamModels[teamKey]) {
      updatedTeamModels[teamKey] = defaultModels[teamKey] || 'car1';
    }
  });

  await set(ref(db, `games/${gameID}/teamModels`), updatedTeamModels);

  return { success: true, teamModels: updatedTeamModels };
};

/**
 * Creates a fully initialized live test room in Firebase Realtime Database
 * with host on Team 1 and a bot leader on Team 2.
 */
export const createLiveTestRoom = async ({
  nrOfPlayers = '1-4',
  difficulty = 'medium',
  duration = 'short',
} = {}) => {
  const deviceID = await getOrCreateDevDeviceId();

  let newGameID = '';
  let exists = true;

  while (exists) {
    newGameID = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await get(child(ref(db), `games/${newGameID}`));
    if (!snap.exists()) {
      exists = false;
    }
  }

  const gameData = {
    difficulty,
    duration,
    nrOfPlayers,
    HostName: 'Dev Host',
    hostDeviceID: deviceID,
    createdAt: Date.now(),
    status: 'lobby',
    teamModels: {},
  };

  await set(ref(db, `games/${newGameID}`), gameData);

  // Initialize players with host in team1 and dev bot in team2
  await set(ref(db, `players/${newGameID}`), {
    playerCounter: 2,
    team1: '',
    team2: '',
    team3: '',
  });

  await push(ref(db, `players/${newGameID}/team1`), {
    name: 'Dev Host',
    isLeader: true,
    deviceID,
  });

  await push(ref(db, `players/${newGameID}/team2`), {
    name: 'Dev Rival (T2)',
    isLeader: true,
    deviceID: `dev-bot-team2-${Date.now().toString(36)}`,
  });

  if (nrOfPlayers === '9-12') {
    await push(ref(db, `players/${newGameID}/team3`), {
      name: 'Dev Rival (T3)',
      isLeader: true,
      deviceID: `dev-bot-team3-${Date.now().toString(36)}`,
    });
    await set(ref(db, `players/${newGameID}/playerCounter`), 3);
  }

  return { gameID: newGameID, gameData };
};

/**
 * Removes bot players (devices starting with dev-bot-) from the specified game in Firebase.
 */
export const removeBotPlayers = async (gameID) => {
  if (!gameID) {
    throw new Error('Please enter or select a game PIN.');
  }

  const playersSnap = await get(ref(db, `players/${gameID}`));
  if (!playersSnap.exists()) return { removed: 0 };

  const data = playersSnap.val();
  let removedCount = 0;

  for (const teamKey of ['team1', 'team2', 'team3']) {
    const teamObj = data[teamKey];
    if (teamObj && typeof teamObj === 'object') {
      for (const [key, player] of Object.entries(teamObj)) {
        if (player?.deviceID && String(player.deviceID).startsWith('dev-bot-')) {
          await remove(ref(db, `players/${gameID}/${teamKey}/${key}`));
          removedCount += 1;
        }
      }
    }
  }

  // Update counter
  await runTransaction(ref(db, `players/${gameID}/playerCounter`), (current) => {
    return Math.max((current || 0) - removedCount, 0);
  });

  return { success: true, removedCount };
};
