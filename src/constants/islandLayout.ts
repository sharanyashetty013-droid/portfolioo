import * as THREE from 'three';
import { SectionId } from '../types/portfolio';

export interface IslandConfig {
  id: SectionId;
  name: string;
  chapterTitle: string;
  chapterNumber: number;
  storyLine: string;
  radius: number;
  height: number;
  position: [number, number, number];
  pierPosition: [number, number, number];
  dockPosition: [number, number, number];
  cameraPos: [number, number, number];
  targetPos: [number, number, number];
  routeT: number; // Curve parameter t (0.0 to 1.0)
  seed: number;
  sandColor: string;
  cliffColor: string;
}

export const CHAPTER_ORDER: SectionId[] = ['home', 'skills', 'projects', 'hackathons', 'contact'];

/**
 * Single source of truth for the Archipelago layout.
 * Islands arranged in Chapter order along a winding S-curve sea voyage.
 */
export const ISLAND_LAYOUT: Record<SectionId, IslandConfig> = {
  home: {
    id: 'home',
    name: 'Home Haven',
    chapterTitle: 'Chapter 1: Setting sail',
    chapterNumber: 1,
    storyLine: 'Welcome aboard. Second-year CSE student at NMAMIT focused on backend engineering and blockchain systems.',
    radius: 11,
    height: 3.2,
    position: [0, 0, 0],
    pierPosition: [-8, 0, 4.5],
    dockPosition: [-14, 0, 9.5],
    cameraPos: [-18, 15, 25],
    targetPos: [-2, 2.5, 2],
    routeT: 0.0,
    seed: 101,
    sandColor: '#F9E7B8',
    cliffColor: '#C2AE98',
  },
  skills: {
    id: 'skills',
    name: 'Skills Atoll',
    chapterTitle: 'Chapter 2: What I learned',
    chapterNumber: 2,
    storyLine: 'Core backend, smart contracts, modern frontend, tools, and continuous algorithmic problem-solving.',
    radius: 12,
    height: 3.2,
    position: [65, 0, -55],
    pierPosition: [56, 0, -50],
    dockPosition: [50, 0, -46],
    cameraPos: [46, 16, -26],
    targetPos: [63, 2.5, -53],
    routeT: 0.25,
    seed: 202,
    sandColor: '#F9E7B8',
    cliffColor: '#B8A58F',
  },
  projects: {
    id: 'projects',
    name: 'Projects District',
    chapterTitle: 'Chapter 3: What I built',
    chapterNumber: 3,
    storyLine: 'Production systems, forensics tooling, fraud mitigation, and backend services.',
    radius: 14,
    height: 3.4,
    position: [-15, 0, -125],
    pierPosition: [-24, 0, -120],
    dockPosition: [-30, 0, -116],
    cameraPos: [-32, 18, -96],
    targetPos: [-16, 3, -123],
    routeT: 0.50,
    seed: 303,
    sandColor: '#F9E7B8',
    cliffColor: '#C5B39E',
  },
  hackathons: {
    id: 'hackathons',
    name: 'Hackathons Summit',
    chapterTitle: 'Chapter 4: Putting it to the test',
    chapterNumber: 4,
    storyLine: 'Competitive hackathons, SIH internal finals, enterprise datathons, and 24-hour sprints.',
    radius: 12,
    height: 3.8,
    position: [60, 0, -200],
    pierPosition: [51, 0, -195],
    dockPosition: [45, 0, -191],
    cameraPos: [43, 17, -172],
    targetPos: [58, 3, -198],
    routeT: 0.75,
    seed: 404,
    sandColor: '#F9E7B8',
    cliffColor: '#BFAC97',
  },
  contact: {
    id: 'contact',
    name: 'Lighthouse Beacon',
    chapterTitle: "Chapter 5: Let's connect",
    chapterNumber: 5,
    storyLine: 'Direct email, GitHub, LinkedIn, and LeetCode. Available for backend and blockchain opportunities.',
    radius: 9,
    height: 3.0,
    position: [-20, 0, -270],
    pierPosition: [-27, 0, -266],
    dockPosition: [-33, 0, -262],
    cameraPos: [-34, 14, -244],
    targetPos: [-20, 2.5, -268],
    routeT: 1.0,
    seed: 505,
    sandColor: '#F9E7B8',
    cliffColor: '#CDBBA4',
  },
};

/**
 * Control waypoints for the smooth CatmullRom sailing route.
 */
export const ROUTE_WAYPOINTS: [number, number, number][] = [
  // Chapter 1: Home Dock
  [-14, 0, 9.5],
  [-18, 0, 2],
  [-10, 0, -18],
  [15, 0, -32],
  [38, 0, -42],
  // Chapter 2: Skills Dock
  [50, 0, -46],
  [45, 0, -68],
  [22, 0, -92],
  [-4, 0, -106],
  // Chapter 3: Projects Dock
  [-30, 0, -116],
  [-26, 0, -145],
  [0, 0, -168],
  [28, 0, -182],
  // Chapter 4: Hackathons Dock
  [45, 0, -191],
  [36, 0, -218],
  [12, 0, -242],
  [-12, 0, -252],
  // Chapter 5: Contact Dock
  [-33, 0, -262],
];

export function createVoyageCurve(): THREE.CatmullRomCurve3 {
  const points = ROUTE_WAYPOINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

export const HOT_AIR_BALLOON_CONFIG = {
  center: ISLAND_LAYOUT.home.position,
  orbitRadius: 16.0,
  flightHeight: 14.0,
  speed: 0.18,
};
