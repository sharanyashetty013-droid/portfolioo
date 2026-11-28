import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { IslandPier } from '../common/IslandPier';
import { StaticMerge } from '../common/StaticMerge';
import { CurvedPalm, WoodenBarrel, WoodenCrate, LowPolyBoulder, DriftingHoverRocks } from '../common/StyleRefDecor';
import { FlowerBush, LampPost, Bunting } from '../common/IslandProps';
import { ProjectItem } from '../../../types/portfolio';
import { portfolioData } from '../../../data/portfolioData';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

type V3 = [number, number, number];

const flat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} roughness={0.8} flatShading {...(extra as object)} />
);
const smooth01 = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const seg = (t: number, a: number, b: number) => smooth01((t - a) / (b - a));

/** Repo colours for the containers on the cargo ship */
const REPO_COLORS: Record<string, string> = {
  'oss-golang': '#00ADD8',
  'oss-gitea': '#609926',
  'oss-relay': '#F2765D',
};

const cfg = ISLAND_LAYOUT.opensource;
const [IX, , IZ] = cfg.position;

// Where things sit in the world (island centre + offset)
export const HARBOR_SHIP = { pos: [IX + 9.9, 0, IZ + 9.7] as V3, rotY: Math.PI / 4 };
export const CRASH_COVE = { pos: [IX + 17, 0, IZ + 16] as V3, scale: 1.2 };
// Deck slots along the ship, in ship-local x (bow points to -x)
export const SHIP_SLOTS = [-3.3, -1.6, 0.1];
const DROP_SLOT = 1.75;
const DECK_Y = 1.15;

/** Ship-local point -> world point */
export const shipToWorld = (x: number, y: number, z: number) => {
  const c = Math.cos(HARBOR_SHIP.rotY);
  const s = Math.sin(HARBOR_SHIP.rotY);
  return new THREE.Vector3(HARBOR_SHIP.pos[0] + x * c + z * s, y, HARBOR_SHIP.pos[2] - x * s + z * c);
};

/**
 * Tiny bus so the 2D label overlay can trigger the crash test
 * (the overlay lives outside the Canvas).
 */
export const crashCoveBus: { crash: () => void } = { crash: () => {} };

