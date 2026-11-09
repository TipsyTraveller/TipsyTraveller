import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MAP_RELIEF_DEPTH, MAP_Z } from '../constants/mapCoordinates';
import { TOURING_CREAM, TOURING_GOLD, TOURING_NAVY, TOURING_TEAL } from '../constants/touringPalette';

const ROUTE_Z = MAP_Z + MAP_RELIEF_DEPTH + 0.012;
const DASH_LENGTH = 0.10;
const DASH_GAP = 0.22;
const MAX_SAMPLE_LENGTH = 0.045;
const HIGHLIGHT_TEAL = '#66CFC2';
const ROAD_STYLES = {
  main: { edge: 0.034, road: 0.028, dash: 0.007, fill: TOURING_TEAL, lift: 0, opacity: 0.84 },
  detour: { edge: 0.031, road: 0.025, dash: 0.007, fill: TOURING_GOLD, lift: 0.001, opacity: 0.84 },
  highlight: { edge: 0.024, road: 0.020, dash: 0.007, fill: HIGHLIGHT_TEAL, lift: 0.002 },
};

// Each band owns its edge vertices so adjacent colors stay sharp in one mesh.
// Indices are in travel order, including the dash bands, for the moving draw window.
const buildRoad = (routeModel, variant, animated) => {
  const { edge, road, dash, fill, lift, opacity = 1 } = ROAD_STYLES[variant];
  const length = routeModel.length;
  const samples = [0];
  const dashedSegments = [];
  let dashed = true;
  for (let start = 0; start < length;) {
    const end = Math.min(length, start + (dashed ? DASH_LENGTH : DASH_GAP));
    const steps = Math.ceil((end - start) / MAX_SAMPLE_LENGTH);
    for (let step = 1; step <= steps; step += 1) {
      samples.push(THREE.MathUtils.lerp(start, end, step / steps) / length);
      dashedSegments.push(dashed);
    }
    start = end;
    dashed = !dashed;
  }

  const widths = [-edge, -road, -road, -dash, -dash, dash, -dash, dash, dash, road, road, edge];
  const edgeColor = variant === 'highlight' ? fill : TOURING_NAVY;
  const dashColor = variant === 'highlight' ? fill : TOURING_CREAM;
  const bandColors = [edgeColor, fill, dashColor, fill, fill, edgeColor]
    .map((color) => new THREE.Color(color));
  const stride = widths.length;
  const positions = new Float32Array(samples.length * stride * 3);
  const colors = new Float32Array(positions.length);
  const indices = [];
  const offsets = new Uint32Array(samples.length);
  const point = new THREE.Vector3();
  const tangentWindow = length > 0 ? Math.min(0.006, 0.11 / length) : 0.006;

  samples.forEach((progress, row) => {
    routeModel.curve.getPointAt(progress, point);
    const angle = routeModel.getTangentAngle(progress, tangentWindow);
    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);
    const firstVertex = row * stride;

    widths.forEach((width, column) => {
      const offset = (firstVertex + column) * 3;
      positions[offset] = point.x + normalX * width;
      positions[offset + 1] = point.y + normalY * width;
      positions[offset + 2] = ROUTE_Z + lift;
      bandColors[column >> 1].toArray(colors, offset);
    });

    offsets[row] = indices.length;
    if (row === samples.length - 1) return;
    for (let column = 0; column < stride; column += 2) {
      if (column === (dashedSegments[row] ? 6 : 4)) continue;
      const a = firstVertex + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, c, b, d);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.setDrawRange(0, animated ? 0 : indices.length);
  geometry.computeBoundingSphere();
  return { geometry, offsets, samples, opacity };
};

// Find the segment containing progress. The exclusive end rounds up to the next sample.
const findSample = (samples, progress) => {
  let low = 0;
  let high = samples.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (samples[middle] < progress) low = middle + 1;
    else high = middle;
  }
  return low;
};

export const setRoadWindow = ({ geometry, offsets, samples }, tail, head) => {
  if (head <= tail) {
    geometry.setDrawRange(0, 0);
    return;
  }
  const start = findSample(samples, tail);
  const first = offsets[samples[start] === tail ? start : Math.max(0, start - 1)];
  geometry.setDrawRange(first, offsets[findSample(samples, head)] - first);
};

export const useTouringRoad = (routeModel, variant, animated = false) => {
  const road = useMemo(
    () => buildRoad(routeModel, variant, animated),
    [animated, routeModel, variant]
  );
  useEffect(() => () => road.geometry.dispose(), [road]);
  return road;
};

export const TouringRoadMesh = ({ road, visible = true, opacity = road.opacity, renderOrder = 3 }) => (
  <mesh renderOrder={renderOrder} visible={visible}>
    <primitive object={road.geometry} attach="geometry" />
    <meshBasicMaterial
      depthWrite={opacity === 1}
      opacity={opacity}
      side={THREE.DoubleSide}
      toneMapped={false}
      transparent={opacity < 1}
      vertexColors
    />
  </mesh>
);
