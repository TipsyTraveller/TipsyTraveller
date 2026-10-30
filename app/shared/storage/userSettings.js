import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  PLAYER_NAME: '@tipsy_player_name',
  PLAYER_BADGE: '@tipsy_player_badge',
  PREFERRED_VEHICLE: '@tipsy_preferred_vehicle',
  PROFILE_ID: '@tipsy_profile_id',
  STATS: '@tipsy_player_stats',
  CAREER_SYNC: '@tipsy_career_sync',
  SETTINGS: '@tipsy_settings',
  GAMEPLAY_ONBOARDING: '@tipsy_gameplay_onboarding_v1',
  ACTIVE_GAME_ID: '@tipsy_active_game_id',
  DEVICE_ID: 'deviceID',
};

export const getActiveGameId = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
  } catch (_error) {
    return null;
  }
};

export const saveActiveGameId = async (gameID) => {
  if (!gameID) return false;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_ID, String(gameID));
    return true;
  } catch (_error) {
    return false;
  }
};

export const clearActiveGameId = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    return true;
  } catch (_error) {
    return false;
  }
};

export const hasCompletedGameplayOnboarding = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.GAMEPLAY_ONBOARDING) === 'complete';
  } catch (_error) {
    return false;
  }
};

export const completeGameplayOnboarding = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GAMEPLAY_ONBOARDING, 'complete');
  } catch (_error) {
    // Onboarding remains skippable even if local persistence is unavailable.
  }
};

export const BADGE_OPTIONS = [
  { id: 'legend', label: 'Party Legend', emoji: '🍺', description: 'Always down for another stop' },
  { id: 'captain', label: 'Road Captain', emoji: '🏎️', description: 'Steers the team to glory' },
  { id: 'shotgun', label: 'Shotgun King', emoji: '👑', description: 'Controls the aux and the dice' },
  { id: 'navigator', label: 'Navigator', emoji: '🗺️', description: 'Knows every detour on the map' },
  { id: 'mixologist', label: 'Mixologist', emoji: '🍹', description: 'Master of party concoctions' },
  { id: 'roller', label: 'High Roller', emoji: '🎲', description: 'Blessed by the dice gods' },
  { id: 'daredevil', label: 'Daredevil', emoji: '🎯', description: 'Never backs down from a challenge' },
  { id: 'tourist', label: 'Chill Tourist', emoji: '🌴', description: 'Here for the vibes and scenery' },
];

export const DEFAULT_PROFILE = {
  name: '',
  badge: 'legend',
  preferredVehicle: 'barrel_roadster',
};

export const DEFAULT_STATS = {
  toursCompleted: 0,
  challengesCompleted: 0,
  sipsLogged: 0,
  diceRolls: 0,
};

export const DEFAULT_SETTINGS = {
  ambientMusic: false,
  hapticFeedback: true,
  challengeTimer: 'relaxed', // 'relaxed' | 'speed'
  fastDice: false,
  autoAdvanceTurn: false,
  cameraFollow: true,
};

/**
 * Loads the stored player profile from AsyncStorage.
 */
export const getProfile = async () => {
  try {
    const [name, badge, vehicle, storedProfileId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.PLAYER_NAME),
      AsyncStorage.getItem(STORAGE_KEYS.PLAYER_BADGE),
      AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_VEHICLE),
      AsyncStorage.getItem(STORAGE_KEYS.PROFILE_ID),
    ]);
    let profileId = storedProfileId;
    if (name && !profileId) {
      profileId = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_ID, profileId);
    }
    return {
      name: name || DEFAULT_PROFILE.name,
      badge: badge || DEFAULT_PROFILE.badge,
      preferredVehicle: vehicle === 'car1' ? DEFAULT_PROFILE.preferredVehicle : (vehicle || DEFAULT_PROFILE.preferredVehicle),
      profileId: name ? profileId : null,
      isPersistent: Boolean(name && profileId),
    };
  } catch (error) {
    console.warn('[userSettings] Failed to load profile:', error);
    return { ...DEFAULT_PROFILE };
  }
};

/**
 * Persists profile updates to AsyncStorage.
 */