// ---------------------------------------------------------------------------
// Shipping container: corrugated box in the repo's colour
// ---------------------------------------------------------------------------
const Container: React.FC<{ color: string; hovered?: boolean }> = ({ color, hovered }) => (
  <group>
    <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.45, 0.9, 1.15]} />
      <meshStandardMaterial color={color} roughness={0.55} flatShading emissive={hovered ? color : '#000000'} emissiveIntensity={hovered ? 0.45 : 0} />
    </mesh>
    {[-0.55, -0.27, 0, 0.27, 0.55].map((x) => (
      <mesh key={x} position={[x, 0.45, 0.585]}>
        <boxGeometry args={[0.06, 0.8, 0.02]} />
        {flat(new THREE.Color(color).multiplyScalar(0.78).getStyle())}
      </mesh>
    ))}
    {/* door bars on the end */}
    <mesh position={[0.73, 0.45, 0]}>
      <boxGeometry args={[0.02, 0.8, 0.9]} />
      {flat(new THREE.Color(color).multiplyScalar(0.7).getStyle())}
    </mesh>
    <mesh position={[0, 0.91, 0]}>
      <boxGeometry args={[1.5, 0.04, 1.2]} />
      {flat('#F8FAFC')}
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Cargo ship moored by the harbor; merged PRs ride on deck as containers
// ---------------------------------------------------------------------------
const CargoShip: React.FC<{
  ossProjects: ProjectItem[];
  isAnyModalOpen: boolean;
  onSelectProject: (p: ProjectItem) => void;
  reducedMotion?: boolean;
  shipRef: React.RefObject<THREE.Group | null>;
}> = ({ ossProjects, isAnyModalOpen, onSelectProject, reducedMotion, shipRef }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const flag = useRef<THREE.Mesh>(null);

  const hullGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-5.2, 0);
    s.quadraticCurveTo(-4.2, 1.45, -2.8, 1.45);
    s.lineTo(4.6, 1.45);
    s.quadraticCurveTo(5.1, 1.45, 5.1, 0.9);
    s.lineTo(5.1, -0.9);
    s.quadraticCurveTo(5.1, -1.45, 4.6, -1.45);
    s.lineTo(-2.8, -1.45);
    s.quadraticCurveTo(-4.2, -1.45, -5.2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: false, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.35, 0);
    return g;
  }, []);
  const deckGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-4.9, 0);
    s.quadraticCurveTo(-4.0, 1.3, -2.7, 1.3);
    s.lineTo(4.5, 1.3);
    s.lineTo(4.95, 0.9);
    s.lineTo(4.95, -0.9);
    s.lineTo(4.5, -1.3);
    s.lineTo(-2.7, -1.3);
    s.quadraticCurveTo(-4.0, -1.3, -4.9, 0);
    const g = new THREE.ShapeGeometry(s, 6);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((state) => {
    if (!shipRef.current) return;
    const t = state.clock.elapsedTime;
    if (!reducedMotion) {
      shipRef.current.position.y = Math.sin(t * 1.1) * 0.06;
      shipRef.current.rotation.z = Math.sin(t * 0.9) * 0.012;
      shipRef.current.rotation.x = Math.cos(t * 0.8) * 0.01;
      if (flag.current) flag.current.rotation.y = Math.sin(t * 3) * 0.25;
    }
  });

  return (
    <group ref={shipRef} position={HARBOR_SHIP.pos} rotation={[0, HARBOR_SHIP.rotY, 0]} userData={{ noMerge: true }}>
      {/* hull: navy topsides, red bottom below the waterline */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        {flat('#1E3A5F')}
      </mesh>
      <mesh position={[0, -0.12, 0]} scale={[1.006, 0.26, 1.03]} geometry={hullGeo}>
        {flat('#C2413A')}
      </mesh>
      {/* white stripe */}
      <mesh position={[0.1, 0.95, 0]} scale={[1.004, 0.05, 1.01]} geometry={hullGeo}>
        {flat('#F8FAFC')}
      </mesh>
      <mesh geometry={deckGeo} position={[0, DECK_Y + 0.001, 0]} receiveShadow>
        {flat('#D9C29A')}
      </mesh>
      {/* deck rails */}
      {[-1.33, 1.33].map((z) => (
        <mesh key={z} position={[0.8, DECK_Y + 0.25, z]}>
          <boxGeometry args={[7.4, 0.05, 0.05]} />
          {flat('#F8FAFC')}
        </mesh>
      ))}
      {/* bridge + funnel at the stern */}
      <group position={[3.75, DECK_Y, 0]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[1.9, 1.3, 2.3]} />
          {flat('#F8FAFC')}
        </mesh>
        <mesh position={[-0.2, 1.65, 0]} castShadow>
          <boxGeometry args={[1.4, 0.7, 2.6]} />
          {flat('#F1F5F9')}
        </mesh>
        {[-0.8, -0.27, 0.27, 0.8].map((z) => (
          <mesh key={z} position={[-0.91, 1.68, z]}>
            <boxGeometry args={[0.02, 0.32, 0.36]} />
            <meshStandardMaterial color="#BAE6FD" emissive="#7DD3FC" emissiveIntensity={0.35} roughness={0.2} />
          </mesh>
        ))}
        <mesh position={[0.45, 2.35, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.38, 1.1, 10]} />
          {flat('#1AA6A6')}
        </mesh>
        <mesh position={[0.45, 2.55, 0]}>
          <cylinderGeometry args={[0.335, 0.335, 0.18, 10]} />
          {flat('#F8FAFC')}
        </mesh>
        <mesh position={[0.45, 2.92, 0]}>
          <cylinderGeometry args={[0.33, 0.33, 0.06, 10]} />
          {flat('#0B1B2D')}
        </mesh>
        {/* mast + pennant */}
        <mesh position={[-0.2, 2.6, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
          {flat('#475569')}
        </mesh>
        <mesh ref={flag} position={[-0.2, 3.05, 0]}>
          <boxGeometry args={[0.02, 0.22, 0.5]} />
          {flat('#F2765D')}
        </mesh>
      </group>
      {/* bow mast with string of signal flags */}
      <mesh position={[-4.1, DECK_Y + 0.7, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 1.4, 6]} />
        {flat('#475569')}
      </mesh>

      {/* Merged PRs: one container per repo, click to open */}
      {ossProjects.slice(0, SHIP_SLOTS.length).map((p, i) => (
        <group
          key={p.id}
          position={[SHIP_SLOTS[i], DECK_Y, 0]}
          scale={hovered === p.id ? 1.08 : 1}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProject(p);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (isAnyModalOpen) return;
            setHovered(p.id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(null);
            document.body.style.cursor = 'auto';
          }}
        >
          <Container color={REPO_COLORS[p.id] ?? '#94A3B8'} hovered={hovered === p.id} />
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Harbor crane: picks a crate off the dock and loads it onto the ship, forever
// ---------------------------------------------------------------------------
const CRANE_LOCAL: V3 = [5.3, 0, 4.7];
const PICKUP_LOCAL: V3 = [2.5, 0, 2.2];
const PERIOD = 9.5;
const JIB_Y = 6.3;

const HarborCrane: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion }) => {
  const jib = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const rope = useRef<THREE.Mesh>(null);
  const hook = useRef<THREE.Group>(null);
  const crate = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Mesh>(null);

  // crane base in world, plus pickup/drop targets as (angle, reach, crate-bottom height)
  const plan = useMemo(() => {
    const base = new THREE.Vector3(IX + CRANE_LOCAL[0], cfg.height, IZ + CRANE_LOCAL[2]);
    const pick = new THREE.Vector3(IX + PICKUP_LOCAL[0], cfg.height, IZ + PICKUP_LOCAL[2]);
    const drop = shipToWorld(DROP_SLOT, DECK_Y, 0);
    const polar = (p: THREE.Vector3) => ({ a: Math.atan2(-(p.z - base.z), p.x - base.x), r: Math.hypot(p.x - base.x, p.z - base.z) });
    return { base, pick: { ...polar(pick), y: pick.y - base.y }, drop: { ...polar(drop), y: drop.y - base.y } };
  }, []);

  useFrame((state) => {
    if (!jib.current || !trolley.current || !rope.current || !hook.current || !crate.current) return;
    const t = reducedMotion ? 2.4 : state.clock.elapsedTime % PERIOD;
    const { pick, drop } = plan;
    // swing out to the dock, lower, lift, swing to ship, lower, release, return
    const toPick = seg(t, 0, 1.3);
    const toDrop = seg(t, 3.6, 5.6);
    let ang = drop.a + (pick.a - drop.a) * toPick;
    let reach = drop.r + (pick.r - drop.r) * toPick;
    ang += (drop.a - pick.a) * toDrop;
    reach += (drop.r - pick.r) * toDrop;
    const topY = 4.2;
    let hookY = topY;
    if (t < 3.6) hookY = topY + (pick.y + 0.9 - topY) * (seg(t, 1.3, 2.2) - seg(t, 2.6, 3.5));
    else hookY = topY + (drop.y + 0.9 - topY) * (seg(t, 5.6, 6.5) - seg(t, 7.1, 8.0));

    jib.current.rotation.y = ang;
    trolley.current.position.x = reach;
    const len = JIB_Y - hookY;
    rope.current.scale.y = Math.max(0.05, len);
    rope.current.position.y = -len / 2;
    hook.current.position.y = -len;

    // the crate: waits on the dock, rides the hook, sits on deck, then gets "merged" (shrinks into the hold)
    const attached = t >= 2.3 && t < 6.9;
    const c = crate.current;
    if (attached) {
      const x = plan.base.x + Math.cos(ang) * reach;
      const z = plan.base.z - Math.sin(ang) * reach;
      c.position.set(x, plan.base.y + hookY - 0.95, z);
      c.rotation.y = ang;
      c.scale.setScalar(1);
    } else if (t < 2.3) {
      c.position.set(plan.base.x + Math.cos(pick.a) * pick.r, plan.base.y + pick.y, plan.base.z - Math.sin(pick.a) * pick.r);
      c.rotation.y = pick.a;
      c.scale.setScalar(seg(t, 0, 0.6) * 0.999 + 0.001);
    } else {
      const p = shipToWorld(DROP_SLOT, DECK_Y, 0);
      c.position.set(p.x, p.y + Math.sin(state.clock.elapsedTime * 1.1) * 0.06, p.z);
      const shrink = 1 - seg(t, 8.0, 8.9);
      c.scale.setScalar(Math.max(0.001, shrink));
    }
    if (spark.current) {
      const k = seg(t, 7.9, 8.3) - seg(t, 8.6, 9.2);
      spark.current.visible = k > 0.01;
      const p = shipToWorld(DROP_SLOT, DECK_Y + 0.6, 0);
      spark.current.position.set(p.x, p.y + 0.3 + k * 0.4, p.z);
      spark.current.scale.setScalar(0.4 + k * 0.6);
      (spark.current.material as THREE.MeshBasicMaterial).opacity = k;
      spark.current.rotation.y += 0.05;
    }
  });

  const yellow = '#F5B82E';
  return (
    <>
      <group position={plan.base.toArray() as V3} userData={{ noMerge: true }}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.4, 1.4]} />
          {flat('#64748B')}
        </mesh>
        {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([x, z], i) => (
          <mesh key={i} position={[x, 3.2, z]} castShadow>
            <boxGeometry args={[0.08, 6, 0.08]} />
            {flat(yellow)}
          </mesh>
        ))}
        {[1, 2, 3, 4, 5].map((y) => (
          <mesh key={y} position={[0, 0.4 + y * 1.1, 0]} castShadow>
            <boxGeometry args={[0.58, 0.06, 0.58]} />
            {flat(yellow)}
          </mesh>
        ))}
        <group ref={jib} position={[0, JIB_Y, 0]}>
          <mesh position={[3.2, 0, 0]} castShadow>
            <boxGeometry args={[8.2, 0.28, 0.32]} />
            {flat(yellow)}
          </mesh>
          <mesh position={[-1.5, -0.15, 0]} castShadow>
            <boxGeometry args={[1.0, 0.7, 0.8]} />
            {flat('#475569')}
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            {flat('#E4614C')}
          </mesh>
          <mesh position={[0.08, 0.55, 0.36]}>
            <boxGeometry args={[0.4, 0.3, 0.02]} />
            <meshStandardMaterial color="#BAE6FD" emissive="#7DD3FC" emissiveIntensity={0.3} />
          </mesh>
          <group ref={trolley} position={[4, -0.2, 0]}>
            <mesh>
              <boxGeometry args={[0.45, 0.18, 0.45]} />
              {flat('#334155')}
            </mesh>
            <mesh ref={rope}>
              <cylinderGeometry args={[0.025, 0.025, 1, 5]} />
              {flat('#1F2937')}
            </mesh>
            <group ref={hook}>
              <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[0.3, 0.12, 0.3]} />
                {flat('#E4614C')}
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {/* the travelling crate (world space) */}
      <group ref={crate} userData={{ noMerge: true }}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          {flat('#B9874F')}
        </mesh>
        {[-0.3, 0, 0.3].map((y) => (
          <mesh key={y} position={[0, 0.45 + y, 0]}>
            <boxGeometry args={[0.93, 0.08, 0.93]} />
            {flat('#8D6B4F')}
          </mesh>
        ))}
      </group>
      <mesh ref={spark} visible={false}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color="#FDE68A" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
};

// ---------------------------------------------------------------------------
// Crash Test Cove: a beached sailing ship. Click it and it gets smashed apart,
// floats for a beat, then every piece flies back: midsave's "data survived".
// ---------------------------------------------------------------------------
type Piece = { home: THREE.Vector3; homeRot: THREE.Euler; out: THREE.Vector3; outRot: THREE.Euler; arc: number };

const badgeTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d')!;
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
  x.fillStyle = '#1AA6A6';
  x.beginPath();
  x.arc(84, 80, 36, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = '#fff';
  x.lineWidth = 9;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(68, 82);
  x.lineTo(80, 95);
  x.lineTo(102, 66);
  x.stroke();
  x.fillStyle = '#0F4C5C';
  x.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('Data survived', 138, 76);
  x.fillStyle = '#3E6B73';
  x.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('midsave crash test · PASS', 140, 116);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const CrashCove: React.FC<{ isAnyModalOpen: boolean; reducedMotion?: boolean }> = ({ isAnyModalOpen, reducedMotion }) => {
  const group = useRef<THREE.Group>(null);
  const pieceRefs = useRef<(THREE.Group | null)[]>([]);
  const ripples = useRef<(THREE.Mesh | null)[]>([]);
  const badge = useRef<THREE.Sprite>(null);
  const flagRef = useRef<THREE.Mesh>(null);
  const startedAt = useRef(-1);
  const clockRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const tex = useMemo(() => (typeof document !== 'undefined' ? badgeTexture() : null), []);

  const hullHalf = useMemo(() => {
    // top view of half a hull, extruded upward
    const s = new THREE.Shape();
    s.moveTo(0, -0.95);
    s.lineTo(2.1, -0.95);
    s.quadraticCurveTo(3.1, -0.7, 3.4, 0);
    s.quadraticCurveTo(3.1, 0.7, 2.1, 0.95);
    s.lineTo(0, 0.95);
    s.lineTo(0, -0.95);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false, curveSegments: 5 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  // every loose part of the ship, with where it lives and where it gets thrown
  const pieces = useMemo<Piece[]>(() => {
    let sd = 7;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const homes: [V3, V3][] = [
      [[0.05, 0.35, 0], [0, 0, 0]], // bow half
      [[-0.05, 0.35, 0], [0, Math.PI, 0]], // stern half
      [[0, 1.27, 0], [0, 0, 0]], // deck
      [[0.3, 2.5, 0], [0, 0, 0]], // mast + sail
      [[-1.6, 1.62, 0.3], [0, 0, 0]], // cabin
      [[1.6, 1.47, -0.35], [0, 0.4, 0]], // crate
      [[1.5, 1.52, 0.4], [0, 0, 0]], // barrel
      [[-2.6, 1.37, 0], [0, 0, 0]], // stern rail
      [[2.6, 1.37, 0], [0, 0, 0.0]], // bow rail
    ];
    return homes.map(([p, r], i) => {
      const a = (i / homes.length) * Math.PI * 2 + rnd() * 0.6;
      const d = 3.2 + rnd() * 3.2;
      return {
        home: new THREE.Vector3(...p),
        homeRot: new THREE.Euler(...r),
        out: new THREE.Vector3(Math.cos(a) * d, 0.18, Math.sin(a) * d * 0.8),
        outRot: new THREE.Euler(r[0] + (rnd() - 0.5) * 1.2, r[1] + (rnd() - 0.5) * 3, r[2] + (rnd() - 0.5) * 1.6),
        arc: 2.2 + rnd() * 2.2,
      };
    });
  }, []);

  const crash = () => {
    if (startedAt.current >= 0 || isAnyModalOpen) return;
    startedAt.current = clockRef.current;
  };
  useEffect(() => {
    crashCoveBus.crash = crash;
    return () => {
      crashCoveBus.crash = () => {};
    };
  });

  const q0 = useMemo(() => new THREE.Quaternion(), []);
  const q1 = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    clockRef.current = now;
    let t = startedAt.current < 0 ? -1 : now - startedAt.current;
    if (reducedMotion && t >= 0 && t < 3.9) t = 3.9; // skip straight to the result
    if (t > 7.2) {
      startedAt.current = -1;
      t = -1;
    }
    // phases: 0-0.3 shudder, 0.3-1.4 blown apart, 1.4-2.5 floating, 2.5-4.0 reassembling, then badge
    const out = t < 0 ? 0 : seg(t, 0.3, 1.4) * (1 - seg(t, 2.5, 4.0));
    const flying = t >= 0.3 && t < 4.0;
    const shudder = t >= 0 && t < 0.3 ? Math.sin(t * 90) * 0.06 : 0;

    pieces.forEach((pc, i) => {
      const g = pieceRefs.current[i];
      if (!g) return;
      const k = out;
      g.position.lerpVectors(pc.home, pc.out, k);
      // arc up while travelling, bob once landed
      const travel = t < 2.5 ? seg(t, 0.3, 1.4) : 1 - seg(t, 2.5, 4.0);
      g.position.y += Math.sin(travel * Math.PI) * pc.arc * (flying ? 1 : 0);
      if (k > 0.98) g.position.y += Math.sin(now * 2.2 + i) * 0.06;
      g.position.x += shudder;
      q0.setFromEuler(pc.homeRot);
      q1.setFromEuler(pc.outRot);
      g.quaternion.copy(q0).slerp(q1, k);
      if (flying && travel > 0.05 && travel < 0.95) g.rotateY(Math.sin(travel * Math.PI) * (i % 2 ? 1 : -1) * 1.4);
    });

    // splash rings where the pieces hit the water, and one under the ship
    ripples.current.forEach((m, i) => {
      if (!m) return;
      const at = i === 0 ? 0.3 : 1.4;
      const life = t < 0 ? -1 : (t - at) / 1.1;
      const show = life > 0 && life < 1;
      m.visible = show;
      if (!show) return;
      const src = i === 0 ? new THREE.Vector3(0, 0, 0) : pieces[(i - 1) % pieces.length].out;
      m.position.set(src.x, 0.06, src.z);
      m.scale.setScalar(0.4 + life * (i === 0 ? 5 : 2.2));
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - life) * 0.8;
    });

    if (badge.current) {
      const b = t < 0 ? 0 : seg(t, 3.9, 4.3) * (1 - seg(t, 6.6, 7.2));
      badge.current.visible = b > 0.01;
      const pop = b * (1 + Math.sin(Math.min(1, (t - 3.9) / 0.4) * Math.PI) * 0.15);
      badge.current.scale.set(4.6 * pop, 1.44 * pop, 1);
      badge.current.position.y = 5.9 + b * 0.3;
      (badge.current.material as THREE.SpriteMaterial).opacity = b;
    }
    if (flagRef.current && !reducedMotion) flagRef.current.rotation.y = Math.sin(now * 3.2) * 0.3;
    if (group.current) {
      const s = hovered && t < 0 ? 1.04 : 1;
      group.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
    }
  });

  const wood = '#B9874F';
  const dark = '#8D6B4F';
  const setPiece = (i: number) => (el: THREE.Group | null) => {
    pieceRefs.current[i] = el;
  };

  return (
    <group position={CRASH_COVE.pos} scale={CRASH_COVE.scale} userData={{ noMerge: true }}>
      {/* sandbar + rocks the ship is beached on */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[4.4, 5.2, 0.5, 14]} />
        {flat('#F3DFAE')}
      </mesh>
      <LowPolyBoulder position={[-3.4, 0.1, 1.6]} scale={0.7} />
      <LowPolyBoulder position={[3.1, 0.1, -2.0]} scale={0.55} />
      <LowPolyBoulder position={[2.6, 0.05, 2.4]} scale={0.4} />

      <group
        ref={group}
        rotation={[0, -0.5, 0.06]}
        onClick={(e) => {
          e.stopPropagation();
          crash();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (isAnyModalOpen) return;
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* 0 bow half, 1 stern half */}
        {[0, 1].map((i) => (
          <group key={i} ref={setPiece(i)}>
            <mesh geometry={hullHalf} castShadow receiveShadow>
              {flat(wood)}
            </mesh>
            <mesh geometry={hullHalf} position={[0, 0.62, 0]} scale={[1.01, 0.12, 1.03]}>
              {flat('#1AA6A6')}
            </mesh>
          </group>
        ))}
        {/* 2 deck */}
        <group ref={setPiece(2)}>
          {[-0.6, -0.2, 0.2, 0.6].map((z) => (
            <mesh key={z} position={[0, 0, z]} castShadow>
              <boxGeometry args={[5.4, 0.08, 0.36]} />
              {flat(z === -0.2 || z === 0.6 ? dark : '#C99A62')}
            </mesh>
          ))}
        </group>
        {/* 3 mast + sail + flag */}
        <group ref={setPiece(3)}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.09, 2.5, 6]} />
            {flat(dark)}
          </mesh>
          <mesh position={[0.62, 0.15, 0]} castShadow>
            <coneGeometry args={[0.9, 1.9, 3]} />
            {flat('#FFF8E7')}
          </mesh>
          <mesh ref={flagRef} position={[0.22, 1.3, 0]}>
            <boxGeometry args={[0.42, 0.26, 0.02]} />
            {flat('#F2765D')}
          </mesh>
        </group>
        {/* 4 cabin */}
        <group ref={setPiece(4)}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.6, 1.0]} />
            {flat('#FFF8E7')}
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[1.25, 0.12, 1.15]} />
            {flat('#A9714B')}
          </mesh>
          <mesh position={[0.56, 0.05, 0]}>
            <boxGeometry args={[0.02, 0.24, 0.36]} />
            <meshStandardMaterial color="#BAE6FD" emissive="#7DD3FC" emissiveIntensity={0.3} />
          </mesh>
        </group>
        {/* 5 crate, 6 barrel */}
        <group ref={setPiece(5)}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            {flat(wood)}
          </mesh>
        </group>
        <group ref={setPiece(6)}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.5, 8]} />
            {flat('#A0522D')}
          </mesh>
        </group>
        {/* 7, 8 rails */}
        {[7, 8].map((i) => (
          <group key={i} ref={setPiece(i)}>
            <mesh>
              <boxGeometry args={[0.08, 0.3, 1.9]} />
              {flat(dark)}
            </mesh>
          </group>
        ))}
        {/* invisible hit box so the whole ship is easy to click */}
        <mesh position={[0, 1.3, 0]} visible={false}>
          <boxGeometry args={[7.2, 3.2, 2.6]} />
          <meshBasicMaterial />
        </mesh>
      </group>

      {/* splash rings */}
      {Array.from({ length: 1 + pieces.length }, (_, i) => (
        <mesh key={i} ref={(el) => { ripples.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.7, 0.85, 28]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {tex && (
        <sprite ref={badge} position={[0, 5.9, 0]} visible={false} renderOrder={10}>
          <spriteMaterial map={tex} transparent opacity={0} depthTest={false} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// The island itself
// ---------------------------------------------------------------------------
interface OpenSourceHarborProps {
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelectProject: (p: ProjectItem) => void;
  reducedMotion?: boolean;
}

export const getOssProjects = () => portfolioData.projects.filter((p) => p.id.startsWith('oss-'));

export const OpenSourceHarbor: React.FC<OpenSourceHarborProps> = ({ isAnyModalOpen, onSelectProject, reducedMotion = false }) => {
  const ossProjects = useMemo(getOssProjects, []);
  const shipRef = useRef<THREE.Group>(null);

  return (
    <>
      <StaticMerge>
        <TropicalIslandBase config={cfg} />
        <IslandPier config={cfg} />

        <group position={[IX, cfg.height, IZ]}>
          {/* stone quay along the ship side */}
          <mesh position={[6.1, 0.05, 6.1]} rotation={[0, HARBOR_SHIP.rotY, 0]} receiveShadow>
            <boxGeometry args={[8.6, 0.12, 3.2]} />
            {flat('#CBD5E1')}
          </mesh>
          {[-3.2, -1.1, 1.1, 3.2].map((k) => (
            <mesh key={k} position={[7.1 + k * 0.707, 0.32, 7.1 - k * 0.707]} castShadow>
              <cylinderGeometry args={[0.16, 0.2, 0.45, 8]} />
              {flat('#334155')}
            </mesh>
          ))}

          {/* harbor office */}
          <group position={[-3.2, 0, -1.6]} rotation={[0, 0.5, 0]}>
            <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
              <boxGeometry args={[3.0, 1.9, 2.2]} />
              {flat('#3E7CB1')}
            </mesh>
            {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
              <mesh key={x} position={[x, 0.95, 1.11]}>
                <boxGeometry args={[0.05, 1.8, 0.02]} />
                {flat('#336A99')}
              </mesh>
            ))}
            <mesh position={[0, 2.25, 0]} rotation={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.01, 1.95, 0.9, 4, 1]} />
              {flat('#A9714B')}
            </mesh>
            <mesh position={[0, 0.6, 1.13]}>
              <boxGeometry args={[0.6, 1.1, 0.04]} />
              {flat('#8D6B4F')}
            </mesh>
            {[-0.95, 0.95].map((x) => (
              <mesh key={x} position={[x, 1.15, 1.13]}>
                <boxGeometry args={[0.5, 0.45, 0.04]} />
                <meshStandardMaterial color="#E0F2FE" emissive="#FDE68A" emissiveIntensity={0.35} roughness={0.3} />
              </mesh>
            ))}
            {/* sign board */}
            <mesh position={[0, 2.0, 1.16]}>
              <boxGeometry args={[1.9, 0.38, 0.06]} />
              {flat('#FFF8E7')}
            </mesh>
          </group>

          {/* crates waiting on the dock = PRs still in review */}
          <WoodenCrate position={[0.9, 0, 3.4]} scale={0.9} />
          <WoodenCrate position={[1.0, 0.82, 3.5]} rotation={[0, 0.4, 0]} scale={0.75} />
          <WoodenCrate position={[-0.3, 0, 4.2]} rotation={[0, -0.3, 0]} scale={0.8} />
          <WoodenBarrel position={[3.9, 0, 1.0]} />
          <WoodenBarrel position={[4.5, 0, 1.6]} />

          <CurvedPalm position={[-6.2, 0, 2.2]} rotation={[0, 0.5, 0]} scale={1.05} />
          <CurvedPalm position={[-1.0, 0, -6.4]} rotation={[0, -1.0, 0]} scale={1.1} />
          <CurvedPalm position={[5.2, 0, -4.6]} rotation={[0, 1.8, 0]} scale={0.95} />
          <LampPost position={[2.6, 0.1, 8.4]} />
          <LampPost position={[8.5, 0.1, 2.4]} />
          <Bunting from={[2.6, 2.3, 8.4]} to={[5.3, 4.6, 4.7]} flags={8} reducedMotion={reducedMotion} />
          <FlowerBush position={[-5.0, 0, -3.6]} color="#F472B6" />
          <FlowerBush position={[-6.4, 0, -0.6]} color="#FDE047" />
          <LowPolyBoulder position={[6.6, 0, -1.4]} scale={0.7} />
        </group>

        <DriftingHoverRocks center={cfg.position} radius={cfg.radius} count={7} reducedMotion={reducedMotion} />
      </StaticMerge>

      <HarborCrane reducedMotion={reducedMotion} />
      <CargoShip ossProjects={ossProjects} isAnyModalOpen={isAnyModalOpen} onSelectProject={onSelectProject} reducedMotion={reducedMotion} shipRef={shipRef} />
      <CrashCove isAnyModalOpen={isAnyModalOpen} reducedMotion={reducedMotion} />
    </>
  );
};
