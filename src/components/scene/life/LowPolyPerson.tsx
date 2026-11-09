import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export type PersonPose = 'walk' | 'idle' | 'cheer' | 'row' | 'wave';

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
}

const mat = (color: string, rough = 0.8) => (
  <meshStandardMaterial color={color} roughness={rough} flatShading />
);

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
}) => {
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useFrame((state) => {
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
    }

    // sitting: fold legs forward, drop hips a touch
    const sit = 1 - stand;
    hipY -= sit * 0.16;
    legL.current.rotation.x = -sit * 1.45 + legSwing * stand;
    legR.current.rotation.x = -sit * 1.45 - legSwing * stand;

    hips.current.position.y = hipY + bounce;
    torso.current.rotation.x = lean;
    head.current.rotation.z = headTilt;
    // positive Z values above mean "away from the body"; flip to world sign per side
    armL.current.rotation.set(armLX, 0, -armLZ);
    armR.current.rotation.set(armRX, 0, -armRZ);
  });

  return (
    <group>
      <group ref={hips} position={[0, 0.58, 0]}>
        {/* legs */}
        {([[-0.1, legL], [0.1, legR]] as const).map(([x, ref], i) => (
          <group key={i} ref={ref} position={[x, 0, 0]}>
            <mesh position={[0, -0.27, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.5, 6]} />
              {mat(look.bottom)}
            </mesh>
            <mesh position={[0, -0.54, 0.05]} castShadow>
              <boxGeometry args={[0.13, 0.08, 0.22]} />
              {mat('#3B2A20')}
            </mesh>
          </group>
        ))}

        {/* pelvis */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[0.36, 0.16, 0.22]} />
          {mat(look.bottom)}
        </mesh>

        <group ref={torso} position={[0, 0.06, 0]}>
          {/* torso */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.17, 0.21, 0.46, 7]} />
            {mat(look.top, 0.75)}
          </mesh>
          {look.kurta && (
            <mesh position={[0, -0.1, 0]} castShadow>
              <cylinderGeometry args={[0.21, 0.33, 0.42, 9]} />
              {mat(look.kurta, 0.75)}
            </mesh>
          )}
          {look.scarf && (
            <mesh position={[0, 0.4, 0]} rotation={[0.25, 0, 0.5]} castShadow>
              <torusGeometry args={[0.18, 0.045, 5, 10]} />
              {mat(look.scarf, 0.7)}
            </mesh>
          )}

          {/* arms (pivot at shoulder) */}
          {([[-0.22, armL], [0.22, armR]] as const).map(([x, ref], i) => (
            <group key={i} ref={ref} position={[x, 0.44, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.065, 0.06, 0.24, 6]} />
                {mat(look.top, 0.75)}
              </mesh>
              <mesh position={[0, -0.32, 0]} castShadow>
                <cylinderGeometry args={[0.052, 0.048, 0.2, 6]} />
                {mat(look.skin, 0.7)}
              </mesh>
              <mesh position={[0, -0.44, 0]} castShadow>
                <icosahedronGeometry args={[0.055, 0]} />
                {mat(look.skin, 0.7)}
              </mesh>
            </group>
          ))}

          {/* head */}
          <group ref={head} position={[0, 0.66, 0]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.19, 1]} />
              {mat(look.skin, 0.7)}
            </mesh>
            {/* eyes */}
            {[-0.065, 0.065].map((x) => (
              <mesh key={x} position={[x, 0.01, 0.17]}>
                <sphereGeometry args={[0.022, 6, 6]} />
                <meshBasicMaterial color="#0B1B2D" />
              </mesh>
            ))}
            {/* cheeks */}
            {[-0.1, 0.1].map((x) => (
              <mesh key={x} position={[x, -0.05, 0.15]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshBasicMaterial color="#F4A3A0" transparent opacity={0.45} />
              </mesh>
            ))}
            {/* hair cap */}
            <mesh position={[0, 0.05, -0.03]} scale={[1.08, 0.9, 1.1]} castShadow>
              <icosahedronGeometry args={[0.19, 1]} />
              {mat(look.hair, 0.9)}
            </mesh>
            {/* fringe */}
            {look.longHair ? (
              <>
                <mesh position={[-0.07, 0.13, 0.12]} rotation={[0.6, 0, 0.45]} castShadow>
                  <boxGeometry args={[0.24, 0.06, 0.12]} />
                  {mat(look.hair, 0.9)}
                </mesh>
                <mesh position={[0.1, 0.14, 0.11]} rotation={[0.6, 0, -0.25]} castShadow>
                  <boxGeometry args={[0.16, 0.06, 0.1]} />
                  {mat(look.hair, 0.9)}
                </mesh>
                {/* hair falling down the back */}
                <mesh position={[0, -0.12, -0.11]} scale={[1, 1.2, 0.55]} castShadow>
                  <cylinderGeometry args={[0.19, 0.15, 0.36, 8]} />
                  {mat(look.hair, 0.9)}
                </mesh>
                {/* side locks framing the face */}
                {[-0.17, 0.17].map((x) => (
                  <mesh key={x} position={[x, -0.1, 0.03]} rotation={[0, 0, x > 0 ? -0.08 : 0.08]} castShadow>
                    <boxGeometry args={[0.07, 0.34, 0.12]} />
                    {mat(look.hair, 0.9)}
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
              <mesh position={[0, -0.095, 0.172]}>
                <boxGeometry args={[0.06, 0.018, 0.01]} />
                <meshBasicMaterial color={look.lips} />
              </mesh>
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
                  <icosahedronGeometry args={[Math.max(0.03, 0.065 - i * 0.005), 0]} />
                  {mat(look.hair, 0.9)}
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
