import { useGLTF } from '@react-three/drei/native';

export const MAP_MODEL_SOURCE = require('../../../assets/models/world-map-vector.glb');
export const MARKER_MODEL_SOURCE = require('../../../assets/models/location.glb');

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

// Warms the useGLTF cache so the board does not stall on GLB decoding when GameScreen mounts.
// Vehicle models are not preloaded here: the selection screen already loads the ones players browse.
export const preloadBoardAssets = () => {
  if (boardLoadTimings.preloadStartedAt === null) {
    boardLoadTimings.preloadStartedAt = perfNow();
    perfLog('board preload started (map + marker GLBs)');
  }

  useGLTF.preload(MAP_MODEL_SOURCE);
  useGLTF.preload(MARKER_MODEL_SOURCE);
};
