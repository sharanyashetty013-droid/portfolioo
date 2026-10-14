import React from 'react';
import { SkillGroup } from '../../types/portfolio';
import { X } from 'lucide-react';

interface SkillModalProps {
  skillGroup: SkillGroup | null;
  onClose: () => void;
}

export const SkillModal: React.FC<SkillModalProps> = ({ skillGroup, onClose }) => {
  if (!skillGroup) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1B2D]/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#FFF8E7] rounded-2xl max-w-md w-full border-2 border-[#0B1B2D] shadow-[6px_6px_0_#0B1B2D] p-5 sm:p-6 relative max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span 
            className="w-3.5 h-3.5 rounded-full border border-[#0B1B2D]" 
            style={{ backgroundColor: skillGroup.color }} 
          />
          <span className="text-xs uppercase font-bold text-[#0F766E] tracking-wider font-sans">
            Discipline
          </span>
        </div>

        <h3 className="font-heading text-2xl font-bold text-[#0B1B2D] tracking-tight">
          {skillGroup.name}
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-[#334155] leading-relaxed font-sans font-medium">
          {skillGroup.description}
        </p>

        <div className="mt-5 pt-3 border-t-2 border-[#0B1B2D]/20">
          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5 font-sans">
            Technologies & Tools
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {skillGroup.skills.map((skill) => (
              <span
                key={skill}
                className="bg-white text-[#0B1B2D] border border-[#0B1B2D] shadow-[1.5px_1.5px_0_#0B1B2D] px-3 py-1 rounded-md text-xs font-bold font-sans"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-3 border-t-2 border-[#0B1B2D]/20 flex justify-end">
          <button
            onClick={onClose}
            className="btn-chunky-teal px-5 py-2 text-xs font-bold rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
