import { memo, useEffect, useMemo } from 'react';
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
import { MAP_MODEL_SOURCE, boardLoadTimings, perfLog, perfNow } from '../constants/boardAssets';

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

// Module-level so the numbers survive the suspend/re-render cycle of useGLTF.
let firstRenderAt = null;
let hasLoggedReady = false;

const MapPlane = memo(({ onMapPointSelected, placementActive = false }) => {
  if (firstRenderAt === null) {
    firstRenderAt = perfNow();
    perfLog('map: first render attempt (GLB requested)');
  }

  const { scene } = useGLTF(MAP_MODEL_SOURCE);

  if (!hasLoggedReady) {
    hasLoggedReady = true;
    const now = perfNow();
    const sincePreload = boardLoadTimings.preloadStartedAt === null
      ? 'no preload'
      : `${(now - boardLoadTimings.preloadStartedAt).toFixed(0)} ms after preload start`;
    perfLog(`map: GLB ready ${(now - firstRenderAt).toFixed(0)} ms after first render attempt (${sincePreload})`);
  }

  const vectorMap = useMemo(() => {
    const startedAt = perfNow();
    const prepared = prepareVectorMap(scene);
    perfLog(`map: materials prepared in ${(perfNow() - startedAt).toFixed(0)} ms`);
    return prepared;
  }, [scene]);

  // Time from mount to the first painted frame, plus the total since the first render attempt.
  useEffect(() => {
    const mountedAt = perfNow();
    const frame = requestAnimationFrame(() => {
      const now = perfNow();
      perfLog(`map: first frame ${(now - mountedAt).toFixed(0)} ms after mount, ${(now - firstRenderAt).toFixed(0)} ms total`);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  // The clone owns its materials (geometry is shared with the cached GLTF scene).
  useEffect(() => () => {
    vectorMap.traverse((child) => child.material?.dispose?.());
  }, [vectorMap]);

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
      {placementActive && (
        <mesh
          position={[0, MAP_CY, MAP_Z + 0.09]}
          onPointerDown={(event) => {
            event.stopPropagation();
            onMapPointSelected?.(event.point);
          }}
        >
          <planeGeometry args={[MAP_W, MAP_H]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});

export default MapPlane;
