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
                stroke="#0B1B2D"
                strokeWidth={1.5}
                strokeDasharray="3,3"
                opacity={0.8}
              />
              <circle
                cx={lbl.anchorX}
                cy={lbl.anchorY}
                r={3}
                fill="#1AA6A6"
                stroke="#0B1B2D"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Labels in handcrafted sticker aesthetic */}
      {labels.map((lbl) => {
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
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg transition-all duration-120 text-[11px] sm:text-xs font-bold px-2.5 py-1 font-sans ${
                isHovered
                  ? 'bg-white text-[#0B1B2D] border-2 border-[#0B1B2D] shadow-[1px_1px_0_#0B1B2D] translate-x-[1.5px] translate-y-[1.5px] z-50'
                  : 'bg-[#FFF8E7] text-[#0B1B2D] border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D]'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-[#0B1B2D]"
                style={{ backgroundColor: lbl.dotColor }}
              />
              <span className="tracking-tight font-bold">
                {isHovered ? lbl.name : lbl.shortName}
              </span>
              {isHovered && lbl.badge && (
                <span className="text-[10px] text-[#0F766E] font-bold pl-1.5 border-l-2 border-[#0B1B2D]">
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
