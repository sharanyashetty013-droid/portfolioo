import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ISLAND_LAYOUT, IslandConfig } from '../../../constants/islandLayout';
import type { TimeOfDay } from '../timeOfDay';

// ---------------------------------------------------------------------------
// Dolphins: a small pod that leaps in arcs near an island every few seconds
// ---------------------------------------------------------------------------
// Built once and shared by every dolphin: a smooth lathe body with countershading,
// a swept-back dorsal fin, side flippers and a crescent tail fluke.
const DOLPHIN_DARK = new THREE.Color('#4F6F8F');
const DOLPHIN_LIGHT = new THREE.Color('#E3EBF2');

const DOLPHIN = (() => {
  // body profile from tail (y = -1) to beak tip (y = 1); radius per point
  const prof: [number, number][] = [
    [0.0, -1.0], [0.045, -0.95], [0.07, -0.8], [0.12, -0.55], [0.19, -0.28], [0.235, -0.02],
    [0.24, 0.18], [0.215, 0.4], [0.17, 0.58], [0.12, 0.7], [0.075, 0.78], [0.05, 0.88],
    [0.035, 0.96], [0.0, 1.0],
  ];
  // run a smooth curve through the profile so the body has no hard rings
  const curve = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  const body = new THREE.LatheGeometry(curve.getPoints(60), 28);
  body.rotateZ(-Math.PI / 2); // nose points along +x
  body.scale(1, 1, 0.9);       // a little narrower side to side
  const paint = (g: THREE.BufferGeometry, f: (p: THREE.Vector3) => THREE.Color) => {
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const c = f(v);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  // dark back, pale belly, with a soft line between
  paint(body, (p) => DOLPHIN_LIGHT.clone().lerp(DOLPHIN_DARK, THREE.MathUtils.smoothstep(p.y, -0.1, 0.1)));

  const fin = (shape: THREE.Shape, depth: number) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  // dorsal fin, curved and swept back
  const ds = new THREE.Shape();
  ds.moveTo(0.22, 0);
  ds.quadraticCurveTo(0.05, 0.12, -0.18, 0.36);
  ds.quadraticCurveTo(-0.12, 0.14, -0.26, 0);
  ds.lineTo(0.22, 0);
  const dorsal = fin(ds, 0.04);
  dorsal.translate(-0.05, 0.2, 0);
  paint(dorsal, () => DOLPHIN_DARK);

  // flippers on each side, angled down and back
  const fs = new THREE.Shape();
  fs.moveTo(0, 0);
  fs.quadraticCurveTo(-0.08, -0.06, -0.3, -0.14);
  fs.quadraticCurveTo(-0.1, -0.02, 0.08, 0.02);
  fs.lineTo(0, 0);
  const flippers = [1, -1].map((side) => {
    const g = fin(fs, 0.025);
    g.rotateX(side * 0.9);
    g.translate(0.3, -0.1, side * 0.16);
    return paint(g, () => DOLPHIN_DARK);
  });

  // crescent tail fluke lying flat
  const ts = new THREE.Shape();
  ts.moveTo(0.06, 0);
  ts.quadraticCurveTo(-0.08, 0.18, -0.28, 0.36);
  ts.quadraticCurveTo(-0.14, 0.1, -0.12, 0);
  ts.quadraticCurveTo(-0.14, -0.1, -0.28, -0.36);
  ts.quadraticCurveTo(-0.08, -0.18, 0.06, 0);
  const fluke = fin(ts, 0.03);
  fluke.rotateX(Math.PI / 2);
  fluke.translate(-0.96, 0, 0);
  paint(fluke, () => DOLPHIN_DARK);

  // keep each part's own smooth normals when merging
  const toNI = (g: THREE.BufferGeometry) => {
    g.computeVertexNormals();
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute('uv');
    return n;
  };
  return mergeGeometries([body, dorsal, ...flippers, fluke].map(toNI))!;
})();

const DolphinMesh: React.FC = () => (
  <group>
    <mesh geometry={DOLPHIN} castShadow>
      <meshStandardMaterial vertexColors roughness={0.3} metalness={0.05} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[0.66, 0.05, s * 0.1]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshBasicMaterial color="#0E1620" />
      </mesh>
    ))}
  </group>
);

