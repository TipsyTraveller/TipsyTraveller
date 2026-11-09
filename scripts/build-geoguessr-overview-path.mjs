import fs from 'node:fs/promises';

const OUTPUT_PATH = new URL('../app/GameScreen/constants/europeMapOverviewPath.js', import.meta.url);
const SOURCE_PATH = new URL('../app/GameScreen/constants/europeMapPaths.js', import.meta.url);
const TOLERANCE = 2;

const sourceMapModule = await fs.readFile(SOURCE_PATH, 'utf8');
const sourcePathMatch = sourceMapModule.match(
  /export const EUROPE_MAP_FILL_PATH_DATA = ("(?:\\.|[^"\\])*");/
);
if (!sourcePathMatch) throw new Error('Unable to read EUROPE_MAP_FILL_PATH_DATA.');
const EUROPE_MAP_FILL_PATH_DATA = JSON.parse(sourcePathMatch[1]);

const squaredDistanceToSegment = (point, start, end) => {
  let x = start.x;
  let y = start.y;
  let dx = end.x - x;
  let dy = end.y - y;

  if (dx !== 0 || dy !== 0) {
    const progress = ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy);
    if (progress > 1) {
      x = end.x;
      y = end.y;
    } else if (progress > 0) {
      x += dx * progress;
      y += dy * progress;
    }
  }

  dx = point.x - x;
  dy = point.y - y;
  return dx * dx + dy * dy;
};

const simplifyOpenPath = (points, squaredTolerance) => {
  if (points.length <= 2) return points;

  const markers = new Uint8Array(points.length);
  const stack = [[0, points.length - 1]];
  markers[0] = 1;
  markers[points.length - 1] = 1;

  while (stack.length) {
    const [first, last] = stack.pop();
    let farthestIndex = 0;
    let farthestDistance = squaredTolerance;

    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredDistanceToSegment(points[index], points[first], points[last]);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }

    if (farthestIndex) {
      markers[farthestIndex] = 1;
      stack.push([first, farthestIndex], [farthestIndex, last]);
    }
  }

  return points.filter((_, index) => markers[index]);
};

const simplifyClosedPath = (points, tolerance) => {
  if (points.length <= 4) return points;

  let splitIndex = 1;
  let splitDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const dx = points[index].x - points[0].x;
    const dy = points[index].y - points[0].y;
    const distance = dx * dx + dy * dy;
    if (distance > splitDistance) {
      splitDistance = distance;
      splitIndex = index;
    }
  }

  const squaredTolerance = tolerance * tolerance;
  const firstHalf = simplifyOpenPath(points.slice(0, splitIndex + 1), squaredTolerance);
  const secondHalf = simplifyOpenPath(
    [...points.slice(splitIndex), points[0]],
    squaredTolerance
  );
  const simplified = [...firstHalf, ...secondHalf.slice(1, -1)];
  return simplified.length >= 3 ? simplified : points;
};

const rings = EUROPE_MAP_FILL_PATH_DATA
  .match(/M[^Z]+Z/g)
  .map((ring) => Array.from(ring.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g), (match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  })));

const pointKey = ({ x, y }) => `${x} ${y}`;
const neighbors = new Map();
const addNeighbor = (from, to) => {
  if (!neighbors.has(from)) neighbors.set(from, new Set());
  neighbors.get(from).add(to);
};

const cleanRings = rings.map((ring) => ring.filter((point, index) => (
  pointKey(point) !== pointKey(ring[(index + ring.length - 1) % ring.length])
))).filter((ring) => ring.length >= 3);

for (const ring of cleanRings) {
  for (let index = 0; index < ring.length; index += 1) {
    const from = pointKey(ring[index]);
    const to = pointKey(ring[(index + 1) % ring.length]);
    addNeighbor(from, to);
    addNeighbor(to, from);
  }
}

const simplifyIsland = (ring) => {
  const start = ring.reduce((best, point, index) => (
    pointKey(point) < pointKey(ring[best]) ? index : best
  ), 0);
  const ordered = [...ring.slice(start), ...ring.slice(0, start)];
  if (pointKey(ordered[1]) > pointKey(ordered.at(-1))) {
    ordered.splice(1, ordered.length - 1, ...ordered.slice(1).reverse());
  }
  return simplifyClosedPath(ordered, TOLERANCE);
};

const preservedVertices = new Set();
const simplifySharedRing = (ring) => {
  const junctions = ring.flatMap((point, index) => (
    neighbors.get(pointKey(point)).size > 2 || preservedVertices.has(pointKey(point)) ? [index] : []
  ));
  if (!junctions.length) return simplifyIsland(ring);

  return junctions.flatMap((start, index) => {
    const end = junctions[index + 1];
    const arc = end === undefined
      ? [...ring.slice(start), ...ring.slice(0, junctions[0] + 1)]
      : ring.slice(start, end + 1);
    // Neighbors traverse the same border in opposite directions. Use one
    // canonical ordering so both keep the same points, even on a tie.
    const forward = pointKey(arc[0]) < pointKey(arc.at(-1));
    const simplified = arc[0] === arc.at(-1)
      ? [...simplifyClosedPath(arc.slice(0, -1), TOLERANCE), arc[0]]
      : forward
        ? simplifyOpenPath(arc, TOLERANCE ** 2)
        : simplifyOpenPath(arc.reverse(), TOLERANCE ** 2).reverse();
    return simplified.slice(0, -1);
  });
};

// Preserve tiny polygons that would collapse to one segment, and keep their
// shared points in adjacent rings as well.
cleanRings.forEach((ring) => {
  if (new Set(simplifySharedRing(ring).map(pointKey)).size < 3) {
    ring.forEach((point) => preservedVertices.add(pointKey(point)));
  }
});

const simplifiedPath = cleanRings
  .map(simplifySharedRing)
  .map((points) => `${points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  )).join('')}Z`)
  .join('');

const source = `// Generated by scripts/build-geoguessr-overview-path.mjs.\n`
  + `// Simplified overview geometry with shared borders preserved.\n\n`
  + `export const EUROPE_MAP_OVERVIEW_PATH_DATA = ${JSON.stringify(simplifiedPath)};\n`;

await fs.writeFile(OUTPUT_PATH, source);
console.log(`Wrote ${simplifiedPath.length} characters across ${rings.length} rings.`);
