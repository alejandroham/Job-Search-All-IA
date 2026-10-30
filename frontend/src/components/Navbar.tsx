import React from 'react';
import { Radar, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import type { LLMSettings } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  openSettings: () => void;
  llmSettings: LLMSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  openSettings,
  llmSettings
}) => {
  // Clean, spacious Apple navigation (Applications & Interview Coach unified inside Tracker)
  const tabs = [
    { id: 'radar', label: 'Radar de Empleo' },
    { id: 'tracker', label: 'Mis Postulaciones' },
    { id: 'profile', label: 'Perfil & CV' },
    { id: 'preferences', label: 'Memoria IA' },
  ];

  const hasKey = Boolean(llmSettings?.has_active_key);
  const statusLabel = hasKey
    ? (llmSettings?.status_label || (llmSettings?.active_model_name ? `${llmSettings.provider.toUpperCase()} (${llmSettings.active_model_name})` : llmSettings?.provider?.toUpperCase() || 'IA Conectada'))
    : 'Modo Offline Heurístico';
  const dotColor = hasKey ? 'bg-emerald-500' : 'bg-yellow-400';

  return (
    <header className="no-print sticky top-0 z-40 w-full apple-glass transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white">NexusJob</span>
              <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Clean Apple Segmented Navigation without icons */}
        <nav className="hidden md:flex items-center bg-gray-200/50 dark:bg-zinc-800/60 p-1 rounded-full border border-black/5 dark:border-white/5 space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          
          {/* Active LLM Pill Indicator */}
          <button
            onClick={openSettings}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100/90 dark:bg-zinc-800/90 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5 transition shadow-sm"
            title="Configuración del Motor de Inteligencia Artificial (LLM)"
          >
            <span className={`w-2 h-2 rounded-full ${dotColor} ${!hasKey ? 'animate-pulse' : ''}`}></span>
            <span className="font-medium">{statusLabel}</span>
            <SettingsIcon className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            title="Cambiar tema claro / oscuro"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>

      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 space-x-2 border-t border-black/5 dark:border-white/5 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