// a little burst of spray where a dolphin leaves or re-enters the water
const SPRAY = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + i;
  return { dx: Math.cos(a), dz: Math.sin(a), up: 1.8 + (i % 3) * 0.6, size: 0.06 + (i % 4) * 0.025 };
});

const DolphinPod: React.FC<{ cfg: IslandConfig; seed: number; reducedMotion?: boolean }> = ({ cfg, seed, reducedMotion }) => {
  const dolphins = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const sprays = useRef<(THREE.Group | null)[]>([]);
  const PERIOD = 9 + (seed % 4);
  const JUMP = 1.6; // seconds in the air
  const pod = useRef({ x: 0, z: 0, dir: 0, cycle: -1 });
  // the side of the island the camera looks at, so the leaps are actually seen
  const facing = Math.atan2(cfg.cameraPos[2] - cfg.position[2], cfg.cameraPos[0] - cfg.position[0]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + seed * 2.3;
    const cycle = Math.floor(t / PERIOD);
    if (cycle !== pod.current.cycle) {
      const rnd = Math.sin(cycle * 12.9898 + seed * 78.233) * 43758.5453;
      const f = rnd - Math.floor(rnd);
      const a = facing + (f - 0.5) * 1.8;
      const d = cfg.radius + 5 + f * 5;
      pod.current = { x: Math.cos(a) * d, z: Math.sin(a) * d, dir: a + (cycle % 2 ? Math.PI / 2 : -Math.PI / 2), cycle };
    }
    const local = t - cycle * PERIOD;
    const { x, z, dir } = pod.current;
    for (let i = 0; i < 3; i++) {
      const g = dolphins.current[i];
      const ring = rings.current[i];
      if (!g || !ring) continue;
      if (reducedMotion) { g.visible = false; ring.visible = false; continue; }
      const start = i * 0.45; // staggered leaps
      const k = (local - start) / JUMP;
      const side = (i - 1) * 1.6;
      const ox = x + Math.cos(dir + Math.PI / 2) * side;
      const oz = z + Math.sin(dir + Math.PI / 2) * side;
      g.visible = k >= 0 && k <= 1;
      if (g.visible) {
        const along = (k - 0.5) * 6;
        const y = Math.sin(k * Math.PI) * 2.2 - 0.25;
        g.position.set(ox + Math.cos(dir) * along, y, oz + Math.sin(dir) * along);
        // nose follows the arc: up on the way out, down on the way in
        g.rotation.set(Math.sin(k * Math.PI * 2) * 0.08, -dir, Math.cos(k * Math.PI) * 1.0);
      }
      // spray bursts as it leaves the water and as it dives back in
      const sp = sprays.current[i];
      if (sp) {
        const exitT = local - start;
        const entryT = local - start - JUMP;
        const burst = exitT >= 0 && exitT < 0.7 ? { t: exitT, along: -3 } : entryT >= 0 && entryT < 0.7 ? { t: entryT, along: 3 } : null;
        sp.visible = !!burst;
        if (burst) {
          sp.position.set(ox + Math.cos(dir) * burst.along, 0, oz + Math.sin(dir) * burst.along);
          sp.children.forEach((c, k) => {
            const d = SPRAY[k];
            const tt = burst.t;
            c.position.set(d.dx * tt * 1.1, Math.max(0, d.up * tt - 4.9 * tt * tt), d.dz * tt * 1.1);
            c.scale.setScalar(d.size * (1 - tt / 0.7) * 10);
          });
        }
      }
      // splash where it dives back in
      const s = local - start - JUMP;
      ring.visible = s > 0 && s < 1.4;
      if (ring.visible) {
        ring.position.set(ox + Math.cos(dir) * 3, 0.08, oz + Math.sin(dir) * 3);
        ring.scale.setScalar(0.4 + s * 1.6);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - s / 1.4);
      }
    }
  });

  return (
    <group position={[cfg.position[0], 0, cfg.position[2]]}>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          <group ref={(el) => { dolphins.current[i] = el; }} visible={false} scale={1.1 - i * 0.12}>
            <DolphinMesh />
          </group>
          <group ref={(el) => { sprays.current[i] = el; }} visible={false}>
            {SPRAY.map((_, k) => (
              <mesh key={k}>
                <sphereGeometry args={[0.1, 8, 6]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.85} roughness={0.2} />
              </mesh>
            ))}
          </group>
          <mesh ref={(el) => { rings.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0.6, 0.85, 24]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} depthWrite={false} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Lighthouse on a small rock; its lamp and sweeping beam turn on at sunset and night
// ---------------------------------------------------------------------------
const Lighthouse: React.FC<{ position: [number, number, number]; timeOfDay: TimeOfDay; reducedMotion?: boolean }> = ({
  position,
  timeOfDay,
  reducedMotion,
}) => {
  const beam = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uStrength: { value: 0 }, uColor: { value: new THREE.Color('#FFE3A0') } },
        vertexShader: `
          varying float vAlong;
          varying float vFacing;
          void main() {
            vAlong = position.y / 18.0 + 0.5;           // 1 at the lamp, 0 at the far end
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            vFacing = abs(dot(n, normalize(-mv.xyz)));  // soft edges when seen side-on
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform float uStrength;
          uniform vec3 uColor;
          varying float vAlong;
          varying float vFacing;
          void main() {
            float a = pow(clamp(vAlong, 0.0, 1.0), 2.2) * pow(vFacing, 1.4) * uStrength;
            gl_FragColor = vec4(uColor * a, a);
          }`,
      }),
    [],
  );
  const light = useRef<THREE.PointLight>(null);
  const on = useRef(0);
  const target = timeOfDay === 'day' ? 0 : 1;

  useFrame((state, delta) => {
    on.current += (target - on.current) * Math.min(1, delta * 1.5);
    if (beam.current && !reducedMotion) beam.current.rotation.y = state.clock.elapsedTime * 0.8;
    if (lamp.current) lamp.current.emissiveIntensity = 0.15 + on.current * 2.4;
    beamMat.uniforms.uStrength.value = on.current * 0.5;
    if (beam.current) beam.current.visible = on.current > 0.02;
    if (light.current) light.current.intensity = on.current * 6;
  });

  const stripes = [
    { y: 1.2, h: 1.4, r1: 0.95, r2: 1.1, c: '#FFFFFF' },
    { y: 2.6, h: 1.4, r1: 0.82, r2: 0.95, c: '#E0473A' },
    { y: 4.0, h: 1.4, r1: 0.7, r2: 0.82, c: '#FFFFFF' },
    { y: 5.4, h: 1.4, r1: 0.6, r2: 0.7, c: '#E0473A' },
  ];

  return (
    <group position={position}>
      {/* rock */}
      <mesh position={[0, -0.6, 0]} scale={[2.6, 1.2, 2.3]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8C8379" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[1.6, -0.4, 1.2]} scale={[1.1, 0.7, 1]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#9A9086" roughness={0.95} flatShading />
      </mesh>
      {/* tower */}
      {stripes.map((s) => (
        <mesh key={s.y} position={[0, s.y, 0]} castShadow>
          <cylinderGeometry args={[s.r1, s.r2, s.h, 20]} />
          <meshStandardMaterial color={s.c} roughness={0.6} />
        </mesh>
      ))}
      {/* gallery */}
      <mesh position={[0, 6.15, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.12, 24]} />
        <meshStandardMaterial color="#2B2F36" roughness={0.5} />
      </mesh>
      {/* lamp room */}
      <mesh position={[0, 6.6, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.8, 16]} />
        <meshStandardMaterial ref={lamp} color="#FFE6A3" emissive="#FFC94D" emissiveIntensity={0.15} roughness={0.2} toneMapped={false} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 7.3, 0]} castShadow>
        <coneGeometry args={[0.7, 0.7, 20]} />
        <meshStandardMaterial color="#E0473A" roughness={0.5} />
      </mesh>
      <mesh position={[0, 7.75, 0]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#2B2F36" />
      </mesh>
      <pointLight ref={light} position={[0, 6.6, 0]} color="#FFD27A" intensity={0} distance={30} decay={1.4} />
      {/* sweeping beam (two opposite cones) */}
      <group ref={beam} position={[0, 6.6, 0]} visible={false}>
        {[0, Math.PI].map((a) => (
          <mesh key={a} rotation={[0, a, Math.PI / 2]} position={[Math.cos(a) * 9, 0, -Math.sin(a) * 9]} material={beamMat}>
            <coneGeometry args={[1.8, 18, 24, 8, true]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// A small sailboat drifting far out on the horizon
// ---------------------------------------------------------------------------
const DistantSailboat: React.FC<{ from: [number, number]; to: [number, number]; duration: number; offset?: number }> = ({
  from,
  to,
  duration,
  offset = 0,
}) => {
  const boat = useRef<THREE.Group>(null);
  const sail = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, 3.2);
    shape.quadraticCurveTo(1.2, 1.4, 1.9, 0);
    shape.lineTo(0, 0);
    return new THREE.ShapeGeometry(shape, 12);
  }, []);
  const heading = Math.atan2(to[1] - from[1], to[0] - from[0]);

  useFrame((state) => {
    if (!boat.current) return;
    const t = ((state.clock.elapsedTime + offset) % duration) / duration;
    // go there and back so it never pops
    const k = t < 0.5 ? t * 2 : 2 - t * 2;
    boat.current.position.set(from[0] + (to[0] - from[0]) * k, Math.sin(state.clock.elapsedTime * 1.2) * 0.08, from[1] + (to[1] - from[1]) * k);
    boat.current.rotation.set(Math.sin(state.clock.elapsedTime * 0.9) * 0.04, -heading + (t < 0.5 ? 0 : Math.PI), Math.sin(state.clock.elapsedTime * 1.1) * 0.05);
  });

  return (
    <group ref={boat} scale={1.4}>
      <mesh position={[0, 0.2, 0]} scale={[1.6, 0.35, 0.6]} castShadow>
        <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#8B5A3C" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 0.55, 1]}>
        <circleGeometry args={[1, 20]} />
        <meshStandardMaterial color="#C79A6B" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 3.4, 8]} />
        <meshStandardMaterial color="#5A3A26" />
      </mesh>
      <mesh geometry={sail} position={[0.08, 0.35, 0]}>
        <meshStandardMaterial color="#FFF7EA" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.65, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.15, 0.4, 3]} />
        <meshStandardMaterial color="#F2765D" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
export const SeaLife: React.FC<{ timeOfDay: TimeOfDay; reducedMotion?: boolean }> = ({ timeOfDay, reducedMotion }) => (
  <group>
    <DolphinPod cfg={ISLAND_LAYOUT.home} seed={3} reducedMotion={reducedMotion} />
    <DolphinPod cfg={ISLAND_LAYOUT.skills} seed={7} reducedMotion={reducedMotion} />
    <DolphinPod cfg={ISLAND_LAYOUT.hackathons} seed={11} reducedMotion={reducedMotion} />
    {/* between Home and Skills, off the sailing route */}
    <Lighthouse position={[26, 0, -6]} timeOfDay={timeOfDay} reducedMotion={reducedMotion} />
    <DistantSailboat from={[-70, -30]} to={[-40, -75]} duration={160} />
    <DistantSailboat from={[95, -150]} to={[100, -110]} duration={200} offset={60} />
  </group>
);
