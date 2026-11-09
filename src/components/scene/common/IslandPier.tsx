import React from 'react';
import { WoodenPier } from './StyleRefDecor';
import { IslandConfig } from '../../../constants/islandLayout';

// Places the pier on the island's rim, pointing out toward the boat's dock.
// It's angled slightly off the dock line so the boat moors beside the stairs
// instead of sailing into them. Deck height follows the island height.
const SIDE_OFFSET = 0.38; // radians

export const IslandPier: React.FC<{ config: IslandConfig }> = ({ config }) => {
  const [px, , pz] = config.position;
  const [dx, , dz] = config.dockPosition;
  const angle = Math.atan2(dx - px, dz - pz) + SIDE_OFFSET;
  const dist = config.radius + 1.6;

  return (
    <WoodenPier
      position={[px + Math.sin(angle) * dist, config.height - 3.2, pz + Math.cos(angle) * dist]}
      rotation={[0, angle, 0]}
    />
  );
};
