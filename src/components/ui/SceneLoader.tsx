import React from 'react';

// Shown over the ocean-coloured backdrop while the 3D scene downloads and compiles.
// Fades out once WorldScene reports it has drawn its first real frame.
export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div
    aria-hidden={!visible}
    className={`pointer-events-none absolute inset-0 z-[5] flex items-center justify-center transition-opacity duration-700 ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <div className="flex flex-col items-center gap-3 translate-x-[10%] md:translate-x-[15%]">
      <svg viewBox="0 0 64 40" className="w-16 h-10 scene-loader-boat" aria-hidden="true">
        <path d="M8 26 h48 l-7 9 H15 Z" fill="#E4614C" stroke="#0B1B2D" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M32 4 v22" stroke="#0B1B2D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 7 l14 15 h-14 Z" fill="#1AA6A6" stroke="#0B1B2D" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <span className="font-handwriting text-2xl text-[#0B1B2D]">sailing in…</span>
    </div>
  </div>
);
