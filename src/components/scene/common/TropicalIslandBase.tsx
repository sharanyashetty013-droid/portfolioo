import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IslandConfig } from '../../../constants/islandLayout';

interface TropicalIslandBaseProps {
  config: IslandConfig;
}

// Pseudo-random seeded generator
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Smooth value noise in 2D, seeded, roughly -1..1
const makeNoise = (seed: number) => {
  const hash = (x: number, y: number) => {
    const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return (h - Math.floor(h)) * 2 - 1;
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
};

const SEG = 56; // points around the island

/**
 * Island body: a grassy top with a sandy rim (same height as before, so everything placed on
 * it still sits right), layered rocky cliffs with ledges and colour bands, a sandy beach shelf
 * at the waterline, boulders around the base and little grass tufts.
 */
export const TropicalIslandBase: React.FC<TropicalIslandBaseProps> = ({ config }) => {
  const { radius, height, seed, sandColor, cliffColor } = config;

  const { topGeo, cliffGeo, beachGeo, rocks, tufts } = useMemo(() => {
    const rng = createSeededRandom(seed);
    const noise = makeNoise(seed);
    const angles: number[] = [];
    const rim: number[] = [];
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      angles.push(a);
      // wobbly outline: big lobes plus small chips
      const ca = Math.cos(a), sa = Math.sin(a);
      rim.push(radius + noise(ca * 1.3, sa * 1.3) * 1.1 + noise(ca * 4, sa * 4) * 0.35);
    }

    // ---------------- TOP (grass meadow fading to a sandy rim) ----------------
    const rings = 12;
    const tp: number[] = [], tc: number[] = [], ti: number[] = [];
    const sand = new THREE.Color(sandColor || '#F9E7B8');
    const sandDark = new THREE.Color('#EBCB8F');
    const grassA = new THREE.Color('#86CC63');
    const grassB = new THREE.Color('#5FAE4C');
    const grassEdge = new THREE.Color('#4E9B42');
    const colAt = (x: number, z: number, f: number) => {
      const patch = noise(x * 0.35, z * 0.35) * 0.5 + 0.5;
      const grass = grassA.clone().lerp(grassB, patch);
      // irregular boundary between grass and sand
      const edge = 0.66 + noise(x * 0.5 + 9, z * 0.5) * 0.08;
      const g = THREE.MathUtils.smoothstep(f, edge, edge + 0.1);
      const s = sand.clone().lerp(sandDark, noise(x * 0.8, z * 0.8) * 0.3 + 0.3 + f * 0.2);
      const c = grass.lerp(s, g);
      if (f > edge - 0.04 && f < edge + 0.02) c.lerp(grassEdge, 0.35);
      return c;
    };
    tp.push(0, height + 0.35, 0);
    const c0 = colAt(0, 0, 0);
    tc.push(c0.r, c0.g, c0.b);
    for (let r = 1; r <= rings; r++) {
      const f = r / rings;
      for (let s = 0; s < SEG; s++) {
        const rad = rim[s] * f;
        const x = Math.cos(angles[s]) * rad;
        const z = Math.sin(angles[s]) * rad;
        // same gentle dome as before (props depend on it) plus tiny bumps
        const y = height + (1 - f) * 0.35 + noise(x * 0.7, z * 0.7) * 0.05 * (1 - f * 0.5);
        tp.push(x, y, z);
        const c = colAt(x, z, f);
        tc.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < SEG; s++) ti.push(0, 1 + ((s + 1) % SEG), 1 + s);
    for (let r = 1; r < rings; r++) {
      const a0 = 1 + (r - 1) * SEG, b0 = 1 + r * SEG;
      for (let s = 0; s < SEG; s++) {
        const n = (s + 1) % SEG;
        ti.push(a0 + s, a0 + n, b0 + s, b0 + s, a0 + n, b0 + n);
      }
    }
    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    topGeo.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
    topGeo.setIndex(ti);
    topGeo.computeVertexNormals();

    // ---------------- CLIFF (layered rock with ledges and bands) ----------------
    const rock = new THREE.Color(cliffColor || '#C2AE98');
    const bands = [rock.clone(), new THREE.Color('#B39B80'), new THREE.Color('#C8B49B'), new THREE.Color('#A48C72'), new THREE.Color('#BCA68A')];
    const wet = new THREE.Color('#6F8F86');
    const deep = new THREE.Color('#4E8F8C');
    const cp: number[] = [], cc: number[] = [], ci: number[] = [];
    // levels from the grassy lip down below the water
    const levels: number[] = [];
    for (let y = height + 0.02; y > -5; y -= 0.22) levels.push(y);
    levels.push(-5);
    levels.forEach((y, li) => {
      const depth = height - y; // 0 at the top
      const band = Math.floor(depth / 0.75);
      const inBand = (depth / 0.75) - band;
      for (let s = 0; s < SEG; s++) {
        const a = angles[s];
        const ca = Math.cos(a), sa = Math.sin(a);
        // ledges: each band bulges out at its top then tucks in, giving stepped strata
        const ledge = (1 - inBand) * 0.28 - 0.1;
        // a grassy lip that slightly overhangs at the very top
        const lip = li === 0 ? 0.12 : 0;
        // carved vertical cracks and lumps
        const lumps = noise(ca * 3 + y * 0.25, sa * 3 + band) * 0.35 + noise(a * 9, y * 1.5) * 0.12;
        const taper = y < 0 ? 1 - Math.min(0.25, -y * 0.05) : 1;
        const rad = (rim[s] + ledge + lip + lumps) * taper;
        cp.push(ca * rad, y, sa * rad);
        let c: THREE.Color;
        if (li === 0) c = grassEdge.clone();
        else if (y > 0.35) {
          c = bands[band % bands.length].clone();
          c.lerp(new THREE.Color('#8C765F'), inBand > 0.75 ? 0.35 : 0); // shadowed underside of each ledge
          c.multiplyScalar(0.94 + noise(a * 6, y * 2) * 0.06);
        } else if (y > -0.6) c = wet.clone();
        else c = wet.clone().lerp(deep, Math.min(1, -y / 4));
        cc.push(c.r, c.g, c.b);
      }
    });
    for (let l = 0; l < levels.length - 1; l++) {
      const a0 = l * SEG, b0 = (l + 1) * SEG;
      for (let s = 0; s < SEG; s++) {
        const n = (s + 1) % SEG;
        ci.push(a0 + s, a0 + n, b0 + s, b0 + s, a0 + n, b0 + n);
      }
    }
    const cliffGeo = new THREE.BufferGeometry();
    cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cliffGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    cliffGeo.setIndex(ci);
    cliffGeo.computeVertexNormals();

    // ---------------- BEACH SHELF at the waterline ----------------
    const bp: number[] = [], bc: number[] = [], bi: number[] = [];
    const beachRings = [
      { out: 0.0, y: 0.55 },
      { out: 0.9, y: 0.32 },
      { out: 1.9, y: 0.1 },
      { out: 2.8, y: -0.25 },
      { out: 3.6, y: -0.8 },
    ];
    beachRings.forEach((br, ri) => {
      for (let s = 0; s < SEG; s++) {
        const a = angles[s];
        const ca = Math.cos(a), sa = Math.sin(a);
        // the shelf is wider in some places and almost gone in others
        const width = 0.55 + (noise(ca * 1.7 + 3, sa * 1.7) * 0.5 + 0.5) * 0.9;
        const rad = rim[s] * 0.97 + br.out * width;
        bp.push(ca * rad, br.y + noise(ca * 5, sa * 5) * 0.04, sa * rad);
        const c = ri < 2 ? sand.clone().lerp(sandDark, 0.25 + ri * 0.2) : ri === 2 ? new THREE.Color('#D9C69A') : new THREE.Color('#9FCFC0');
        bc.push(c.r, c.g, c.b);
      }
    });
    for (let l = 0; l < beachRings.length - 1; l++) {
      const a0 = l * SEG, b0 = (l + 1) * SEG;
      for (let s = 0; s < SEG; s++) {
        const n = (s + 1) % SEG;
        bi.push(a0 + s, b0 + s, a0 + n, b0 + s, b0 + n, a0 + n);
      }
    }
    const beachGeo = new THREE.BufferGeometry();
    beachGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    beachGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    beachGeo.setIndex(bi);
    beachGeo.computeVertexNormals();

    // ---------------- boulders around the base ----------------
    const rocks: { p: [number, number, number]; s: [number, number, number]; r: number; c: string }[] = [];
    const rockCount = 9;
    // keep clear of the pier, the dock and the moored boats
    const keepClear = [config.pierPosition, config.dockPosition].map(([x, , z]) => [x - config.position[0], z - config.position[2]]);
    for (let i = 0; i < rockCount * 3 && rocks.length < rockCount; i++) {
      const a = rng() * Math.PI * 2;
      const idx = Math.round((a / (Math.PI * 2)) * SEG) % SEG;
      const d = rim[idx] + 0.8 + rng() * 1.8;
      const px = Math.cos(a) * d, pz = Math.sin(a) * d;
      if (keepClear.some(([kx, kz]) => Math.hypot(px - kx, pz - kz) < 7)) continue;
      const sc = 0.35 + rng() * 0.55;
      rocks.push({
        p: [px, 0.05 + sc * 0.1, pz],
        s: [sc * (1 + rng() * 0.5), sc * (0.6 + rng() * 0.4), sc],
        r: rng() * Math.PI,
        c: rng() > 0.5 ? '#9C9489' : '#B0A698',
      });
    }

    // ---------------- grass tufts (one merged mesh) ----------------
    const tuftParts: THREE.BufferGeometry[] = [];
    const tuftCount = Math.round(radius * 6);
    for (let i = 0; i < tuftCount; i++) {
      const a = rng() * Math.PI * 2;
      const f = 0.3 + rng() * 0.38; // stay inside the grass, away from the centre props
      const idx = Math.round((a / (Math.PI * 2)) * SEG) % SEG;
      const rad = rim[idx] * f;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const y = height + (1 - f) * 0.35;
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.ConeGeometry(0.06, 0.32 + rng() * 0.18, 3);
        blade.translate(0, 0.16, 0);
        blade.rotateZ((rng() - 0.5) * 0.7);
        blade.rotateY(rng() * Math.PI);
        blade.translate(x + (rng() - 0.5) * 0.14, y, z + (rng() - 0.5) * 0.14);
        tuftParts.push(blade.toNonIndexed());
      }
    }
    let tufts: THREE.BufferGeometry | null = null;
    if (tuftParts.length) {
      const total = tuftParts.reduce((n, g) => n + g.attributes.position.count, 0);
      const pos = new Float32Array(total * 3);
      let o = 0;
      tuftParts.forEach((g) => { pos.set(g.attributes.position.array as Float32Array, o); o += g.attributes.position.count * 3; });
      tufts = new THREE.BufferGeometry();
      tufts.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      tufts.computeVertexNormals();
    }

    return { topGeo, cliffGeo, beachGeo, rocks, tufts };
  }, [config, radius, height, seed, sandColor, cliffColor]);

  return (
    <group position={config.position}>
      {/* grassy top with sandy rim */}
      <mesh geometry={topGeo} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
      </mesh>
      {/* layered rock cliffs */}
      <mesh geometry={cliffGeo} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.04} flatShading />
      </mesh>
      {/* sandy shelf where the island meets the sea */}
      <mesh geometry={beachGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} scale={r.s} rotation={[0, r.r, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={r.c} roughness={0.95} flatShading />
        </mesh>
      ))}
      {tufts && (
        <mesh geometry={tufts} castShadow>
          <meshStandardMaterial color="#5CA84A" roughness={0.85} flatShading />
        </mesh>
      )}
    </group>
  );
};
