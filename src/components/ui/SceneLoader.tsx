import React, { useEffect, useState } from 'react';

// 3D intro loader (pure CSS 3D, so it shows instantly before three.js arrives):
// a thick compass coin spins in the middle while the five chapter islands orbit
// it on a tilted ring, each one turning to face you as it goes round.

const ISLANDS = [
  { label: 'home', dot: '#1AA6A6' },
  { label: 'skills', dot: '#8B5CF6' },
  { label: 'projects', dot: '#F59E0B' },
  { label: 'hackathons', dot: '#E4614C' },
  { label: 'contact', dot: '#3B82F6' },
];

const LINES = ['charting the archipelago', 'raising the sails', 'land ho'];

const IslandChip: React.FC<{ label: string; dot: string }> = ({ label, dot }) => (
  <div className="l3-chip-face">
    <svg viewBox="0 0 48 36" className="w-12 h-9" aria-hidden="true">
      <ellipse cx="24" cy="28" rx="18" ry="6" fill="#F5D9A8" stroke="#0B1B2D" strokeWidth="2" />
      <ellipse cx="24" cy="26.5" rx="11" ry="3.4" fill="#8FCF6E" />
      <path d="M24 26 Q23 16 26 9" stroke="#8A5A2B" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M26 9 q-9 -1 -12 4 M26 9 q9 -1 12 4 M26 9 q-3 -7 -9 -8 M26 9 q4 -7 10 -7" stroke="#3FA34D" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
    <span className="l3-chip-label">
      <i style={{ background: dot }} />
      {label}
    </span>
  </div>
);

export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setLine((l) => (l + 1) % LINES.length), 1700);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      role="status"
      className={`pointer-events-none absolute inset-0 z-[5] flex items-start pt-[96px] md:items-center md:pt-0 justify-center transition-all duration-700 ${
        visible ? 'opacity-100' : 'opacity-0 scale-110'
      }`}
    >
      <div className="flex flex-col items-center md:translate-x-[18%]">
        <div className="l3-stage">
          {/* tilted orbit with the five islands */}
          <div className="l3-orbit">
            <div className="l3-ring" />
            {ISLANDS.map((isl, i) => (
              <div key={isl.label} className="l3-node" style={{ '--i': i } as React.CSSProperties}>
                <div className="l3-counter">
                  <div className="l3-chip" style={{ '--i': i } as React.CSSProperties}>
                    <IslandChip {...isl} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* thick spinning compass coin */}
          <div className="l3-coin">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="l3-coin-layer" style={{ transform: `translateZ(${(i - 3) * 2}px)` }} />
            ))}
            <svg viewBox="0 0 80 80" className="l3-coin-face" style={{ transform: 'translateZ(7px)' }} aria-hidden="true">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#0B1B2D" strokeWidth="2" strokeDasharray="2 5" />
              <path d="M40 12 L46 40 L40 68 L34 40 Z" fill="#E4614C" stroke="#0B1B2D" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 40 L40 35 L68 40 L40 45 Z" fill="#FFF8EB" stroke="#0B1B2D" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="40" cy="40" r="4" fill="#0B1B2D" />
              <text x="40" y="10" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0B1B2D" fontFamily="Caveat, cursive">N</text>
            </svg>
            <svg viewBox="0 0 80 80" className="l3-coin-face" style={{ transform: 'rotateY(180deg) translateZ(7px)' }} aria-hidden="true">
              <text x="40" y="49" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0B1B2D" fontFamily="Fraunces, Georgia, serif">S</text>
            </svg>
          </div>
        </div>

        <p key={line} className="l3-caption font-handwriting">
          {LINES[line]}
          <span className="l3-dots"><b>.</b><b>.</b><b>.</b></span>
        </p>
      </div>
    </div>
  );
};
