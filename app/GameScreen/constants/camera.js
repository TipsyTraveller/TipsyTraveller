import * as THREE from 'three';
import { MAP_Z } from './mapCoordinates';

export const DONE_POS = new THREE.Vector3(-0.55, -6.6, 4.6);
export const DONE_LOOK = new THREE.Vector3(0, -0.2, MAP_Z);
export const FOLLOW_OFFSET = DONE_POS.clone().sub(DONE_LOOK).multiplyScalar(0.38);

const OVERVIEW_BASE_SCALE = 0.78;
const OVERVIEW_MAX_SCALE = 0.98;
const OVERVIEW_SPREAD_SCALE = 0.045;
const overviewBaseOffset = DONE_POS.clone().sub(DONE_LOOK);

export const setOverviewCameraPose = ({
  cameraPosition,
  lookAt,
  pieceRefs,
  targetPosition,
}) => {
  let minX = targetPosition?.x ?? Infinity;
  let maxX = targetPosition?.x ?? -Infinity;
  let minY = targetPosition?.y ?? Infinity;
  let maxY = targetPosition?.y ?? -Infinity;
  let z = targetPosition?.z ?? MAP_Z;
  let pointCount = targetPosition ? 1 : 0;

  for (const pieceId in pieceRefs) {
    const position = pieceRefs[pieceId]?.current?.position;
    if (!position) continue;

    minX = Math.min(minX, position.x);
    maxX = Math.max(maxX, position.x);
    minY = Math.min(minY, position.y);
    maxY = Math.max(maxY, position.y);
    z = Math.max(z, position.z);
    pointCount += 1;
  }

  if (!pointCount) return false;

  lookAt.set((minX + maxX) / 2, (minY + maxY) / 2, z);
  const spread = Math.max(maxX - minX, maxY - minY);
  const scale = THREE.MathUtils.clamp(
    OVERVIEW_BASE_SCALE + spread * OVERVIEW_SPREAD_SCALE,
    OVERVIEW_BASE_SCALE,
    OVERVIEW_MAX_SCALE
  );
  cameraPosition.copy(overviewBaseOffset).multiplyScalar(scale).add(lookAt);
  return true;
};
