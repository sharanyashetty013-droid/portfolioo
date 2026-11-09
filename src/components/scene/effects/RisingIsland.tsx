import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';
import type { SectionId } from '../../../types/portfolio';
import { riseRaw, riseEase } from '../introTimeline';
import { createGlowMaterial, glowGeometry, seeded } from './glowPoints';

const SPRAY = 220;

// Sheet of water pouring down the cliffs as the island breaks the surface
const pourVert = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const pourFrag = `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float streak = sin(vUv.x * 160.0 + sin(vUv.x * 23.0) * 3.0);
  float flow = fract(vUv.y * 3.0 + uTime * 1.8 + sin(vUv.x * 40.0) * 0.2);
  float a = smoothstep(0.2, 1.0, streak) * 0.5 + 0.35;
  a *= smoothstep(0.0, 0.25, flow) * (0.6 + 0.4 * vUv.y);
  gl_FragColor = vec4(vec3(0.92, 1.0, 0.98), a * uOpacity);
}
`;

/**
 * Wraps an island so it starts below the sea and rises during the intro:
 * overshoots slightly and settles, with water pouring off its edges and
 * spray thrown out around the rim.
 */
export const RisingIsland: React.FC<{ id: SectionId; reducedMotion?: boolean; children: React.ReactNode }> = ({
  id,
  reducedMotion,
  children,
}) => {
  const cfg = ISLAND_LAYOUT[id];
  const group = useRef<THREE.Group>(null);
  const pour = useRef<THREE.Mesh>(null);
  const spray = useRef<THREE.Points>(null);
  const depth = cfg.height + 7;

  const pourMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pourVert,
        fragmentShader: pourFrag,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const sprayMat = useMemo(() => createGlowMaterial({ attenuate: true, mode: 2, blending: THREE.NormalBlending }), []);
  const { sprayGeo, drops } = useMemo(() => {
    const rnd = seeded(cfg.seed);
    const drops = Array.from({ length: SPRAY }).map(() => ({
      a: rnd() * Math.PI * 2,
      out: 2.5 + rnd() * 5,
      up: 6 + rnd() * 9,
      delay: rnd() * 0.7,
      r: cfg.radius + 0.3 + rnd() * 0.8,
    }));
    const white = new THREE.Color('#F2FFFC');
    const geo = glowGeometry(
      new Array(SPRAY * 3).fill(0),
      drops.map(() => ({ size: 7 + rnd() * 7, phase: 0, speed: 0, color: white }))
    );
    return { sprayGeo: geo, drops };
  }, [cfg]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const x = reducedMotion ? 2 : riseRaw(id, t);
    const h = riseEase(x);
    if (group.current) {
      group.current.position.y = -depth * (1 - h);
      // a slight rocking as it shoulders up through the water
      const rock = x > 0 && x < 1 ? Math.sin(x * Math.PI * 3) * (1 - x) * 0.035 : 0;
      group.current.rotation.set(rock, 0, -rock * 0.7);
      group.current.visible = x > -0.05;
    }

    // water pouring off the cliffs: from the island's lip down to the sea
    const pourOn = x > 0.25 ? Math.min(1, (x - 0.25) * 4) * (1 - Math.min(1, Math.max(0, (x - 1.05) / 0.9))) : 0;
    if (pour.current) {
      pour.current.visible = pourOn > 0.01;
      const top = Math.max(0.05, cfg.height + 0.2 - depth * (1 - h));
      pour.current.scale.set(1, top, 1);
      pour.current.position.y = top / 2;
      pourMat.uniforms.uTime.value = t;
      pourMat.uniforms.uOpacity.value = pourOn * 1.0;
    }

    // spray thrown from the rim once it breaks the surface
    if (spray.current) {
      const st = (x - 0.3) * 1.9; // seconds since breaking the surface (roughly)
      spray.current.visible = st > 0 && st < 3;
      if (spray.current.visible) {
        const arr = sprayGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < SPRAY; i++) {
          const d = drops[i];
          const s = st - d.delay;
          if (s <= 0) {
            arr[i * 3 + 1] = -50;
            continue;
          }
          const rr = d.r + d.out * s;
          arr[i * 3] = cfg.position[0] + Math.cos(d.a) * rr;
          arr[i * 3 + 1] = Math.max(-1, d.up * s - 9.8 * s * s);
          arr[i * 3 + 2] = cfg.position[2] + Math.sin(d.a) * rr;
        }
        sprayGeo.attributes.position.needsUpdate = true;
        sprayMat.uniforms.uOpacity.value = Math.max(0, 1 - st / 3);
      }
    }
  });

  return (
    <>
      <group ref={group}>{children}</group>
      <mesh ref={pour} position={[cfg.position[0], 0, cfg.position[2]]} material={pourMat} visible={false} renderOrder={2}>
        <cylinderGeometry args={[cfg.radius + 0.35, cfg.radius + 0.6, 1, 40, 1, true]} />
      </mesh>
      <points ref={spray} geometry={sprayGeo} material={sprayMat} frustumCulled={false} visible={false} />
    </>
  );
};
