import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { JobRadar } from './components/JobRadar';
import { PipelineTracker } from './components/PipelineTracker';
import { ProfileStudio } from './components/ProfileStudio';
import { ApplicationStudio } from './components/ApplicationStudio';
import { PreferencesCenter } from './components/PreferencesCenter';
import { SettingsModal } from './components/SettingsModal';
import { useToast } from './components/Toast';
import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft,
  LLMSettings
} from './types';
import { api } from './api';

// Error Boundary to prevent any unhandled render errors from causing a black screen
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('UI Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center max-w-md mx-auto my-12 rounded-3xl bg-white/90 dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Ocurrió un problema al mostrar esta sección</h3>
            <p className="text-xs text-gray-500 mt-1">
              {this.state.error?.message || 'Error inesperado al renderizar el componente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Recargar sección
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    gemini_model: 'gemini-3.5-flash',
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

  const toast = useToast();

  const handleApplyToJob = async (job: JobPosting) => {
    try {
      setActiveTab('tracker');
      const draft = await api.applyJob(job.id);
      setApplications(prev => [draft, ...prev.filter(a => a.job_id !== job.id)]);
      const updatedJobs = await api.getJobs();
      setJobs(updatedJobs);
      toast.success('CV y carta adaptados exitosamente', job.title);
    } catch (e: any) {
      toast.error('Error al adaptar CV: ' + (e?.message || e));
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
          <ErrorBoundary>
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

              {activeTab === 'preferences' && preferences && (
                <PreferencesCenter
                  onPreferencesUpdated={(p) => setPreferences(p)}
                  preferences={preferences}
                />
              )}
            </div>
          </ErrorBoundary>
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
