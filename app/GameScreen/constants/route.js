import * as THREE from 'three';
import { svgPoint } from './mapCoordinates';

export const BELGIUM = svgPoint(529, 301);
export const FRANCE = svgPoint(523, 317);
export const SPAIN_TOP = svgPoint(511, 331);
export const PORTUGAL = svgPoint(493, 342);
export const SPAIN_R = svgPoint(520, 341);
export const ITALY = svgPoint(551, 333);
export const GERMANY = svgPoint(546, 298);

export const ROUTE = [BELGIUM, FRANCE, SPAIN_TOP, PORTUGAL, SPAIN_R, ITALY, GERMANY, BELGIUM];
export const MARKERS = ROUTE.slice(0, -1);

export const DRIVE_LEGS = [
  [BELGIUM, svgPoint(527, 306), svgPoint(525, 312), FRANCE],
  [FRANCE, svgPoint(520, 322), svgPoint(516, 327), SPAIN_TOP],
  [SPAIN_TOP, svgPoint(503, 334), svgPoint(496, 337), PORTUGAL],
  [PORTUGAL, svgPoint(495, 347), svgPoint(503, 348), svgPoint(512, 346), SPAIN_R],
  [SPAIN_R, svgPoint(528, 335), svgPoint(538, 333), svgPoint(546, 334), ITALY],
  [ITALY, svgPoint(553, 326), svgPoint(552, 316), svgPoint(549, 307), GERMANY],
  [GERMANY, svgPoint(541, 296), svgPoint(535, 297), BELGIUM],
];

export const DRIVE_CURVES = DRIVE_LEGS.map(
  (points) => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45)
);
export const DRIVE_LENGTHS = DRIVE_CURVES.map((curve) => curve.getLength());

export const DRIVE_PATH_POINTS = DRIVE_LEGS.reduce((points, leg, legIndex) => {
  if (legIndex === 0) {
    return [...leg];
  }

  return [...points, ...leg.slice(1)];
}, []);
export const DRIVE_CURVE = new THREE.CatmullRomCurve3(DRIVE_PATH_POINTS, false, 'centripetal', 0.45);
DRIVE_CURVE.arcLengthDivisions = 1400;
DRIVE_CURVE.updateArcLengths();
export const DRIVE_LENGTH = DRIVE_CURVE.getLength();

const tangentSampleBack = new THREE.Vector3();
const tangentSampleAhead = new THREE.Vector3();

export const getSmoothRouteTangentAngle = (progress, lookWindow = 0.005) => {
  const clamped = THREE.MathUtils.clamp(progress, 0, 1);
  const backU = Math.max(0, clamped - lookWindow * 0.4);
  const aheadU = Math.min(1, clamped + lookWindow * 0.6);

  if (aheadU - backU < 1e-4) {
    const tangent = DRIVE_CURVE.getTangentAt(THREE.MathUtils.clamp(clamped, 0.001, 0.999));
    return Math.atan2(tangent.y, tangent.x);
  }

  DRIVE_CURVE.getPointAt(backU, tangentSampleBack);
  DRIVE_CURVE.getPointAt(aheadU, tangentSampleAhead);

  return Math.atan2(
    tangentSampleAhead.y - tangentSampleBack.y,
    tangentSampleAhead.x - tangentSampleBack.x
  );
};

export const getPathRevealDuration = (moveCount) => (
  moveCount > 0 ? 0.45 + moveCount * 0.22 : 0
);

const findStopProgress = (stop, startProgress) => {
  const sampleCount = 1400;
  let closestProgress = startProgress;
  let closestDistance = Infinity;

  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = startProgress + ((1 - startProgress) * index) / sampleCount;
    const point = DRIVE_CURVE.getPointAt(progress);
    const distance = point.distanceToSquared(stop);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestProgress = progress;
    }
  }

  return closestProgress;
};

export const STOP_PROGRESS = ROUTE.reduce((progressStops, stop, index) => {
  if (index === 0) return [0];
  if (index === ROUTE.length - 1) return [...progressStops, 1];

  return [...progressStops, findStopProgress(stop, progressStops[index - 1] + 0.001)];
}, []);
export const STOP_DISTANCES = STOP_PROGRESS.map((progress) => progress * DRIVE_LENGTH);

export const STOP_NAMES = ['Belgium', 'France', 'Spain', 'Portugal', 'Spain', 'Italy', 'Germany', 'Belgium'];
