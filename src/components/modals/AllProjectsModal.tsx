import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { ProjectItem } from '../../types/portfolio';
import { portfolioData } from '../../data/portfolioData';

interface AllProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectItem) => void;
}

/** Every project in one place, with filter chips. Featured ones are also on the island. */
export const AllProjectsModal: React.FC<AllProjectsModalProps> = ({ isOpen, onClose, onSelectProject }) => {
  const { projects } = portfolioData;
  const [filter, setFilter] = useState('All');

  // chips come from the categories actually used, in a stable order
  const chips = useMemo(() => {
    const order = ['Backend', 'Blockchain', 'Open Source', 'Hackathon', 'AI', 'Web & Games', 'DSA'];
    const used = new Set(projects.flatMap((p) => p.categories));
    return ['All', ...order.filter((c) => used.has(c)), ...[...used].filter((c) => !order.includes(c))];
  }, [projects]);

  const shown = filter === 'All' ? projects : projects.filter((p) => p.categories.includes(filter));

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1B2D]/40 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
      <div
        className="all-panel modal-3d-in bg-[#FFF8E7] rounded-2xl max-w-3xl w-full max-h-[90dvh] overflow-hidden border-2 border-[#0B1B2D] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="All projects"
      >
        <div className="p-5 sm:p-7 pb-3 sm:pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-[#0B1B2D] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="all-title pr-10">Projects</h2>
          <p className="all-sub">
            {projects.length} builds and open-source contributions. Featured ones also stand on the island.
          </p>
          <div className="all-tabs" role="tablist" aria-label="Filter projects">
            {chips.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={filter === c}
                onClick={() => setFilter(c)}
                className={`all-tab ${filter === c ? 'is-on' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <ul className="all-list overflow-y-auto min-h-0 flex-1 px-5 sm:px-7 pb-4">
          {shown.map((p) => (
            <li key={p.id} className="all-row">
              <button className="all-row-main" onClick={() => onSelectProject(p)}>
                <span className="all-row-head">
                  <span className="all-row-title">{p.title}</span>
                  {p.featured && <span className="all-row-feat">Featured</span>}
                </span>
                <span className="all-row-desc">{p.description}</span>
                <span className="all-row-meta">{p.tags.slice(0, 3).join(', ')}</span>
              </button>
              <span className="all-row-links">
                {p.sourceUrl && (
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {p.sourceLabel ?? 'Code'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
                {p.liveUrl && (
                  <a href={p.liveUrl} target="_blank" rel="noopener noreferrer">
                    Live <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
