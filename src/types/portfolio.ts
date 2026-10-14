export type SectionId = 'home' | 'skills' | 'projects' | 'hackathons' | 'contact';

export interface ProjectItem {
  id: string;
  title: string;
  systemTag: string; // e.g., "SYSTEM // SHIPPED"
  tags: string[];
  description: string;
  sourceUrl?: string; // Only show source code button if present
  liveUrl?: string;   // Only show live deploy button if present
  buildingColor: string;
  roofColor: string;
  slotPosition: [number, number, number];
}

export type HackathonBadge = 'Internal finals' | 'Pitched' | 'Participant';

export interface HackathonItem {
  id: string;
  name: string;
  role?: string;
  result: string;
  badge: HackathonBadge;
  team?: string;
  location?: string;
  whatWasBuilt?: string;
  description: string;
  podiumHeight: number; // Taller only for SIH internal finals
  slotPosition: [number, number, number];
}

export type SkillCategory = 'backend' | 'blockchain' | 'frontend' | 'tools' | 'dsa';

export interface SkillGroup {
  id: SkillCategory;
  name: string;
  color: string;
  skills: string[];
  description: string;
  slotPosition: [number, number, number];
}

export interface EducationItem {
  institution: string;
  degree: string;
  period: string;
  score?: string;
  location: string;
}

export interface PortfolioData {
  personal: {
    name: string;
    headline: string;
    tagline: string;
    bio: string;
    email: string;
    github: string;
    linkedin: string;
    leetcode: string;
    resumeUrl: string;
    location: string;
  };
  education: EducationItem[];
  leadership: string[];
  projects: ProjectItem[];
  hackathons: HackathonItem[];
  skillGroups: SkillGroup[];
}
