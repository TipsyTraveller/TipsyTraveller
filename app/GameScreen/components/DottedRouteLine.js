import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { setRoadWindow, TouringRoadMesh, useTouringRoad } from './TouringRoad';

const MAX_FRAME_DELTA = 0.1;

const easeInOutCubic = (value) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);

const DottedRouteLine = memo(({
  activeCarProgressRef,
  driving = false,
  fromLeg = 0,
  moveStartDelay = 0,
  pathRevealDuration = 0.75,
  toLeg = 0,
  routeModel,
  movementRouteModel = null,
}) => {
  const moveAnimRef = useRef({ key: null, elapsed: 0 });
  const activeModel = movementRouteModel || routeModel;
  const baseRoad = useTouringRoad(routeModel, 'main');
  const activeRoad = useTouringRoad(activeModel, 'highlight', true);
  const moveKey = driving && toLeg > fromLeg ? `${fromLeg}-${toLeg}` : null;

  useFrame((_state, delta) => {
    const animation = moveAnimRef.current;
    if (moveKey === null) {
      if (animation.key !== null) setRoadWindow(activeRoad, 0, 0);
      animation.key = null;
      return;
    }

    if (animation.key !== moveKey) {
      animation.key = moveKey;
      animation.elapsed = 0;
    } else {
      animation.elapsed += Math.min(delta, MAX_FRAME_DELTA);
    }

    const startProgress = movementRouteModel ? 0 : (activeModel.stopProgress[fromLeg] ?? 0);
    const endProgress = movementRouteModel ? 1 : (activeModel.stopProgress[toLeg] ?? 1);
    const revealDuration = Math.max(pathRevealDuration, 0.4);
    const revealDelay = Math.max(0, moveStartDelay - revealDuration - 0.08);
    const revealElapsed = Math.max(0, animation.elapsed - revealDelay);
    const revealLinear = THREE.MathUtils.clamp(revealElapsed / revealDuration, 0, 1);

    const headProgress = THREE.MathUtils.lerp(startProgress, endProgress, easeInOutCubic(revealLinear));
    const liveCarProgress = activeCarProgressRef?.current ?? startProgress;
    const tailProgress = THREE.MathUtils.clamp(liveCarProgress, startProgress, headProgress);

    if (headProgress - tailProgress <= 0.0005 && revealLinear >= 1) {
      setRoadWindow(activeRoad, 0, 0);
    } else {
      setRoadWindow(activeRoad, tailProgress, headProgress);
    }
  });

  return (
    <group>
      <TouringRoadMesh road={baseRoad} />
      <TouringRoadMesh road={activeRoad} visible={moveKey !== null} />
    </group>
  );
});

export default DottedRouteLine;
