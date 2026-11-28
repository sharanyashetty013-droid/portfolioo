import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export type PersonPose = 'walk' | 'idle' | 'cheer' | 'row' | 'wave' | 'type' | 'fish' | 'reel';
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

const mat = (color: string, rough = 0.8, _smooth = true) => <meshStandardMaterial color={color} roughness={rough} />;
void toonRamp;

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
  const cur = useRef({ hipY: 0.58, lean: 0, headZ: 0, headX: 0, legL: 0, legR: 0, aLX: 0, aLZ: 0.12, aRX: 0, aRZ: -0.12, kneeL: 0, kneeR: 0, elL: -0.15, elR: -0.15 });
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);

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
    // elbows and knees bend so limbs read as real arms and legs
    const elbowT = p === 'row' ? -0.9 : p === 'type' ? -1.05 : p === 'walk' ? -0.3 : p === 'cheer' ? -0.25 : -0.15;
    c.elL = ease(c.elL, elbowT, k);
    c.elR = ease(c.elR, p === 'wave' ? -0.55 : elbowT, k);
    c.kneeL = ease(c.kneeL, sit * 1.45 + Math.max(0, legSwing * stand) * 1.2, k);
    c.kneeR = ease(c.kneeR, sit * 1.45 + Math.max(0, -legSwing * stand) * 1.2, k);

    legL.current.rotation.x = c.legL;
    legR.current.rotation.x = c.legR;
    hips.current.position.y = c.hipY;
    torso.current.rotation.x = c.lean;
    head.current.rotation.z = c.headZ;
    head.current.rotation.x = c.headX;
    // positive Z values above mean "away from the body"; flip to world sign per side
    armL.current.rotation.set(c.aLX, 0, -c.aLZ);
    armR.current.rotation.set(c.aRX, 0, -c.aRZ);
    if (kneeL.current) kneeL.current.rotation.x = c.kneeL;
    if (kneeR.current) kneeR.current.rotation.x = c.kneeR;
    if (elbowL.current) elbowL.current.rotation.x = c.elL;
    if (elbowR.current) elbowR.current.rotation.x = c.elR;
  });

  const skin = look.skin;
  const lipColor = look.lips ?? shade(skin, 0.72);
  const sleeve = look.frock ?? look.top;
  const legCloth = look.frock ? skin : look.bottom;

  return (
    <group>
      <group ref={hips} position={[0, 0.58, 0]}>
        {/* legs: thigh -> knee -> shin -> shoe */}
        {([[-0.068, legL, kneeL], [0.068, legR, kneeR]] as const).map(([x, ref, knee], i) => (
          <group key={i} ref={ref} position={[x, 0, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.046, 0.29, 18]} />
              {mat(legCloth, 0.8)}
            </mesh>
            <group ref={knee} position={[0, -0.29, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.044, 16, 12]} />
                {mat(legCloth, 0.8)}
              </mesh>
              <mesh position={[0, -0.125, -0.004]} castShadow>
                <cylinderGeometry args={[0.046, 0.034, 0.25, 18]} />
                {mat(legCloth, 0.8)}
              </mesh>
              {/* calf curve */}
              <mesh position={[0, -0.07, -0.014]} scale={[0.85, 1.6, 0.85]} castShadow>
                <sphereGeometry args={[0.038, 14, 10]} />
                {mat(legCloth, 0.8)}
              </mesh>
              {!look.frock && (
                <mesh position={[0, -0.235, 0]}>
                  <cylinderGeometry args={[0.042, 0.044, 0.04, 18]} />
                  {mat(shade(look.bottom, 0.8), 0.8)}
                </mesh>
              )}
              {look.socks && (
                <mesh position={[0, -0.235, 0]}>
                  <cylinderGeometry args={[0.037, 0.037, 0.06, 16]} />
                  {mat(look.socks, 0.7)}
                </mesh>
              )}
              {/* shoe: rounded toe, heel and sole */}
              <group position={[0, -0.27, 0.02]}>
                <mesh position={[0, 0, 0.03]} scale={[0.9, 0.62, 1.55]} castShadow>
                  <sphereGeometry args={[0.045, 18, 12]} />
                  {mat(look.shoes ?? '#6B3A2A', 0.45)}
                </mesh>
                <mesh position={[0, 0.005, -0.025]} castShadow>
                  <boxGeometry args={[0.07, 0.05, 0.06]} />
                  {mat(look.shoes ?? '#6B3A2A', 0.45)}
                </mesh>
                <mesh position={[0, -0.026, 0.015]} scale={[0.95, 0.22, 1.7]}>
                  <sphereGeometry args={[0.046, 18, 8]} />
                  {mat('#2B211C', 0.8)}
                </mesh>
              </group>
            </group>
          </group>
        ))}

        {/* pelvis */}
        <mesh position={[0, 0.03, 0]} scale={[1, 0.5, 0.7]} castShadow>
          <sphereGeometry args={[0.108, 22, 14]} />
          {mat(look.frock ?? look.bottom, 0.8)}
        </mesh>

        <group ref={torso} position={[0, 0.06, 0]}>
          {/* shaped torso: waist, ribcage, chest, shoulders */}
          <mesh geometry={TORSO_GEO} scale={[1, 1, 0.72]} castShadow>
            {mat(look.frock ?? look.top, 0.75)}
          </mesh>
          {[-0.128, 0.128].map((x) => (
            <mesh key={x} position={[x, 0.44, 0]} scale={[1, 0.85, 0.9]} castShadow>
              <sphereGeometry args={[0.05, 18, 12]} />
              {mat(look.frock ?? look.top, 0.75)}
            </mesh>
          ))}
          {/* neck */}
          <mesh position={[0, 0.535, 0.005]} castShadow>
            <cylinderGeometry args={[0.033, 0.04, 0.09, 16]} />
            {mat(skin, 0.55)}
          </mesh>

          {!look.frock && (
            <>
              {/* collar points + placket + buttons */}
              {[-1, 1].map((sd) => (
                <mesh key={sd} position={[sd * 0.028, 0.475, 0.07]} rotation={[0.35, 0, sd * 0.55]} castShadow>
                  <boxGeometry args={[0.045, 0.012, 0.05]} />
                  {mat(shade(look.top, 0.88), 0.7)}
                </mesh>
              ))}
              {!look.kurta && (
                <>
                  <mesh position={[0, 0.27, 0.086]}>
                    <boxGeometry args={[0.022, 0.4, 0.006]} />
                    {mat(shade(look.top, 0.9), 0.7)}
                  </mesh>
                  {[0.42, 0.34, 0.26, 0.18].map((y) => (
                    <mesh key={y} position={[0, y, 0.09]}>
                      <cylinderGeometry args={[0.007, 0.007, 0.004, 10]} />
                      {mat('#F1EDE6', 0.4)}
                    </mesh>
                  ))}
                  {/* chest pocket */}
                  <mesh position={[-0.055, 0.36, 0.083]} rotation={[0.08, 0, 0]}>
                    <boxGeometry args={[0.045, 0.05, 0.006]} />
                    {mat(shade(look.top, 0.9), 0.7)}
                  </mesh>
                  {/* belt + buckle */}
                  <mesh position={[0, 0.03, 0]} scale={[1, 1, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.104, 0.014, 8, 40]} />
                    {mat('#2B211C', 0.5)}
                  </mesh>
                  <mesh position={[0, 0.03, 0.08]}>
                    <boxGeometry args={[0.03, 0.026, 0.008]} />
                    <meshStandardMaterial color="#C9A24A" metalness={0.8} roughness={0.3} />
                  </mesh>
                </>
              )}
            </>
          )}

          {look.kurta && (
            <>
              <mesh geometry={KURTA_GEO} castShadow>
                <meshStandardMaterial color={look.kurta} roughness={0.75} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, -0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.235, 0.008, 6, 48]} />
                <meshStandardMaterial color="#E9B949" metalness={0.6} roughness={0.3} />
              </mesh>
            </>
          )}

          {look.frock && (
            <>
              <mesh geometry={SKIRT_GEO} castShadow>
                <meshStandardMaterial color={look.frock} roughness={0.75} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.255, 0.01, 8, 64]} />
                {mat('#FFF8F0', 0.7)}
              </mesh>
              {look.ribbon && (
                <>
                  <mesh position={[0, 0.115, 0]} scale={[1, 1, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.1, 0.012, 8, 40]} />
                    {mat(look.ribbon, 0.6)}
                  </mesh>
                  {[-1, 1].map((sd) => (
                    <mesh key={sd} position={[sd * 0.035, 0.115, -0.085]} rotation={[0, 0, sd * 0.5]} scale={[1.2, 0.65, 0.4]}>
                      <sphereGeometry args={[0.032, 14, 10]} />
                      {mat(look.ribbon ?? "#FFFFFF", 0.6)}
                    </mesh>
                  ))}
                </>
              )}
              {look.collar && (
                <mesh position={[0, 0.49, 0.01]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[1, 1, 0.5]}>
                  <torusGeometry args={[0.062, 0.016, 8, 28]} />
                  {mat(look.collar, 0.6)}
                </mesh>
              )}
            </>
          )}
          {look.scarf && (
            <mesh position={[0, 0.47, 0]} rotation={[0.25, 0, 0.45]} scale={[1, 1, 0.8]} castShadow>
              <torusGeometry args={[0.11, 0.024, 10, 28]} />
              {mat(look.scarf, 0.7)}
            </mesh>
          )}

          {/* laptop, only shown while typing */}
          <group ref={laptop} position={[0, 0.12, 0.34]} visible={false}>
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

          {/* arms: shoulder -> elbow -> forearm -> hand with fingers */}
          {([[-0.15, armL, elbowL], [0.15, armR, elbowR]] as const).map(([x, ref, elbow], i) => (
            <group key={i} ref={ref} position={[x, 0.44, 0]}>
              {look.frock ? (
                <>
                  <mesh position={[0, -0.03, 0]} scale={[1, 0.85, 1]} castShadow>
                    <sphereGeometry args={[0.058, 16, 12]} />
                    {mat(look.frock, 0.75)}
                  </mesh>
                  <mesh position={[0, -0.12, 0]} castShadow>
                    <cylinderGeometry args={[0.03, 0.026, 0.2, 14]} />
                    {mat(skin, 0.55)}
                  </mesh>
                </>
              ) : (
                <>
                  <mesh position={[0, -0.11, 0]} castShadow>
                    <cylinderGeometry args={[0.044, 0.04, 0.22, 16]} />
                    {mat(sleeve, 0.75)}
                  </mesh>
                  <mesh position={[0, -0.215, 0]}>
                    <cylinderGeometry args={[0.044, 0.044, 0.03, 16]} />
                    {mat(shade(sleeve, 0.85), 0.75)}
                  </mesh>
                </>
              )}
              <group ref={elbow} position={[0, -0.245, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.031, 14, 10]} />
                  {mat(skin, 0.55)}
                </mesh>
                <mesh position={[0, -0.1, 0]} castShadow>
                  <cylinderGeometry args={[0.031, 0.024, 0.2, 14]} />
                  {mat(skin, 0.55)}
                </mesh>
                {/* hand */}
                <group position={[0, -0.225, 0]}>
                  <mesh scale={[0.95, 1.2, 0.55]} castShadow>
                    <sphereGeometry args={[0.03, 16, 12]} />
                    {mat(skin, 0.55)}
                  </mesh>
                  {[-0.017, -0.006, 0.006, 0.017].map((fx, f) => (
                    <mesh key={fx} position={[fx, -0.042 - (f === 1 || f === 2 ? 0.004 : 0), 0.004]} rotation={[0.25, 0, 0]}>
                      <capsuleGeometry args={[0.0062, f === 1 || f === 2 ? 0.03 : 0.024, 4, 8]} />
                      {mat(skin, 0.55)}
                    </mesh>
                  ))}
                  <mesh position={[i === 0 ? 0.026 : -0.026, -0.008, 0.012]} rotation={[0.3, 0, i === 0 ? -0.7 : 0.7]}>
                    <capsuleGeometry args={[0.0075, 0.022, 4, 8]} />
                    {mat(skin, 0.55)}
                  </mesh>
                  {i === 0 && accessory === 'lantern' && (
                    <group ref={lantern} position={[0, -0.16, 0.01]}>
                      <mesh position={[0, 0.1, 0]}>
                        <torusGeometry args={[0.035, 0.008, 4, 10]} />
                        <meshStandardMaterial color="#3B2A20" />
                      </mesh>
                      <mesh>
                        <boxGeometry args={[0.1, 0.13, 0.1]} />
                        <meshStandardMaterial color="#FFC861" emissive="#FFB547" emissiveIntensity={2.2} toneMapped={false} />
                      </mesh>
                      {[0.072, -0.072].map((y) => (
                        <mesh key={y} position={[0, y, 0]}>
                          <boxGeometry args={[0.12, 0.02, 0.12]} />
                          <meshStandardMaterial color="#3B2A20" />
                        </mesh>
                      ))}
                      <pointLight color="#FFB547" intensity={2.4} distance={5} decay={1.6} />
                    </group>
                  )}
                </group>
              </group>
            </group>
          ))}

          {/* head: realistic proportions */}
          <group ref={head} position={[0, 0.58, 0]}>
            {/* skull + jaw + chin */}
            <mesh position={[0, 0.105, -0.004]} scale={[0.9, 1.06, 1.0]} castShadow>
              <sphereGeometry args={[0.1, 32, 24]} />
              {mat(skin, 0.55)}
            </mesh>
            <mesh position={[0, 0.06, 0.006]} scale={[0.84, 0.74, 0.86]} castShadow>
              <sphereGeometry args={[0.08, 28, 20]} />
              {mat(skin, 0.55)}
            </mesh>
            <mesh position={[0, 0.036, 0.05]} scale={[1, 0.75, 0.75]}>
              <sphereGeometry args={[0.024, 16, 12]} />
              {mat(skin, 0.55)}
            </mesh>
            {/* ears */}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.09, 0.1, -0.005]}>
                <mesh scale={[0.38, 1, 0.68]}>
                  <sphereGeometry args={[0.024, 14, 10]} />
                  {mat(skin, 0.55)}
                </mesh>
                <mesh position={[sd * 0.004, 0, 0.003]} scale={[0.2, 0.62, 0.42]}>
                  <sphereGeometry args={[0.024, 10, 8]} />
                  {mat(shade(skin, 0.8), 0.6)}
                </mesh>
              </group>
            ))}
            {/* eyes: whites, iris, pupil, catchlight, upper lid + lash line */}
            {[-0.034, 0.034].map((ex) => (
              <group key={ex} position={[ex, 0.108, 0.083]} rotation={[0, ex * 3.2, 0]}>
                <mesh scale={[1.3, 0.82, 0.6]}>
                  <sphereGeometry args={[0.0145, 18, 12]} />
                  <meshStandardMaterial color="#F4EFE8" roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.001, 0.0075]} scale={[1, 1, 0.5]}>
                  <sphereGeometry args={[0.0078, 16, 12]} />
                  <meshStandardMaterial color="#4A2A17" roughness={0.25} />
                </mesh>
                <mesh position={[0, -0.001, 0.0105]} scale={[1, 1, 0.4]}>
                  <sphereGeometry args={[0.0042, 12, 8]} />
                  <meshBasicMaterial color="#0E0805" />
                </mesh>
                <mesh position={[0.0025, 0.0025, 0.0125]}>
                  <sphereGeometry args={[0.0016, 8, 6]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
                <mesh position={[0, 0.0045, 0.002]} rotation={[-0.35, 0, 0]} scale={[1.38, 0.55, 0.7]}>
                  <sphereGeometry args={[0.0158, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  {mat(shade(skin, 0.95), 0.55)}
                </mesh>
                <mesh position={[0, 0.003, 0.0085]} rotation={[0, 0, Math.PI * 0.08]} scale={[1.3, 0.75, 1]}>
                  <torusGeometry args={[0.0142, 0.0022, 6, 20, Math.PI * 0.85]} />
                  <meshBasicMaterial color="#15100D" />
                </mesh>
              </group>
            ))}
            {/* eyebrows */}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.036, 0.133, 0.088]} rotation={[0, sd * 0.12, Math.PI / 2 - sd * 0.08]}>
                <capsuleGeometry args={[0.0034, 0.026, 4, 8]} />
                {mat(look.hair === '#E2E8F0' ? '#9CA3AF' : look.hair, 0.6)}
              </mesh>
            ))}
            {/* nose: bridge, tip, nostril wings */}
            <mesh position={[0, 0.094, 0.093]} rotation={[-0.25, 0, 0]} scale={[0.8, 1, 0.7]}>
              <capsuleGeometry args={[0.0062, 0.022, 4, 10]} />
              {mat(skin, 0.55)}
            </mesh>
            <mesh position={[0, 0.08, 0.098]} scale={[1, 0.85, 0.85]}>
              <sphereGeometry args={[0.0095, 14, 10]} />
              {mat(skin, 0.55)}
            </mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.0098, 0.077, 0.093]} scale={[1, 0.8, 0.8]}>
                <sphereGeometry args={[0.0062, 10, 8]} />
                {mat(skin, 0.55)}
              </mesh>
            ))}
            {/* lips */}
            <mesh position={[0, 0.057, 0.0815]} rotation={[0, 0, Math.PI / 2]} scale={[0.7, 1, 0.55]}>
              <capsuleGeometry args={[0.0048, 0.026, 4, 10]} />
              {mat(lipColor, 0.45)}
            </mesh>
            <mesh position={[0, 0.0505, 0.0805]} rotation={[0, 0, Math.PI / 2]} scale={[0.8, 1, 0.6]}>
              <capsuleGeometry args={[0.0055, 0.02, 4, 10]} />
              {mat(shade(lipColor, 1.08), 0.45)}
            </mesh>

            {/* hair */}
            {look.longHair ? (
              <>
                <mesh position={[0, 0.118, -0.012]} scale={[0.98, 1.0, 1.06]} rotation={[-0.35, 0, 0]} castShadow>
                  <sphereGeometry args={[0.103, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                  {mat(look.hair, 0.42)}
                </mesh>
                {/* side-swept fringe */}
                <mesh position={[-0.035, 0.18, 0.058]} rotation={[0.9, 0, 0.55]} scale={[1.5, 0.4, 0.8]} castShadow>
                  <sphereGeometry args={[0.042, 18, 12]} />
                  {mat(look.hair, 0.42)}
                </mesh>
                <mesh position={[0.045, 0.18, 0.055]} rotation={[0.85, 0, -0.4]} scale={[1.1, 0.4, 0.8]} castShadow>
                  <sphereGeometry args={[0.04, 16, 12]} />
                  {mat(look.hair, 0.42)}
                </mesh>
                {/* fall down the back to the shoulder blades */}
                <mesh position={[0, -0.02, -0.055]} scale={[1, 1, 0.55]} castShadow>
                  <cylinderGeometry args={[0.1, 0.085, 0.26, 24]} />
                  {mat(look.hair, 0.42)}
                </mesh>
                <mesh position={[0, -0.15, -0.055]} scale={[1, 0.6, 0.5]}>
                  <sphereGeometry args={[0.086, 20, 12]} />
                  {mat(look.hair, 0.42)}
                </mesh>
                {/* side locks framing the face */}
                {[-1, 1].map((sd) => (
                  <mesh key={sd} position={[sd * 0.085, 0.03, 0.025]} rotation={[0.1, 0, sd * -0.08]} castShadow>
                    <capsuleGeometry args={[0.018, 0.16, 4, 10]} />
                    {mat(look.hair, 0.42)}
                  </mesh>
                ))}
              </>
            ) : (
              <>
                {/* short hair: crown with a defined hairline and side parting */}
                <mesh position={[0, look.cap ? 0.11 : 0.122, -0.008]} scale={[0.97, 1.0, 1.05]} rotation={[-0.4, 0, 0]} castShadow>
                  <sphereGeometry args={[0.104, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.46]} />
                  {mat(look.hair, 0.5)}
                </mesh>
                {!look.cap && (
                  <>
                    <mesh position={[0.012, 0.198, 0.04]} rotation={[0.55, 0, -0.25]} scale={[1.55, 0.5, 1.0]} castShadow>
                      <sphereGeometry args={[0.048, 18, 12]} />
                      {mat(look.hair, 0.5)}
                    </mesh>
                    <mesh position={[-0.05, 0.185, 0.035]} rotation={[0.5, 0, 0.45]} scale={[1.0, 0.45, 0.9]} castShadow>
                      <sphereGeometry args={[0.04, 16, 12]} />
                      {mat(look.hair, 0.5)}
                    </mesh>
                  </>
                )}
                {/* back taper */}
                <mesh position={[0, 0.07, -0.062]} scale={[1, 0.8, 0.6]}>
                  <sphereGeometry args={[0.08, 20, 14]} />
                  {mat(look.hair, 0.5)}
                </mesh>
              </>
            )}
            {look.bun && (
              <mesh position={[0, 0.215, -0.055]} castShadow>
                <sphereGeometry args={[0.045, 20, 14]} />
                {mat(look.hair, 0.42)}
              </mesh>
            )}
            {look.braid && (
              <mesh position={[0, 0.07, 0.02]} scale={0.5} castShadow>
                <primitive object={look.longHair ? BRAID_LONG : BRAID_SHORT} attach="geometry" />
                {mat(look.hair, 0.42)}
              </mesh>
            )}
            {look.earrings &&
              [-1, 1].map((sd) => (
                <mesh key={sd} position={[sd * 0.09, 0.075, 0.0]}>
                  <sphereGeometry args={[0.009, 12, 10]} />
                  <meshStandardMaterial color={look.earrings} metalness={0.8} roughness={0.25} />
                </mesh>
              ))}
            {look.flower && (
              <group position={[0.08, 0.17, -0.01]} scale={0.5}>
                {[0, 1, 2, 3, 4].map((k) => (
                  <mesh key={k} position={[Math.cos((k / 5) * Math.PI * 2) * 0.045, Math.sin((k / 5) * Math.PI * 2) * 0.045, 0.02]}>
                    <sphereGeometry args={[0.035, 14, 10]} />
                    <meshStandardMaterial color={look.flower} />
                  </mesh>
                ))}
                <mesh position={[0, 0, 0.04]}>
                  <sphereGeometry args={[0.025, 12, 10]} />
                  <meshStandardMaterial color="#FDE047" />
                </mesh>
              </group>
            )}
            {look.cap && (
              <group position={[0, 0.15, -0.004]}>
                <mesh castShadow scale={[1, 0.66, 1.06]}>
                  <sphereGeometry args={[0.108, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  {mat(look.cap, 0.7)}
                </mesh>
                <mesh position={[0, 0.002, 0]}>
                  <cylinderGeometry args={[0.108, 0.11, 0.025, 28]} />
                  {mat(shade(look.cap, 0.85), 0.7)}
                </mesh>
                <mesh position={[0, 0.072, 0]}>
                  <sphereGeometry args={[0.01, 10, 8]} />
                  {mat(shade(look.cap, 0.75), 0.7)}
                </mesh>
                <mesh position={[0, -0.006, 0.098]} rotation={[0.18, 0, 0]} scale={[1, 0.16, 0.82]} castShadow>
                  <sphereGeometry args={[0.09, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  {mat(look.cap, 0.7)}
                </mesh>
              </group>
            )}
            {accessory === 'sunglasses' && (
              <group position={[0, 0.108, 0.098]}>
                {[-0.034, 0.034].map((gx) => (
                  <mesh key={gx} position={[gx, 0, 0]} rotation={[0, gx * 3.2, 0]} scale={[1.25, 0.9, 0.35]}>
                    <sphereGeometry args={[0.02, 16, 12]} />
                    <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.15} />
                  </mesh>
                ))}
                <mesh>
                  <boxGeometry args={[0.024, 0.005, 0.006]} />
                  <meshStandardMaterial color="#111827" />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

// shaped torso: narrow waist, fuller ribcage and chest, sloping into the neck
const TORSO_GEO = (() => {
  const pts = [
    [0.098, 0.0], [0.094, 0.06], [0.09, 0.13], [0.102, 0.22], [0.116, 0.31], [0.122, 0.39], [0.118, 0.44], [0.09, 0.49], [0.04, 0.52],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 28);
})();

// soft vertical folds for clothes that hang (kurta, frock skirt)
const foldedLathe = (profile: [number, number][], folds: number, depth: number) => {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const top = profile[0][1];
  const bottom = profile[profile.length - 1][1];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const k = (top - v.y) / (top - bottom); // folds grow toward the hem
    const f = 1 + Math.sin(a * folds) * depth * k;
    p.setXYZ(i, v.x * f, v.y, v.z * f * 0.85);
  }
  g.computeVertexNormals();
  return g;
};
const KURTA_GEO = foldedLathe([[0.1, 0.12], [0.11, 0.0], [0.15, -0.16], [0.235, -0.33]], 11, 0.06);
const SKIRT_GEO = foldedLathe([[0.1, 0.12], [0.12, 0.06], [0.19, -0.06], [0.255, -0.2]], 13, 0.07);
