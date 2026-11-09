import React from 'react';
import { FileText, Github, Mail, Sun, Sunset, Moon } from 'lucide-react';
import type { TimeOfDay } from '../scene/timeOfDay';

const TIME_META: Record<TimeOfDay, { icon: typeof Sun; label: string; next: string }> = {
  day: { icon: Sun, label: 'Daytime', next: 'sunset' },
  sunset: { icon: Sunset, label: 'Sunset', next: 'night' },
  night: { icon: Moon, label: 'Night', next: 'day' },
};

interface NavbarProps {
  onOpenResume: () => void;
  timeOfDay?: TimeOfDay;
  onCycleTime?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenResume, timeOfDay = 'day', onCycleTime }) => {
  const meta = TIME_META[timeOfDay];
  const TimeIcon = meta.icon;
  return (
    <header id="top-navbar" className="fixed top-0 left-0 right-0 z-40 pointer-events-none p-2.5 sm:p-5 pt-safe pr-safe pl-safe">
      <div className="max-w-7xl mx-auto flex items-center justify-end">
        {/* Top-Right Handcrafted Actions in solid cream with dark navy border & shadow */}
        <div className="relative pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 glass glass-pill px-2 py-1 sm:px-3 sm:py-1.5">
          {/* Time of day toggle: day -> sunset -> night */}
          {onCycleTime && (
            <button
              onClick={onCycleTime}
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full btn-glass !rounded-full text-[#B45309]"
              title={`${meta.label}: switch to ${meta.next}`}
              aria-label={`Time of day: ${meta.label}. Switch to ${meta.next}`}
            >
              <TimeIcon key={timeOfDay} className="w-3.5 h-3.5 time-icon-pop" />
            </button>
          )}

          {/* GitHub Quick Link */}
          <a
            href="https://github.com/sharanyashetty013-droid"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full btn-glass !rounded-full text-[#0B1B2D]"
            title="GitHub: @sharanyashetty013-droid"
          >
            <Github className="w-3.5 h-3.5" />
          </a>

          {/* Email Quick Link */}
          <a
            href="mailto:sharanyashetty013@gmail.com"
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full btn-glass !rounded-full text-[#0B1B2D]"
            title="Email: sharanyashetty013@gmail.com"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>

          {/* View CV Document Button */}
          <button
            onClick={onOpenResume}
            className="flex items-center gap-1.5 px-3 py-1 sm:py-1.5 btn-glow !rounded-full text-xs"
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
