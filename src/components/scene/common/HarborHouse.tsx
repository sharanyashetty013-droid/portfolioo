import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { TimeOfDay } from '../timeOfDay';

// Harbormaster's office: board-and-batten walls, a tiled gable roof with a lookout
// cupola and flag, framed windows with shutters and flower boxes, a double door
// under a sign, a life ring, a ship's wheel on the gable and a lantern that glows
// at sunset and night. Built to match the Home cottage's level of detail.

const W = 3.4;
const D = 2.7;
const H = 2.2;
const BASE = 0.32;
const RISE = 1.2;
const OVER = 0.34;

const WALL = '#F4EEE2';
const BATTEN = '#E3D8C5';
const TRIM = '#2E7D8C';
const TRIM_DARK = '#25697A';
const ROOF = '#4F7C93';
const ROOF_DARK = '#426B80';
const WOOD = '#9A6B45';
const STONE = '#A7A39A';

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} roughness={0.8} flatShading {...(extra as object)} />
);

const gableGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(-D / 2, 0);
  s.lineTo(D / 2, 0);
  s.lineTo(0, RISE);
  s.lineTo(-D / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  return g;
})();

const signTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#FFF8E7';
  x.fillRect(0, 0, 512, 128);
  x.strokeStyle = '#25697A';
  x.lineWidth = 10;
  x.strokeRect(5, 5, 502, 118);
  x.fillStyle = '#0F4C5C';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = '900 64px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('HARBOR', 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const HouseWindow: React.FC<{ position: [number, number, number]; rotationY?: number; glass: THREE.Material; flowers: string }> = ({
  position,
  rotationY = 0,
  glass,
  flowers,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 0, 0.03]} castShadow>
      <boxGeometry args={[0.8, 0.92, 0.1]} />
      {std('#FFF6E6', { roughness: 0.6 })}
    </mesh>
    <mesh position={[0, 0, 0.085]} material={glass}>
      <planeGeometry args={[0.62, 0.74]} />
    </mesh>
    <mesh position={[0, 0, 0.1]}>
      <boxGeometry args={[0.62, 0.05, 0.03]} />
      {std('#FFF6E6')}
    </mesh>
    <mesh position={[0, 0, 0.1]}>
      <boxGeometry args={[0.05, 0.74, 0.03]} />
      {std('#FFF6E6')}
    </mesh>
    <mesh position={[0, -0.51, 0.12]} castShadow>
      <boxGeometry args={[0.92, 0.07, 0.22]} />
      {std('#FFF6E6')}
    </mesh>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.58, 0, 0.06]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.92, 0.05]} />
          {std(TRIM)}
        </mesh>
        {[-0.24, 0, 0.24].map((y) => (
          <mesh key={y} position={[0, y, 0.03]}>
            <boxGeometry args={[0.24, 0.04, 0.02]} />
            {std(TRIM_DARK)}
          </mesh>
        ))}
      </group>
    ))}
    <mesh position={[0, -0.65, 0.2]} castShadow>
      <boxGeometry args={[0.84, 0.2, 0.24]} />
      {std(WOOD)}
    </mesh>
    {[-0.3, -0.15, 0, 0.15, 0.3].map((x, i) => (
      <mesh key={x} position={[x, -0.5 + (i % 2) * 0.04, 0.22]} castShadow>
        <icosahedronGeometry args={[0.08, 0]} />
        {std(i % 2 ? flowers : '#5DB866')}
      </mesh>
    ))}
  </group>
);

