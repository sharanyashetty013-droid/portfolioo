import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { WoodenPier, CurvedPalm, WoodenBarrel, LowPolyBoulder, DriftingHoverRocks } from '../common/StyleRefDecor';
import { SkillGroup } from '../../../types/portfolio';
import { portfolioData } from '../../../data/portfolioData';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

interface SkillsIslandProps {
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelectSkillGroup: (g: SkillGroup) => void;
  reducedMotion?: boolean;
}

const LowPolyWindmill: React.FC<{ position: [number, number, number]; reducedMotion?: boolean }> = ({
  position,
  reducedMotion = false,
}) => {
  const sailsRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (sailsRef.current && !reducedMotion) {
      sailsRef.current.rotation.z += delta * 0.7;
    }
  });

  return (
    <group position={position}>
      {/* Stone Foundation */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.7, 0.5, 8]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.8} flatShading />
      </mesh>

      {/* Tower Body - Warm timber */}
      <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.45, 3.8, 8]} />
        <meshStandardMaterial color="#C2853E" roughness={0.75} flatShading />
      </mesh>

      {/* Windmill Conical Cap in warm brown #A9714B */}
      <mesh position={[0, 4.6, 0]} castShadow>
        <coneGeometry args={[1.35, 1.3, 8]} />
        <meshStandardMaterial color="#A9714B" roughness={0.7} flatShading />
      </mesh>

      {/* Rotor Axle */}
      <mesh position={[0, 4.0, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>

      {/* Rotating Sails */}
      <group ref={sailsRef} position={[0, 4.0, 1.42]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <mesh position={[0, 1.4, 0]}>
              <boxGeometry args={[0.07, 2.8, 0.04]} />
              <meshStandardMaterial color="#8D6B4F" />
            </mesh>
            <mesh position={[0.22, 1.55, 0.02]}>
              <boxGeometry args={[0.38, 2.0, 0.02]} />
              <meshStandardMaterial color="#FFF8EB" roughness={0.85} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

const SkillGroupCrystal: React.FC<{
  group: SkillGroup;
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelect: (g: SkillGroup) => void;
  reducedMotion?: boolean;
}> = ({ group, isAnyModalOpen, onSelect, reducedMotion = false }) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (meshRef.current && !reducedMotion) {
      meshRef.current.rotation.y += delta * (hovered ? 2.5 : 0.9);
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.12;
      const targetScale = hovered ? 1.25 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  return (
    <group
      position={group.slotPosition}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(group);
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
      {/* Stone Pedestal */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.65, 0.8, 0.5, 6]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.75} flatShading />
      </mesh>

      {/* Floating Gem Crystal */}
      <group ref={meshRef} position={[0, 1.15, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial
            color={group.color}
            emissive={group.color}
            emissiveIntensity={hovered ? 0.95 : 0.45}
            roughness={0.2}
            metalness={0.3}
            flatShading
          />
        </mesh>
        <pointLight
          position={[0, 0, 0]}
          color={group.color}
          intensity={hovered ? 2.5 : 1.0}
          distance={5}
        />
      </group>
    </group>
  );
};

export const SkillsIsland: React.FC<SkillsIslandProps> = ({
  isActive,
  isAnyModalOpen,
  onSelectSkillGroup,
  reducedMotion = false,
}) => {
  const config = ISLAND_LAYOUT.skills;
  const { skillGroups } = portfolioData;

  return (
    <group>
      {/* 1. Procedural Sand Disc Top & Tall Faceted Cliff into Water */}
      <TropicalIslandBase config={config} />

      {/* 2. Wooden Pier Stilt Dock */}
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
        {/* Windmill placed at center-back */}
        <LowPolyWindmill position={[0, 0, -2.5]} reducedMotion={reducedMotion} />

        {/* Cobblestone pathway ring around center */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[2.5, 4.0, 12]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} flatShading />
        </mesh>

        {/* 5 Skill Group Glowing Crystals */}
        {skillGroups.map((group) => (
          <SkillGroupCrystal
            key={group.id}
            group={group}
            isActive={isActive}
            isAnyModalOpen={isAnyModalOpen}
            onSelect={onSelectSkillGroup}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Tropical Palms & Boulders */}
        <CurvedPalm position={[-5.2, 0, -3.8]} rotation={[0, 0.5, 0]} scale={1.1} />
        <CurvedPalm position={[5.2, 0, -3.8]} rotation={[0, -0.7, 0]} scale={1.15} />
        <CurvedPalm position={[0, 0, 5.2]} rotation={[0, 1.2, 0]} scale={0.9} />
        <WoodenBarrel position={[-2.4, 0, 1.8]} />
        <WoodenBarrel position={[-2.8, 0, 1.4]} scale={0.85} />
        <LowPolyBoulder position={[0, 0, 4.0]} scale={0.85} />
        <LowPolyBoulder position={[-5.0, 0, 0]} scale={0.8} />
        <LowPolyBoulder position={[5.0, 0, 1.2]} scale={0.9} />
      </group>

      {/* 4. Drifting Hover Rocks along cliff perimeter */}
      <DriftingHoverRocks
        center={config.position}
        radius={config.radius}
        count={8}
        reducedMotion={reducedMotion}
      />
    </group>
  );
};
