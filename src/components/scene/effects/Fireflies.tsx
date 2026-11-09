import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';
import { ambience } from '../ambience';
import { createGlowMaterial, glowGeometry, seeded } from './glowPoints';

const PER_ISLAND = 18;
const TINTS = ['#F4FF8A', '#FFE88A', '#D9FF7A'].map((c) => new THREE.Color(c));

/**
 * Fireflies hovering low over each island. Each one blinks on and off on its own
 * rhythm and drifts in a small lazy loop. Fade in at sunset, full glow at night.
 */
export const Fireflies: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion }) => {
  const ref = useRef<THREE.Points>(null);
  const material = useMemo(() => createGlowMaterial({ attenuate: true, mode: 1 }), []);

  const { geo, flies } = useMemo(() => {
    const rnd = seeded(11);
    const flies: { cx: number; cz: number; r: number; a: number; y: number; sp: number; ph: number }[] = [];
    const per: { size: number; phase: number; speed: number; color: THREE.Color }[] = [];
    Object.values(ISLAND_LAYOUT).forEach((isl) => {
      for (let i = 0; i < PER_ISLAND; i++) {
        flies.push({
          cx: isl.position[0],
          cz: isl.position[2],
          r: 2 + rnd() * (isl.radius - 3.5),
          a: rnd() * Math.PI * 2,
          y: isl.height + 0.5 + rnd() * 1.8,
          sp: (0.05 + rnd() * 0.1) * (rnd() > 0.5 ? 1 : -1),
          ph: rnd() * 10,
        });
        per.push({ size: 7 + rnd() * 5, phase: rnd() * Math.PI * 2, speed: 1.2 + rnd() * 1.8, color: TINTS[i % TINTS.length] });
      }
    });
    return { geo: glowGeometry(new Array(flies.length * 3).fill(0), per), flies };
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const strength = Math.min(1, ambience.night + ambience.sunset * 0.3);
    ref.current.visible = strength > 0.02;
    if (!ref.current.visible) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    material.uniforms.uTime.value = t;
    material.uniforms.uOpacity.value = strength;
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < flies.length; i++) {
      const f = flies[i];
      const a = f.a + t * f.sp;
      const r = f.r + Math.sin(t * 0.7 + f.ph) * 0.8;
      arr[i * 3] = f.cx + Math.cos(a) * r;
      arr[i * 3 + 1] = f.y + Math.sin(t * 1.1 + f.ph) * 0.35;
      arr[i * 3 + 2] = f.cz + Math.sin(a) * r;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={material} frustumCulled={false} />;
};
