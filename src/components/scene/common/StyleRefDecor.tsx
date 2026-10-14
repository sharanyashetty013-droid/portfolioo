import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ---------------------------------------------------------------------------
// 1. COZY LOW-POLY ROWING BOAT (Hero Boat & Moored Variants)
// ---------------------------------------------------------------------------
export interface RowingBoatProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  hullColor?: string;     // Warm coral #F2765D (hero), or butter yellow, mint, sky blue
  stripeColor?: string;   // Cream #FFF3D6 along top edge
  innerColor?: string;    // Cream inner planks
  hasOars?: boolean;
  hasMastAndFlag?: boolean;
  flagColor?: string;     // Teal #1AA6A6
  hasLantern?: boolean;
}

export const RowingBoat: React.FC<RowingBoatProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  hullColor = '#F2765D',       // Default warm coral
  stripeColor = '#FFF3D6',     // Cream top edge stripe
  innerColor = '#FFF3D6',      // Cream inner planks
  hasOars = true,
  hasMastAndFlag = false,
  flagColor = '#1AA6A6',       // Teal pennant flag
  hasLantern = false,
}) => {
  // Build faceted low-poly wooden hull
  const hullGeo = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Bottom face
      -0.6, 0.0, 1.4,   0.6, 0.0, 1.4,   0.0, 0.05, -1.8,
      -0.6, 0.0, 1.4,   0.0, 0.05, -1.8, -0.65, 0.0, 0.0,
      0.6, 0.0, 1.4,    0.65, 0.0, 0.0,   0.0, 0.05, -1.8,
      // Starboard (Right) outer wall
      0.6, 0.0, 1.4,    0.85, 0.48, 1.4,   0.9, 0.5, 0.0,
      0.6, 0.0, 1.4,    0.9, 0.5, 0.0,     0.65, 0.0, 0.0,
      0.65, 0.0, 0.0,   0.9, 0.5, 0.0,     0.0, 0.58, -1.9,
      0.65, 0.0, 0.0,   0.0, 0.58, -1.9,   0.0, 0.05, -1.8,
      // Port (Left) outer wall
      -0.6, 0.0, 1.4,   -0.9, 0.5, 0.0,    -0.85, 0.48, 1.4,
      -0.6, 0.0, 1.4,   -0.65, 0.0, 0.0,   -0.9, 0.5, 0.0,
      -0.65, 0.0, 0.0,  -0.0, 0.58, -1.9,  -0.9, 0.5, 0.0,
      -0.65, 0.0, 0.0,  0.0, 0.05, -1.8,   -0.0, 0.58, -1.9,
      // Transom (Back stern wall)
      -0.6, 0.0, 1.4,   -0.85, 0.48, 1.4,  0.85, 0.48, 1.4,
      -0.6, 0.0, 1.4,   0.85, 0.48, 1.4,   0.6, 0.0, 1.4,
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Outer Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={hullColor}
          roughness={0.75}
          metalness={0.02}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>

      {/* Cream Stripe along the top edge */}
      <mesh position={[-0.83, 0.49, 0.4]} rotation={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.09, 0.09, 1.9]} />
        <meshStandardMaterial color={stripeColor} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0.83, 0.49, 0.4]} rotation={[0, -0.1, 0]} castShadow>
        <boxGeometry args={[0.09, 0.09, 1.9]} />
        <meshStandardMaterial color={stripeColor} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.49, 1.4]} castShadow>
        <boxGeometry args={[1.7, 0.09, 0.09]} />
        <meshStandardMaterial color={stripeColor} roughness={0.7} flatShading />
      </mesh>

      {/* Bow Prow Cap Stem */}
      <mesh position={[0, 0.35, -1.85]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.62, 0.1]} />
        <meshStandardMaterial color={stripeColor} roughness={0.7} flatShading />
      </mesh>

      {/* Interior Cream Planks & Bench Seats */}
      <group position={[0, 0.28, -0.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.32, 0.07, 0.44]} />
          <meshStandardMaterial color={innerColor} roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0, -0.14, 0]} castShadow>
          <boxGeometry args={[0.55, 0.2, 0.35]} />
          <meshStandardMaterial color="#E8D5B5" roughness={0.85} flatShading />
        </mesh>
      </group>
      <group position={[0, 0.26, 0.65]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.42, 0.07, 0.44]} />
          <meshStandardMaterial color={innerColor} roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0, -0.13, 0]} castShadow>
          <boxGeometry args={[0.65, 0.2, 0.35]} />
          <meshStandardMaterial color="#E8D5B5" roughness={0.85} flatShading />
        </mesh>
      </group>

      {/* Floor Slats */}
      <mesh position={[0, 0.06, 0.2]} receiveShadow>
        <boxGeometry args={[0.92, 0.02, 1.6]} />
        <meshStandardMaterial color={innerColor} roughness={0.85} flatShading />
      </mesh>

      {/* Oars */}
      {hasOars && (
        <group position={[0, 0.40, 0.15]}>
          <group position={[-0.1, 0.05, 0]} rotation={[0.08, -0.35, 0.22]}>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.024, 0.028, 2.7, 6]} />
              <meshStandardMaterial color="#E2BA84" roughness={0.7} flatShading />
            </mesh>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.18, 6]} />
              <meshStandardMaterial color="#C89B65" roughness={0.7} />
            </mesh>
            <mesh position={[0, -1.35, 0]} castShadow>
              <boxGeometry args={[0.18, 0.48, 0.025]} />
              <meshStandardMaterial color="#E2BA84" roughness={0.7} flatShading />
            </mesh>
          </group>
          <group position={[0.1, 0.05, 0]} rotation={[-0.06, 0.38, -0.25]}>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.024, 0.028, 2.7, 6]} />
              <meshStandardMaterial color="#E2BA84" roughness={0.7} flatShading />
            </mesh>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.18, 6]} />
              <meshStandardMaterial color="#C89B65" roughness={0.7} />
            </mesh>
            <mesh position={[0, -1.35, 0]} castShadow>
              <boxGeometry args={[0.18, 0.48, 0.025]} />
              <meshStandardMaterial color="#E2BA84" roughness={0.7} flatShading />
            </mesh>
          </group>
        </group>
      )}

      {/* Flag */}
      {hasMastAndFlag && (
        <group position={[0, 0.35, -0.1]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 1.8, 6]} />
            <meshStandardMaterial color="#C89B65" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 1.82, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#FDE047" />
          </mesh>
          <mesh position={[0.28, 1.62, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <coneGeometry args={[0.22, 0.6, 3]} />
            <meshStandardMaterial
              color={flagColor}
              roughness={0.6}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* Lantern */}
      {hasLantern && (
        <group position={[0, 0.58, -1.9]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.065, 0.08, 0.2, 6]} />
            <meshStandardMaterial color="#A88258" roughness={0.6} flatShading />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshBasicMaterial color="#FEF08A" />
          </mesh>
          <pointLight
            position={[0, 0.05, 0]}
            color="#FEF08A"
            intensity={1.2}
            distance={5}
          />
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// 2. BLUE VERTICAL-PLANK CABIN
// ---------------------------------------------------------------------------
interface BluePlankCabinProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  signText?: string;
}

export const BluePlankCabin: React.FC<BluePlankCabinProps> = ({
  position,
  rotation = [0, 0, 0],
  signText = 'Sharanya L Shetty',
}) => {
  const shingleData = useMemo(() => {
    const shingles: { pos: [number, number, number]; rot: [number, number, number]; col: string }[] = [];
    const colors = ['#A9714B', '#B37B55', '#9C653F', '#B57E58'];
    const rows = 4;
    const cols = 7;
    const roofSlope = 0.54;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * 0.58;
        const col = colors[(r * cols + c) % colors.length];
        const leftZ = (r - 1.5) * 0.52;
        const leftY = 3.65 - (r * 0.32);
        shingles.push({
          pos: [x, leftY, -1.15 + leftZ * 0.9],
          rot: [-roofSlope, 0, 0],
          col,
        });
        const rightZ = (r - 1.5) * 0.52;
        const rightY = 3.65 - (r * 0.32);
        shingles.push({
          pos: [x, rightY, 1.15 - rightZ * 0.9],
          rot: [roofSlope, 0, 0],
          col,
        });
      }
    }
    return shingles;
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* Foundation Base Timbers */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.3, 0.24, 3.6]} />
        <meshStandardMaterial color="#8D7A68" roughness={0.85} flatShading />
      </mesh>

      {/* Main Cabin Walls */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 2.5, 3.2]} />
        <meshStandardMaterial color="#7BA7C9" roughness={0.8} flatShading />
      </mesh>

      {/* Vertical Wall Plank Relief Trims */}
      {[-1.8, -1.2, -0.6, 0.6, 1.2, 1.8].map((x, i) => (
        <mesh key={`trim-f-${i}`} position={[x, 1.5, 1.62]} castShadow>
          <boxGeometry args={[0.07, 2.48, 0.04]} />
          <meshStandardMaterial color="#6B96B8" roughness={0.85} flatShading />
        </mesh>
      ))}
      {[-1.8, -1.2, -0.6, 0.6, 1.2, 1.8].map((x, i) => (
        <mesh key={`trim-b-${i}`} position={[x, 1.5, -1.62]} castShadow>
          <boxGeometry args={[0.07, 2.48, 0.04]} />
          <meshStandardMaterial color="#6B96B8" roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* Roof Gable Fillers */}
      <mesh position={[-1.85, 2.75, 0]}>
        <coneGeometry args={[1.7, 1.1, 4]} />
        <meshStandardMaterial color="#7BA7C9" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[1.85, 2.75, 0]}>
        <coneGeometry args={[1.7, 1.1, 4]} />
        <meshStandardMaterial color="#7BA7C9" roughness={0.8} flatShading />
      </mesh>

      {/* Individual Roof Shingles */}
      {shingleData.map((s, idx) => (
        <mesh key={idx} position={s.pos} rotation={s.rot} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.08, 0.66]} />
          <meshStandardMaterial color={s.col} roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* Ridge Cap */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <boxGeometry args={[4.4, 0.16, 0.3]} />
        <meshStandardMaterial color="#8E5833" roughness={0.85} flatShading />
      </mesh>

      {/* Front Entrance: Door with Cream Trim & Porch Steps */}
      <group position={[-0.95, 0.95, 1.62]}>
        <mesh position={[0, 0, 0.02]} castShadow>
          <boxGeometry args={[1.05, 1.85, 0.08]} />
          <meshStandardMaterial color="#FFF8EB" roughness={0.65} flatShading />
        </mesh>
        <mesh position={[0, -0.04, 0.04]}>
          <boxGeometry args={[0.85, 1.66, 0.06]} />
          <meshStandardMaterial color="#D1B07D" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0, 1.05, 0.38]} rotation={[0.26, 0, 0]} castShadow>
          <boxGeometry args={[1.35, 0.08, 0.72]} />
          <meshStandardMaterial color="#A9714B" roughness={0.85} flatShading />
        </mesh>
        {[-0.6, 0.6].map((sx, sIdx) => (
          <mesh key={sIdx} position={[sx, 0.8, 0.18]} rotation={[0.55, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.6, 5]} />
            <meshStandardMaterial color="#8E5833" roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Two Windows with Cream Frames */}
      {[0.5, 1.4].map((wx, wIdx) => (
        <group key={`win-${wIdx}`} position={[wx, 1.45, 1.62]}>
          <mesh position={[0, 0, 0.02]} castShadow>
            <boxGeometry args={[0.76, 0.95, 0.08]} />
            <meshStandardMaterial color="#FFF8EB" roughness={0.65} flatShading />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.62, 0.8]} />
            <meshStandardMaterial color="#385D75" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.22, 0.04]}>
            <boxGeometry args={[0.62, 0.04, 0.02]} />
            <meshStandardMaterial color="#FFF8EB" roughness={0.65} flatShading />
          </mesh>
          <mesh position={[0, 0.22, 0.04]}>
            <boxGeometry args={[0.04, 0.42, 0.02]} />
            <meshStandardMaterial color="#FFF8EB" roughness={0.65} flatShading />
          </mesh>
          <group position={[0, -0.05, 0.15]} rotation={[-0.38, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.64, 0.45, 0.04]} />
              <meshStandardMaterial color="#FFF8EB" roughness={0.65} flatShading />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[0.04, 0.42, 0.02]} />
              <meshStandardMaterial color="#FFF8EB" roughness={0.65} flatShading />
            </mesh>
          </group>
        </group>
      ))}

      {/* Porch Sign */}
      {signText && (
        <group position={[-0.95, 2.15, 1.66]}>
          <mesh castShadow>
            <boxGeometry args={[1.4, 0.26, 0.05]} />
            <meshStandardMaterial color="#FFF3D6" roughness={0.8} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// 3. WOODEN PIER ON STILTS WITH STAIRS TO WATER
// ---------------------------------------------------------------------------
export const WoodenPier: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Horizontal Deck Walkway */}
      <mesh position={[0, 3.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.5, 0.16, 7.2]} />
        <meshStandardMaterial color="#E0C59E" roughness={0.85} flatShading />
      </mesh>

      {/* Deck Planks */}
      {[-3.2, -2.4, -1.6, -0.8, 0.0, 0.8, 1.6, 2.4, 3.2].map((z, i) => (
        <mesh key={`p-${i}`} position={[0, 3.34, z]} receiveShadow castShadow>
          <boxGeometry args={[2.46, 0.04, 0.72]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#D9BA8F' : '#E8CFAB'} roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* Stilt Poles */}
      {[
        [-1.15, -3.0], [1.15, -3.0],
        [-1.15, -1.0], [1.15, -1.0],
        [-1.15, 1.0],  [1.15, 1.0],
        [-1.15, 3.0],  [1.15, 3.0],
      ].map(([x, z], idx) => (
        <group key={`stilt-${idx}`} position={[x, 0, z]}>
          <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.13, 0.15, 9.5, 8]} />
            <meshStandardMaterial color="#BFA27E" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 4.45, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.22, 8]} />
            <meshStandardMaterial color="#A6855B" roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}

      {/* Rope Railings */}
      {[-1.15, 1.15].map((rx, sideIdx) => (
        <group key={`rope-${sideIdx}`}>
          {[-3.0, -1.0, 1.0].map((rz, postIdx) => (
            <mesh 
              key={`rseg-${postIdx}`} 
              position={[rx, 4.0 - 0.1, rz + 1.0]} 
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.038, 0.038, 2.0, 6]} />
              <meshStandardMaterial color="#FFFDF7" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Wooden Pier Stairs Descending to Water Level */}
      <group position={[0, 1.62, 4.8]} rotation={[0.49, 0, 0]}>
        {[0, 1, 2, 3, 4, 5, 6].map((step) => (
          <mesh key={`st-${step}`} position={[0, -step * 0.44, step * 0.42]} castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.09, 0.42]} />
            <meshStandardMaterial color="#D9BA8F" roughness={0.85} flatShading />
          </mesh>
        ))}
        {[-1.0, 1.0].map((hx, hIdx) => (
          <mesh key={`h-${hIdx}`} position={[hx, -1.3, 1.2]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 3.6, 6]} />
            <meshStandardMaterial color="#BFA27E" roughness={0.85} flatShading />
          </mesh>
        ))}
      </group>

      {/* Terminal Mooring Stilt Posts */}
      {[-1.0, 1.0].map((mx, mIdx) => (
        <group key={`mp-${mIdx}`} position={[mx, 0.2, 6.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.14, 0.15, 6.0, 8]} />
            <meshStandardMaterial color="#A6855B" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <torusGeometry args={[0.18, 0.03, 6, 12]} />
            <meshStandardMaterial color="#FFFDF7" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// 4. CURVED TROPICAL PALM TREES
// ---------------------------------------------------------------------------
interface CurvedPalmProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export const CurvedPalm: React.FC<CurvedPalmProps> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1.0,
}) => {
  const trunkSegments = 8;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group>
        {Array.from({ length: trunkSegments }).map((_, i) => {
          const frac = i / trunkSegments;
          const y = frac * 5.2;
          const xOffset = Math.sin(frac * Math.PI * 0.45) * 1.8;
          const rotZ = frac * -0.35;
          const rTop = 0.25 - frac * 0.08;
          const rBottom = 0.32 - frac * 0.08;
          return (
            <mesh 
              key={`pseg-${i}`} 
              position={[xOffset, y + 0.35, 0]} 
              rotation={[0, 0, rotZ]}
              castShadow 
              receiveShadow
            >
              <cylinderGeometry args={[rTop, rBottom, 0.8, 7]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#BFA077' : '#AA885B'} roughness={0.85} flatShading />
            </mesh>
          );
        })}
      </group>

      <group position={[1.7, 5.3, 0]} rotation={[0, 0, -0.3]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const droop = 0.48 + (i % 2) * 0.12;
          return (
            <group key={`l-${i}`} rotation={[0, angle, 0]}>
              <mesh position={[1.5, -0.45, 0]} rotation={[0, 0, droop]} castShadow>
                <coneGeometry args={[0.6, 2.8, 4]} />
                <meshStandardMaterial 
                  color="#5FBF4A" 
                  roughness={0.75} 
                  flatShading 
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 5. PROPS: BARRELS, CRATES, BOULDERS, FERNS
// ---------------------------------------------------------------------------
export const WoodenBarrel: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; scale?: number }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1.0,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.35, 0.4, 0.88, 8]} />
      <meshStandardMaterial color="#C49764" roughness={0.85} flatShading />
    </mesh>
    {[-0.24, 0.24].map((y, i) => (
      <mesh key={`b-${i}`} position={[0, 0.44 + y, 0]}>
        <cylinderGeometry args={[0.41, 0.41, 0.05, 8]} />
        <meshStandardMaterial color="#6B5A4A" roughness={0.6} metalness={0.2} flatShading />
      </mesh>
    ))}
  </group>
);

export const WoodenCrate: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; scale?: number }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1.0,
}) => (
  <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
    <boxGeometry args={[0.78, 0.78, 0.78]} />
    <meshStandardMaterial color="#BA8F5C" roughness={0.85} flatShading />
  </mesh>
);

export const LowPolyBoulder: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number] }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1.0,
}) => (
  <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
    <dodecahedronGeometry args={[0.65, 0]} />
    <meshStandardMaterial color="#9CA3AF" roughness={0.88} flatShading />
  </mesh>
);

