import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { MAP_Z } from '../constants/mapCoordinates';
import { MARKER_MODEL_SOURCE } from '../constants/boardAssets';

const markerMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.38,
  metalness: 0.12,
  side: THREE.DoubleSide,
  ...options,
});
const ACTIVE_MARKER_MATERIAL = markerMaterial(0xffd700);
const INACTIVE_MARKER_MATERIAL = markerMaterial(0xe53935);
const MOVING_MARKER_MATERIAL = markerMaterial(0x00f0ff, { roughness: 0.18, metalness: 0.35 });
const DIMMED_MARKER_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x772222,
  roughness: 0.7,
  metalness: 0.05,
  opacity: 0.28,
  transparent: true,
  side: THREE.DoubleSide,
});

// Keep route pins readable without covering smaller countries or nearby stops.
const ACTIVE_MARKER_SCALE = 0.12;
const INACTIVE_MARKER_SCALE = 0.095;
const NO_OCCUPIED_MARKERS = new Set();
const MARKER_FADE_MAX_DISTANCE = 0.7;
const MARKER_FADE_LEG_FRACTION = 0.4;

const setMarkerOpacity = (group, opacity) => {
  group.visible = opacity > 0.001;
  group.traverse((child) => {
    if (!child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material.userData.markerBaseOpacity === undefined) {
        material.userData.markerBaseOpacity = material.opacity;
        material.userData.markerBaseTransparent = material.transparent;
        material.userData.markerBaseDepthWrite = material.depthWrite;
      }

      const shouldBeTransparent = material.userData.markerBaseTransparent || opacity < 0.999;
      if (material.transparent !== shouldBeTransparent) {
        material.transparent = shouldBeTransparent;
        material.needsUpdate = true;
      }
      material.opacity = material.userData.markerBaseOpacity * opacity;
      material.depthWrite = material.userData.markerBaseDepthWrite && opacity >= 0.999;
    });
  });
};

