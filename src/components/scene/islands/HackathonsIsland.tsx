import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { IslandPier } from '../common/IslandPier';
import { CurvedPalm, WoodenBarrel, LowPolyBoulder, DriftingHoverRocks } from '../common/StyleRefDecor';
import { HackathonItem } from '../../../types/portfolio';
import { portfolioData } from '../../../data/portfolioData';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';
import { Bunting, FloatingTrophy, FlowerBush } from '../common/IslandProps';

interface HackathonsIslandProps {
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelectHackathon: (h: HackathonItem) => void;
  reducedMotion?: boolean;
}

// podium styling by result: silver for runner-up, bronze for 2nd runner-up
type Tier = { stone: string; metal: string; gem: string; glow: string; ribbon: string | null };
const TIERS: Record<string, Tier> = {
  'Runner-up': { stone: '#E2E8F0', metal: '#D7DEE8', gem: '#C0C9D6', glow: '#F1F5F9', ribbon: '#1AA6A6' },
  '2nd Runner-up': { stone: '#EADBC8', metal: '#CD7F32', gem: '#D98B45', glow: '#F2B27A', ribbon: '#E4614C' },
  'Internal finals': { stone: '#CBD5E1', metal: '#3B82F6', gem: '#3B82F6', glow: '#60A5FA', ribbon: null },
  default: { stone: '#E2E8F0', metal: '#94A3B8', gem: '#94A3B8', glow: '#CBD5E1', ribbon: null },
};

