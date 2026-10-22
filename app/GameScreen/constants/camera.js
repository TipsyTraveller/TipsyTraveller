import * as THREE from 'three';
import { MAP_Z } from './mapCoordinates';

export const DONE_POS = new THREE.Vector3(-0.55, -6.6, 4.6);
export const DONE_LOOK = new THREE.Vector3(0, -0.2, MAP_Z);
export const OVERVIEW_OFFSET = DONE_POS.clone().sub(DONE_LOOK).multiplyScalar(0.64);
export const OVERVIEW_LEAD = new THREE.Vector3(0.55, 0, 0);
export const FOLLOW_OFFSET = DONE_POS.clone().sub(DONE_LOOK).multiplyScalar(0.38);
