import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LowPolyChimneySmoke } from './LowPolyDecor';
import type { TimeOfDay } from '../timeOfDay';

// A cosy island cottage: stone footing, clapboard walls, a proper gabled roof with tile rows,
// framed windows with shutters and flower boxes, a covered porch, and a smoking chimney.
// Windows and the porch lamp glow warm at sunset and night.

const W = 3.8;   // width (x)
const D = 3.0;   // depth (z)
const H = 2.3;   // wall height
const BASE = 0.36;
const ROOF_RISE = 1.35;
const OVER = 0.38; // roof overhang

const WALL = '#8DB9DA';
const WALL_DARK = '#7AA8CB';
const TRIM = '#FFF6E6';
const ROOF = '#C9653E';
const ROOF_DARK = '#B2552F';
const WOOD = '#9A6B45';
const STONE = '#A7A39A';

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} roughness={0.8} flatShading {...(extra as object)} />
);

/** Triangle that closes each end of the roof */
const gableGeometry = (() => {
  const s = new THREE.Shape();
  s.moveTo(-D / 2, 0);
  s.lineTo(D / 2, 0);
  s.lineTo(0, ROOF_RISE);
  s.lineTo(-D / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  return g;
})();

const Window: React.FC<{ position: [number, number, number]; rotationY?: number; glass: THREE.Material; flowers: string }> = ({
  position,
  rotationY = 0,
  glass,
  flowers,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {/* frame */}
    <mesh position={[0, 0, 0.03]} castShadow>
      <boxGeometry args={[0.86, 1.0, 0.1]} />
      {std(TRIM, { roughness: 0.6 })}
    </mesh>
    {/* glass */}
    <mesh position={[0, 0, 0.085]} material={glass}>
      <planeGeometry args={[0.68, 0.82]} />
    </mesh>
    {/* cross bars */}
    <mesh position={[0, 0, 0.1]}>
      <boxGeometry args={[0.68, 0.05, 0.03]} />
      {std(TRIM)}
    </mesh>
    <mesh position={[0, 0, 0.1]}>
      <boxGeometry args={[0.05, 0.82, 0.03]} />
      {std(TRIM)}
    </mesh>
    {/* sill */}
    <mesh position={[0, -0.55, 0.12]} castShadow>
      <boxGeometry args={[1.0, 0.07, 0.22]} />
      {std(TRIM)}
    </mesh>
    {/* shutters */}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.62, 0, 0.06]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 1.0, 0.05]} />
          {std('#3F7E8C')}
        </mesh>
        {[-0.25, 0, 0.25].map((y) => (
          <mesh key={y} position={[0, y, 0.03]}>
            <boxGeometry args={[0.26, 0.04, 0.02]} />
            {std('#336C79')}
          </mesh>
        ))}
      </group>
    ))}
    {/* flower box */}
    <mesh position={[0, -0.7, 0.2]} castShadow>
      <boxGeometry args={[0.9, 0.2, 0.24]} />
      {std(WOOD)}
    </mesh>
    {[-0.32, -0.16, 0, 0.16, 0.32].map((x, i) => (
      <mesh key={x} position={[x, -0.55 + (i % 2) * 0.04, 0.22]} castShadow>
        <icosahedronGeometry args={[0.085, 0]} />
        {std(i % 2 ? flowers : '#5DB866')}
      </mesh>
    ))}
  </group>
);

