import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import {
  DRIVE_CURVE,
  DRIVE_LENGTH,
  getSmoothRouteTangentAngle,
  ROUTE,
  STOP_DISTANCES,
} from '../constants/route';

const DRIVE_SPEED = 0.88;
const CAR_ROTATION_OFFSET = Math.PI / 2;
const CAR_BASE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.022;
const CAR_BOUNCE_HEIGHT = 0.01;
const CAR_BOUNCE_SPEED = 9.5;
const ROTATION_DAMPING = 20;

const lerpAngle = (from, to, amount) => {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * amount;
};

const getCarHeading = (progress) => (
  getSmoothRouteTangentAngle(progress, 0.005) + CAR_ROTATION_OFFSET
);

const applyCarTransform = ({
  pieceRef,
  bodyRef,
  progress,
  targetPoint,
  moving,
  clockTime,
  delta,
  rotationRef,
  snapRotation = false,
}) => {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  DRIVE_CURVE.getPointAt(clampedProgress, targetPoint);

  pieceRef.current.position.set(
    targetPoint.x,
    targetPoint.y,
    CAR_BASE_Z
  );

  const targetHeading = getCarHeading(clampedProgress);

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

    bodyRef.current.position.set(0, 0, bounce);
  }
};

const buildCarMaterials = (color) => ({
  paint: new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.18,
  }),
  black: new THREE.MeshStandardMaterial({
    color: 0x070707,
    roughness: 0.72,
    metalness: 0.1,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x8fd8ff,
    roughness: 0.16,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.08,
  }),
  light: new THREE.MeshStandardMaterial({
    color: 0xf5f1dc,
    roughness: 0.25,
    metalness: 0.05,
  }),
});

const getCarMaterial = (child, materials) => {
  const name = child.name.toLowerCase();

  if (
    name.includes('wheel') ||
    name.includes('bullbar') ||
    name.includes('rollbar') ||
    name.includes('skid') ||
    name.includes('ariel')
  ) {
    return materials.black;
  }

  if (name.includes('spot') || name.includes('decal')) {
    return materials.light;
  }

  return materials.paint;
};

const cloneMaterial = (material) => {
  if (!material) return material;

  const visibleMap = material.map || material.metalnessMap || material.roughnessMap;
  const clonedMap = visibleMap?.clone?.();

  if (clonedMap) {
    clonedMap.colorSpace = THREE.SRGBColorSpace;
    clonedMap.flipY = false;
    clonedMap.needsUpdate = true;
  }

  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: clonedMap,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
  });
};

const cloneCarScene = (scene, color, model) => {
  const clone = scene.clone(true);
  const materials = model.preserveMaterials ? null : buildCarMaterials(color);

  clone.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = false;

    if (model.preserveMaterials) {
      child.material = Array.isArray(child.material)
        ? child.material.map(cloneMaterial)
        : cloneMaterial(child.material);
      return;
    }

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => {
        const materialName = material?.name?.toLowerCase?.() || '';

        if (materialName.includes('glass')) return materials.glass;
        if (materialName.includes('emmisive') || materialName.includes('emissive')) return materials.light;

        return materials.paint;
      });
      return;
    }

    child.material = getCarMaterial(child, materials);
  });

  if (model.normalizeOrigin) {
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
  }

  return clone;
};

const GamePiece = ({
  activeCarProgressRef,
  currentLeg,
  driving,
  onDriveStart,
  onLegPass,
  onMoveComplete,
  pathRevealDuration = 0.75,
  piece,
  pieceRef,
  targetLeg,
}) => {
  const { scene } = useGLTF(piece.model.source);
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

  const carScene = useMemo(
    () => cloneCarScene(scene, piece.color, piece.model),
    [scene, piece.color, piece.model]
  );
  const modelTransform = piece.model.transform;

  useEffect(() => {
    drivingRef.current = driving;

    if (driving) {
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
        clockTime: clock.elapsedTime,
        delta,
        rotationRef,
      });
      return;
    }

    if (waitingForNextLegRef.current) return;

    const totalStartDelay = (piece.startDelay || 0) + pathRevealDuration + 0.08;
    if (!hasStartedDrivingRef.current) {
      delayElapsedRef.current += delta;

      if (delayElapsedRef.current < totalStartDelay) {
        return;
      }

      hasStartedDrivingRef.current = true;
      onDriveStart?.();
    }

    const target = targetLegRef.current;
    const targetDistance = STOP_DISTANCES[target] ?? DRIVE_LENGTH;

    distanceRef.current = Math.min(distanceRef.current + delta * DRIVE_SPEED, targetDistance);
    const curveProgress = THREE.MathUtils.clamp(distanceRef.current / DRIVE_LENGTH, 0, 1);

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
        <primitive
          object={carScene}
          scale={modelTransform.scale}
          position={modelTransform.position}
          rotation={modelTransform.rotation}
        />
      </group>
    </group>
  );
};

export default GamePiece;
