import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { setRoadWindow, TouringRoadMesh, useTouringRoad } from './TouringRoad';

const easeInOutCubic = (value) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);

const DottedRouteLine = memo(({
  activeCarProgressRef,
  driving = false,
  fromLeg = 0,
  pathRevealDuration = 0.75,
  toLeg = 0,
  routeModel,
  movementRouteModel = null,
}) => {
  const moveAnimRef = useRef({ key: null, elapsed: 0 });
  const baseRoad = useTouringRoad(routeModel, 'main');
  const activeModel = movementRouteModel || routeModel;
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
      animation.elapsed += delta;
    }

    const startProgress = movementRouteModel ? 0 : (activeModel.stopProgress[fromLeg] ?? 0);
    const endProgress = movementRouteModel ? 1 : (activeModel.stopProgress[toLeg] ?? 1);
    const revealDuration = Math.max(pathRevealDuration, 0.4);
    const revealLinear = THREE.MathUtils.clamp(animation.elapsed / revealDuration, 0, 1);
    const revealEased = easeInOutCubic(revealLinear);

    const headProgress = THREE.MathUtils.lerp(startProgress, endProgress, revealEased);
    const liveCarProgress = activeCarProgressRef?.current ?? startProgress;
    const tailProgress = THREE.MathUtils.clamp(
      Math.max(startProgress, liveCarProgress),
      startProgress,
      headProgress
    );

    setRoadWindow(activeRoad, tailProgress, headProgress);
  });

  return (
    <group>
      <TouringRoadMesh road={baseRoad} />
      <TouringRoadMesh road={activeRoad} visible={moveKey !== null} />
    </group>
  );
});

export default DottedRouteLine;
