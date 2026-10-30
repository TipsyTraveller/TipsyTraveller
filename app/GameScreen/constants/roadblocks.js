import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from './mapCoordinates';
import { DEFAULT_COUNTRY_STOPS } from './countryStops';
import { createDetourRouteModel, createRouteModel, getPathRevealDuration } from './route';
import { DRIVE_SPEED_UNITS_PER_SECOND } from './movement';
import { resolveTimerSeconds } from './roomRules';
import { SIZE_IT_UP_CHALLENGE_TYPE } from './sizeItUp';

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

const pointSide = (start, end, point) => (
  (end.position.x - start.position.x) * (point.position.y - start.position.y)
  - (end.position.y - start.position.y) * (point.position.x - start.position.x)
);

const segmentIntersection = (a, b, c, d) => {
  const abC = pointSide(a, b, c);
  const abD = pointSide(a, b, d);
  const cdA = pointSide(c, d, a);
  const cdB = pointSide(c, d, b);
  return abC * abD < -1e-6 && cdA * cdB < -1e-6;
};

const turnAngle = (a, b, c) => {
  const first = Math.atan2(b.position.y - a.position.y, b.position.x - a.position.x);
  const second = Math.atan2(c.position.y - b.position.y, c.position.x - b.position.x);
  return Math.abs(Math.atan2(Math.sin(second - first), Math.cos(second - first)));
};

const projectedProgress = (start, end, point) => {
  const dx = end.position.x - start.position.x;
  const dy = end.position.y - start.position.y;
  const denominator = dx * dx + dy * dy || 1;
  return ((point.position.x - start.position.x) * dx
    + (point.position.y - start.position.y) * dy) / denominator;
};

const isValidDetourPair = ({ first, fromStop, routeStops, second, targetStop }) => {
  const directDistance = distanceBetween(fromStop, targetStop);
  const detour = [fromStop, first, second, targetStop];
  const legLengths = detour.slice(1).map((stop, index) => distanceBetween(detour[index], stop));
  const routeDistance = legLengths.reduce((sum, length) => sum + length, 0);
  const ratio = routeDistance / Math.max(directDistance, 0.01);
  const firstProgress = projectedProgress(fromStop, targetStop, first);
  const secondProgress = projectedProgress(fromStop, targetStop, second);
  const firstSide = pointSide(fromStop, targetStop, first);
  const secondSide = pointSide(fromStop, targetStop, second);
  if (firstProgress <= 0.04 || secondProgress >= 0.96 || secondProgress <= firstProgress) return false;
  if (Math.abs(firstSide) < 0.18 || Math.abs(secondSide) < 0.18 || firstSide * secondSide <= 0) return false;
  if (ratio < 1.25 || ratio > 2.25 || legLengths.some((length) => length < 0.72)) return false;
  if (turnAngle(fromStop, first, second) > (115 * Math.PI) / 180) return false;
  if (turnAngle(first, second, targetStop) > (115 * Math.PI) / 180) return false;
  if (segmentIntersection(fromStop, first, second, targetStop)) return false;

  const detourLegs = [[fromStop, first], [first, second], [second, targetStop]];
  const mainLegs = routeStops.slice(1).map((stop, index) => [routeStops[index], stop]);
  return !detourLegs.some(([start, end], detourIndex) => mainLegs.some(([mainStart, mainEnd]) => {
    const touchesBranch = detourIndex === 0 && (mainStart.id === fromStop.id || mainEnd.id === fromStop.id);
    const touchesRejoin = detourIndex === 2 && (mainStart.id === targetStop.id || mainEnd.id === targetStop.id);
    return !touchesBranch && !touchesRejoin && segmentIntersection(start, end, mainStart, mainEnd);
  }));
};

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
    .filter((challenge) => ![
      'countryWordGuess',
      'geoGuessr',
      SIZE_IT_UP_CHALLENGE_TYPE,
    ].includes(challenge?.type));
  const selected = challenges.length
    ? challenges[hashSeed(`${actionId}:detour-challenge:${index}`) % challenges.length]
    : null;

  return {
    ...stop,
    challenges: selected ? [selected] : [],
  };
};

