import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from './mapCoordinates';
import { DEFAULT_COUNTRY_STOPS } from './countryStops';
import { createRouteModel, getPathRevealDuration } from './route';
import { DRIVE_SPEED_UNITS_PER_SECOND } from './movement';

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
export const ROADBLOCK_LEAD_THRESHOLD = 2;
export const ROADBLOCK_MIN_TURN_GAP = 3;
export const ROADBLOCK_SPAWN_CHANCE = 0.38;
export const ROADBLOCK_SCALE = 0.52;

export const ROADBLOCK_CHALLENGES = [
  {
    id: 'border-blitz',
    title: 'Border Blitz',
    prompt: 'Name 8 European countries in 12 seconds. No country already on your route may be used.',
    durationSeconds: 12,
  },
  {
    id: 'capital-chain',
    title: 'Capital Chain',
    prompt: 'Name 6 European capitals in 15 seconds without pausing longer than two seconds.',
    durationSeconds: 15,
  },
  {
    id: 'travel-tongue-twister',
    title: 'Travel Tongue Twister',
    prompt: 'Every teammate must say “Tipsy travellers take tricky turns” three times fast without a mistake.',
    durationSeconds: 18,
  },
];

const hashSeed = (value = '') => {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededFraction = (seed) => hashSeed(seed) / 4294967295;

const distanceBetween = (left, right) => Math.hypot(
  Number(left?.position?.x || 0) - Number(right?.position?.x || 0),
  Number(left?.position?.y || 0) - Number(right?.position?.y || 0)
);

export const getRoadblockLeaderGap = (gameplay, teamId) => {
  const activeLeg = Number(gameplay?.teamProgress?.[teamId]?.currentLeg) || 0;
  const trailingLegs = Object.entries(gameplay?.teamProgress || {})
    .filter(([candidateId, progress]) => candidateId !== teamId && !progress?.isDone)
    .map(([, progress]) => Number(progress?.currentLeg) || 0);

  if (!trailingLegs.length) return 0;
  return activeLeg - Math.max(...trailingLegs);
};

export const shouldTriggerRoadblock = ({ action, gameplay }) => {
  if (!action || !gameplay || action.targetLeg >= action.finalStopIndex) return false;
  if (action.fromLeg < ROADBLOCK_LEAD_THRESHOLD) return false;
  if (getRoadblockLeaderGap(gameplay, action.teamId) < ROADBLOCK_LEAD_THRESHOLD) return false;

  const history = Array.isArray(gameplay.roadblockHistory) ? gameplay.roadblockHistory : [];
  const latestForTeam = [...history].reverse().find((entry) => entry?.teamId === action.teamId);
  if (
    latestForTeam
    && (Number(gameplay.turnNumber) || 1) - (Number(latestForTeam.turnNumber) || 0) < ROADBLOCK_MIN_TURN_GAP
  ) {
    return false;
  }

  return seededFraction(`${action.id}:roadblock`) < ROADBLOCK_SPAWN_CHANCE;
};

const stripStopForGameplay = (stop) => ({
  id: stop.id,
  name: stop.name,
  code: stop.code || '',
  city: stop.city || '',
  accent: stop.accent || '#FFD700',
  position: {
    x: Number(stop.position.x),
    y: Number(stop.position.y),
  },
  ...(Array.isArray(stop.challenges) && stop.challenges.length
    ? { challenges: stop.challenges }
    : {}),
});

const withDetourChallenge = (stop, actionId, index) => {
  const challenges = (Array.isArray(stop?.challenges) ? stop.challenges : [])
    .filter((challenge) => !['countryWordGuess', 'geoGuessr'].includes(challenge?.type));
  const selected = challenges.length
    ? challenges[hashSeed(`${actionId}:detour-challenge:${index}`) % challenges.length]
    : null;

  return {
    ...stop,
    challenges: selected ? [selected] : [],
  };
};

export const selectDetourStops = ({ actionId, fromStop, routeStops, targetStop }) => {
  const routeIds = new Set((routeStops || []).map((stop) => stop.id));
  const directDistance = Math.max(distanceBetween(fromStop, targetStop), 0.01);
  const candidates = DEFAULT_COUNTRY_STOPS
    .filter((stop) => !routeIds.has(stop.id) && stop.id !== fromStop?.id && stop.id !== targetStop?.id)
    .map((stop) => ({
      stop,
      addedDistance: distanceBetween(fromStop, stop) + distanceBetween(stop, targetStop) - directDistance,
      routeDistance: distanceBetween(fromStop, stop) + distanceBetween(stop, targetStop),
    }))
    .filter(({ routeDistance }) => routeDistance >= directDistance * 1.28)
    .sort((left, right) => left.addedDistance - right.addedDistance);

  if (!candidates.length) return [];
  const nearbyPool = candidates.slice(0, Math.min(12, candidates.length));
  const firstIndex = hashSeed(`${actionId}:detour:first`) % nearbyPool.length;
  const first = nearbyPool[firstIndex].stop;

  const secondCandidates = DEFAULT_COUNTRY_STOPS
    .filter((stop) => !routeIds.has(stop.id) && stop.id !== first.id)
    .map((stop) => ({
      stop,
      distance: distanceBetween(first, stop) + distanceBetween(stop, targetStop),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 8);
  const second = secondCandidates.length
    ? secondCandidates[hashSeed(`${actionId}:detour:second`) % secondCandidates.length].stop
    : null;

  const selected = [first, second].filter(Boolean);
  if (selected.length === 2) {
    const forwardDistance = distanceBetween(fromStop, selected[0])
      + distanceBetween(selected[0], selected[1])
      + distanceBetween(selected[1], targetStop);
    const reverseDistance = distanceBetween(fromStop, selected[1])
      + distanceBetween(selected[1], selected[0])
      + distanceBetween(selected[0], targetStop);
    if (reverseDistance < forwardDistance) selected.reverse();
  }

  return selected.map((stop, index) => stripStopForGameplay(
    withDetourChallenge(stop, actionId, index)
  ));
};

export const createRoadblockEvent = ({ action, routeModel, turnNumber }) => {
  const fromStop = routeModel.countryStops[action.fromLeg];
  const targetStop = routeModel.countryStops[action.targetLeg];
  const detourStops = selectDetourStops({
    actionId: action.id,
    fromStop,
    routeStops: routeModel.countryStops,
    targetStop,
  });
  const challenge = ROADBLOCK_CHALLENGES[
    hashSeed(`${action.id}:challenge`) % ROADBLOCK_CHALLENGES.length
  ];

  return {
    id: `roadblock-${action.id}`,
    teamId: action.teamId,
    fromLeg: action.fromLeg,
    targetLeg: action.targetLeg,
    obstacleLeg: Math.min(action.fromLeg + 1, action.targetLeg),
    turnNumber,
    status: 'choice',
    choice: null,
    progressAlongLeg: 0.48,
    detourStops,
    challenge,
  };
};

export const createRoadblockMovementPath = ({ event, routeModel, type }) => {
  const fromStop = routeModel.countryStops[event.fromLeg];
  const targetStop = routeModel.countryStops[event.targetLeg];
  const stops = type === 'detour'
    ? [fromStop, ...(event.detourStops || []), targetStop]
    : routeModel.countryStops.slice(event.fromLeg, event.targetLeg + 1);

  return {
    type,
    stops: stops.map(stripStopForGameplay).map((stop, index) => ({ ...stop, order: index })),
  };
};

export const createRoadblockDetourSegment = ({ event, routeModel, step }) => {
  const detourStops = event?.detourStops || [];
  const fromStop = step === 0
    ? routeModel.countryStops[event.fromLeg]
    : detourStops[step - 1];
  const targetStop = step < detourStops.length
    ? detourStops[step]
    : routeModel.countryStops[event.targetLeg];

  if (!fromStop || !targetStop) return null;

  return {
    type: 'detour',
    stops: [fromStop, targetStop]
      .map(stripStopForGameplay)
      .map((stop, index) => ({ ...stop, order: index })),
  };
};

export const getRoadblockMovementTiming = ({ movementPath, now }) => {
  const movementRoute = createRouteModel(movementPath.stops);
  const movementStartsAt = now
    + (getPathRevealDuration(movementPath.stops.length - 1) + 0.08) * 1000;
  return {
    movementStartsAt,
    movementEndsAt: movementStartsAt
      + (movementRoute.length / DRIVE_SPEED_UNITS_PER_SECOND) * 1000,
  };
};

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
      scale: ROADBLOCK_SCALE,
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
    scale: options.scale || ROADBLOCK_SCALE,
    ...options,
  };
};
