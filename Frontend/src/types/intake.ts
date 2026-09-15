export type SeniorityLevel = "Intern" | "Junior" | "Mid" | "Senior";

export type ResumeStatus = "uploaded" | "parsing" | "parsed" | "failed";

export interface ResumeRecord {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: ResumeStatus;
  parsed_text?: string | null;
  parsing_error?: string | null;
  parsed_at?: string | null;
  word_count?: number;
  created_at: string;
}

export interface ParseResumeResponse {
  id: string;
  status: "parsed" | "failed";
  original_filename: string;
  word_count: number;
  parsed_at: string;
  parsing_error?: string | null;
}

export interface JobDescriptionRecord {
  id: string;
  user_id: string;
  role_title: string;
  company_name: string | null;
  seniority: SeniorityLevel;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface JobDescriptionFormData {
  role_title: string;
  company_name: string;
  seniority: SeniorityLevel;
  description: string;
}

export type IntakeStep = 1 | 2 | 3;

export type AnalysisStatus = "analyzing" | "ready" | "failed";

export interface SkillsGroup {
  programming_languages: string[];
  frameworks_tools: string[];
  databases_cloud: string[];
  other: string[];
}

export interface ExperienceItem {
  company: string;
  role: string;
  dates?: string | null;
  highlights: string[];
}

export interface EducationItem {
  institution: string;
  degree?: string | null;
  dates?: string | null;
  highlights: string[];
}

export interface ProjectItem {
  name: string;
  technologies: string[];
  highlights: string[];
}

export interface CandidateProfile {
  summary?: string | null;
  skills: SkillsGroup;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
}

export interface ResumeAnalysisRecord {
  id: string;
  resume_id: string;
  user_id: string;
  status: AnalysisStatus;
  summary?: string | null;
  skills: SkillsGroup;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  error?: string | null;
  analysis_version: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeAnalysisResponse {
  id: string;
  resume_id: string;
  status: AnalysisStatus;
  profile?: CandidateProfile | null;
  error?: string | null;
  analysis_version: number;
  created_at: string;
  updated_at: string;
}
