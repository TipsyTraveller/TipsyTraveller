import { useGLTF } from '@react-three/drei/native';

export const MAP_MODEL_SOURCE = require('../../../assets/models/world-map-vector.glb');
export const MARKER_MODEL_SOURCE = require('../../../assets/models/location.glb');

// Warms the useGLTF cache so the board does not stall on GLB decoding when GameScreen mounts.
// Vehicle models are not preloaded here: the selection screen already loads the ones players browse.
export const preloadBoardAssets = () => {
  useGLTF.preload(MAP_MODEL_SOURCE);
  useGLTF.preload(MARKER_MODEL_SOURCE);
};
