import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import confetti from 'canvas-confetti';
import { SectionId, ProjectItem, HackathonItem, SkillGroup } from './types/portfolio';
import { Navbar } from './components/navigation/Navbar';
import { SceneLoader } from './components/ui/SceneLoader';
import { OverlayHUD } from './components/ui/OverlayHUD';
import { ProjectModal } from './components/modals/ProjectModal';
import { HackathonModal } from './components/modals/HackathonModal';
import { SkillModal } from './components/modals/SkillModal';
import { ResumeModal } from './components/modals/ResumeModal';
import { ContactModal } from './components/modals/ContactModal';
import { CHAPTER_ORDER } from './constants/islandLayout';
import { defaultTimeOfDay, TIME_ORDER, TimeOfDay } from './components/scene/timeOfDay';

// three.js + the whole scene load in a separate chunk so the HUD paints first
const WorldScene = lazy(() =>
  import('./components/scene/WorldScene').then((m) => ({ default: m.WorldScene }))
);

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [isSailing, setIsSailing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonItem | null>(null);
  const [selectedSkillGroup, setSelectedSkillGroup] = useState<SkillGroup | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => defaultTimeOfDay());
  const cycleTimeOfDay = () =>
    setTimeOfDay((t) => TIME_ORDER[(TIME_ORDER.indexOf(t) + 1) % TIME_ORDER.length]);



  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // celebrate the first time you reach Hackathons Summit
  const celebrated = useRef(false);
  const wasSailing = useRef(false);
  useEffect(() => {
    if (wasSailing.current && !isSailing && activeSection === 'hackathons' && !celebrated.current && !reducedMotion) {
      celebrated.current = true;
      const colors = ['#1AA6A6', '#F5B82E', '#E4614C', '#8B5CF6', '#FFF8EB'];
      confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin: { x: 0.5, y: 0.45 }, colors, scalar: 0.9 });
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors }), 180);
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors }), 300);
    }
    wasSailing.current = isSailing;
  }, [isSailing, activeSection, reducedMotion]);

  const handleNavigate = (section: SectionId) => {
    setActiveSection(section);
  };

  const isAnyModalOpen = Boolean(
    selectedProject || selectedHackathon || selectedSkillGroup || isResumeOpen || isContactOpen
  );



  return (
    <div className="relative w-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-sky-50 font-sans text-slate-800 select-none">
      {/* Fixed Top Navigation Bar */}
      <Navbar onOpenResume={() => setIsResumeOpen(true)} timeOfDay={timeOfDay} onCycleTime={cycleTimeOfDay} />

      {/* Main 3D Voyage Scene */}
      <div className="scene-backdrop relative w-full h-full min-h-[100dvh] max-h-[100dvh]">
        <SceneLoader visible={!sceneReady} />
        <Suspense fallback={null}>
        <WorldScene
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onSelectProject={(p) => setSelectedProject(p)}
          onSelectHackathon={(h) => setSelectedHackathon(h)}
          onSelectSkillGroup={(g) => setSelectedSkillGroup(g)}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenResume={() => setIsResumeOpen(true)}
          isAnyModalOpen={isAnyModalOpen}
          reducedMotion={reducedMotion}
          onSailingStateChange={(sailing) => setIsSailing(sailing)}
          onReady={() => setSceneReady(true)}
          timeOfDay={timeOfDay}
        />
        </Suspense>

        {/* Screen-Anchored Overlay HUD */}
        <OverlayHUD
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenResume={() => setIsResumeOpen(true)}
          isSailing={isSailing}
        />
      </div>

      {/* Interactive Modals */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
      <HackathonModal
        hackathon={selectedHackathon}
        onClose={() => setSelectedHackathon(null)}
      />
      <SkillModal
        skillGroup={selectedSkillGroup}
        onClose={() => setSelectedSkillGroup(null)}
      />
      <ResumeModal
        isOpen={isResumeOpen}
        onClose={() => setIsResumeOpen(false)}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
