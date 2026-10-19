import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import {
  DRIVE_CURVE,
  getSmoothRouteTangentAngle,
  STOP_PROGRESS,
} from '../constants/route';

const RIBBON_SEGMENTS = 900;
const RIBBON_HALF_WIDTH = 0.0135;
const ROUTE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.012;
const ROUTE_LINE_COLOR = '#2C3E50';
const ROUTE_LINE_OPACITY = 0.6;

const easeInOutCubic = (value) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);

const buildRibbonGeometry = (halfWidth, zHeight) => {
  const vertexCount = (RIBBON_SEGMENTS + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint16Array(RIBBON_SEGMENTS * 6);
  const point = new THREE.Vector3();

  for (let i = 0; i <= RIBBON_SEGMENTS; i += 1) {
    const progress = i / RIBBON_SEGMENTS;
    DRIVE_CURVE.getPointAt(progress, point);
    const tangentAngle = getSmoothRouteTangentAngle(progress, 0.006);
    const normalX = -Math.sin(tangentAngle);
    const normalY = Math.cos(tangentAngle);

    const leftOffset = i * 6;
    positions[leftOffset] = point.x + normalX * halfWidth;
    positions[leftOffset + 1] = point.y + normalY * halfWidth;
    positions[leftOffset + 2] = zHeight;

    positions[leftOffset + 3] = point.x - normalX * halfWidth;
    positions[leftOffset + 4] = point.y - normalY * halfWidth;
    positions[leftOffset + 5] = zHeight;

    if (i < RIBBON_SEGMENTS) {
      const v0 = i * 2;
      const v1 = v0 + 1;
      const v2 = v0 + 2;
      const v3 = v0 + 3;
      const idxOffset = i * 6;

      indices[idxOffset] = v0;
      indices[idxOffset + 1] = v1;
      indices[idxOffset + 2] = v2;
      indices[idxOffset + 3] = v2;
      indices[idxOffset + 4] = v1;
      indices[idxOffset + 5] = v3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);
  geometry.computeBoundingSphere();

  return geometry;
};

const DottedRouteLine = memo(({
  activeCarProgressRef,
  driving = false,
  fromLeg = 0,
  pathRevealDuration = 0.75,
  toLeg = 0,
}) => {
  const groupRef = useRef();
  const moveAnimRef = useRef({
    key: null,
    elapsed: 0,
  });

  const ribbonGeometry = useMemo(
    () => buildRibbonGeometry(RIBBON_HALF_WIDTH, ROUTE_Z),
    []
  );

  useFrame((_state, delta) => {
    const isMoveActive = driving && toLeg > fromLeg;

    if (!isMoveActive) {
      moveAnimRef.current.key = null;
      moveAnimRef.current.elapsed = 0;
      ribbonGeometry.setDrawRange(0, 0);

      if (groupRef.current) {
        groupRef.current.visible = false;
      }
      return;
    }

    const moveKey = `${fromLeg}-${toLeg}`;
    if (moveAnimRef.current.key !== moveKey) {
      moveAnimRef.current.key = moveKey;
      moveAnimRef.current.elapsed = 0;
    } else {
      moveAnimRef.current.elapsed += delta;
    }

    const startProgress = STOP_PROGRESS[fromLeg] ?? 0;
    const endProgress = STOP_PROGRESS[toLeg] ?? 1;
    const revealDuration = Math.max(pathRevealDuration, 0.4);
    const revealLinear = THREE.MathUtils.clamp(moveAnimRef.current.elapsed / revealDuration, 0, 1);
    const revealEased = easeInOutCubic(revealLinear);

    const headProgress = THREE.MathUtils.lerp(startProgress, endProgress, revealEased);
    const liveCarProgress = activeCarProgressRef?.current ?? startProgress;
    const tailProgress = THREE.MathUtils.clamp(
      Math.max(startProgress, liveCarProgress),
      startProgress,
      headProgress
    );

    const remainingProgress = headProgress - tailProgress;
    if (remainingProgress <= 0.0005 && revealLinear >= 1) {
      ribbonGeometry.setDrawRange(0, 0);
      if (groupRef.current) {
        groupRef.current.visible = false;
      }
      return;
    }

    if (groupRef.current) {
      groupRef.current.visible = true;
    }

    const startSegment = Math.floor(tailProgress * RIBBON_SEGMENTS);
    const endSegment = Math.max(startSegment + 1, Math.ceil(headProgress * RIBBON_SEGMENTS));
    const indexCount = Math.max(0, (endSegment - startSegment) * 6);

    ribbonGeometry.setDrawRange(startSegment * 6, indexCount);
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={ribbonGeometry} renderOrder={4} frustumCulled={false}>
        <meshBasicMaterial
          color={ROUTE_LINE_COLOR}
          depthWrite={false}
          opacity={ROUTE_LINE_OPACITY}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent={true}
        />
      </mesh>
    </group>
  );
});

export default DottedRouteLine;
