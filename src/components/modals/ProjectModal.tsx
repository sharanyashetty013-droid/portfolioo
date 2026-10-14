import React from 'react';
import { ProjectItem } from '../../types/portfolio';
import { X, ExternalLink, Github } from 'lucide-react';

interface ProjectModalProps {
  project: ProjectItem | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1B2D]/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#FFF8E7] rounded-2xl max-w-xl w-full max-h-[90dvh] overflow-y-auto border-2 border-[#0B1B2D] shadow-[6px_6px_0_#0B1B2D] p-5 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pr-8 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white text-[#0F766E] border border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] font-sans text-[11px] font-bold mb-2.5">
            <span>{project.systemTag}</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#0B1B2D] tracking-tight leading-snug">
            {project.title}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="bg-white text-[#0B1B2D] border border-[#0B1B2D] px-2 py-0.5 rounded-md text-[11px] font-bold shadow-[1.5px_1.5px_0_#0B1B2D]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-[#334155] font-sans text-sm sm:text-base leading-relaxed border-t-2 border-[#0B1B2D]/20 pt-4">
          <p>{project.description}</p>
        </div>

        {/* Actions */}
        <div className="mt-6 sm:mt-8 pt-4 border-t-2 border-[#0B1B2D]/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {project.sourceUrl && (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chunky-light inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl"
              >
                <Github className="w-4 h-4" />
                <span>Source code</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chunky-teal inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Live deploy</span>
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#0B1B2D] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
