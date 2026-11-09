import React, { useState } from 'react';
import { ProjectedLabel } from '../scene/FloatingLabelsTracker';

interface FloatingLabelsOverlayProps {
  labels: ProjectedLabel[];
}

export const FloatingLabelsOverlay: React.FC<FloatingLabelsOverlayProps> = ({ labels }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!labels || labels.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none">
      {/* SVG Leader Lines Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {labels.map((lbl) => {
          if (!lbl.visible || !lbl.displaced) return null;
          return (
            <g key={`leader-${lbl.id}`}>
              <line
                x1={lbl.anchorX}
                y1={lbl.anchorY}
                x2={lbl.targetX}
                y2={lbl.targetY}
                stroke="#EDE6D6"
                strokeWidth={1.2}
                strokeDasharray="3,3"
                opacity={0.8}
              />
              <circle
                cx={lbl.anchorX}
                cy={lbl.anchorY}
                r={3}
                fill="#D6BA7C"
                stroke="#0B1B2D"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Labels in handcrafted sticker aesthetic */}
      {labels.map((lbl, idx) => {
        if (!lbl.visible) return null;
        const isHovered = hoveredId === lbl.id;

        return (
          <div
            key={lbl.id}
            style={{
              transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0)`,
            }}
            className="pointer-events-auto absolute top-0 left-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              lbl.onClick();
            }}
            onMouseEnter={() => setHoveredId(lbl.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              style={{ animationDelay: `${idx * 70}ms` }}
              className={`label-pop flex items-center gap-1.5 whitespace-nowrap rounded-lg transition-all duration-120 text-[11px] sm:text-xs font-bold px-2.5 py-1 font-sans ${
                isHovered
                  ? 'bg-[#0B1B2D] text-white border border-[#D6BA7C]/80 shadow-[0_10px_24px_-10px_rgba(3,12,22,0.9)] -translate-y-0.5 z-50'
                  : 'bg-[#0C2234]/85 text-[#EDE6D6] border border-[#D6BA7C]/35 backdrop-blur-md shadow-[0_8px_20px_-10px_rgba(3,12,22,0.9)]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: lbl.dotColor }}
              />
              <span className="tracking-tight font-bold">
                {isHovered ? lbl.name : lbl.shortName}
              </span>
              {isHovered && lbl.badge && (
                <span className="text-[10px] text-[#D6BA7C] font-bold pl-1.5 border-l border-[#D6BA7C]/40">
                  {lbl.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
