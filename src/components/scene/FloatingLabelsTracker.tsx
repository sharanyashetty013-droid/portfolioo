import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SectionId, ProjectItem, HackathonItem, SkillGroup } from '../../types/portfolio';
import { portfolioData } from '../../data/portfolioData';
import { ISLAND_LAYOUT } from '../../constants/islandLayout';

export interface LabelItem {
  id: string;
  name: string;
  shortName: string;
  badge?: string;
  dotColor: string;
  worldPos: THREE.Vector3;
  onClick: () => void;
  category: 'hackathon' | 'project' | 'skill' | 'contact';
}

export interface ProjectedLabel {
  id: string;
  name: string;
  shortName: string;
  badge?: string;
  dotColor: string;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  displaced: boolean;
  visible: boolean;
  targetX: number;
  targetY: number;
  onClick: () => void;
}

interface FloatingLabelsTrackerProps {
  activeSection: SectionId;
  isSailing: boolean;
  isAnyModalOpen: boolean;
  onUpdate: (labels: ProjectedLabel[]) => void;
  onSelectProject: (p: ProjectItem) => void;
  onSelectHackathon: (h: HackathonItem) => void;
  onSelectSkillGroup: (g: SkillGroup) => void;
  onOpenContact: () => void;
}

export const FloatingLabelsTracker: React.FC<FloatingLabelsTrackerProps> = ({
  activeSection,
  isSailing,
  isAnyModalOpen,
  onUpdate,
  onSelectProject,
  onSelectHackathon,
  onSelectSkillGroup,
  onOpenContact,
}) => {
  const { camera, size } = useThree();
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const prevCheckRef = useRef({ hash: '', time: 0 });

  // Filter items for the currently docked island
  const activeItems = useMemo<LabelItem[]>(() => {
    if (activeSection === 'home') return [];

    if (activeSection === 'hackathons') {
      const isl = ISLAND_LAYOUT.hackathons;
      return portfolioData.hackathons.map((h) => {
        let shortName = h.name.replace(' Hackathon', '').replace(' 2026', " '26");
        if (h.id === 'mst-buildathon') shortName = 'MST Build';
        if (h.id === 'infinity-hacks') shortName = 'Infinity';
        if (h.id === 'ibm-z-datathon') shortName = 'IBM Z';
        if (h.id === 'boss-battle') shortName = 'Boss Battle';
        if (h.id === 'inceptio-hackathon') shortName = 'Inceptio';
        if (h.id === 'sih-2026') shortName = "SIH '26";

        return {
          id: h.id,
          name: h.name,
          shortName,
          badge: h.badge,
          dotColor: h.badge === 'Internal finals' ? '#3B82F6' : '#14B8A6',
          worldPos: new THREE.Vector3(
            isl.position[0] + h.slotPosition[0],
            isl.height + h.podiumHeight + 1.25,
            isl.position[2] + h.slotPosition[2]
          ),
          onClick: () => onSelectHackathon(h),
          category: 'hackathon',
        };
      });
    }

    if (activeSection === 'projects') {
      const isl = ISLAND_LAYOUT.projects;
      return portfolioData.projects.map((p) => ({
        id: p.id,
        name: p.title,
        shortName: p.title,
        badge: p.tags[0],
        dotColor: p.buildingColor,
        worldPos: new THREE.Vector3(
          isl.position[0] + p.slotPosition[0],
          isl.height + 2.7,
          isl.position[2] + p.slotPosition[2]
        ),
        onClick: () => onSelectProject(p),
        category: 'project',
      }));
    }

    if (activeSection === 'skills') {
      const isl = ISLAND_LAYOUT.skills;
      return portfolioData.skillGroups.map((g) => ({
        id: g.id,
        name: g.name,
        shortName: g.name,
        badge: g.skills[0],
        dotColor: g.color,
        worldPos: new THREE.Vector3(
          isl.position[0] + g.slotPosition[0],
          isl.height + 2.1,
          isl.position[2] + g.slotPosition[2]
        ),
        onClick: () => onSelectSkillGroup(g),
        category: 'skill',
      }));
    }

    if (activeSection === 'contact') {
      const isl = ISLAND_LAYOUT.contact;
      return [
        {
          id: 'contact-lighthouse',
          name: 'Contact Sharanya',
          shortName: 'Contact Sharanya',
          badge: 'Click to open',
          dotColor: '#EF4444',
          worldPos: new THREE.Vector3(
            isl.position[0] - 1.2,
            isl.height + 7.2,
            isl.position[2] - 1.0
          ),
          onClick: onOpenContact,
          category: 'contact',
        },
      ];
    }

    return [];
  }, [activeSection, onSelectHackathon, onSelectProject, onSelectSkillGroup, onOpenContact]);

  useFrame((state) => {
    if (isSailing || isAnyModalOpen || activeItems.length === 0) {
      if (prevCheckRef.current.hash !== 'empty') {
        prevCheckRef.current.hash = 'empty';
        onUpdate([]);
      }
      return;
    }

    // Check if camera or viewport moved
    const cam = state.camera;
    const currentHash = `${cam.position.x.toFixed(2)}_${cam.position.y.toFixed(2)}_${cam.position.z.toFixed(2)}_${cam.quaternion.x.toFixed(3)}_${size.width}x${size.height}_${activeSection}`;

    if (currentHash === prevCheckRef.current.hash) {
      return;
    }
    prevCheckRef.current.hash = currentHash;

    const isTablet = size.width >= 640 && size.width <= 1024;
    const isPhone = size.width < 640;

    // Fixed uniform pixel height: 28px on desktop, 24px on tablet/phone
    const defaultHeight = isPhone || isTablet ? 24 : 28;

    // Get obstacle rectangles to prevent overlapping cards or navigation bar
    const heroCardRect = document.getElementById('hero-card')?.getBoundingClientRect();
    const chapterBoxRect = document.getElementById('chapter-box')?.getBoundingClientRect();
    const navBarRect = document.getElementById('voyage-controls')?.getBoundingClientRect();
    const topNavRect = document.getElementById('top-navbar')?.getBoundingClientRect();

    const projected: ProjectedLabel[] = [];

    // 1. Initial 3D to 2D projection
    for (const item of activeItems) {
      tempVec.copy(item.worldPos).project(camera);

      // Check if item is in front of camera and inside normal frustum
      const isVisible = tempVec.z > -1.0 && tempVec.z < 1.0;
      const screenX = (tempVec.x * 0.5 + 0.5) * size.width;
      const screenY = (-tempVec.y * 0.5 + 0.5) * size.height;

      // Uniform width estimation based on shortName on mobile, or full name on desktop
      const displayName = isPhone ? item.shortName : item.name;
      const charWidth = isPhone || isTablet ? 6.8 : 7.6;
      const width = Math.round(displayName.length * charWidth + 34);
      const height = defaultHeight;

      // Position centered horizontally, slightly above 3D object anchor
      const initX = screenX - width / 2;
      const initY = screenY - height - 8;

      projected.push({
        id: item.id,
        name: item.name,
        shortName: item.shortName,
        badge: item.badge,
        dotColor: item.dotColor,
        anchorX: screenX,
        anchorY: screenY,
        x: initX,
        y: initY,
        width,
        height,
        displaced: false,
        visible: isVisible,
        targetX: screenX,
        targetY: screenY,
        onClick: item.onClick,
      });
    }

    const margin = 12;
    const clearance = 10; // At least 10px clearance

    // 2. Avoid card obstacles and navbars
    for (const lbl of projected) {
      if (!lbl.visible) continue;

      if (chapterBoxRect) {
        if (
          lbl.x + lbl.width > chapterBoxRect.left - clearance &&
          lbl.x < chapterBoxRect.right + clearance &&
          lbl.y + lbl.height > chapterBoxRect.top - clearance &&
          lbl.y < chapterBoxRect.bottom + clearance
        ) {
          lbl.y = chapterBoxRect.top - lbl.height - clearance;
        }
      }

      if (navBarRect) {
        if (
          lbl.x + lbl.width > navBarRect.left - clearance &&
          lbl.x < navBarRect.right + clearance &&
          lbl.y + lbl.height > navBarRect.top - clearance &&
          lbl.y < navBarRect.bottom + clearance
        ) {
          lbl.y = navBarRect.top - lbl.height - clearance;
        }
      }

      if (heroCardRect) {
        if (
          lbl.x < heroCardRect.right + clearance &&
          lbl.x + lbl.width > heroCardRect.left - clearance &&
          lbl.y + lbl.height > heroCardRect.top - clearance &&
          lbl.y < heroCardRect.bottom + clearance
        ) {
          lbl.x = heroCardRect.right + clearance;
        }
      }

      if (topNavRect) {
        if (
          lbl.x + lbl.width > topNavRect.left - clearance &&
          lbl.x < topNavRect.right + clearance &&
          lbl.y < topNavRect.bottom + clearance
        ) {
          lbl.y = topNavRect.bottom + clearance;
        }
      }
    }

    // 3. Pairwise Label Collision Avoidance (Push apart until at least 10px between them)
    const passes = 8;
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i];
          const b = projected[j];
          if (!a.visible || !b.visible) continue;

          const centerAX = a.x + a.width / 2;
          const centerAY = a.y + a.height / 2;
          const centerBX = b.x + b.width / 2;
          const centerBY = b.y + b.height / 2;

          const reqDistX = (a.width + b.width) / 2 + clearance;
          const reqDistY = (a.height + b.height) / 2 + clearance;

          const diffX = centerAX - centerBX;
          const diffY = centerAY - centerBY;

          const overlapX = reqDistX - Math.abs(diffX);
          const overlapY = reqDistY - Math.abs(diffY);

          if (overlapX > 0 && overlapY > 0) {
            // Push apart along axis of smaller overlap
            if (overlapY <= overlapX) {
              const pushY = overlapY * 0.55;
              if (centerAY < centerBY) {
                a.y -= pushY;
                b.y += pushY;
              } else {
                a.y += pushY;
                b.y -= pushY;
              }
            } else {
              const pushX = overlapX * 0.55;
              if (centerAX < centerBX) {
                a.x -= pushX;
                b.x += pushX;
              } else {
                a.x += pushX;
                b.x += pushX;
              }
            }
          }
        }
      }

      // Clamp within screen boundaries after each pass
      for (const lbl of projected) {
        if (!lbl.visible) continue;
        lbl.x = Math.max(margin, Math.min(size.width - lbl.width - margin, lbl.x));
        lbl.y = Math.max(margin + 36, Math.min(size.height - lbl.height - margin - 36, lbl.y));
      }
    }

    // 4. Leader line calculation
    for (const lbl of projected) {
      if (!lbl.visible) continue;

      const nearestX = Math.max(lbl.x, Math.min(lbl.x + lbl.width, lbl.anchorX));
      const nearestY = Math.max(lbl.y, Math.min(lbl.y + lbl.height, lbl.anchorY));
      lbl.targetX = nearestX;
      lbl.targetY = nearestY;

      // Distance moved from natural unshifted position
      const dist = Math.hypot(
        lbl.x + lbl.width / 2 - lbl.anchorX,
        lbl.y + lbl.height / 2 - (lbl.anchorY - lbl.height - 8)
      );
      lbl.displaced = dist > 8;
    }

    onUpdate(projected);
  });

  return null;
};
