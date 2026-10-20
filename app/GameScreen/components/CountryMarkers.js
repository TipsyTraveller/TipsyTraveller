import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { MAP_Z } from '../constants/mapCoordinates';
import { MARKER_MODEL_SOURCE } from '../constants/boardAssets';

// Two shared materials for all markers; per-marker materials only multiplied shader state.
const markerMaterial = (color) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.38,
  metalness: 0.12,
  side: THREE.DoubleSide,
});
const ACTIVE_MARKER_MATERIAL = markerMaterial(0xffd700);
const INACTIVE_MARKER_MATERIAL = markerMaterial(0xe53935);

const CountryMarker = ({ position, active }) => {
  const markerRef = useRef();
  const activeRingRef = useRef();
  const { scene } = useGLTF(MARKER_MODEL_SOURCE);
  const marker = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!child.isMesh) return;

      child.material = active ? ACTIVE_MARKER_MATERIAL : INACTIVE_MARKER_MATERIAL;
    });

    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);

    return clone;
  }, [scene, active]);

  useFrame(({ clock }) => {
    if (!markerRef.current) return;

    markerRef.current.rotation.z = active ? clock.elapsedTime * 1.2 : 0;

    if (activeRingRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.08;
      activeRingRef.current.scale.setScalar(pulse);
      activeRingRef.current.material.opacity = 0.24 + Math.sin(clock.elapsedTime * 4) * 0.08;
    }
  });

  const markerColor = active ? '#FFD700' : '#E53935';
  const ringColor = active ? '#1BA39C' : '#FFF1CD';

  return (
    <group
      ref={markerRef}
      position={[position.x, position.y, MAP_Z + 0.08]}
      scale={active ? 0.12 : 0.095}
    >
      <mesh position={[0, 0, -0.065]}>
        <circleGeometry args={[active ? 0.54 : 0.44, 28]} />
        <meshBasicMaterial color="#111111" opacity={active ? 0.28 : 0.18} transparent={true} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.056]}>
        <ringGeometry args={[active ? 0.32 : 0.28, active ? 0.46 : 0.38, 28]} />
        <meshBasicMaterial color={ringColor} opacity={active ? 0.88 : 0.56} transparent={true} side={THREE.DoubleSide} />
      </mesh>
      {active && (
        <mesh ref={activeRingRef} position={[0, 0, -0.052]}>
          <ringGeometry args={[0.5, 0.64, 32]} />
          <meshBasicMaterial color={markerColor} opacity={0.32} transparent={true} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={marker} />
      </group>
    </group>
  );
};

const CountryMarkers = memo(({ currentLeg, routeModel, targetLeg }) => {
  const destinationLeg = targetLeg !== undefined && targetLeg !== null && targetLeg > currentLeg
    ? targetLeg
    : currentLeg + 1;
  const activeMarker = Math.min(destinationLeg, routeModel.markers.length - 1);

  return (
    <>
      {routeModel.markers.map((position, index) => (
        <CountryMarker
          key={`${position.x}-${position.y}-${index}`}
          position={position}
          active={index === activeMarker}
        />
      ))}
    </>
  );
});

export default CountryMarkers;
