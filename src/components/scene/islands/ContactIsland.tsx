import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { WoodenPier, CurvedPalm, WoodenBarrel, WoodenCrate, LowPolyBoulder, DriftingHoverRocks } from '../common/StyleRefDecor';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

interface ContactIslandProps {
  isActive: boolean;
  isAnyModalOpen: boolean;
  onOpenContact: () => void;
  reducedMotion?: boolean;
}

export const ContactIsland: React.FC<ContactIslandProps> = ({
  isAnyModalOpen,
  onOpenContact,
  reducedMotion = false,
}) => {
  const config = ISLAND_LAYOUT.contact;
  const beaconRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (beaconRef.current && !reducedMotion) {
      beaconRef.current.rotation.y += delta * 1.6;
    }
  });

  return (
    <group>
      {/* 1. Procedural Sand Disc Top & Tall Faceted Cliff into Water */}
      <TropicalIslandBase config={config} />

      {/* 2. Wooden Pier Stilt Dock meeting the boat waypoint */}
      <WoodenPier
        position={[
          config.pierPosition[0] - config.position[0],
          0,
          config.pierPosition[2] - config.position[2],
        ]}
        rotation={[0, 0.45, 0]}
      />

      {/* 3. Island Surface Props */}
      <group position={[config.position[0], config.height, config.position[2]]}>
        {/* Sandy beach rim verge */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[5.2, 5.6, 0.04, 10]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.9} flatShading />
        </mesh>

        {/* Lighthouse (Clickable, opens contact modal) */}
        <group
          position={[-1.2, 0, -1.0]}
          onClick={(e) => {
            e.stopPropagation();
            onOpenContact();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!isAnyModalOpen) {
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Stone Base */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.3, 1.5, 0.7, 8]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.8} flatShading />
          </mesh>

          {/* Red & White Tower Stripes */}
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[1.05, 1.3, 1.1, 8]} />
            <meshStandardMaterial color="#EF4444" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 2.35, 0]} castShadow>
            <cylinderGeometry args={[0.9, 1.05, 1.1, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 3.45, 0]} castShadow>
            <cylinderGeometry args={[0.75, 0.9, 1.1, 8]} />
            <meshStandardMaterial color="#EF4444" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 4.4, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.75, 0.8, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.7} flatShading />
          </mesh>

          {/* Observation Deck Platform */}
          <mesh position={[0, 4.9, 0]}>
            <cylinderGeometry args={[1.0, 1.0, 0.18, 8]} />
            <meshStandardMaterial color="#64748B" />
          </mesh>

          {/* Lantern Room Glass */}
          <mesh position={[0, 5.45, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.9, 8]} />
            <meshStandardMaterial color="#38BDF8" transparent opacity={0.65} roughness={0.1} />
          </mesh>

          {/* Rotating Beacon Light Beam */}
          <group ref={beaconRef} position={[0, 5.45, 0]}>
            <pointLight color="#FEF08A" intensity={2.8} distance={16} />
            <mesh position={[0, 0, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[1.4, 6.5, 8, 1, true]} />
              <meshBasicMaterial color="#FEF08A" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
          </group>

          {/* Lighthouse Cap */}
          <mesh position={[0, 6.2, 0]} castShadow>
            <coneGeometry args={[0.85, 0.75, 8]} />
            <meshStandardMaterial color="#DC2626" flatShading />
          </mesh>
        </group>

        {/* Wooden Mailbox (Clickable) */}
        <group
          position={[1.8, 0, 1.4]}
          onClick={(e) => {
            e.stopPropagation();
            onOpenContact();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!isAnyModalOpen) {
              document.body.style.cursor = 'pointer';
            }
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.1, 5]} />
            <meshStandardMaterial color="#8D6B4F" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.45, 0.4, 0.75]} />
            <meshStandardMaterial color="#C49764" roughness={0.8} flatShading />
          </mesh>
          {/* Mailbox Red Flag */}
          <mesh position={[0.26, 1.35, -0.1]}>
            <boxGeometry args={[0.04, 0.25, 0.1]} />
            <meshStandardMaterial color="#EF4444" />
          </mesh>
        </group>

        {/* Palms, Barrels & Coastal Decor */}
        <CurvedPalm position={[-3.8, 0, 2.2]} rotation={[0, 0.4, 0]} scale={1.1} />
        <CurvedPalm position={[3.2, 0, -2.6]} rotation={[0, -0.8, 0]} scale={1.15} />
        <WoodenBarrel position={[0.8, 0, 1.8]} />
        <WoodenCrate position={[1.4, 0, 1.8]} scale={0.8} />
        <LowPolyBoulder position={[3.0, 0, 2.2]} scale={0.85} />
        <LowPolyBoulder position={[-2.8, 0, -2.8]} scale={0.9} />
      </group>

      {/* 4. Drifting Hover Rocks along cliff perimeter */}
      <DriftingHoverRocks
        center={config.position}
        radius={config.radius}
        count={7}
        reducedMotion={reducedMotion}
      />
    </group>
  );
};
