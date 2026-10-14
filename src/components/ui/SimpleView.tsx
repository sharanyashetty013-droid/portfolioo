import React from 'react';
import { portfolioData } from '../../data/portfolioData';
import { ProjectItem, HackathonItem, SkillGroup } from '../../types/portfolio';
import { 
  Github, 
  ExternalLink, 
  Trophy, 
  FileText, 
  Mail, 
  Linkedin,
  Code2,
  ArrowUpRight,
  GraduationCap,
  Sparkles,
  Users
} from 'lucide-react';

interface SimpleViewProps {
  onSelectProject: (p: ProjectItem) => void;
  onSelectHackathon: (h: HackathonItem) => void;
  onSelectSkillGroup: (g: SkillGroup) => void;
  onOpenResume: () => void;
  onOpenContact: () => void;
}

export const SimpleView: React.FC<SimpleViewProps> = ({
  onSelectProject,
  onSelectHackathon,
  onSelectSkillGroup,
  onOpenResume,
  onOpenContact,
}) => {
  const { personal, education, leadership, projects, hackathons, skillGroups } = portfolioData;

  return (
    <div className="min-h-screen bg-sky-50/50 pt-20 pb-24 text-[#334155] font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
        {/* HERO SECTION */}
        <section id="simple-home" className="pt-8 pb-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#0B1B2D] bg-[#FFF8E7] border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#1AA6A6]" />
            <span>Accessible Standard View</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0B1B2D] tracking-tight">
            {personal.name}
          </h1>
          <p className="text-base sm:text-lg font-semibold text-[#64748B] mt-2">
            {personal.headline}
          </p>



          <p className="mt-3 text-sm sm:text-base text-[#334155] font-medium leading-relaxed max-w-3xl">
            {personal.bio}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#simple-projects"
              className="btn-chunky-teal px-4 py-2 text-xs rounded-xl"
            >
              See my work
            </a>
            <button
              onClick={onOpenContact}
              className="btn-chunky-light px-4 py-2 text-xs rounded-xl"
            >
              Say hi
            </button>
            <button
              onClick={onOpenResume}
              className="btn-chunky-light px-4 py-2 text-xs rounded-xl inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#1AA6A6]" />
              <span>View Resume</span>
            </button>
          </div>
        </section>

        {/* PROJECTS SECTION */}
        <section id="simple-projects" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-8 pb-3 border-b-2 border-[#0B1B2D]/20">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#0B1B2D] tracking-tight">Projects</h2>
              <p className="text-xs text-[#64748B] font-semibold mt-0.5">Real systems, forensics tools, and prototypes</p>
            </div>
            <span className="text-xs font-bold text-[#64748B] bg-white border border-[#0B1B2D] px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_#0B1B2D]">{projects.length} Works</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="group bg-[#FFF8E7] rounded-2xl p-6 border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#0B1B2D] transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="text-[11px] text-[#0F766E] bg-white px-2 py-0.5 rounded border border-[#0B1B2D] font-bold shadow-[1px_1px_0_#0B1B2D]">{project.systemTag}</span>
                    <div className="flex gap-1">
                      {project.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-white text-[#0B1B2D] font-bold px-1.5 py-0.5 rounded border border-[#0B1B2D] shadow-[1px_1px_0_#0B1B2D]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-[#0B1B2D] group-hover:text-[#0F766E] transition-colors flex items-center gap-1.5">
                    <span>{project.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#1AA6A6]" />
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-[#334155] font-medium leading-relaxed">
                    {project.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#0B1B2D]/15 flex items-center gap-3">
                  {project.sourceUrl && (
                    <a
                      href={project.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Source code</span>
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn-chunky-teal text-xs px-2.5 py-1 rounded-md flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Live deploy</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HACKATHONS SECTION */}
        <section id="simple-hackathons" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-8 pb-3 border-b-2 border-[#0B1B2D]/20">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#0B1B2D] tracking-tight">Hackathons & Sprints</h2>
              <p className="text-xs text-[#64748B] font-semibold mt-0.5">Competitions and buildathons</p>
            </div>
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hackathons.map((h) => (
              <div
                key={h.id}
                onClick={() => onSelectHackathon(h)}
                className="bg-[#FFF8E7] rounded-2xl p-6 border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#0B1B2D] transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white text-[#0B1B2D] border border-[#0B1B2D] shadow-[1px_1px_0_#0B1B2D]">
                      {h.badge}
                    </span>
                    {h.location && <span className="text-[11px] text-[#64748B] font-semibold truncate max-w-[130px]">{h.location}</span>}
                  </div>
                  <h3 className="font-heading text-base font-bold text-[#0B1B2D]">
                    {h.name}
                  </h3>
                  <div className="mt-2.5 bg-white p-2.5 rounded-xl border border-[#0B1B2D] text-xs shadow-[2px_2px_0_#0B1B2D]">
                    {h.whatWasBuilt && (
                      <span className="font-bold text-[#0B1B2D] block text-[11px] mb-0.5">
                        Built: {h.whatWasBuilt}
                      </span>
                    )}
                    <span className="text-[11px] text-[#64748B] font-semibold">{h.result}</span>
                  </div>
                  <p className="mt-3 text-xs text-[#334155] font-medium leading-relaxed">
                    {h.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SKILLS SECTION */}
        <section id="simple-skills" className="scroll-mt-24">
          <div className="mb-6 pb-3 border-b-2 border-[#0B1B2D]/20">
            <h2 className="font-heading text-2xl font-bold text-[#0B1B2D] tracking-tight">Technical Skills</h2>
            <p className="text-xs text-[#64748B] font-semibold mt-0.5">5 core engineering disciplines</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {skillGroups.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectSkillGroup(g)}
                className="bg-[#FFF8E7] rounded-2xl p-6 border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#0B1B2D] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-[#0B1B2D]" style={{ backgroundColor: g.color }} />
                  <h3 className="font-heading font-bold text-[#0B1B2D] text-lg">{g.name}</h3>
                </div>
                <p className="text-xs text-[#334155] font-medium mb-4 leading-relaxed">
                  {g.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.skills.map((s) => (
                    <span key={s} className="bg-white text-[#0B1B2D] text-xs font-bold px-2.5 py-1 rounded-lg border border-[#0B1B2D] shadow-[1.5px_1.5px_0_#0B1B2D]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EDUCATION & CLUBS SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="bg-[#FFF8E7] rounded-2xl p-6 border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D]">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-[#0B1B2D]/15">
              <GraduationCap className="w-5 h-5 text-[#1AA6A6]" />
              <h3 className="font-heading font-bold text-[#0B1B2D] text-lg">Education</h3>
            </div>
            <div className="space-y-4">
              {education.map((e) => (
                <div key={e.institution} className="text-xs sm:text-sm">
                  <div className="font-bold text-[#0B1B2D]">{e.institution}</div>
                  <div className="text-[#334155] font-medium">{e.degree}</div>
                  {e.score && <div className="text-[#0F766E] font-bold mt-0.5">{e.score}</div>}
                  <div className="text-[#64748B] text-xs font-semibold">{e.period} • {e.location}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FFF8E7] rounded-2xl p-6 border-2 border-[#0B1B2D] shadow-[4px_4px_0_#0B1B2D]">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-[#0B1B2D]/15">
              <Users className="w-5 h-5 text-[#1AA6A6]" />
              <h3 className="font-heading font-bold text-[#0B1B2D] text-lg">Leadership & Campus Involvement</h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-[#334155] font-medium">
              {leadership.map((lead, idx) => (
                <li key={`lead-${idx}`} className="flex items-start gap-2">
                  <span className="text-[#0B1B2D] font-bold">•</span>
                  <span>{lead}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="simple-contact" className="scroll-mt-24 bg-[#FFF8E7] rounded-3xl p-8 border-2 border-[#0B1B2D] shadow-[6px_6px_0_#0B1B2D]">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#0B1B2D] tracking-tight">Connect with Sharanya</h2>
            <p className="mt-2 text-sm text-[#475569] font-medium">
              Reach out for backend systems, blockchain engineering, and student collaborations.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`mailto:${personal.email}`}
                className="btn-chunky-teal inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl"
              >
                <Mail className="w-4 h-4" />
                <span>{personal.email}</span>
              </a>
              <a
                href={personal.github}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chunky-light inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href={personal.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chunky-light inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn</span>
              </a>
              <a
                href={personal.leetcode}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chunky-light inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl"
              >
                <Code2 className="w-4 h-4" />
                <span>LeetCode</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
