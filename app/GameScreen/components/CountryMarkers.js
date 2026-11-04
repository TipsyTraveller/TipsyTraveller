import { memo, Suspense, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import BadgeText from './BadgeText';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import { TOURING_CREAM, TOURING_GOLD, TOURING_NAVY, TOURING_TEAL } from '../constants/touringPalette';

const BADGE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.017;
const BADGE_RADIUS = 0.142;
const COLLAPSED_SCALE = 0.36;
const TRANSITION_MAX_DISTANCE = 0.7;
const TRANSITION_LEG_FRACTION = 0.4;
const NO_OCCUPIED_MARKERS = new Set();

const disc = new THREE.CircleGeometry(1, 24);
const ring = new THREE.RingGeometry(0.91, 1.08, 24);
const plate = new THREE.PlaneGeometry(1, 1);
const navy = new THREE.MeshBasicMaterial({ color: TOURING_NAVY, toneMapped: false });
const cream = new THREE.MeshBasicMaterial({ color: TOURING_CREAM, toneMapped: false });
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

const Nameplate = ({ editing, finish, label, plateRef }) => {
  const fontSize = Math.min(0.079, 1.34 / label.length);
  const labelWidth = label.length * fontSize + 0.115;
  const width = labelWidth + (finish ? 0.154 : 0);
  return (
    <group ref={plateRef} position={[0, 0.13, 0.23]}>
      <mesh dispose={null} geometry={plate} material={editing ? navy : cream} scale={[width, 0.156, 1]} />
      <mesh dispose={null} geometry={plate} material={editing ? cyan : navy} position={[0, 0, 0.002]} scale={[width - 0.022, 0.134, 1]} />
      <Suspense fallback={null}>
        <BadgeText
          fontSize={fontSize}
          material={editing ? navy : cream}
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
  label,
  movePhase,
  occupied,
  position,
  routeLength,
  startDistance,
  stopNumber,
  variant,
}) => {
  const badge = useRef(null);
  const accent = useRef(null);
  const number = useRef(null);
  const plateRef = useRef(null);
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
    if (accent.current) accent.current.visible = expanded;
  }, [active, editing, fullSize, movePhase]);

  useFrame(({ camera, clock }) => {
    if (plateRef.current) plateRef.current.quaternion.copy(camera.quaternion);
    if (!badge.current || !fullSize || (!movePhase && !active)) return;

    let expansion = 1;
    if (movePhase && transitionDistance > 0) {
      const distance = activeCarProgressRef.current * routeLength;
      expansion = movePhase === 'departing'
        ? THREE.MathUtils.smoothstep(distance, startDistance, startDistance + transitionDistance)
        : 1 - THREE.MathUtils.smoothstep(distance, endDistance - transitionDistance, endDistance);
    }

    badge.current.scale.setScalar(THREE.MathUtils.lerp(COLLAPSED_SCALE, 1, expansion));
    number.current.visible = expansion > 0.32;
    if (accent.current) {
      accent.current.visible = expansion > 0.32;
      const pulse = active && !editing ? 1 + Math.sin(clock.elapsedTime * 2.6) * 0.045 : 1;
      accent.current.scale.set(radius * pulse, radius * pulse, 1);
    }
  });

  return (
    <group position={[position.x, position.y, BADGE_Z]}>
      <group ref={badge}>
        <mesh dispose={null} geometry={disc} material={navy} scale={[radius, radius, 1]} />
        <mesh
          dispose={null}
          geometry={disc}
          material={variant === 'muted' ? muted : (variant === 'detour' ? gold : cream)}
          position={[0, 0, 0.002]}
          scale={[radius * 0.81, radius * 0.81, 1]}
        />
        {(active || editing || finish) && (
          <mesh
            ref={accent}
            dispose={null}
            geometry={ring}
            material={editing ? cyan : (active ? gold : teal)}
            position={[0, 0, 0.001]}
            scale={[radius, radius, 1]}
          />
        )}
        <group ref={number}>
          <Suspense fallback={null}>
            <BadgeText fontSize={radius * 0.79} material={navy} position={numberPosition}>
              {stopNumber}
            </BadgeText>
          </Suspense>
        </group>
      </group>
      {label && <Nameplate editing={editing} finish={finish} label={label} plateRef={plateRef} />}
    </group>
  );
};

const CountryMarkers = memo(({
  activeCarProgressRef,
  animateArrival = true,
  animateDeparture = true,
  currentLeg,
  labelMode = 'next-and-finish',
  highlightDestination = labelMode !== 'none',
  movementStartLeg = currentLeg,
  movementTargetLeg = currentLeg,
  movementRouteModel = null,
  movingMarkerIndex = -1,
  occupiedMarkerIndexes = NO_OCCUPIED_MARKERS,
  routeModel,
  targetLeg,
  variant = 'main',
  vehicleInMotion = false,
}) => {
  const detour = variant === 'detour';
  const activeIndex = !highlightDestination || movingMarkerIndex >= 0
    ? -1
    : Math.min(targetLeg > currentLeg ? targetLeg : currentLeg + 1, routeModel.finalStopIndex);
  const startDistance = movementRouteModel ? 0 : (routeModel.stopDistances[movementStartLeg] ?? 0);
  const endDistance = movementRouteModel?.length ?? routeModel.stopDistances[movementTargetLeg] ?? startDistance;
  const transitioning = vehicleInMotion && activeCarProgressRef && movementTargetLeg > movementStartLeg;

  return routeModel.markers.map((position, index) => {
    // The first and last detour waypoints already have main route badges.
    if (detour && (index === 0 || index === routeModel.finalStopIndex)) return null;

    const editing = variant === 'editing' || index === movingMarkerIndex;
    const active = index === activeIndex;
    const stop = routeModel.countryStops[index];
    const finish = !detour && stop?.id === 'greece';
    const occupied = occupiedMarkerIndexes.has(index);
    const showLabel = editing || labelMode === 'all' || (labelMode === 'next-and-finish' && (active || finish));
    let movePhase = null;
    if (transitioning && !occupied && !editing) {
      if (animateDeparture && index === movementStartLeg) movePhase = 'departing';
      if (animateArrival && index === movementTargetLeg) movePhase = 'arriving';
    }

    return (
      <CountryMarker
        key={stop?.id || index}
        active={active}
        activeCarProgressRef={activeCarProgressRef}
        compact={routeModel.markers.length > 20}
        endDistance={endDistance}
        finish={finish}
        label={showLabel ? routeModel.stopNames[index]?.toUpperCase() : null}
        movePhase={movePhase}
        occupied={occupied}
        position={position}
        routeLength={movementRouteModel?.length ?? routeModel.length}
        startDistance={startDistance}
        stopNumber={detour ? index : index + 1}
        variant={editing ? 'editing' : (movingMarkerIndex >= 0 ? 'muted' : variant)}
      />
    );
  });
});

export default CountryMarkers;