export const saveProfile = async ({ name, badge, preferredVehicle }) => {
  try {
    const operations = [];
    if (typeof name === 'string') {
      const trimmedName = name.trim();
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.PLAYER_NAME, trimmedName));
      if (trimmedName && !await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_ID)) {
        const profileId = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        operations.push(AsyncStorage.setItem(STORAGE_KEYS.PROFILE_ID, profileId));
      }
    }
    if (typeof badge === 'string') {
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.PLAYER_BADGE, badge));
    }
    if (typeof preferredVehicle === 'string') {
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_VEHICLE, preferredVehicle));
    }
    await Promise.all(operations);
    return true;
  } catch (error) {
    console.warn('[userSettings] Failed to save profile:', error);
    return false;
  }
};

/**
 * Loads player lifetime statistics.
 */
export const getStats = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return {
      toursCompleted: Number(parsed.toursCompleted) || 0,
      challengesCompleted: Number(parsed.challengesCompleted) || 0,
      sipsLogged: Number(parsed.sipsLogged) || 0,
      diceRolls: Number(parsed.diceRolls) || 0,
    };
  } catch (error) {
    console.warn('[userSettings] Failed to load stats:', error);
    return { ...DEFAULT_STATS };
  }
};

/**
 * Persists player lifetime statistics.
 */
export const saveStats = async (stats) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return true;
  } catch (error) {
    console.warn('[userSettings] Failed to save stats:', error);
    return false;
  }
};

let careerSyncQueue = Promise.resolve();

/**
 * Applies absolute per-session gameplay counters to the local saved profile.
 * The stored checkpoint makes repeated Firebase snapshots and reconnects idempotent.
 */
export const syncCareerStats = ({ profileId, sessionId, playerId, sessionStats }) => {
  careerSyncQueue = careerSyncQueue.then(async () => {
    if (!profileId || !sessionId || !playerId || !sessionStats) return null;

    const rawSync = await AsyncStorage.getItem(STORAGE_KEYS.CAREER_SYNC);
    const syncState = rawSync ? JSON.parse(rawSync) : {};
    const checkpointKey = `${profileId}:${sessionId}:${playerId}`;
    const previous = syncState[checkpointKey] || DEFAULT_STATS;
    const current = {
      toursCompleted: Math.max(0, Number(sessionStats.toursCompleted) || 0),
      challengesCompleted: Math.max(0, Number(sessionStats.challengesCompleted) || 0),
      sipsLogged: Math.max(0, Number(sessionStats.sipsLogged) || 0),
      diceRolls: Math.max(0, Number(sessionStats.diceRolls) || 0),
    };
    const lifetime = await getStats();
    const updated = Object.keys(DEFAULT_STATS).reduce((next, key) => ({
      ...next,
      [key]: Math.max(0, (Number(lifetime[key]) || 0) + current[key] - (Number(previous[key]) || 0)),
    }), {});

    delete syncState[checkpointKey];
    const recentEntries = Object.entries({ ...syncState, [checkpointKey]: current }).slice(-40);
    await Promise.all([
      saveStats(updated),
      AsyncStorage.setItem(STORAGE_KEYS.CAREER_SYNC, JSON.stringify(Object.fromEntries(recentEntries))),
    ]);
    return updated;
  }).catch((error) => {
    console.warn('[userSettings] Failed to synchronize career stats:', error);
    return null;
  });

  return careerSyncQueue;
};

/**
 * Loads game and application settings.
 */
export const getSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const { drinkMode: _legacyDrinkMode, ...currentSettings } = parsed;
    return {
      ...DEFAULT_SETTINGS,
      ...currentSettings,
    };
  } catch (error) {
    console.warn('[userSettings] Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Persists game and application settings.
 */
export const saveSettings = async (settings) => {
  try {
    const current = await getSettings();
    const { drinkMode: _legacyDrinkMode, ...nextSettings } = settings || {};
    const merged = { ...current, ...nextSettings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.warn('[userSettings] Failed to save settings:', error);
    return null;
  }
};

/**
 * Resets settings back to their default values.
 */
export const resetSettings = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.warn('[userSettings] Failed to reset settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Resets all account profile and stats data.
 */
export const resetAccountData = async () => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.PLAYER_NAME),
      AsyncStorage.removeItem(STORAGE_KEYS.PLAYER_BADGE),
      AsyncStorage.removeItem(STORAGE_KEYS.PREFERRED_VEHICLE),
      AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.CAREER_SYNC),
      AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS)),
    ]);
    return true;
  } catch (error) {
    console.warn('[userSettings] Failed to reset account data:', error);
    return false;
  }
};
