import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import { RoundedBox } from '@react-three/drei/native';
import * as THREE from 'three';
import { DICE_BOUNDS, DICE_MAX_RESULT, DICE_RESULT_DURATION } from '../constants/diceBounds';
import { MAP_CY, MAP_H, MAP_RELIEF_DEPTH, MAP_W, MAP_Z } from '../constants/mapCoordinates';

const DICE_SIZE = 0.48;
const HALF_SIZE = DICE_SIZE / 2;
const DICE_Z = MAP_Z + MAP_RELIEF_DEPTH + HALF_SIZE + 0.025;
const LAND_POSITION = new THREE.Vector3(-0.15, -0.65, DICE_Z);
const IDLE_CENTER = new THREE.Vector3(-0.5, -3.55, 0);
const IDLE_Z = 2.0;
const IDLE_SCREEN_DISTANCE = 4;
const IDLE_BOB_HEIGHT = 0.065;
const HOLD_Z_OFFSET = 0.15;
const HOLD_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1));
const HOLD_BOUNDS = {
  minX: -1.7,
  maxX: 2.3,
  minY: -0.85,
  maxY: 2.15,
};
const THROW_DURATION = 1.75;
const AIRBORNE_END = 0.42;
const PIP_OFFSET = DICE_SIZE * 0.25;
const PIP_RADIUS = DICE_SIZE * 0.085;
const INITIAL_ROTATION = [0.45, 0.3, -0.25];
const RESULT_FLY_IN_END = 0.32;
const RESULT_HOLD_END = 0.68;
const RESULT_SCREEN_DISTANCE = 2.1;
const RESULT_SCREEN_Y_OFFSET = 0.08;
const RESULT_SCALE = 1;
const IDLE_POSITION = IDLE_CENTER.clone().setZ(IDLE_Z);
const LABEL_TEXT = 'THROW ME';
const LABEL_CELL_SIZE = 0.035;
const LABEL_LETTER_GAP = 0.03;
const LABEL_WORD_GAP = 0.08;

