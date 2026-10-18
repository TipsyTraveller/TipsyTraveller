import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import { DRIVE_CURVE, DRIVE_LENGTH } from '../constants/route';

const DOT_SPACING = 0.19;
const DOT_RADIUS = 0.022;
const DOT_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.012;

const InstancedDotLayer = ({ color, dots, opacity = 1, radius, zOffset }) => {
  const meshRef = useRef();

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const transform = new THREE.Matrix4();

    dots.forEach((dot, index) => {
      transform.makeTranslation(dot.position[0], dot.position[1], dot.position[2] + zOffset);
      meshRef.current.setMatrixAt(index, transform);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dots, zOffset]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dots.length]}>
      <circleGeometry args={[radius, 12]} />
      <meshBasicMaterial
        color={color}
        opacity={opacity}
        side={THREE.DoubleSide}
        transparent={opacity < 1}
      />
    </instancedMesh>
  );
};

const InstancedAccents = ({ dots }) => {
  const meshRef = useRef();

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const transform = new THREE.Matrix4();
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 4));
    const scale = new THREE.Vector3(1, 1, 1);

    dots.forEach((dot, index) => {
      transform.compose(
        new THREE.Vector3(dot.position[0], dot.position[1], dot.position[2] + 0.008),
        rotation,
        scale
      );
      meshRef.current.setMatrixAt(index, transform);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dots]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dots.length]}>
      <planeGeometry args={[DOT_RADIUS * 1.12, DOT_RADIUS * 1.12]} />
      <meshBasicMaterial color="#FFD700" opacity={0.88} side={THREE.DoubleSide} transparent={true} />
    </instancedMesh>
  );
};

const DottedRouteLine = () => {
  const routeDots = useMemo(() => (
    (() => {
      const dotCount = Math.max(Math.ceil(DRIVE_LENGTH / DOT_SPACING), 1);

      return Array.from({ length: dotCount + 1 }, (_value, dotIndex) => {
        const progress = dotIndex / dotCount;
        const point = DRIVE_CURVE.getPointAt(progress);

        return {
          key: `route-${dotIndex}`,
          isAccent: dotIndex % 6 === 0,
          position: [point.x, point.y, DOT_Z],
        };
      });
    })()
  ), []);
  const accentDots = useMemo(() => routeDots.filter((dot) => dot.isAccent), [routeDots]);

  return (
    <>
      <InstancedDotLayer color="#111111" dots={routeDots} opacity={0.32} radius={DOT_RADIUS * 1.75} zOffset={-0.002} />
      <InstancedDotLayer color="#FFF1CD" dots={routeDots} radius={DOT_RADIUS * 1.38} zOffset={0.001} />
      <InstancedDotLayer color="#D71920" dots={routeDots} radius={DOT_RADIUS} zOffset={0.004} />
      <InstancedAccents dots={accentDots} />
    </>
  );
};

export default DottedRouteLine;
