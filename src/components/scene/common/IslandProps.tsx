import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

type V3 = [number, number, number];

const flat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} roughness={0.8} flatShading {...(extra as object)} />
);

// ---------------------------------------------------------------------------
// Flower bush: leafy low-poly blob dotted with blossoms
// ---------------------------------------------------------------------------
export const FlowerBush: React.FC<{ position: V3; color?: string; scale?: number }> = ({
  position,
  color = '#F472B6',
  scale = 1,
}) => {
  const blossoms = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + i;
        return [Math.cos(a) * 0.42, 0.45 + (i % 3) * 0.12, Math.sin(a) * 0.42] as V3;
      }),
    []
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.32, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.55, 0]} />
        {flat('#4FA65A')}
      </mesh>
      <mesh position={[0.35, 0.22, 0.2]} castShadow>
        <icosahedronGeometry args={[0.35, 0]} />
        {flat('#5DB866')}
      </mesh>
      {blossoms.map((p, i) => (
        <mesh key={i} position={p}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Lamp post with glowing lantern (emissive only, no extra light cost)
// ---------------------------------------------------------------------------
export const LampPost: React.FC<{ position: V3; glow?: string }> = ({ position, glow = '#FDE68A' }) => (
  <group position={position}>
    <mesh position={[0, 0.08, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.25, 0.16, 6]} />
      {flat('#475569')}
    </mesh>
    <mesh position={[0, 1.1, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.07, 2.0, 6]} />
      {flat('#334155')}
    </mesh>
    <mesh position={[0, 2.2, 0]}>
      <boxGeometry args={[0.28, 0.32, 0.28]} />
      <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.4} roughness={0.3} />
    </mesh>
    <mesh position={[0, 2.43, 0]} castShadow>
      <coneGeometry args={[0.26, 0.2, 4]} />
      {flat('#334155')}
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Campfire with flickering flames and log seats
// ---------------------------------------------------------------------------
export const Campfire: React.FC<{ position: V3; reducedMotion?: boolean }> = ({ position, reducedMotion }) => {
  const flames = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (reducedMotion || !flames.current) return;
    const t = state.clock.elapsedTime;
    flames.current.children.forEach((c, i) => {
      const s = 0.85 + Math.sin(t * (9 + i * 2.3) + i) * 0.18;
      c.scale.set(s, 0.9 + Math.sin(t * (7 + i) + i * 2) * 0.25, s);
    });
    if (light.current) light.current.intensity = 2.2 + Math.sin(t * 13) * 0.4 + Math.sin(t * 7.3) * 0.3;
  });
  return (
    <group position={position}>
      {/* stone ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55]} castShadow>
            <dodecahedronGeometry args={[0.13, 0]} />
            {flat('#94A3B8')}
          </mesh>
        );
      })}
      {/* crossed logs */}
      {[0.5, -0.5].map((r) => (
        <mesh key={r} position={[0, 0.12, 0]} rotation={[0, r, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.8, 6]} />
          {flat('#7C4A2D')}
        </mesh>
      ))}
      <group ref={flames} position={[0, 0.22, 0]} userData={{ noMerge: true }}>
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.24, 0.6, 5]} />
          <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={1.6} flatShading />
        </mesh>
        <mesh position={[0.08, 0.16, 0.04]}>
          <coneGeometry args={[0.14, 0.42, 5]} />
          <meshStandardMaterial color="#FDE047" emissive="#FDE047" emissiveIntensity={1.8} flatShading />
        </mesh>
        <mesh position={[-0.1, 0.12, -0.05]}>
          <coneGeometry args={[0.12, 0.34, 5]} />
          <meshStandardMaterial color="#FB923C" emissive="#FB923C" emissiveIntensity={1.6} flatShading />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 0.8, 0]} color="#FB923C" intensity={2.2} distance={6} />
      {/* log benches */}
      {[0.4, 2.4, 4.3].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 1.35, 0.16, Math.sin(a) * 1.35]} rotation={[0, -a, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.95, 7]} />
          {flat('#9A6B45')}
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Bunting: string of triangle flags sagging between two points, swaying
// ---------------------------------------------------------------------------
const BUNTING_COLORS = ['#EF4444', '#F59E0B', '#1AA6A6', '#8B5CF6', '#10B981', '#F472B6'];
export const Bunting: React.FC<{ from: V3; to: V3; flags?: number; sag?: number; reducedMotion?: boolean }> = ({
  from,
  to,
  flags = 9,
  sag = 0.8,
  reducedMotion,
}) => {
  const group = useRef<THREE.Group>(null);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      out.push(p);
    }
    return out;
  }, [a, b, sag]);
  const rope = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts]);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;

  useFrame((state) => {
    if (reducedMotion || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((c, i) => {
      c.rotation.x = Math.sin(t * 2.4 + i * 0.7) * 0.25;
    });
  });

  return (
    <group userData={{ noMerge: true }}>
      <line>
        <primitive object={rope} attach="geometry" />
        <lineBasicMaterial color="#FFFDF7" />
      </line>
      <group ref={group}>
        {Array.from({ length: flags }).map((_, i) => {
          const t = (i + 0.5) / flags;
          const p = a.clone().lerp(b, t);
          p.y -= Math.sin(t * Math.PI) * sag;
          return (
            <group key={i} position={p} rotation={[0, yaw, 0]}>
              <mesh position={[0, -0.2, 0]} rotation={[0, Math.PI / 2, Math.PI]}>
                <coneGeometry args={[0.18, 0.4, 3]} />
                <meshStandardMaterial color={BUNTING_COLORS[i % BUNTING_COLORS.length]} side={THREE.DoubleSide} flatShading />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Gold trophy that floats and spins (Hackathons summit)
// ---------------------------------------------------------------------------
export const FloatingTrophy: React.FC<{ position: V3; reducedMotion?: boolean }> = ({ position, reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);
  const sparkles = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = t * 0.8;
      ref.current.position.y = position[1] + Math.sin(t * 1.5) * 0.25;
    }
    if (sparkles.current) {
      sparkles.current.rotation.y = -t * 1.2;
      sparkles.current.children.forEach((c, i) => {
        const s = 0.6 + Math.abs(Math.sin(t * 3 + i)) * 0.8;
        c.scale.setScalar(s);
      });
    }
  });
  const gold = { color: '#F5B82E', emissive: '#B7791F', emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.3 };
  return (
    <group ref={ref} position={position} userData={{ noMerge: true }}>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.25, 8]} />
        <meshStandardMaterial color="#1E293B" flatShading />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.18, 0.5, 8]} />
        <meshStandardMaterial {...gold} flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.18, 0.8, 10]} />
        <meshStandardMaterial {...gold} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.62, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.22, 0.06, 6, 12, Math.PI]} />
          <meshStandardMaterial {...gold} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.98, 0.42]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#1AA6A6" emissive="#1AA6A6" emissiveIntensity={0.8} flatShading />
      </mesh>
      <group ref={sparkles} position={[0, 0.9, 0]}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.2, Math.sin(i * 2) * 0.4, Math.sin(a) * 1.2]}>
              <octahedronGeometry args={[0.07, 0]} />
              <meshBasicMaterial color="#FEF3C7" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