const LABEL_LETTERS = {
  T: ['111', '010', '010', '010', '010'],
  H: ['101', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  W: ['10101', '10101', '10101', '10101', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  E: ['111', '100', '111', '100', '111'],
};

const FACE_PIPS = {
  1: ['center'],
  2: ['topLeft', 'bottomRight'],
  3: ['topLeft', 'center', 'bottomRight'],
};

const PIP_POSITIONS = {
  topLeft: [-PIP_OFFSET, PIP_OFFSET, 0],
  topRight: [PIP_OFFSET, PIP_OFFSET, 0],
  middleLeft: [-PIP_OFFSET, 0, 0],
  middleRight: [PIP_OFFSET, 0, 0],
  center: [0, 0, 0],
  bottomLeft: [-PIP_OFFSET, -PIP_OFFSET, 0],
  bottomRight: [PIP_OFFSET, -PIP_OFFSET, 0],
};

const FACE_TRANSFORMS = [
  { id: 1, pipValue: 1, position: [0, 0, HALF_SIZE + 0.003], rotation: [0, 0, 0] },
  { id: 4, pipValue: 1, position: [0, 0, -HALF_SIZE - 0.003], rotation: [Math.PI, 0, 0] },
  { id: 2, pipValue: 2, position: [0, HALF_SIZE + 0.003, 0], rotation: [-Math.PI / 2, 0, 0] },
  { id: 5, pipValue: 2, position: [0, -HALF_SIZE - 0.003, 0], rotation: [Math.PI / 2, 0, 0] },
  { id: 3, pipValue: 3, position: [HALF_SIZE + 0.003, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { id: 6, pipValue: 3, position: [-HALF_SIZE - 0.003, 0, 0], rotation: [0, -Math.PI / 2, 0] },
];

const FACE_ROTATIONS = {
  1: [0, 0, 0],
  2: [Math.PI / 2, 0, 0],
  3: [0, -Math.PI / 2, 0],
};
const FACE_QUATERNIONS = Object.fromEntries(
  Object.entries(FACE_ROTATIONS).map(([value, rotation]) => [
    value,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
  ])
);

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);
const randomFace = () => Math.floor(Math.random() * DICE_MAX_RESULT) + 1;
const nearestEquivalentAngle = (target, reference) => {
  const fullTurn = Math.PI * 2;
  return target + Math.round((reference - target) / fullTurn) * fullTurn;
};
const nearestEquivalentEuler = (targetRotation, referenceRotation) => new THREE.Euler(
  nearestEquivalentAngle(targetRotation[0], referenceRotation.x),
  nearestEquivalentAngle(targetRotation[1], referenceRotation.y),
  nearestEquivalentAngle(targetRotation[2], referenceRotation.z)
);
const clampToMap = (point, offset) => new THREE.Vector3(
  THREE.MathUtils.clamp(
    point.x,
    DICE_BOUNDS.minX + HALF_SIZE + offset.x,
    DICE_BOUNDS.maxX - HALF_SIZE + offset.x
  ),
  THREE.MathUtils.clamp(
    point.y,
    DICE_BOUNDS.minY + HALF_SIZE + offset.y,
    DICE_BOUNDS.maxY - HALF_SIZE + offset.y
  ),
  point.z
);

// Scratch objects for pointer handling, which runs on every pointer-move event.
const PLANE_POINT = new THREE.Vector3();
const HOLD_POINT = new THREE.Vector3();
const DRAG_DELTA = new THREE.Vector3();
const IDLE_TARGET = new THREE.Vector3();
const IDLE_OFFSET = new THREE.Vector3();
const LAND_TARGET = new THREE.Vector3();
const LABEL_CAMERA_UP = new THREE.Vector3();
const LABEL_OFFSET_Y = 0.58;

const clampToHoldPlane = (point, target, center) => target.set(
  THREE.MathUtils.clamp(point.x, center.x + HOLD_BOUNDS.minX, center.x + HOLD_BOUNDS.maxX),
  THREE.MathUtils.clamp(point.y, center.y + HOLD_BOUNDS.minY, center.y + HOLD_BOUNDS.maxY),
  center.z + HOLD_Z_OFFSET
);

// Returns a shared scratch vector; clone or copy it before storing it.
const getHoldPlanePoint = (event, fallback, center) => {
  HOLD_PLANE.constant = -(center.z + HOLD_Z_OFFSET);

  if (event?.ray?.intersectPlane(HOLD_PLANE, PLANE_POINT)) {
    return clampToHoldPlane(PLANE_POINT, HOLD_POINT, center);
  }

  if (event?.point) {
    return clampToHoldPlane(event.point, HOLD_POINT, center);
  }

  return HOLD_POINT.copy(fallback).setZ(center.z + HOLD_Z_OFFSET);
};

// Dice pips share one geometry and material across all faces.
const PIP_GEOMETRY = new THREE.CircleGeometry(PIP_RADIUS, 16);
// transparent: the result fade animates opacity on every dice material, including this shared one.
const PIP_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#111111',
  side: THREE.DoubleSide,
  transparent: true,
});

const DicePips = ({ value }) => (
  <>
    {FACE_PIPS[value].map((pip) => (
      <mesh key={pip} position={PIP_POSITIONS[pip]} geometry={PIP_GEOMETRY} material={PIP_MATERIAL} />
    ))}
  </>
);

const DiceFace = ({ faceId, faceRefs, pipValue, position, rotation }) => (
  <group
    ref={(node) => {
      if (node) {
        faceRefs.current[faceId] = node;
      } else {
        delete faceRefs.current[faceId];
      }
    }}
    position={position}
    rotation={rotation}
  >
    <DicePips value={pipValue} />
  </group>
);

// Builds the pixel-font label as one merged geometry (one draw call instead of one mesh per cell).
const buildLabelGeometry = (text) => {
  const cells = [];
  let cursor = 0;

  text.split('').forEach((letter) => {
    if (letter === ' ') {
      cursor += LABEL_WORD_GAP;
      return;
    }

    const pattern = LABEL_LETTERS[letter];
    if (!pattern) return;

    const letterWidth = pattern[0].length * LABEL_CELL_SIZE;

    pattern.forEach((row, rowIndex) => {
      row.split('').forEach((cell, columnIndex) => {
        if (cell !== '1') return;

        cells.push({
          x: cursor + columnIndex * LABEL_CELL_SIZE,
          y: -rowIndex * LABEL_CELL_SIZE,
        });
      });
    });

    cursor += letterWidth + LABEL_LETTER_GAP;
  });

  const half = (LABEL_CELL_SIZE * 0.82) / 2;
  const minX = Math.min(...cells.map((cell) => cell.x - half));
  const maxX = Math.max(...cells.map((cell) => cell.x + half));
  const minY = Math.min(...cells.map((cell) => cell.y - half));
  const maxY = Math.max(...cells.map((cell) => cell.y + half));
  const offsetX = -(minX + maxX) / 2;
  const offsetY = -(minY + maxY) / 2;
  const offsetZ = 0.001;
  const positions = new Float32Array(cells.length * 4 * 3);
  const indices = new Uint16Array(cells.length * 6);

  cells.forEach((cell, index) => {
    const cx = cell.x + offsetX;
    const cy = cell.y + offsetY;
    const p = index * 12;
    const v = index * 4;

    positions.set([
      cx - half, cy - half, offsetZ,
      cx + half, cy - half, offsetZ,
      cx + half, cy + half, offsetZ,
      cx - half, cy + half, offsetZ,
    ], p);
    indices.set([v, v + 1, v + 2, v, v + 2, v + 3], index * 6);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return geometry;
};

const createRoundedRectangleGeometry = (width, height, radius) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);

  const geometry = new THREE.ShapeGeometry(shape, 8);
  geometry.computeBoundingSphere();
  return geometry;
};

const LABEL_GEOMETRY = buildLabelGeometry(LABEL_TEXT);
const LABEL_BORDER_GEOMETRY = createRoundedRectangleGeometry(1.28, 0.28, 0.05);
const LABEL_BACKGROUND_GEOMETRY = createRoundedRectangleGeometry(1.25, 0.25, 0.04);

const LABEL_TEXT_MATERIAL = new THREE.MeshBasicMaterial({ color: '#2C3E50', side: THREE.DoubleSide });
const LABEL_BACKGROUND_MATERIAL = new THREE.MeshBasicMaterial({ color: '#FFF1CD', side: THREE.DoubleSide });
const LABEL_BORDER_MATERIAL = new THREE.MeshBasicMaterial({ color: '#2C3E50', side: THREE.DoubleSide });

const ThrowMeLabel = ({ labelRef }) => (
  <group ref={labelRef}>
    <mesh
      position={[0, 0, -0.002]}
      geometry={LABEL_BORDER_GEOMETRY}
      material={LABEL_BORDER_MATERIAL}
    />
    <mesh
      position={[0, 0, -0.001]}
      geometry={LABEL_BACKGROUND_GEOMETRY}
      material={LABEL_BACKGROUND_MATERIAL}
    />
    <mesh
      position={[0, 0, 0.001]}
      geometry={LABEL_GEOMETRY}
      material={LABEL_TEXT_MATERIAL}
    />
  </group>
);

const BoardDice = memo(({
  enabled = true,
  fastAnimations = false,
  onRollComplete,
  onRollStart,
  rollAction,
  visible = true,
}) => {
  const { camera } = useThree();
  const diceRef = useRef();
  const faceRefs = useRef({});
  const labelRef = useRef();
  const stateRef = useRef({
    mode: 'idle',
    startTime: 0,
    idleBasePosition: IDLE_POSITION.clone(),
    holdTarget: LAND_POSITION.clone().setZ(IDLE_POSITION.z + HOLD_Z_OFFSET),
    startPosition: LAND_POSITION.clone(),
    impactPosition: LAND_POSITION.clone(),
    endPosition: LAND_POSITION.clone(),
    startRotation: new THREE.Euler(...INITIAL_ROTATION),
    spinRotation: new THREE.Euler(),
    endRotation: new THREE.Euler(),
    lastDragPoint: LAND_POSITION.clone(),
    dragVelocity: new THREE.Vector3(0, 1, 0),
    result: 1,
  });
  const resultAnimationRef = useRef({
    active: false,
    startTime: 0,
    startPosition: LAND_POSITION.clone(),
    startQuaternion: new THREE.Quaternion(),
    facesIsolated: false,
  });
  const diceMaterialsRef = useRef([]);
  const lastPresentedActionIdRef = useRef(null);
  const resultTargetPosition = useMemo(() => new THREE.Vector3(), []);
  const resultTargetQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const idleQuaternion = useMemo(() => (
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...INITIAL_ROTATION))
  ), []);

  const diceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xfff1cd,
    roughness: 0.5,
    metalness: 0.04,
    transparent: true,
  }), []);

  const interactionMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  const setVisibleFaces = (visibleValue = null) => {
    Object.entries(faceRefs.current).forEach(([value, face]) => {
      face.visible = visibleValue === null || Number(value) === visibleValue;
    });
  };

  useEffect(() => {
    if (!diceRef.current) return;

    diceRef.current.position.copy(IDLE_POSITION);
    diceRef.current.rotation.set(...INITIAL_ROTATION);
    diceRef.current.traverse((child) => {
      if (!child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = 1;
        material.needsUpdate = true;

        if (!diceMaterialsRef.current.includes(material)) {
          diceMaterialsRef.current.push(material);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!visible || !enabled || stateRef.current.mode !== 'hidden' || !diceRef.current) return;

    diceRef.current.visible = true;
    diceRef.current.position.copy(IDLE_POSITION);
    diceRef.current.quaternion.copy(idleQuaternion);
    diceRef.current.scale.setScalar(1);
    diceMaterialsRef.current.forEach((material) => {
      material.opacity = 1;
    });
    setVisibleFaces();
    stateRef.current.idleBasePosition.copy(IDLE_POSITION);
    stateRef.current.mode = 'idle';
  }, [enabled, idleQuaternion, visible]);

  useEffect(() => {
    if (
      !rollAction?.id
      || lastPresentedActionIdRef.current === rollAction.id
      || !diceRef.current
    ) {
      return;
    }

    lastPresentedActionIdRef.current = rollAction.id;

    // The device that physically threw the die is already presenting this result.
    // Observing devices enter the same result animation from a stable board position.
    if (stateRef.current.mode === 'result' && stateRef.current.result === rollAction.value) {
      return;
    }

    stateRef.current.result = rollAction.value;
    stateRef.current.mode = 'result';
    diceRef.current.visible = true;
    diceRef.current.position.copy(LAND_POSITION);
    diceRef.current.quaternion.copy(FACE_QUATERNIONS[rollAction.value]);
    diceRef.current.scale.setScalar(1);
    diceMaterialsRef.current.forEach((material) => {
      material.opacity = 1;
    });
    setVisibleFaces();
    resultAnimationRef.current = {
      active: true,
      startTime: null,
      startPosition: LAND_POSITION.clone(),
      startQuaternion: diceRef.current.quaternion.clone(),
      facesIsolated: false,
    };
  }, [rollAction?.id, rollAction?.value]);

  const beginPickup = (event) => {
    if (!visible || !enabled || !diceRef.current || stateRef.current.mode === 'throwing' || stateRef.current.mode === 'result') return;

    event.stopPropagation();

    resultAnimationRef.current.active = false;
    diceRef.current.visible = true;
    diceRef.current.scale.setScalar(1);
    diceMaterialsRef.current.forEach((material) => {
      material.opacity = 1;
    });
    setVisibleFaces();

    const holdTarget = getHoldPlanePoint(
      event,
      diceRef.current.position,
      stateRef.current.idleBasePosition
    ).clone();

    stateRef.current = {
      ...stateRef.current,
      mode: 'held',
      holdTarget,
      lastDragPoint: holdTarget.clone(),
      dragVelocity: new THREE.Vector3(0, 1, 0),
      startTime: 0,
    };
  };

  const updateHeldPosition = (event) => {
    if (stateRef.current.mode !== 'held') return;

    const nextDragPoint = getHoldPlanePoint(
      event,
      stateRef.current.holdTarget,
      stateRef.current.idleBasePosition
    );
    const dragDelta = DRAG_DELTA.copy(nextDragPoint).sub(stateRef.current.lastDragPoint);

    if (dragDelta.lengthSq() > 0.0001) {
      stateRef.current.dragVelocity.lerp(dragDelta, 0.45);
      stateRef.current.lastDragPoint.copy(nextDragPoint);
    }

    stateRef.current.holdTarget.copy(nextDragPoint);
  };

  const beginThrow = (event) => {
    if (stateRef.current.mode !== 'held' || !diceRef.current) return;

    event.stopPropagation();

    if (event.ray || event.point) {
      updateHeldPosition(event);
    }

    const result = randomFace();
    const finalRotation = FACE_ROTATIONS[result];
    const throwDirection = stateRef.current.dragVelocity.clone();

    if (throwDirection.lengthSq() < 0.0001) {
      throwDirection.set(0, 1, 0);
    } else {
      throwDirection.normalize();
    }

    const throwStrength = THREE.MathUtils.clamp(stateRef.current.dragVelocity.length() * 7, 0, 1);
    const holdOffsetX = stateRef.current.holdTarget.x - stateRef.current.idleBasePosition.x;
    const holdOffsetY = stateRef.current.holdTarget.y - stateRef.current.idleBasePosition.y;
    const idleOffset = IDLE_OFFSET.copy(stateRef.current.idleBasePosition).sub(IDLE_POSITION);
    const landPosition = LAND_TARGET.copy(LAND_POSITION);
    landPosition.x += idleOffset.x;
    landPosition.y += idleOffset.y;
    const throwBoost = 0.25 + throwStrength * 0.35;
    const impactPosition = clampToMap(new THREE.Vector3(
      landPosition.x + holdOffsetX * 1.2 + throwDirection.x * throwBoost,
      landPosition.y + holdOffsetY * 1.2 + throwDirection.y * throwBoost,
      DICE_Z
    ), idleOffset);
    const rollDistance = 0.42 + throwStrength * 0.24 + Math.random() * 0.1;
    const endPosition = clampToMap(new THREE.Vector3(
      impactPosition.x + throwDirection.x * rollDistance,
      impactPosition.y + throwDirection.y * rollDistance,
      DICE_Z
    ), idleOffset);
    const spinRotation = new THREE.Euler(
      diceRef.current.rotation.x + Math.PI * 2.35,
      diceRef.current.rotation.y + Math.PI * 2.75,
      diceRef.current.rotation.z + Math.PI * 1.65
    );

    stateRef.current = {
      ...stateRef.current,
      mode: 'throwing',
      startTime: null,
      startPosition: diceRef.current.position.clone(),
      impactPosition,
      endPosition,
      startRotation: diceRef.current.rotation.clone(),
      spinRotation,
      endRotation: nearestEquivalentEuler(finalRotation, spinRotation),
      result,
    };
    onRollStart?.();
  };

  const animateResultDice = (clock, camera) => {
    if (!diceRef.current || !resultAnimationRef.current.active) return;

    if (resultAnimationRef.current.startTime === null) {
      resultAnimationRef.current.startTime = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - resultAnimationRef.current.startTime;
    const resultDuration = DICE_RESULT_DURATION * (fastAnimations ? 0.55 : 1);
    const progress = Math.min(elapsed / resultDuration, 1);

    resultTargetPosition
      .set(0, RESULT_SCREEN_Y_OFFSET, -RESULT_SCREEN_DISTANCE)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    resultTargetQuaternion.copy(camera.quaternion).multiply(FACE_QUATERNIONS[stateRef.current.result]);

    if (progress < RESULT_FLY_IN_END) {
      const flyProgress = easeOutCubic(progress / RESULT_FLY_IN_END);

      diceRef.current.position.lerpVectors(
        resultAnimationRef.current.startPosition,
        resultTargetPosition,
        flyProgress
      );
      diceRef.current.quaternion.slerpQuaternions(
        resultAnimationRef.current.startQuaternion,
        resultTargetQuaternion,
        flyProgress
      );
      diceRef.current.scale.setScalar(THREE.MathUtils.lerp(1, RESULT_SCALE, flyProgress));
      diceMaterialsRef.current.forEach((material) => {
        material.opacity = 1;
      });
    } else if (progress < RESULT_HOLD_END) {
      diceRef.current.position.copy(resultTargetPosition);
      diceRef.current.quaternion.copy(resultTargetQuaternion);
      diceRef.current.scale.setScalar(RESULT_SCALE);
      diceMaterialsRef.current.forEach((material) => {
        material.opacity = 1;
      });
    } else {
      if (!resultAnimationRef.current.facesIsolated) {
        resultAnimationRef.current.facesIsolated = true;
        setVisibleFaces(stateRef.current.result);
      }

      const fadeProgress = easeInOutCubic(
        (progress - RESULT_HOLD_END) / (1 - RESULT_HOLD_END)
      );

      diceRef.current.position.copy(resultTargetPosition);
      diceRef.current.quaternion.copy(resultTargetQuaternion);
      diceRef.current.scale.setScalar(RESULT_SCALE);
      diceMaterialsRef.current.forEach((material) => {
        material.opacity = 1 - fadeProgress;
      });
    }

    if (progress >= 1) {
      resultAnimationRef.current.active = false;
      diceRef.current.visible = false;
      diceRef.current.position.copy(IDLE_POSITION);
      diceRef.current.quaternion.copy(idleQuaternion);
      diceRef.current.scale.setScalar(1);
      diceMaterialsRef.current.forEach((material) => {
        material.opacity = 1;
      });
      setVisibleFaces();

      if (stateRef.current.mode === 'result') {
        stateRef.current.idleBasePosition.copy(IDLE_POSITION);
        stateRef.current.mode = 'hidden';
      }
    }
  };

  useFrame(({ camera, clock }, delta) => {
    if (!diceRef.current) return;

    if (!visible) {
      diceRef.current.visible = false;
      if (labelRef.current) {
        labelRef.current.visible = false;
      }
      return;
    }

    if (stateRef.current.mode === 'result') {
      animateResultDice(clock, camera);
      return;
    }

    if (stateRef.current.mode === 'idle') {
      const bob = Math.sin(clock.elapsedTime * 2.2) * IDLE_BOB_HEIGHT;
      const targetPosition = IDLE_TARGET
        .set(0, 0, -IDLE_SCREEN_DISTANCE)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);

      stateRef.current.idleBasePosition.copy(targetPosition);
      LABEL_CAMERA_UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
      targetPosition.addScaledVector(LABEL_CAMERA_UP, bob);
      diceRef.current.position.copy(targetPosition);
      diceRef.current.rotation.x += delta * 0.45;
      diceRef.current.rotation.y += delta * 0.7;
      diceRef.current.rotation.z += delta * 0.25;

      if (labelRef.current) {
        labelRef.current.visible = enabled;
        labelRef.current.position
          .copy(diceRef.current.position)
          .addScaledVector(LABEL_CAMERA_UP, LABEL_OFFSET_Y);
        labelRef.current.quaternion.copy(camera.quaternion);
      }
      return;
    }

    if (labelRef.current) {
      labelRef.current.visible = false;
    }

    if (stateRef.current.mode === 'held') {
      diceRef.current.position.lerp(stateRef.current.holdTarget, Math.min(delta * 12, 1));
      diceRef.current.rotation.x += delta * 1.7;
      diceRef.current.rotation.y += delta * 1.25;
      return;
    }

    if (stateRef.current.mode !== 'throwing') return;

    if (stateRef.current.startTime === null) {
      stateRef.current.startTime = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - stateRef.current.startTime;
    const progress = Math.min(elapsed / THROW_DURATION, 1);

    if (progress < AIRBORNE_END) {
      const airProgress = progress / AIRBORNE_END;
      const travelProgress = easeOutCubic(airProgress);
      const arcHeight = Math.sin(airProgress * Math.PI) * 0.75;

      diceRef.current.position.lerpVectors(
        stateRef.current.startPosition,
        stateRef.current.impactPosition,
        travelProgress
      );
      diceRef.current.position.z += arcHeight;
      diceRef.current.rotation.x = THREE.MathUtils.lerp(
        stateRef.current.startRotation.x,
        stateRef.current.spinRotation.x,
        travelProgress
      );
      diceRef.current.rotation.y = THREE.MathUtils.lerp(
        stateRef.current.startRotation.y,
        stateRef.current.spinRotation.y,
        travelProgress
      );
      diceRef.current.rotation.z = THREE.MathUtils.lerp(
        stateRef.current.startRotation.z,
        stateRef.current.spinRotation.z,
        travelProgress
      );
    } else {
      const rollProgress = (progress - AIRBORNE_END) / (1 - AIRBORNE_END);
      const rollTravelProgress = easeOutCubic(rollProgress);
      const rollRotationProgress = easeOutCubic(rollProgress);
      const bounce = Math.abs(Math.sin(rollProgress * Math.PI * 3)) * (1 - rollProgress) * 0.075;

      diceRef.current.position.lerpVectors(
        stateRef.current.impactPosition,
        stateRef.current.endPosition,
        rollTravelProgress
      );
      diceRef.current.position.z = DICE_Z + bounce;

      diceRef.current.rotation.x = THREE.MathUtils.lerp(
        stateRef.current.spinRotation.x,
        stateRef.current.endRotation.x,
        rollRotationProgress
      );
      diceRef.current.rotation.y = THREE.MathUtils.lerp(
        stateRef.current.spinRotation.y,
        stateRef.current.endRotation.y,
        rollRotationProgress
      );
      diceRef.current.rotation.z = THREE.MathUtils.lerp(
        stateRef.current.spinRotation.z,
        stateRef.current.endRotation.z,
        rollRotationProgress
      );
    }

    if (progress >= 1) {
      diceRef.current.position.copy(stateRef.current.endPosition);
      diceRef.current.rotation.copy(stateRef.current.endRotation);
      stateRef.current.mode = 'result';
      onRollComplete?.(stateRef.current.result);

      resultAnimationRef.current = {
        active: true,
        startTime: null,
        startPosition: stateRef.current.endPosition.clone(),
        startQuaternion: diceRef.current.quaternion.clone(),
        facesIsolated: false,
      };
    }
  });

  return (
    <>
      <mesh
        visible={visible}
        position={[0, MAP_CY, MAP_Z + 0.02]}
        onPointerMove={updateHeldPosition}
        onPointerUp={beginThrow}
        material={interactionMaterial}
      >
        <planeGeometry args={[MAP_W * 2, MAP_H * 2]} />
      </mesh>
      <group
        ref={diceRef}
        visible={visible}
        position={IDLE_POSITION.toArray()}
        rotation={INITIAL_ROTATION}
        onPointerDown={beginPickup}
        onPointerMove={updateHeldPosition}
        onPointerUp={beginThrow}
      >
        <RoundedBox
          args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]}
          radius={0.075}
          smoothness={4}
          bevelSegments={4}
          creaseAngle={0.35}
          material={diceMaterial}
        />
        {FACE_TRANSFORMS.map((face) => (
          <DiceFace
            key={face.id}
            faceId={face.id}
            faceRefs={faceRefs}
            pipValue={face.pipValue}
            position={face.position}
            rotation={face.rotation}
          />
        ))}
      </group>
      <ThrowMeLabel labelRef={labelRef} />
    </>
  );
});

export default BoardDice;
