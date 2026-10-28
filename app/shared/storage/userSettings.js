import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  PLAYER_NAME: '@tipsy_player_name',
  PLAYER_BADGE: '@tipsy_player_badge',
  PREFERRED_VEHICLE: '@tipsy_preferred_vehicle',
  STATS: '@tipsy_player_stats',
  SETTINGS: '@tipsy_settings',
  DEVICE_ID: 'deviceID',
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
  preferredVehicle: 'car1',
};

export const DEFAULT_STATS = {
  toursCompleted: 0,
  challengesCompleted: 0,
  sipsLogged: 0,
  diceRolls: 0,
};

export const DEFAULT_SETTINGS = {
  soundEffects: true,
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
    const [name, badge, vehicle] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.PLAYER_NAME),
      AsyncStorage.getItem(STORAGE_KEYS.PLAYER_BADGE),
      AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_VEHICLE),
    ]);
    return {
      name: name || DEFAULT_PROFILE.name,
      badge: badge || DEFAULT_PROFILE.badge,
      preferredVehicle: vehicle || DEFAULT_PROFILE.preferredVehicle,
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
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name.trim()));
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

/**
 * Increments an individual statistic counter.
 */
export const incrementStat = async (key, amount = 1) => {
  try {
    const current = await getStats();
    const updated = {
      ...current,
      [key]: Math.max(0, (current[key] || 0) + amount),
    };
    await saveStats(updated);
    return updated;
  } catch (error) {
    console.warn('[userSettings] Failed to increment stat:', error);
    return null;
  }
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
      AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS)),
    ]);
    return true;
  } catch (error) {
    console.warn('[userSettings] Failed to reset account data:', error);
    return false;
  }
};
