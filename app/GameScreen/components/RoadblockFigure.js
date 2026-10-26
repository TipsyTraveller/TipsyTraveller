import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { ROADBLOCK_PALETTE } from '../constants/roadblocks';

const easeOutBack = (value) => {
  const overshoot = 1.35;
  return 1 + (overshoot + 1) * ((value - 1) ** 3) + overshoot * ((value - 1) ** 2);
};

const Cone = ({ materials, position, rotationZ }) => (
  <group position={position} rotation={[0, 0, rotationZ]}>
    <mesh material={materials.slate}><boxGeometry args={[0.1, 0.1, 0.014]} /></mesh>
    <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]} material={materials.orange}>
      <cylinderGeometry args={[0.012, 0.043, 0.14, 7]} />
    </mesh>
    <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} material={materials.cream}>
      <cylinderGeometry args={[0.023, 0.032, 0.034, 7]} />
    </mesh>
  </group>
);

const DirectionSign = ({ direction, materials }) => {
  const arrowX = direction === 'left' ? -1 : 1;
  return (
    <group position={[0, 0.025, 0.39]}>
      <mesh material={materials.navy}><boxGeometry args={[0.2, 0.025, 0.16]} /></mesh>
      <mesh position={[0, -0.014, 0]} material={materials.amber}>
        <boxGeometry args={[0.18, 0.008, 0.14]} />
      </mesh>
      <mesh position={[0, 0.014, 0]} material={materials.amber}>
        <boxGeometry args={[0.18, 0.008, 0.14]} />
      </mesh>
      {[-1, 1].map((face) => (
        <group key={face} position={[0, face * 0.021, 0]}>
          <mesh position={[0, 0, 0.044]} material={materials.red}>
            <boxGeometry args={[0.11, 0.006, 0.018]} />
          </mesh>
          <mesh position={[-arrowX * 0.015, 0, 0]} material={materials.navy}>
            <boxGeometry args={[0.085, 0.006, 0.022]} />
          </mesh>
          <mesh
            position={[arrowX * 0.045, 0, 0]}
            rotation={[0, 0, -arrowX * Math.PI / 2]}
            material={materials.navy}
          >
            <cylinderGeometry args={[0, 0.026, 0.04, 3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const RoadblockFigure = memo(({
  animateSpawn = true,
  blinking = true,
  detourDirection = 'right',
  onClick,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  showCones = true,
  showSign = true,
}) => {
  const rootRef = useRef();
  const beaconRef = useRef();
  const haloRef = useRef();
  const spawnTime = useRef(0);
  const materials = useMemo(() => ({
    cream: new THREE.MeshStandardMaterial({ color: ROADBLOCK_PALETTE.cream, roughness: 0.55 }),
    red: new THREE.MeshStandardMaterial({ color: ROADBLOCK_PALETTE.warningRed, roughness: 0.45 }),
    navy: new THREE.MeshStandardMaterial({ color: ROADBLOCK_PALETTE.navy, roughness: 0.65 }),
    slate: new THREE.MeshStandardMaterial({ color: ROADBLOCK_PALETTE.slate, roughness: 0.8 }),
    orange: new THREE.MeshStandardMaterial({ color: ROADBLOCK_PALETTE.coneOrange, roughness: 0.5 }),
    amber: new THREE.MeshStandardMaterial({ color: ROADBLOCK_PALETTE.amberBright, roughness: 0.4 }),
    beacon: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.amber,
      emissive: ROADBLOCK_PALETTE.amber,
      emissiveIntensity: 0.45,
      toneMapped: false,
    }),
    halo: new THREE.MeshBasicMaterial({
      color: ROADBLOCK_PALETTE.amberBright,
      opacity: 0.12,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  }), []);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);

  const targetScale = typeof scale === 'number' ? [scale, scale, scale] : scale;
  useFrame((state, delta) => {
    if (animateSpawn && rootRef.current && spawnTime.current < 0.32) {
      spawnTime.current = Math.min(0.32, spawnTime.current + delta);
      const eased = easeOutBack(spawnTime.current / 0.32);
      rootRef.current.scale.set(
        targetScale[0] * eased,
        targetScale[1] * eased,
        targetScale[2] * eased
      );
    }
    if (blinking && beaconRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.getElapsedTime() * 3.2);
      beaconRef.current.material.emissiveIntensity = 0.35 + pulse * 0.8;
      if (haloRef.current) {
        haloRef.current.material.opacity = 0.06 + pulse * 0.14;
        haloRef.current.scale.setScalar(0.85 + pulse * 0.25);
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={rotation}
      scale={animateSpawn ? [0.001, 0.001, 0.001] : targetScale}
      onClick={onClick}
    >
      {/* Closure strip sits directly on the unavailable road. */}
      <mesh position={[0, 0, 0.006]} material={materials.red}>
        <boxGeometry args={[0.82, 0.17, 0.012]} />
      </mesh>

      {/* Stable feet and two compact uprights. */}
      {[-0.27, 0.27].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0, 0.022]} material={materials.slate}>
            <boxGeometry args={[0.16, 0.2, 0.044]} />
          </mesh>
          <mesh position={[0, 0, 0.17]} material={materials.navy}>
            <boxGeometry args={[0.045, 0.045, 0.3]} />
          </mesh>
        </group>
      ))}

      {/* One readable striped barrier. */}
      <group position={[0, 0, 0.26]}>
        <mesh material={materials.red}><boxGeometry args={[0.72, 0.055, 0.13]} /></mesh>
        {[-0.27, -0.09, 0.09, 0.27].map((x) => (
          <mesh key={x} position={[x, -0.031, 0]} rotation={[0, 0, -0.42]} material={materials.cream}>
            <boxGeometry args={[0.085, 0.009, 0.145]} />
          </mesh>
        ))}
      </group>

      {showSign && <DirectionSign direction={detourDirection} materials={materials} />}

      <group position={[0, 0, 0.51]}>
        <mesh position={[0, 0, -0.025]} rotation={[Math.PI / 2, 0, 0]} material={materials.navy}>
          <cylinderGeometry args={[0.026, 0.026, 0.035, 8]} />
        </mesh>
        <mesh ref={beaconRef} rotation={[Math.PI / 2, 0, 0]} material={materials.beacon}>
          <cylinderGeometry args={[0.018, 0.028, 0.045, 8]} />
        </mesh>
        <mesh ref={haloRef} material={materials.halo}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
      </group>

      {showCones && (
        <>
          <Cone position={[-0.49, -0.02, 0.014]} rotationZ={0.12} materials={materials} />
          <Cone position={[0.49, 0.02, 0.014]} rotationZ={-0.12} materials={materials} />
        </>
      )}
    </group>
  );
});

RoadblockFigure.displayName = 'RoadblockFigure';

export default RoadblockFigure;
