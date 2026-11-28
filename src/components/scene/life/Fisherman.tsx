import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { PersonPose } from './LowPolyPerson';
import { ModelPerson } from './ModelPerson';
import { IslandConfig } from '../../../constants/islandLayout';
import { pierFrame, PIER_DECK_Y } from '../common/IslandPier';

// Remy sits on the edge of the home pier with a fishing rod.
// Every PERIOD seconds: the float bobs, a fish bites, he yanks it out of the
// water, the fish flies up into his hand and he cheers, then casts again.
const PERIOD = 11;
const BITE = 6.0; // float starts to dip
const YANK = 7.0; // he pulls
const CATCH = 7.8; // fish lands in his hand
const CHEER_END = 10.0;

const SCALE = 1.25;
const HEIGHT = 1.45;
const ROD_LEN = 2.4;
const CAST = 2.7; // how far out the float sits

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export const Fisherman: React.FC<{ cfg: IslandConfig; reducedMotion?: boolean }> = ({ cfg, reducedMotion }) => {
  const { position: pierPos, angle } = pierFrame(cfg);
  // seat: side edge of the deck, just past the last rope post, facing out to sea
  const seat = useMemo(() => {
    const local = new THREE.Vector3(1.2, PIER_DECK_Y, 3.35);
    local.applyAxisAngle(UP, angle);
    return new THREE.Vector3(pierPos[0] + local.x, pierPos[1] + local.y, pierPos[2] + local.z);
  }, [pierPos, angle]);
  const facing = angle + Math.PI / 2; // looks along the pier's +x side
  const fwd = useMemo(() => new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)), [facing]);
  const waterY = pierPos[1] + 0.05;
  const floatHome = useMemo(
    () => new THREE.Vector3(seat.x + fwd.x * CAST, waterY, seat.z + fwd.z * CAST),
    [seat, fwd, waterY],
  );

  const pose = useRef<PersonPose>('fish');
  const stand = useRef(0);
  const hands = useRef<{ l: THREE.Vector3; r: THREE.Vector3 } | null>(null);

  const rod = useRef<THREE.Group>(null);
  const float = useRef<THREE.Group>(null);
  const fish = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const pitch = useRef(0.6);

  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 12), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#D8D2C4', transparent: true, opacity: 0.6 }));
    l.frustumCulled = false;
    return l;
  }, []);

  useFrame((state) => {
    const t = reducedMotion ? 2 : (state.clock.elapsedTime + 3) % PERIOD;
    const h = hands.current;
    if (!h || !rod.current || !float.current || !fish.current || !ring.current) return;

    // ---- what he's doing
    pose.current = t < YANK ? 'fish' : t < CATCH ? 'reel' : t < CHEER_END ? 'cheer' : 'fish';
    const biting = t > BITE && t < YANK;
    const targetPitch = t < BITE ? 0.55 : biting ? 0.3 + Math.sin(t * 30) * 0.05 : t < CATCH ? 1.25 : t < CHEER_END ? 1.1 : 0.55;
    pitch.current += (targetPitch - pitch.current) * 0.12;

    // ---- rod: from his right hand, out to sea and up
    const grip = tmp.copy(h.r).lerp(h.l, 0.25);
    rod.current.position.copy(grip);
    const dir = tmp2.copy(fwd).multiplyScalar(Math.cos(pitch.current)).addScaledVector(UP, Math.sin(pitch.current)).normalize();
    rod.current.quaternion.setFromUnitVectors(UP, dir);
    const tip = new THREE.Vector3().copy(grip).addScaledVector(dir, ROD_LEN);

    // ---- float and fish
    let end: THREE.Vector3;
    if (t < YANK) {
      const bob = biting ? -0.12 - Math.abs(Math.sin(t * 22)) * 0.1 : Math.sin(t * 2.2) * 0.03;
      float.current.position.set(floatHome.x, waterY + bob, floatHome.z);
      float.current.visible = true;
      fish.current.visible = false;
      end = float.current.position;
    } else if (t < CATCH) {
      // fish flies out of the water, up past the rod tip and into his hand
      const k = (t - YANK) / (CATCH - YANK);
      float.current.visible = false;
      fish.current.visible = true;
      const p = new THREE.Vector3().lerpVectors(floatHome, h.l, k);
      p.y += Math.sin(k * Math.PI) * 2.2;
      fish.current.position.copy(p);
      fish.current.rotation.set(k * 9, facing, Math.sin(k * 20) * 0.6);
      end = fish.current.position;
    } else if (t < CHEER_END) {
      // held up high, wriggling
      fish.current.visible = true;
      float.current.visible = false;
      fish.current.position.copy(h.l).add(new THREE.Vector3(0, 0.12, 0));
      fish.current.rotation.set(Math.PI / 2, facing, Math.sin(t * 18) * 0.5);
      end = fish.current.position;
    } else {
      // recast: float drops back onto the water
      const k = (t - CHEER_END) / (PERIOD - CHEER_END);
      fish.current.visible = false;
      float.current.visible = true;
      float.current.position.set(
        THREE.MathUtils.lerp(tip.x, floatHome.x, k),
        THREE.MathUtils.lerp(tip.y, waterY, k) + Math.sin(k * Math.PI) * 1.2,
        THREE.MathUtils.lerp(tip.z, floatHome.z, k),
      );
      end = float.current.position;
    }

    // ---- line: tip to float/fish with a little sag
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const slack = t < BITE || t > CHEER_END ? 0.35 : 0.05;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      pos.setXYZ(
        i,
        THREE.MathUtils.lerp(tip.x, end.x, k),
        THREE.MathUtils.lerp(tip.y, end.y, k) - Math.sin(k * Math.PI) * slack,
        THREE.MathUtils.lerp(tip.z, end.z, k),
      );
    }
    pos.needsUpdate = true;

    // ---- splash where the fish leaves the water
    const s = t - YANK;
    ring.current.visible = s > -0.6 && s < 1.2;
    if (ring.current.visible) {
      const a = Math.max(0, s + 0.6) / 1.8;
      ring.current.position.set(floatHome.x, waterY + 0.03, floatHome.z);
      ring.current.scale.setScalar(0.3 + a * 1.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - a);
    }
  });

  return (
    <group>
      {/* the fisherman, sitting with his legs over the side of the pier */}
      <group position={[seat.x, seat.y - 0.36, seat.z]} rotation={[0, facing, 0]} scale={SCALE}>
        <ModelPerson model="remy" pose={pose} standRef={stand} reducedMotion={reducedMotion} handsRef={hands} height={HEIGHT} />
      </group>

      {/* bait bucket beside him */}
      <group
        position={[seat.x - fwd.x * 0.35 + Math.cos(facing) * 0.55, seat.y, seat.z - fwd.z * 0.35 - Math.sin(facing) * 0.55]}
      >
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.15, 0.32, 14]} />
          <meshStandardMaterial color="#8B5E3C" roughness={0.85} />
        </mesh>
        {[0.06, 0.26].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <torusGeometry args={[0.18 - (0.26 - y) * 0.12, 0.012, 6, 18]} />
            <meshStandardMaterial color="#4B5563" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.17, 16]} />
          <meshStandardMaterial color="#3E7C8C" roughness={0.2} />
        </mesh>
      </group>

      {/* rod: a tapered pole with a reel near the grip */}
      <group ref={rod}>
        <mesh position={[0, ROD_LEN / 2 - 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.03, ROD_LEN + 0.5, 8]} />
          <meshStandardMaterial color="#6B4A2B" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 10]} />
          <meshStandardMaterial color="#2B2B2B" roughness={0.7} />
        </mesh>
        <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.05, 14]} />
          <meshStandardMaterial color="#B9BCC2" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      <primitive object={line} />

      {/* float: red and white */}
      <group ref={float}>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.07, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#E4473A" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.07, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F5F1E8" roughness={0.4} />
        </mesh>
      </group>

      {/* the catch */}
      <group ref={fish} visible={false} scale={0.75}>
        <mesh scale={[1, 0.55, 0.38]}>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color="#5FA8C9" roughness={0.3} metalness={0.35} />
        </mesh>
        <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.3]}>
          <coneGeometry args={[0.16, 0.24, 10]} />
          <meshStandardMaterial color="#3F86A8" roughness={0.3} />
        </mesh>
        <mesh position={[0.2, 0.05, 0.1]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        <mesh position={[0.2, 0.05, -0.1]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
      </group>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.45, 0.62, 24]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
};
