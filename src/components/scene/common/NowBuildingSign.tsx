import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { portfolioData } from '../../../data/portfolioData';
import { ISLAND_LAYOUT } from '../../../constants/islandLayout';

interface NowBuildingSignProps {
  /** Only show the label when the visitor is looking at Home island */
  showLabel: boolean;
}

/** A small wooden signpost on Home island that says what Sharanya is building right now. */
export const NowBuildingSign: React.FC<NowBuildingSignProps> = ({ showLabel }) => {
  const home = ISLAND_LAYOUT.home;
  const { nowBuilding } = portfolioData;
  // drei's Html can't attach while the scene is still warming up, so wait until frames are running
  const [mounted, setMounted] = useState(false);
  const frames = useRef(0);
  useFrame(() => {
    if (!mounted && ++frames.current > 10) setMounted(true);
  });

  return (
    <group position={[home.position[0] - 5.6, home.height, home.position[2] + 5.2]} rotation={[0, -0.5, 0]}>
      {/* post */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.16, 1.8, 0.16]} />
        <meshStandardMaterial color="#6B4426" roughness={0.9} flatShading />
      </mesh>
      {/* plank */}
      <mesh position={[0, 1.55, 0.1]} rotation={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[1.6, 0.55, 0.08]} />
        <meshStandardMaterial color="#9A6A3E" roughness={0.85} flatShading />
      </mesh>
      {mounted && showLabel && (
        <Html position={[0, 2.35, 0.1]} center zIndexRange={[25, 0]}>
          <a className="now-sign" href={nowBuilding.url} target="_blank" rel="noopener noreferrer">
            <span className="now-sign-dot" aria-hidden="true" />
            <span>
              Now building <b>{nowBuilding.name}</b>
              <small>{nowBuilding.line}</small>
            </span>
          </a>
        </Html>
      )}
    </group>
  );
};
