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

const mat = (color: string, rough = 0.8, smooth = false) => (
  <meshStandardMaterial color={color} roughness={rough} flatShading={!smooth} />
);

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
        {([[-0.1, legL], [0.1, legR]] as const).map(([x, ref], i) => (
          <group key={i} ref={ref} position={[x, 0, 0]}>
            <mesh position={[0, -0.27, 0]} castShadow>
              <capsuleGeometry args={[0.068, 0.36, 4, 12]} />
              {mat(look.bottom, 0.7, true)}
            </mesh>
            <mesh position={[0, -0.53, 0.04]} scale={[1, 0.7, 1.5]} castShadow>
              <sphereGeometry args={[0.075, 14, 10]} />
              {mat('#7A3B2E', 0.5, true)}
            </mesh>
          </group>
        ))}

        {/* pelvis */}
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.1, 0.16, 4, 12]} />
          {mat(look.bottom, 0.7, true)}
        </mesh>

        <group ref={torso} position={[0, 0.06, 0]}>
          {/* torso */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.19, 0.46, 20]} />
            {mat(look.top, 0.65, true)}
          </mesh>
          {look.kurta && (
            <mesh position={[0, -0.1, 0]} castShadow>
              <cylinderGeometry args={[0.19, 0.31, 0.42, 24, 1, true]} />
              <meshStandardMaterial color={look.kurta} roughness={0.65} side={THREE.DoubleSide} />
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
          {([[-0.22, armL], [0.22, armR]] as const).map(([x, ref], i) => (
            <group key={i} ref={ref} position={[x, 0.44, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.058, 0.16, 4, 12]} />
                {mat(look.top, 0.65, true)}
              </mesh>
              <mesh position={[0, -0.32, 0]} castShadow>
                <capsuleGeometry args={[0.045, 0.14, 4, 12]} />
                {mat(look.skin, 0.55, true)}
              </mesh>
              <mesh position={[0, -0.44, 0]} castShadow>
                <sphereGeometry args={[0.052, 14, 12]} />
                {mat(look.skin, 0.55, true)}
              </mesh>
              {i === 0 && accessory === 'lantern' && (
                <group position={[0, -0.62, 0.02]}>
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
          <group ref={head} position={[0, 0.66, 0]}>
            <mesh castShadow scale={[1, 1.03, 0.97]}>
              <sphereGeometry args={[0.2, 32, 24]} />
              {mat(look.skin, 0.55, true)}
            </mesh>
            {/* eyes with a little shine */}
            {[-0.072, 0.072].map((x) => (
              <group key={x} position={[x, -0.005, 0.176]} rotation={[0, x * 2.2, 0]}>
                <mesh scale={[1, 1.3, 0.5]}>
                  <sphereGeometry args={[0.03, 16, 14]} />
                  <meshBasicMaterial color="#20140F" />
                </mesh>
                <mesh position={[0.01, 0.014, 0.014]}>
                  <sphereGeometry args={[0.01, 10, 8]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>
            ))}
            {/* eyebrows */}
            {[-0.072, 0.072].map((x) => (
              <mesh key={x} position={[x, 0.065, 0.178]} rotation={[0, x * 2.2, Math.PI / 2 + (x > 0 ? 0.18 : -0.18)]}>
                <capsuleGeometry args={[0.0065, 0.04, 4, 8]} />
                <meshBasicMaterial color={look.hair} />
              </mesh>
            ))}
            {/* cheeks */}
            {[-0.1, 0.1].map((x) => (
              <mesh key={x} position={[x * 1.15, -0.05, 0.16]} scale={[1.2, 0.7, 0.4]}>
                <sphereGeometry args={[0.03, 12, 10]} />
                <meshBasicMaterial color="#F08C8C" transparent opacity={0.45} />
              </mesh>
            ))}
            {/* hair cap */}
            <mesh position={[0, 0.04, -0.035]} scale={[1.08, 1.02, 1.06]} castShadow>
              <sphereGeometry args={[0.2, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshStandardMaterial color={look.hair} roughness={0.45} side={THREE.DoubleSide} />
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
                <mesh position={[0, -0.12, -0.11]} scale={[1, 1.2, 0.55]} castShadow>
                  <cylinderGeometry args={[0.2, 0.15, 0.36, 24]} />
                  {mat(look.hair, 0.45, true)}
                </mesh>
                {/* side locks framing the face */}
                {[-0.17, 0.17].map((x) => (
                  <mesh key={x} position={[x, -0.1, 0.03]} rotation={[0, 0, x > 0 ? -0.08 : 0.08]} castShadow>
                    <capsuleGeometry args={[0.04, 0.26, 4, 10]} />
                    {mat(look.hair, 0.45, true)}
                  </mesh>
                ))}
              </>
            ) : (
              <mesh position={[0, 0.12, 0.1]} rotation={[0.5, 0, 0]} castShadow>
                <boxGeometry args={[0.34, 0.08, 0.12]} />
                {mat(look.hair, 0.9)}
              </mesh>
            )}
            {look.earrings &&
              [-0.19, 0.19].map((x) => (
                <mesh key={x} position={[x, -0.08, 0.02]}>
                  <octahedronGeometry args={[0.03, 0]} />
                  <meshStandardMaterial color={look.earrings} metalness={0.7} roughness={0.25} emissive={look.earrings} emissiveIntensity={0.3} />
                </mesh>
              ))}
            {look.flower && (
              <group position={[0.15, 0.14, -0.04]}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.045, Math.sin((i / 5) * Math.PI * 2) * 0.045, 0.02]}>
                    <sphereGeometry args={[0.035, 6, 6]} />
                    <meshStandardMaterial color={look.flower} emissive={look.flower} emissiveIntensity={0.2} />
                  </mesh>
                ))}
                <mesh position={[0, 0, 0.04]}>
                  <sphereGeometry args={[0.025, 6, 6]} />
                  <meshStandardMaterial color="#FDE047" />
                </mesh>
              </group>
            )}
            {look.lips && (
              <mesh position={[0, -0.085, 0.186]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.022, 0.0045, 6, 16, Math.PI]} />
                <meshBasicMaterial color={look.lips} />
              </mesh>
            )}
            {accessory === 'sunglasses' && (
              <group position={[0, 0.005, 0.2]}>
                {[-0.072, 0.072].map((x) => (
                  <mesh key={x} position={[x, 0, 0]} rotation={[0, x * 2.2, Math.PI / 2]}>
                    <capsuleGeometry args={[0.03, 0.04, 4, 12]} />
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
                <icosahedronGeometry args={[0.09, 0]} />
                {mat(look.hair, 0.9)}
              </mesh>
            )}
            {look.braid &&
              (look.longHair ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4]).map((i) => (
                <mesh key={i} position={[0, -0.12 - i * 0.1, -0.2 - i * 0.01]} castShadow>
                  <sphereGeometry args={[Math.max(0.03, 0.065 - i * 0.005), 12, 10]} />
                  {mat(look.hair, 0.45, true)}
                </mesh>
              ))}
            {look.cap && (
              <group position={[0, 0.13, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.2, 0.21, 0.1, 8]} />
                  {mat(look.cap)}
                </mesh>
                <mesh position={[0, -0.03, 0.17]} castShadow>
                  <boxGeometry args={[0.26, 0.03, 0.16]} />
                  {mat(look.cap)}
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
