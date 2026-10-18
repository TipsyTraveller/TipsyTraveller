import * as THREE from 'three';

export const MAP_W = 20;
export const MAP_H = 15;
export const MAP_CY = 0.5;
export const MAP_Z = -1;
export const ABOVE = 0.08;
export const MAP_RELIEF_DEPTH = 0.055;
export const MAP_SOURCE_W = 1096;
export const MAP_SOURCE_H = 780;

// Western Europe bounds in the original world-map SVG. Route points stay in
// that source coordinate system so a future route can widen the viewport.
export const MAP_VIEWPORT = {
  minU: 445 / MAP_SOURCE_W,
  maxU: 620 / MAP_SOURCE_W,
  minV: 248 / MAP_SOURCE_H,
  maxV: 379 / MAP_SOURCE_H,
};

export const MAP_VIEWPORT_WIDTH = MAP_VIEWPORT.maxU - MAP_VIEWPORT.minU;
export const MAP_VIEWPORT_HEIGHT = MAP_VIEWPORT.maxV - MAP_VIEWPORT.minV;
export const MAP_VIEWPORT_CENTER_U = (MAP_VIEWPORT.minU + MAP_VIEWPORT.maxU) / 2;
export const MAP_VIEWPORT_CENTER_V = (MAP_VIEWPORT.minV + MAP_VIEWPORT.maxV) / 2;

export const uv = (u, v) => new THREE.Vector3(
  ((u - MAP_VIEWPORT_CENTER_U) / MAP_VIEWPORT_WIDTH) * MAP_W,
  ((MAP_VIEWPORT_CENTER_V - v) / MAP_VIEWPORT_HEIGHT) * MAP_H + MAP_CY,
  MAP_Z + ABOVE
);

export const svgPoint = (x, y) => uv(x / MAP_SOURCE_W, y / MAP_SOURCE_H);
