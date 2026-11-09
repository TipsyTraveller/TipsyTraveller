import { useGLTF } from '@react-three/drei/native';
import { Platform } from 'react-native';

const DESKTOP_MAP_MODEL_SOURCE = require('../../../assets/models/world-map-vector.glb');
const MOBILE_MAP_MODEL_SOURCE = require('../../../assets/models/world-map-vector-mobile.glb');

export const MAP_MODEL_SOURCE = Platform.OS === 'web'
  ? DESKTOP_MAP_MODEL_SOURCE
  : MOBILE_MAP_MODEL_SOURCE;

// Timing helpers for the board load. Logs are dev-only so release builds stay quiet.
export const perfNow = () => (
  typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
);

export const perfLog = (message) => {
  if (__DEV__) {
    console.log(`[perf] ${message}`);
  }
};

export const boardLoadTimings = { preloadStartedAt: null };

// Native asset loading is started inside the mounted GL canvas. Preloading a
// GLB before that canvas exists can leave a rejected or suspended entry in the
// shared loader cache. Web does not have that Expo GL lifecycle constraint.
export const preloadBoardAssets = () => {
  if (Platform.OS !== 'web') return;

  if (boardLoadTimings.preloadStartedAt === null) {
    boardLoadTimings.preloadStartedAt = perfNow();
    perfLog('board preload started (map GLB)');
  }

  useGLTF.preload(MAP_MODEL_SOURCE, false, false);
};
