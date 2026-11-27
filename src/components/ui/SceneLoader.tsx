import React, { useEffect, useState } from 'react';

/**
 * While the 3D world loads, show only the sky colour (no flat drawings).
 * As soon as the world is ready it fades away and the 3D opening takes over:
 * the camera starts inside real 3D clouds and dives down to the islands.
 */
export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [phase, setPhase] = useState<'sky' | 'fading' | 'gone'>('sky');

  useEffect(() => {
    if (visible || phase !== 'sky') return;
    setPhase('fading');
    const id = setTimeout(() => setPhase('gone'), 900);
    return () => clearTimeout(id);
  }, [visible, phase]);

  if (phase === 'gone') return null;
  return (
    <div className={`sky-loader ${phase === 'fading' ? 'is-parting' : ''}`} role="status" aria-label="Loading the islands">
      <div className="sky-glow" />
    </div>
  );
};
