import fs from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SOURCE_PATH = new URL('../assets/map.svg', import.meta.url);
const OUTPUT_PATH = new URL('../assets/models/world-map-vector.glb', import.meta.url);
const SOURCE_WIDTH = 1096;
const SOURCE_HEIGHT = 780;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const MAP_CENTER_Y = 0.5;
const RELIEF_DEPTH = 0.055;
const BORDER_MARGIN = 28;
const BORDER_MATCH_DISTANCE = 1.8;
const BORDER_GRID_SIZE = 2.5;
const BORDER_BOUNDS = {
  minX: 445 - BORDER_MARGIN,
  maxX: 620 + BORDER_MARGIN,
  minY: 248 - BORDER_MARGIN,
  maxY: 379 + BORDER_MARGIN,
};

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

const pointToSegmentDistanceSquared = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return point.distanceToSquared(start);

  const projection = THREE.MathUtils.clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    0,
    1
  );
  const closestX = start.x + projection * dx;
  const closestY = start.y + projection * dy;
  const distanceX = point.x - closestX;
  const distanceY = point.y - closestY;
  return distanceX * distanceX + distanceY * distanceY;
};

const borderCellKey = (x, y) => (
  `${Math.floor(x / BORDER_GRID_SIZE)}:${Math.floor(y / BORDER_GRID_SIZE)}`
);

const svg = await fs.readFile(SOURCE_PATH, 'utf8');
const { paths } = new SVGLoader().parse(svg);

const silhouettePath = paths.find((path) => path.userData.node.getAttribute('class') === 'st1');
if (!silhouettePath) {
  throw new Error('The SVG does not contain the st1 continuous land silhouette.');
}

const landShapes = SVGLoader.createShapes(silhouettePath);
const landGeometries = landShapes.map((shape) => {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    curveSegments: 5,
    depth: RELIEF_DEPTH,
    steps: 1,
  });

  geometry.applyMatrix4(sourceToMap);
  return geometry;
});

const landGeometry = mergeVertices(mergeOrThrow(landGeometries, 'land'), 0.0001);
const topMaterial = new THREE.MeshStandardMaterial({
  color: '#B8AD92',
  metalness: 0.01,
  roughness: 0.78,
  side: THREE.DoubleSide,
});
const land = new THREE.Mesh(landGeometry, topMaterial);
land.name = 'RaisedLand';

const topGeometries = landShapes.map((shape) => {
  const geometry = new THREE.ShapeGeometry(shape, 5);
  geometry.applyMatrix4(sourceToMap);
  geometry.translate(0, 0, RELIEF_DEPTH + 0.001);
  return geometry;
});
const landTopGeometry = mergeVertices(mergeOrThrow(topGeometries, 'land top'), 0.0001);
const landTopMaterial = new THREE.MeshBasicMaterial({
  color: '#FAF3E0',
  side: THREE.DoubleSide,
});
const landTop = new THREE.Mesh(landTopGeometry, landTopMaterial);
landTop.name = 'LandTop';
landTop.renderOrder = 1;

const countrySegments = [];
for (const [countryIndex, path] of paths.entries()) {
  const className = path.userData.node.getAttribute('class') || '';
  if (!/^st[2-9]$/.test(className)) continue;

  for (const [subPathIndex, subPath] of path.subPaths.entries()) {
    const points = subPath.getPoints(3);
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const outsideViewport = (
        Math.max(start.x, end.x) < BORDER_BOUNDS.minX
        || Math.min(start.x, end.x) > BORDER_BOUNDS.maxX
        || Math.max(start.y, end.y) < BORDER_BOUNDS.minY
        || Math.min(start.y, end.y) > BORDER_BOUNDS.maxY
      );
      if (outsideViewport) continue;

      const direction = end.clone().sub(start);
      const length = direction.length();
      if (length < 0.08) continue;

      countrySegments.push({
        countryIndex,
        direction: direction.divideScalar(length),
        end,
        id: countrySegments.length,
        midpoint: start.clone().add(end).multiplyScalar(0.5),
        segmentIndex: index - 1,
        start,
        subPathIndex,
      });
    }
  }
}

const segmentGrid = new Map();
for (const segment of countrySegments) {
  const key = borderCellKey(segment.midpoint.x, segment.midpoint.y);
  const cell = segmentGrid.get(key) || [];
  cell.push(segment);
  segmentGrid.set(key, cell);
}

const maxDistanceSquared = BORDER_MATCH_DISTANCE * BORDER_MATCH_DISTANCE;
const matchedRuns = new Map();
const segmentLookup = new Map(countrySegments.map((segment) => [
  `${segment.countryIndex}:${segment.subPathIndex}:${segment.segmentIndex}`,
  segment,
]));

for (const segment of countrySegments) {
  const gridX = Math.floor(segment.midpoint.x / BORDER_GRID_SIZE);
  const gridY = Math.floor(segment.midpoint.y / BORDER_GRID_SIZE);
  let bestMatch = null;
  let bestDistanceSquared = Infinity;

  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      const nearby = segmentGrid.get(`${gridX + offsetX}:${gridY + offsetY}`) || [];

      for (const candidate of nearby) {
        if (candidate.countryIndex === segment.countryIndex) continue;

        // Keep roughly parallel edges, regardless of inconsistent source winding.
        // This remains stable through bends without matching perpendicular crossings.
        if (Math.abs(segment.direction.dot(candidate.direction)) < 0.35) continue;

        const distanceSquared = pointToSegmentDistanceSquared(
          segment.midpoint,
          candidate.start,
          candidate.end
        );
        if (distanceSquared > maxDistanceSquared || distanceSquared >= bestDistanceSquared) continue;

        bestDistanceSquared = distanceSquared;
        bestMatch = candidate;
      }
    }
  }

  if (!bestMatch || segment.countryIndex > bestMatch.countryIndex) continue;

  const runKey = `${segment.countryIndex}:${segment.subPathIndex}:${bestMatch.countryIndex}`;
  const run = matchedRuns.get(runKey) || new Set();
  run.add(segment.segmentIndex);
  matchedRuns.set(runKey, run);
}

const sharedBorderById = new Map();
for (const [runKey, matchedIndices] of matchedRuns) {
  const [countryIndex, subPathIndex] = runKey.split(':').map(Number);
  const sortedIndices = [...matchedIndices].sort((a, b) => a - b);
  const completedIndices = new Set(sortedIndices);

  // Country outlines use different curve subdivisions. Close only short holes
  // between confirmed matches so a shared border stays continuous through bends.
  for (let index = 1; index < sortedIndices.length; index += 1) {
    const previous = sortedIndices[index - 1];
    const current = sortedIndices[index];
    if (current - previous > 5) continue;

    for (let missing = previous + 1; missing < current; missing += 1) {
      completedIndices.add(missing);
    }
  }

  for (const segmentIndex of completedIndices) {
    const segment = segmentLookup.get(`${countryIndex}:${subPathIndex}:${segmentIndex}`);
    if (segment) sharedBorderById.set(segment.id, segment);
  }
}

const sharedBorderSegments = [...sharedBorderById.values()];

const borderPositions = sharedBorderSegments.flatMap(({ start, end }) => [
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
