import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';
import { intro, introElapsed, MAP_HOLD, SWOOP } from '../introTimeline';
import type { TimeOfDay } from '../timeOfDay';

/** The opening flight path (same curve the camera follows in CameraController). */
export function introPath(t: number, out = new THREE.Vector3()) {
  const look = ISLAND_LAYOUT.home.targetPos;
  const end = ISLAND_LAYOUT.home.cameraPos;
  const sx = look[0] - 70, sy = 150, sz = look[2] + 150;
  const bx = look[0] - 95, by = 55, bz = look[2] + 60;
  const a = 1 - t;
  return out.set(
    sx * a * a + bx * 2 * a * t + end[0] * t * t,
    sy * a * a + by * 2 * a * t + end[1] * t * t,
    sz * a * a + bz * 2 * a * t + end[2] * t * t,
  );
}

// one cloud = a cluster of soft puffs, flat underneath and piled up on top
const CLOUD_GEO = new THREE.IcosahedronGeometry(1, 4);

/**
 * Real 3D clouds around the start of the opening flight. The camera begins inside them,
 * drifts forward, then dives down through the gaps to the sea. They fade out before Home.
 */
export const IntroClouds: React.FC<{ reducedMotion?: boolean; timeOfDay?: TimeOfDay }> = ({ reducedMotion, timeOfDay = 'day' }) => {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, metalness: 0, transparent: true, opacity: 1, depthWrite: false }),
    [],
  );
  // tint per time of day: white by day, peach at sunset, moonlit blue at night
  // clouds are mostly self-lit so they stay bright and soft, with a little shading from the sun
  const tint = timeOfDay === 'night' ? '#C9D4F0' : timeOfDay === 'sunset' ? '#FFE9DC' : '#FFFFFF';
  const glow = timeOfDay === 'night' ? '#7D8DB8' : timeOfDay === 'sunset' ? '#F7C9B4' : '#E6F1F7';
  mat.color.set(tint);
  mat.emissive.set(glow);
  mat.emissiveIntensity = 0.55;

  const puffs = useMemo(() => {
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const p = new THREE.Vector3();
    const out: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
    const cloud = (cx: number, cy: number, cz: number, size: number) => {
      const n = 14 + Math.floor(rnd() * 6);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2;
        const d = rnd() * size * 0.9;
        const r = size * (0.22 + rnd() * 0.26) * (1 - d / (size * 1.6));
        // puffs near the middle sit higher, so each cloud has a domed top and a flat base
        const lift = (1 - d / size) * size * 0.35;
        out.push({
          pos: [cx + Math.cos(a) * d * 1.4, cy + lift + r * 0.25, cz + Math.sin(a) * d],
          scale: [r * 1.15, r * 0.85, r],
        });
      }
    };
    // the camera starts inside this bank
    for (let i = 0; i < 6; i++) {
      introPath(0.02 + i * 0.03, p);
      cloud(p.x + (rnd() - 0.5) * 30, p.y - 6 + rnd() * 10, p.z + (rnd() - 0.5) * 30, 14 + rnd() * 6);
    }
    // banks on either side of the dive, with gaps to see the sea through
    [0.22, 0.3, 0.38, 0.46].forEach((t) => {
      introPath(t, p);
      [-1, 1].forEach((side) => cloud(p.x + side * (26 + rnd() * 14), p.y - 8 + rnd() * 8, p.z + (rnd() - 0.5) * 20, 12 + rnd() * 6));
    });
    return out;
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const e = introElapsed(state.clock.elapsedTime);
    const t = Math.min(1, e / (MAP_HOLD + SWOOP));
    const fade = reducedMotion || intro.skip ? 0 : 1 - THREE.MathUtils.smoothstep(t, 0.5, 0.78);
    mat.opacity = fade;
    group.current.visible = fade > 0.01;
    // clouds drift slowly so they feel alive while we're among them
    if (!reducedMotion) group.current.position.x = Math.sin(state.clock.elapsedTime * 0.15) * 2;
  });

  return (
    <group ref={group}>
      {puffs.map((pf, i) => (
        <mesh key={i} geometry={CLOUD_GEO} material={mat} position={pf.pos} scale={pf.scale} />
      ))}
    </group>
  );
};
