import React, { useState } from 'react';
import {
  Brain,
  Shield,
  DollarSign,
  Globe,
  Sliders,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Info
} from 'lucide-react';
import type { UserPreferences } from '../types';
import { api } from '../api';

interface PreferencesCenterProps {
  preferences: UserPreferences;
  onPreferencesUpdated: (p: UserPreferences) => void;
}

export const PreferencesCenter: React.FC<PreferencesCenterProps> = ({
  preferences,
  onPreferencesUpdated
}) => {
  const [formData, setFormData] = useState<UserPreferences>(preferences);
  const [newRole, setNewRole] = useState('');
  const [newDealBreaker, setNewDealBreaker] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    try {
      const updated = await api.updatePreferences(formData);
      onPreferencesUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      alert('Error guardando preferencias: ' + e);
    }
  };

  const addRole = () => {
    if (newRole.trim() && !formData.target_roles.includes(newRole.trim())) {
      setFormData({
        ...formData,
        target_roles: [...formData.target_roles, newRole.trim()]
      });
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setFormData({
      ...formData,
      target_roles: formData.target_roles.filter(r => r !== role)
    });
  };

  const addDealBreaker = () => {
    if (newDealBreaker.trim() && !formData.deal_breakers.includes(newDealBreaker.trim())) {
      setFormData({
        ...formData,
        deal_breakers: [...formData.deal_breakers, newDealBreaker.trim()]
      });
      setNewDealBreaker('');
    }
  };

  const removeDealBreaker = (item: string) => {
    setFormData({
      ...formData,
      deal_breakers: formData.deal_breakers.filter(d => d !== item)
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            <span>Preferencias & Memoria Autónoma del Agente</span>
          </h2>
          <p className="text-xs text-gray-500">
            Define tus límites explícitos y observa lo que el agente deduce de tus interacciones
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saveSuccess ? '¡Guardado!' : 'Guardar Preferencias'}</span>
        </button>
      </div>

      {/* Autonomous Learned Insights (The AI Memory) */}
      <div className="apple-glass apple-card p-6 space-y-4 border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Reglas Aprendidas Autónomamente (Memoria Activa)
            </h3>
            <p className="text-[11px] text-gray-500">
              Patrones que el agente detecta cada vez que das Like, Descartas o Postulas a una vacante
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {formData.auto_learned_insights && formData.auto_learned_insights.length > 0 ? (
            formData.auto_learned_insights.map((insight, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-indigo-200/40 dark:border-indigo-800/40 text-xs text-gray-800 dark:text-gray-200 flex items-start space-x-2"
              >
                <span className="text-indigo-500 font-bold">•</span>
                <span className="leading-snug">{insight}</span>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-xs text-gray-400 p-4 text-center">
              El agente está esperando más interacciones en el Radar de Empleos para sintetizar tus preferencias implícitas.
            </div>
          )}
        </div>
      </div>

      {/* Explicit Settings Form */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-6">
        
        {/* Remote & Location */}
        <div className="space-y-3 border-b border-black/5 dark:border-white/5 pb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Modalidad & Ubicación</span>
          </h4>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
            <div>
              <div className="text-xs font-medium text-gray-900 dark:text-white">Solo Oportunidades 100% Remotas</div>
              <div className="text-[11px] text-gray-500">
                Descarta automáticamente ofertas que exijan asistencia a oficina física
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.remote_only}
                onChange={(e) => setFormData({ ...formData, remote_only: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Target Roles */}
        <div className="space-y-3 border-b border-black/5 dark:border-white/5 pb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Roles Laborales Deseados</h4>
          
          <div className="flex flex-wrap gap-2">
            {formData.target_roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50"
              >
                <span>{role}</span>
                <button
                  type="button"
                  onClick={() => removeRole(role)}
                  className="hover:text-red-500 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="text"
              placeholder="Agregar nuevo rol (ej. Lead AI Engineer)..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={addRole}
              className="p-2 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 transition"
            >
              <Plus className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>

        {/* Salary Expectation */}
        <div className="space-y-3 border-b border-black/5 dark:border-white/5 pb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Compensación Mínima Anual Deseada (USD)</span>
          </h4>

          <div className="flex items-center space-x-4">
            <input
              type="number"
              step="5000"
              value={formData.min_salary_usd || 0}
              onChange={(e) => setFormData({ ...formData, min_salary_usd: parseInt(e.target.value) || 0 })}
              className="w-48 text-sm font-semibold px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500">USD brutos / año</span>
          </div>
        </div>

        {/* Deal Breakers (Filtros Eliminatorios) */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>Condiciones Eliminatorias (Deal-Breakers)</span>
          </h4>
          <p className="text-[11px] text-gray-500">
            Cualquier vacante que contenga estas características será penalizada o rechazada de inmediato
          </p>

          <div className="space-y-2">
            {formData.deal_breakers.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/30 text-xs text-red-800 dark:text-red-300"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeDealBreaker(item)}
                  className="hover:text-red-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="text"
              placeholder="Agregar condición eliminatoria (ej. 'Requiere guardias nocturnas')..."
              value={newDealBreaker}
              onChange={(e) => setNewDealBreaker(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDealBreaker())}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={addDealBreaker}
              className="p-2 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 transition"
            >
              <Plus className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
