import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';

const SEGMENTS = 180;
const ROUTE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.02;

const createLabelTexture = (countryName) => {
  if (typeof document === 'undefined' || !countryName) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = 'rgba(21, 34, 46, 0.96)';
  context.strokeStyle = '#FFD700';
  context.lineWidth = 8;
  context.beginPath();
  context.roundRect(10, 10, 492, 108, 24);
  context.fill();
  context.stroke();
  context.fillStyle = '#FFD700';
  context.beginPath();
  context.arc(44, 64, 12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#FFFFFF';
  context.font = 'bold 36px monospace';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(countryName.toUpperCase(), 72, 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

const DetourCountryLabel = ({ countryName, position }) => {
  const texture = useMemo(() => createLabelTexture(countryName), [countryName]);
  useEffect(() => () => texture?.dispose?.(), [texture]);
  if (!texture) return null;

  return (
    <sprite position={[position.x, position.y, ROUTE_Z + 0.2]} scale={[0.92, 0.23, 1]} renderOrder={12}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent toneMapped={false} />
    </sprite>
  );
};

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
      {routeModel.countryStops.slice(1, -1).map((stop, index) => (
        <DetourCountryLabel
          key={stop.id || `${stop.name}-${index}`}
          countryName={stop.name}
          position={routeModel.markers[index + 1]}
        />
      ))}
    </group>
  );
});

DetourRouteLine.displayName = 'DetourRouteLine';

export default DetourRouteLine;
