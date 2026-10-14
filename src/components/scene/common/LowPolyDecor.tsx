import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// 1. Tiered Low-Poly Pine Tree
export const LowPolyPineTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  foliageColor?: string;
  trunkColor?: string;
}> = ({
  position,
  scale = 1,
  foliageColor = '#5FBF4A',
  trunkColor = '#8D6B4F',
}) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Wooden Trunk */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.22, 0.9, 5]} />
        <meshStandardMaterial color={trunkColor} roughness={0.85} flatShading />
      </mesh>
      {/* Tier 1 */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <coneGeometry args={[0.95, 1.25, 6]} />
        <meshStandardMaterial color={foliageColor} roughness={0.75} flatShading />
      </mesh>
      {/* Tier 2 */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <coneGeometry args={[0.75, 1.1, 6]} />
        <meshStandardMaterial color={foliageColor} roughness={0.75} flatShading />
      </mesh>
      {/* Tier 3 */}
      <mesh position={[0, 2.45, 0]} castShadow>
        <coneGeometry args={[0.5, 0.95, 6]} />
        <meshStandardMaterial color={foliageColor} roughness={0.75} flatShading />
      </mesh>
    </group>
  );
};

// 2. Clustered Low-Poly Round Tree
export const LowPolyRoundTree: React.FC<{
  position: [number, number, number];
  scale?: number;
  foliageColor?: string;
}> = ({ position, scale = 1, foliageColor = '#5FBF4A' }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.3, 5]} />
        <meshStandardMaterial color="#8D6B4F" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color={foliageColor} roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0.4, 1.5, 0.3]} castShadow>
        <dodecahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color={foliageColor} roughness={0.75} flatShading />
      </mesh>
      <mesh position={[-0.35, 1.6, -0.3]} castShadow>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={foliageColor} roughness={0.75} flatShading />
      </mesh>
    </group>
  );
};

// 3. Faceted Low-Poly Rock Boulder
export const LowPolyRock: React.FC<{
  position: [number, number, number];
  scale?: number;
  color?: string;
  rotationY?: number;
}> = ({ position, scale = 1, color = '#A8957F', rotationY = 0 }) => {
  return (
    <mesh
      position={[position[0], position[1] + (scale * 0.45), position[2]]}
      rotation={[0.15, rotationY, -0.1]}
      scale={[scale, scale * 0.9, scale]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading />
    </mesh>
  );
};

// 4. Animated Low-Poly Chimney Smoke Puffs
export const LowPolyChimneySmoke: React.FC<{
  position: [number, number, number];
  reducedMotion?: boolean;
}> = ({ position, reducedMotion = false }) => {
  const count = 4;
  const puffs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      delay: i * 0.8,
      speed: 0.8,
    }));
  }, []);

  const puffRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();
    puffs.forEach((puff, idx) => {
      const mesh = puffRefs.current[idx];
      if (mesh) {
        const cycle = ((t + puff.delay) * puff.speed) % 3.2;
        const progress = cycle / 3.2;
        mesh.position.y = progress * 1.8;
        mesh.position.x = Math.sin(progress * 2) * 0.25;
        mesh.position.z = Math.cos(progress * 1.5) * 0.15;
        const s = 0.12 + progress * 0.22;
        mesh.scale.set(s, s, s);
        (mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1.0 - progress * 1.1) * 0.75;
      }
    });
  });

  return (
    <group position={position}>
      {puffs.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => { puffRefs.current[idx] = el; }}
          position={[0, 0, 0]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#FFFFFF"
            transparent
            opacity={0.6}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
};

// 5. Stylized Low-Poly Waterfall
export const LowPolyWaterfall: React.FC<{
  position: [number, number, number];
  height?: number;
  width?: number;
  reducedMotion?: boolean;
}> = ({ position, height = 5.0, width = 1.4, reducedMotion = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const foamRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = -(height / 2) + Math.sin(t * 5) * 0.04;
    }
    if (foamRef.current) {
      foamRef.current.scale.setScalar(1.0 + Math.sin(t * 8) * 0.15);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} position={[0, -(height / 2), 0]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial
          color="#4CC9C0"
          roughness={0.15}
          metalness={0.1}
          transparent
          opacity={0.88}
          flatShading
        />
      </mesh>
      <group ref={foamRef} position={[0, -height + 0.3, 0.2]}>
        <mesh position={[-0.4, 0, 0]}>
          <dodecahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.8} flatShading />
        </mesh>
        <mesh position={[0.35, -0.1, 0.1]}>
          <dodecahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.8} flatShading />
        </mesh>
      </group>
    </group>
  );
};
