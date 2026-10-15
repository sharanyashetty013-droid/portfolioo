import React from 'react';
import { X, Mail, MapPin, Phone } from 'lucide-react';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1B2D]/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#FFF8E7] rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col border-2 border-[#0B1B2D] shadow-[8px_8px_0_#0B1B2D] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b-2 border-[#0B1B2D] bg-[#FFF3D6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-[#0B1B2D] text-lg sm:text-[20px]">Curriculum Vitae</h3>
            <span className="text-xs sm:text-[14px] text-[#64748B] font-semibold font-sans">• 1-Page Document</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Body */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6 sm:space-y-[26px] text-[#334155] font-sans text-sm sm:text-base">
          {/* Resume Header */}
          <div className="border-b-2 border-[#0B1B2D]/20 pb-5">
            <h1 className="font-heading text-2xl sm:text-[34px] font-bold text-[#0B1B2D] tracking-tight leading-tight">
              SHARANYA L SHETTY
            </h1>
            <p className="text-xs sm:text-[15px] text-[#475569] font-semibold mt-1 leading-normal font-sans">
              B.Tech, Computer Science Engineering (2nd Year) • NMAM Institute of Technology, Nitte
            </p>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs sm:text-[14px] text-[#475569] mt-3 font-sans font-semibold">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0F766E]" />
                <a href="tel:8762483622" className="text-[#0F766E] hover:underline">
                  8762483622
                </a>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0F766E]" />
                <a href="mailto:sharanyashetty013@gmail.com" className="text-[#0F766E] hover:underline">
                  sharanyashetty013@gmail.com
                </a>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#64748B]" />
                <span>Karkala, Udupi, Karnataka</span>
              </span>
            </div>
          </div>

          {/* 1. Profile */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              PROFILE
            </h2>
            <p className="text-[#334155] leading-[1.65] font-medium">
              Second-year CSE student with a focus on Backend and Blockchain (Solidity). Core member of campus communities, coordinating logistics and documentation for club activities while building technical skills through certifications, hackathons and internships. Comfortable presenting to groups, organizing people around a shared goal, and picking up new tools quickly.
            </p>
          </section>

          {/* 2. Education */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              EDUCATION
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-baseline text-sm sm:text-base font-bold text-[#0B1B2D]">
                  <span>NMAM Institute of Technology, Nitte</span>
                  <span className="text-xs sm:text-sm text-[#64748B] font-semibold shrink-0 ml-4">2025 – 2029</span>
                </div>
                <div className="text-xs sm:text-sm text-[#475569] italic mt-0.5 font-medium">
                  B.Tech, Computer Science Engineering • <span className="font-bold text-[#0B1B2D] not-italic">CGPA 9.36 (1st Year)</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-baseline text-sm sm:text-base font-bold text-[#0B1B2D]">
                  <span>Creative PU College, Karkala, Udupi</span>
                  <span className="text-xs sm:text-sm text-[#64748B] font-semibold shrink-0 ml-4">2023 – 2025</span>
                </div>
                <div className="text-xs sm:text-sm text-[#475569] italic mt-0.5 font-medium">
                  Pre-University Course, Science • <span className="font-bold text-[#0B1B2D] not-italic">95% in Board Examinations</span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Campus Involvement */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              CAMPUS INVOLVEMENT
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm leading-[1.65] text-[#334155] font-medium">
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Active coordination of campus technical events, registrations, and data tracking workflows</span>
              </li>
            </ul>
          </section>

          {/* 4. Experience */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              EXPERIENCE
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm leading-[1.65] text-[#334155] font-medium">
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Completed two off-campus internships and one campus internship</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Participated in multiple ideathons and datathons as part of cross-functional teams</span>
              </li>
            </ul>
          </section>

          {/* 5. Certifications */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              CERTIFICATIONS
            </h2>
            <ul className="space-y-1.5 text-xs sm:text-sm leading-[1.65] text-[#334155] font-medium">
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Google Certification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Microsoft Certification</span>
              </li>
            </ul>
          </section>

          {/* 6. Achievements & Awards */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              ACHIEVEMENTS & AWARDS
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm leading-[1.65] text-[#334155] font-medium">
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Best Student Award</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Best Librarian Award, 12th Grade</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Secured 95% in 12th Board Examinations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0B1B2D] font-bold">•</span>
                <span>Recognition and prizes across club and off-campus activities</span>
              </li>
            </ul>
          </section>

          {/* 7. Core Skills */}
          <section>
            <h2 className="font-heading text-sm sm:text-[15px] font-bold text-[#0F766E] uppercase tracking-wider mb-2 border-b-2 border-[#0B1B2D]/15 pb-1">
              CORE SKILLS
            </h2>
            <p className="text-[#334155] leading-[1.65] font-medium">
              Communication & Public Speaking • Backend • DSA • Blockchain and Solidity • Go, Docker • Tailwind CSS • API and Next.js
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
