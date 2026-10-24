import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from './mapCoordinates';

export const ROADBLOCK_PALETTE = {
  cream: '#FFF1CD',
  warningRed: '#E8412F',
  navy: '#223144',
  slate: '#1A242F',
  amber: '#FF9800',
  amberBright: '#FFD700',
  sandbag: '#D4B895',
  coneOrange: '#FF5722',
  shadow: '#15222E',
};

export const ROADBLOCK_BASE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.008;

/**
 * Calculates a roadblock descriptor placed directly across a route curve leg,
 * orienting its face perpendicular to oncoming vehicle traffic.
 *
 * @param {object} routeModel - Active route model with curve and stop distances
 * @param {number} legIndex - Destination stop index of the target travel leg (1-based)
 * @param {number} progressAlongLeg - Fraction along this leg [0..1] (default 0.5)
 * @param {object} options - Custom overrides (detourDirection, scale, etc.)
 */
export const createRoadblockOnRoute = (
  routeModel,
  legIndex = 1,
  progressAlongLeg = 0.5,
  options = {}
) => {
  if (!routeModel?.curve || !routeModel?.stopProgress) {
    return {
      id: `roadblock-${Date.now()}`,
      position: [0, 0, ROADBLOCK_BASE_Z],
      rotation: [0, 0, 0],
      detourDirection: 'right',
      scale: 0.95,
      ...options,
    };
  }

  const validLeg = THREE.MathUtils.clamp(
    legIndex,
    1,
    Math.max(routeModel.stopProgress.length - 1, 1)
  );
  const startProgress = routeModel.stopProgress[validLeg - 1] || 0;
  const endProgress = routeModel.stopProgress[validLeg] || 1;
  const clampedT = THREE.MathUtils.clamp(progressAlongLeg, 0.05, 0.95);
  const globalProgress = THREE.MathUtils.lerp(startProgress, endProgress, clampedT);

  const point = new THREE.Vector3();
  routeModel.curve.getPointAt(globalProgress, point);

  // Tangent is the driving direction of oncoming traffic.
  // We orient the barrier perpendicular (rotated 90 deg) so it spans the lane.
  const tangentAngle = routeModel.getTangentAngle(globalProgress, 0.006);
  const barrierRotationZ = tangentAngle - Math.PI / 2;

  return {
    id: `roadblock-leg-${validLeg}`,
    legIndex: validLeg,
    progressAlongLeg: clampedT,
    globalProgress,
    position: [point.x, point.y, ROADBLOCK_BASE_Z],
    rotation: [0, 0, barrierRotationZ],
    detourDirection: options.detourDirection || 'right',
    scale: options.scale || 0.95,
    ...options,
  };
};
