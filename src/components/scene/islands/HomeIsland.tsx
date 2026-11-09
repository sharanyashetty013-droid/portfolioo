import React from 'react';
import { TropicalIslandBase } from '../common/TropicalIslandBase';
import { IslandPier } from '../common/IslandPier';
import { StaticMerge } from '../common/StaticMerge';
import { 
  CurvedPalm, 
  DriftingHoverRocks, 
  BluePlankCabin, 
  RowingBoat,
  WoodenBarrel,
  LowPolyBoulder
} from '../common/StyleRefDecor';
import { PondWaterfall } from '../common/PondWaterfall';
import { Campfire, FlowerBush, LampPost } from '../common/IslandProps';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';
import { SectionId } from '../../../types/portfolio';

interface HomeIslandProps {
  isActive?: boolean;
  isAnyModalOpen?: boolean;
  onNavigate?: (section: SectionId) => void;
  onOpenResume?: () => void;
  reducedMotion?: boolean;
}

export const HomeIsland: React.FC<HomeIslandProps> = ({ 
  reducedMotion = false 
}) => {
  const config = ISLAND_LAYOUT.home;

  return (
    <StaticMerge>
      {/* 1. Procedural Sand Disc Top & Tall Faceted Cliff into Water */}
      <TropicalIslandBase config={config} />

      {/* 2. Blue Plank Cabin with Corrugated Tin Lean-to & Signboard */}
      <group position={[config.position[0], config.height, config.position[2]]}>
        <BluePlankCabin
          position={[0.2, 0.3, -1.2]}
          rotation={[0, 0.35, 0]}
          signText="Sharanya L Shetty"
        />
      </group>

      {/* 3. Wooden Pier on Stilts with Stairs down to Water Level */}
      <IslandPier config={config} />

      {/* 4. Rowing Boat Tethered by the Pier */}
      <RowingBoat
        position={[-12.8, 0.05, 2.2]}
        rotation={[0.02, 0.5, 0.03]}
        scale={0.9}
        hullColor="#7DD3FC"
        stripeColor="#FFF3D6"
        innerColor="#FFF3D6"
        hasOars={true}
      />

      {/* 5. Scenic Pond with Waterfall */}
      {/* lifted so the pond sits on the dune instead of under it */}
      <group position={[0, 0.22, 0]}>
        <PondWaterfall
          islandHeight={config.height}
          islandRadius={config.radius}
          reducedMotion={reducedMotion}
        />
      </group>

      {/* 6. Curved Tropical Palm Trees */}
      <CurvedPalm
        position={[4.2, config.height, 1.8]}
        rotation={[0, 0.4, 0]}
        scale={1.05}
      />
      <CurvedPalm
        position={[1.2, config.height, -6.2]}
        rotation={[0, -1.8, 0]}
        scale={1.25}
      />

      {/* 7. Beach Props */}
      <group position={[config.position[0], config.height, config.position[2]]}>
        <WoodenBarrel position={[-2.4, 0, 1.2]} rotation={[0, 0.3, 0]} scale={0.95} />
        <WoodenBarrel position={[-2.9, 0, 0.8]} rotation={[0, -0.4, 0]} scale={0.85} />
        
        <group position={[-1.6, 0.35, -2.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color="#D7A46B" roughness={0.75} flatShading />
          </mesh>
          <mesh position={[0.2, 0.55, 0.1]} rotation={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#C5935B" roughness={0.75} flatShading />
          </mesh>
        </group>

        <LowPolyBoulder position={[2.8, 0, -2.4]} scale={0.8} />
        <LowPolyBoulder position={[3.2, 0, -1.8]} scale={0.5} />
        <LowPolyBoulder position={[-3.8, 0, -1.4]} scale={0.65} />

        <Campfire position={[3.8, 0.12, 4.2]} reducedMotion={reducedMotion} />
        <LampPost position={[-2.6, 0.2, 2.6]} />
        <FlowerBush position={[-5.2, 0, -3.6]} color="#F472B6" />
        <FlowerBush position={[6.4, 0, -1.6]} color="#FDE047" scale={0.9} />
        <FlowerBush position={[-1.0, 0, -7.4]} color="#C084FC" scale={0.85} />
        <FlowerBush position={[7.0, 0, 3.0]} color="#F97316" scale={0.8} />
      </group>

      {/* 8. Floating Drifting Rocks */}
      <DriftingHoverRocks
        center={config.position}
        radius={config.radius}
        count={8}
        reducedMotion={reducedMotion}
      />
    </StaticMerge>
  );
};
