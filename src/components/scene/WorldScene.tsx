import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
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
import { IslandLife } from './life/IslandLife';
import { Fireflies } from './effects/Fireflies';
import { TimeOfDay } from './ambience';

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
  timeOfDay?: TimeOfDay;
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
  timeOfDay = 'day',
}) => {
  const [compiled, setCompiled] = useState(false);
  const [visible, setVisible] = useState(false);
  // Boat pose lives in refs: it changes every frame, and pushing it through
  // React state used to re-render the entire scene 60x a second while sailing.
  const boatPosRef = useRef(new THREE.Vector3(...ISLAND_LAYOUT.home.dockPosition));
  const boatForwardRef = useRef(new THREE.Vector3(0, 0, 1));
  const [isSailing, setIsSailing] = useState(false);
  const sailingRef = useRef(false);
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel[]>([]);
  const [dpr, setDpr] = useState(1.5);

  const targetT = ISLAND_LAYOUT[activeSection].routeT;

  const handleBoatUpdate = useCallback((pos: THREE.Vector3, forward: THREE.Vector3, moving: boolean) => {
    boatPosRef.current.copy(pos);
    boatForwardRef.current.copy(forward);
    if (moving !== sailingRef.current) {
      sailingRef.current = moving;
      setIsSailing(moving);
      onSailingStateChange?.(moving);
    }
  }, [onSailingStateChange]);

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas
        frameloop={compiled ? 'always' : 'never'}
        onCreated={({ gl }) => { gl.setClearColor('#CDEFEA'); }}
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
        shadows
        dpr={dpr}
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
        {/* drop resolution on struggling devices, raise it back when there's headroom */}
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.75, window.devicePixelRatio || 1))} flipflops={3} onFallback={() => setDpr(1)} />
        <Suspense fallback={null}>
          {/* Dynamic Sky & Sunlight with Shadows */}
          <SkyAndAtmosphere reducedMotion={reducedMotion} timeOfDay={timeOfDay} />

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

          {/* Islanders, gulls, crabs, jumping fish */}
          <IslandLife reducedMotion={reducedMotion} />
          <Fireflies reducedMotion={reducedMotion} />

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
            boatPosRef={boatPosRef}
            boatForwardRef={boatForwardRef}
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