const HackathonPodium: React.FC<{
  hackathon: HackathonItem;
  isActive: boolean;
  isAnyModalOpen: boolean;
  onSelect: (h: HackathonItem) => void;
  reducedMotion?: boolean;
}> = ({ hackathon, isAnyModalOpen, onSelect, reducedMotion = false }) => {
  const [hovered, setHovered] = useState(false);
  const trophyRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (trophyRef.current && !reducedMotion) {
      trophyRef.current.rotation.y += delta * (hovered ? 2.0 : 0.6);
      const targetScale = hovered ? 1.15 : 1.0;
      trophyRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  const stepHeight = hackathon.podiumHeight;
  const tier = TIERS[hackathon.badge] ?? TIERS.default;
  const isPlaced = hackathon.badge === 'Runner-up' || hackathon.badge === '2nd Runner-up';

  return (
    <group
      position={hackathon.slotPosition}
      rotation={[0, Math.atan2(hackathon.slotPosition[0], hackathon.slotPosition[2]), 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(hackathon);
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
      {/* Stone Pedestal Cylinder */}
      <mesh position={[0, stepHeight / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.9, 1.05, stepHeight, 8]} />
        <meshStandardMaterial
          color={tier.stone}
          roughness={0.7}
          flatShading
        />
      </mesh>

      {/* Rim Ring */}
      <mesh position={[0, stepHeight, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.05, 8]} />
        <meshStandardMaterial
          color={tier.metal}
          metalness={0.5}
          roughness={0.4}
          flatShading
        />
      </mesh>

      {tier.ribbon && (
        <group position={[0, stepHeight * 0.62, 0.98]}>
          <mesh position={[-0.12, 0.12, 0]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.16, 0.42, 0.03]} />
            <meshStandardMaterial color={tier.ribbon} flatShading />
          </mesh>
          <mesh position={[0.12, 0.12, 0]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[0.16, 0.42, 0.03]} />
            <meshStandardMaterial color={tier.ribbon} flatShading />
          </mesh>
          <mesh position={[0, -0.12, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 12]} />
            <meshStandardMaterial color={tier.metal} metalness={0.7} roughness={0.25} emissive={tier.glow} emissiveIntensity={0.2} />
          </mesh>
        </group>
      )}

      {/* Stylized Low-Poly Trophy on top */}
      <group ref={trophyRef} position={[0, stepHeight + 0.15, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.32, 0.28, 6]} />
          <meshStandardMaterial color="#64748B" roughness={0.7} flatShading />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.32, 6]} />
          <meshStandardMaterial
            color={tier.metal}
            metalness={0.6}
            roughness={0.3}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
          <octahedronGeometry args={[isPlaced ? 0.42 : 0.34, 0]} />
          <meshStandardMaterial
            color={tier.gem}
            emissive={tier.glow}
            emissiveIntensity={hovered ? 0.8 : isPlaced ? 0.3 : 0.08}
            metalness={0.65}
            roughness={0.3}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
};

export const HackathonsIsland: React.FC<HackathonsIslandProps> = ({
  isActive,
  isAnyModalOpen,
  onSelectHackathon,
  reducedMotion = false,
}) => {
  const config = ISLAND_LAYOUT.hackathons;
  const { hackathons } = portfolioData;

  return (
    <group>
      {/* 1. Procedural Sand Disc Top & Tall Faceted Cliff into Water */}
      <TropicalIslandBase config={config} />

      {/* 2. Wooden Pier Stilt Dock meeting the boat waypoint */}
      <IslandPier config={config} />

      {/* 3. Island Surface Props */}
      <group position={[config.position[0], config.height, config.position[2]]}>
        {/* Snowy Low-Poly Mountain Peak positioned at center-back */}
        <group position={[0, 0, -2.5]}>
          <mesh position={[0, 3.0, 0]} castShadow receiveShadow>
            <coneGeometry args={[4.2, 6.2, 7]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 4.85, 0]} castShadow>
            <coneGeometry args={[2.1, 2.5, 7]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.4} flatShading />
          </mesh>
          {/* Summit Flag */}
          <mesh position={[0, 6.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 4]} />
            <meshStandardMaterial color="#8D6B4F" />
          </mesh>
          <mesh position={[0.3, 6.7, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.02]} />
            <meshStandardMaterial color="#EF4444" flatShading />
          </mesh>
        </group>

        {/* Hackathon podiums: placements up front, the rest around the summit */}
        {hackathons.map((h) => (
          <HackathonPodium
            key={h.id}
            hackathon={h}
            isActive={isActive}
            isAnyModalOpen={isAnyModalOpen}
            onSelect={onSelectHackathon}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Palms */}
        <CurvedPalm position={[-5.0, 0, -4.5]} rotation={[0, 0.6, 0]} scale={1.15} />
        <CurvedPalm position={[5.0, 0, -4.5]} rotation={[0, -0.6, 0]} scale={1.15} />
        <CurvedPalm position={[-6.8, 0, 0.5]} rotation={[0, 0.3, 0]} scale={1.05} />
        <CurvedPalm position={[6.8, 0, 0.5]} rotation={[0, -0.3, 0]} scale={1.05} />

        {/* Barrels & Rocky Boulders */}
        <WoodenBarrel position={[-1.8, 0, 2.2]} />
        <LowPolyBoulder position={[0, 0, 3.0]} scale={0.9} />
        <LowPolyBoulder position={[-2.0, 0, 1.5]} scale={0.7} />
        <LowPolyBoulder position={[2.2, 0, 1.8]} scale={0.75} />

        {/* trophy hovering over the summit + festival bunting */}
        <FloatingTrophy position={[0, 7.7, -2.5]} reducedMotion={reducedMotion} />
        <Bunting from={[-6.8, 3.8, 0.5]} to={[-5.0, 3.8, -4.5]} reducedMotion={reducedMotion} />
        <Bunting from={[-5.0, 3.8, -4.5]} to={[5.0, 3.8, -4.5]} flags={14} sag={1.1} reducedMotion={reducedMotion} />
        <Bunting from={[5.0, 3.8, -4.5]} to={[6.8, 3.8, 0.5]} reducedMotion={reducedMotion} />
        <FlowerBush position={[-9.8, 0, -0.6]} color="#F472B6" />
        <FlowerBush position={[9.8, 0, -0.6]} color="#FDE047" />
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
