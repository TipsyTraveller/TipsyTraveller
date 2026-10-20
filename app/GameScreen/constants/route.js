import * as THREE from 'three';
import { DEFAULT_COUNTRY_STOPS, normalizeCountryStops } from './countryStops';

export const getPathRevealDuration = (moveCount) => (
  moveCount > 0 ? 0.45 + moveCount * 0.22 : 0
);

const getTangentAngle = (curve, progress, lookWindow = 0.005) => {
  const clamped = THREE.MathUtils.clamp(progress, 0, 1);
  const back = curve.getPointAt(Math.max(0, clamped - lookWindow * 0.4));
  const ahead = curve.getPointAt(Math.min(1, clamped + lookWindow * 0.6));
  return Math.atan2(ahead.y - back.y, ahead.x - back.x);
};

export const createRouteModel = (countryStops) => {
  const stops = normalizeCountryStops(countryStops);
  const route = stops.map((stop) => new THREE.Vector3(stop.position.x, stop.position.y, -0.92));
  const curve = new THREE.CatmullRomCurve3(route, false, 'centripetal', 0.35);
  curve.arcLengthDivisions = 1400;
  curve.updateArcLengths();
  const length = curve.getLength();
  const arcLengths = curve.getLengths(curve.arcLengthDivisions);
  const lastControlIndex = route.length - 1;
  const stopProgress = route.map((_stop, index) => {
    if (index === 0) return 0;
    if (index === lastControlIndex) return 1;
    if (length <= Number.EPSILON) return index / lastControlIndex;

    const controlPointSample = Math.round(
      (index / lastControlIndex) * curve.arcLengthDivisions
    );
    return THREE.MathUtils.clamp(arcLengths[controlPointSample] / length, 0, 1);
  });

  return {
    countryStops: stops,
    route,
    markers: route,
    curve,
    length,
    stopProgress,
    stopDistances: stopProgress.map((progress) => progress * length),
    stopNames: stops.map((stop) => stop.name),
    finalStopIndex: route.length - 1,
    getTangentAngle: (progress, lookWindow) => getTangentAngle(curve, progress, lookWindow),
  };
};

export const DEFAULT_ROUTE_MODEL = createRouteModel(DEFAULT_COUNTRY_STOPS);
export const ROUTE = DEFAULT_ROUTE_MODEL.route;
export const MARKERS = DEFAULT_ROUTE_MODEL.markers;
export const DRIVE_CURVE = DEFAULT_ROUTE_MODEL.curve;
export const DRIVE_LENGTH = DEFAULT_ROUTE_MODEL.length;
export const STOP_PROGRESS = DEFAULT_ROUTE_MODEL.stopProgress;
export const STOP_DISTANCES = DEFAULT_ROUTE_MODEL.stopDistances;
export const STOP_NAMES = DEFAULT_ROUTE_MODEL.stopNames;
export const DRIVE_LEGS = ROUTE.slice(1).map((stop, index) => [ROUTE[index], stop]);
export const getSmoothRouteTangentAngle = (progress, lookWindow) => DEFAULT_ROUTE_MODEL.getTangentAngle(progress, lookWindow);
