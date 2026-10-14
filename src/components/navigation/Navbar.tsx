import React from 'react';
import { FileText, Github, Mail } from 'lucide-react';

interface NavbarProps {
  onOpenResume: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenResume }) => {
  return (
    <header id="top-navbar" className="fixed top-0 left-0 right-0 z-40 pointer-events-none p-2.5 sm:p-5 pt-safe pr-safe pl-safe">
      <div className="max-w-7xl mx-auto flex items-center justify-end">
        {/* Top-Right Handcrafted Actions in solid cream with dark navy border & shadow */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] rounded-full px-2 py-1 sm:px-3 sm:py-1.5">
          {/* GitHub Quick Link */}
          <a
            href="https://github.com/sharanyashetty013-droid"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D]"
            title="GitHub: @sharanyashetty013-droid"
          >
            <Github className="w-3.5 h-3.5" />
          </a>

          {/* Email Quick Link */}
          <a
            href="mailto:sharanyashetty013@gmail.com"
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D]"
            title="Email: sharanyashetty013@gmail.com"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>

          {/* View CV Document Button */}
          <button
            onClick={onOpenResume}
            className="flex items-center gap-1.5 px-3 py-1 sm:py-1.5 text-xs font-bold text-white bg-[#1AA6A6] hover:bg-[#158F8F] border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] rounded-full transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0B1B2D] cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            title="View Full Curriculum Vitae"
          >
            <FileText className="w-3.5 h-3.5 text-white" />
            <span className="font-sans">View CV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