export const selectDetourStops = ({
  actionId,
  allowFallback = false,
  fromStop,
  routeStops,
  targetStop,
}) => {
  const routeIds = new Set((routeStops || []).map((stop) => stop.id));
  const directDistance = Math.max(distanceBetween(fromStop, targetStop), 0.01);
  const candidates = DEFAULT_COUNTRY_STOPS.filter((stop) => !routeIds.has(stop.id));
  const pairs = [];
  const fallbackPairs = [];
  candidates.forEach((first) => candidates.forEach((second) => {
    if (first.id === second.id) return;
    const routeDistance = distanceBetween(fromStop, first)
      + distanceBetween(first, second)
      + distanceBetween(second, targetStop);
    const ratio = routeDistance / directDistance;
    const legs = [
      distanceBetween(fromStop, first),
      distanceBetween(first, second),
      distanceBetween(second, targetStop),
    ];
    const mean = routeDistance / 3;
    const imbalance = legs.reduce((sum, length) => sum + ((length - mean) ** 2), 0);
    const sameSide = pointSide(fromStop, targetStop, first)
      * pointSide(fromStop, targetStop, second) > 0;
    const pair = {
      first,
      second,
      score: Math.abs(ratio - 1.55) + imbalance * 0.04 + (sameSide ? 0 : 10),
    };
    if (isValidDetourPair({ first, fromStop, routeStops, second, targetStop })) {
      pairs.push(pair);
    } else if (allowFallback) {
      fallbackPairs.push(pair);
    }
  }));
  const availablePairs = pairs.length ? pairs : fallbackPairs;
  availablePairs.sort((left, right) => left.score - right.score
    || `${left.first.id}:${left.second.id}`.localeCompare(`${right.first.id}:${right.second.id}`));
  if (!availablePairs.length) return [];
  const bestPairs = availablePairs.slice(0, Math.min(8, availablePairs.length));
  const selectedPair = bestPairs[hashSeed(`${actionId}:detour-pair`) % bestPairs.length];

  return [selectedPair.first, selectedPair.second].map((stop, index) => stripStopForGameplay(
    withDetourChallenge(stop, actionId, index)
  ));
};

const selectRoadblockProgress = ({ detourStops, obstacleLeg, routeModel }) => {
  const startProgress = routeModel.stopProgress[obstacleLeg - 1] ?? 0;
  const endProgress = routeModel.stopProgress[obstacleLeg] ?? 1;
  const protectedPoints = [
    ...routeModel.markers,
    ...(detourStops || []).map((stop) => new THREE.Vector3(stop.position.x, stop.position.y, -0.92)),
  ];
  let best = { progress: 0.5, score: Number.POSITIVE_INFINITY };
  const before = new THREE.Vector3();
  const point = new THREE.Vector3();
  const after = new THREE.Vector3();
  for (let step = 0; step <= 16; step += 1) {
    const progress = 0.3 + (step / 16) * 0.4;
    const global = THREE.MathUtils.lerp(startProgress, endProgress, progress);
    routeModel.curve.getPointAt(Math.max(0, global - 0.006), before);
    routeModel.curve.getPointAt(global, point);
    routeModel.curve.getPointAt(Math.min(1, global + 0.006), after);
    const curvature = after.clone().sub(point).angleTo(point.clone().sub(before));
    const clearance = Math.min(...protectedPoints.map((candidate) => candidate.distanceTo(point)));
    const score = curvature * 2.5 - Math.min(clearance, 1.2) + Math.abs(progress - 0.5) * 0.1;
    if (score < best.score) best = { progress, score };
  }
  return best.progress;
};

