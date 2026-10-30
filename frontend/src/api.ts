import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  FitEvaluation,
  ApplicationDraft,
  LLMSettings,
  CompanyDirectoryItem,
  RoleRecommendation,
  GeneratedATSQuery
} from './types';

const API_BASE = '/api';

export const api = {
  // Profile
  getProfile: async (): Promise<CandidateProfile> => {
    const res = await fetch(`${API_BASE}/profile`);
    return res.json();
  },
  updateProfile: async (profile: CandidateProfile): Promise<CandidateProfile> => {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return res.json();
  },
  uploadCV: async (file: File): Promise<{ message: string; profile: CandidateProfile }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/profile/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al procesar el CV');
    }
    return res.json();
  },

  // Preferences
  getPreferences: async (): Promise<UserPreferences> => {
    const res = await fetch(`${API_BASE}/preferences`);
    return res.json();
  },
  updatePreferences: async (prefs: UserPreferences): Promise<UserPreferences> => {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    return res.json();
  },
  sendFeedback: async (job_id: string, action: 'like' | 'dislike' | 'apply' | 'reject', notes?: string) => {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id, action, notes })
    });
    return res.json();
  },

  // Jobs
  getJobs: async (status?: string): Promise<JobPosting[]> => {
    const url = status ? `${API_BASE}/jobs?status=${status}` : `${API_BASE}/jobs`;
    const res = await fetch(url);
    return res.json();
  },
  trackJob: async (job_id: string): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/track`, {
      method: 'POST'
    });
    return res.json();
  },
  updateJob: async (job_id: string, data: Partial<JobPosting>): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  classifyJob: async (job_id: string, data: { status: string; reason?: string; feedback?: string }): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  addJobHistory: async (job_id: string, data: { event_type: string; title: string; date?: string; notes?: string }): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteJobHistory: async (job_id: string, event_id: string): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/history/${event_id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  deleteJob: async (job_id: string, from_section: 'radar' | 'tracker' = 'radar'): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}?from_section=${from_section}`, { method: 'DELETE' });
    return res.json();
  },
  clearAllJobs: async (): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs`, { method: 'DELETE' });
    return res.json();
  },
  updateJobStatus: async (job_id: string, status: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  submitOutcome: async (submission: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/jobs/${submission.job_id}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    return res.json();
  },
  scrapeJobs: async (keywords?: string, remote_only: boolean = true, scope: string = 'global') => {
    const params = new URLSearchParams();
    params.set('remote_only', String(remote_only));
    params.set('scope', scope);
    if (keywords) params.set('keywords', keywords);
    const res = await fetch(`${API_BASE}/jobs/scrape?${params.toString()}`, {
      method: 'POST'
    });
    return res.json();
  },
  importJobUrl: async (url: string): Promise<{ message: string; job: JobPosting }> => {
    const res = await fetch(`${API_BASE}/jobs/import-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al importar la URL');
    }
    return res.json();
  },
  evaluateJob: async (job_id: string): Promise<FitEvaluation> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/evaluate`, {
      method: 'POST'
    });
    return res.json();
  },
  batchRank: async () => {
    const res = await fetch(`${API_BASE}/jobs/batch-rank`, {
      method: 'POST'
    });
    return res.json();
  },

  // ATS Companies & Dynamic Role Recommendations (Radar Inteligente)
  getCompanies: async (country?: string, industry?: string): Promise<CompanyDirectoryItem[]> => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (industry) params.set('industry', industry);
    const res = await fetch(`${API_BASE}/companies?${params.toString()}`);
    return res.json();
  },
  getRoleRecommendations: async (forceRefresh: boolean = false): Promise<RoleRecommendation[]> => {
    const res = await fetch(`${API_BASE}/roles/recommendations?force_refresh=${forceRefresh}`);
    return res.json();
  },
  updateRoleRecStatus: async (recId: string, approved: boolean): Promise<RoleRecommendation> => {
    const res = await fetch(`${API_BASE}/roles/recommendations/${recId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved })
    });
    return res.json();
  },
  getATSQueries: async (): Promise<GeneratedATSQuery[]> => {
    const res = await fetch(`${API_BASE}/roles/ats-queries`);
    return res.json();
  },
  scrapeCustomATSQuery: async (query: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/jobs/scrape-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Applications
  applyJob: async (job_id: string): Promise<ApplicationDraft> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/apply`, {
      method: 'POST'
    });
    return res.json();
  },
  getApplications: async (): Promise<ApplicationDraft[]> => {
    const res = await fetch(`${API_BASE}/applications`);
    return res.json();
  },
  getApplicationByJob: async (job_id: string): Promise<ApplicationDraft | null> => {
    const res = await fetch(`${API_BASE}/applications/${job_id}`);
    if (res.status === 404) return null;
    return res.json();
  },
  deleteApplication: async (job_id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/applications/${job_id}`, { method: 'DELETE' });
    return res.json();
  },

  // Interview
  getInterviewPrep: async (job_id: string) => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/interview-prep`, {
      method: 'POST'
    });
    return res.json();
  },
  evaluateInterviewAnswer: async (question: string, answer: string) => {
    const res = await fetch(`${API_BASE}/interview/evaluate-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer })
    });
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<LLMSettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  updateSettings: async (payload: { provider: string; api_key?: string; model_name?: string }) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
