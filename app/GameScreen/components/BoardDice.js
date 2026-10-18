import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { RoundedBox } from '@react-three/drei/native';
import * as THREE from 'three';
import { DICE_BOUNDS } from '../constants/diceBounds';
import { MAP_CY, MAP_H, MAP_RELIEF_DEPTH, MAP_W, MAP_Z } from '../constants/mapCoordinates';

const DICE_SIZE = 0.48;
const HALF_SIZE = DICE_SIZE / 2;
const DICE_Z = MAP_Z + MAP_RELIEF_DEPTH + HALF_SIZE + 0.025;
const LAND_POSITION = new THREE.Vector3(-0.15, -0.65, DICE_Z);
const IDLE_CENTER = new THREE.Vector3(-0.5, -3.55, 0);
const IDLE_Z = 2.0;
const IDLE_BOB_HEIGHT = 0.065;
const HOLD_Z = 2.15;
const HOLD_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), -HOLD_Z);
const HOLD_BOUNDS = {
  minX: -2.2,
  maxX: 1.8,
  minY: -4.4,
  maxY: -1.4,
};
const THROW_DURATION = 1.75;
const AIRBORNE_END = 0.42;
const PIP_OFFSET = DICE_SIZE * 0.25;
const PIP_RADIUS = DICE_SIZE * 0.085;
const INITIAL_ROTATION = [0.45, 0.3, -0.25];
const RESULT_SIZE = 0.9;
const RESULT_PIP_OFFSET = RESULT_SIZE * 0.25;
const RESULT_PIP_RADIUS = RESULT_SIZE * 0.07;
const RESULT_DURATION = 2.4;
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
  4: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
  5: ['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'],
  6: ['topLeft', 'topRight', 'middleLeft', 'middleRight', 'bottomLeft', 'bottomRight'],
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

const RESULT_PIP_POSITIONS = {
  topLeft: [-RESULT_PIP_OFFSET, RESULT_PIP_OFFSET, 0.012],
  topRight: [RESULT_PIP_OFFSET, RESULT_PIP_OFFSET, 0.012],
  middleLeft: [-RESULT_PIP_OFFSET, 0, 0.012],
  middleRight: [RESULT_PIP_OFFSET, 0, 0.012],
  center: [0, 0, 0.012],
  bottomLeft: [-RESULT_PIP_OFFSET, -RESULT_PIP_OFFSET, 0.012],
  bottomRight: [RESULT_PIP_OFFSET, -RESULT_PIP_OFFSET, 0.012],
};

