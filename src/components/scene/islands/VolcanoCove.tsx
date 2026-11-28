import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CurvedPalm, LowPolyBoulder } from '../common/StyleRefDecor';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

type V3 = [number, number, number];

const cfg = ISLAND_LAYOUT.opensource;
export const CRASH_COVE = { pos: [cfg.position[0] + 17, 0, cfg.position[2] + 16] as V3, scale: 1.15 };

/** Lets the 2D label overlay (outside the Canvas) trigger the eruption */
export const crashCoveBus: { crash: () => void } = { crash: () => {} };

const sm = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const seg = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const pulse = (t: number, a: number, b: number, c: number, d: number) => seg(t, a, b) * (1 - seg(t, c, d));

// ---------------------------------------------------------------------------
// Timeline (seconds after the click). Breaks once, then heals slowly.
// ---------------------------------------------------------------------------
const T = {
  rumble: [0, 1.3] as const, // ground shakes, crater glows hotter
  boom: 1.3, // eruption
  fountain: [1.3, 4.2] as const, // lava fountain + flying rocks
  flow: [1.7, 5.2] as const, // lava rivers run down to the sea
  burn: [1.8, 3.4] as const, // palms burn away, ash settles
  cool: [6.0, 10.0] as const, // lava cools to black rock
  badge: [7.0, 7.5, 11.5, 12.3] as const, // vault survived
  heal: [12.0, 30.0] as const, // ash fades, palms regrow, rivers fade
  end: 31,
};

