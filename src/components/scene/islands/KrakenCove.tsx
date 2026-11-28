import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LowPolyBoulder } from '../common/StyleRefDecor';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

type V3 = [number, number, number];

const cfg = ISLAND_LAYOUT.opensource;
export const CRASH_COVE = { pos: [cfg.position[0] + 17, 0, cfg.position[2] + 16] as V3, scale: 1.2 };

/** Lets the 2D label overlay (outside the Canvas) trigger the kraken */
export const crashCoveBus: { crash: () => void } = { crash: () => {} };

const flat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} roughness={0.8} flatShading {...(extra as object)} />
);
const sm = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const seg = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const pulse = (t: number, a: number, b: number, c: number, d: number) => seg(t, a, b) * (1 - seg(t, c, d));

// ---------------------------------------------------------------------------
// Timeline (seconds after the click)
// ---------------------------------------------------------------------------
const T = {
  churnEnd: 0.9, // water swirls, bubbles, ship shakes
  rise: [0.9, 1.9] as const, // tentacles burst out, head surfaces
  grab: [1.9, 2.5] as const, // tentacles curl over the ship
  slam: 2.5, // ship smashed
  burst: [2.5, 3.3] as const, // pieces thrown out
  wave: [3.3, 4.0] as const, // tentacles thrash
  sink: [4.0, 5.0] as const, // kraken goes back under
  rebuild: [5.0, 6.7] as const, // whirlpool pulls the pieces back together
  badge: [6.7, 7.1, 9.2, 9.8] as const,
  end: 9.8,
};

// ---------------------------------------------------------------------------
// Badge shown once the ship is whole again
// ---------------------------------------------------------------------------
const badgeTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d')!;
  const r = 70;
  x.fillStyle = 'rgba(255,255,255,0.96)';
  x.beginPath();
  x.moveTo(r, 10);
  x.arcTo(502, 10, 502, 150, r);
  x.arcTo(502, 150, 10, 150, r);
  x.arcTo(10, 150, 10, 10, r);
  x.arcTo(10, 10, 502, 10, r);
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = '#1AA6A6';
  x.stroke();
  // tick mark (no dot)
  x.strokeStyle = '#1AA6A6';
  x.lineWidth = 12;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(52, 82);
  x.lineTo(74, 104);
  x.lineTo(112, 56);
  x.stroke();
  x.fillStyle = '#0F4C5C';
  x.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('Data survived', 138, 76);
  x.fillStyle = '#3E6B73';
  x.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
  x.fillText('midsave crash test · PASS', 140, 116);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