const createCountryBadgeTexture = (text, isMoving) => {
  if (typeof document === 'undefined' || !text) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const borderColor = isMoving ? '#00F0FF' : '#FFD700';
  const dotColor = isMoving ? '#00F0FF' : '#FFD700';

  ctx.fillStyle = 'rgba(16, 24, 32, 0.94)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(44, 64, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 72, 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

const CountryMarker = ({
  active,
  activeCarProgressRef,
  compact,
  countryName,
  fadeEndDistance,
  fadeMode = null,
  fadeStartDistance,
  isDimmed = false,
  isMoving = false,
  position,
  routeLength,
  stopNumber,
}) => {
  const markerRef = useRef();
  const activeRingRef = useRef();
  const beaconWaveRef = useRef();
  const opacityRef = useRef(1);
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(MARKER_MODEL_SOURCE);

  const labelTexture = useMemo(() => {
    if (!isMoving && !hovered) return null;
    const label = stopNumber ? `${stopNumber}. ${countryName}` : countryName;
    return createCountryBadgeTexture(label, isMoving);
  }, [countryName, hovered, isMoving, stopNumber]);

  useEffect(() => () => labelTexture?.dispose?.(), [labelTexture]);

  const marker = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!child.isMesh) return;

      const sourceMaterial = isMoving
        ? MOVING_MARKER_MATERIAL
        : (isDimmed
          ? DIMMED_MARKER_MATERIAL
          : (active ? ACTIVE_MARKER_MATERIAL : INACTIVE_MARKER_MATERIAL));
      child.material = sourceMaterial.clone();
    });

    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);

    return clone;
  }, [scene, active, isDimmed, isMoving]);

  useEffect(() => () => {
    marker.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material?.dispose?.());
    });
  }, [marker]);

  useLayoutEffect(() => {
    if (!markerRef.current) return;
    const initialOpacity = fadeMode === 'departing' ? 0 : 1;
    opacityRef.current = initialOpacity;
    setMarkerOpacity(markerRef.current, initialOpacity);
  }, [fadeMode]);

  useFrame(({ clock }) => {
    if (!markerRef.current) return;

    if (fadeMode && activeCarProgressRef && fadeEndDistance > fadeStartDistance) {
      const carDistance = THREE.MathUtils.clamp(
        activeCarProgressRef.current * routeLength,
        fadeStartDistance,
        fadeEndDistance
      );
      const fadeDistance = Math.max(
        Math.min(
          MARKER_FADE_MAX_DISTANCE,
          (fadeEndDistance - fadeStartDistance) * MARKER_FADE_LEG_FRACTION
        ),
        0.001
      );
      const opacity = fadeMode === 'departing'
        ? THREE.MathUtils.smoothstep(
          carDistance,
          fadeStartDistance,
          fadeStartDistance + fadeDistance
        )
        : 1 - THREE.MathUtils.smoothstep(
          carDistance,
          fadeEndDistance - fadeDistance,
          fadeEndDistance
        );

      const reachedEndpoint = opacity === 0 || opacity === 1;
      if (
        Math.abs(opacity - opacityRef.current) > 0.002
        || (reachedEndpoint && opacity !== opacityRef.current)
      ) {
        opacityRef.current = opacity;
        setMarkerOpacity(markerRef.current, opacity);
      }
    }

    if (isMoving) {
      markerRef.current.rotation.z = clock.elapsedTime * 2.2;
      const bounce = Math.abs(Math.sin(clock.elapsedTime * 4.2)) * 0.12;
      markerRef.current.position.set(position.x, position.y, MAP_Z + 0.08 + bounce);

      if (activeRingRef.current) {
        const pulse = 1 + Math.sin(clock.elapsedTime * 6) * 0.22;
        activeRingRef.current.scale.setScalar(pulse);
        activeRingRef.current.material.opacity = (
          0.55 + Math.sin(clock.elapsedTime * 6) * 0.25
        ) * opacityRef.current;
      }

      if (beaconWaveRef.current) {
        const waveTime = (clock.elapsedTime * 1.2) % 1;
        const waveScale = 1 + waveTime * 2.2;
        beaconWaveRef.current.scale.setScalar(waveScale);
        beaconWaveRef.current.material.opacity = (1 - waveTime) * 0.65 * opacityRef.current;
      }
    } else {
      markerRef.current.rotation.z = active ? clock.elapsedTime * 1.2 : 0;
      markerRef.current.position.set(position.x, position.y, MAP_Z + 0.08);

      if (activeRingRef.current) {
        const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.08;
        activeRingRef.current.scale.setScalar(pulse);
        activeRingRef.current.material.opacity = (
          0.24 + Math.sin(clock.elapsedTime * 4) * 0.08
        ) * opacityRef.current;
      }
    }
  });

  const markerColor = isMoving ? '#00E5FF' : (active ? '#FFD700' : '#E53935');
  const ringColor = isMoving ? '#00E5FF' : (active ? '#1BA39C' : '#FFF1CD');
  const baseScale = isMoving
    ? ACTIVE_MARKER_SCALE * 1.65
    : (isDimmed ? INACTIVE_MARKER_SCALE * 0.8 : (active ? ACTIVE_MARKER_SCALE : INACTIVE_MARKER_SCALE));
  const finalScale = baseScale * (compact && !isMoving ? 0.68 : 1);

  return (
    <group
      ref={markerRef}
      position={[position.x, position.y, MAP_Z + 0.08]}
      scale={finalScale}
      onPointerOver={(e) => {
        if (Platform.OS === 'web') {
          e.stopPropagation();
          setHovered(true);
        }
      }}
      onPointerOut={() => {
        if (Platform.OS === 'web') {
          setHovered(false);
        }
      }}
    >
      <mesh position={[0, 0, -0.065]}>
        <circleGeometry args={[isMoving ? 0.7 : (active ? 0.54 : 0.44), 28]} />
        <meshBasicMaterial
          color={isMoving ? '#002B36' : '#111111'}
          opacity={isDimmed ? 0.08 : (isMoving ? 0.55 : (active ? 0.28 : 0.18))}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -0.056]}>
        <ringGeometry args={[isMoving ? 0.42 : (active ? 0.32 : 0.28), isMoving ? 0.58 : (active ? 0.46 : 0.38), 28]} />
        <meshBasicMaterial
          color={ringColor}
          opacity={isDimmed ? 0.22 : (isMoving ? 0.95 : (active ? 0.88 : 0.56))}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      {(active || isMoving) && (
        <mesh ref={activeRingRef} position={[0, 0, -0.052]}>
          <ringGeometry args={[isMoving ? 0.6 : 0.5, isMoving ? 0.8 : 0.64, 32]} />
          <meshBasicMaterial color={markerColor} opacity={isMoving ? 0.6 : 0.32} transparent={true} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isMoving && (
        <mesh ref={beaconWaveRef} position={[0, 0, -0.050]}>
          <ringGeometry args={[0.5, 0.7, 32]} />
          <meshBasicMaterial color="#00E5FF" opacity={0.6} transparent={true} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isMoving && (
        <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.24, 0.9, 16, 1, true]} />
          <meshBasicMaterial color="#00E5FF" opacity={0.3} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <group position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={marker} />
      </group>
      {(isMoving || hovered) && labelTexture && (
        <sprite position={[0, 0, 0.72]} scale={[1.1, 0.28, 1]}>
          <spriteMaterial map={labelTexture} depthTest={false} transparent={true} />
        </sprite>
      )}
    </group>
  );
};

