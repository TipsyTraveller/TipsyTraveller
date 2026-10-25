import * as THREE from 'three';
import { MAP_Z } from './mapCoordinates';

export const DONE_POS = new THREE.Vector3(-0.55, -6.6, 4.6);
export const DONE_LOOK = new THREE.Vector3(0, -0.2, MAP_Z);
export const FOLLOW_OFFSET = DONE_POS.clone().sub(DONE_LOOK).multiplyScalar(0.38);

const OVERVIEW_BASE_SCALE = 0.58;
const OVERVIEW_MAX_SCALE = 0.82;
const OVERVIEW_SPREAD_SCALE = 0.035;
const WEST_OCEAN_THRESHOLD = -4.0;
const DESIRED_WEST_MARGIN = 0.85;
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(25));
const overviewBaseOffset = DONE_POS.clone().sub(DONE_LOOK);

export const setOverviewCameraPose = ({
  aspect = 2.0,
  cameraPosition,
  extraPositions = [],
  focusOffsetX = 0,
  lookAt,
  maxScale = OVERVIEW_MAX_SCALE,
  pieceRefs,
  scaleMultiplier = 1,
  targetPosition,
}) => {
  let minX = targetPosition?.x ?? Infinity;
  let maxX = targetPosition?.x ?? -Infinity;
  let minY = targetPosition?.y ?? Infinity;
  let maxY = targetPosition?.y ?? -Infinity;
  let z = targetPosition?.z ?? MAP_Z;
  let pointCount = targetPosition ? 1 : 0;

  for (const position of extraPositions) {
    if (!position) continue;
    minX = Math.min(minX, position.x);
    maxX = Math.max(maxX, position.x);
    minY = Math.min(minY, position.y);
    maxY = Math.max(maxY, position.y);
    z = Math.max(z, position.z ?? MAP_Z);
    pointCount += 1;
  }

  for (const pieceId in (pieceRefs || {})) {
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

  const spread = Math.max(maxX - minX, maxY - minY);
  const scale = THREE.MathUtils.clamp(
    (OVERVIEW_BASE_SCALE + spread * OVERVIEW_SPREAD_SCALE) * scaleMultiplier,
    OVERVIEW_BASE_SCALE,
    maxScale
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  let lookAtX = centerX;

  if (minX < WEST_OCEAN_THRESHOLD && !focusOffsetX) {
    const viewHalfHeight = overviewBaseOffset.z * scale * HALF_FOV_TAN;
    const viewHalfWidth = viewHalfHeight * aspect;
    const naturalLeftEdge = centerX - viewHalfWidth;
    const oceanMargin = minX - naturalLeftEdge;

    if (oceanMargin > DESIRED_WEST_MARGIN) {
      const excessOcean = oceanMargin - DESIRED_WEST_MARGIN;
      const maxShift = Math.max(0, viewHalfWidth - DESIRED_WEST_MARGIN - (maxX - centerX));
      const shift = Math.min(excessOcean, maxShift);
      lookAtX = centerX + shift;
    }
  }


  if (focusOffsetX) {
    const viewHalfHeight = overviewBaseOffset.z * scale * HALF_FOV_TAN;
    const viewHalfWidth = viewHalfHeight * aspect;
    lookAtX -= viewHalfWidth * focusOffsetX;
  }

  lookAt.set(lookAtX, centerY, z);
  cameraPosition.copy(overviewBaseOffset).multiplyScalar(scale).add(lookAt);
  return true;
};