const CraneHook: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion }) => {
  const line = useRef<THREE.Mesh>(null);
  const crate = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const drop = 3.0 + Math.sin(t * 0.7) * 0.9;
    if (line.current) {
      line.current.scale.y = drop;
      line.current.position.y = -drop / 2;
    }
    if (crate.current) {
      crate.current.position.y = -drop - 0.3;
      crate.current.rotation.y = Math.sin(t * 0.5) * 0.4;
    }
  });
  return (
    <>
      <mesh ref={line} position={[0, -1.5, 0]} scale={[1, 3, 1]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 4]} />
        <meshBasicMaterial color="#334155" />
      </mesh>
      <group ref={crate} position={[0, -3.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#C5935B" roughness={0.8} flatShading />
        </mesh>
      </group>
    </>
  );
};

// ---------------------------------------------------------------------------
// Construction crane with slewing jib and a bobbing crate on the hook
// ---------------------------------------------------------------------------
export const Crane: React.FC<{ position: V3; rotation?: number; reducedMotion?: boolean }> = ({
  position,
  rotation = 0,
  reducedMotion,
}) => {
  const jib = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !jib.current) return;
    jib.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.9;
  });
  const yellow = '#F5B82E';
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ noMerge: true }}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.4, 1.4]} />
        {flat('#64748B')}
      </mesh>
      {/* lattice mast */}
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
      <group ref={jib} position={[0, 6.3, 0]}>
        <mesh position={[1.6, 0, 0]} castShadow>
          <boxGeometry args={[5.4, 0.28, 0.32]} />
          {flat(yellow)}
        </mesh>
        <mesh position={[-1.4, -0.15, 0]} castShadow>
          <boxGeometry args={[0.8, 0.6, 0.7]} />
          {flat('#475569')}
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          {flat('#E4614C')}
        </mesh>
        <group position={[3.6, 0, 0]}>
          <CraneHook reducedMotion={reducedMotion} />
        </group>
      </group>
    </group>
  );

};

