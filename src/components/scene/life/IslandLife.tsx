import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LowPolyPerson, PersonLook, PersonPose } from './LowPolyPerson';
import { ISLAND_LAYOUT, IslandConfig } from '../../../constants/islandLayout';

// Height of the sand dune at a given distance from the island centre
// (matches TropicalIslandBase: +0.35 at the centre, 0 at the rim).
const duneY = (cfg: IslandConfig, r: number) =>
  cfg.height + Math.max(0, 1 - r / cfg.radius) * 0.35;

// Only draw an island's life when the camera is near enough to actually see it.
const NearCamera: React.FC<{ cfg: IslandConfig; range?: number; children: React.ReactNode }> = ({ cfg, range = 85, children }) => {
  const ref = useRef<THREE.Group>(null);
  const centre = useMemo(() => new THREE.Vector3(cfg.position[0], cfg.height, cfg.position[2]), [cfg]);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.distanceTo(centre) < range;
  });
  return <group ref={ref}>{children}</group>;
};

// ---------------------------------------------------------------------------
// Islander walking a loop around a point on the island
// ---------------------------------------------------------------------------
const Walker: React.FC<{
  cfg: IslandConfig;
  center: [number, number];
  radius: number;
  speed: number;
  look: PersonLook;
  phase?: number;
  reducedMotion?: boolean;
}> = ({ cfg, center, radius, speed, look, phase = 0, reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const a = (reducedMotion ? 0 : state.clock.elapsedTime * speed) + phase;
    const x = center[0] + Math.cos(a) * radius;
    const z = center[1] + Math.sin(a) * radius;
    ref.current.position.set(cfg.position[0] + x, duneY(cfg, Math.hypot(x, z)), cfg.position[2] + z);
    // face direction of travel (tangent of the circle)
    ref.current.rotation.y = -a + (speed > 0 ? 0 : Math.PI);
  });
  return (
    <group ref={ref} scale={1.25}>
      <LowPolyPerson look={look} pose="walk" phase={phase} reducedMotion={reducedMotion} />
    </group>
  );
};

// Islander standing still at a spot (idle / cheering)
const Stander: React.FC<{
  cfg: IslandConfig;
  at: [number, number];
  facing: number;
  pose: PersonPose;
  look: PersonLook;
  phase?: number;
  reducedMotion?: boolean;
}> = ({ cfg, at, facing, pose, look, phase, reducedMotion }) => (
  <group
    position={[cfg.position[0] + at[0], duneY(cfg, Math.hypot(at[0], at[1])), cfg.position[2] + at[1]]}
    rotation={[0, facing, 0]}
    scale={1.25}
  >
    <LowPolyPerson look={look} pose={pose} phase={phase} reducedMotion={reducedMotion} />
  </group>
);

// ---------------------------------------------------------------------------
// Seagulls circling above an island
// ---------------------------------------------------------------------------
const Gull: React.FC<{ phase: number; radius: number; height: number; speed: number; reducedMotion?: boolean }> = ({
  phase,
  radius,
  height,
  speed,
  reducedMotion,
}) => {
  const body = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!body.current || !wingL.current || !wingR.current) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const a = t * speed + phase;
    body.current.position.set(Math.cos(a) * radius, height + Math.sin(t * 0.7 + phase) * 1.2, Math.sin(a) * radius);
    body.current.rotation.set(0, -a, -0.35); // banked turn
    const flap = Math.sin(t * 7 + phase * 3) * 0.5;
    wingL.current.rotation.z = flap;
    wingR.current.rotation.z = -flap;
  });
  return (
    <group ref={body}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.7, 5]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.12, 4]} />
        <meshStandardMaterial color="#F59E0B" flatShading />
      </mesh>
      <group ref={wingL} position={[-0.06, 0.02, 0]}>
        <mesh position={[-0.45, 0, 0]}>
          <boxGeometry args={[0.9, 0.03, 0.26]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.6} flatShading />
        </mesh>
        <mesh position={[-0.86, 0.005, 0]}>
          <boxGeometry args={[0.12, 0.035, 0.22]} />
          <meshStandardMaterial color="#334155" flatShading />
        </mesh>
      </group>
      <group ref={wingR} position={[0.06, 0.02, 0]}>
        <mesh position={[0.45, 0, 0]}>
          <boxGeometry args={[0.9, 0.03, 0.26]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.6} flatShading />
        </mesh>
        <mesh position={[0.86, 0.005, 0]}>
          <boxGeometry args={[0.12, 0.035, 0.22]} />
          <meshStandardMaterial color="#334155" flatShading />
        </mesh>
      </group>
    </group>
  );
};

