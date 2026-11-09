/**
 * Shared clock + camera framing for the opening "ink map comes alive" sequence.
 * The loader draws a top-down sea chart using mapView(); the 3D camera starts
 * from exactly the same top-down view, so when the ink floods into water the
 * drawn islands are sitting right where the real ones are. Then it swoops to Home.
 */
export const intro = { start: -1, skip: false };

export const MAP_HOLD = 2.3; // seconds the camera holds the map view while the ink floods into water
export const SWOOP = 3.6;    // then the dive down to Home

export const introElapsed = (clockTime: number) =>
  intro.skip ? 1e6 : intro.start < 0 ? 0 : clockTime - intro.start;

/**
 * Top-down framing of the whole archipelago for a given viewport aspect (w/h).
 * The chain is long in z, so on landscape screens the chart is laid sideways
 * (screen-right = world -z, screen-up = world -x); on portrait, screen-up = world -z.
 */
export function mapView(aspect: number) {
  const fov = 50;
  const t = Math.tan(((fov / 2) * Math.PI) / 180);
  const landscape = aspect >= 1;
  const cx = 21;
  const cz = landscape ? -134 : -128;  // centre of the island chain (world x/z)
  const halfAcross = 74;
  const halfAlong = landscape ? 160 : 182; // portrait leaves room for the top pill and bottom nav
  const halfScreenX = landscape ? halfAlong : halfAcross;
  const halfScreenY = landscape ? halfAcross : halfAlong;
  const H = Math.max(halfScreenY / t, halfScreenX / (t * aspect));
  // camera "up" while looking straight down
  const up: [number, number, number] = landscape ? [-1, 0, 0] : [0, 0, -1];
  return { cx, cz, H, fov, t, landscape, up };
}

/** Project a world point (x, y, z) to screen pixels for the map view. */
export function mapProject(x: number, y: number, z: number, w: number, h: number) {
  const aspect = w / h;
  const v = mapView(aspect);
  const dist = v.H - y;
  const rx = v.landscape ? v.cz - z : x - v.cx; // world offset along screen-right
  const dy = v.landscape ? x - v.cx : z - v.cz; // world offset along screen-down
  const sx = w / 2 + (rx / (dist * v.t * aspect)) * (w / 2);
  const sy = h / 2 + (dy / (dist * v.t)) * (h / 2);
  const pxPerUnit = h / 2 / (dist * v.t);
  return { sx, sy, pxPerUnit };
}
