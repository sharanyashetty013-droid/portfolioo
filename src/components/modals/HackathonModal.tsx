import React from 'react';
import { HackathonItem } from '../../types/portfolio';
import { X, MapPin, Users } from 'lucide-react';

interface HackathonModalProps {
  hackathon: HackathonItem | null;
  onClose: () => void;
}

export const HackathonModal: React.FC<HackathonModalProps> = ({ hackathon, onClose }) => {
  if (!hackathon) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1B2D]/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#FFF8E7] rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto border-2 border-[#0B1B2D] shadow-[6px_6px_0_#0B1B2D] p-5 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold mb-1">
          <span className="px-2.5 py-0.5 rounded-md bg-white text-[#0B1B2D] border border-[#0B1B2D] shadow-[1.5px_1.5px_0_#0B1B2D] font-sans">
            {hackathon.badge}
          </span>
          {hackathon.location && (
            <>
              <span className="text-[#0B1B2D]/40">•</span>
              <span className="text-[#64748B] font-semibold flex items-center gap-1 font-sans">
                <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>{hackathon.location}</span>
              </span>
            </>
          )}
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#0B1B2D] tracking-tight pr-6 mt-1.5 leading-snug">
          {hackathon.name}
        </h2>

        {(hackathon.role || hackathon.team) && (
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#475569] font-semibold mt-2 font-sans">
            {hackathon.role && (
              <span className="text-[#0F766E] font-bold">Role: {hackathon.role}</span>
            )}
            {hackathon.team && (
              <span className="flex items-center gap-1 text-[#475569]">
                <Users className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Team: {hackathon.team}</span>
              </span>
            )}
          </div>
        )}

        <div className="mt-5 space-y-4 text-[#334155] font-sans text-sm sm:text-base leading-relaxed border-t-2 border-[#0B1B2D]/20 pt-4">
          <div className="bg-white border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] rounded-xl p-4">
            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1 font-sans">
              Result
            </h4>
            <p className="text-[#0B1B2D] font-bold text-base font-sans">
              {hackathon.result}
            </p>
          </div>

          {hackathon.whatWasBuilt && (
            <div>
              <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1 font-sans">
                Built Project
              </h4>
              <p className="text-[#0B1B2D] font-bold font-sans">{hackathon.whatWasBuilt}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1 font-sans">
              Details
            </h4>
            <p className="text-[#334155] text-xs sm:text-sm font-medium leading-relaxed font-sans">{hackathon.description}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t-2 border-[#0B1B2D]/20 flex justify-end">
          <button
            onClick={onClose}
            className="btn-chunky-teal px-5 py-2 text-xs font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
