// Regenerates assets/models/world-map-vector.glb from assets/map.svg.
//
//   npm run build:map                       (writes the shipped GLB)
//   MAP_OUTPUT=/tmp/map.glb npm run build:map   (writes elsewhere, e.g. to compare sizes)
//
// After building, shrink the file with mesh quantization (no runtime decoder needed, unlike
// Draco/Meshopt which need WASM or a CDN download):
//
//   npx @gltf-transform/cli@4.5.1 quantize <built>.glb assets/models/world-map-vector.glb --quantize-normal 8
//
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SOURCE_PATH = new URL('../assets/map.svg', import.meta.url);
// MAP_OUTPUT lets a build target another file (e.g. a scratch dir) without touching the shipped GLB.
const OUTPUT_PATH = process.env.MAP_OUTPUT
  ? pathToFileURL(path.resolve(process.env.MAP_OUTPUT))
  : new URL('../assets/models/world-map-vector.glb', import.meta.url);
const TWO_D_OUTPUT_PATH = process.env.MAP_2D_OUTPUT
  ? pathToFileURL(path.resolve(process.env.MAP_2D_OUTPUT))
  : null;
const SOURCE_WIDTH = 1096;
const SOURCE_HEIGHT = 780;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const MAP_CENTER_Y = 0.5;
const RELIEF_DEPTH = 0.055;
const BORDER_MARGIN = 28;
const CURVE_DIVISIONS = 5;
const BORDER_BOUNDS = {
  minX: 440 - BORDER_MARGIN,
  maxX: 730 + BORDER_MARGIN,
  minY: 190 - BORDER_MARGIN,
  maxY: 408 + BORDER_MARGIN,
};
const TWO_D_BOUNDS = { minX: 440, maxX: 730, minY: 190, maxY: 408 };