// volcano silhouette (radius, height) from the sea floor up to the crater
const PROFILE: [number, number][] = [
  [5.6, -0.7], [5.3, 0.05], [4.7, 0.32], [3.8, 0.85], [3.0, 1.6], [2.3, 2.5],
  [1.7, 3.4], [1.28, 4.15], [1.08, 4.22], [0.78, 3.86], [0.0, 3.78],
];
const outerR = (y: number) => {
  // radius of the outer slope at height y (rim and above -> rim radius)
  for (let i = 0; i < 8; i++) {
    const [r0, y0] = PROFILE[i];
    const [r1, y1] = PROFILE[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return y < PROFILE[0][1] ? PROFILE[0][0] : PROFILE[7][0];
};
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

const buildVolcano = () => {
  const pts = PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 56);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const colors: number[] = [];
  const sand = new THREE.Color('#EED9A6');
  const grass = new THREE.Color('#5FA34A');
  const grass2 = new THREE.Color('#7DBB57');
  const rock = new THREE.Color('#8A6E5C');
  const rock2 = new THREE.Color('#6B5446');
  const dark = new THREE.Color('#3E3330');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = Math.hypot(v.x, v.z);
    // gentle ridges and bumps on the slope (not on the crater floor or under water)
    if (v.y > 0.1 && r > 0.85) {
      const a = Math.atan2(v.z, v.x);
      const n = Math.sin(a * 9 + v.y * 1.7) * 0.09 + (hash(Math.round(v.x * 3), Math.round(v.y * 3), Math.round(v.z * 3)) - 0.5) * 0.14;
      const k = 1 + n / Math.max(1, r);
      v.x *= k;
      v.z *= k;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    const h = v.y;
    const jitter = hash(v.x, v.y, v.z);
    if (h < 0.42) c.copy(sand);
    else if (h < 1.5) c.copy(jitter > 0.5 ? grass : grass2).lerp(rock, sm((h - 1.1) / 0.5) * 0.7);
    else if (h < 3.3) c.copy(rock).lerp(rock2, jitter * 0.6);
    else c.copy(rock2).lerp(dark, sm((h - 3.3) / 0.8));
    if (r < 0.95 && h > 3.6) c.copy(dark);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
};

const badgeTexture = () => {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 160;
  const x = cv.getContext('2d')!;
  const r = 70;
  x.fillStyle = 'rgba(255,255,255,0.96)';
  x.beginPath();
  x.moveTo(r, 10);
  x.arcTo(502, 10, 502, 150, r);
  x.arcTo(502, 150, 10, 150, r);
  x.arcTo(10, 150, 10, 10, r);
  x.arcTo(10, 10, 502, 10, r);
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = '#1AA6A6';
  x.stroke();
  x.lineWidth = 12;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(52, 82);
  x.lineTo(74, 104);
  x.lineTo(112, 56);
  x.stroke();
  x.fillStyle = '#0F4C5C';
  x.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('Data survived', 138, 76);
  x.fillStyle = '#3E6B73';
  x.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('midsave crash test · PASS', 140, 116);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

// soft round puff for ash, smoke and steam
const puffTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// ---------------------------------------------------------------------------
const LAVA = 70;
const ROCKS = 12;
const ASH = 36;
const SMOKE = 12;
const STEAM = 18;
const RIVERS = 4;
const BLOBS = 26;
const CRATER_Y = 4.05;

// direction toward the harbor camera, so the vault and the rivers face the viewer
const CAM_DIR = Math.atan2(0.41, -0.91);

export const VolcanoCove: React.FC<{ isAnyModalOpen: boolean; reducedMotion?: boolean }> = ({ isAnyModalOpen, reducedMotion }) => {
  const island = useRef<THREE.Group>(null);
  const scorch = useRef<THREE.Mesh>(null);
  const crater = useRef<THREE.Mesh>(null);
  const craterLight = useRef<THREE.PointLight>(null);
  const lava = useRef<THREE.InstancedMesh>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const ashRefs = useRef<(THREE.Sprite | null)[]>([]);
  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const steamRefs = useRef<(THREE.Sprite | null)[]>([]);
  const riverRefs = useRef<(THREE.Mesh | null)[]>([]);
  const riverHeads = useRef<(THREE.Mesh | null)[]>([]);
  const palms = useRef<(THREE.Group | null)[]>([]);
  const stumps = useRef<(THREE.Mesh | null)[]>([]);
  const vaultDoor = useRef<THREE.Mesh>(null);
  const badge = useRef<THREE.Sprite>(null);
  const startedAt = useRef(-1);
  const clockRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const volcanoGeo = useMemo(buildVolcano, []);
  const badgeTex = useMemo(() => (typeof document !== 'undefined' ? badgeTexture() : null), []);
  const puffTex = useMemo(() => (typeof document !== 'undefined' ? puffTexture() : null), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lavaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FF7A1A', emissive: '#FF5A00', emissiveIntensity: 2.2, roughness: 0.4 }), []);
  const riverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FF7A1A', emissive: '#FF4A00', emissiveIntensity: 2.0, roughness: 0.5, transparent: true }), []);
  const hot = useMemo(() => new THREE.Color('#FF4A00'), []);
  const black = useMemo(() => new THREE.Color('#000000'), []);
  const cooled = useMemo(() => new THREE.Color('#2E2724'), []);
  const molten = useMemo(() => new THREE.Color('#FF7A1A'), []);

  // particle seeds (deterministic so every eruption looks the same, but natural)
  const seeds = useMemo(() => {
    let sd = 29;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    return {
      lava: Array.from({ length: LAVA }, () => ({ a: r() * Math.PI * 2, sp: 1.2 + r() * 2.6, up: 6 + r() * 5, delay: r() * 2.2, size: 0.14 + r() * 0.16 })),
      rocks: Array.from({ length: ROCKS }, () => ({ a: r() * Math.PI * 2, sp: 2.5 + r() * 3, up: 8 + r() * 4, spin: (r() - 0.5) * 12, size: 0.13 + r() * 0.16, delay: r() * 0.5 })),
      ash: Array.from({ length: ASH }, () => ({ a: r() * Math.PI * 2, rr: r(), h: r(), size: 1.6 + r() * 1.8, shade: 0.8 + r() * 0.35 })),
      steam: Array.from({ length: STEAM }, (_, i) => ({ river: i % RIVERS, off: r(), size: 0.4 + r() * 0.5 })),
    };
  }, []);

  // lava river paths down the slope, fanned toward the camera side
  const riverPts = useMemo(() => {
    const out: THREE.Vector3[][] = [];
    const spread = [-0.75, -0.2, 0.35, 0.95];
    for (let k = 0; k < RIVERS; k++) {
      const base = CAM_DIR + spread[k];
      const line: THREE.Vector3[] = [];
      for (let i = 0; i < BLOBS; i++) {
        const s = i / (BLOBS - 1);
        const y = 4.05 + (0.12 - 4.05) * Math.pow(s, 0.85);
        const a = base + Math.sin(s * 7 + k) * 0.1;
        const r = outerR(y) + 0.1;
        line.push(new THREE.Vector3(Math.cos(a) * r, y + 0.08, Math.sin(a) * r));
      }
      out.push(line);
    }
    return out;
  }, []);
  const riverGeos = useMemo(
    () => riverPts.map((line) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 72, 0.21, 10, false)),
    [riverPts]
  );
  const riverCurves = useMemo(() => riverPts.map((line) => new THREE.CatmullRomCurve3(line)), [riverPts]);

  const palmSpots = useMemo(
    () => [CAM_DIR - 1.25, CAM_DIR + 1.2, CAM_DIR + 2.4, CAM_DIR - 2.5].map((a, i) => ({ a, r: 4.35 + (i % 2) * 0.25, s: 0.5 + (i % 2) * 0.08 })),
    []
  );
  const vault = useMemo(() => {
    const a = CAM_DIR + 0.02;
    const r = 4.6;
    return { pos: [Math.cos(a) * r, 0.34, Math.sin(a) * r] as V3, yaw: Math.atan2(Math.cos(a), Math.sin(a)) };
  }, []);

  const erupt = () => {
    if (startedAt.current >= 0 || isAnyModalOpen) return;
    startedAt.current = clockRef.current;
  };
  useEffect(() => {
    crashCoveBus.crash = erupt;
    return () => {
      crashCoveBus.crash = () => {};
    };
  });

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    clockRef.current = now;
    let t = startedAt.current < 0 ? -1 : now - startedAt.current;
    if (reducedMotion && t >= 0 && t < T.badge[0]) t = T.badge[0];
    if (t > T.end) {
      startedAt.current = -1;
      t = -1;
    }
    const active = t >= 0;

    const heat = active ? Math.max(seg(t, 0, T.boom), 0) * (1 - seg(t, T.cool[0], T.cool[1])) : 0;
    const heal = active ? seg(t, T.heal[0], T.heal[1]) : 1;

    // --- island: rumble before the blast, small aftershocks ---
    if (island.current) {
      const shake = active ? pulse(t, 0, 0.9, T.boom, T.boom + 0.5) * 0.09 + pulse(t, T.boom, T.boom + 0.05, T.boom + 0.2, T.boom + 1.4) * 0.05 : 0;
      island.current.position.set(Math.sin(now * 71) * shake, 0, Math.cos(now * 63) * shake);
      const s = hovered && !active ? 1.03 : 1;
      island.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
    }

    // --- crater glow: always simmering, flares up during the eruption ---
    const simmer = 0.55 + Math.sin(now * 2.1) * 0.12;
    if (crater.current) {
      const m = crater.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = simmer + heat * 2.6;
    }
    if (craterLight.current) craterLight.current.intensity = 6 + heat * 40 + Math.sin(now * 9) * heat * 6;

    // --- ash overlay darkens the island, then fades as it heals ---
    if (scorch.current) {
      const o = active ? seg(t, T.burn[0], T.burn[1] + 1.5) * 0.55 * (1 - heal) : 0;
      scorch.current.visible = o > 0.01;
      (scorch.current.material as THREE.MeshBasicMaterial).opacity = o;
    }

    // --- palms burn away and regrow ---
    palms.current.forEach((p, i) => {
      if (!p) return;
      const grow = active ? 1 - seg(t, T.burn[0] + i * 0.15, T.burn[1] + i * 0.15) + seg(t, T.heal[0] + 3 + i * 1.6, T.heal[0] + 9 + i * 1.6) : 1;
      const g = Math.min(1, Math.max(0.0001, grow));
      p.scale.setScalar(palmSpots[i].s * g);
      const st = stumps.current[i];
      if (st) st.visible = g < 0.6;
    });

    // --- vault door glows when it survives ---
    if (vaultDoor.current) {
      const m = vaultDoor.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.5 + (active ? pulse(t, T.badge[0] - 0.4, T.badge[1], T.badge[2], T.badge[3] + 2) * 2.2 : 0) + Math.sin(now * 2) * 0.1;
    }

    // --- lava fountain ---
    if (lava.current) {
      seeds.lava.forEach((s, k) => {
        let vis = false;
        if (active && !reducedMotion) {
          const lt = t - T.boom - s.delay * 0.9;
          const life = 1.6;
          if (lt > 0 && lt < life && t < T.fountain[1]) {
            vis = true;
            const x = Math.cos(s.a) * s.sp * lt;
            const z = Math.sin(s.a) * s.sp * lt;
            const y = CRATER_Y + s.up * lt - 4.9 * lt * lt;
            dummy.position.set(x, Math.max(y, outerR(Math.max(0, y)) > Math.hypot(x, z) ? y : y), z);
            dummy.scale.setScalar(s.size * (1 - lt / life * 0.5));
          }
        }
        if (!vis) dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        lava.current!.setMatrixAt(k, dummy.matrix);
      });
      lava.current.instanceMatrix.needsUpdate = true;
    }

    // --- flying volcanic bombs ---
    if (rocks.current) {
      seeds.rocks.forEach((s, k) => {
        let vis = false;
        if (active && !reducedMotion) {
          const lt = t - T.boom - s.delay;
          if (lt > 0 && lt < 2.4) {
            const y = CRATER_Y + s.up * lt - 4.9 * lt * lt;
            if (y > -0.3) {
              vis = true;
              dummy.position.set(Math.cos(s.a) * s.sp * lt, y, Math.sin(s.a) * s.sp * lt);
              dummy.rotation.set(lt * s.spin, lt * s.spin * 0.7, 0);
              dummy.scale.setScalar(s.size);
            }
          }
        }
        if (!vis) dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        rocks.current!.setMatrixAt(k, dummy.matrix);
      });
      rocks.current.instanceMatrix.needsUpdate = true;
    }

    // --- ash cloud billows up into a mushroom, then drifts away ---
    {
      const grow = active ? seg(t, T.boom, T.boom + 3.5) : 0;
      const fade = active ? 1 - seg(t, 8, 13) : 0;
      const drift = active ? Math.max(0, t - 4.5) * 0.35 : 0;
      seeds.ash.forEach((s, k) => {
        const sp = ashRefs.current[k];
        if (!sp) return;
        // a rising column that opens into a soft mushroom and drifts downwind
        const h = CRATER_Y + 0.5 + grow * (0.8 + s.h * 4.6);
        const spread = (0.25 + s.rr * (0.4 + grow * 2.2)) * (0.35 + s.h * s.h * 1.4);
        sp.position.set(Math.cos(s.a + now * 0.12) * spread + drift * (0.4 + s.h), h + Math.sin(now + k) * 0.08, Math.sin(s.a + now * 0.12) * spread * 0.8);
        const sc = s.size * (0.5 + grow * 0.9) * (1 + (1 - fade) * 0.6);
        sp.scale.set(sc, sc, 1);
        const m = sp.material as THREE.SpriteMaterial;
        m.opacity = grow * fade * 0.85;
        sp.visible = m.opacity > 0.01;
      });
    }

    // --- lazy smoke wisps from the crater (always) ---
    for (let k = 0; k < SMOKE; k++) {
      const sp = smokeRefs.current[k];
      if (!sp) continue;
      const life = reducedMotion ? 0.4 : (now * 0.16 + k / SMOKE) % 1;
      sp.position.set(Math.sin(k * 2.3 + life * 2) * 0.3 + life * 1.1, CRATER_Y + 0.25 + life * 3.4, Math.cos(k * 1.7) * 0.25);
      const sc = (0.6 + life * 1.8) * (1 + heat * 0.5);
      sp.scale.set(sc, sc, 1);
      (sp.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.45;
    }

    // --- lava rivers: run down, cool to black rock, then weather away while healing ---
    {
      const keep = active ? 1 - seg(t, T.heal[0] + 4, T.heal[1] - 2) : 0;
      riverGeos.forEach((g, k) => {
        // each river starts a little after the last and pours down the slope
        const flow = active ? seg(t, T.flow[0] + k * 0.18, T.flow[1] + k * 0.18) : 0;
        const idx = g.index ? g.index.count : 0;
        const per = 10 * 6; // radial segments * 6 indices per ring
        g.setDrawRange(0, Math.floor((idx / per) * flow) * per);
        const m = riverRefs.current[k];
        if (m) m.visible = flow > 0.01 && keep > 0.01;
        const head = riverHeads.current[k];
        if (head) {
          const on = flow > 0.02 && flow < 0.995 && keep > 0.01;
          head.visible = on;
          if (on) {
            head.position.copy(riverCurves[k].getPointAt(Math.min(1, flow)));
            head.scale.setScalar(0.27 + Math.sin(now * 8 + k) * 0.02);
          }
        }
      });
      riverMat.opacity = Math.max(0, keep);
      // cool from molten orange to dark rock
      const c = active ? seg(t, T.cool[0], T.cool[1]) : 0;
      riverMat.color.copy(molten).lerp(cooled, c);
      riverMat.emissive.copy(hot).lerp(black, c);
      riverMat.emissiveIntensity = 2.0 * (1 - c) + 0.05;
    }

    // --- steam where the lava meets the sea ---
    {
      const on = active ? pulse(t, T.flow[1] - 0.6, T.flow[1] + 0.2, T.cool[0] + 1, T.cool[1]) : 0;
      seeds.steam.forEach((s, k) => {
        const sp = steamRefs.current[k];
        if (!sp) return;
        const end = riverPts[s.river][BLOBS - 1];
        const life = (now * 0.45 + s.off) % 1;
        sp.position.set(end.x * 1.08 + Math.sin(k) * 0.35, 0.3 + life * 2.6, end.z * 1.08 + Math.cos(k) * 0.35);
        const sc = s.size * (1 + life * 2.2);
        sp.scale.set(sc, sc, 1);
        const m = sp.material as THREE.SpriteMaterial;
        m.opacity = on * Math.sin(life * Math.PI) * 0.7;
        sp.visible = m.opacity > 0.01;
      });
    }

    if (badge.current) {
      const b = active ? pulse(t, T.badge[0], T.badge[1], T.badge[2], T.badge[3]) : 0;
      badge.current.visible = b > 0.01;
      const pop = b * (1 + Math.sin(Math.min(1, Math.max(0, (t - T.badge[0]) / 0.4)) * Math.PI) * 0.15);
      badge.current.scale.set(4.6 * pop, 1.44 * pop, 1);
      badge.current.position.y = 7.2 + b * 0.3;
      (badge.current.material as THREE.SpriteMaterial).opacity = b;
    }
  });

  const handlers = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      erupt();
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (isAnyModalOpen) return;
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setHovered(false);
      document.body.style.cursor = 'auto';
    },
  };

  return (
    <group position={CRASH_COVE.pos} scale={CRASH_COVE.scale} userData={{ noMerge: true }}>
      <group ref={island} {...handlers}>
        <mesh geometry={volcanoGeo} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.85} />
        </mesh>
        <mesh ref={scorch} geometry={volcanoGeo} scale={1.004} visible={false}>
          <meshBasicMaterial color="#2A2220" transparent opacity={0} depthWrite={false} />
        </mesh>
        {/* glowing crater lake */}
        <mesh ref={crater} position={[0, 3.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.82, 28]} />
          <meshStandardMaterial color="#FF8A2A" emissive="#FF5A00" emissiveIntensity={0.6} roughness={0.4} />
        </mesh>
        <pointLight ref={craterLight} position={[0, 4.6, 0]} color="#FF7A2A" intensity={6} distance={12} decay={2} />

        {/* the data vault: stone, with a glowing door, it never breaks */}
        <group position={vault.pos} rotation={[0, vault.yaw, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.25, 0.9, 0.95]} />
            <meshStandardMaterial color="#9AA3AE" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.98, 0]} castShadow>
            <boxGeometry args={[1.4, 0.16, 1.1]} />
            <meshStandardMaterial color="#7C8692" roughness={0.8} />
          </mesh>
          <mesh ref={vaultDoor} position={[0, 0.4, 0.48]}>
            <boxGeometry args={[0.5, 0.62, 0.04]} />
            <meshStandardMaterial color="#5EEAD4" emissive="#1AA6A6" emissiveIntensity={0.5} roughness={0.3} />
          </mesh>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, 0.45, 0.49]}>
              <boxGeometry args={[0.08, 0.86, 0.04]} />
              <meshStandardMaterial color="#64748B" roughness={0.7} />
            </mesh>
          ))}
        </group>

        {/* palms that burn and regrow, with stumps left behind */}
        {palmSpots.map((p, i) => (
          <group key={i} position={[Math.cos(p.a) * p.r, 0.32, Math.sin(p.a) * p.r]}>
            <group ref={(el) => { palms.current[i] = el; }} scale={p.s}>
              <CurvedPalm position={[0, 0, 0]} rotation={[0, p.a, 0]} scale={1} />
            </group>
            <mesh ref={(el) => { stumps.current[i] = el; }} position={[0, 0.2, 0]} visible={false}>
              <cylinderGeometry args={[0.09, 0.13, 0.4, 7]} />
              <meshStandardMaterial color="#2E2724" roughness={0.9} />
            </mesh>
          </group>
        ))}
        <LowPolyBoulder position={[Math.cos(CAM_DIR + 0.9) * 5.3, -0.15, Math.sin(CAM_DIR + 0.9) * 5.3]} scale={0.55} />
        <LowPolyBoulder position={[Math.cos(CAM_DIR - 0.8) * 5.4, -0.2, Math.sin(CAM_DIR - 0.8) * 5.4]} scale={0.45} />

        {/* invisible hit target so the whole volcano is easy to click */}
        <mesh position={[0, 2, 0]} visible={false}>
          <cylinderGeometry args={[2.2, 5, 4.4, 12]} />
          <meshBasicMaterial />
        </mesh>
      </group>

      {/* eruption effects */}
      <instancedMesh ref={lava} args={[undefined, undefined, LAVA]} material={lavaMat} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[undefined, undefined, ROCKS]} frustumCulled={false} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#2F2826" emissive="#FF4A00" emissiveIntensity={0.12} roughness={0.95} />
      </instancedMesh>

      {/* lava rivers: smooth tubes that pour down the slope */}
      {riverGeos.map((g, k) => (
        <group key={k}>
          <mesh ref={(el) => { riverRefs.current[k] = el; }} geometry={g} material={riverMat} visible={false} frustumCulled={false} />
          <mesh ref={(el) => { riverHeads.current[k] = el; }} material={riverMat} visible={false}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
        </group>
      ))}

      {/* soft ash, smoke and steam puffs */}
      {puffTex && seeds.ash.map((s, k) => (
        <sprite key={`a${k}`} ref={(el) => { ashRefs.current[k] = el; }} visible={false} renderOrder={6}>
          <spriteMaterial map={puffTex} color={new THREE.Color('#57504C').multiplyScalar(s.shade)} transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
      {puffTex && Array.from({ length: SMOKE }, (_, k) => (
        <sprite key={`m${k}`} ref={(el) => { smokeRefs.current[k] = el; }} renderOrder={6}>
          <spriteMaterial map={puffTex} color="#D6D0CB" transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
      {puffTex && seeds.steam.map((_, k) => (
        <sprite key={`s${k}`} ref={(el) => { steamRefs.current[k] = el; }} visible={false} renderOrder={6}>
          <spriteMaterial map={puffTex} color="#FFFFFF" transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}

      {badgeTex && (
        <sprite ref={badge} position={[0, 7.2, 0]} visible={false} renderOrder={10}>
          <spriteMaterial map={badgeTex} transparent opacity={0} depthTest={false} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
};