const FACE_TRANSFORMS = [
  { value: 1, position: [0, 0, HALF_SIZE + 0.003], rotation: [0, 0, 0] },
  { value: 6, position: [0, 0, -HALF_SIZE - 0.003], rotation: [Math.PI, 0, 0] },
  { value: 2, position: [0, HALF_SIZE + 0.003, 0], rotation: [-Math.PI / 2, 0, 0] },
  { value: 5, position: [0, -HALF_SIZE - 0.003, 0], rotation: [Math.PI / 2, 0, 0] },
  { value: 3, position: [HALF_SIZE + 0.003, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { value: 4, position: [-HALF_SIZE - 0.003, 0, 0], rotation: [0, -Math.PI / 2, 0] },
];

const FACE_ROTATIONS = {
  1: [0, 0, 0],
  2: [Math.PI / 2, 0, 0],
  3: [0, -Math.PI / 2, 0],
  4: [0, Math.PI / 2, 0],
  5: [-Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
const randomFace = () => Math.floor(Math.random() * 6) + 1;
const nearestEquivalentAngle = (target, reference) => {
  const fullTurn = Math.PI * 2;
  return target + Math.round((reference - target) / fullTurn) * fullTurn;
};
const nearestEquivalentEuler = (targetRotation, referenceRotation) => new THREE.Euler(
  nearestEquivalentAngle(targetRotation[0], referenceRotation.x),
  nearestEquivalentAngle(targetRotation[1], referenceRotation.y),
  nearestEquivalentAngle(targetRotation[2], referenceRotation.z)
);
const clampToMap = (point) => new THREE.Vector3(
  THREE.MathUtils.clamp(point.x, DICE_BOUNDS.minX + HALF_SIZE, DICE_BOUNDS.maxX - HALF_SIZE),
  THREE.MathUtils.clamp(point.y, DICE_BOUNDS.minY + HALF_SIZE, DICE_BOUNDS.maxY - HALF_SIZE),
  point.z
);
const clampToHoldPlane = (point) => new THREE.Vector3(
  THREE.MathUtils.clamp(point.x, HOLD_BOUNDS.minX, HOLD_BOUNDS.maxX),
  THREE.MathUtils.clamp(point.y, HOLD_BOUNDS.minY, HOLD_BOUNDS.maxY),
  HOLD_Z
);
const getHoldPlanePoint = (event, fallback) => {
  const planePoint = new THREE.Vector3();

  if (event?.ray?.intersectPlane(HOLD_PLANE, planePoint)) {
    return clampToHoldPlane(planePoint);
  }

  if (event?.point) {
    return clampToHoldPlane(event.point);
  }

  return fallback.clone().setZ(HOLD_Z);
};

const DicePips = ({ pipPositions = PIP_POSITIONS, pipRadius = PIP_RADIUS, value }) => (
  <>
    {FACE_PIPS[value].map((pip) => (
      <mesh key={pip} position={pipPositions[pip]}>
        <circleGeometry args={[pipRadius, 16]} />
        <meshBasicMaterial color="#111111" side={THREE.DoubleSide} />
      </mesh>
    ))}
  </>
);

const DiceFace = ({ position, rotation, value }) => (
  <group position={position} rotation={rotation}>
    <DicePips value={value} />
  </group>
);

const DiceResultPopup = ({ resultRef, value }) => (
  <group ref={resultRef} visible={Boolean(value)}>
    <mesh position={[0, 0, -0.012]}>
      <planeGeometry args={[RESULT_SIZE + 0.08, RESULT_SIZE + 0.08]} />
      <meshBasicMaterial color="#111111" side={THREE.DoubleSide} />
    </mesh>
    <mesh>
      <planeGeometry args={[RESULT_SIZE, RESULT_SIZE]} />
      <meshBasicMaterial color="#fff1cd" side={THREE.DoubleSide} />
    </mesh>
    {value && (
      <DicePips
        pipPositions={RESULT_PIP_POSITIONS}
        pipRadius={RESULT_PIP_RADIUS}
        value={value}
      />
    )}
  </group>
);

const BlockText = ({ text }) => {
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
          key: `${letter}-${cursor}-${rowIndex}-${columnIndex}`,
          x: cursor + columnIndex * LABEL_CELL_SIZE,
          y: -rowIndex * LABEL_CELL_SIZE,
        });
      });
    });

    cursor += letterWidth + LABEL_LETTER_GAP;
  });

  const centerOffset = cursor / 2;

  return (
    <group position={[-centerOffset, 0.06, 0.01]}>
      {cells.map((cell) => (
        <mesh key={cell.key} position={[cell.x, cell.y, 0]}>
          <planeGeometry args={[LABEL_CELL_SIZE * 0.82, LABEL_CELL_SIZE * 0.82]} />
          <meshBasicMaterial color="#fff1cd" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const ThrowMeLabel = ({ labelRef }) => (
  <group ref={labelRef}>
    <mesh position={[0, 0, -0.01]}>
      <planeGeometry args={[1.25, 0.34]} />
      <meshBasicMaterial
        color="#111111"
        opacity={0.72}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
    <BlockText text={LABEL_TEXT} />
  </group>
);

const BoardDice = ({ enabled = true, onRollComplete, onRollStart }) => {
  const [resultPreview, setResultPreview] = useState(null);
  const diceRef = useRef();
  const labelRef = useRef();
  const resultRef = useRef();
  const stateRef = useRef({
    mode: 'idle',
    startTime: 0,
    idleBasePosition: IDLE_POSITION.clone(),
    holdTarget: LAND_POSITION.clone().setZ(HOLD_Z),
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
  });

  const diceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xfff1cd,
    roughness: 0.5,
    metalness: 0.04,
  }), []);

  const interactionMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  useEffect(() => {
    if (!diceRef.current) return;

    diceRef.current.position.copy(IDLE_POSITION);
    diceRef.current.rotation.set(...INITIAL_ROTATION);
  }, []);

  const beginPickup = (event) => {
    event.stopPropagation();

    if (!enabled || !diceRef.current || stateRef.current.mode === 'throwing' || stateRef.current.mode === 'result') return;

    resultAnimationRef.current.active = false;
    setResultPreview(null);

    const holdTarget = getHoldPlanePoint(event, diceRef.current.position);

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

    const nextDragPoint = getHoldPlanePoint(event, stateRef.current.holdTarget);
    const dragDelta = nextDragPoint.clone().sub(stateRef.current.lastDragPoint);

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
    const holdOffsetX = stateRef.current.holdTarget.x - IDLE_CENTER.x;
    const holdOffsetY = stateRef.current.holdTarget.y - IDLE_CENTER.y;
    const throwBoost = 0.25 + throwStrength * 0.35;
    const impactPosition = clampToMap(new THREE.Vector3(
      LAND_POSITION.x + holdOffsetX * 1.2 + throwDirection.x * throwBoost,
      LAND_POSITION.y + holdOffsetY * 1.2 + throwDirection.y * throwBoost,
      DICE_Z
    ));
    const rollDistance = 0.42 + throwStrength * 0.24 + Math.random() * 0.1;
    const endPosition = clampToMap(new THREE.Vector3(
      impactPosition.x + throwDirection.x * rollDistance,
      impactPosition.y + throwDirection.y * rollDistance,
      DICE_Z
    ));
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

  const animateResultPopup = (clock, camera) => {
    if (!resultRef.current || !resultAnimationRef.current.active) return;

    if (resultAnimationRef.current.startTime === null) {
      resultAnimationRef.current.startTime = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - resultAnimationRef.current.startTime;
    const progress = Math.min(elapsed / RESULT_DURATION, 1);
    const liftProgress = easeOutCubic(Math.min(progress / 0.45, 1));
    const scaleProgress = easeOutCubic(Math.min(progress / 0.35, 1));
    const hover = Math.sin(progress * Math.PI * 3) * 0.035;

    resultRef.current.position.set(
      resultAnimationRef.current.startPosition.x,
      resultAnimationRef.current.startPosition.y,
      resultAnimationRef.current.startPosition.z + 0.95 * liftProgress + hover
    );
    resultRef.current.scale.setScalar(0.25 + 0.75 * scaleProgress);
    resultRef.current.quaternion.copy(camera.quaternion);

    if (progress >= 1) {
      resultAnimationRef.current.active = false;
      setResultPreview(null);

      if (stateRef.current.mode === 'result') {
        stateRef.current.idleBasePosition.copy(IDLE_POSITION);
        stateRef.current.mode = 'idle';
      }
    }
  };

  useFrame(({ camera, clock }, delta) => {
    animateResultPopup(clock, camera);

    if (!diceRef.current) return;

    if (stateRef.current.mode === 'idle') {
      const bob = Math.sin(clock.elapsedTime * 2.2) * IDLE_BOB_HEIGHT;
      const targetPosition = stateRef.current.idleBasePosition.clone();

      targetPosition.z += bob;
      diceRef.current.position.lerp(targetPosition, Math.min(delta * 5, 1));
      diceRef.current.rotation.x += delta * 0.45;
      diceRef.current.rotation.y += delta * 0.7;
      diceRef.current.rotation.z += delta * 0.25;

      if (labelRef.current) {
        labelRef.current.visible = enabled;
        labelRef.current.position.set(
          diceRef.current.position.x,
          diceRef.current.position.y,
          diceRef.current.position.z + 0.68
        );
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
      };
      setResultPreview(stateRef.current.result);
    }
  });

  return (
    <>
      <mesh
        position={[0, MAP_CY, MAP_Z + 0.02]}
        onPointerMove={updateHeldPosition}
        onPointerUp={beginThrow}
        material={interactionMaterial}
      >
        <planeGeometry args={[MAP_W * 2, MAP_H * 2]} />
      </mesh>
      <group
        ref={diceRef}
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
            key={face.value}
            position={face.position}
            rotation={face.rotation}
            value={face.value}
          />
        ))}
      </group>
      <DiceResultPopup resultRef={resultRef} value={resultPreview} />
      <ThrowMeLabel labelRef={labelRef} />
    </>
  );
};

export default BoardDice;