export const createRoadblockEvent = ({
  action,
  allowFallbackDetour = false,
  routeModel,
  timerPace = 'relaxed',
  turnNumber,
}) => {
  const fromStop = routeModel.countryStops[action.fromLeg];
  const obstacleLeg = Math.min(action.fromLeg + 1, action.targetLeg);
  const targetStop = routeModel.countryStops[obstacleLeg];
  const detourStops = selectDetourStops({
    actionId: action.id,
    allowFallback: allowFallbackDetour,
    fromStop,
    routeStops: routeModel.countryStops,
    targetStop,
  });
  if (detourStops.length !== 2) return null;
  const challenge = ROADBLOCK_CHALLENGES[
    hashSeed(`${action.id}:challenge`) % ROADBLOCK_CHALLENGES.length
  ];

  return {
    id: `roadblock-${action.id}`,
    teamId: action.teamId,
    fromLeg: action.fromLeg,
    targetLeg: obstacleLeg,
    obstacleLeg,
    turnNumber,
    status: 'choice',
    choice: null,
    progressAlongLeg: selectRoadblockProgress({ detourStops, obstacleLeg, routeModel }),
    detourStops,
    challenge: {
      ...challenge,
      durationSeconds: resolveTimerSeconds(challenge.durationSeconds, timerPace),
    },
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

export const createRoadblockRouteModel = (movementPath) => (
  movementPath?.type === 'detour'
    ? createDetourRouteModel(movementPath.stops)
    : createRouteModel(movementPath.stops)
);

export const createRoadblockDetourSegment = ({ event, routeModel, step, targetStep = step + 1 }) => {
  const detourStops = event?.detourStops || [];
  const fromStop = step === 0
    ? routeModel.countryStops[event.fromLeg]
    : detourStops[step - 1];
  const targetStop = targetStep <= detourStops.length
    ? detourStops[targetStep - 1]
    : routeModel.countryStops[event.targetLeg];

  if (!fromStop || !targetStop || targetStep <= step || targetStep > detourStops.length + 1) {
    return null;
  }

  const fullMovement = createRoadblockMovementPath({ event, routeModel, type: 'detour' });

  if (fullMovement?.stops?.length >= 3) {
    const fullModel = createDetourRouteModel(fullMovement.stops);
    const pStart = fullModel.stopProgress[step] ?? 0;
    const pEnd = fullModel.stopProgress[targetStep] ?? 1;
    const SAMPLES = 16 * (targetStep - step);
    const sampledStops = [];
    const tempPoint = new THREE.Vector3();

    for (let i = 0; i <= SAMPLES; i += 1) {
      const frac = i / SAMPLES;
      const progress = pStart + (pEnd - pStart) * frac;
      fullModel.curve.getPointAt(progress, tempPoint);

      if (i === 0) {
        sampledStops.push({
          ...stripStopForGameplay(fromStop),
          position: { x: tempPoint.x, y: tempPoint.y },
          order: 0,
        });
      } else if (i === SAMPLES) {
        sampledStops.push({
          ...stripStopForGameplay(targetStop),
          position: { x: tempPoint.x, y: tempPoint.y },
          order: SAMPLES,
        });
      } else {
        sampledStops.push({
          id: `detour-step-${step}-${targetStep}-pt-${i}`,
          name: '',
          position: { x: tempPoint.x, y: tempPoint.y },
          order: i,
        });
      }
    }

    return {
      type: 'detour',
      stops: sampledStops,
    };
  }

  return {
    type: 'detour',
    stops: [fromStop, targetStop]
      .map(stripStopForGameplay)
      .map((stop, index) => ({ ...stop, order: index })),
  };
};

export const getRoadblockMovementTiming = ({ movementPath, movementStartsAt, now }) => {
  const movementRoute = createRoadblockRouteModel(movementPath);
  const startsAt = Number(movementStartsAt) || now
    + (getPathRevealDuration(1) + 0.08) * 1000;
  return {
    movementStartsAt: startsAt,
    movementEndsAt: startsAt
      + (movementRoute.length / DRIVE_SPEED_UNITS_PER_SECOND) * 1000,
  };
};

export const getDetourDirection = ({ event, routeModel }) => {
  const fromStop = routeModel?.countryStops?.[event?.fromLeg];
  const targetStop = routeModel?.countryStops?.[event?.targetLeg];
  const firstDetour = event?.detourStops?.[0];
  if (!fromStop || !targetStop || !firstDetour) return 'right';
  return pointSide(fromStop, targetStop, firstDetour) >= 0 ? 'left' : 'right';
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