export const TropicalFern: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1.0,
}) => (
  <group position={position} scale={scale}>
    {[0, 1.25, 2.5, 3.75, 5.0].map((rot, i) => (
      <mesh key={i} position={[0, 0.12, 0]} rotation={[0.32, rot, 0]} castShadow>
        <coneGeometry args={[0.22, 0.65, 3]} />
        <meshStandardMaterial color="#5FBF4A" roughness={0.75} flatShading />
      </mesh>
    ))}
  </group>
);

// ---------------------------------------------------------------------------
// 6. DRIFTING ROCKS
// ---------------------------------------------------------------------------
export const DriftingHoverRocks: React.FC<{
  center: [number, number, number];
  radius: number;
  count?: number;
  reducedMotion?: boolean;
}> = ({ center, radius, count = 8, reducedMotion = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rockData = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + (i * 0.4);
      const dist = radius + 1.2 + (i % 3) * 0.8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = 0.8 + (i % 4) * 0.7;
      const scale = 0.28 + (i % 3) * 0.14;
      const speed = 0.5 + (i % 3) * 0.4;
      return { x, y, z, scale, speed, baseAngle: angle };
    });
  }, [radius, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    rockData.forEach((r, i) => {
      const bob = Math.sin(t * r.speed + i) * 0.35;
      dummy.position.set(center[0] + r.x, center[1] + r.y + bob, center[2] + r.z);
      dummy.rotation.set(t * 0.2 + i, t * 0.3 + i, 0);
      dummy.scale.setScalar(r.scale);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#A8957F" roughness={0.85} flatShading />
    </instancedMesh>
  );
};
