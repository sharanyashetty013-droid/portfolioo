import React, { useEffect, useState } from 'react';

// Loader shown while the 3D scene downloads + compiles.
// A tiny chart of the archipelago: the boat sails the route through all five
// chapters and each island pops as it's reached. Fades out once the scene is ready.

const ROUTE = 'M24 104 Q52 52 88 58 Q124 64 152 90 Q190 118 228 88 Q262 60 298 52';
const LOOP = 3.6; // seconds per voyage

const ISLANDS = [
  { x: 24, y: 104, label: 'home', at: 0 },
  { x: 88, y: 58, label: 'skills', at: 0.25 },
  { x: 152, y: 90, label: 'projects', at: 0.5 },
  { x: 228, y: 88, label: 'hackathons', at: 0.75 },
  { x: 298, y: 52, label: 'contact', at: 0.98 },
];

const LOG_LINES = [
  'charting the archipelago…',
  'raising the sails…',
  'land ho!',
];

export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setLine((l) => (l + 1) % LOG_LINES.length), 1800);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      role="status"
      className={`pointer-events-none absolute inset-0 z-[5] flex items-start pt-[88px] md:items-center md:pt-0 justify-center transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="voyage-card md:translate-x-[18%]">
        <svg viewBox="0 0 322 140" className="w-[280px] md:w-[340px] h-auto" aria-hidden="true">
          {/* compass rose */}
          <g transform="translate(300 116)"><g className="voyage-compass">
            <circle r="13" fill="none" stroke="#0B1B2D" strokeWidth="1.5" />
            <path d="M0 -11 L3 0 L0 11 L-3 0 Z" fill="#E4614C" stroke="#0B1B2D" strokeWidth="1" />
            <text y="-15" textAnchor="middle" className="voyage-label" style={{ fontSize: 10 }}>N</text>
          </g></g>

          {/* little waves */}
          {[[40, 30], [190, 26], [120, 128], [250, 128]].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y} q5 -4 10 0 t10 0`}
              fill="none"
              stroke="#1AA6A6"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.55"
            />
          ))}

          {/* planned route (dashed) + wake drawn behind the boat */}
          <path id="voyage-route" d={ROUTE} fill="none" stroke="#0B1B2D" strokeWidth="1.8"
                strokeDasharray="3 6" strokeLinecap="round" opacity="0.45" />
          <path d={ROUTE} fill="none" stroke="#1AA6A6" strokeWidth="3" strokeLinecap="round"
                pathLength={1} className="voyage-wake" style={{ animationDuration: `${LOOP}s` }} />

          {/* islands */}
          {ISLANDS.map((isl) => (
            <g key={isl.label} transform={`translate(${isl.x} ${isl.y})`}>
              <g className="voyage-island" style={{ animationDuration: `${LOOP}s`, animationDelay: `${isl.at * LOOP}s` }}>
                <ellipse rx="13" ry="6" fill="#F5D9A8" stroke="#0B1B2D" strokeWidth="1.8" />
                <path d="M-2 -3 Q-1 -12 1 -16" stroke="#8A5A2B" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M1 -16 q-7 -1 -9 3 M1 -16 q7 -1 9 3 M1 -16 q-2 -6 -6 -7 M1 -16 q3 -6 7 -6"
                      stroke="#3FA34D" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              </g>
              <text y="20" textAnchor="middle" className="voyage-label">{isl.label}</text>
            </g>
          ))}

          {/* the boat */}
          <g>
            <g transform="translate(0 -6)">
              <path d="M-9 0 h18 l-3 5 h-12 Z" fill="#E4614C" stroke="#0B1B2D" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M0 0 v-13" stroke="#0B1B2D" strokeWidth="1.6" />
              <path d="M1 -12 l7 9 h-7 Z" fill="#FFF8EB" stroke="#0B1B2D" strokeWidth="1.4" strokeLinejoin="round" />
            </g>
            <animateMotion dur={`${LOOP}s`} repeatCount="indefinite" path={ROUTE} />
          </g>
        </svg>

        <p key={line} className="voyage-log font-handwriting text-[22px] leading-none text-[#0B1B2D] text-center mt-1">
          {LOG_LINES[line]}
        </p>
      </div>
    </div>
  );
};