export const Cottage: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  timeOfDay?: TimeOfDay;
  reducedMotion?: boolean;
}> = ({ position, rotation = [0, 0, 0], timeOfDay = 'day', reducedMotion = false }) => {
  // shared glowing materials, eased toward the current time of day
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3D6680', emissive: '#FFB54D', emissiveIntensity: 0, roughness: 0.15, metalness: 0.3 }),
    [],
  );
  const lampMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFE3A3', emissive: '#FFC15A', emissiveIntensity: 0.3, toneMapped: false }),
    [],
  );
  const glow = useRef(0);
  const lampLight = useRef<THREE.PointLight>(null);
  const target = timeOfDay === 'night' ? 1 : timeOfDay === 'sunset' ? 0.55 : 0;
  useFrame((state, delta) => {
    glow.current += (target - glow.current) * Math.min(1, delta * 1.5);
    const flicker = reducedMotion ? 1 : 0.94 + Math.sin(state.clock.elapsedTime * 7.3) * 0.03 + Math.sin(state.clock.elapsedTime * 13.1) * 0.03;
    glass.emissiveIntensity = glow.current * 2.2 * flicker;
    glass.color.set(glow.current > 0.3 ? '#FFD58A' : '#3D6680');
    lampMat.emissiveIntensity = 0.3 + glow.current * 3 * flicker;
    if (lampLight.current) lampLight.current.intensity = glow.current * 4 * flicker;
  });

  // horizontal clapboard lines on all four walls
  const boards = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [];
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = BASE + (r + 0.5) * (H / rows);
      const c = r % 2 ? WALL : WALL_DARK;
      out.push({ pos: [0, y - 0.1, D / 2 + 0.03], size: [W, 0.05, 0.06], color: c });
      out.push({ pos: [0, y - 0.1, -D / 2 - 0.03], size: [W, 0.05, 0.06], color: c });
      out.push({ pos: [W / 2 + 0.03, y - 0.1, 0], size: [0.06, 0.05, D], color: c });
      out.push({ pos: [-W / 2 - 0.03, y - 0.1, 0], size: [0.06, 0.05, D], color: c });
    }
    return out;
  }, []);

  // tile rows on each roof slope
  const slope = Math.atan2(ROOF_RISE, D / 2);
  const slopeLen = Math.hypot(ROOF_RISE, D / 2) + OVER;
  const tiles = useMemo(() => {
    const out: { z: number; y: number; side: number; dark: boolean }[] = [];
    const rows = 6;
    for (const side of [1, -1]) {
      for (let r = 0; r < rows; r++) {
        const along = (r + 0.5) / rows; // 0 at the ridge, 1 at the eave
        const dist = along * slopeLen;
        // sit each row on top of the slab (pushed out along the roof's normal)
        const nz = side * Math.sin(slope) * 0.16;
        const ny = Math.cos(slope) * 0.16;
        out.push({ z: side * Math.cos(slope) * dist + nz, y: BASE + H + ROOF_RISE - Math.sin(slope) * dist + 0.06 + ny, side, dark: r % 2 === 1 });
      }
    }
    return out;
  }, [slope, slopeLen]);

  return (
    <group position={position} rotation={rotation}>
      {/* stone footing */}
      <mesh position={[0, BASE / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.3, BASE, D + 0.3]} />
        {std(STONE, { roughness: 0.95 })}
      </mesh>
      {[-1.6, -0.6, 0.5, 1.5].map((x, i) => (
        <mesh key={x} position={[x, 0.12 + (i % 2) * 0.1, D / 2 + 0.17]} castShadow>
          <dodecahedronGeometry args={[0.16, 0]} />
          {std(i % 2 ? '#B8B4AB' : '#99958C', { roughness: 0.95 })}
        </mesh>
      ))}

      {/* walls */}
      <mesh position={[0, BASE + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        {std(WALL)}
      </mesh>
      {boards.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          {std(b.color)}
        </mesh>
      ))}
      {/* corner posts */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * (W / 2 + 0.03), BASE + H / 2, sz * (D / 2 + 0.03)]} castShadow>
          <boxGeometry args={[0.16, H + 0.02, 0.16]} />
          {std(TRIM)}
        </mesh>
      ))}

      {/* gables */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={gableGeometry} position={[s * (W / 2) - (s > 0 ? 0.12 : 0), BASE + H, 0]} castShadow>
          {std(WALL)}
        </mesh>
      ))}
      {/* round attic window in the side gable */}
      <mesh position={[W / 2 + 0.02, BASE + H + 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.24, 0.05, 6, 16]} />
        {std(TRIM)}
      </mesh>
      <mesh position={[W / 2 + 0.03, BASE + H + 0.5, 0]} rotation={[0, Math.PI / 2, 0]} material={glass}>
        <circleGeometry args={[0.21, 16]} />
      </mesh>

      {/* roof slabs */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[0, BASE + H + ROOF_RISE / 2 - 0.02 + 0.06, s * (D / 4 + OVER / 4)]}
          rotation={[s * slope, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W + OVER * 2, 0.14, slopeLen]} />
          {std(ROOF)}
        </mesh>
      ))}
      {/* tile rows */}
      {tiles.map((t, i) => (
        <mesh key={i} position={[0, t.y, t.z]} rotation={[t.side * (slope + 0.1), 0, 0]} castShadow>
          <boxGeometry args={[W + OVER * 2 + 0.04, 0.1, slopeLen / 6 + 0.04]} />
          {std(t.dark ? ROOF_DARK : ROOF)}
        </mesh>
      ))}
      {/* tile seams */}
      {tiles.map((t, i) =>
        Array.from({ length: 9 }).map((_, k) => (
          <mesh
            key={`${i}-${k}`}
            position={[-(W / 2 + OVER) + (k + 0.5 + (i % 2) * 0.5) * ((W + OVER * 2) / 9.5), t.y + 0.03, t.z + t.side * 0.01]}
            rotation={[t.side * (slope + 0.1), 0, 0]}
          >
            <boxGeometry args={[0.03, 0.105, slopeLen / 6]} />
            {std(ROOF_DARK)}
          </mesh>
        )),
      )}
      {/* ridge */}
      <mesh position={[0, BASE + H + ROOF_RISE + 0.17, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, W + OVER * 2 + 0.1, 8]} />
        {std(ROOF_DARK)}
      </mesh>

      {/* chimney */}
      <group position={[1.05, BASE + H + 0.6, -0.65]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 1.8, 0.55]} />
          {std(STONE, { roughness: 0.95 })}
        </mesh>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.7, 0.14, 0.7]} />
          {std('#8F8B82')}
        </mesh>
        <group userData={{ noMerge: true }}>
          <LowPolyChimneySmoke position={[0, 1.05, 0]} reducedMotion={reducedMotion} />
        </group>
      </group>

      {/* front: door with frame, knob and a small porch roof */}
      <group position={[-0.85, BASE, D / 2]}>
        <mesh position={[0, 0.95, 0.05]} castShadow>
          <boxGeometry args={[1.0, 1.95, 0.1]} />
          {std(TRIM)}
        </mesh>
        <mesh position={[0, 0.9, 0.11]}>
          <boxGeometry args={[0.8, 1.78, 0.06]} />
          {std('#8B5A3C')}
        </mesh>
        {[0.45, 1.25].map((y) => (
          <mesh key={y} position={[0, y, 0.15]}>
            <boxGeometry args={[0.66, 0.5, 0.03]} />
            {std('#7A4D32')}
          </mesh>
        ))}
        <mesh position={[0.28, 0.9, 0.17]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color="#E9B949" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* steps */}
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, -0.1 - i * 0.14, 0.35 + i * 0.28]} castShadow receiveShadow>
            <boxGeometry args={[1.3 + i * 0.2, 0.14, 0.32]} />
            {std(i ? '#99958C' : STONE, { roughness: 0.95 })}
          </mesh>
        ))}
        {/* porch roof on two posts */}
        <mesh position={[0, 2.25, 0.55]} rotation={[0.32, 0, 0]} castShadow>
          <boxGeometry args={[1.6, 0.1, 1.05]} />
          {std(ROOF)}
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, 1.05, 0.95]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 2.1, 8]} />
            {std(WOOD)}
          </mesh>
        ))}
        {/* porch lamp */}
        <group position={[0.68, 1.55, 0.16]} userData={{ noMerge: true }}>
          <pointLight ref={lampLight} position={[0, -0.1, 0.4]} color="#FFB54D" intensity={0} distance={6} decay={1.6} />
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.18, 0.05, 0.18]} />
            {std('#2B2F36')}
          </mesh>
          <mesh material={lampMat}>
            <boxGeometry args={[0.13, 0.22, 0.13]} />
          </mesh>
        </group>
      </group>

      {/* windows (they glow at sunset and night) */}
      <group userData={{ noMerge: true }}>
        <Window position={[0.85, BASE + 1.25, D / 2]} glass={glass} flowers="#F472B6" />
        <Window position={[W / 2, BASE + 1.25, 0.2]} rotationY={Math.PI / 2} glass={glass} flowers="#FDE047" />
        <Window position={[-W / 2, BASE + 1.25, -0.2]} rotationY={-Math.PI / 2} glass={glass} flowers="#F472B6" />
      </group>

      {/* firewood stack by the side wall */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2 - r].map((c) => (
          <mesh key={`${r}-${c}`} position={[-W / 2 - 0.35, 0.14 + r * 0.2, D / 2 - 0.5 - c * 0.22 - r * 0.11]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.6, 7]} />
            {std(c % 2 ? '#8A5A36' : '#9C6A42')}
          </mesh>
        )),
      )}
    </group>
  );
};
