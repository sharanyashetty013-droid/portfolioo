import * as THREE from 'three';
import { ROUTE_WAYPOINTS } from './islandLayout';

// Kept separate from islandLayout so the 2D HUD can import layout data without pulling in three.js
export function createVoyageCurve(): THREE.CatmullRomCurve3 {
  const points = ROUTE_WAYPOINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}
