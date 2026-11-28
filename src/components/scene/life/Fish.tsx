import React, { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A small, shiny, mackerel-like fish. Head points +X, length ~0.62.
// Smooth curved body with a dark striped back fading to a silver belly,
// forked tail, dorsal / pectoral / anal fins and glossy eyes.

const BODY_LEN = 0.62;

const bodyGeometry = (() => {
  // profile: radius along the length (tail at -x, nose at +x)
  const prof: [number, number][] = [
    [0.0, -0.31], [0.022, -0.3], [0.03, -0.26], [0.05, -0.18], [0.075, -0.08], [0.088, 0.02],
    [0.086, 0.1], [0.075, 0.18], [0.055, 0.24], [0.03, 0.29], [0.0, 0.31],
  ];
  // smooth the outline with a spline so the body has no flat bands
  const curve = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getPoints(48).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
  pts[0].x = 0;
  pts[pts.length - 1].x = 0;
  let g: THREE.BufferGeometry = new THREE.LatheGeometry(pts, 48, 0, Math.PI * 2);
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5); // close the seam so it shades smoothly
  g.rotateZ(-Math.PI / 2); // lathe axis y -> x (nose at +x)
  const p = g.attributes.position;
  const colors: number[] = [];
  const back = new THREE.Color('#1F4E63');
  const mid = new THREE.Color('#4F93A8');
  const belly = new THREE.Color('#E9EEF0');
  const stripe = new THREE.Color('#163A4A');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    // flatten side to side, deeper belly, slight hump on the back
    z *= 0.55;
    y *= 1.15;
    if (y > 0) y += 0.012 * Math.max(0, 1 - Math.abs(x + 0.02) / 0.25);
    // the nose is a bit pointier and lower
    if (x > 0.2) y -= (x - 0.2) * 0.12;
    p.setXYZ(i, x, y, z);
    // colour by height: dark back, blue sides, silver belly, wavy stripes on top
    const h = THREE.MathUtils.clamp((y + 0.09) / 0.2, 0, 1);
    if (h < 0.42) c.copy(belly).lerp(mid, THREE.MathUtils.smoothstep(h, 0.25, 0.42));
    else c.copy(mid).lerp(back, THREE.MathUtils.smoothstep(h, 0.42, 0.8));
    if (h > 0.55 && Math.sin(x * 70 + Math.sin(y * 60) * 1.5) > 0.55) c.lerp(stripe, 0.7);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
})();

const finShape = (pts: [number, number][]) => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i += 2) s.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  return new THREE.ShapeGeometry(s, 12);
};
// forked tail, drawn in the XY plane with its root at the origin, pointing -x
const TAIL = finShape([[0, 0.02], [-0.06, 0.05], [-0.13, 0.12], [-0.1, 0.04], [-0.08, 0], [-0.1, -0.04], [-0.13, -0.11], [-0.06, -0.05], [0, -0.02]]);
const DORSAL = finShape([[0.06, 0], [0.02, 0.07], [-0.07, 0.05], [-0.06, 0.02], [-0.09, 0]]);
const PECTORAL = finShape([[0, 0], [-0.03, 0.025], [-0.08, 0.01], [-0.05, -0.01], [0, 0]]);
const ANAL = finShape([[0.0, 0], [-0.02, -0.04], [-0.07, -0.035], [-0.06, -0.01], [-0.08, 0]]);

export const Fish = forwardRef<THREE.Group, { scale?: number; visible?: boolean; wiggle?: number }>(
  ({ scale = 1, visible = true, wiggle = 1 }, ref) => {
    const tail = useRef<THREE.Group>(null);
    const finMat = useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color: '#3D7F96',
          roughness: 0.35,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
          sheen: 1,
          sheenColor: new THREE.Color('#9FD6E6'),
        }),
      [],
    );
    useFrame((state) => {
      if (tail.current) tail.current.rotation.y = Math.sin(state.clock.elapsedTime * 22) * 0.45 * wiggle;
    });

    return (
      <group ref={ref} scale={scale} visible={visible}>
        <mesh geometry={bodyGeometry} castShadow>
          <meshPhysicalMaterial vertexColors roughness={0.22} metalness={0.35} clearcoat={1} clearcoatRoughness={0.15} iridescence={0.6} iridescenceIOR={1.4} />
        </mesh>
        {/* gill line */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.17, -0.005, s * 0.042]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
            <torusGeometry args={[0.055, 0.003, 4, 16, Math.PI * 0.9]} />
            <meshStandardMaterial color="#163A4A" roughness={0.5} />
          </mesh>
        ))}
        {/* eyes: gold ring, black pupil, white catchlight */}
        {[-1, 1].map((s) => (
          <group key={s} position={[0.235, 0.022, s * 0.033]} rotation={[0, s * 0.25, 0]}>
            <mesh scale={[1, 1, 0.5]}>
              <sphereGeometry args={[0.019, 14, 10]} />
              <meshPhysicalMaterial color="#D9B25A" roughness={0.2} clearcoat={1} />
            </mesh>
            <mesh position={[0, 0, s * 0.008]} scale={[1, 1, 0.5]}>
              <sphereGeometry args={[0.012, 12, 8]} />
              <meshPhysicalMaterial color="#050505" roughness={0.1} clearcoat={1} />
            </mesh>
            <mesh position={[0.004, 0.005, s * 0.0145]}>
              <sphereGeometry args={[0.0035, 6, 4]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>
        ))}
        {/* mouth */}
        <mesh position={[0.3, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.012, 0.0035, 4, 10, Math.PI]} />
          <meshStandardMaterial color="#163A4A" />
        </mesh>
        {/* fins */}
        <mesh geometry={DORSAL} material={finMat} position={[0.0, 0.09, 0]} />
        <mesh geometry={ANAL} material={finMat} position={[-0.08, -0.07, 0]} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={PECTORAL} material={finMat} position={[0.14, -0.03, s * 0.04]} rotation={[s * 0.5, s * 0.5, -0.3]} />
        ))}
        <group ref={tail} position={[-BODY_LEN / 2 + 0.01, 0, 0]}>
          <mesh geometry={TAIL} material={finMat} />
        </group>
      </group>
    );
  },
);
Fish.displayName = 'Fish';
