import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { JobRadar } from './components/JobRadar';
import { PipelineTracker } from './components/PipelineTracker';
import { ProfileStudio } from './components/ProfileStudio';
import { ApplicationStudio } from './components/ApplicationStudio';
import { PreferencesCenter } from './components/PreferencesCenter';
import { InterviewPrep } from './components/InterviewPrep';
import { SettingsModal } from './components/SettingsModal';
import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft,
  LLMSettings
} from './types';
import { api } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('radar');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Core state
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<ApplicationDraft[]>([]);
  const [settings, setSettings] = useState<LLMSettings>({
    provider: 'gemini',
    has_gemini_key: false,
    has_openai_key: false,
    has_claude_key: false,
    gemini_model: 'gemini-2.5-flash',
    openai_model: 'gpt-4o',
    claude_model: 'claude-3-5-sonnet-20241022'
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initial load
  const loadData = async () => {
    try {
      const [p, prefs, j, apps, s] = await Promise.all([
        api.getProfile(),
        api.getPreferences(),
        api.getJobs(),
        api.getApplications(),
        api.getSettings()
      ]);
      setProfile(p);
      setPreferences(prefs);
      setJobs(j);
      setApplications(apps);
      setSettings(s);
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyToJob = async (job: JobPosting) => {
    try {
      setActiveTab('applications');
      const draft = await api.applyJob(job.id);
      setApplications(prev => [draft, ...prev.filter(a => a.job_id !== job.id)]);
      const updatedJobs = await api.getJobs();
      setJobs(updatedJobs);
    } catch (e) {
      alert('Error al adaptar CV: ' + e);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-300">
      
      {/* Apple Frosted Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        openSettings={() => setIsSettingsOpen(true)}
        llmSettings={settings}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-xs text-gray-400">Iniciando Agente Autónomo NexusJob AI...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'radar' && (
              <JobRadar
                jobs={jobs}
                profile={profile}
                onRefresh={async () => {
                  const updated = await api.getJobs();
                  setJobs(updated);
                  const updatedPrefs = await api.getPreferences();
                  setPreferences(updatedPrefs);
                }}
                onApply={handleApplyToJob}
                onNavigateToTracker={() => setActiveTab('tracker')}
              />
            )}

            {activeTab === 'tracker' && (
              <PipelineTracker
                jobs={jobs}
                applications={applications}
                profile={profile}
                onRefresh={async () => {
                  const updated = await api.getJobs();
                  setJobs(updated);
                  const updatedPrefs = await api.getPreferences();
                  setPreferences(updatedPrefs);
                }}
                onApply={handleApplyToJob}
              />
            )}

            {activeTab === 'profile' && profile && (
              <ProfileStudio
                profile={profile}
                onProfileUpdated={(p) => setProfile(p)}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationStudio applications={applications} />
            )}

            {activeTab === 'interview' && (
              <InterviewPrep jobs={jobs} />
            )}

            {activeTab === 'preferences' && preferences && (
              <PreferencesCenter
                preferences={preferences}
                onPreferencesUpdated={(p) => setPreferences(p)}
              />
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsUpdated={(s) => setSettings(s)}
      />

    </div>
  );
}

export default App;
