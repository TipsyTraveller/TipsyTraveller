/**
 * Developer configuration and portal flags.
 *
 * Controls whether the Dev Portal is active.
 * Checked against EXPO_PUBLIC_ENABLE_DEV_PORTAL in .env files,
 * falling back to React Native's global __DEV__ flag.
 */

export const isDevPortalEnabled = () => {
  try {
    const envVal =
      typeof process !== 'undefined' && process?.env
        ? process.env.EXPO_PUBLIC_ENABLE_DEV_PORTAL
        : undefined;

    if (envVal === 'false' || envVal === '0') {
      return false;
    }
    if (envVal === 'true' || envVal === '1') {
      return true;
    }
  } catch (error) {
    console.warn('[devConfig] Failed to read environment variable:', error);
  }

  return typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : false;
};
