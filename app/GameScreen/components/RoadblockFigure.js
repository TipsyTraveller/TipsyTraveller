import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { ROADBLOCK_PALETTE } from '../constants/roadblocks';

// Spring easing with a lively overshoot for a tactile miniature "drop" effect
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/**
 * Procedurally generates 45-degree diagonal cream stripe facets
 * that cleanly fit the rectangular plank face with zero texture requirements.
 */
const createStripedPlankCreamGeometry = (width, height, depth, stripeWidth = 0.075) => {
  const positions = [];
  const normals = [];
  const indices = [];
  let vertexOffset = 0;

  const faces = [
    { y: depth / 2 + 0.0006, normalY: 1, isFront: true },
    { y: -depth / 2 - 0.0006, normalY: -1, isFront: false },
  ];

  let stripeIndex = 0;
  for (let s0 = -height; s0 < width; s0 += stripeWidth) {
    const s1 = s0 + stripeWidth;
    stripeIndex += 1;
    // Keep only alternating cream stripes
    if (stripeIndex % 2 === 0) continue;

    const pts = [];
    if (Math.max(0, s0) < Math.min(width, s1)) {
      pts.push([Math.max(0, s0), 0]);
      pts.push([Math.min(width, s1), 0]);
    }
    if (Math.max(0, width - s1) < Math.min(height, width - s0)) {
      pts.push([width, Math.max(0, width - s1)]);
      pts.push([width, Math.min(height, width - s0)]);
    }
    if (Math.max(0, s0 + height) < Math.min(width, s1 + height)) {
      pts.push([Math.min(width, s1 + height), height]);
      pts.push([Math.max(0, s0 + height), height]);
    }
    if (Math.max(0, -s1) < Math.min(height, -s0)) {
      pts.push([0, Math.min(height, -s0)]);
      pts.push([0, Math.max(0, -s1)]);
    }

    const unique = [];
    for (const p of pts) {
      if (!unique.some((u) => Math.hypot(u[0] - p[0], u[1] - p[1]) < 1e-4)) {
        unique.push(p);
      }
    }

    if (unique.length < 3) continue;

    const centeredPts = unique.map(([u, v]) => [u - width / 2, v - height / 2]);

    for (const face of faces) {
      const baseIdx = vertexOffset;
      for (const [x, z] of centeredPts) {
        positions.push(x, face.y, z);
        normals.push(0, face.normalY, 0);
        vertexOffset += 1;
      }

      for (let j = 1; j < centeredPts.length - 1; j += 1) {
        if (face.isFront) {
          indices.push(baseIdx, baseIdx + j, baseIdx + j + 1);
        } else {
          indices.push(baseIdx, baseIdx + j + 1, baseIdx + j);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
};

/**
 * Low-poly sawhorse construction barrier leg assembly (A-frame).
 */
const BarricadeAFrame = ({ xOffset, materials }) => (
  <group position={[xOffset, 0, 0]}>
    {/* Front angled leg */}
    <mesh
      position={[0, 0.05, 0.175]}
      rotation={[0.28, 0, 0]}
      material={materials.navy}
    >
      <boxGeometry args={[0.034, 0.034, 0.36]} />
    </mesh>

    {/* Back angled leg */}
    <mesh
      position={[0, -0.05, 0.175]}
      rotation={[-0.28, 0, 0]}
      material={materials.navy}
    >
      <boxGeometry args={[0.034, 0.034, 0.36]} />
    </mesh>

    {/* Top hinge/apex block */}
    <mesh position={[0, 0, 0.35]} material={materials.navy}>
      <boxGeometry args={[0.046, 0.06, 0.04]} />
    </mesh>

    {/* Lower spreader brace */}
    <mesh position={[0, 0, 0.06]} material={materials.navy}>
      <boxGeometry args={[0.03, 0.16, 0.024]} />
    </mesh>

    {/* Foot pads */}
    <mesh position={[0, 0.098, 0.006]} material={materials.slate}>
      <boxGeometry args={[0.05, 0.05, 0.012]} />
    </mesh>
    <mesh position={[0, -0.098, 0.006]} material={materials.slate}>
      <boxGeometry args={[0.05, 0.05, 0.012]} />
    </mesh>

    {/* Pivot bolt hardware */}
    <mesh position={[0, 0, 0.35]} rotation={[0, 0, Math.PI / 2]} material={materials.bolt}>
      <cylinderGeometry args={[0.01, 0.01, 0.05, 6]} />
    </mesh>
  </group>
);

/**
 * Chunky low-poly traffic pylon with reflective stripe.
 */
const TrafficCone = ({ position, rotationZ = 0, materials }) => (
  <group position={position} rotation={[0, 0, rotationZ]}>
    {/* Square rubber base plate */}
    <mesh position={[0, 0, 0.007]} material={materials.slate}>
      <boxGeometry args={[0.11, 0.11, 0.014]} />
    </mesh>

    {/* 7-sided faceted orange cone body */}
    <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} material={materials.coneOrange}>
      <cylinderGeometry args={[0.014, 0.048, 0.17, 7]} />
    </mesh>

    {/* Reflective cream midsection collar */}
    <mesh position={[0, 0, 0.082]} rotation={[Math.PI / 2, 0, 0]} material={materials.cream}>
      <cylinderGeometry args={[0.024, 0.036, 0.048, 7]} />
    </mesh>

    {/* Dark rubber tip */}
    <mesh position={[0, 0, 0.165]} rotation={[Math.PI / 2, 0, 0]} material={materials.slate}>
      <cylinderGeometry args={[0.01, 0.016, 0.022, 7]} />
    </mesh>
  </group>
);

/**
 * Detour caution sign with bold arrow indicating which way teams must navigate around.
 */
const DetourSign = ({ detourDirection, materials }) => {
  const isRight = detourDirection === 'right';
  const isLeft = detourDirection === 'left';
  const isBoth = detourDirection === 'both' || (!isRight && !isLeft);

  return (
    <group position={[0, 0.065, 0.38]}>
      {/* Supporting bracket rising from top plank */}
      <mesh position={[0, -0.01, -0.06]} material={materials.navy}>
        <boxGeometry args={[0.026, 0.018, 0.14]} />
      </mesh>

      {/* Diamond warning plate (rotated square) */}
      <group rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, 0, 0]} material={materials.amberBright}>
          <boxGeometry args={[0.155, 0.014, 0.155]} />
        </mesh>
        {/* Dark border accent rim */}
        <mesh position={[0, -0.001, 0]} material={materials.navy}>
          <boxGeometry args={[0.168, 0.012, 0.168]} />
        </mesh>
      </group>

      {/* Detour arrow elements on front face */}
      <group position={[0, 0.01, 0]}>
        {/* Central arrow shaft */}
        <mesh position={[0, 0, 0]} material={materials.navy}>
          <boxGeometry args={[isBoth ? 0.09 : 0.065, 0.008, 0.02]} />
        </mesh>

        {/* Right arrowhead */}
        {(isRight || isBoth) && (
          <mesh
            position={[isBoth ? 0.052 : 0.038, 0, 0]}
            rotation={[0, 0, -Math.PI / 2]}
            material={materials.navy}
          >
            <cylinderGeometry args={[0, 0.022, 0.035, 3]} />
          </mesh>
        )}

        {/* Left arrowhead */}
        {(isLeft || isBoth) && (
          <mesh
            position={[isBoth ? -0.052 : -0.038, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={materials.navy}
          >
            <cylinderGeometry args={[0, 0.022, 0.035, 3]} />
          </mesh>
        )}
      </group>

      {/* Compact low-poly "DETOUR" badge plate */}
      <group position={[0, 0.008, -0.095]}>
        <mesh material={materials.navy}>
          <boxGeometry args={[0.18, 0.012, 0.038]} />
        </mesh>
        {/* Inner cream placard bar */}
        <mesh position={[0, 0.002, 0]} material={materials.cream}>
          <boxGeometry args={[0.156, 0.01, 0.024]} />
        </mesh>
      </group>
    </group>
  );
};

/**
 * RoadblockFigure:
 * A stylized low-poly roadblock barrier designed to spawn on the TipsyTraveller 3D board
 * to clearly communicate a blocked route that teams must navigate around.
 */
const RoadblockFigure = memo(({
  animateSpawn = true,
  blinking = true,
  detourDirection = 'right',
  onClick,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  showBallast = true,
  showCones = true,
  showSign = true,
}) => {
  const rootRef = useRef();
  const leftBeaconRef = useRef();
  const rightBeaconRef = useRef();
  const leftHaloRef = useRef();
  const rightHaloRef = useRef();
  const shockwaveRef = useRef();
  const spawnTimerRef = useRef(0);

  // Reusable, theme-aligned low-poly materials
  const materials = useMemo(() => ({
    cream: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.cream,
      roughness: 0.45,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
    warningRed: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.warningRed,
      roughness: 0.42,
      metalness: 0.12,
    }),
    navy: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.navy,
      roughness: 0.55,
      metalness: 0.18,
    }),
    slate: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.slate,
      roughness: 0.75,
      metalness: 0.05,
    }),
    sandbag: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.sandbag,
      roughness: 0.85,
      metalness: 0.02,
    }),
    coneOrange: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.coneOrange,
      roughness: 0.38,
      metalness: 0.1,
    }),
    amberBright: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.amberBright,
      roughness: 0.32,
      metalness: 0.15,
    }),
    beacon: new THREE.MeshStandardMaterial({
      color: ROADBLOCK_PALETTE.amber,
      emissive: ROADBLOCK_PALETTE.amber,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.2,
      toneMapped: false,
    }),
    beaconHalo: new THREE.MeshBasicMaterial({
      color: ROADBLOCK_PALETTE.amberBright,
      transparent: true,
      opacity: 0.35,
      toneMapped: false,
    }),
    bolt: new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.3,
      metalness: 0.65,
    }),
    shadow: new THREE.MeshBasicMaterial({
      color: ROADBLOCK_PALETTE.shadow,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
    shockwave: new THREE.MeshBasicMaterial({
      color: ROADBLOCK_PALETTE.amberBright,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  }), []);

  // Cleanup materials on unmount
  useEffect(() => () => {
    Object.values(materials).forEach((m) => m?.dispose?.());
  }, [materials]);

  // Striped plank cream stripe geometries
  const topPlankCreamGeometry = useMemo(
    () => createStripedPlankCreamGeometry(0.72, 0.08, 0.024, 0.075),
    []
  );
  const bottomPlankCreamGeometry = useMemo(
    () => createStripedPlankCreamGeometry(0.72, 0.08, 0.024, 0.075),
    []
  );

  useEffect(() => () => {
    topPlankCreamGeometry?.dispose?.();
    bottomPlankCreamGeometry?.dispose?.();
  }, [topPlankCreamGeometry, bottomPlankCreamGeometry]);

  const targetScale = typeof scale === 'number' ? [scale, scale, scale] : scale;

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Spawn pop-in spring animation
    if (animateSpawn && rootRef.current) {
      if (spawnTimerRef.current < 0.45) {
        spawnTimerRef.current += delta;
        const progress = Math.min(spawnTimerRef.current / 0.45, 1);
        const spring = easeOutBack(progress);
        rootRef.current.scale.set(
          targetScale[0] * spring,
          targetScale[1] * spring,
          targetScale[2] * spring
        );

        if (shockwaveRef.current) {
          shockwaveRef.current.visible = true;
          const waveScale = 0.4 + progress * 1.6;
          shockwaveRef.current.scale.set(waveScale, waveScale, 1);
          shockwaveRef.current.material.opacity = (1 - progress) * 0.85;
        }
      } else if (shockwaveRef.current && shockwaveRef.current.visible) {
        shockwaveRef.current.visible = false;
      }
    }

    // Emergency amber beacon double-flash strobe
    if (blinking && leftBeaconRef.current && rightBeaconRef.current) {
      const cycle = (time * 2.8) % 1;
      const isStrobe = (cycle < 0.14) || (cycle > 0.24 && cycle < 0.38);
      const intensity = isStrobe ? 2.8 : 0.2;

      leftBeaconRef.current.material.emissiveIntensity = intensity;
      rightBeaconRef.current.material.emissiveIntensity = intensity;

      if (leftHaloRef.current && rightHaloRef.current) {
        const haloScale = isStrobe ? 1.4 : 0.7;
        leftHaloRef.current.scale.setScalar(haloScale);
        rightHaloRef.current.scale.setScalar(haloScale);
        leftHaloRef.current.material.opacity = isStrobe ? 0.45 : 0.08;
        rightHaloRef.current.material.opacity = isStrobe ? 0.45 : 0.08;
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
      {/* Ground contact shadow disc */}
      <mesh position={[0, 0, 0.002]} scale={[1.25, 0.65, 1]} material={materials.shadow}>
        <circleGeometry args={[0.42, 16]} />
      </mesh>

      {/* Spawn shockwave ripple ring */}
      <mesh
        ref={shockwaveRef}
        position={[0, 0, 0.004]}
        material={materials.shockwave}
        visible={false}
      >
        <ringGeometry args={[0.18, 0.28, 24]} />
      </mesh>

      {/* Left and Right A-Frame Stanchions */}
      <BarricadeAFrame xOffset={-0.32} materials={materials} />
      <BarricadeAFrame xOffset={0.32} materials={materials} />

      {/* Ballast Sandbags on feet */}
      {showBallast && (
        <>
          <group position={[-0.32, 0, 0.026]}>
            <mesh material={materials.sandbag}>
              <boxGeometry args={[0.14, 0.11, 0.046]} />
            </mesh>
            {/* Corner tie fold */}
            <mesh position={[0.06, 0.045, 0]} material={materials.sandbag}>
              <boxGeometry args={[0.024, 0.024, 0.034]} />
            </mesh>
          </group>

          <group position={[0.32, 0, 0.026]}>
            <mesh material={materials.sandbag}>
              <boxGeometry args={[0.14, 0.11, 0.046]} />
            </mesh>
            <mesh position={[-0.06, 0.045, 0]} material={materials.sandbag}>
              <boxGeometry args={[0.024, 0.024, 0.034]} />
            </mesh>
          </group>
        </>
      )}

      {/* Top Barricade Plank */}
      <group position={[0, 0.075, 0.26]}>
        {/* Solid Red Core */}
        <mesh material={materials.warningRed}>
          <boxGeometry args={[0.72, 0.024, 0.08]} />
        </mesh>
        {/* 45-degree Cream Hazard Stripes */}
        <mesh geometry={topPlankCreamGeometry} material={materials.cream} />

        {/* Mounting bolts on legs */}
        <mesh position={[-0.32, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.bolt}>
          <cylinderGeometry args={[0.009, 0.009, 0.006, 6]} />
        </mesh>
        <mesh position={[0.32, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.bolt}>
          <cylinderGeometry args={[0.009, 0.009, 0.006, 6]} />
        </mesh>
      </group>

      {/* Bottom Barricade Plank */}
      <group position={[0, 0.105, 0.13]}>
        <mesh material={materials.warningRed}>
          <boxGeometry args={[0.72, 0.024, 0.08]} />
        </mesh>
        <mesh geometry={bottomPlankCreamGeometry} material={materials.cream} />

        <mesh position={[-0.32, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.bolt}>
          <cylinderGeometry args={[0.009, 0.009, 0.006, 6]} />
        </mesh>
        <mesh position={[0.32, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.bolt}>
          <cylinderGeometry args={[0.009, 0.009, 0.006, 6]} />
        </mesh>
      </group>

      {/* Detour Direction Sign */}
      {showSign && (
        <DetourSign detourDirection={detourDirection} materials={materials} />
      )}

      {/* Left Hazard Strobe Beacon */}
      <group position={[-0.32, 0, 0.38]}>
        {/* Mounting collar */}
        <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={materials.navy}>
          <cylinderGeometry args={[0.026, 0.026, 0.02, 8]} />
        </mesh>
        {/* Faceted Amber Strobe Dome */}
        <mesh
          ref={leftBeaconRef}
          position={[0, 0, 0.038]}
          rotation={[Math.PI / 2, 0, 0]}
          material={materials.beacon}
        >
          <cylinderGeometry args={[0.02, 0.028, 0.042, 8]} />
        </mesh>
        {/* Corona glow halo */}
        <mesh ref={leftHaloRef} position={[0, 0, 0.038]} material={materials.beaconHalo}>
          <sphereGeometry args={[0.042, 8, 6]} />
        </mesh>
      </group>

      {/* Right Hazard Strobe Beacon */}
      <group position={[0.32, 0, 0.38]}>
        <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={materials.navy}>
          <cylinderGeometry args={[0.026, 0.026, 0.02, 8]} />
        </mesh>
        <mesh
          ref={rightBeaconRef}
          position={[0, 0, 0.038]}
          rotation={[Math.PI / 2, 0, 0]}
          material={materials.beacon}
        >
          <cylinderGeometry args={[0.02, 0.028, 0.042, 8]} />
        </mesh>
        <mesh ref={rightHaloRef} position={[0, 0, 0.038]} material={materials.beaconHalo}>
          <sphereGeometry args={[0.042, 8, 6]} />
        </mesh>
      </group>

      {/* Flanking Traffic Cones */}
      {showCones && (
        <>
          <TrafficCone
            position={[-0.52, -0.05, 0]}
            rotationZ={0.14}
            materials={materials}
          />
          <TrafficCone
            position={[0.52, 0.05, 0]}
            rotationZ={-0.18}
            materials={materials}
          />
        </>
      )}
    </group>
  );
});

RoadblockFigure.displayName = 'RoadblockFigure';

export default RoadblockFigure;