// Soft round fade so the deep-water patch has no hard edge
const softDiscTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// Foam spiral for the whirlpool (transparent canvas)
const swirlTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(6,60,72,0.85)');
  g.addColorStop(0.55, 'rgba(10,90,100,0.45)');
  g.addColorStop(1, 'rgba(10,90,100,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(255,255,255,0.85)';
  x.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    x.beginPath();
    for (let i = 0; i <= 60; i++) {
      const k = i / 60;
      const a = arm * (Math.PI / 2) + k * Math.PI * 2.2;
      const rr = 14 + k * 104;
      const px = 128 + Math.cos(a) * rr;
      const py = 128 + Math.sin(a) * rr;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.lineWidth = 5;
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// ---------------------------------------------------------------------------
// One kraken tentacle: a chain of tapered segments bent along a curl
// ---------------------------------------------------------------------------
const SEGS = 24;
const TENT_LEN = 5.4;
const SEG_LEN = TENT_LEN / SEGS;
const radiusAt = (s: number) => 0.34 * (1 - s) + 0.05 * s;

const segGeos = Array.from({ length: SEGS }, (_, i) => {
  const s0 = i / SEGS;
  const s1 = (i + 1) / SEGS;
  return new THREE.CylinderGeometry(radiusAt(s1), radiusAt(s0), SEG_LEN * 1.15, 14, 1);
});
const suckerGeo = new THREE.SphereGeometry(1, 10, 8);
const tipGeo = new THREE.SphereGeometry(radiusAt(1), 10, 8);

const TENT_SKIN = new THREE.MeshStandardMaterial({ color: '#7B4AA8', roughness: 0.42, metalness: 0.05 });
const TENT_SUCKER = new THREE.MeshStandardMaterial({ color: '#F3C6DF', roughness: 0.45 });

interface TentacleHandle {
  /** e: 0 hidden under water .. 1 fully out; curl: 0 straight up .. 1 bent over onto the ship */
  pose: (e: number, curl: number, sway: number) => void;
}

const Tentacle = React.forwardRef<TentacleHandle, { base: THREE.Vector3; toward: THREE.Vector3 }>(({ base, toward }, ref) => {
  const segRefs = useRef<(THREE.Mesh | null)[]>([]);
  const suckRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tip = useRef<THREE.Mesh>(null);
  const u = useMemo(() => toward.clone().sub(base).setY(0).normalize(), [base, toward]);
  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), dir: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), n: new THREE.Vector3() }),
    []
  );

  React.useImperativeHandle(ref, () => ({
    pose: (e, curl, sway) => {
      // start below the surface and push up as it emerges
      let px = 0;
      let py = -TENT_LEN * (1 - e) - 0.2;
      let theta = 0;
      for (let i = 0; i < SEGS; i++) {
        const s = (i + 0.5) / SEGS;
        // the curl grows toward the tip; a travelling sway keeps it alive
        theta = curl * Math.PI * 1.15 * Math.pow(s, 1.3) + Math.sin(sway + s * 4) * 0.22 * s + Math.max(0, s - 0.8) * 4 * (0.6 + curl);
        const dx = Math.sin(theta) * SEG_LEN;
        const dy = Math.cos(theta) * SEG_LEN;
        const mx = px + dx / 2;
        const my = py + dy / 2;
        px += dx;
        py += dy;
        const m = segRefs.current[i];
        if (m) {
          tmp.p.copy(base).addScaledVector(u, mx);
          tmp.p.y += my;
          m.position.copy(tmp.p);
          tmp.dir.copy(u).multiplyScalar(Math.sin(theta));
          tmp.dir.y = Math.cos(theta);
          tmp.q.setFromUnitVectors(tmp.up, tmp.dir.normalize());
          m.quaternion.copy(tmp.q);
          m.visible = my > -0.6;
        }
        const sk = suckRefs.current[i];
        if (sk) {
          // suckers sit on the inside of the curl
          tmp.n.copy(u).multiplyScalar(Math.cos(theta));
          tmp.n.y = -Math.sin(theta);
          const r = radiusAt(s);
          sk.position.copy(base).addScaledVector(u, mx);
          sk.position.y += my;
          sk.position.addScaledVector(tmp.n, r * 0.85);
          sk.scale.set(r * 0.4, r * 0.4, r * 0.4);
          // alternate the two sucker rows either side of the centre line
          tmp.p.set(-u.z, 0, u.x).multiplyScalar((i % 2 ? 1 : -1) * r * 0.35);
          sk.position.add(tmp.p);
          sk.visible = my > -0.3;
        }
      }
      if (tip.current) {
        tip.current.position.copy(base).addScaledVector(u, px);
        tip.current.position.y += py;
        tmp.dir.copy(u).multiplyScalar(Math.sin(theta));
        tmp.dir.y = Math.cos(theta);
        tip.current.quaternion.setFromUnitVectors(tmp.up, tmp.dir.normalize());
        tip.current.visible = py > -0.3;
      }
    },
  }));

  return (
    <group>
      {segGeos.map((g, i) => (
        <mesh key={i} ref={(el) => { segRefs.current[i] = el; }} geometry={g} material={TENT_SKIN} castShadow visible={false} />
      ))}
      {segGeos.map((_, i) =>
        i > 1 ? (
          <mesh key={`s${i}`} ref={(el) => { suckRefs.current[i] = el; }} geometry={suckerGeo} material={TENT_SUCKER} visible={false} />
        ) : null
      )}
      <mesh ref={tip} geometry={tipGeo} material={TENT_SKIN} visible={false} />
    </group>
  );
});
Tentacle.displayName = 'Tentacle';

