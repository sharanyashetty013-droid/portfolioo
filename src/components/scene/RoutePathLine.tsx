import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createVoyageCurve } from '../../constants/voyageCurve';
import { createGlowMaterial, glowGeometry } from './effects/glowPoints';

interface RoutePathLineProps {
  currentT: number;
}

const DOT = new THREE.Color('#FFF8EB');

/** Travelled route = soft teal ribbon on the water; route ahead = round buoy dots. */
export const RoutePathLine: React.FC<RoutePathLineProps> = ({ currentT }) => {
  const curve = useMemo(() => createVoyageCurve(), []);
  const dotMaterial = useMemo(() => createGlowMaterial({ attenuate: true, mode: 2, blending: THREE.NormalBlending }), []);

  const { trail, dots } = useMemo(() => {
    // ribbon for the part already sailed
    const steps = 160;
    const left: THREE.Vector3[] = [];
    const right: THREE.Vector3[] = [];
    const end = Math.max(0.002, Math.min(1, currentT));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * end;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(0.35);
      left.push(p.clone().add(side).setY(0.06));
      right.push(p.clone().sub(side).setY(0.06));
    }
    const pos: number[] = [];
    for (let i = 0; i < steps; i++) {
      const a = left[i], b = right[i], c = left[i + 1], d = right[i + 1];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

    // buoy dots for the route still ahead
    const dpos: number[] = [];
    const per: { size: number; phase: number; speed: number; color: THREE.Color }[] = [];
    for (let i = 0; i <= 110; i++) {
      const t = i / 110;
      if (t < currentT + 0.01) continue;
      const p = curve.getPointAt(t);
      dpos.push(p.x, 0.12, p.z);
      per.push({ size: 5, phase: 0, speed: 0, color: DOT });
    }
    return { trail: tg, dots: dpos.length ? glowGeometry(dpos, per) : null };
  }, [curve, currentT]);

  return (
    <group>
      <mesh geometry={trail} renderOrder={1}>
        <meshBasicMaterial color="#1AA6A6" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {dots && <points geometry={dots} material={dotMaterial} frustumCulled={false} />}
    </group>
  );
};
