import { onDisconnect, push, ref, serverTimestamp } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { createBetaRoomRecords } from '../../Lobby/betaLobbyState';
import { reserveRoomCode } from '../../Lobby/lobbyService';
import { roomRulesFromSettings } from '../../GameScreen/constants/roomRules';
import { getProfile, getSettings, saveActiveGameId } from '../storage/userSettings';
import { getOrCreateDevDeviceId } from './devFirebaseService';

export const createBetaLobby = async (draft) => {
  const [deviceID, profile, settings] = await Promise.all([getOrCreateDevDeviceId(), getProfile(), getSettings()]);
  const { gameData, teamMembers } = createBetaRoomRecords({
    scenario: draft.scenario, hostName: draft.hostName, guestNames: draft.guestNames, deviceID,
    playerIds: Array.from({ length: 7 }, () => push(ref(db, 'playerKeys')).key),
    badge: profile.badge, profileId: profile.isPersistent ? profile.profileId : null,
    roomRules: roomRulesFromSettings(settings), createdAt: Date.now(),
  });
  const gameID = await reserveRoomCode({ createGame: () => gameData, createPlayers: () => teamMembers });
  // Once the room exists, a local-storage/disconnect-hook failure must not trigger
  // a retry that creates a second room. The lobby also records the active game ID.
  await Promise.all([
    onDisconnect(ref(db, `games/${gameID}/disconnectedAt`)).set(serverTimestamp()),
    saveActiveGameId(gameID),
  ]).catch((error) => console.warn('Beta lobby created; connection bookkeeping could not complete.', error));
  return { gameID, gameData, teamMembers };
};
