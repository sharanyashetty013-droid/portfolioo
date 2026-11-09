import React, { useEffect } from 'react';
import { SectionId } from '../../types/portfolio';
import { portfolioData } from '../../data/portfolioData';
import { ISLAND_LAYOUT, CHAPTER_ORDER } from '../../constants/islandLayout';
import { 
  ChevronLeft, 
  ChevronRight, 
  Navigation
} from 'lucide-react';
import { Tilt3D } from './Tilt3D';

interface OverlayHUDProps {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  onOpenContact: () => void;
  onOpenResume?: () => void;
  isSailing?: boolean;
  introDone?: boolean;
}

export const OverlayHUD: React.FC<OverlayHUDProps> = ({
  activeSection,
  onNavigate,
  onOpenContact,
  isSailing = false,
  introDone = true,
}) => {
  const { personal } = portfolioData;
  const currentConfig = ISLAND_LAYOUT[activeSection];
  const currentIndex = CHAPTER_ORDER.indexOf(activeSection);
  const prevChapter = currentIndex > 0 ? CHAPTER_ORDER[currentIndex - 1] : null;
  const nextChapter = currentIndex < CHAPTER_ORDER.length - 1 ? CHAPTER_ORDER[currentIndex + 1] : null;

  // Arrow key navigation between chapters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' && nextChapter) {
        onNavigate(nextChapter);
      } else if (e.key === 'ArrowLeft' && prevChapter) {
        onNavigate(prevChapter);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapter, prevChapter, onNavigate]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 lg:p-6 pb-safe pt-safe pl-safe pr-safe h-[100dvh] max-h-[100dvh] overflow-hidden select-none">
      {/* Top Spacer for top navbar */}
      <div className="h-11 sm:h-14 shrink-0" />

      {/* Desktop / Tablet Left Anchor Container for Hero Card */}
      <div className="flex-1 flex flex-col justify-center sm:justify-start">
        {/* HOME Island Personal Profile Card - Strictly NO scrollbar, completely visible */}
        {activeSection === 'home' && (
          <Tilt3D className="sm:w-auto sm:max-w-[60%] lg:max-w-md lg:mt-6">
          <div
            id="hero-card"
            className={`pointer-events-auto transition-all duration-500 transform ${
              isSailing || !introDone ? 'opacity-0 -translate-x-8 pointer-events-none' : 'opacity-100 translate-x-0 card-3d-in'
            } 
            /* Fixed on Mobile above nav bar with NO scrollbar, static on desktop */
            fixed left-3 right-3 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-40
            sm:static sm:w-auto sm:mx-0 sm:mt-2
            glass p-5 sm:p-7 overflow-visible`}
          >
            {/* Name */}
            {introDone && !isSailing && (
              <h1 className="hero-name text-[28px] sm:text-[40px] leading-[1.05]" aria-label={personal.name}>
                {'Sharanya'.split('').map((ch, i) => (
                  <span key={i} style={{ '--i': i } as React.CSSProperties} aria-hidden="true">{ch}</span>
                ))}{' '}
                <em>
                  {'L Shetty'.split('').map((ch, i) => (
                    <span key={i} style={{ '--i': i + 9 } as React.CSSProperties} aria-hidden="true">{ch}</span>
                  ))}
                </em>
              </h1>
            )}

            <div className="text-[12px] sm:text-[14px] font-bold text-[#3E6B73] mt-2">
              2nd-year CSE · NMAMIT · CGPA 9.36
            </div>

            <p className="text-[12.5px] sm:text-[15px] font-semibold text-[#24505A] leading-relaxed mt-2.5 sm:mt-3 max-w-[38ch]">
              I build backend systems and smart contracts, and I spend a lot of weekends at hackathons.
            </p>

            <div className="depth-1 flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
              <span className="glass-chip">Backend Systems</span>
              <span className="glass-chip">Blockchain &amp; Solidity</span>
            </div>

            <div className="depth-3 mt-4 sm:mt-5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onNavigate('skills')}
                className="btn-glow px-4 py-2 sm:px-5 sm:py-2.5 text-[13px] sm:text-[15px]"
              >
                See my work
              </button>
              <button
                onClick={onOpenContact}
                className="btn-glass px-4 py-2 sm:px-5 sm:py-2.5 text-[13px] sm:text-[15px]"
              >
                Say hi
              </button>
            </div>
          </div>
          </Tilt3D>
        )}
      </div>

      {/* Center Sailing Notification */}
      {isSailing && (
        <div className="relative self-center glass glass-pill text-[#0F4C5C] px-5 py-2 sm:py-2.5 flex items-center gap-2 text-xs sm:text-sm font-extrabold my-2">
          <Navigation className="w-4 h-4 text-[#F2765D]" />
          <span>Sailing to {currentConfig.name}...</span>
        </div>
      )}

      {/* Bottom Stack: Chapter Caption Box & Navigation Bar */}
      <div className="w-full flex flex-col items-center gap-2 shrink-0">
        {/* Caption Box: Shown on chapters 2 through 5 - NO scrollbar, compact */}
        {activeSection !== 'home' && (
          <Tilt3D key={activeSection} max={6} className="sm:w-full sm:max-w-[80%] lg:max-w-xl sm:mb-14">
          <div
            id="chapter-box"
            className={`pointer-events-auto transition-all duration-500 transform ${
              isSailing ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0 card-3d-in'
            }
            fixed left-3 right-3 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-40
            sm:static sm:w-full
            glass p-4 sm:p-5 overflow-visible`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#BDE8E2] pb-1.5 mb-1.5 sm:pb-2 sm:mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F2765D]" />
                <h2 className="text-[15px] sm:text-lg font-black text-[#0F4C5C]">
                  {currentConfig.chapterTitle}
                </h2>
              </div>
              <span className="glass-chip shrink-0">
                Island {currentIndex + 1} of 5
              </span>
            </div>
            <p className="text-[11.5px] sm:text-[13px] text-[#24505A] font-semibold leading-relaxed">
              {currentConfig.storyLine}
            </p>
          </div>
          </Tilt3D>
        )}

        {/* ========================================================================= */}
        {/* VOYAGE NAVIGATION BAR - Classic Capsule / 3rd Pic Style                  */}
        {/* < Previous   ● Home   ● Skills   ● Projects   ● Hacks   ● Contact   Next >   */}
        {/* Perfectly centered, all chapters visible, zero overflow, fits any screen   */}
        {/* ========================================================================= */}
        <nav
          id="voyage-controls"
          aria-label="Chapter Navigation"
          className="pointer-events-auto 
          fixed left-1/2 -translate-x-1/2 bottom-[calc(10px+env(safe-area-inset-bottom,0px))] z-50
          w-auto max-w-[calc(100vw-16px)] sm:max-w-none
          glass glass-pill
          px-1.5 py-1 sm:px-3 sm:py-1.5 text-[#0F4C5C] 
          flex items-center justify-between sm:justify-center gap-0.5 sm:gap-1.5 select-none"
        >
          {/* Previous Button */}
          <button
            onClick={() => prevChapter && onNavigate(prevChapter)}
            disabled={!prevChapter}
            className={`inline-flex items-center justify-center gap-0.5 px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-colors shrink-0 ${
              prevChapter
                ? 'text-[#0F4C5C] hover:bg-white/70 cursor-pointer active:scale-95'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
            title="Sail to previous chapter"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* 5 Chapters with Dots - Always fully visible on all mobile interfaces */}
          <div className="flex items-center justify-center gap-0.5 sm:gap-1.5 shrink-0">
            {CHAPTER_ORDER.map((chId, idx) => {
              const isActive = activeSection === chId;
              const isPassed = idx <= currentIndex;
              
              const labelFull = 
                chId === 'home' ? 'Home' :
                chId === 'skills' ? 'Skills' :
                chId === 'projects' ? 'Projects' :
                chId === 'hackathons' ? 'Hackathons' : 'Contact';

              const labelMobile = 
                chId === 'hackathons' ? 'Hacks' : labelFull;

              return (
                <button
                  key={chId}
                  onClick={() => onNavigate(chId)}
                  className={`group relative flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-full text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-white bg-[#1AA6A6] shadow-[0_6px_14px_-6px_rgba(26,166,166,0.9)]'
                      : isPassed
                      ? 'text-[#0F4C5C] hover:bg-white/70'
                      : 'text-[#3E6B73] hover:bg-white/70'
                  }`}
                  title={`Sail to ${labelFull}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                      isActive ? 'bg-white scale-110' : isPassed ? 'bg-[#1AA6A6]' : 'bg-[#9CC5C4]'
                    }`}
                  />
                  <span className="hidden sm:inline">{labelFull}</span>
                  <span className="inline sm:hidden">{labelMobile}</span>
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => nextChapter && onNavigate(nextChapter)}
            disabled={!nextChapter}
            className={`inline-flex items-center justify-center gap-0.5 px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-colors shrink-0 ${
              nextChapter
                ? 'text-[#0F4C5C] hover:bg-white/70 cursor-pointer active:scale-95'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
            title="Sail to next chapter"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </nav>
      </div>
    </div>
  );
};
