import React, { useState } from 'react';
import { X, Key, Check, Info, Cpu, Sparkles } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
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
      }, 1500);
    } catch (e) {
      alert('Error guardando configuración: ' + e);
    } finally {
      setIsSaving(false);
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
            Puedes alternar libremente entre <strong>Google Gemini</strong>, <strong>OpenAI</strong> o <strong>Claude</strong> según tu clave disponible. Si no configuras clave, el sistema corre en modo offline con heurística inteligente.
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Proveedor Principal de IA:
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
                    onClick={() => setProvider(p.id as any)}
                    className={`p-3 rounded-xl border text-center transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-600 text-blue-900 dark:text-blue-200 font-semibold'
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Clave API ({provider.toUpperCase()} API KEY):</span>
              <span className="text-[10px] text-gray-400">
                {provider === 'gemini' && (settings.has_gemini_key ? '✓ Configurada' : 'No configurada')}
                {provider === 'openai' && (settings.has_openai_key ? '✓ Configurada' : 'No configurada')}
                {provider === 'claude' && (settings.has_claude_key ? '✓ Configurada' : 'No configurada')}
              </span>
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder={`Ingresa tu clave de ${provider}...`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
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

          <div className="flex justify-end space-x-2 pt-2">
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
              className="px-5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 flex items-center space-x-1"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <span>{isSaving ? 'Guardando...' : 'Aplicar Configuración'}</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
