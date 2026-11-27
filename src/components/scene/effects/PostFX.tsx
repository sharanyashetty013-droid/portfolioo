import React from 'react';
import { EffectComposer, N8AO, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import type { TimeOfDay } from '../timeOfDay';

/**
 * Screen effects that make the world feel deep instead of flat:
 * - ambient occlusion: soft contact shadows where things meet (houses on sand, rocks, trees)
 * - bloom: lamps, lanterns, fire and the lighthouse glow softly
 * - vignette: a gentle darkening at the edges that pulls the eye to the island
 * On slow devices `lite` drops the ambient occlusion, which is the expensive part.
 * (Tone mapping stays on the renderer; adding a second pass here washed the colours out.)
 */
export const PostFX: React.FC<{ lite?: boolean; timeOfDay: TimeOfDay }> = ({ lite = false, timeOfDay }) => {
  const night = timeOfDay === 'night';
  const bloom = <Bloom mipmapBlur luminanceThreshold={night ? 0.6 : 1.0} luminanceSmoothing={0.2} intensity={night ? 0.9 : 0.18} radius={0.7} />;
  const finish = [
    <SMAA key="aa" />,
    <Vignette key="vg" offset={0.3} darkness={night ? 0.55 : 0.38} />,
  ];
  if (lite) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {bloom}
        {finish}
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO halfRes quality="medium" aoRadius={3} distanceFalloff={1.2} intensity={night ? 1.6 : 2.4} color="#1d2b3a" />
      {bloom}
      {finish}
    </EffectComposer>
  );
};
