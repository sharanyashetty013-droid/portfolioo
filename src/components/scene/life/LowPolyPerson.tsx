import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export type PersonPose = 'walk' | 'idle' | 'cheer' | 'row' | 'wave' | 'type';
export type PersonAccessory = 'lantern' | 'sunglasses' | null;

export interface PersonLook {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  braid?: boolean;   // long braid down the back
  bun?: boolean;     // hair bun on top
  cap?: string;      // cap colour (optional)
  scarf?: string;    // dupatta / scarf colour (optional)
  longHair?: boolean; // hair falling past the shoulders + side locks
  kurta?: string;     // flared kurta/dress hem colour
  earrings?: string;
  flower?: string;    // flower tucked in the hair
  lips?: string;
  /** Frock look: colour of the dress (replaces top/kurta), with puff sleeves and bare legs */
  frock?: string;
  ribbon?: string;    // waist ribbon + bow
  collar?: string;    // round collar
  socks?: string;
  shoes?: string;
}

interface LowPolyPersonProps {
  look: PersonLook;
  /** Current pose; can be a ref so callers can switch it per-frame without re-rendering */
  pose: PersonPose | React.MutableRefObject<PersonPose>;
  /** 0 = sitting, 1 = standing. Ref so it can be eased externally */
  standRef?: React.MutableRefObject<number>;
  phase?: number;
  reducedMotion?: boolean;
  /** Small prop that changes with the time of day */
  accessory?: PersonAccessory;
}

