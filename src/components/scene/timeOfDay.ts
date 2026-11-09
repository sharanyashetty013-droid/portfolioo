// Kept free of three.js imports so the HUD/App can use it without pulling three into the first-load bundle.
export type TimeOfDay = 'day' | 'sunset' | 'night';
export const TIME_ORDER: TimeOfDay[] = ['day', 'sunset', 'night'];

/** Pick a starting mood from the visitor's local clock. */
export function defaultTimeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 19 || h < 6) return 'night';
  if (h >= 17) return 'sunset';
  return 'day';
}
