import { memo, Suspense, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import BadgeText from './BadgeText';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import { TOURING_GOLD, TOURING_NAVY, TOURING_TEAL } from '../constants/touringPalette';

const BADGE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.017;
const BADGE_RADIUS = 0.105;
const COLLAPSED_SCALE = 0.36;
const TRANSITION_MAX_DISTANCE = 0.7;
const TRANSITION_LEG_FRACTION = 0.4;
const NO_OCCUPIED_MARKERS = new Set();

const disc = new THREE.CircleGeometry(1, 24);
const plate = new THREE.PlaneGeometry(1, 1);
const navy = new THREE.MeshBasicMaterial({ color: TOURING_NAVY, toneMapped: false });
const rim = new THREE.MeshBasicMaterial({ color: '#52636A', toneMapped: false });
const cream = new THREE.MeshBasicMaterial({ color: '#E9E0C7', toneMapped: false });
const gold = new THREE.MeshBasicMaterial({ color: TOURING_GOLD, toneMapped: false });
const cyan = new THREE.MeshBasicMaterial({ color: '#00E5FF', toneMapped: false });
const muted = new THREE.MeshBasicMaterial({ color: '#A2B3AC', toneMapped: false });
const teal = new THREE.MeshBasicMaterial({ color: TOURING_TEAL, toneMapped: false });

const numberPosition = [0, 0, 0.004];

const FinishCheck = ({ x }) => (
  <group position={[x, 0, 0.005]}>
    <mesh dispose={null} geometry={plate} material={cream} scale={[0.126, 0.09, 1]} />
    <mesh dispose={null} geometry={plate} material={navy} position={[-0.042, 0.0225, 0.001]} scale={[0.042, 0.045, 1]} />
    <mesh dispose={null} geometry={plate} material={navy} position={[0, -0.0225, 0.001]} scale={[0.042, 0.045, 1]} />
    <mesh dispose={null} geometry={plate} material={navy} position={[0.042, 0.0225, 0.001]} scale={[0.042, 0.045, 1]} />
  </group>
);

export const DestinationLabel = ({ position, stop }) => {
  const plateRef = useRef(null);
  const label = stop.name.toUpperCase();
  const finish = stop.id === 'greece';
  const fontSize = Math.min(0.068, 1.18 / label.length);
  const width = label.length * fontSize + 0.10 + (finish ? 0.154 : 0);

  useFrame(({ camera }) => plateRef.current?.quaternion.copy(camera.quaternion));

  return (
    <group ref={plateRef} position={[position.x, position.y + 0.13, BADGE_Z + 0.23]}>
      <mesh dispose={null} geometry={plate} material={navy} scale={[width, 0.123, 1]} />
      <Suspense fallback={null}>
        <BadgeText
          fontSize={fontSize}
          material={cream}
          position={[finish ? -0.077 : 0, 0, 0.005]}
        >
          {label}
        </BadgeText>
      </Suspense>
      {finish && <FinishCheck x={width / 2 - 0.086} />}
    </group>
  );
};

const CountryMarker = ({
  active,
  activeCarProgressRef,
  compact,
  endDistance,
  finish,
  movePhase,
  occupied,
  position,
  routeLength,
  startDistance,
  stopNumber,
  variant,
}) => {
  const badge = useRef(null);
  const number = useRef(null);
  const editing = variant === 'editing';
  const radius = BADGE_RADIUS * (editing ? 1.18 : (compact ? 0.72 : 1));
  const fullSize = !occupied || editing;
  const transitionDistance = Math.min(
    TRANSITION_MAX_DISTANCE,
    (endDistance - startDistance) * TRANSITION_LEG_FRACTION
  );

  useLayoutEffect(() => {
    const expanded = fullSize && movePhase !== 'departing';
    badge.current.scale.setScalar(expanded ? 1 : COLLAPSED_SCALE);
    number.current.visible = expanded;
  }, [fullSize, movePhase]);

  useFrame(() => {
    if (!badge.current || !fullSize || !movePhase || transitionDistance <= 0) return;

    const distance = activeCarProgressRef.current * routeLength;
    const expansion = movePhase === 'departing'
      ? THREE.MathUtils.smoothstep(distance, startDistance, startDistance + transitionDistance)
      : 1 - THREE.MathUtils.smoothstep(distance, endDistance - transitionDistance, endDistance);

    badge.current.scale.setScalar(THREE.MathUtils.lerp(COLLAPSED_SCALE, 1, expansion));
    number.current.visible = expansion > 0.32;
  });

  const outline = editing ? cyan : (active || finish ? teal : rim);
  return (
    <group position={[position.x, position.y, BADGE_Z]}>
      <group ref={badge}>
        <mesh dispose={null} geometry={disc} material={outline} scale={[radius, radius, 1]} />
        <mesh
          dispose={null}
          geometry={disc}
          material={variant === 'muted' ? muted : (variant === 'detour' ? gold : cream)}
          position={[0, 0, 0.002]}
          scale={[radius * 0.91, radius * 0.91, 1]}
        />
        <group ref={number}>
          <Suspense fallback={null}>
            <BadgeText fontSize={radius * 0.79} material={navy} position={numberPosition}>
              {stopNumber}
            </BadgeText>
          </Suspense>
        </group>
      </group>
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
  variant = 'main',
  vehicleInMotion = false,
}) => {
  const detour = variant === 'detour';
  const activeIndex = vehicleInMotion && movingMarkerIndex < 0 ? targetLeg : -1;
  const startDistance = routeModel.stopDistances[movementStartLeg] ?? 0;
  const endDistance = routeModel.stopDistances[movementTargetLeg] ?? startDistance;
  const transitioning = vehicleInMotion && activeCarProgressRef && movementTargetLeg > movementStartLeg;

  return routeModel.markers.map((position, index) => {
    // The first and last detour waypoints already have main route badges.
    if (detour && (index === 0 || index === routeModel.finalStopIndex)) return null;

    const stop = routeModel.countryStops[index];
    const editing = variant === 'editing' || index === movingMarkerIndex
      || (movingMarkerIndex >= 0 && movingMarkerStop && stop?.id === movingMarkerStop.id);
    const active = index === activeIndex;
    const finish = !detour && stop?.id === 'greece';
    const occupied = occupiedMarkerIndexes.has(index);
    let movePhase = null;
    if (transitioning && !occupied && !editing) {
      if (index === movementStartLeg) movePhase = 'departing';
      if (index === movementTargetLeg) movePhase = 'arriving';
    }

    return (
      <CountryMarker
        key={stop?.id || index}
        active={active}
        activeCarProgressRef={activeCarProgressRef}
        compact={routeModel.markers.length > 20}
        endDistance={endDistance}
        finish={finish}
        movePhase={movePhase}
        occupied={occupied}
        position={position}
        routeLength={routeModel.length}
        startDistance={startDistance}
        stopNumber={detour ? index : index + 1}
        variant={editing ? 'editing' : (movingMarkerIndex >= 0 ? 'muted' : variant)}
      />
    );
  });
});

export default CountryMarkers;
