import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  FitEvaluation,
  ApplicationDraft,
  LLMSettings
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
  deleteJob: async (job_id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}`, { method: 'DELETE' });
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
  scrapeJobs: async (keywords?: string, remote_only: boolean = true) => {
    const res = await fetch(`${API_BASE}/jobs/scrape?remote_only=${remote_only}${keywords ? `&keywords=${encodeURIComponent(keywords)}` : ''}`, {
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
