import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { WoodenPier, CurvedPalm, WoodenBarrel, WoodenCrate, LowPolyBoulder, DriftingHoverRocks } from '../common/StyleRefDecor';
import { LowPolyChimneySmoke } from '../common/LowPolyDecor';
import { ProjectItem } from '../../../types/portfolio';
import { portfolioData } from '../../../data/portfolioData';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

interface ProjectsIslandProps {
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelectProject: (p: ProjectItem) => void;
  reducedMotion?: boolean;
}

const ProjectCabin: React.FC<{
  project: ProjectItem;
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelect: (p: ProjectItem) => void;
  reducedMotion?: boolean;
}> = ({ project, isAnyModalOpen, onSelect, reducedMotion = false }) => {
  const [hovered, setHovered] = useState(false);
  const cabinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (cabinRef.current && !reducedMotion) {
      const targetScale = hovered ? 1.12 : 1.0;
      cabinRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  return (
    <group
      ref={cabinRef}
      position={project.slotPosition}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(project);
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
      {/* Stone Foundation Slab */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.0, 0.16, 2.0]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.8} flatShading />
      </mesh>

      {/* Main Cabin Walls */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.5, 1.6]} />
        <meshStandardMaterial
          color={project.buildingColor}
          emissive={hovered ? project.buildingColor : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0.05}
          roughness={0.65}
          flatShading
        />
      </mesh>

      {/* Pyramid Shingled Roof in warm brown #A9714B */}
      <mesh position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.5, 1.0, 4]} />
        <meshStandardMaterial
          color={project.roofColor || '#A9714B'}
          emissive={hovered ? (project.roofColor || '#A9714B') : '#000000'}
          emissiveIntensity={hovered ? 0.25 : 0}
          roughness={0.7}
          flatShading
        />
      </mesh>

      {/* Stone Chimney */}
      <mesh position={[0.55, 2.1, -0.4]} castShadow>
        <boxGeometry args={[0.3, 0.9, 0.3]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.85} flatShading />
      </mesh>

      {/* Animated Smoke Puffs */}
      <LowPolyChimneySmoke position={[0.55, 2.65, -0.4]} reducedMotion={reducedMotion} />

      {/* Front Door */}
      <mesh position={[0, 0.55, 0.81]}>
        <boxGeometry args={[0.45, 0.8, 0.04]} />
        <meshStandardMaterial color="#8D6B4F" roughness={0.85} flatShading />
      </mesh>

      {/* Window */}
      <mesh position={[0.45, 1.0, 0.81]}>
        <boxGeometry args={[0.3, 0.3, 0.04]} />
        <meshStandardMaterial
          color={hovered ? '#FEF08A' : '#E0F2FE'}
          emissive={hovered ? '#FDE047' : '#BAE6FD'}
          emissiveIntensity={hovered ? 0.85 : 0.25}
          roughness={0.2}
        />
      </mesh>

      {/* Glow Point Light on hover */}
      {hovered && (
        <pointLight position={[0, 2.2, 0]} color={project.buildingColor} intensity={2.2} distance={5} />
      )}
    </group>
  );
};

export const ProjectsIsland: React.FC<ProjectsIslandProps> = ({
  isActive,
  isAnyModalOpen,
  onSelectProject,
  reducedMotion = false,
}) => {
  const config = ISLAND_LAYOUT.projects;
  const { projects } = portfolioData;

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
        {/* Central Cobblestone Plaza */}
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[3.4, 3.6, 0.06, 12]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} flatShading />
        </mesh>

        {/* Decorative center stone lantern */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.48, 0.8, 6]} />
          <meshStandardMaterial color="#A8957F" roughness={0.7} flatShading />
        </mesh>
        <pointLight position={[0, 1.0, 0]} color="#FEF3C7" intensity={1.4} distance={6} />

        {/* 6 Real Shipped Project Cabins */}
        {projects.map((project) => (
          <ProjectCabin
            key={project.id}
            project={project}
            isActive={isActive}
            isAnyModalOpen={isAnyModalOpen}
            onSelect={onSelectProject}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Tropical Palms */}
        <CurvedPalm position={[0, 0, 5.0]} rotation={[0, 0.4, 0]} scale={1.05} />
        <CurvedPalm position={[0, 0, -5.0]} rotation={[0, -1.2, 0]} scale={1.1} />
        <CurvedPalm position={[6.0, 0, 4.5]} rotation={[0, 0.8, 0]} scale={0.95} />
        <CurvedPalm position={[-6.0, 0, -4.5]} rotation={[0, -0.6, 0]} scale={1.0} />

        {/* Wooden Barrels & Crates */}
        <WoodenBarrel position={[1.8, 0, 1.2]} />
        <WoodenCrate position={[-1.6, 0, 1.5]} scale={0.85} />

        {/* Decorative Flat-shaded Boulders */}
        <LowPolyBoulder position={[5.2, 0, -4.2]} scale={0.8} />
        <LowPolyBoulder position={[-5.2, 0, 4.2]} scale={0.85} />
      </group>

      {/* 4. Drifting Hover Rocks along cliff perimeter */}
      <DriftingHoverRocks
        center={config.position}
        radius={config.radius}
        count={9}
        reducedMotion={reducedMotion}
      />
    </group>
  );
};
