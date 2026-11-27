import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Shared geometry for every palm, built once. Each palm then needs only three meshes
// (trunk, crown, coconuts), so the islands stay fast even with lots of palms.

const paint = (geo: THREE.BufferGeometry, color: THREE.Color | ((p: THREE.Vector3) => THREE.Color)) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const c = typeof color === 'function' ? color(v) : color;
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.deleteAttribute('uv');
  return g;
};

// ---- trunk: curved, ringed segments ------------------------------------------------
const TRUNK_A = new THREE.Color('#D2B184');
const TRUNK_B = new THREE.Color('#BE9C6C');
const RING = new THREE.Color('#957250');

export const PALM_TRUNK = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const y = f * 5.2 + 0.3;
    const x = Math.sin(f * Math.PI * 0.45) * 1.8;
    const rz = f * -0.35;
    const rTop = 0.24 - f * 0.08;
    const rBot = 0.3 - f * 0.08;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    const seg = new THREE.CylinderGeometry(rTop, rBot, 0.56, 10, 1);
    seg.applyMatrix4(m);
    parts.push(paint(seg, i % 2 ? TRUNK_A : TRUNK_B));
    // raised ring where segments meet
    const ring = new THREE.TorusGeometry(rBot * 1.02, 0.035, 5, 12);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, -0.27, 0);
    ring.applyMatrix4(m);
    parts.push(paint(ring, RING));
  }
  const geo = mergeGeometries(parts)!;
  geo.computeVertexNormals();
  return geo;
})();

// ---- crown: pinnate fronds with jagged leaflets, a pale midrib and drooping tips ---
const LEAF_DARK = new THREE.Color('#3E9A3A');
const LEAF_LIGHT = new THREE.Color('#79C850');
const RIB = new THREE.Color('#8CC152');

const makeFrond = (length: number, droop: number) => {
  const shape = new THREE.Shape();
  const steps = 18;
  const width = (t: number) => 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7) + 0.02;
  shape.moveTo(0, 0);
  // top edge, saw-toothed so it reads as separate leaflets
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    shape.lineTo(t * length, width(t) * (i % 2 ? 1 : 0.45));
  }
  // bottom edge back to the base
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    shape.lineTo(t * length, -width(t) * (i % 2 ? 1 : 0.45));
  }
  shape.lineTo(0, 0);
  const leaf = new THREE.ShapeGeometry(shape, 2);
  leaf.rotateX(-Math.PI / 2); // lie flat: x along the frond, z across it
  const pos = leaf.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const t = x / length;
    // arc up a little, then droop toward the tip; fold the leaflets down from the midrib
    const y = Math.sin(t * Math.PI * 0.5) * 0.35 - droop * t * t - Math.abs(z) * 0.45;
    pos.setY(i, y);
  }
  leaf.computeVertexNormals();
  const painted = paint(leaf, (p) => {
    const edge = Math.min(1, Math.abs(p.z) / 0.5);
    return LEAF_DARK.clone().lerp(LEAF_LIGHT, 0.25 + edge * 0.6);
  });
  // midrib following the same curve
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector3(t * length, Math.sin(t * Math.PI * 0.5) * 0.35 - droop * t * t + 0.02, 0));
  }
  const rib = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.02, 4, false);
  return [painted, paint(rib, RIB)];
};

export const PALM_CROWN = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (i % 2) * 0.15;
    const len = 3.0 + (i % 3) * 0.35;
    const droop = 1.4 + (i % 2) * 0.5;
    const tilt = 0.25 - (i % 3) * 0.12;
    for (const g of makeFrond(len, droop)) {
      g.rotateZ(tilt);
      g.rotateY(a);
      parts.push(g);
    }
  }
  // a few short young fronds pointing up in the middle
  for (let i = 0; i < 4; i++) {
    for (const g of makeFrond(1.5, 0.6)) {
      g.rotateZ(0.45);
      g.rotateY((i / 4) * Math.PI * 2 + 0.4);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
})();

// ---- coconuts ------------------------------------------------------------------------
export const PALM_COCONUTS = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const spots: [number, number, number][] = [[0.18, -0.22, 0.12], [-0.12, -0.26, 0.16], [0.02, -0.24, -0.2]];
  spots.forEach(([x, y, z]) => {
    const s = new THREE.SphereGeometry(0.19, 10, 8);
    s.translate(x, y, z);
    parts.push(paint(s, (p) => (p.y > y + 0.08 ? new THREE.Color('#7A5230') : new THREE.Color('#5E3D22'))));
  });
  return mergeGeometries(parts)!;
})();

// ---- boulder: chunky faceted rock with a mossy top -----------------------------------
export const BOULDER = (() => {
  const g = new THREE.IcosahedronGeometry(0.65, 1);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  // nudge each corner in or out so the rock looks hand-chipped (same corner = same nudge)
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let k = seen.get(key);
    if (k === undefined) {
      const r = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
      k = 0.82 + (r - Math.floor(r)) * 0.3;
      seen.set(key, k);
    }
    v.multiplyScalar(k);
    v.y *= 0.78;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return paint(g, (p) =>
    p.y > 0.3 ? new THREE.Color('#7FA65A') : p.y > 0.05 ? new THREE.Color('#A3A39B') : new THREE.Color('#8B8C86'),
  );
})();

// ---- flower: five round petals around a yellow centre ----------------------------------
export const FLOWER = (() => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.SphereGeometry(0.06, 8, 6);
    p.scale(1, 0.45, 0.75);
    p.translate(Math.cos(a) * 0.065, 0, Math.sin(a) * 0.065);
    parts.push(paint(p, new THREE.Color('#FFFFFF')));
  }
  const c = new THREE.SphereGeometry(0.035, 8, 6);
  c.translate(0, 0.02, 0);
  parts.push(paint(c, new THREE.Color('#FDE047')));
  return mergeGeometries(parts)!;
})();
