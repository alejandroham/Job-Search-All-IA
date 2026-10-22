import React from 'react';
import { Radar, User, FileText, Brain, Sparkles, Settings as SettingsIcon, Sun, Moon, Kanban } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  openSettings: () => void;
  activeProvider: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  openSettings,
  activeProvider
}) => {
  const tabs = [
    { id: 'radar', label: 'Radar de Empleo', icon: Radar },
    { id: 'tracker', label: 'Seguimiento & Estrategia', icon: Kanban },
    { id: 'profile', label: 'Perfil & CV', icon: User },
    { id: 'applications', label: 'Adaptador & Postulaciones', icon: FileText },
    { id: 'interview', label: 'Coach Entrevistas', icon: Sparkles },
    { id: 'preferences', label: 'Memoria & IA', icon: Brain },
  ];

  return (
    <header className="sticky top-0 z-40 w-full apple-glass transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Radar className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-base tracking-tight text-gray-900 dark:text-white">NexusJob</span>
              <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                AI Agent
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">Agente Autónomo de Carrera</p>
          </div>
        </div>

        {/* Apple Segmented Navigation Control */}
        <nav className="hidden md:flex items-center bg-gray-200/50 dark:bg-zinc-800/60 p-1 rounded-full border border-black/5 dark:border-white/5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Active LLM Pill */}
          <button
            onClick={openSettings}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-black/5 dark:border-white/5 transition"
            title="Configuración de IA"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="capitalize">{activeProvider}</span>
            <SettingsIcon className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            title="Cambiar tema"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>

      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 space-x-2 border-t border-black/5 dark:border-white/5 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
