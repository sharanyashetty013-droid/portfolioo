import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';
import { ambience } from '../ambience';

const PER_ISLAND = 28;

// soft round glow sprite, generated once
function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,220,0.8)');
  g.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Drifting fireflies above every island; they fade in at sunset and glow at night. */
export const Fireflies: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion }) => {
  const ref = useRef<THREE.Points>(null);
  const texture = useMemo(makeGlowTexture, []);

  const { geo, seeds } = useMemo(() => {
    const islands = Object.values(ISLAND_LAYOUT);
    const count = islands.length * PER_ISLAND;
    const pos = new Float32Array(count * 3);
    const seeds: { cx: number; cz: number; r: number; a: number; y: number; sp: number; ph: number }[] = [];
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    islands.forEach((isl) => {
      for (let i = 0; i < PER_ISLAND; i++) {
        seeds.push({
          cx: isl.position[0],
          cz: isl.position[2],
          r: 1.5 + rnd() * (isl.radius - 2),
          a: rnd() * Math.PI * 2,
          y: isl.height + 0.6 + rnd() * 3.2,
          sp: (0.08 + rnd() * 0.18) * (rnd() > 0.5 ? 1 : -1),
          ph: rnd() * 10,
        });
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo, seeds };
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const strength = Math.min(1, ambience.night + ambience.sunset * 0.35);
    ref.current.visible = strength > 0.02;
    if (!ref.current.visible) return;
    const m = ref.current.material as THREE.PointsMaterial;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    m.opacity = strength * (0.75 + Math.sin(t * 3.1) * 0.15);
    const arr = geo.attributes.position.array as Float32Array;
    seeds.forEach((f, i) => {
      const a = f.a + t * f.sp;
      const wob = Math.sin(t * 1.3 + f.ph) * 0.6;
      arr[i * 3] = f.cx + Math.cos(a) * (f.r + wob);
      arr[i * 3 + 1] = f.y + Math.sin(t * 0.9 + f.ph) * 0.5;
      arr[i * 3 + 2] = f.cz + Math.sin(a) * (f.r + wob);
    });
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={texture}
        color="#E9FF8A"
        size={0.7}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
