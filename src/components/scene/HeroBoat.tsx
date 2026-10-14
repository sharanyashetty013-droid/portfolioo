import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RowingBoat } from './common/StyleRefDecor';
import { createVoyageCurve } from '../../constants/islandLayout';

interface HeroBoatProps {
  targetT: number;
  onBoatUpdate?: (pos: THREE.Vector3, forward: THREE.Vector3, isMoving: boolean) => void;
  reducedMotion?: boolean;
}

export const HeroBoat: React.FC<HeroBoatProps> = ({
  targetT,
  onBoatUpdate,
  reducedMotion = false,
}) => {
  const boatGroupRef = useRef<THREE.Group>(null);
  const wakeMeshRef = useRef<THREE.InstancedMesh>(null);
  const curve = useMemo(() => createVoyageCurve(), []);

  const currentTRef = useRef(targetT);
  const prevAngleRef = useRef(0);
  const isMovingRef = useRef(false);

  const wakeCount = 32;
  const wakeParticles = useMemo(() => {
    return Array.from({ length: wakeCount }).map(() => ({
      pos: new THREE.Vector3(0, -999, 0),
      scale: 0.2,
      life: 0.0,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (reducedMotion) {
      currentTRef.current = targetT;
    }
  }, [targetT, reducedMotion]);

  useFrame((state, delta) => {
    if (!boatGroupRef.current) return;
    const time = state.clock.getElapsedTime();

    const diff = targetT - currentTRef.current;
    const moving = Math.abs(diff) > 0.001;
    isMovingRef.current = moving;

    if (reducedMotion) {
      currentTRef.current = targetT;
    } else if (moving) {
      const speed = Math.sign(diff) * Math.min(Math.abs(diff), delta * 0.075);
      currentTRef.current += speed;
      currentTRef.current = Math.max(0, Math.min(1, currentTRef.current));
    }

    const tClamped = Math.max(0.0001, Math.min(0.9999, currentTRef.current));
    const pos = curve.getPointAt(tClamped);
    const tangent = curve.getTangentAt(tClamped).normalize();

    const targetAngle = Math.atan2(tangent.x, tangent.z);
    let deltaAngle = targetAngle - prevAngleRef.current;
    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;

    const currentAngle = prevAngleRef.current + deltaAngle * Math.min(1, delta * 9.0);
    prevAngleRef.current = currentAngle;

    const turnTilt = moving ? -deltaAngle * 1.6 : 0;
    const waveBob = Math.sin(time * 2.8) * 0.08;
    const wavePitch = Math.cos(time * 2.2) * 0.05;
    const waveRoll = Math.sin(time * 1.8) * 0.04 + turnTilt;

    boatGroupRef.current.position.set(pos.x, pos.y + waveBob + 0.06, pos.z);
    boatGroupRef.current.rotation.set(wavePitch, currentAngle, waveRoll);

    if (onBoatUpdate) {
      onBoatUpdate(pos, tangent, moving);
    }

    if (wakeMeshRef.current) {
      const sternOffset = tangent.clone().multiplyScalar(-2.2);
      const sternPos = pos.clone().add(sternOffset);

      if (moving && !reducedMotion) {
        const p = wakeParticles[Math.floor((time * 14) % wakeCount)];
        p.pos.copy(sternPos);
        p.pos.y = 0.04;
        p.scale = 0.6;
        p.life = 1.0;
      }

      wakeParticles.forEach((p, idx) => {
        if (p.life > 0.0) {
          p.life -= delta * 0.45;
          p.scale += delta * 0.85;
          dummy.position.copy(p.pos);
          dummy.rotation.x = -Math.PI / 2;
          dummy.scale.set(p.scale, p.scale, 1);
        } else {
          dummy.position.set(0, -999, 0);
        }
        dummy.updateMatrix();
        wakeMeshRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      wakeMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={boatGroupRef}>
        <RowingBoat
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={1.6}
          hullColor="#F2765D"
          stripeColor="#FFF3D6"
          innerColor="#FFF3D6"
          hasOars={true}
          hasMastAndFlag={true}
          flagColor="#1AA6A6"
          hasLantern={true}
        />
      </group>
      <instancedMesh
        ref={wakeMeshRef}
        args={[undefined, undefined, wakeCount]}
      >
        <circleGeometry args={[1.2, 14]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
};
