import React, { useEffect } from 'react';
import { SectionId } from '../../types/portfolio';
import { portfolioData } from '../../data/portfolioData';
import { ISLAND_LAYOUT, CHAPTER_ORDER } from '../../constants/islandLayout';
import { 
  ChevronLeft, 
  ChevronRight, 
  Navigation
} from 'lucide-react';

interface OverlayHUDProps {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  onOpenContact: () => void;
  onOpenResume?: () => void;
  isSailing?: boolean;
}

export const OverlayHUD: React.FC<OverlayHUDProps> = ({
  activeSection,
  onNavigate,
  onOpenContact,
  isSailing = false,
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
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3 sm:p-5 lg:p-6 pb-safe pt-safe pl-safe pr-safe h-[100dvh] max-h-[100dvh] overflow-hidden select-none">
      {/* Top Spacer for top navbar */}
      <div className="h-11 sm:h-14 shrink-0" />

      {/* Desktop / Tablet Left Anchor Container for Hero Card */}
      <div className="flex-1 flex flex-col justify-center sm:justify-start">
        {/* HOME Island Personal Profile Card - Strictly NO scrollbar, completely visible */}
        {activeSection === 'home' && (
          <div
            id="hero-card"
            className={`pointer-events-auto transition-all duration-500 transform ${
              isSailing ? 'opacity-0 -translate-x-8 pointer-events-none' : 'opacity-100 translate-x-0'
            } 
            /* Fixed on Mobile with clean clearance above nav bar, static on desktop */
            fixed left-3 right-3 bottom-[calc(66px+env(safe-area-inset-bottom,0px))] z-40
            sm:static sm:w-auto sm:max-w-[60%] sm:mx-0 sm:mt-2
            lg:max-w-md lg:mt-6
            bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] sm:shadow-[5px_5px_0_#0B1B2D] rounded-2xl p-2.5 sm:p-5 overflow-visible`}
          >
            {/* Name */}
            <h1 className="font-heading text-lg sm:text-3xl font-bold text-[#0B1B2D] tracking-tight leading-tight">
              {personal.name}
            </h1>

            {/* Subtitle */}
            <div className="text-[11px] sm:text-sm font-semibold text-[#64748B] mt-0.5 sm:mt-1 tracking-tight">
              2nd-year CSE student at NMAMIT · CGPA 9.36
            </div>

            {/* Specialization Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
              <span className="inline-block px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-[#0B1B2D] bg-white border border-[#0B1B2D] rounded-md shadow-[1.5px_1.5px_0_#0B1B2D] transform -rotate-1">
                Backend Systems
              </span>
              <span className="inline-block px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-[#0B1B2D] bg-white border border-[#0B1B2D] rounded-md shadow-[1.5px_1.5px_0_#0B1B2D] transform rotate-1">
                Blockchain & Solidity
              </span>
            </div>

            {/* Human First-Person Intro */}
            <p className="text-[11px] sm:text-sm font-medium text-[#334155] leading-relaxed mt-1 sm:mt-1.5">
              I build backend systems and smart contracts, and I spend a lot of weekends at hackathons.
            </p>

            {/* Handcrafted Chunky Action Buttons */}
            <div className="mt-2 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-2.5">
              <button
                onClick={() => onNavigate('skills')}
                className="btn-chunky-teal px-3 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm rounded-xl"
              >
                See my work
              </button>
              <button
                onClick={onOpenContact}
                className="btn-chunky-light px-3 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm rounded-xl"
              >
                Say hi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center Sailing Notification */}
      {isSailing && (
        <div className="self-center bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] text-[#0B1B2D] px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 text-xs font-bold animate-pulse my-2">
          <Navigation className="w-4 h-4 text-[#1AA6A6]" />
          <span>Sailing to {currentConfig.name}...</span>
        </div>
      )}

      {/* Bottom Stack: Chapter Caption Box & Navigation Bar */}
      <div className="w-full flex flex-col items-center gap-2 shrink-0">
        {/* Caption Box: Shown on chapters 2 through 5 - NO scrollbar, compact */}
        {activeSection !== 'home' && (
          <div
            id="chapter-box"
            className={`pointer-events-auto transition-all duration-500 transform ${
              isSailing ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
            }
            fixed left-3 right-3 bottom-[calc(66px+env(safe-area-inset-bottom,0px))] z-40
            sm:static sm:w-full sm:max-w-[80%]
            lg:max-w-xl
            bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] rounded-2xl p-2.5 sm:p-4 overflow-visible`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-1 mb-1 sm:pb-2 sm:mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1AA6A6] border border-[#0B1B2D]" />
                <h2 className="font-heading text-xs sm:text-base font-bold text-[#0B1B2D]">
                  {currentConfig.chapterTitle}
                </h2>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] bg-white border border-[#0B1B2D] rounded px-1.5 py-0.5 shadow-[1.5px_1.5px_0_#0B1B2D] shrink-0">
                Island {currentIndex + 1} of 5
              </span>
            </div>
            <p className="text-[11.5px] sm:text-xs text-[#334155] font-medium leading-relaxed">
              {currentConfig.storyLine}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VOYAGE NAVIGATION BAR - Classic Capsule / 3rd Pic Style                  */}
        {/* Guaranteed to fit all mobile screen sizes (274px wide on phones)          */}
        {/* < Previous   ● Home   ● Skills   ● Projects   ● Hacks   ● Contact   Next >   */}
        {/* ========================================================================= */}
        <nav
          id="voyage-controls"
          aria-label="Chapter Navigation"
          className="pointer-events-auto 
          fixed left-1/2 -translate-x-1/2 bottom-[calc(14px+env(safe-area-inset-bottom,0px))] z-50
          w-auto max-w-[calc(100vw-12px)]
          bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] sm:shadow-[4px_4px_0_#0B1B2D] rounded-full 
          px-1.5 py-1 sm:px-3 sm:py-1.5 text-[#0B1B2D] 
          flex items-center justify-center gap-0.5 sm:gap-1.5 select-none shrink-0"
        >
          {/* Previous Button */}
          <button
            onClick={() => prevChapter && onNavigate(prevChapter)}
            disabled={!prevChapter}
            className={`inline-flex items-center justify-center p-1 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-full transition-colors shrink-0 ${
              prevChapter
                ? 'text-[#0B1B2D] hover:bg-amber-100/70 cursor-pointer active:scale-95'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
            title="Sail to previous chapter"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline ml-0.5">Previous</span>
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
                  className={`group relative flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#1AA6A6] text-white border border-[#0B1B2D] shadow-[1px_1px_0_#0B1B2D]'
                      : isPassed
                      ? 'text-[#0B1B2D] hover:bg-amber-100/70'
                      : 'text-slate-600 hover:bg-amber-100/60'
                  }`}
                  title={`Sail to ${labelFull}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                      isActive ? 'bg-white scale-110' : isPassed ? 'bg-[#1AA6A6]' : 'bg-slate-400'
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
            className={`inline-flex items-center justify-center p-1 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-full transition-colors shrink-0 ${
              nextChapter
                ? 'text-[#0B1B2D] hover:bg-amber-100/70 cursor-pointer active:scale-95'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
            title="Sail to next chapter"
          >
            <span className="hidden sm:inline mr-0.5">Next</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </nav>
      </div>
    </div>
  );
};
