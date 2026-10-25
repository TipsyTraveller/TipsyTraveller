import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';

const RIBBON_SEGMENTS = 900;
const BASE_ROUTE_HALF_WIDTH = 0.006;
const ACTIVE_ROUTE_HALF_WIDTH = 0.0135;
const ROUTE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.012;
const BASE_ROUTE_COLOR = '#5FAFD0';
const BASE_ROUTE_OPACITY = 0.62;
const ACTIVE_ROUTE_COLOR = '#2F8FB7';
const ACTIVE_ROUTE_OPACITY = 0.9;

const easeInOutCubic = (value) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);

const buildRibbonGeometry = (halfWidth, routeModel, zHeight, initiallyVisible = false) => {
  const vertexCount = (RIBBON_SEGMENTS + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint16Array(RIBBON_SEGMENTS * 6);
  const point = new THREE.Vector3();

  for (let i = 0; i <= RIBBON_SEGMENTS; i += 1) {
    const progress = i / RIBBON_SEGMENTS;
    routeModel.curve.getPointAt(progress, point);
    const tangentAngle = routeModel.getTangentAngle(progress, 0.006);
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
  geometry.setDrawRange(0, initiallyVisible ? indices.length : 0);
  geometry.computeBoundingSphere();

  return geometry;
};

const DottedRouteLine = memo(({
  activeCarProgressRef,
  driving = false,
  fromLeg = 0,
  pathRevealDuration = 0.75,
  toLeg = 0,
  routeModel,
  movementRouteModel = null,
}) => {
  const groupRef = useRef();
  const moveAnimRef = useRef({
    key: null,
    elapsed: 0,
  });

  const baseRouteGeometry = useMemo(
    () => buildRibbonGeometry(BASE_ROUTE_HALF_WIDTH, routeModel, ROUTE_Z, true),
    [routeModel]
  );
  const activeRouteGeometry = useMemo(
    () => buildRibbonGeometry(ACTIVE_ROUTE_HALF_WIDTH, movementRouteModel || routeModel, ROUTE_Z + 0.002),
    [movementRouteModel, routeModel]
  );

  useEffect(() => () => baseRouteGeometry.dispose(), [baseRouteGeometry]);
  useEffect(() => () => activeRouteGeometry.dispose(), [activeRouteGeometry]);

  useFrame((_state, delta) => {
    const isMoveActive = driving && toLeg > fromLeg;

    if (!isMoveActive) {
      moveAnimRef.current.key = null;
      moveAnimRef.current.elapsed = 0;
      activeRouteGeometry.setDrawRange(0, 0);

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

    const activeModel = movementRouteModel || routeModel;
    const startProgress = movementRouteModel ? 0 : (activeModel.stopProgress[fromLeg] ?? 0);
    const endProgress = movementRouteModel ? 1 : (activeModel.stopProgress[toLeg] ?? 1);
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
      activeRouteGeometry.setDrawRange(0, 0);
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

    activeRouteGeometry.setDrawRange(startSegment * 6, indexCount);
  });

  return (
    <group>
      <mesh geometry={baseRouteGeometry} renderOrder={3} frustumCulled={false}>
        <meshBasicMaterial
          color={BASE_ROUTE_COLOR}
          depthWrite={false}
          opacity={BASE_ROUTE_OPACITY}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent={true}
        />
      </mesh>
      <group ref={groupRef} visible={false}>
        <mesh geometry={activeRouteGeometry} renderOrder={5} frustumCulled={false}>
          <meshBasicMaterial
            color={ACTIVE_ROUTE_COLOR}
            depthWrite={false}
            opacity={ACTIVE_ROUTE_OPACITY}
            side={THREE.DoubleSide}
            toneMapped={false}
            transparent={true}
          />
        </mesh>
      </group>
    </group>
  );
});

export default DottedRouteLine;