export const HarborHouse: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  timeOfDay?: TimeOfDay;
  reducedMotion?: boolean;
}> = ({ position, rotation = [0, 0, 0], timeOfDay = 'day', reducedMotion = false }) => {
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3D6680', emissive: '#FFB54D', emissiveIntensity: 0, roughness: 0.15, metalness: 0.3 }),
    []
  );
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FFE3A3', emissive: '#FFC15A', emissiveIntensity: 0.3, toneMapped: false }), []);
  const sign = useMemo(() => (typeof document !== 'undefined' ? signTexture() : null), []);
  const glow = useRef(0);
  const lampLight = useRef<THREE.PointLight>(null);
  const flag = useRef<THREE.Mesh>(null);
  const target = timeOfDay === 'night' ? 1 : timeOfDay === 'sunset' ? 0.55 : 0;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    glow.current += (target - glow.current) * Math.min(1, delta * 1.5);
    const flicker = reducedMotion ? 1 : 0.94 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.03;
    glass.emissiveIntensity = glow.current * 2.2 * flicker;
    glass.color.set(glow.current > 0.3 ? '#FFD58A' : '#3D6680');
    lampMat.emissiveIntensity = 0.3 + glow.current * 3 * flicker;
    if (lampLight.current) lampLight.current.intensity = glow.current * 4 * flicker;
    if (flag.current && !reducedMotion) {
      flag.current.rotation.y = Math.sin(t * 3.1) * 0.25;
      flag.current.scale.x = 1 + Math.sin(t * 5.3) * 0.05;
    }
  });

  // vertical battens across every wall
  const battens = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    const nx = 9;
    const nz = 7;
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + (i / nx) * W;
      out.push({ pos: [x, BASE + H / 2, D / 2 + 0.03], size: [0.07, H, 0.05] });
      out.push({ pos: [x, BASE + H / 2, -D / 2 - 0.03], size: [0.07, H, 0.05] });
    }
    for (let i = 0; i <= nz; i++) {
      const z = -D / 2 + (i / nz) * D;
      out.push({ pos: [W / 2 + 0.03, BASE + H / 2, z], size: [0.05, H, 0.07] });
      out.push({ pos: [-W / 2 - 0.03, BASE + H / 2, z], size: [0.05, H, 0.07] });
    }
    return out;
  }, []);

  const slope = Math.atan2(RISE, D / 2);
  const slopeLen = Math.hypot(RISE, D / 2) + OVER;
  const tiles = useMemo(() => {
    const out: { z: number; y: number; side: number; dark: boolean }[] = [];
    const rows = 6;
    for (const side of [1, -1]) {
      for (let r = 0; r < rows; r++) {
        const dist = ((r + 0.5) / rows) * slopeLen;
        const nz = side * Math.sin(slope) * 0.16;
        const ny = Math.cos(slope) * 0.16;
        out.push({ z: side * Math.cos(slope) * dist + nz, y: BASE + H + RISE - Math.sin(slope) * dist + 0.06 + ny, side, dark: r % 2 === 1 });
      }
    }
    return out;
  }, [slope, slopeLen]);

  const ridgeY = BASE + H + RISE;

  return (
    <group position={position} rotation={rotation}>
      {/* stone footing with a few loose stones */}
      <mesh position={[0, BASE / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.3, BASE, D + 0.3]} />
        {std(STONE, { roughness: 0.95 })}
      </mesh>
      {[-1.4, -0.2, 1.1].map((x, i) => (
        <mesh key={x} position={[x, 0.1 + (i % 2) * 0.08, D / 2 + 0.17]} castShadow>
          <dodecahedronGeometry args={[0.15, 0]} />
          {std(i % 2 ? '#B8B4AB' : '#99958C', { roughness: 0.95 })}
        </mesh>
      ))}

      {/* walls + battens + teal corner posts */}
      <mesh position={[0, BASE + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        {std(WALL)}
      </mesh>
      {battens.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          {std(BATTEN)}
        </mesh>
      ))}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * (W / 2 + 0.04), BASE + H / 2, sz * (D / 2 + 0.04)]} castShadow>
          <boxGeometry args={[0.16, H + 0.02, 0.16]} />
          {std(TRIM)}
        </mesh>
      ))}
      {/* teal band under the eaves */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, BASE + H - 0.06, s * (D / 2 + 0.05)]}>
          <boxGeometry args={[W + 0.1, 0.12, 0.06]} />
          {std(TRIM)}
        </mesh>
      ))}

      {/* gables, with a ship's wheel on the side one */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={gableGeo} position={[s * (W / 2) - (s > 0 ? 0.12 : 0), BASE + H, 0]} castShadow>
          {std(WALL)}
        </mesh>
      ))}
      <group position={[W / 2 + 0.06, BASE + H + 0.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <torusGeometry args={[0.3, 0.035, 6, 20]} />
          {std(WOOD)}
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 10]} />
          {std('#7A4D32')}
        </mesh>
        {Array.from({ length: 8 }, (_, k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 4]}>
            <boxGeometry args={[0.04, 0.82, 0.04]} />
            {std(WOOD)}
          </mesh>
        ))}
      </group>

      {/* roof slabs, tile rows, seams, ridge */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, BASE + H + RISE / 2 + 0.04, s * (D / 4 + OVER / 4)]} rotation={[s * slope, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + OVER * 2, 0.14, slopeLen]} />
          {std(ROOF)}
        </mesh>
      ))}
      {tiles.map((t, i) => (
        <mesh key={i} position={[0, t.y, t.z]} rotation={[t.side * (slope + 0.1), 0, 0]} castShadow>
          <boxGeometry args={[W + OVER * 2 + 0.04, 0.1, slopeLen / 6 + 0.04]} />
          {std(t.dark ? ROOF_DARK : ROOF)}
        </mesh>
      ))}
      {tiles.map((t, i) =>
        Array.from({ length: 8 }).map((_, k) => (
          <mesh
            key={`seam-${i}-${k}`}
            position={[-(W / 2 + OVER) + (k + 0.5 + (i % 2) * 0.5) * ((W + OVER * 2) / 8.5), t.y + 0.03, t.z + t.side * 0.01]}
            rotation={[t.side * (slope + 0.1), 0, 0]}
          >
            <boxGeometry args={[0.03, 0.105, slopeLen / 6]} />
            {std(ROOF_DARK)}
          </mesh>
        ))
      )}
      <mesh position={[0, ridgeY + 0.17, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, W + OVER * 2 + 0.1, 8]} />
        {std(ROOF_DARK)}
      </mesh>

      {/* lookout cupola with glowing windows, little roof and a flag */}
      <group position={[-0.6, ridgeY - 0.05, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.8, 0.7, 0.8]} />
          {std(WALL)}
        </mesh>
        {[[0, 0.41], [0, -0.41], [0.41, 0], [-0.41, 0]].map(([x, z], k) => (
          <mesh key={k} position={[x, 0.5, z]} rotation={[0, x !== 0 ? Math.PI / 2 : 0, 0]} material={glass}>
            <planeGeometry args={[0.42, 0.36]} />
          </mesh>
        ))}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.42, 0.45, sz * 0.42]}>
            <boxGeometry args={[0.08, 0.72, 0.08]} />
            {std(TRIM)}
          </mesh>
        ))}
        <mesh position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.72, 0.6, 4]} />
          {std(ROOF)}
        </mesh>
        <mesh position={[0, 1.75, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
          {std('#475569')}
        </mesh>
        <mesh ref={flag} position={[0.24, 2.05, 0]}>
          <boxGeometry args={[0.46, 0.28, 0.02]} />
          {std('#F2765D')}
        </mesh>
      </group>

      {/* front: double door under the sign */}
      <group position={[-0.65, BASE, D / 2]}>
        <mesh position={[0, 0.95, 0.05]} castShadow>
          <boxGeometry args={[1.12, 1.95, 0.1]} />
          {std('#FFF6E6')}
        </mesh>
        {[-0.24, 0.24].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0.9, 0.11]}>
              <boxGeometry args={[0.44, 1.78, 0.06]} />
              {std(TRIM)}
            </mesh>
            <mesh position={[0, 1.3, 0.15]}>
              <boxGeometry args={[0.3, 0.5, 0.03]} />
              {std(TRIM_DARK)}
            </mesh>
            <mesh position={[0, 0.5, 0.15]}>
              <boxGeometry args={[0.3, 0.6, 0.03]} />
              {std(TRIM_DARK)}
            </mesh>
          </group>
        ))}
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.9, 0.17]}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color="#E9B949" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, -0.1 - i * 0.12, 0.33 + i * 0.26]} castShadow receiveShadow>
            <boxGeometry args={[1.4 + i * 0.2, 0.12, 0.3]} />
            {std(i ? '#99958C' : STONE, { roughness: 0.95 })}
          </mesh>
        ))}
        {/* sign board over the door */}
        {sign && (
          <mesh position={[0, 2.12, 0.1]}>
            <boxGeometry args={[1.5, 0.38, 0.06]} />
            <meshStandardMaterial attach="material-4" map={sign} roughness={0.6} />
            <meshStandardMaterial attach="material-0" color="#25697A" />
            <meshStandardMaterial attach="material-1" color="#25697A" />
            <meshStandardMaterial attach="material-2" color="#25697A" />
            <meshStandardMaterial attach="material-3" color="#25697A" />
            <meshStandardMaterial attach="material-5" color="#25697A" />
          </mesh>
        )}
        {/* lantern */}
        <group position={[0.78, 1.5, 0.16]} userData={{ noMerge: true }}>
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

      {/* life ring on the front wall */}
      <group position={[0.35, BASE + 1.0, D / 2 + 0.1]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2]} castShadow>
            <torusGeometry args={[0.26, 0.08, 8, 10, Math.PI / 2]} />
            {std(k % 2 ? '#FFFFFF' : '#E4614C', { roughness: 0.6 })}
          </mesh>
        ))}
      </group>

      {/* windows that glow at sunset and night */}
      <group userData={{ noMerge: true }}>
        <HouseWindow position={[1.05, BASE + 1.2, D / 2]} glass={glass} flowers="#F472B6" />
        <HouseWindow position={[W / 2, BASE + 1.15, -0.45]} rotationY={Math.PI / 2} glass={glass} flowers="#FDE047" />
        <HouseWindow position={[-W / 2, BASE + 1.15, 0.3]} rotationY={-Math.PI / 2} glass={glass} flowers="#C084FC" />
      </group>

      {/* rope coil + anchor by the side wall */}
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[-W / 2 - 0.45, 0.07 + k * 0.08, D / 2 - 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.24 - k * 0.04, 0.05, 6, 16]} />
          {std('#D9C29A')}
        </mesh>
      ))}
      <group position={[-W / 2 - 0.3, 0, -0.7]} rotation={[0, 0, 0.25]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
          {std('#475569', { metalness: 0.5, roughness: 0.5 })}
        </mesh>
        <mesh position={[0, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
          {std('#475569', { metalness: 0.5, roughness: 0.5 })}
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.28, 0.05, 6, 14, Math.PI]} />
          {std('#475569', { metalness: 0.5, roughness: 0.5 })}
        </mesh>
        <mesh position={[0, 1.12, 0]}>
          <torusGeometry args={[0.09, 0.03, 6, 12]} />
          {std('#475569', { metalness: 0.5, roughness: 0.5 })}
        </mesh>
      </group>
    </group>
  );
};
