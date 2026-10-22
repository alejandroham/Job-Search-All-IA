import React, { useState, useEffect } from 'react';
import { X, Key, Check, Info, Cpu, Sparkles, Trash2 } from 'lucide-react';
import type { LLMSettings } from '../types';
import { api } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSettingsUpdated: (s: LLMSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated
}) => {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'claude'>(settings.provider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProvider(settings.provider || 'gemini');
      const localKey = localStorage.getItem(`job_search_llm_key_${settings.provider || 'gemini'}`);
      if (localKey && !apiKey) {
        setApiKey(localKey);
      }
    }
  }, [isOpen, settings.provider]);

  if (!isOpen) return null;

  const handleProviderChange = (p: 'gemini' | 'openai' | 'claude') => {
    setProvider(p);
    const cachedKey = localStorage.getItem(`job_search_llm_key_${p}`) || '';
    setApiKey(cachedKey);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (apiKey) {
        localStorage.setItem(`job_search_llm_key_${provider}`, apiKey);
      }
      localStorage.setItem('job_search_default_provider', provider);

      await api.updateSettings({
        provider,
        api_key: apiKey ? apiKey : undefined,
        model_name: modelName ? modelName : undefined
      });
      const updated = await api.getSettings();
      onSettingsUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      alert('Error guardando configuración: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm(`¿Deseas borrar la clave de ${provider.toUpperCase()} y volver a Modo Offline Heurístico?`)) return;
    try {
      localStorage.removeItem(`job_search_llm_key_${provider}`);
      setApiKey('');
      await api.updateSettings({
        provider,
        api_key: '',
        model_name: undefined
      });
      const updated = await api.getSettings();
      onSettingsUpdated(updated);
    } catch (e) {
      alert('Error al borrar la clave: ' + e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="apple-glass apple-card max-w-md w-full p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Motor de Inteligencia Artificial (LLM)
              </h3>
              <p className="text-[11px] text-gray-500">Gemini • ChatGPT • Claude</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational banner */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Las claves se almacenan <strong>100% en local</strong> (en tu equipo y navegador, protegidas de git). Sin clave, el sistema funciona en <strong>Modo Offline Heurístico (Amarillo)</strong>. Al ingresar una clave válida, verás el <strong>Punto Verde</strong> y el nombre del modelo.
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Proveedor de IA Seleccionado:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gemini', label: 'Gemini', badge: 'Recomendado' },
                { id: 'openai', label: 'OpenAI (GPT)', badge: 'GPT-4o' },
                { id: 'claude', label: 'Claude', badge: 'Sonnet' }
              ].map((p) => {
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id as any)}
                    className={`p-3 rounded-xl border text-center transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-600 text-blue-900 dark:text-blue-200 font-semibold shadow-sm'
                        : 'bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{p.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
              <span>Clave API ({provider.toUpperCase()} API KEY):</span>
              <span className="text-[10px]">
                {provider === 'gemini' && (settings.has_gemini_key ? <span className="text-emerald-500 font-medium">● Activa en local</span> : <span className="text-amber-500 font-medium">○ Sin clave</span>)}
                {provider === 'openai' && (settings.has_openai_key ? <span className="text-emerald-500 font-medium">● Activa en local</span> : <span className="text-amber-500 font-medium">○ Sin clave</span>)}
                {provider === 'claude' && (settings.has_claude_key ? <span className="text-emerald-500 font-medium">● Activa en local</span> : <span className="text-amber-500 font-medium">○ Sin clave</span>)}
              </span>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder={`Ingresa tu clave de ${provider}...`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setApiKey('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              Almacenada con persistencia local en tu equipo.
            </p>
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Modelo a utilizar (opcional):
            </label>
            <input
              type="text"
              placeholder={
                provider === 'gemini'
                  ? settings.gemini_model || 'gemini-2.5-flash'
                  : provider === 'openai'
                  ? settings.openai_model || 'gpt-4o'
                  : settings.claude_model || 'claude-3-5-sonnet-20241022'
              }
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {(settings.has_gemini_key || settings.has_openai_key || settings.has_claude_key) && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center space-x-1 transition"
                  title="Eliminar clave y pasar a modo offline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar clave</span>
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar en Local'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
