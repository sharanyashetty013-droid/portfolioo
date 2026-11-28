import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { IslandPier } from '../common/IslandPier';
import { StaticMerge } from '../common/StaticMerge';
import { CurvedPalm, WoodenBarrel, WoodenCrate, LowPolyBoulder, DriftingHoverRocks } from '../common/StyleRefDecor';
import { FlowerBush, LampPost, Bunting } from '../common/IslandProps';
import { HarborHouse } from '../common/HarborHouse';
import type { TimeOfDay } from '../timeOfDay';
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


const LID_NAMES: Record<string, string> = { 'oss-golang': 'GO', 'oss-gitea': 'GITEA', 'oss-relay': 'RELAY' };
const lidTexture = (text: string) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(255,255,255,0)';
  x.fillRect(0, 0, 256, 160);
  x.fillStyle = '#FFFFFF';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let size = 86;
  x.font = `900 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  while (x.measureText(text).width > 228 && size > 30) {
    size -= 4;
    x.font = `900 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  }
  x.fillText(text, 128, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// ---------------------------------------------------------------------------
// Shipping container: corrugated box in the repo's colour
// ---------------------------------------------------------------------------
const Container: React.FC<{ color: string; label?: string; hovered?: boolean }> = ({ color, label, hovered }) => {
  const tex = useMemo(() => (label && typeof document !== 'undefined' ? lidTexture(label) : null), [label]);
  return (
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
      {flat(new THREE.Color(color).multiplyScalar(0.85).getStyle())}
    </mesh>
    {/* repo name painted on the lid, readable from the harbor camera */}
    {tex && (
      <group position={[0, 0.935, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.12, 0.7]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    )}
  </group>
  );
};

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
          <Container color={REPO_COLORS[p.id] ?? '#94A3B8'} label={LID_NAMES[p.id]} hovered={hovered === p.id} />
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
// The island itself
// ---------------------------------------------------------------------------
interface OpenSourceHarborProps {
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelectProject: (p: ProjectItem) => void;
  reducedMotion?: boolean;
  timeOfDay?: TimeOfDay;
}

export const getOssProjects = () => portfolioData.projects.filter((p) => p.id.startsWith('oss-'));

export const OpenSourceHarbor: React.FC<OpenSourceHarborProps> = ({ isAnyModalOpen, onSelectProject, reducedMotion = false, timeOfDay = 'day' }) => {
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

          {/* harbormaster's office */}
          <HarborHouse position={[-3.0, 0, -1.8]} rotation={[0, -0.33, 0]} timeOfDay={timeOfDay} reducedMotion={reducedMotion} />

          {/* crates waiting on the dock = PRs still in review */}
          <WoodenCrate position={[0.9, 0, 3.4]} scale={0.9} />
          <WoodenCrate position={[1.0, 0.82, 3.5]} rotation={[0, 0.4, 0]} scale={0.75} />
          <WoodenCrate position={[-0.3, 0, 4.2]} rotation={[0, -0.3, 0]} scale={0.8} />
          <WoodenBarrel position={[3.9, 0, 1.0]} />
          <WoodenBarrel position={[4.5, 0, 1.6]} />

          <CurvedPalm position={[-6.8, 0, -2.4]} rotation={[0, 0.5, 0]} scale={1.05} />
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
    </>
  );
};
