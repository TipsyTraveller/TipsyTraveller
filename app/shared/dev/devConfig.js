/**
 * Developer configuration and portal flags.
 *
 * Controls whether the Dev Portal is active.
 * Checked against EXPO_PUBLIC_ENABLE_DEV_PORTAL in .env files,
 * falling back to React Native's global __DEV__ flag.
 */

export const isDevPortalEnabled = () => {
  const envVal = process.env.EXPO_PUBLIC_ENABLE_DEV_PORTAL;
  if (envVal === 'false' || envVal === '0') {
    return false;
  }
  if (envVal === 'true' || envVal === '1') {
    return true;
  }
  return typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : false;
};
