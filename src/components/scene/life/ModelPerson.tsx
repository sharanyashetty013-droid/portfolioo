import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PersonPose, PersonAccessory } from './LowPolyPerson';

/** Rigged character models (Mixamo), stored 1 unit tall, feet at the origin */
export type PersonModel = 'kachujin' | 'remy' | 'eve' | 'megan';
const url = (m: PersonModel) => `/models/people/${m}.glb`;

interface ModelPersonProps {
  model: PersonModel;
  pose: PersonPose | React.MutableRefObject<PersonPose>;
  /** 0 = sitting, 1 = standing */
  standRef?: React.MutableRefObject<number>;
  phase?: number;
  reducedMotion?: boolean;
  accessory?: PersonAccessory;
  /** Height in world units */
  height?: number;
}

// Joints we move by hand. Names are Mixamo's with the "mixamorig" prefix removed.
const JOINTS = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand',
  'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot',
] as const;
type Joint = (typeof JOINTS)[number];
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

interface Rig {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
  /** turns a direction in the character's own space into this bone's parent space */
  toParent: THREE.Quaternion;
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

/** Rotate a joint around an axis given in the character's own space (facing +Z, left = +X) */
const turn = (r: Rig | undefined, axis: THREE.Vector3, angle: number) => {
  if (!r || angle === 0) return;
  tmpV.copy(axis).applyQuaternion(r.toParent);
  r.bone.quaternion.premultiply(tmpQ.setFromAxisAngle(tmpV, angle));
};

const ease = (cur: number, target: number, k: number) => cur + (target - cur) * k;

const ModelPersonInner: React.FC<ModelPersonProps> = ({
  model,
  pose,
  standRef,
  phase = 0,
  reducedMotion = false,
  accessory = null,
  height = 1.45,
}) => {
  const gltf = useGLTF(url(model));
  const body = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.Group>(null);
  const laptop = useRef<THREE.Group>(null);

  // own copy of the skinned model so several islanders can share one file
  const { scene, rig, fingers } = useMemo(() => {
    const scene = cloneSkinned(gltf.scene) as THREE.Group;
    scene.updateMatrixWorld(true);
    const rootInv = scene.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rig: Partial<Record<Joint, Rig>> = {};
    const fingers: Rig[] = [];
    const make = (b: THREE.Bone): Rig => {
      const pq = b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
      pq.premultiply(rootInv);
      return { bone: b, rest: b.quaternion.clone(), toParent: pq.invert() };
    };
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.frustumCulled = false; // skinned bounds don't follow the pose
      }
      if (!(o as THREE.Bone).isBone) return;
      const name = o.name.replace(/^mixamorig\d*[:_]?/, '');
      if ((JOINTS as readonly string[]).includes(name) && !rig[name as Joint]) rig[name as Joint] = make(o as THREE.Bone);
      if (/^(Left|Right)Hand(Index|Middle|Ring|Pinky)[123]$/.test(name)) fingers.push(make(o as THREE.Bone));
    });
    return { scene, rig, fingers };
  }, [gltf.scene]);

  // blended joint values so poses flow into each other
  const cur = useRef({
    lowerL: 1.25, lowerR: 1.25, swingL: 0, swingR: 0, elL: 0.2, elR: 0.2, waveR: 0,
    upL: 0, upR: 0, kneeL: 0, kneeR: 0, lean: 0, nod: 0, tilt: 0, drop: 0, bounce: 0,
  });

  useEffect(() => {
    // lantern/laptop live outside the skeleton; start hidden
    if (lantern.current) lantern.current.visible = false;
  }, []);

  useFrame((state, delta) => {
    const p = typeof pose === 'string' ? pose : pose.current;
    const t = reducedMotion ? 0 : state.clock.elapsedTime + phase;
    const stand = standRef ? standRef.current : 1;
    const sit = 1 - stand;

    // ---- targets (radians); "lower" = how far the arm comes down from the T-pose
    let lowerL = 1.25, lowerR = 1.25, swingL = 0, swingR = 0, elL = 0.2, elR = 0.2, waveR = 0;
    let upL = 0, upR = 0, kneeL = 0, kneeR = 0, lean = 0, nod = 0, tilt = Math.sin(t * 0.9) * 0.04, bounce = 0;

    switch (p) {
      case 'walk': {
        const s = Math.sin(t * 5.2);
        const c = Math.cos(t * 5.2);
        upL = -0.42 * s;
        upR = 0.42 * s;
        kneeL = 0.08 + 0.75 * Math.max(0, c);
        kneeR = 0.08 + 0.75 * Math.max(0, -c);
        swingL = 0.32 * s;
        swingR = -0.32 * s;
        elL = elR = 0.3;
        bounce = Math.abs(c) * 0.012;
        lean = 0.04;
        break;
      }
      case 'idle':
        lowerL = 1.2 + Math.sin(t * 1.6) * 0.02;
        lowerR = 1.2 + Math.sin(t * 1.6) * 0.02;
        elL = elR = 0.18;
        lean = Math.sin(t * 1.6) * 0.015;
        break;
      case 'cheer': {
        const j = Math.max(0, Math.sin(t * 5));
        lowerL = -1.15 + Math.sin(t * 10) * 0.15;
        lowerR = -1.15 - Math.sin(t * 10) * 0.15;
        elL = elR = 0.35;
        bounce = j * 0.07;
        nod = -0.15;
        break;
      }
      case 'wave':
        lowerL = 1.2;
        lowerR = -1.0;
        elL = 0.2;
        elR = 0.55;
        waveR = Math.sin(t * 8) * 0.45;
        tilt = 0.1 + Math.sin(t * 1.4) * 0.04;
        break;
      case 'row': {
        const s = Math.sin(t * 3.2);
        lowerL = lowerR = 1.05;
        swingL = swingR = -1.0 + s * 0.35;
        elL = elR = 0.7 - s * 0.45;
        lean = 0.12 + s * 0.16;
        break;
      }
      case 'type':
        lowerL = lowerR = 1.2;
        swingL = swingR = -0.75 + Math.max(0, Math.sin(t * 14)) * 0.03;
        elL = elR = 1.15;
        nod = 0.35;
        lean = 0.1;
        break;
    }
    // sitting folds the legs at hip and knee
    upL = upL * stand - sit * 1.5;
    upR = upR * stand - sit * 1.5;
    kneeL = kneeL * stand + sit * 1.5;
    kneeR = kneeR * stand + sit * 1.5;

    const c = cur.current;
    const k = reducedMotion ? 1 : 1 - Math.exp(-12 * Math.min(delta, 0.1));
    c.lowerL = ease(c.lowerL, lowerL, k);
    c.lowerR = ease(c.lowerR, lowerR, k);
    c.swingL = ease(c.swingL, swingL, k);
    c.swingR = ease(c.swingR, swingR, k);
    c.elL = ease(c.elL, elL, k);
    c.elR = ease(c.elR, elR, k);
    c.waveR = ease(c.waveR, waveR, k);
    c.upL = ease(c.upL, upL, k);
    c.upR = ease(c.upR, upR, k);
    c.kneeL = ease(c.kneeL, kneeL, k);
    c.kneeR = ease(c.kneeR, kneeR, k);
    c.lean = ease(c.lean, lean, k);
    c.nod = ease(c.nod, nod, k * 0.6);
    c.tilt = ease(c.tilt, tilt, k);
    c.bounce = ease(c.bounce, bounce, k);
    c.drop = ease(c.drop, sit, k);

    // ---- apply: reset every joint to its rest pose, then add rotations
    for (const j of JOINTS) {
      const r = rig[j];
      if (r) r.bone.quaternion.copy(r.rest);
    }
    // arms: bring down from the T-pose, then swing forward/back
    turn(rig.LeftArm, Z, -c.lowerL);
    turn(rig.RightArm, Z, c.lowerR);
    turn(rig.LeftArm, X, c.swingL);
    turn(rig.RightArm, X, c.swingR);
    // elbows bend the hand forward
    turn(rig.LeftForeArm, Y, -c.elL);
    turn(rig.RightForeArm, Y, c.elR);
    turn(rig.RightForeArm, Z, c.waveR);
    // relaxed hands
    turn(rig.LeftHand, Z, -0.12);
    turn(rig.RightHand, Z, 0.12);
    for (const f of fingers) {
      f.bone.quaternion.copy(f.rest);
      turn(f, Z, f.bone.name.includes('Left') ? -0.32 : 0.32);
    }
    // legs
    turn(rig.LeftUpLeg, X, c.upL);
    turn(rig.RightUpLeg, X, c.upR);
    turn(rig.LeftLeg, X, c.kneeL);
    turn(rig.RightLeg, X, c.kneeR);
    turn(rig.LeftFoot, X, -c.kneeL * 0.3 * (1 - c.drop));
    turn(rig.RightFoot, X, -c.kneeR * 0.3 * (1 - c.drop));
    // body
    turn(rig.Spine, X, c.lean * 0.5);
    turn(rig.Spine1, X, c.lean * 0.5);
    turn(rig.Spine2, Y, (c.swingR - c.swingL) * 0.1);
    turn(rig.Head, X, c.nod);
    turn(rig.Head, Z, c.tilt);

    if (body.current) body.current.position.y = c.bounce * height - c.drop * 0.27 * height;
    if (laptop.current) laptop.current.visible = p === 'type';

    // lantern hangs from the left hand
    if (lantern.current && rig.LeftHand && body.current) {
      lantern.current.visible = accessory === 'lantern' && p !== 'type';
      if (lantern.current.visible) {
        body.current.updateWorldMatrix(true, true);
        rig.LeftHand.bone.getWorldPosition(tmpV);
        lantern.current.position.copy(lantern.current.parent!.worldToLocal(tmpV));
        lantern.current.position.y -= 0.09;
      }
    }
  });

  return (
    <group>
      <group ref={body}>
        <primitive object={scene} scale={height} />
        {/* laptop on the lap, only while typing */}
        <group ref={laptop} position={[0, 0.3 * height, 0.24 * height]} visible={false}>
          <mesh>
            <boxGeometry args={[0.3, 0.016, 0.2]} />
            <meshStandardMaterial color="#C9CED6" metalness={0.5} roughness={0.35} />
          </mesh>
          <group position={[0, 0.008, -0.1]} rotation={[-0.35, 0, 0]}>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.3, 0.2, 0.012]} />
              <meshStandardMaterial color="#C9CED6" metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.1, 0.007]}>
              <planeGeometry args={[0.27, 0.17]} />
              <meshBasicMaterial color="#4CE0B3" toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      <group ref={lantern} visible={false}>
        <mesh position={[0, 0.08, 0]}>
          <torusGeometry args={[0.03, 0.007, 4, 10]} />
          <meshStandardMaterial color="#3B2A20" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial color="#FFC861" emissive="#FFB547" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        {[0.056, -0.056].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.1, 0.016, 0.1]} />
            <meshStandardMaterial color="#3B2A20" />
          </mesh>
        ))}
        <pointLight color="#FFB547" intensity={2.4} distance={5} decay={1.6} />
      </group>
    </group>
  );
};

/** Loads on its own, so the rest of the world never waits for the character files */
export const ModelPerson: React.FC<ModelPersonProps> = (props) => (
  <Suspense fallback={null}>
    <ModelPersonInner {...props} />
  </Suspense>
);

(['kachujin', 'remy', 'eve', 'megan'] as PersonModel[]).forEach((m) => useGLTF.preload(url(m)));
