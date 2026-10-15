import React, { useState, useEffect, useRef } from 'react';
import { SectionId, ProjectItem, HackathonItem, SkillGroup } from './types/portfolio';
import { Navbar } from './components/navigation/Navbar';
import { WorldScene } from './components/scene/WorldScene';
import { OverlayHUD } from './components/ui/OverlayHUD';
import { ProjectModal } from './components/modals/ProjectModal';
import { HackathonModal } from './components/modals/HackathonModal';
import { SkillModal } from './components/modals/SkillModal';
import { ResumeModal } from './components/modals/ResumeModal';
import { ContactModal } from './components/modals/ContactModal';
import { CHAPTER_ORDER } from './constants/islandLayout';

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [isSailing, setIsSailing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonItem | null>(null);
  const [selectedSkillGroup, setSelectedSkillGroup] = useState<SkillGroup | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);



  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleNavigate = (section: SectionId) => {
    setActiveSection(section);
  };

  const isAnyModalOpen = Boolean(
    selectedProject || selectedHackathon || selectedSkillGroup || isResumeOpen || isContactOpen
  );



  const [isSceneReady, setIsSceneReady] = useState(false);

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-sky-50 font-sans text-slate-800 select-none">
      {/* Startup Loading Veil (Smooth Fade Out when 3D scene compiles) */}
      <div 
        className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#F4FBFC] to-[#D8EFF5] transition-opacity duration-700 ${
          isSceneReady ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] rounded-2xl p-6 text-center max-w-[320px] w-full animate-bounce">
          <div className="text-4xl mb-2">⛵</div>
          <h2 className="font-heading text-lg font-bold text-[#0B1B2D]">Sharanya L Shetty</h2>
          <p className="text-xs font-bold text-[#0F766E] mt-1 mb-3">Setting sail to the 3D Archipelago...</p>
          <div className="w-full h-2 bg-slate-200 border border-[#0B1B2D] rounded-full overflow-hidden">
            <div className="h-full bg-[#1AA6A6] w-2/3 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Fixed Top Navigation Bar */}
      <Navbar onOpenResume={() => setIsResumeOpen(true)} />

      {/* Main 3D Voyage Scene */}
      <div className="w-full h-full min-h-[100dvh] max-h-[100dvh]">
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
          onLoaded={() => setIsSceneReady(true)}
        />

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
