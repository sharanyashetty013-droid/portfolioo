import React, { useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionId, ProjectItem, HackathonItem, SkillGroup } from '../../types/portfolio';
import { CameraController } from './CameraController';
import { SkyAndAtmosphere } from './SkyAndAtmosphere';
import { WaterSea } from './WaterSea';
import { RoutePathLine } from './RoutePathLine';
import { HeroBoat } from './HeroBoat';
import { HomeIsland } from './islands/HomeIsland';
import { SkillsIsland } from './islands/SkillsIsland';
import { ProjectsIsland } from './islands/ProjectsIsland';
import { HackathonsIsland } from './islands/HackathonsIsland';
import { ContactIsland } from './islands/ContactIsland';
import { FloatingLabelsTracker, ProjectedLabel } from './FloatingLabelsTracker';
import { FloatingLabelsOverlay } from '../ui/FloatingLabelsOverlay';
import { ISLAND_LAYOUT } from '../../constants/islandLayout';

interface WorldSceneProps {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  onSelectProject: (p: ProjectItem) => void;
  onSelectHackathon: (h: HackathonItem) => void;
  onSelectSkillGroup: (g: SkillGroup) => void;
  onOpenContact: () => void;
  onOpenResume?: () => void;
  isAnyModalOpen?: boolean;
  reducedMotion?: boolean;
  onSailingStateChange?: (isSailing: boolean) => void;
  onReady?: () => void;
}

// Compiles every shader up front (async where the browser supports it) before the
// render loop starts, so the first frame doesn't freeze the page.
const SceneWarmup: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    const finish = () => { if (!cancelled) onDone(); };
    const warm = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera));
    warm.then(finish, finish);
    return () => { cancelled = true; };
  }, [gl, scene, camera]);
  return null;
};

// Fires once after the first real frame has been drawn
const FirstFrame: React.FC<{ onFrame: () => void }> = ({ onFrame }) => {
  const done = React.useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onFrame);
  });
  return null;
};

export const WorldScene: React.FC<WorldSceneProps> = ({
  activeSection,
  onNavigate,
  onSelectProject,
  onSelectHackathon,
  onSelectSkillGroup,
  onOpenContact,
  onOpenResume,
  isAnyModalOpen = false,
  reducedMotion = false,
  onSailingStateChange,
  onReady,
}) => {
  const [compiled, setCompiled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [boatPos, setBoatPos] = useState<THREE.Vector3>(
    new THREE.Vector3(...ISLAND_LAYOUT.home.dockPosition)
  );
  const [boatForward, setBoatForward] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 1)
  );
  const [isSailing, setIsSailing] = useState(false);
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel[]>([]);

  const targetT = ISLAND_LAYOUT[activeSection].routeT;

  const handleBoatUpdate = (pos: THREE.Vector3, forward: THREE.Vector3, moving: boolean) => {
    setBoatPos(pos);
    setBoatForward(forward);
    if (moving !== isSailing) {
      setIsSailing(moving);
      if (onSailingStateChange) {
        onSailingStateChange(moving);
      }
    }
  };

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas
        frameloop={compiled ? 'always' : 'never'}
        onCreated={({ gl }) => gl.setClearColor('#CDEFEA')}
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
        shadows
        dpr={[1, 1.5]}
        camera={{
          position: ISLAND_LAYOUT.home.cameraPos,
          fov: 44,
          near: 0.5,
          far: 900,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
      >
        <Suspense fallback={null}>
          {/* Dynamic Sky & Sunlight with Shadows */}
          <SkyAndAtmosphere reducedMotion={reducedMotion} />

          {/* Rippling Sea with Custom Shader */}
          <WaterSea />

          {/* Dotted / Solid Navigation Route Path */}
          <RoutePathLine currentT={targetT} />

          {/* Five Realized Islands of the Archipelago */}
          {/* Chapter 1: Home */}
          <HomeIsland 
            isActive={activeSection === 'home'}
            isAnyModalOpen={isAnyModalOpen}
            onNavigate={onNavigate}
            onOpenResume={onOpenResume}
            reducedMotion={reducedMotion} 
          />

          {/* Chapter 2: Skills */}
          <SkillsIsland
            isActive={activeSection === 'skills'}
            isAnyModalOpen={isAnyModalOpen}
            onSelectSkillGroup={onSelectSkillGroup}
            reducedMotion={reducedMotion}
          />

          {/* Chapter 3: Projects */}
          <ProjectsIsland
            isActive={activeSection === 'projects'}
            isAnyModalOpen={isAnyModalOpen}
            onSelectProject={onSelectProject}
            reducedMotion={reducedMotion}
          />

          {/* Chapter 4: Hackathons */}
          <HackathonsIsland
            isActive={activeSection === 'hackathons'}
            isAnyModalOpen={isAnyModalOpen}
            onSelectHackathon={onSelectHackathon}
            reducedMotion={reducedMotion}
          />

          {/* Chapter 5: Contact */}
          <ContactIsland
            isActive={activeSection === 'contact'}
            isAnyModalOpen={isAnyModalOpen}
            onOpenContact={onOpenContact}
            reducedMotion={reducedMotion}
          />

          {/* 3D Tracker inside Canvas */}
          <FloatingLabelsTracker
            activeSection={activeSection}
            isSailing={isSailing}
            isAnyModalOpen={isAnyModalOpen}
            onUpdate={setProjectedLabels}
            onSelectProject={onSelectProject}
            onSelectHackathon={onSelectHackathon}
            onSelectSkillGroup={onSelectSkillGroup}
            onOpenContact={onOpenContact}
          />

          {/* Hero Rowing Boat Sailing the Catmull-Rom Curve */}
          <HeroBoat
            targetT={targetT}
            onBoatUpdate={handleBoatUpdate}
            reducedMotion={reducedMotion}
          />

          {/* Dynamic Camera Chase & Island Framing */}
          <CameraController
            activeSection={activeSection}
            boatPos={boatPos}
            boatForward={boatForward}
            isSailing={isSailing}
            reducedMotion={reducedMotion}
            isAnyModalOpen={isAnyModalOpen}
          />

          <SceneWarmup onDone={() => setCompiled(true)} />
          {compiled && <FirstFrame onFrame={() => { setVisible(true); onReady?.(); }} />}
        </Suspense>
      </Canvas>

      {/* 2D HTML/SVG Overlay outside Canvas (Zero R3F reconciler errors) */}
      <FloatingLabelsOverlay labels={projectedLabels} />
    </div>
  );
};