// Soft 3-step light ramp for a hand-painted, toon look
const toonRamp = (() => {
  // 4 soft steps, blended (linear) so shading falls off smoothly instead of in hard bands
  const data = new Uint8Array([120, 120, 120, 255, 170, 170, 170, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

const mat = (color: string, rough = 0.8, smooth = false) =>
  smooth ? (
    <meshToonMaterial color={color} gradientMap={toonRamp} />
  ) : (
    <meshStandardMaterial color={color} roughness={rough} flatShading />
  );

/** One smooth braid that tapers toward the tip */
const makeBraid = (length: number) => {
  const pts = [
    new THREE.Vector3(0, -0.08, -0.17),
    new THREE.Vector3(0, -0.2, -0.215),
    new THREE.Vector3(0.01, -0.2 - length * 0.5, -0.225),
    new THREE.Vector3(0, -0.2 - length, -0.21),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 48, 0.055, 14, false);
  // taper the radius from top to tip, with a gentle twist bump for a woven look
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  const rings = 49, perRing = 15;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    curve.getPointAt(t, center);
    const scale = (1 - t * 0.55) * (1 + 0.12 * Math.sin(t * Math.PI * 14));
    for (let j = 0; j < perRing; j++) {
      const idx = i * perRing + j;
      v.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(scale).add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
};
const BRAID_LONG = makeBraid(0.62);
const BRAID_SHORT = makeBraid(0.38);

/** Darker/lighter version of a colour for trims and seams */
const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

/** Ease a value toward a target, frame-rate independent */
const ease = (cur: number, target: number, k: number) => cur + (target - cur) * k;

/**
 * Chunky low-poly character, ~1.35 units tall, origin at the feet.
 * Every limb is a pivot group so poses are just rotations.
 */
export const LowPolyPerson: React.FC<LowPolyPersonProps> = ({
  look,
  pose,
  standRef,
  phase = 0,
  reducedMotion = false,
  accessory = null,
}) => {
  const laptop = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.Group>(null);
  // current (blended) joint values, so poses flow into each other instead of snapping
  const cur = useRef({ hipY: 0.58, lean: 0, headZ: 0, headX: 0, legL: 0, legR: 0, aLX: 0, aLZ: 0.12, aRX: 0, aRZ: -0.12 });
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!hips.current || !armL.current || !armR.current || !legL.current || !legR.current || !torso.current || !head.current) return;
    const p = typeof pose === 'string' ? pose : pose.current;
    const t = reducedMotion ? 0 : state.clock.elapsedTime + phase;
    const stand = standRef ? standRef.current : 1;

    // reset
    let hipY = 0.58;
    let legSwing = 0;
    let armLX = 0, armLZ = 0.12, armRX = 0, armRZ = -0.12;
    let bounce = 0;
    let headTilt = Math.sin(t * 0.9) * 0.06;
    let lean = 0;

    switch (p) {
      case 'walk': {
        legSwing = Math.sin(t * 6) * 0.55;
        armLX = -legSwing * 0.8;
        armRX = legSwing * 0.8;
        bounce = Math.abs(Math.sin(t * 6)) * 0.05;
        break;
      }
      case 'idle': {
        bounce = Math.sin(t * 1.6) * 0.012;
        armLZ = 0.15 + Math.sin(t * 1.6) * 0.03;
        armRZ = -0.15 - Math.sin(t * 1.6) * 0.03;
        break;
      }
      case 'cheer': {
        const j = Math.max(0, Math.sin(t * 5));
        bounce = j * 0.18;
        armLZ = 2.5 + Math.sin(t * 10) * 0.2;
        armRZ = -2.5 - Math.sin(t * 10) * 0.2;
        break;
      }
      case 'row': {
        const s = Math.sin(t * 3.2);
        armLX = -1.1 + s * 0.55;
        armRX = -1.1 + s * 0.55;
        armLZ = 0.25;
        armRZ = -0.25;
        lean = s * 0.18;
        break;
      }
      case 'wave': {
        bounce = Math.sin(t * 1.6) * 0.012;
        armLZ = 0.15;
        armRZ = -2.55 - Math.sin(t * 9) * 0.35; // right arm up, waving
        headTilt = 0.12 + Math.sin(t * 1.4) * 0.05;
        break;
      }
      case 'type': {
        // hands on the laptop keys, small quick taps, head looking down at the screen
        armLX = -1.15 + Math.max(0, Math.sin(t * 14)) * 0.08;
        armRX = -1.15 + Math.max(0, Math.sin(t * 14 + 1.7)) * 0.08;
        armLZ = 0.32;
        armRZ = -0.32;
        headTilt = Math.sin(t * 0.7) * 0.04;
        break;
      }
    }
    if (laptop.current) laptop.current.visible = p === 'type';
    if (lantern.current) lantern.current.visible = p !== 'type';

    // sitting: fold legs forward, drop hips a touch
    const sit = 1 - stand;
    hipY -= sit * 0.16;
    const headX = p === 'type' ? 0.28 : 0;

    // blend every joint toward its target so poses flow into each other
    const c = cur.current;
    const k = reducedMotion ? 1 : 1 - Math.exp(-12 * Math.min(delta, 0.1));
    c.hipY = ease(c.hipY, hipY + bounce, k);
    c.lean = ease(c.lean, lean, k);
    c.headZ = ease(c.headZ, headTilt, k);
    c.headX = ease(c.headX, headX, k * 0.6);
    c.legL = ease(c.legL, -sit * 1.45 + legSwing * stand, k);
    c.legR = ease(c.legR, -sit * 1.45 - legSwing * stand, k);
    c.aLX = ease(c.aLX, armLX, k);
    c.aLZ = ease(c.aLZ, armLZ, k);
    c.aRX = ease(c.aRX, armRX, k);
    c.aRZ = ease(c.aRZ, armRZ, k);

    legL.current.rotation.x = c.legL;
    legR.current.rotation.x = c.legR;
    hips.current.position.y = c.hipY;
    torso.current.rotation.x = c.lean;
    head.current.rotation.z = c.headZ;
    head.current.rotation.x = c.headX;
    // positive Z values above mean "away from the body"; flip to world sign per side
    armL.current.rotation.set(c.aLX, 0, -c.aLZ);
    armR.current.rotation.set(c.aRX, 0, -c.aRZ);
  });

  return (
    <group>
      <group ref={hips} position={[0, 0.58, 0]}>
        {/* legs */}
        {([[-0.075, legL], [0.075, legR]] as const).map(([x, ref], i) => (
          <group key={i} ref={ref} position={[x, 0, 0]}>
            <mesh position={[0, -0.27, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.37, 4, 12]} />
              {mat(look.frock ? look.skin : look.bottom, 0.7, true)}
            </mesh>
            {look.socks && (
              <mesh position={[0, -0.46, 0]} castShadow>
                <cylinderGeometry args={[0.056, 0.054, 0.1, 16]} />
                {mat(look.socks, 0.7, true)}
              </mesh>
            )}
            {!look.frock && !look.socks && (
              <mesh position={[0, -0.45, 0]} castShadow>
                <cylinderGeometry args={[0.058, 0.06, 0.05, 18]} />
                {mat(shade(look.bottom, 0.82), 0.7, true)}
              </mesh>
            )}
            <mesh position={[0, -0.53, 0.04]} scale={[1, 0.7, 1.5]} castShadow>
              <sphereGeometry args={[0.075, 18, 12]} />
              {mat(look.shoes ?? '#7A3B2E', 0.5, true)}
            </mesh>
            {/* sole */}
            <mesh position={[0, -0.575, 0.045]} scale={[1.05, 0.25, 1.6]}>
              <sphereGeometry args={[0.075, 18, 10]} />
              {mat('#3B2A20', 0.8, true)}
            </mesh>
          </group>
        ))}

        {/* pelvis */}
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.08, 0.12, 4, 12]} />
          {mat(look.frock ?? look.bottom, 0.7, true)}
        </mesh>

        <group ref={torso} position={[0, 0.06, 0]}>
          {/* torso */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.125, 0.135, 0.46, 20]} />
            {mat(look.frock ?? look.top, 0.65, true)}
          </mesh>
          {/* neck */}
          <mesh position={[0, 0.53, 0]} castShadow>
            <cylinderGeometry args={[0.052, 0.06, 0.1, 16]} />
            {mat(look.skin, 0.55, true)}
          </mesh>
          {/* rounded shoulders */}
          {[-0.13, 0.13].map((x) => (
            <mesh key={x} position={[x, 0.44, 0]} scale={[1, 0.8, 1]} castShadow>
              <sphereGeometry args={[0.068, 18, 12]} />
              {mat(look.frock ?? look.top, 0.65, true)}
            </mesh>
          ))}
          {/* chest/back curve so the torso isn't a plain tube */}
          <mesh position={[0, 0.3, 0.0]} scale={[1, 0.95, 0.74]} castShadow>
            <sphereGeometry args={[0.138, 22, 16]} />
            {mat(look.frock ?? look.top, 0.65, true)}
          </mesh>
          {!look.frock && (
            <>
              {/* shirt collar */}
              <mesh position={[0, 0.47, 0.01]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[1, 1.05, 0.55]}>
                <torusGeometry args={[0.075, 0.022, 8, 24]} />
                {mat(shade(look.top, 0.8), 0.6, true)}
              </mesh>
              {/* buttons down the placket */}
              {!look.kurta &&
                [0.38, 0.29, 0.2].map((y) => (
                  <mesh key={y} position={[0, y, 0.135]}>
                    <sphereGeometry args={[0.011, 8, 6]} />
                    {mat(shade(look.top, 0.6), 0.5, true)}
                  </mesh>
                ))}
              {/* belt with a buckle */}
              {!look.kurta && (
                <>
                  <mesh position={[0, 0.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.133, 0.018, 8, 36]} />
                    {mat('#3B2A20', 0.6, true)}
                  </mesh>
                  <mesh position={[0, 0.035, 0.145]}>
                    <boxGeometry args={[0.05, 0.036, 0.012]} />
                    <meshStandardMaterial color="#E9B949" metalness={0.7} roughness={0.3} />
                  </mesh>
                </>
              )}
            </>
          )}
          {look.frock && (
            <>
              {/* flared skirt that ends at the knee */}
              <mesh position={[0, -0.05, 0]} castShadow>
                <cylinderGeometry args={[0.135, 0.28, 0.36, 28, 1, true]} />
                <meshToonMaterial color={look.frock} gradientMap={toonRamp} side={THREE.DoubleSide} />
              </mesh>
              {/* soft lace hem */}
              <mesh position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.28, 0.016, 8, 48]} />
                <meshToonMaterial color="#FFF8F0" gradientMap={toonRamp} />
              </mesh>
              {look.ribbon && (
                <>
                  <mesh position={[0, 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.136, 0.018, 8, 40]} />
                    <meshToonMaterial color={look.ribbon} gradientMap={toonRamp} />
                  </mesh>
                  {/* bow at the back */}
                  {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * 0.05, 0.115, -0.15]} rotation={[0, 0, side * 0.5]} scale={[1.2, 0.7, 0.4]}>
                      <sphereGeometry args={[0.045, 14, 10]} />
                      <meshToonMaterial color={look.ribbon} gradientMap={toonRamp} />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.115, -0.155]}>
                    <sphereGeometry args={[0.026, 10, 8]} />
                    <meshToonMaterial color={look.ribbon} gradientMap={toonRamp} />
                  </mesh>
                </>
              )}
              {look.collar && (
                <mesh position={[0, 0.47, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} scale={[1, 1.05, 0.5]}>
                  <torusGeometry args={[0.1, 0.035, 8, 28]} />
                  <meshToonMaterial color={look.collar} gradientMap={toonRamp} />
                </mesh>
              )}
            </>
          )}
          {look.kurta && (
            <mesh position={[0, -0.1, 0]} castShadow>
              <cylinderGeometry args={[0.19, 0.31, 0.42, 24, 1, true]} />
              <meshToonMaterial color={look.kurta} gradientMap={toonRamp} side={THREE.DoubleSide} />
            </mesh>
          )}
          {look.kurta && (
            <mesh position={[0, -0.305, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.31, 0.016, 6, 40]} />
              <meshStandardMaterial color="#E9B949" metalness={0.6} roughness={0.3} emissive="#E9B949" emissiveIntensity={0.15} />
            </mesh>
          )}
          {look.scarf && (
            <mesh position={[0, 0.4, 0]} rotation={[0.25, 0, 0.5]} castShadow>
              <torusGeometry args={[0.17, 0.04, 10, 24]} />
              {mat(look.scarf, 0.6, true)}
            </mesh>
          )}

          {/* laptop, only shown while typing */}
          <group ref={laptop} position={[0, 0.1, 0.4]} visible={false}>
            <mesh>
              <boxGeometry args={[0.36, 0.02, 0.24]} />
              <meshStandardMaterial color="#C9CED6" metalness={0.5} roughness={0.35} />
            </mesh>
            <group position={[0, 0.01, -0.12]} rotation={[-0.35, 0, 0]}>
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[0.36, 0.24, 0.015]} />
                <meshStandardMaterial color="#C9CED6" metalness={0.5} roughness={0.35} />
              </mesh>
              <mesh position={[0, 0.12, 0.009]}>
                <planeGeometry args={[0.32, 0.2]} />
                <meshBasicMaterial color="#4CE0B3" toneMapped={false} />
              </mesh>
            </group>
          </group>

          {/* arms (pivot at shoulder) */}
          {([[-0.17, armL], [0.17, armR]] as const).map(([x, ref], i) => (
            <group key={i} ref={ref} position={[x, 0.44, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[look.frock ? 0.038 : 0.05, 0.17, 4, 12]} />
                {mat(look.frock ? look.skin : look.top, 0.65, true)}
              </mesh>
              {look.frock && (
                <mesh position={[0, -0.04, 0]} scale={[1, 0.85, 1]} castShadow>
                  <sphereGeometry args={[0.068, 16, 12]} />
                  {mat(look.frock, 0.65, true)}
                </mesh>
              )}
              {!look.frock && (
                <mesh position={[0, -0.215, 0]} castShadow>
                  <cylinderGeometry args={[0.054, 0.052, 0.035, 16]} />
                  {mat(shade(look.top, 0.82), 0.6, true)}
                </mesh>
              )}
              <mesh position={[0, -0.32, 0]} castShadow>
                <capsuleGeometry args={[0.036, 0.15, 4, 12]} />
                {mat(look.skin, 0.55, true)}
              </mesh>
              {/* hand: palm + thumb */}
              <mesh position={[0, -0.445, 0.004]} scale={[0.85, 1.15, 0.7]} castShadow>
                <sphereGeometry args={[0.044, 16, 12]} />
                {mat(look.skin, 0.55, true)}
              </mesh>
              <mesh position={[i === 0 ? 0.03 : -0.03, -0.425, 0.022]} rotation={[0, 0, i === 0 ? -0.6 : 0.6]}>
                <capsuleGeometry args={[0.013, 0.03, 4, 8]} />
                {mat(look.skin, 0.55, true)}
              </mesh>
              {i === 0 && accessory === 'lantern' && (
                <group ref={lantern} position={[0, -0.62, 0.02]}>
                  <mesh position={[0, 0.12, 0]}>
                    <torusGeometry args={[0.045, 0.01, 4, 10]} />
                    <meshStandardMaterial color="#3B2A20" />
                  </mesh>
                  <mesh>
                    <boxGeometry args={[0.13, 0.17, 0.13]} />
                    <meshStandardMaterial color="#FFC861" emissive="#FFB547" emissiveIntensity={2.2} toneMapped={false} />
                  </mesh>
                  {[0.095, -0.095].map((y) => (
                    <mesh key={y} position={[0, y, 0]}>
                      <boxGeometry args={[0.16, 0.025, 0.16]} />
                      <meshStandardMaterial color="#3B2A20" />
                    </mesh>
                  ))}
                  <pointLight color="#FFB547" intensity={2.4} distance={5} decay={1.6} />
                </group>
              )}
            </group>
          ))}

          {/* head */}
          <group ref={head} position={[0, 0.68, 0]} scale={1.06}>
            <mesh castShadow scale={[0.84, 1.06, 0.9]}>
              <sphereGeometry args={[0.2, 32, 24]} />
              {mat(look.skin, 0.55, true)}
            </mesh>
            {/* gently tapered chin so the face reads oval, not round */}
            <mesh position={[0, -0.08, 0.03]} scale={[0.62, 0.62, 0.74]}>
              <sphereGeometry args={[0.16, 24, 18]} />
              {mat(look.skin, 0.55, true)}
            </mesh>
            {/* eyes with a little shine */}
            {[-0.074, 0.074].map((x) => (
              <group key={x} position={[x, -0.01, 0.172]} rotation={[0, x * 2.2, 0]}>
                {/* iris */}
                <mesh scale={[1, 1.32, 0.45]}>
                  <sphereGeometry args={[0.036, 20, 16]} />
                  <meshBasicMaterial color="#2A160E" />
                </mesh>
                {/* warm lower glow in the iris */}
                <mesh position={[0, -0.016, 0.012]} scale={[1, 0.6, 0.3]}>
                  <sphereGeometry args={[0.022, 14, 10]} />
                  <meshBasicMaterial color="#8A4A2A" />
                </mesh>
                {/* highlights */}
                <mesh position={[0.012, 0.018, 0.017]}>
                  <sphereGeometry args={[0.011, 10, 8]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
                <mesh position={[-0.01, -0.012, 0.017]}>
                  <sphereGeometry args={[0.005, 8, 6]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
                {/* upper lash line */}
                <mesh position={[0, 0.004, 0.006]} rotation={[0, 0, Math.PI * 0.12]} scale={[1, 1.3, 1]}>
                  <torusGeometry args={[0.036, 0.0055, 6, 24, Math.PI * 0.76]} />
                  <meshBasicMaterial color="#120A07" />
                </mesh>
                <mesh position={[x > 0 ? 0.038 : -0.038, 0.026, 0.006]} rotation={[0, 0, x > 0 ? -0.9 : 0.9]}>
                  <capsuleGeometry args={[0.005, 0.014, 4, 6]} />
                  <meshBasicMaterial color="#120A07" />
                </mesh>
              </group>
            ))}
            {/* eyebrows */}
            {[-0.072, 0.072].map((x) => (
              <mesh key={x} position={[x, 0.092, 0.17]} rotation={[0, x * 2.2, Math.PI / 2 + (x > 0 ? 0.2 : -0.2)]}>
                <capsuleGeometry args={[0.0065, 0.04, 4, 8]} />
                <meshBasicMaterial color={look.hair} />
              </mesh>
            ))}
            {/* cheeks */}
            {[-0.1, 0.1].map((x) => (
              <mesh key={x} position={[x * 1.2, -0.055, 0.15]} scale={[1.1, 0.6, 0.4]}>
                <sphereGeometry args={[0.03, 12, 10]} />
                <meshBasicMaterial color="#F08C8C" transparent opacity={0.45} />
              </mesh>
            ))}
            {/* ears */}
            {[-0.172, 0.172].map((x) => (
              <mesh key={x} position={[x, -0.01, 0.0]} scale={[0.45, 1, 0.75]}>
                <sphereGeometry args={[0.045, 14, 10]} />
                {mat(look.skin, 0.55, true)}
              </mesh>
            ))}
            {/* nose */}
            <mesh position={[0, -0.045, 0.19]} scale={[0.8, 1, 0.9]}>
              <sphereGeometry args={[0.02, 12, 10]} />
              {mat(shade(look.skin, 0.94), 0.55, true)}
            </mesh>
            {/* soft smile */}
            {!look.lips && (
              <mesh position={[0, -0.095, 0.17]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.024, 0.005, 6, 16, Math.PI]} />
                <meshBasicMaterial color="#9A3F3A" />
              </mesh>
            )}
            {/* hair cap */}
            <mesh position={[0, look.cap ? 0.0 : 0.04, -0.03]} scale={[0.96, 1.02, 1.0]} castShadow>
              <sphereGeometry args={[0.2, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshToonMaterial color={look.hair} gradientMap={toonRamp} side={THREE.DoubleSide} />
            </mesh>
            {/* soft shine band on the hair */}
            <mesh position={[0, 0.045, -0.03]} rotation={[-0.35, 0, 0]} scale={[0.98, 1, 1.02]}>
              <torusGeometry args={[0.19, 0.008, 4, 28, Math.PI * 0.55]} />
              <meshBasicMaterial color="#6B5A55" transparent opacity={0.7} />
            </mesh>
            {/* fringe */}
            {look.longHair ? (
              <>
                {/* side-swept fringe */}
                <mesh position={[-0.05, 0.135, 0.13]} rotation={[0.75, 0, 0.5]} scale={[1.6, 0.42, 0.9]} castShadow>
                  <sphereGeometry args={[0.09, 18, 12]} />
                  {mat(look.hair, 0.45, true)}
                </mesh>
                <mesh position={[0.095, 0.15, 0.11]} rotation={[0.7, 0, -0.35]} scale={[1.1, 0.4, 0.8]} castShadow>
                  <sphereGeometry args={[0.08, 16, 12]} />
                  {mat(look.hair, 0.45, true)}
                </mesh>
                {/* hair falling down the back */}
                <mesh position={[0, -0.12, -0.1]} scale={[0.9, 1.2, 0.5]} castShadow>
                  <cylinderGeometry args={[0.19, 0.14, 0.36, 24]} />
                  {mat(look.hair, 0.45, true)}
                </mesh>
                {/* side locks framing the face */}
                {[-0.155, 0.155].map((x) => (
                  <mesh key={x} position={[x, -0.1, 0.02]} rotation={[0, 0, x > 0 ? -0.08 : 0.08]} castShadow>
                    <capsuleGeometry args={[0.034, 0.26, 4, 10]} />
                    {mat(look.hair, 0.45, true)}
                  </mesh>
                ))}
              </>
            ) : (
              <group>
                {/* layered tufts give the short hair real volume */}
                {[
                  [-0.09, 0.15, 0.1, 0.4, 1.3, 0.5, 0.75],
                  [0.0, 0.17, 0.12, 0.2, 1.5, 0.45, 0.8],
                  [0.1, 0.15, 0.1, -0.3, 1.3, 0.5, 0.75],
                  [-0.15, 0.06, 0.04, 0.3, 0.8, 0.9, 0.7],
                  [0.15, 0.06, 0.04, -0.3, 0.8, 0.9, 0.7],
                  [0.0, 0.2, -0.02, 0, 1.5, 0.6, 1.2],
                ]
                  // under a cap only the side tufts show
                  .filter((_, k) => !look.cap || k === 3 || k === 4)
                  .map(([x, y, z, rz, sx, sy, sz], k) => (
                  <mesh key={k} position={[x, y, z]} rotation={[0.5, 0, rz]} scale={[sx, sy, sz]} castShadow>
                    <sphereGeometry args={[0.08, 18, 12]} />
                    {mat(look.hair, 0.45, true)}
                  </mesh>
                ))}
                {/* back of the head */}
                <mesh position={[0, 0.0, -0.1]} scale={[1.0, 0.95, 0.8]} castShadow>
                  <sphereGeometry args={[0.17, 22, 16]} />
                  {mat(look.hair, 0.45, true)}
                </mesh>
              </group>
            )}
            {look.earrings &&
              [-0.16, 0.16].map((x) => (
                <mesh key={x} position={[x, -0.08, 0.02]}>
                  <sphereGeometry args={[0.022, 12, 10]} />
                  <meshStandardMaterial color={look.earrings} metalness={0.7} roughness={0.25} emissive={look.earrings} emissiveIntensity={0.3} />
                </mesh>
              ))}
            {look.flower && (
              <group position={[0.15, 0.14, -0.04]}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.045, Math.sin((i / 5) * Math.PI * 2) * 0.045, 0.02]}>
                    <sphereGeometry args={[0.035, 14, 10]} />
                    <meshStandardMaterial color={look.flower} emissive={look.flower} emissiveIntensity={0.2} />
                  </mesh>
                ))}
                <mesh position={[0, 0, 0.04]}>
                  <sphereGeometry args={[0.025, 12, 10]} />
                  <meshStandardMaterial color="#FDE047" />
                </mesh>
              </group>
            )}
            {look.lips && (
              <mesh position={[0, -0.09, 0.172]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.022, 0.0045, 6, 16, Math.PI]} />
                <meshBasicMaterial color={look.lips} />
              </mesh>
            )}
            {accessory === 'sunglasses' && (
              <group position={[0, -0.005, 0.205]}>
                {[-0.076, 0.076].map((x) => (
                  <mesh key={x} position={[x, 0, -0.004]} rotation={[0, x * 2.2, Math.PI / 2]} scale={[1.2, 1, 0.5]}>
                    <capsuleGeometry args={[0.042, 0.05, 4, 14]} />
                    <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.15} />
                  </mesh>
                ))}
                <mesh>
                  <boxGeometry args={[0.05, 0.012, 0.015]} />
                  <meshStandardMaterial color="#111827" />
                </mesh>
              </group>
            )}
            {look.bun && (
              <mesh position={[0, 0.22, -0.08]} castShadow>
                <sphereGeometry args={[0.09, 18, 14]} />
                {mat(look.hair, 0.45, true)}
              </mesh>
            )}
            {look.braid && (
              <mesh castShadow>
                <primitive object={look.longHair ? BRAID_LONG : BRAID_SHORT} attach="geometry" />
                {mat(look.hair, 0.45, true)}
              </mesh>
            )}
            {look.cap && (
              <group position={[0, 0.135, -0.005]} scale={1.08}>
                {/* crown */}
                <mesh castShadow scale={[1, 0.62, 1.04]}>
                  <sphereGeometry args={[0.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  {mat(look.cap, 0.6, true)}
                </mesh>
                <mesh position={[0, 0.0, 0]} castShadow>
                  <cylinderGeometry args={[0.2, 0.205, 0.05, 24]} />
                  {mat(look.cap, 0.6, true)}
                </mesh>
                {/* button on top */}
                <mesh position={[0, 0.125, 0]}>
                  <sphereGeometry args={[0.018, 10, 8]} />
                  {mat(shade(look.cap, 0.75), 0.6, true)}
                </mesh>
                {/* curved brim */}
                <mesh position={[0, -0.02, 0.16]} rotation={[0.12, 0, 0]} scale={[1, 0.18, 0.75]} castShadow>
                  <sphereGeometry args={[0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  {mat(look.cap, 0.6, true)}
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