const Seagulls: React.FC<{ cfg: IslandConfig; count: number; reducedMotion?: boolean }> = ({ cfg, count, reducedMotion }) => (
  <group position={cfg.position}>
    {Array.from({ length: count }).map((_, i) => (
      <Gull
        key={i}
        phase={(i / count) * Math.PI * 2 + cfg.seed}
        radius={cfg.radius * 0.7 + i * 1.6}
        height={11 + i * 1.3}
        speed={0.32 + (i % 2) * 0.08}
        reducedMotion={reducedMotion}
      />
    ))}
  </group>
);

// ---------------------------------------------------------------------------
// Crab scuttling sideways along the beach rim
// ---------------------------------------------------------------------------
const Crab: React.FC<{ cfg: IslandConfig; angle: number; reducedMotion?: boolean }> = ({ cfg, angle, reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);
  const claws = useRef<THREE.Group>(null);
  const r = cfg.radius - 1.4;
  useFrame((state) => {
    if (!ref.current || !claws.current) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    // scuttle back and forth along the rim, with little pauses
    const a = angle + Math.sin(t * 0.5 + angle) * 0.18;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    ref.current.position.set(cfg.position[0] + x, duneY(cfg, r) + 0.02 + Math.abs(Math.sin(t * 14)) * 0.02, cfg.position[2] + z);
    ref.current.rotation.y = -a;
    claws.current.rotation.x = Math.sin(t * 6) * 0.3;
  });
  return (
    <group ref={ref} scale={0.9}>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.55, 0.8]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#E4614C" roughness={0.6} flatShading />
      </mesh>
      {[-0.07, 0.07].map((z) => (
        <mesh key={z} position={[0.12, 0.2, z]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#0B1B2D" />
        </mesh>
      ))}
      <group ref={claws}>
        {[-0.2, 0.2].map((z) => (
          <mesh key={z} position={[0.2, 0.1, z]}>
            <icosahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial color="#D9513C" roughness={0.6} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Fish that leaps out of the water near the island every few seconds
// ---------------------------------------------------------------------------
const JumpingFish: React.FC<{ cfg: IslandConfig; seed: number; reducedMotion?: boolean }> = ({ cfg, seed, reducedMotion }) => {
  const fish = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const PERIOD = 5 + (seed % 3);
  const JUMP = 1.1;
  const spot = useRef({ x: 0, z: 0, dir: 0, cycle: -1 });

  useFrame((state) => {
    if (!fish.current || !ring.current) return;
    if (reducedMotion) {
      fish.current.visible = false;
      ring.current.visible = false;
      return;
    }
    const t = state.clock.elapsedTime + seed * 1.7;
    const cycle = Math.floor(t / PERIOD);
    const local = t - cycle * PERIOD;
    if (cycle !== spot.current.cycle) {
      // new random spot in the shallows around the island
      const rnd = Math.sin(cycle * 12.9898 + seed * 78.233) * 43758.5453;
      const f = rnd - Math.floor(rnd);
      const a = f * Math.PI * 2;
      const d = cfg.radius + 4 + f * 6;
      spot.current = { x: Math.cos(a) * d, z: Math.sin(a) * d, dir: a + Math.PI / 2, cycle };
    }
    const { x, z, dir } = spot.current;
    const k = local / JUMP; // 0..1 while airborne
    const airborne = k <= 1;
    fish.current.visible = airborne;
    if (airborne) {
      const along = (k - 0.5) * 2.4;
      fish.current.position.set(x + Math.cos(dir) * along, Math.sin(k * Math.PI) * 1.6 - 0.1, z + Math.sin(dir) * along);
      fish.current.rotation.set(0, -dir, (0.5 - k) * 2.2);
    }
    // splash ring after landing
    const s = local - JUMP;
    ring.current.visible = s > 0 && s < 1.2;
    if (ring.current.visible) {
      const ex = x + Math.cos(dir) * 1.2;
      const ez = z + Math.sin(dir) * 1.2;
      ring.current.position.set(ex, 0.08, ez);
      ring.current.scale.setScalar(0.3 + s * 1.4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - s / 1.2);
    }
  });

  return (
    <group position={[cfg.position[0], 0, cfg.position[2]]}>
      <group ref={fish}>
        <mesh scale={[1, 0.6, 0.45]}>
          <icosahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.4} metalness={0.2} flatShading />
        </mesh>
        <mesh position={[-0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.16, 0.24, 4]} />
          <meshStandardMaterial color="#F97316" flatShading />
        </mesh>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.75, 20]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Cast of islanders
// ---------------------------------------------------------------------------
const LOOKS: Record<string, PersonLook> = {
  fisher: { skin: '#C98E66', hair: '#2B211C', top: '#F2765D', bottom: '#334155', cap: '#1AA6A6' },
  coder: { skin: '#A9714B', hair: '#1F1A17', top: '#0EA5E9', bottom: '#1E293B', bun: true, longHair: true },
  builder: { skin: '#8D5A3B', hair: '#1F1A17', top: '#F59E0B', bottom: '#475569', cap: '#FDE047' },
  hacker1: { skin: '#B97A57', hair: '#1F1A17', top: '#8B5CF6', bottom: '#1E293B' },
  hacker2: { skin: '#D6A07A', hair: '#3B2A20', top: '#10B981', kurta: '#10B981', bottom: '#334155', braid: true, longHair: true, earrings: '#F5B82E' },
  keeper: { skin: '#C98E66', hair: '#E2E8F0', top: '#1E3A8A', bottom: '#334155', cap: '#0B1B2D' },
};

export const IslandLife: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion }) => {
  const L = ISLAND_LAYOUT;
  const fishSeeds = useMemo(() => [1, 2, 3, 4, 5], []);

  const rm = reducedMotion;
  return (
    <group>
      {/* Home: someone strolling the beach */}
      <NearCamera cfg={L.home}>
        <Walker cfg={L.home} center={[0, 1]} radius={6.8} speed={0.22} look={LOOKS.fisher} reducedMotion={rm} />
        <Seagulls cfg={L.home} count={3} reducedMotion={rm} />
        <Crab cfg={L.home} angle={1.1} reducedMotion={rm} />
        <JumpingFish cfg={L.home} seed={fishSeeds[0]} reducedMotion={rm} />
      </NearCamera>

      {/* Skills: a coder doing laps of the cobblestone ring */}
      <NearCamera cfg={L.skills}>
        <Walker cfg={L.skills} center={[0, 0]} radius={3.25} speed={-0.3} look={LOOKS.coder} phase={1.2} reducedMotion={rm} />
        <Seagulls cfg={L.skills} count={2} reducedMotion={rm} />
        <Crab cfg={L.skills} angle={1.9} reducedMotion={rm} />
        <JumpingFish cfg={L.skills} seed={fishSeeds[1]} reducedMotion={rm} />
      </NearCamera>

      {/* Projects: builder walking around the plaza */}
      <NearCamera cfg={L.projects}>
        <Walker cfg={L.projects} center={[0, 0]} radius={2.4} speed={0.28} look={LOOKS.builder} phase={2} reducedMotion={rm} />
        <Seagulls cfg={L.projects} count={3} reducedMotion={rm} />
        <Crab cfg={L.projects} angle={1.4} reducedMotion={rm} />
        <JumpingFish cfg={L.projects} seed={fishSeeds[2]} reducedMotion={rm} />
      </NearCamera>

      {/* Hackathons: two hackers celebrating in front of the summit */}
      <NearCamera cfg={L.hackathons}>
        <Stander cfg={L.hackathons} at={[-1.0, 3.6]} facing={0.3} pose="cheer" look={LOOKS.hacker1} reducedMotion={rm} />
        <Stander cfg={L.hackathons} at={[1.2, 3.9]} facing={-0.3} pose="cheer" look={LOOKS.hacker2} phase={0.5} reducedMotion={rm} />
        <Seagulls cfg={L.hackathons} count={2} reducedMotion={rm} />
        <JumpingFish cfg={L.hackathons} seed={fishSeeds[3]} reducedMotion={rm} />
      </NearCamera>

      {/* Contact: lighthouse keeper on rounds */}
      <NearCamera cfg={L.contact}>
        <Walker cfg={L.contact} center={[-1.2, -1.0]} radius={3.1} speed={0.25} look={LOOKS.keeper} phase={3} reducedMotion={rm} />
        <Seagulls cfg={L.contact} count={3} reducedMotion={rm} />
        <Crab cfg={L.contact} angle={0.9} reducedMotion={rm} />
        <JumpingFish cfg={L.contact} seed={fishSeeds[4]} reducedMotion={rm} />
      </NearCamera>
    </group>
  );
};
