import React, { useRef } from 'react';

/**
 * Wraps a card so it tilts toward the mouse in 3D with a moving glare.
 * Mouse-only: touch devices and reduced-motion users get a flat card, and at
 * rest the wrapper has no transform (so position: fixed children still work).
 */
export const Tilt3D: React.FC<{ children: React.ReactNode; max?: number; className?: string }> = ({
  children,
  max = 9,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== 'mouse' || !ref.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${(0.5 - py) * max}deg`);
      el.style.setProperty('--ry', `${(px - 0.5) * max * 1.3}deg`);
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
      el.classList.remove('is-settling');
      el.classList.add('is-tilting');
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    // ease back to flat, then drop the transform entirely
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.add('is-settling');
    window.setTimeout(() => {
      if (!el.matches(':hover')) el.classList.remove('is-tilting', 'is-settling');
    }, 450);
  };

  return (
    <div ref={ref} className={`tilt-3d ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <div className="tilt-glare" aria-hidden="true" />
    </div>
  );
};
