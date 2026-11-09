import type { SectionId } from '../../types/portfolio';

/**
 * Shared clock for the opening "islands rise from the sea" sequence.
 * WorldScene stamps `start` on the first rendered frame; everything else
 * (islands, water foam, spray, camera) reads progress from here.
 */
export const intro = { start: -1, skip: false };

export const RISE_ORDER: SectionId[] = ['contact', 'hackathons', 'projects', 'skills', 'home'];
export const RUMBLE = 1.0;   // seconds of rumbling before the first island breaks the surface
export const STAGGER = 0.75; // gap between islands
export const RISE = 1.9;     // how long one island takes to rise and settle
export const HOLD = RUMBLE + STAGGER * (RISE_ORDER.length - 1) + RISE * 0.85; // then the camera swoops
export const SWOOP = 3.4;

export const introElapsed = (clockTime: number) =>
  intro.skip ? 1e6 : intro.start < 0 ? 0 : (clockTime - intro.start);

/** Linear 0..1 progress of one island's rise (can exceed 1 afterwards). */
export function riseRaw(id: SectionId, clockTime: number) {
  const i = RISE_ORDER.indexOf(id);
  return (introElapsed(clockTime) - RUMBLE - i * STAGGER) / RISE;
}

/** Eased height factor with a little overshoot, 0 = submerged, 1 = resting. */
export function riseEase(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.5, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); // easeOutBack
}