const CountryMarkers = memo(({
  activeCarProgressRef,
  currentLeg,
  movementStartLeg = currentLeg,
  movementTargetLeg = currentLeg,
  movingMarkerIndex = -1,
  movingMarkerStop = null,
  occupiedMarkerIndexes = NO_OCCUPIED_MARKERS,
  routeModel,
  targetLeg,
  vehicleInMotion = false,
}) => {
  const isMovePlacement = movingMarkerIndex >= 0;
  const destinationLeg = targetLeg !== undefined && targetLeg !== null && targetLeg > currentLeg
    ? targetLeg
    : currentLeg + 1;
  const activeMarker = isMovePlacement
    ? -1
    : Math.min(destinationLeg, routeModel.markers.length - 1);
  const compact = routeModel.markers.length > 20;
  const fadeStartDistance = routeModel.stopDistances[movementStartLeg] ?? 0;
  const fadeEndDistance = routeModel.stopDistances[movementTargetLeg] ?? fadeStartDistance;

  return (
    <>
      {routeModel.markers.map((position, index) => {
        const stopData = routeModel.countryStops?.[index];
        const isMoving = isMovePlacement && (index === movingMarkerIndex || (movingMarkerStop && stopData?.id === movingMarkerStop.id));
        if (occupiedMarkerIndexes.has(index) && !isMoving) return null;

        const isDimmed = isMovePlacement && !isMoving;
        const fadeMode = vehicleInMotion && movementTargetLeg > movementStartLeg
          ? (index === movementStartLeg
            ? 'departing'
            : (index === movementTargetLeg ? 'approaching' : null))
          : null;
        const countryName = stopData?.name || routeModel.stopNames?.[index] || '';
        const stopNumber = index + 1;

        return (
          <CountryMarker
            key={`${position.x}-${position.y}-${index}`}
            active={index === activeMarker}
            activeCarProgressRef={activeCarProgressRef}
            compact={compact}
            countryName={countryName}
            fadeEndDistance={fadeEndDistance}
            fadeMode={fadeMode}
            fadeStartDistance={fadeStartDistance}
            isDimmed={isDimmed}
            isMoving={isMoving}
            position={position}
            routeLength={routeModel.length}
            stopNumber={stopNumber}
          />
        );
      })}
    </>
  );
});

export default CountryMarkers;
