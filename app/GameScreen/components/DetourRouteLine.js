import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';

const SEGMENTS = 180;
const ROUTE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.02;

const buildRibbon = (routeModel) => {
  const positions = [];
  const indices = [];
  const point = new THREE.Vector3();
  const halfWidth = 0.024;

  for (let index = 0; index <= SEGMENTS; index += 1) {
    const progress = index / SEGMENTS;
    routeModel.curve.getPointAt(progress, point);
    const angle = routeModel.getTangentAngle(progress, 0.008);
    const nx = -Math.sin(angle) * halfWidth;
    const ny = Math.cos(angle) * halfWidth;
    positions.push(point.x + nx, point.y + ny, ROUTE_Z);
    positions.push(point.x - nx, point.y - ny, ROUTE_Z);

    if (index < SEGMENTS) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
};

const DetourRouteLine = memo(({ routeModel, selected = false, visible = false }) => {
  const geometry = useMemo(() => routeModel ? buildRibbon(routeModel) : null, [routeModel]);
  useEffect(() => () => geometry?.dispose?.(), [geometry]);

  if (!visible || !routeModel || !geometry) return null;

  return (
    <group name="roadblock-detour-preview">
      <mesh geometry={geometry} renderOrder={8} frustumCulled={false}>
        <meshBasicMaterial
          color={selected ? '#FFD700' : '#FFB11B'}
          depthWrite={false}
          opacity={selected ? 1 : 0.82}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
      {routeModel.markers.slice(1, -1).map((position, index) => (
        <group key={`${position.x}-${position.y}-${index}`} position={[position.x, position.y, ROUTE_Z + 0.006]}>
          <mesh renderOrder={9}>
            <circleGeometry args={[selected ? 0.105 : 0.085, 18]} />
            <meshBasicMaterial color="#FFD700" depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.002]} renderOrder={8}>
            <ringGeometry args={[0.11, 0.145, 18]} />
            <meshBasicMaterial color="#223144" depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

DetourRouteLine.displayName = 'DetourRouteLine';

export default DetourRouteLine;
