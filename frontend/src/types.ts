export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  start_date: string;
  end_date?: string;
  location?: string;
  is_remote: boolean;
  description: string;
  technologies: string[];
  bullet_achievements: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year?: string;
}

export interface CandidateProfile {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  headline?: string;
  summary?: string;
  years_of_experience: number;
  technical_skills: string[];
  soft_skills: string[];
  languages: Record<string, string>;
  experiences: WorkExperience[];
  education: EducationItem[];
  certifications: string[];
  raw_cv_text?: string;
  updated_at?: string;
}

export interface UserPreferences {
  target_roles: string[];
  preferred_locations: string[];
  remote_only: boolean;
  min_salary_usd?: number;
  preferred_technologies: string[];
  deal_breakers: string[];
  auto_learned_insights: string[];
  updated_at?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  is_remote: boolean;
  salary_range?: string;
  description: string;
  url?: string;
  source: string;
  tags: string[];
  posted_at?: string;
  discovered_at: string;
  fit_score?: number;
  status: 'discovered' | 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived';
  notes?: string;
  outcome?: string;
  outcome_notes?: string;
  outcome_success?: boolean;
  applied_date?: string;
  contact_email?: string;
  upskill_recommendations?: string[];
}

export interface OutcomeSubmission {
  job_id: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected';
  was_successful: boolean;
  reason?: string;
  feedback_details?: string;
}

export interface StudyTopic {
  topic: string;
  description: string;
  suggested_resources: string;
  estimated_time: string;
}

export interface UpskillPlan {
  job_title: string;
  company: string;
  was_successful: boolean;
  strategy_adjustment: string;
  skill_gaps: string[];
  study_plan: StudyTopic[];
  recommended_certifications: string[];
  actionable_next_steps: string[];
}

export interface FitDimensionScore {
  dimension: string;
  score: number;
  reasoning: string;
}

export interface FitEvaluation {
  job_id: string;
  overall_score: number;
  verdict: string;
  dimension_scores: FitDimensionScore[];
  strengths: string[];
  missing_skills: string[];
  deal_breakers_found: string[];
  recommendation_summary: string;
}

export interface ApplicationDraft {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  tailored_cv_markdown: string;
  tailored_cv_html?: string;
  cover_letter: string;
  ats_score: number;
  ats_feedback: string[];
  reviewer_critique?: string;
  created_at: string;
}

export interface LLMSettings {
  provider: 'gemini' | 'openai' | 'claude';
  has_active_key: boolean;
  active_model_name: string;
  status_label: string;
  status_color: 'green' | 'yellow';
  has_gemini_key: boolean;
  has_openai_key: boolean;
  has_claude_key: boolean;
  gemini_model: string;
  openai_model: string;
  claude_model: string;
}