// ---------------------------------------------------------------------------
// The ship and its loose parts
// ---------------------------------------------------------------------------
type Piece = { home: THREE.Vector3; homeRot: THREE.Euler; out: THREE.Vector3; outRot: THREE.Euler; arc: number };
const SHIP_YAW = -0.5;
const SHIP_Y = -0.3; // hull sits in the water

export const KrakenCove: React.FC<{ isAnyModalOpen: boolean; reducedMotion?: boolean }> = ({ isAnyModalOpen, reducedMotion }) => {
  const ship = useRef<THREE.Group>(null);
  const pieceRefs = useRef<(THREE.Group | null)[]>([]);
  const tentRefs = useRef<(TentacleHandle | null)[]>([]);
  const head = useRef<THREE.Group>(null);
  const lids = useRef<(THREE.Mesh | null)[]>([]);
  const pupils = useRef<(THREE.Mesh | null)[]>([]);
  const swirl = useRef<THREE.Mesh>(null);
  const deep = useRef<THREE.Mesh>(null);
  const ripples = useRef<(THREE.Mesh | null)[]>([]);
  const drops = useRef<THREE.InstancedMesh>(null);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const sparkles = useRef<THREE.InstancedMesh>(null);
  const badge = useRef<THREE.Sprite>(null);
  const flagRef = useRef<THREE.Mesh>(null);
  const buoy = useRef<THREE.Group>(null);
  const startedAt = useRef(-1);
  const clockRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const badgeTex = useMemo(() => (typeof document !== 'undefined' ? badgeTexture() : null), []);
  const swirlTex = useMemo(() => (typeof document !== 'undefined' ? swirlTexture() : null), []);
  const deepTex = useMemo(() => (typeof document !== 'undefined' ? softDiscTexture() : null), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const hullHalf = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.95);
    s.lineTo(2.1, -0.95);
    s.quadraticCurveTo(3.1, -0.7, 3.4, 0);
    s.quadraticCurveTo(3.1, 0.7, 2.1, 0.95);
    s.lineTo(0, 0.95);
    s.lineTo(0, -0.95);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false, curveSegments: 5 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  // ship parts (ship-local), where each gets thrown when the kraken hits
  const pieces = useMemo<Piece[]>(() => {
    let sd = 11;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const homes: [V3, V3][] = [
      [[0.05, 0, 0], [0, 0, 0]],
      [[-0.05, 0, 0], [0, Math.PI, 0]],
      [[0, 0.92, 0], [0, 0, 0]],
      [[0.3, 2.15, 0], [0, 0, 0]],
      [[-1.6, 1.27, 0.3], [0, 0, 0]],
      [[1.6, 1.12, -0.35], [0, 0.4, 0]],
      [[1.5, 1.17, 0.4], [0, 0, 0]],
      [[-2.6, 1.02, 0], [0, 0, 0]],
      [[2.6, 1.02, 0], [0, 0, 0]],
    ];
    return homes.map(([p, r], i) => {
      const a = (i / homes.length) * Math.PI * 2 + rnd() * 0.5;
      const d = 3.6 + rnd() * 2.8;
      return {
        home: new THREE.Vector3(...p),
        homeRot: new THREE.Euler(...r),
        out: new THREE.Vector3(Math.cos(a) * d, 0.32, Math.sin(a) * d),
        outRot: new THREE.Euler(r[0] + (rnd() - 0.5) * 1.4, r[1] + (rnd() - 0.5) * 3, r[2] + (rnd() - 0.5) * 1.8),
        arc: 2.6 + rnd() * 2.4,
      };
    });
  }, []);

  // tentacles ring the ship (cove-local); they all reach toward the ship
  const tentacles = useMemo(() => {
    const c = Math.cos(SHIP_YAW);
    const s = Math.sin(SHIP_YAW);
    const list: { base: THREE.Vector3; toward: THREE.Vector3; phase: number; delay: number }[] = [];
    const angles = [0.35, 1.45, 2.6, 3.7, 5.0];
    angles.forEach((a, i) => {
      // ellipse around the hull, rotated with the ship
      const lx = Math.cos(a) * 4.0;
      const lz = Math.sin(a) * 2.3;
      const base = new THREE.Vector3(lx * c + lz * s, 0, -lx * s + lz * c);
      list.push({ base, toward: new THREE.Vector3(0, 0, 0), phase: i * 1.3, delay: [0, 0.12, 0.05, 0.18, 0.09][i] });
    });
    return list;
  }, []);

  // splash droplets + bubbles + sparkles (instanced)
  const DROPS = 70;
  const BUBS = 28;
  const SPARKS = 24;
  const dropState = useMemo(() => Array.from({ length: DROPS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 })), []);
  const bubState = useMemo(() => Array.from({ length: BUBS }, (_, i) => ({ a: (i / BUBS) * Math.PI * 2, r: 0.6 + (i % 5) * 0.55, off: (i * 0.37) % 1 })), []);
  const nextDrop = useRef(0);
  const fired = useRef<Set<string>>(new Set());
  const splash = (at: THREE.Vector3, n: number, power: number) => {
    for (let k = 0; k < n; k++) {
      const d = dropState[nextDrop.current++ % DROPS];
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random()) * power;
      d.p.copy(at).setY(0.1);
      d.v.set(Math.cos(a) * sp * 0.5, (1.4 + Math.random() * 1.2) * power, Math.sin(a) * sp * 0.5);
      d.life = 1;
    }
  };
  const fireOnce = (key: string, fn: () => void) => {
    if (fired.current.has(key)) return;
    fired.current.add(key);
    fn();
  };

  const crash = () => {
    if (startedAt.current >= 0 || isAnyModalOpen) return;
    startedAt.current = clockRef.current;
    fired.current.clear();
  };
  useEffect(() => {
    crashCoveBus.crash = crash;
    return () => {
      crashCoveBus.crash = () => {};
    };
  });

  const q0 = useMemo(() => new THREE.Quaternion(), []);
  const q1 = useMemo(() => new THREE.Quaternion(), []);
  const camLocal = useMemo(() => new THREE.Vector3(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  const axisY = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    clockRef.current = now;
    let t = startedAt.current < 0 ? -1 : now - startedAt.current;
    if (reducedMotion && t >= 0 && t < T.badge[0]) t = T.badge[0];
    if (t > T.end) {
      startedAt.current = -1;
      t = -1;
    }
    const active = t >= 0;

    // --- ship: bob at anchor; shudder while the kraken wakes ---
    if (ship.current) {
      const shake = active && t < T.slam ? Math.sin(t * 70) * 0.05 * seg(t, 0, T.churnEnd) : 0;
      ship.current.position.set(shake, SHIP_Y + (reducedMotion ? 0 : Math.sin(now * 1.2) * 0.07), 0);
      ship.current.rotation.set(reducedMotion ? 0 : Math.cos(now * 0.9) * 0.025, SHIP_YAW, (reducedMotion ? 0 : Math.sin(now * 1.1) * 0.035) + shake * 0.6);
      const s = hovered && !active ? 1.04 : 1;
      ship.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
    }

    // --- ship parts: smashed outward, float, then spiral back in a whirlpool ---
    const outK = !active ? 0 : t < T.rebuild[0] ? seg(t, T.burst[0], T.burst[1]) : 1 - seg(t, T.rebuild[0], T.rebuild[1]);
    pieces.forEach((pc, i) => {
      const g = pieceRefs.current[i];
      if (!g) return;
      if (outK <= 0.0001) {
        g.position.copy(pc.home);
        q0.setFromEuler(pc.homeRot);
        g.quaternion.copy(q0);
        return;
      }
      off.subVectors(pc.out, pc.home);
      if (t >= T.rebuild[0]) {
        // whirlpool: offset shrinks while spinning around the centre
        off.applyAxisAngle(axisY, (1 - outK) * Math.PI * 3.2);
        off.multiplyScalar(outK);
        g.position.copy(pc.home).add(off);
        g.position.y += Math.sin((1 - outK) * Math.PI) * 1.4;
      } else {
        off.multiplyScalar(outK);
        g.position.copy(pc.home).add(off);
        const travel = seg(t, T.burst[0], T.burst[1]);
        g.position.y += Math.sin(travel * Math.PI) * pc.arc;
        if (travel >= 1) g.position.y += Math.sin(now * 2.3 + i) * 0.07;
      }
      q0.setFromEuler(pc.homeRot);
      q1.setFromEuler(pc.outRot);
      g.quaternion.copy(q0).slerp(q1, outK);
      if (t < T.burst[1] || t >= T.rebuild[0]) g.rotateY(Math.sin(outK * Math.PI) * (i % 2 ? 1.6 : -1.6));
    });

    // --- tentacles ---
    const idleTease = !active && !reducedMotion ? pulse(now % 9, 5.6, 6.6, 7.0, 8.2) : 0;
    tentacles.forEach((tc, i) => {
      const h = tentRefs.current[i];
      if (!h) return;
      let e = 0;
      let curl = 0.15;
      if (active) {
        e = seg(t, T.rise[0] + tc.delay, T.rise[1] + tc.delay) * (1 - seg(t, T.sink[0] + tc.delay, T.sink[1] + tc.delay));
        curl = 0.15 + 0.85 * seg(t, T.grab[0] + tc.delay * 0.5, T.grab[1]) - 0.55 * seg(t, T.wave[0], T.wave[1]) + 0.2 * Math.sin(t * 6 + i) * pulse(t, T.wave[0], T.wave[0] + 0.2, T.sink[0], T.sink[1]);
      } else if (i === 0 && idleTease > 0) {
        e = 0.38 * idleTease;
        curl = 0.55 + Math.sin(now * 3) * 0.15;
      }
      h.pose(e, curl, now * 2.4 + tc.phase);
    });

    // --- kraken head: surfaces behind the ship, eyes follow the camera, blinks ---
    if (head.current) {
      const hk = active ? seg(t, 1.1, 2.0) * (1 - seg(t, 4.2, 5.2)) : 0;
      head.current.visible = hk > 0.01;
      head.current.position.y = -2.6 + hk * 2.9 + Math.sin(now * 1.6) * 0.06;
      if (hk > 0.01) {
        // face the camera
        camLocal.copy(state.camera.position);
        head.current.parent?.worldToLocal(camLocal);
        const yaw = Math.atan2(camLocal.x - head.current.position.x, camLocal.z - head.current.position.z);
        head.current.rotation.y = yaw;
        const blink = Math.abs(Math.sin(now * 1.7)) > 0.985 ? 1 : 0;
        lids.current.forEach((l) => l && (l.scale.y = blink ? 0.46 : 0.02));
        // angry squint while smashing
        const squint = pulse(t, T.grab[0], T.grab[1], T.wave[1], T.sink[0]);
        pupils.current.forEach((p) => p && p.scale.set(0.2, 0.3 * (1 - squint * 0.5), 0.1));
      }
    }

    // --- water: dark deep patch always, swirl when active ---
    if (swirl.current) {
      const sk = active ? Math.max(seg(t, 0, T.churnEnd) * (1 - seg(t, T.burst[1], T.wave[1])) * 0.9, pulse(t, T.sink[1] - 0.4, T.rebuild[0], T.rebuild[1] - 0.2, T.rebuild[1] + 0.4)) : 0;
      swirl.current.visible = sk > 0.01;
      (swirl.current.material as THREE.MeshBasicMaterial).opacity = sk;
      swirl.current.rotation.z -= dt * (1.5 + sk * 4);
      const sc = 4.2 + sk * 1.6;
      swirl.current.scale.set(sc, sc, 1);
    }
    if (deep.current) deep.current.rotation.z += dt * 0.08;

    // --- splashes fire at key beats ---
    if (active && !reducedMotion) {
      tentacles.forEach((tc, i) => {
        if (t > T.rise[0] + tc.delay) fireOnce(`rise${i}`, () => splash(tc.base, 8, 1));
        if (t > T.sink[0] + tc.delay) fireOnce(`sink${i}`, () => splash(tc.base, 5, 0.7));
      });
      if (t > T.slam) fireOnce('slam', () => splash(new THREE.Vector3(0, 0, 0), 26, 1.8));
      if (t > T.burst[1]) fireOnce('land', () => pieces.forEach((pc) => splash(pc.out, 3, 0.6)));
    }
    if (drops.current) {
      dropState.forEach((d, k) => {
        if (d.life > 0) {
          d.v.y -= 9.8 * dt;
          d.p.addScaledVector(d.v, dt);
          d.life -= dt * 0.9;
          if (d.p.y < 0) d.life = 0;
        }
        dummy.position.copy(d.p);
        dummy.scale.setScalar(d.life > 0 ? 0.06 + d.life * 0.06 : 0.0001);
        dummy.updateMatrix();
        drops.current!.setMatrixAt(k, dummy.matrix);
      });
      drops.current.instanceMatrix.needsUpdate = true;
    }

    // ring ripples: under the ship on slam, at each tentacle as it rises
    ripples.current.forEach((m, i) => {
      if (!m) return;
      const isSlam = i === tentacles.length;
      const at = isSlam ? T.slam : T.rise[0] + tentacles[i].delay;
      const life = !active ? -1 : (t - at) / (isSlam ? 1.4 : 1.0);
      const show = life > 0 && life < 1;
      m.visible = show;
      if (!show) return;
      const src = isSlam ? new THREE.Vector3() : tentacles[i].base;
      m.position.set(src.x, 0.07, src.z);
      m.scale.setScalar(0.5 + life * (isSlam ? 7 : 2.6));
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - life) * 0.85;
    });

    // bubbles rise while the water churns and during the whirlpool
    if (bubbles.current) {
      const bk = active ? Math.max(pulse(t, 0, 0.3, T.rise[1], T.grab[1]), pulse(t, T.rebuild[0], T.rebuild[0] + 0.2, T.rebuild[1] - 0.3, T.rebuild[1])) : idleTease * 0.4;
      bubState.forEach((b, k) => {
        const life = (now * 0.9 + b.off) % 1;
        const a = b.a + now * 0.6;
        dummy.position.set(Math.cos(a) * b.r, 0.05 + life * 0.5, Math.sin(a) * b.r);
        dummy.scale.setScalar(bk > 0.01 ? (0.06 + (k % 3) * 0.04) * (1 - life) * bk + 0.0001 : 0.0001);
        dummy.updateMatrix();
        bubbles.current!.setMatrixAt(k, dummy.matrix);
      });
      bubbles.current.instanceMatrix.needsUpdate = true;
    }

    // sparkles swirl in as the ship comes back together
    if (sparkles.current) {
      const spk = active ? pulse(t, T.rebuild[0] + 0.5, T.rebuild[1] - 0.3, T.badge[0], T.badge[1] + 0.6) : 0;
      for (let k = 0; k < SPARKS; k++) {
        const a = (k / SPARKS) * Math.PI * 2 + now * 2.2;
        const r = 3.4 * (1 - spk * 0.6) + Math.sin(k) * 0.4;
        dummy.position.set(Math.cos(a) * r, 0.8 + (k % 6) * 0.38 + Math.sin(now * 3 + k) * 0.15, Math.sin(a) * r);
        dummy.rotation.set(now * 2 + k, now * 3, 0);
        dummy.scale.setScalar(spk > 0.01 ? 0.12 * spk : 0.0001);
        dummy.updateMatrix();
        sparkles.current.setMatrixAt(k, dummy.matrix);
      }
      sparkles.current.instanceMatrix.needsUpdate = true;
    }

    if (badge.current) {
      const b = active ? pulse(t, T.badge[0], T.badge[1], T.badge[2], T.badge[3]) : 0;
      badge.current.visible = b > 0.01;
      const pop = b * (1 + Math.sin(Math.min(1, Math.max(0, (t - T.badge[0]) / 0.4)) * Math.PI) * 0.15);
      badge.current.scale.set(4.6 * pop, 1.44 * pop, 1);
      badge.current.position.y = 5.9 + b * 0.3;
      (badge.current.material as THREE.SpriteMaterial).opacity = b;
    }
    if (flagRef.current && !reducedMotion) flagRef.current.rotation.y = Math.sin(now * 3.2) * 0.3;
    if (buoy.current && !reducedMotion) {
      buoy.current.position.y = Math.sin(now * 1.5 + 1) * 0.1;
      buoy.current.rotation.z = Math.sin(now * 1.2) * 0.12;
    }
  });

  const wood = '#B9874F';
  const dark = '#8D6B4F';
  const setPiece = (i: number) => (el: THREE.Group | null) => {
    pieceRefs.current[i] = el;
  };
  const handlers = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      crash();
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (isAnyModalOpen) return;
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setHovered(false);
      document.body.style.cursor = 'auto';
    },
  };

  // where the head surfaces: behind the ship as seen from the harbor camera
  const headPos: V3 = [4.2, -2.6, -2.0];

  return (
    <group position={CRASH_COVE.pos} scale={CRASH_COVE.scale} userData={{ noMerge: true }}>
      {/* deep dark water patch that hints something lives here */}
      <mesh ref={deep} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} renderOrder={4}>
        <circleGeometry args={[6.6, 48]} />
        <meshBasicMaterial map={deepTex ?? undefined} color="#0B5563" transparent opacity={deepTex ? 0.6 : 0.3} depthWrite={false} />
      </mesh>
      {swirlTex && (
        <mesh ref={swirl} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]} visible={false} renderOrder={5}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={swirlTex} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* a little reef and a warning buoy */}
      <LowPolyBoulder position={[-5.6, -0.2, 2.4]} scale={0.9} />
      <LowPolyBoulder position={[-6.3, -0.3, 1.1]} scale={0.55} />
      <LowPolyBoulder position={[5.4, -0.25, 3.6]} scale={0.6} />
      <group ref={buoy} position={[-4.4, 0, 4.6]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.5, 0.6, 10]} />
          {flat('#E4614C')}
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.3, 0.35, 0.18, 10]} />
          {flat('#F8FAFC')}
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
          {flat('#334155')}
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color="#FDE68A" emissive="#FBBF24" emissiveIntensity={0.9} />
        </mesh>
      </group>

      {/* the ship: click to release the kraken */}
      <group ref={ship} {...handlers}>
        {[0, 1].map((i) => (
          <group key={i} ref={setPiece(i)}>
            <mesh geometry={hullHalf} castShadow receiveShadow>
              {flat(wood)}
            </mesh>
            <mesh geometry={hullHalf} position={[0, 0.62, 0]} scale={[1.01, 0.12, 1.03]}>
              {flat('#1AA6A6')}
            </mesh>
          </group>
        ))}
        <group ref={setPiece(2)}>
          {[-0.6, -0.2, 0.2, 0.6].map((z) => (
            <mesh key={z} position={[0, 0, z]} castShadow>
              <boxGeometry args={[5.4, 0.08, 0.36]} />
              {flat(z === -0.2 || z === 0.6 ? dark : '#C99A62')}
            </mesh>
          ))}
        </group>
        <group ref={setPiece(3)}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.09, 2.5, 6]} />
            {flat(dark)}
          </mesh>
          <mesh position={[0.62, 0.15, 0]} castShadow>
            <coneGeometry args={[0.9, 1.9, 3]} />
            {flat('#FFF8E7')}
          </mesh>
          <mesh ref={flagRef} position={[0.22, 1.3, 0]}>
            <boxGeometry args={[0.42, 0.26, 0.02]} />
            {flat('#F2765D')}
          </mesh>
        </group>
        <group ref={setPiece(4)}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.6, 1.0]} />
            {flat('#FFF8E7')}
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[1.25, 0.12, 1.15]} />
            {flat('#A9714B')}
          </mesh>
          <mesh position={[0.56, 0.05, 0]}>
            <boxGeometry args={[0.02, 0.24, 0.36]} />
            <meshStandardMaterial color="#BAE6FD" emissive="#7DD3FC" emissiveIntensity={0.3} />
          </mesh>
        </group>
        <group ref={setPiece(5)}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            {flat(wood)}
          </mesh>
        </group>
        <group ref={setPiece(6)}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.5, 8]} />
            {flat('#A0522D')}
          </mesh>
        </group>
        {[7, 8].map((i) => (
          <group key={i} ref={setPiece(i)}>
            <mesh>
              <boxGeometry args={[0.08, 0.3, 1.9]} />
              {flat(dark)}
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.2, 0]} visible={false}>
          <boxGeometry args={[7.2, 3.2, 2.6]} />
          <meshBasicMaterial />
        </mesh>
      </group>

      {/* the kraken */}
      {tentacles.map((tc, i) => (
        <Tentacle key={i} ref={(h) => { tentRefs.current[i] = h; }} base={tc.base} toward={tc.toward} />
      ))}
      <group ref={head} position={headPos} visible={false}>
        <mesh scale={[1.9, 1.6, 1.65]} castShadow>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color="#7B4AA8" roughness={0.42} metalness={0.05} />
        </mesh>
        {/* mantle spots */}
        {[[-0.7, 0.9, -0.5], [0.5, 1.1, -0.7], [0.1, 1.3, 0.2], [-0.9, 0.4, 0.6]].map((p, k) => (
          <mesh key={k} position={p as V3} scale={0.2}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#9B6CC8" roughness={0.45} />
          </mesh>
        ))}
        {[-0.62, 0.62].map((x, k) => (
          <group key={x} position={[x * 1.1, 0.4, 1.38]} scale={1.25}>
            <mesh scale={[0.42, 0.46, 0.25]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color="#FFF8E7" roughness={0.35} />
            </mesh>
            <mesh ref={(el) => { pupils.current[k] = el; }} position={[0, -0.02, 0.2]} scale={[0.2, 0.3, 0.1]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#1E1B2E" roughness={0.3} />
            </mesh>
            <mesh position={[0.07, 0.1, 0.29]} scale={0.06}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            {/* eyelid for blinking */}
            <mesh ref={(el) => { lids.current[k] = el; }} position={[0, 0.0, 0.05]} scale={[0.46, 0.02, 0.3]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#6A3D96" roughness={0.45} />
            </mesh>
            {/* brow */}
            <mesh position={[0, 0.52, 0.1]} rotation={[0, 0, (k ? -1 : 1) * 0.35]}>
              <boxGeometry args={[0.6, 0.1, 0.18]} />
              {flat('#5B3384')}
            </mesh>
          </group>
        ))}
      </group>

      {/* splash rings: one per tentacle + one for the slam */}
      {Array.from({ length: tentacles.length + 1 }, (_, i) => (
        <mesh key={i} ref={(el) => { ripples.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.7, 0.86, 32]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <instancedMesh ref={drops} args={[undefined, undefined, DROPS]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#E8FCFF" roughness={0.15} transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={bubbles} args={[undefined, undefined, BUBS]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.85} roughness={0.1} />
      </instancedMesh>
      <instancedMesh ref={sparkles} args={[undefined, undefined, SPARKS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#FDE68A" />
      </instancedMesh>

      {badgeTex && (
        <sprite ref={badge} position={[0, 5.9, 0]} visible={false} renderOrder={10}>
          <spriteMaterial map={badgeTex} transparent opacity={0} depthTest={false} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
};
