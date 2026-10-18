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
  [BELGIUM, svgPoint(528, 307), svgPoint(526, 312), FRANCE],
  [FRANCE, svgPoint(521, 323), svgPoint(516, 329), SPAIN_TOP],
  [SPAIN_TOP, svgPoint(507, 337), svgPoint(500, 341), PORTUGAL],
  [PORTUGAL, svgPoint(499, 346), svgPoint(511, 346), svgPoint(516, 342), SPAIN_R],
  [SPAIN_R, svgPoint(528, 334), svgPoint(537, 330), svgPoint(545, 332), ITALY],
  [ITALY, svgPoint(552, 320), svgPoint(550, 308), GERMANY],
  [GERMANY, svgPoint(541, 296), svgPoint(535, 298), BELGIUM],
];

export const DRIVE_CURVES = DRIVE_LEGS.map(
  (points) => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.2)
);
export const DRIVE_LENGTHS = DRIVE_CURVES.map((curve) => curve.getLength());

export const DRIVE_PATH_POINTS = DRIVE_LEGS.reduce((points, leg, legIndex) => {
  if (legIndex === 0) {
    return [...leg];
  }

  return [...points, ...leg.slice(1)];
}, []);
export const DRIVE_CURVE = new THREE.CatmullRomCurve3(DRIVE_PATH_POINTS, false, 'centripetal', 0.2);
export const DRIVE_LENGTH = DRIVE_CURVE.getLength();

const findStopProgress = (stop, startProgress) => {
  const sampleCount = 1200;
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
