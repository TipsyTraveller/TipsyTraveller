import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei/native';
import {
  MAP_CY,
  MAP_H,
  MAP_VIEWPORT_CENTER_U,
  MAP_VIEWPORT_CENTER_V,
  MAP_VIEWPORT_HEIGHT,
  MAP_VIEWPORT_WIDTH,
  MAP_W,
  MAP_Z,
} from '../constants/mapCoordinates';
import * as THREE from 'three';

const OCEAN_W = 240;
const OCEAN_H = 180;
export const OCEAN_COLOR = '#2C3E50';
export const LAND_COLOR = '#FFF1CD';
const RELIEF_COLOR = '#B8AD92';
const BORDER_COLOR = '#6A6253';
const VECTOR_SCALE_X = 1 / MAP_VIEWPORT_WIDTH;
const VECTOR_SCALE_Y = 1 / MAP_VIEWPORT_HEIGHT;
const VECTOR_OFFSET_X = (MAP_W * (0.5 - MAP_VIEWPORT_CENTER_U)) / MAP_VIEWPORT_WIDTH;
const VECTOR_OFFSET_Y = (
  MAP_CY
  - VECTOR_SCALE_Y * MAP_CY
  + ((MAP_VIEWPORT_CENTER_V - 0.5) * MAP_H) / MAP_VIEWPORT_HEIGHT
);

const prepareVectorMap = (scene) => {
  const clone = scene.clone(true);

  clone.traverse((child) => {
    if (!child.isMesh && !child.isLineSegments) return;

    child.frustumCulled = false;

    if (child.name === 'CountryBorders') {
      child.material = new THREE.LineBasicMaterial({
        color: BORDER_COLOR,
        depthWrite: false,
        opacity: 0.92,
        toneMapped: false,
        transparent: true,
      });
      child.renderOrder = 2;
      return;
    }

    if (child.name === 'LandTop') {
      child.material = new THREE.MeshBasicMaterial({
        color: LAND_COLOR,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      child.renderOrder = 1;
      return;
    }

    child.material = new THREE.MeshStandardMaterial({
      color: RELIEF_COLOR,
      metalness: 0.01,
      roughness: 0.78,
      side: THREE.DoubleSide,
    });
  });

  return clone;
};

const MapPlane = () => {
  const { scene } = useGLTF(require('../../../assets/models/world-map-vector.glb'));
  const vectorMap = useMemo(() => prepareVectorMap(scene), [scene]);

  return (
    <group>
      <mesh position={[0, MAP_CY, MAP_Z]}>
        <planeGeometry args={[OCEAN_W, OCEAN_H]} />
        <meshBasicMaterial color={OCEAN_COLOR} toneMapped={false} />
      </mesh>

      <primitive
        object={vectorMap}
        position={[VECTOR_OFFSET_X, VECTOR_OFFSET_Y, MAP_Z + 0.003]}
        scale={[VECTOR_SCALE_X, VECTOR_SCALE_Y, 1]}
      />
    </group>
  );
};

export default MapPlane;
