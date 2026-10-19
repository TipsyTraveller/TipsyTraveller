import { memo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import {
  DRIVE_CURVE,
  DRIVE_LENGTH,
  getSmoothRouteTangentAngle,
  ROUTE,
  STOP_DISTANCES,
} from '../constants/route';
import VehicleModel from './VehicleModel';

const DRIVE_SPEED = 2;
const CAR_ROTATION_OFFSET = Math.PI / 2;
const CAR_BASE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.022;
const CAR_BOUNCE_HEIGHT = 0.01;
const CAR_BOUNCE_SPEED = 9.5;
const PASS_JUMP_HEIGHT = 0.72;
const PASS_JUMP_RADIUS = 0.72;
const PASS_FLIP_START = 0.22;
const PASS_FLIP_END = 0.84;
const PARKING_LATERAL_SPACING = 0.3;
const PARKING_DAMPING = 9;
const PARKING_TRANSITION_DISTANCE = 0.7;
const ROTATION_DAMPING = 20;
const EMPTY_PASSED_VEHICLE_DISTANCES = [];

const lerpAngle = (from, to, amount) => {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * amount;
};

const getCarHeading = (progress) => (
  getSmoothRouteTangentAngle(progress, 0.005) + CAR_ROTATION_OFFSET
);

const getMovingParkingOffset = ({
  distance,
  startDistance,
  targetDistance,
  startOffset,
  targetOffset,
}) => {
  const travelDistance = Math.max(targetDistance - startDistance, 0.001);
  const transitionDistance = Math.min(
    PARKING_TRANSITION_DISTANCE,
    travelDistance * 0.38
  );
  const departureEnd = startDistance + transitionDistance;
  const approachStart = targetDistance - transitionDistance;

  if (distance <= departureEnd) {
    const departureProgress = THREE.MathUtils.smoothstep(
      distance,
      startDistance,
      departureEnd
    );
    return THREE.MathUtils.lerp(startOffset, 0, departureProgress);
  }

  if (distance >= approachStart) {
    const approachProgress = THREE.MathUtils.smoothstep(
      distance,
      approachStart,
      targetDistance
    );
    return THREE.MathUtils.lerp(0, targetOffset, approachProgress);
  }

  return 0;
};

const updatePassJumpTransform = (distance, passedVehicleDistances, jumpTransform) => {
  jumpTransform.arc = 0;
  jumpTransform.height = 0;
  jumpTransform.rotation = 0;

  for (let index = 0; index < passedVehicleDistances.length; index += 1) {
    const obstacleDistance = passedVehicleDistances[index];
    const distanceFromVehicle = Math.abs(distance - obstacleDistance);
    if (distanceFromVehicle >= PASS_JUMP_RADIUS) continue;

    const jumpProgress = distanceFromVehicle / PASS_JUMP_RADIUS;
    const smoothArc = (1 + Math.cos(jumpProgress * Math.PI)) / 2;
    if (smoothArc <= jumpTransform.arc) continue;

    const airborneProgress = THREE.MathUtils.clamp(
      (distance - obstacleDistance + PASS_JUMP_RADIUS) / (PASS_JUMP_RADIUS * 2),
      0,
      1
    );
    const flipProgress = THREE.MathUtils.smoothstep(
      airborneProgress,
      PASS_FLIP_START,
      PASS_FLIP_END
    );

    jumpTransform.arc = smoothArc;
    jumpTransform.height = smoothArc * PASS_JUMP_HEIGHT;
    jumpTransform.rotation = flipProgress * Math.PI * 2;
  }
};

const applyCarTransform = ({
  pieceRef,
  bodyRef,
  progress,
  targetPoint,
  moving,
  distance,
  parkingOffset,
  parkingOffsetRef,
  passedVehicleDistances,
  passJumpTransform,
  clockTime,
  delta,
  rotationRef,
  snapRotation = false,
}) => {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  DRIVE_CURVE.getPointAt(clampedProgress, targetPoint);

  const routeAngle = getSmoothRouteTangentAngle(clampedProgress, 0.005);
  if (moving) {
    parkingOffsetRef.current = parkingOffset;
  } else {
    const parkingAlpha = 1 - Math.exp(-PARKING_DAMPING * delta);
    parkingOffsetRef.current = THREE.MathUtils.lerp(
      parkingOffsetRef.current,
      parkingOffset,
      parkingAlpha
    );
  }

  pieceRef.current.position.set(
    targetPoint.x - Math.sin(routeAngle) * parkingOffsetRef.current,
    targetPoint.y + Math.cos(routeAngle) * parkingOffsetRef.current,
    CAR_BASE_Z
  );

  const targetHeading = routeAngle + CAR_ROTATION_OFFSET;

  if (snapRotation) {
    rotationRef.current = targetHeading;
  } else {
    const turnAlpha = 1 - Math.exp(-ROTATION_DAMPING * delta);
    rotationRef.current = lerpAngle(rotationRef.current, targetHeading, turnAlpha);
  }

  pieceRef.current.rotation.set(0, 0, rotationRef.current);

  if (bodyRef.current) {
    const bounce = moving
      ? Math.abs(Math.sin(clockTime * CAR_BOUNCE_SPEED)) * CAR_BOUNCE_HEIGHT
      : 0;
    updatePassJumpTransform(
      distance,
      moving ? passedVehicleDistances : EMPTY_PASSED_VEHICLE_DISTANCES,
      passJumpTransform
    );

    bodyRef.current.position.set(0, 0, bounce + passJumpTransform.height);
    bodyRef.current.rotation.set(0, passJumpTransform.rotation, 0);
  }
};

const GamePiece = memo(({
  activeCarProgressRef,
  currentLeg,
  driving,
  onDriveStart,
  onLegPass,
  onMoveComplete,
  parkingOffsetFactor = 0,
  passedVehicleLegs = [],
  moveStartDelay = 0,
  pathRevealDuration = 0.75,
  piece,
  pieceRef,
  targetLeg,
}) => {
  const initialDistance = STOP_DISTANCES[currentLeg] || 0;
  const initialProgress = THREE.MathUtils.clamp(initialDistance / DRIVE_LENGTH, 0, 1);
  const distanceRef = useRef(initialDistance);
  const rotationRef = useRef(getCarHeading(initialProgress));
  const carPosRef = useRef(new THREE.Vector3());
  const bodyRef = useRef();
  const drivingRef = useRef(driving);
  const targetLegRef = useRef(targetLeg);
  const waitingForNextLegRef = useRef(false);
  const delayElapsedRef = useRef(0);
  const lastReportedLegRef = useRef(currentLeg);
  const hasStartedDrivingRef = useRef(false);
  const passJumpTransformRef = useRef({ arc: 0, height: 0, rotation: 0 });
  const parkingOffsetRef = useRef(parkingOffsetFactor * PARKING_LATERAL_SPACING);
  const departureParkingOffsetRef = useRef(parkingOffsetRef.current);
  const parkingOffset = parkingOffsetFactor * PARKING_LATERAL_SPACING;
  const passedVehicleDistances = passedVehicleLegs
    .map((leg) => STOP_DISTANCES[leg])
    .filter((distance) => distance !== undefined);

  useEffect(() => {
    drivingRef.current = driving;

    if (driving) {
      departureParkingOffsetRef.current = parkingOffsetRef.current;
      delayElapsedRef.current = 0;
      hasStartedDrivingRef.current = false;
      waitingForNextLegRef.current = false;
      lastReportedLegRef.current = currentLeg;

      if (activeCarProgressRef) {
        activeCarProgressRef.current = THREE.MathUtils.clamp(
          distanceRef.current / DRIVE_LENGTH,
          0,
          1
        );
      }
    } else {
      delayElapsedRef.current = 0;
      hasStartedDrivingRef.current = false;
    }
  }, [activeCarProgressRef, currentLeg, driving]);

  useEffect(() => {
    targetLegRef.current = targetLeg;
  }, [targetLeg]);

  useEffect(() => {
    if (drivingRef.current) return;

    const legDistance = STOP_DISTANCES[currentLeg] || 0;
    const legProgress = THREE.MathUtils.clamp(legDistance / DRIVE_LENGTH, 0, 1);
    distanceRef.current = legDistance;
    waitingForNextLegRef.current = false;

    if (pieceRef.current) {
      applyCarTransform({
        pieceRef,
        bodyRef,
        progress: legProgress,
        targetPoint: carPosRef.current,
        moving: false,
        distance: legDistance,
        parkingOffset,
        parkingOffsetRef,
        passedVehicleDistances,
        passJumpTransform: passJumpTransformRef.current,
        clockTime: 0,
        delta: 0.016,
        rotationRef,
        snapRotation: true,
      });
    }
  }, [currentLeg, pieceRef]);

  useFrame(({ clock }, delta) => {
    if (!pieceRef.current) return;

    if (!drivingRef.current) {
      const parkedProgress = THREE.MathUtils.clamp(distanceRef.current / DRIVE_LENGTH, 0, 1);
      applyCarTransform({
        pieceRef,
        bodyRef,
        progress: parkedProgress,
        targetPoint: carPosRef.current,
        moving: false,
        distance: distanceRef.current,
        parkingOffset,
        parkingOffsetRef,
        passedVehicleDistances,
        passJumpTransform: passJumpTransformRef.current,
        clockTime: clock.elapsedTime,
        delta,
        rotationRef,
      });
      return;
    }

    if (waitingForNextLegRef.current) return;

    const totalStartDelay = (piece.startDelay || 0) + Math.max(
      pathRevealDuration + 0.08,
      moveStartDelay
    );
    if (!hasStartedDrivingRef.current) {
      delayElapsedRef.current += delta;

      if (delayElapsedRef.current < totalStartDelay) {
        return;
      }

      hasStartedDrivingRef.current = true;
      onDriveStart?.();
    }

    const target = targetLegRef.current;
    const startDistance = STOP_DISTANCES[currentLeg] ?? 0;
    const targetDistance = STOP_DISTANCES[target] ?? DRIVE_LENGTH;

    distanceRef.current = Math.min(distanceRef.current + delta * DRIVE_SPEED, targetDistance);
    const curveProgress = THREE.MathUtils.clamp(distanceRef.current / DRIVE_LENGTH, 0, 1);
    const movingParkingOffset = getMovingParkingOffset({
      distance: distanceRef.current,
      startDistance,
      targetDistance,
      startOffset: departureParkingOffsetRef.current,
      targetOffset: parkingOffset,
    });

    if (activeCarProgressRef) {
      activeCarProgressRef.current = curveProgress;
    }

    for (let legIdx = lastReportedLegRef.current + 1; legIdx < target; legIdx += 1) {
      if (distanceRef.current >= (STOP_DISTANCES[legIdx] ?? Infinity) - 0.02) {
        lastReportedLegRef.current = legIdx;
        onLegPass?.(legIdx);
      }
    }

    applyCarTransform({
      pieceRef,
      bodyRef,
      progress: curveProgress,
      targetPoint: carPosRef.current,
      moving: true,
      distance: distanceRef.current,
      parkingOffset: movingParkingOffset,
      parkingOffsetRef,
      passedVehicleDistances,
      passJumpTransform: passJumpTransformRef.current,
      clockTime: clock.elapsedTime,
      delta,
      rotationRef,
    });

    if (distanceRef.current >= targetDistance) {
      distanceRef.current = targetDistance;
      if (activeCarProgressRef) {
        activeCarProgressRef.current = THREE.MathUtils.clamp(targetDistance / DRIVE_LENGTH, 0, 1);
      }
      waitingForNextLegRef.current = true;
      onMoveComplete(piece.id, target);
    }
  });

  return (
    <group ref={pieceRef} position={[ROUTE[0].x, ROUTE[0].y, CAR_BASE_Z]}>
      <group ref={bodyRef}>
        <VehicleModel color={piece.color} model={piece.model} />
      </group>
    </group>
  );
});

export default GamePiece;