globalThis.DOMParser = DOMParser;

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      const base64 = Buffer.from(result).toString('base64');
      this.result = `data:${blob.type};base64,${base64}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
}

globalThis.FileReader = NodeFileReader;

const sourceToMap = new THREE.Matrix4().set(
  MAP_WIDTH / SOURCE_WIDTH, 0, 0, -MAP_WIDTH / 2,
  0, -MAP_HEIGHT / SOURCE_HEIGHT, 0, MAP_CENTER_Y + MAP_HEIGHT / 2,
  0, 0, 1, 0,
  0, 0, 0, 1
);

const mergeOrThrow = (geometries, label) => {
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());

  if (!merged) {
    throw new Error(`Unable to merge ${label} geometry.`);
  }

  return merged;
};

const driftWeight = (subPathEntry, knotIndex) => {
  const curveCount = subPathEntry.curves.length;
  const distanceFromOrigin = Math.min(knotIndex, curveCount - knotIndex);
  return 1 / (1 + distanceFromOrigin * 1.5);
};

const knotKey = (subPathId, knotIndex) => `${subPathId}:${knotIndex}`;

const pointKey = (point) => `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}`;

const segmentEdgeKey = (start, end) => {
  const startKey = pointKey(start);
  const endKey = pointKey(end);
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
};

const svg = await fs.readFile(SOURCE_PATH, 'utf8');
const { paths } = new SVGLoader().parse(svg);
const countryPaths = paths.filter((path) => (
  /^st[2-9]$/.test(path.userData.node.getAttribute('class') || '')
));

if (countryPaths.length === 0) {
  throw new Error('The SVG does not contain st2..st9 country paths.');
}

// Country paths in map.svg use 1-decimal-place relative commands that accumulate
// slight drift along long perimeters. Weld reversed twin curves between adjacent
// countries back to their canonical shared positions before building meshes.
const subPaths = [];
countryPaths.forEach((path, countryIndex) => {
  path.subPaths.forEach((subPath) => {
    const curves = subPath.curves.filter((curve) => curve.getLength() > 1e-4);
    subPath.curves = curves;
    if (curves.length === 0) return;

    const knots = curves.map((curve) => (curve.v0 || curve.v1).clone());
    subPaths.push({
      countryIndex,
      curves,
      id: subPaths.length,
      knots,
      subPath,
    });
  });
});

const curveEntries = [];
for (const subPathEntry of subPaths) {
  const curveCount = subPathEntry.curves.length;
  for (let knotIndex = 0; knotIndex < curveCount; knotIndex += 1) {
    const curve = subPathEntry.curves[knotIndex];
    const start = subPathEntry.knots[knotIndex];
    const end = subPathEntry.knots[(knotIndex + 1) % curveCount];
    curveEntries.push({
      curve,
      delta: end.clone().sub(start),
      end,
      knotIndex,
      midpoint: curve.getPoint(0.5),
      start,
      subPathEntry,
    });
  }
}

const bestMatchForCurve = new Array(curveEntries.length).fill(-1);
for (let index = 0; index < curveEntries.length; index += 1) {
  const current = curveEntries[index];
  let bestCandidateIndex = -1;
  let bestScore = Infinity;

  for (let candidateIndex = 0; candidateIndex < curveEntries.length; candidateIndex += 1) {
    const candidate = curveEntries[candidateIndex];
    if (current.subPathEntry.countryIndex === candidate.subPathEntry.countryIndex) continue;

    const maxPositionDistance = (
      current.subPathEntry.curves.length > 200 || candidate.subPathEntry.curves.length > 200
        ? 2.0
        : 0.85
    );
    const positionDistance = Math.max(
      current.start.distanceTo(candidate.end),
      current.end.distanceTo(candidate.start)
    );
    if (positionDistance > maxPositionDistance) continue;

    const reversedCandidateDelta = candidate.delta.clone().negate();
    const shapeDistance = current.delta.distanceTo(reversedCandidateDelta);
    const currentMidOffset = current.midpoint
      .clone()
      .sub(current.start.clone().add(current.end).multiplyScalar(0.5));
    const candidateMidOffset = candidate.midpoint
      .clone()
      .sub(candidate.start.clone().add(candidate.end).multiplyScalar(0.5));
    const midpointShapeDistance = currentMidOffset.distanceTo(candidateMidOffset);

    if (shapeDistance > 0.35 || midpointShapeDistance > 0.25) continue;

    const score = positionDistance * 0.25 + shapeDistance + midpointShapeDistance;
    if (score < bestScore) {
      bestScore = score;
      bestCandidateIndex = candidateIndex;
    }
  }

  bestMatchForCurve[index] = bestCandidateIndex;
}

const twinMatches = [];
for (let index = 0; index < curveEntries.length; index += 1) {
  const partnerIndex = bestMatchForCurve[index];
  if (partnerIndex > index && bestMatchForCurve[partnerIndex] === index) {
    twinMatches.push({
      first: curveEntries[index],
      second: curveEntries[partnerIndex],
    });
  }
}

const knotParent = new Map();
const findRoot = (key) => {
  let root = key;
  while (knotParent.has(root) && knotParent.get(root) !== root) {
    root = knotParent.get(root);
  }
  let current = key;
  while (current !== root) {
    const next = knotParent.get(current);
    knotParent.set(current, root);
    current = next;
  }
  return root;
};

const unionKnots = (firstKey, secondKey) => {
  const firstRoot = findRoot(firstKey);
  const secondRoot = findRoot(secondKey);
  if (firstRoot !== secondRoot) {
    knotParent.set(secondRoot, firstRoot);
  }
};

for (const { first, second } of twinMatches) {
  const firstCount = first.subPathEntry.curves.length;
  const secondCount = second.subPathEntry.curves.length;
  const firstStartKey = knotKey(first.subPathEntry.id, first.knotIndex);
  const firstEndKey = knotKey(first.subPathEntry.id, (first.knotIndex + 1) % firstCount);
  const secondStartKey = knotKey(second.subPathEntry.id, second.knotIndex);
  const secondEndKey = knotKey(second.subPathEntry.id, (second.knotIndex + 1) % secondCount);

  knotParent.set(firstStartKey, findRoot(firstStartKey));
  knotParent.set(firstEndKey, findRoot(firstEndKey));
  knotParent.set(secondStartKey, findRoot(secondStartKey));
  knotParent.set(secondEndKey, findRoot(secondEndKey));

  unionKnots(firstStartKey, secondEndKey);
  unionKnots(firstEndKey, secondStartKey);
}

const knotGroups = new Map();
for (const key of knotParent.keys()) {
  const root = findRoot(key);
  const group = knotGroups.get(root) || [];
  group.push(key);
  knotGroups.set(root, group);
}

const canonicalPositions = new Map();
for (const keys of knotGroups.values()) {
  let sumX = 0;
  let sumY = 0;
  let sumWeight = 0;

  for (const key of keys) {
    const [subPathId, knotIndex] = key.split(':').map(Number);
    const subPathEntry = subPaths[subPathId];
    const weight = driftWeight(subPathEntry, knotIndex) ** 2;
    const point = subPathEntry.knots[knotIndex];
    sumX += point.x * weight;
    sumY += point.y * weight;
    sumWeight += weight;
  }

  const target = new THREE.Vector2(sumX / sumWeight, sumY / sumWeight);
  for (const key of keys) {
    canonicalPositions.set(key, target);
  }
}

for (const subPathEntry of subPaths) {
  const knotCount = subPathEntry.knots.length;
  const pinnedOffsets = new Array(knotCount).fill(null);
  const pinnedIndices = [];

  for (let knotIndex = 0; knotIndex < knotCount; knotIndex += 1) {
    const key = knotKey(subPathEntry.id, knotIndex);
    if (canonicalPositions.has(key)) {
      pinnedOffsets[knotIndex] = canonicalPositions.get(key).clone().sub(subPathEntry.knots[knotIndex]);
      pinnedIndices.push(knotIndex);
    }
  }

  const shifts = Array.from({ length: knotCount }, () => new THREE.Vector2(0, 0));
  if (pinnedIndices.length === 1) {
    for (let knotIndex = 0; knotIndex < knotCount; knotIndex += 1) {
      shifts[knotIndex].copy(pinnedOffsets[pinnedIndices[0]]);
    }
  } else if (pinnedIndices.length > 1) {
    for (let pinCursor = 0; pinCursor < pinnedIndices.length; pinCursor += 1) {
      const startIndex = pinnedIndices[pinCursor];
      const endIndex = pinnedIndices[(pinCursor + 1) % pinnedIndices.length];
      const startOffset = pinnedOffsets[startIndex];
      const endOffset = pinnedOffsets[endIndex];
      const span = (endIndex - startIndex + knotCount) % knotCount;

      for (let step = 0; step <= span; step += 1) {
        const knotIndex = (startIndex + step) % knotCount;
        const progress = span === 0 ? 0 : step / span;
        shifts[knotIndex].lerpVectors(startOffset, endOffset, progress);
      }
    }
  }

  for (let knotIndex = 0; knotIndex < knotCount; knotIndex += 1) {
    const startShift = shifts[knotIndex];
    const endShift = shifts[(knotIndex + 1) % knotCount];
    const startPoint = subPathEntry.knots[knotIndex].clone().add(startShift);
    const endPoint = subPathEntry.knots[(knotIndex + 1) % knotCount].clone().add(endShift);
    const curve = subPathEntry.curves[knotIndex];

    if (curve.isCubicBezierCurve) {
      curve.v0.copy(startPoint);
      curve.v1.add(new THREE.Vector2().lerpVectors(startShift, endShift, 1 / 3));
      curve.v2.add(new THREE.Vector2().lerpVectors(startShift, endShift, 2 / 3));
      curve.v3.copy(endPoint);
    } else if (curve.isLineCurve) {
      curve.v1.copy(startPoint);
      curve.v2.copy(endPoint);
    }
  }
}

for (const { first, second } of twinMatches) {
  const firstCurve = first.curve;
  const secondCurve = second.curve;
  if (firstCurve.isCubicBezierCurve && secondCurve.isCubicBezierCurve) {
    const controlOne = firstCurve.v1.clone().add(secondCurve.v2).multiplyScalar(0.5);
    const controlTwo = firstCurve.v2.clone().add(secondCurve.v1).multiplyScalar(0.5);
    firstCurve.v1.copy(controlOne);
    secondCurve.v2.copy(controlOne);
    firstCurve.v2.copy(controlTwo);
    secondCurve.v1.copy(controlTwo);
  }
}

for (const subPathEntry of subPaths) {
  subPathEntry.subPath.curves = subPathEntry.curves.filter((curve) => {
    const start = curve.v0 || curve.v1;
    const end = curve.v3 || curve.v2;
    return start.distanceTo(end) > 1e-3;
  });
}

const landShapes = [];
for (const path of countryPaths) {
  path.subPaths = path.subPaths.filter((subPath) => subPath.curves.length >= 2);
  landShapes.push(...SVGLoader.createShapes(path));
}

// RaisedLand only needs the side walls: the top cap is fully covered by LandTop, the bottom cap
// lies on the ocean plane and is never seen from above. ExtrudeGeometry puts the caps in
// group 0 and the side walls in group 1, so keep only group 1. UVs are unused (no textures).
const buildSideWalls = (extruded) => {
  const sideGroup = extruded.groups.find((group) => group.materialIndex === 1);
  if (!sideGroup) {
    throw new Error('ExtrudeGeometry did not produce a side-wall group.');
  }

  const sliceAttribute = (name) => {
    const attribute = extruded.getAttribute(name);
    return new THREE.BufferAttribute(
      attribute.array.slice(sideGroup.start * 3, (sideGroup.start + sideGroup.count) * 3),
      3
    );
  };

  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', sliceAttribute('position'));
  extruded.dispose();
  return walls;
};

const landGeometries = landShapes.map((shape) => {
  const geometry = buildSideWalls(new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    curveSegments: CURVE_DIVISIONS,
    depth: RELIEF_DEPTH,
    steps: 1,
  }));

  geometry.applyMatrix4(sourceToMap);
  return geometry;
});

// Position-only merge lets the wall vertices be shared; smooth normals are rebuilt afterwards.
const landGeometry = mergeVertices(mergeOrThrow(landGeometries, 'land'), 0.0001);
landGeometry.computeVertexNormals();
const topMaterial = new THREE.MeshStandardMaterial({
  color: '#B8AD92',
  metalness: 0.01,
  roughness: 0.78,
  side: THREE.DoubleSide,
});
const land = new THREE.Mesh(landGeometry, topMaterial);
land.name = 'RaisedLand';

const topGeometries = landShapes.map((shape) => {
  const geometry = new THREE.ShapeGeometry(shape, CURVE_DIVISIONS);
  // LandTop is unlit and untextured: positions are all it needs.
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry.applyMatrix4(sourceToMap);
  geometry.translate(0, 0, RELIEF_DEPTH + 0.001);
  return geometry;
});
const landTopGeometry = mergeVertices(mergeOrThrow(topGeometries, 'land top'), 0.0001);
const landTopMaterial = new THREE.MeshBasicMaterial({
  color: '#FFF1CD',
  side: THREE.DoubleSide,
});
const landTop = new THREE.Mesh(landTopGeometry, landTopMaterial);
landTop.name = 'LandTop';
landTop.renderOrder = 1;

// Build CountryBorders directly from the welded country shape rings (both internal
// borders and coastal/island outlines) so every country edge has a clean line that
// aligns exactly with the LandTop and RaisedLand meshes.
const borderSegmentsByKey = new Map();
const collectRingSegments = (ring) => {
  if (!ring || ring.length < 2) return;
  const closedRing = ring[0].distanceTo(ring[ring.length - 1]) < 1e-4
    ? ring.slice(0, -1)
    : ring;
  if (closedRing.length < 2) return;

  for (let index = 0; index < closedRing.length; index += 1) {
    const start = closedRing[index];
    const end = closedRing[(index + 1) % closedRing.length];
    if (start.distanceTo(end) < 1e-4) continue;

    const outsideViewport = (
      Math.max(start.x, end.x) < BORDER_BOUNDS.minX
      || Math.min(start.x, end.x) > BORDER_BOUNDS.maxX
      || Math.max(start.y, end.y) < BORDER_BOUNDS.minY
      || Math.min(start.y, end.y) > BORDER_BOUNDS.maxY
    );
    if (outsideViewport) continue;

    const edgeKey = segmentEdgeKey(start, end);
    if (!borderSegmentsByKey.has(edgeKey)) {
      borderSegmentsByKey.set(edgeKey, { start, end });
    }
  }
};

for (const shape of landShapes) {
  const { shape: outerRing, holes } = shape.extractPoints(CURVE_DIVISIONS);
  collectRingSegments(outerRing);
  holes.forEach(collectRingSegments);
}

const borderPositions = [...borderSegmentsByKey.values()].flatMap(({ start, end }) => [
  start.x, start.y, RELIEF_DEPTH + 0.003,
  end.x, end.y, RELIEF_DEPTH + 0.003,
]);

const borderGeometry = new THREE.BufferGeometry();
borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(borderPositions, 3));
borderGeometry.applyMatrix4(sourceToMap);
const borderMaterial = new THREE.LineBasicMaterial({
  color: '#6A6253',
  depthWrite: false,
});
const borders = new THREE.LineSegments(borderGeometry, borderMaterial);
borders.name = 'CountryBorders';
borders.renderOrder = 2;

if (TWO_D_OUTPUT_PATH) {
  const formatNumber = (value) => Number(value.toFixed(2));
  const formatPoint = (point) => `${formatNumber(point.x)} ${formatNumber(point.y)}`;
  const serializeSubPath = (subPathEntry) => {
    const [firstCurve] = subPathEntry.curves;
    if (!firstCurve) return '';
    const start = firstCurve.v0 || firstCurve.v1;
    const commands = [`M${formatPoint(start)}`];

    subPathEntry.curves.forEach((curve) => {
      if (curve.isCubicBezierCurve) {
        commands.push(`C${formatPoint(curve.v1)} ${formatPoint(curve.v2)} ${formatPoint(curve.v3)}`);
      } else if (curve.isLineCurve) {
        commands.push(`L${formatPoint(curve.v2)}`);
      } else {
        throw new Error(`Unsupported 2D map curve type: ${curve.type}`);
      }
    });

    commands.push('Z');
    return commands.join('');
  };

  const curveIntersects2DViewport = (curve) => {
    const points = curve.getPoints(CURVE_DIVISIONS);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return !(
      Math.max(...xs) < TWO_D_BOUNDS.minX
      || Math.min(...xs) > TWO_D_BOUNDS.maxX
      || Math.max(...ys) < TWO_D_BOUNDS.minY
      || Math.min(...ys) > TWO_D_BOUNDS.maxY
    );
  };
  const subPathIntersects2DViewport = (subPathEntry) => (
    subPathEntry.curves.some(curveIntersects2DViewport)
  );
  const duplicateTwinCurves = new Set(twinMatches.map(({ second }) => second.curve));
  const serializeBorderCurve = (curve) => {
    const start = curve.v0 || curve.v1;
    if (curve.isCubicBezierCurve) {
      return `M${formatPoint(start)}C${formatPoint(curve.v1)} ${formatPoint(curve.v2)} ${formatPoint(curve.v3)}`;
    }
    if (curve.isLineCurve) {
      return `M${formatPoint(start)}L${formatPoint(curve.v2)}`;
    }
    throw new Error(`Unsupported 2D map curve type: ${curve.type}`);
  };

  const fillPathData = subPaths
    .filter(subPathIntersects2DViewport)
    .map(serializeSubPath)
    .filter(Boolean)
    .join(' ');
  const borderPathData = subPaths
    .flatMap(({ curves }) => curves)
    .filter((curve) => !duplicateTwinCurves.has(curve) && curveIntersects2DViewport(curve))
    .map(serializeBorderCurve)
    .join(' ');
  const moduleSource = `// Generated from assets/map.svg by scripts/build-vector-map.mjs.\n`
    + `// Shared country edges are welded and duplicate twins are omitted from the border layer.\n`
    + `export const EUROPE_SVG_VIEWBOX = { minX: 440, minY: 190, width: 290, height: 218 };\n`
    + `export const EUROPE_MAP_FILL_PATH_DATA = ${JSON.stringify(fillPathData)};\n`
    + `export const EUROPE_MAP_BORDER_PATH_DATA = ${JSON.stringify(borderPathData)};\n`;
  await fs.writeFile(TWO_D_OUTPUT_PATH, moduleSource);
  console.log(`Wrote ${TWO_D_OUTPUT_PATH.pathname}`);
}

const scene = new THREE.Scene();
scene.name = 'WorldMapRelief';
scene.add(land, landTop, borders);

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, {
  binary: true,
  onlyVisible: true,
  trs: false,
});

await fs.writeFile(OUTPUT_PATH, Buffer.from(result));
console.log(`Wrote ${OUTPUT_PATH.pathname}`);