// ---------------------------------------------------------------------------
// Message in a bottle bobbing in the sea
// ---------------------------------------------------------------------------
export const BottleMessage: React.FC<{ position: V3; reducedMotion?: boolean }> = ({ position, reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 1.8) * 0.1;
    ref.current.rotation.set(Math.sin(t * 1.3) * 0.25, t * 0.2, Math.PI / 2 + Math.sin(t * 1.7) * 0.15);
  });
  return (
    <group ref={ref} position={position} userData={{ noMerge: true }}>
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.8, 8]} />
        <meshStandardMaterial color="#86EFAC" transparent opacity={0.7} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.18, 0.25, 8]} />
        <meshStandardMaterial color="#86EFAC" transparent opacity={0.7} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.09, 0.08, 0.12, 6]} />
        {flat('#A16207')}
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
        {flat('#FEF3C7')}
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Little study desk with a glowing laptop (Skills island)
// ---------------------------------------------------------------------------
export const StudyDesk: React.FC<{ position: V3; rotation?: number }> = ({ position, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.4, 0.08, 0.75]} />
      {flat('#B07A4F')}
    </mesh>
    {[[-0.62, -0.3], [0.62, -0.3], [-0.62, 0.3], [0.62, 0.3]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.35, z]} castShadow>
        <boxGeometry args={[0.07, 0.7, 0.07]} />
        {flat('#8D5A3B')}
      </mesh>
    ))}
    {/* laptop */}
    <mesh position={[0, 0.76, 0.08]}>
      <boxGeometry args={[0.6, 0.03, 0.4]} />
      {flat('#CBD5E1')}
    </mesh>
    <mesh position={[0, 0.95, -0.12]} rotation={[-0.3, 0, 0]}>
      <boxGeometry args={[0.6, 0.38, 0.03]} />
      {flat('#CBD5E1')}
    </mesh>
    <mesh position={[0, 0.95, -0.1]} rotation={[-0.3, 0, 0]}>
      <planeGeometry args={[0.52, 0.32]} />
      <meshStandardMaterial color="#0EA5E9" emissive="#38BDF8" emissiveIntensity={1.2} />
    </mesh>
    {/* book stack + mug */}
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0.48, 0.78 + i * 0.07, 0.1]} rotation={[0, i * 0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.06, 0.22]} />
        {flat(['#EF4444', '#1AA6A6', '#F59E0B'][i])}
      </mesh>
    ))}
    <mesh position={[-0.5, 0.82, 0.15]} castShadow>
      <cylinderGeometry args={[0.07, 0.06, 0.15, 8]} />
      {flat('#FFF8EB')}
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Wooden bench
// ---------------------------------------------------------------------------
export const Bench: React.FC<{ position: V3; rotation?: number }> = ({ position, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.5, 0.08, 0.5]} />
      {flat('#B07A4F')}
    </mesh>
    <mesh position={[0, 0.8, -0.22]} rotation={[-0.15, 0, 0]} castShadow>
      <boxGeometry args={[1.5, 0.35, 0.06]} />
      {flat('#B07A4F')}
    </mesh>
    {[-0.6, 0.6].map((x) => (
      <mesh key={x} position={[x, 0.22, 0]} castShadow>
        <boxGeometry args={[0.08, 0.45, 0.45]} />
        {flat('#475569')}
      </mesh>
    ))}
  </group>
);
