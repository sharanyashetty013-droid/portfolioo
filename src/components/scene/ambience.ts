import * as THREE from 'three';

import type { TimeOfDay } from './timeOfDay';
export type { TimeOfDay } from './timeOfDay';
export { TIME_ORDER, defaultTimeOfDay } from './timeOfDay';

/**
 * Live, eased blend weights shared by everything in the scene that reacts to
 * time of day (sky, water, fireflies, lighthouse...). SkyAndAtmosphere owns the
 * easing; everyone else just reads. Plain mutable object = zero re-renders.
 */
export const ambience = { sunset: 0, night: 0 };

export interface Palette {
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  skyHorizon: THREE.Color;
  fog: THREE.Color;
  ambient: THREE.Color;
  ambientI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  sun: THREE.Color;
  sunI: number;
  sunPos: THREE.Vector3;
  cloud: THREE.Color;
  waterTint: THREE.Color;
  glint: THREE.Color;
}

const c = (hex: string) => new THREE.Color(hex);

export const PALETTES: Record<TimeOfDay, Palette> = {
  day: {
    skyTop: c('#7CC8EE'), skyMid: c('#BFE6EE'), skyHorizon: c('#FFF4E0'), fog: c('#FFF3E0'),
    ambient: c('#FFFFFF'), ambientI: 0.9,
    hemiSky: c('#FFF6E4'), hemiGround: c('#BFEDE3'), hemiI: 0.8,
    sun: c('#FFF3DC'), sunI: 2.1, sunPos: new THREE.Vector3(45, 60, 35),
    cloud: c('#FFFFFF'),
    waterTint: c('#FFFFFF'), glint: c('#FFFAEB'),
  },
  sunset: {
    skyTop: c('#5B6FB5'), skyMid: c('#F4B08C'), skyHorizon: c('#FFB067'), fog: c('#F6C59E'),
    ambient: c('#FFD9BE'), ambientI: 0.6,
    hemiSky: c('#FFC49A'), hemiGround: c('#8DB6C6'), hemiI: 0.65,
    sun: c('#FF9C55'), sunI: 1.8, sunPos: new THREE.Vector3(90, 22, -60),
    cloud: c('#FFC3A6'),
    waterTint: c('#F5C4AA'), glint: c('#B8743F'),
  },
  night: {
    skyTop: c('#070E24'), skyMid: c('#18264A'), skyHorizon: c('#2C3D6B'), fog: c('#1A2748'),
    ambient: c('#8EA6E6'), ambientI: 0.42,
    hemiSky: c('#6F87CC'), hemiGround: c('#14203C'), hemiI: 0.4,
    sun: c('#BCD2FF'), sunI: 0.55, sunPos: new THREE.Vector3(-50, 70, -40),
    cloud: c('#3A4A73'),
    waterTint: c('#3D5585'), glint: c('#DCE8FF'),
  },
};

/** Blend the three palettes by the current ambience weights into `out`. */
export function blendPalette(out: Palette, sunset: number, night: number) {
  const d = PALETTES.day, s = PALETTES.sunset, n = PALETTES.night;
  const wd = Math.max(0, 1 - sunset - night);
  const mixC = (k: keyof Palette) => {
    (out[k] as THREE.Color)
      .setRGB(0, 0, 0)
      .add((d[k] as THREE.Color).clone().multiplyScalar(wd))
      .add((s[k] as THREE.Color).clone().multiplyScalar(sunset))
      .add((n[k] as THREE.Color).clone().multiplyScalar(night));
  };
  (['skyTop', 'skyMid', 'skyHorizon', 'fog', 'ambient', 'hemiSky', 'hemiGround', 'sun', 'cloud', 'waterTint', 'glint'] as const).forEach(mixC);
  out.ambientI = d.ambientI * wd + s.ambientI * sunset + n.ambientI * night;
  out.hemiI = d.hemiI * wd + s.hemiI * sunset + n.hemiI * night;
  out.sunI = d.sunI * wd + s.sunI * sunset + n.sunI * night;
  out.sunPos
    .set(0, 0, 0)
    .addScaledVector(d.sunPos, wd)
    .addScaledVector(s.sunPos, sunset)
    .addScaledVector(n.sunPos, night);
}

export const makePalette = (): Palette => ({
  skyTop: c('#000'), skyMid: c('#000'), skyHorizon: c('#000'), fog: c('#000'),
  ambient: c('#000'), ambientI: 0, hemiSky: c('#000'), hemiGround: c('#000'), hemiI: 0,
  sun: c('#000'), sunI: 0, sunPos: new THREE.Vector3(), cloud: c('#000'),
  waterTint: c('#000'), glint: c('#000'),
});
