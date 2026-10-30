import React, { useState } from 'react';
import {
  Brain,
  Shield,
  DollarSign,
  Globe,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Star,
  CheckCircle2,
  RefreshCw,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Target
} from 'lucide-react';
import type { UserPreferences, LearnedStarStory } from '../types';
import { api } from '../api';
import { useToast } from './Toast';

interface PreferencesCenterProps {
  preferences: UserPreferences;
  onPreferencesUpdated: (p: UserPreferences) => void;
}

export const PreferencesCenter: React.FC<PreferencesCenterProps> = ({
  preferences,
  onPreferencesUpdated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState<UserPreferences>(preferences);
  const [newRole, setNewRole] = useState('');
  const [newDealBreaker, setNewDealBreaker] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [newStory, setNewStory] = useState<Partial<LearnedStarStory>>({
    title: '',
    situation_and_task: '',
    action: '',
    result_and_metrics: '',
    key_skills: []
  });
  const [newSkillTag, setNewSkillTag] = useState('');

  // Synchronize if parent preferences change
  React.useEffect(() => {
    setFormData(preferences);
  }, [preferences]);

  const handleSave = async () => {
    try {
      const updated = await api.updatePreferences(formData);
      onPreferencesUpdated(updated);
      setSaveSuccess(true);
      toast.success('Preferencias y memoria guardadas');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      toast.error('Error guardando preferencias: ' + (e?.message || e));
    }
  };

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    try {
      const updated = await api.consolidateMemory();
      setFormData(updated);
      onPreferencesUpdated(updated);
      toast.success('¡Memoria Cognitiva IA consolidada con éxito!');
    } catch (e: any) {
      toast.error('Error al consolidar memoria: ' + (e?.message || e));
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleResetMemory = async () => {
    setIsResetting(true);
    try {
      const resetPrefs = await api.resetMemory();
      setFormData(resetPrefs);
      onPreferencesUpdated(resetPrefs);
      setShowResetConfirm(false);
      toast.success('Memoria IA reiniciada a cero');
    } catch (e: any) {
      toast.error('Error al reiniciar memoria: ' + (e?.message || e));
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const updated = await api.deleteLearnedStarStory(storyId);
      setFormData(updated);
      onPreferencesUpdated(updated);
      toast.success('Historia eliminada de la memoria');
    } catch (e: any) {
      toast.error('Error al eliminar historia: ' + (e?.message || e));
    }
  };

  const handleAddCustomStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStory.title?.trim() || !newStory.action?.trim()) {
      toast.error('Por favor ingresa al menos un título y la acción realizada');
      return;
    }
    const story: LearnedStarStory = {
      id: Math.random().toString(36).substring(2, 9),
      title: newStory.title.trim(),
      situation_and_task: newStory.situation_and_task?.trim() || '',
      action: newStory.action.trim(),
      result_and_metrics: newStory.result_and_metrics?.trim() || '',
      key_skills: newStory.key_skills || [],
      source: 'manual',
      score: 95,
      created_at: new Date().toISOString()
    };
    const updatedStories = [story, ...(formData.learned_star_stories || [])];
    const updatedData: UserPreferences = {
      ...formData,
      learned_star_stories: updatedStories
    };
    try {
      const saved = await api.updatePreferences(updatedData);
      setFormData(saved);
      onPreferencesUpdated(saved);
      setShowAddStoryModal(false);
      setNewStory({ title: '', situation_and_task: '', action: '', result_and_metrics: '', key_skills: [] });
      toast.success('Historia STAR agregada a tu memoria');
    } catch (e: any) {
      toast.error('Error al guardar historia: ' + (e?.message || e));
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

  const maturity = formData.memory_stats?.maturity_percentage || 70;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fade-in text-xs">
      
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            <span>Memoria Cognitiva & Preferencias del Candidato</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            El modelo mental donde Gemini aprende de tu CV, tus postulaciones, interacciones del radar y respuestas de entrevistas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleConsolidate}
            disabled={isConsolidating || isResetting}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition disabled:opacity-50"
            title="Consolidar con IA todo tu historial de CV, vacantes guardadas y respuestas"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isConsolidating ? 'animate-spin' : ''}`} />
            <span>{isConsolidating ? 'Sincronizando...' : '⚡ Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isConsolidating || isResetting}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveSuccess ? '¡Guardado!' : 'Guardar Ajustes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isConsolidating || isResetting}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
            title="Borrar todos los recuerdos aprendidos y empezar desde cero"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reiniciar Memoria</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Reset AI Memory */}
      {showResetConfirm && (
        <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200 flex items-center space-x-1.5">
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>¿Deseas borrar la memoria aprendida por la IA y empezar de cero?</span>
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed max-w-2xl">
                Esta acción restablecerá el ADN profesional, eliminará todas las historias STAR memorizadas, limpiará los patrones del radar y vaciará el historial de likes/descartes. Tu CV Maestro y vacantes guardadas permanecerán intactos. Podrás volver a sincronizar la memoria cuando desees.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="text-gray-400 hover:text-gray-600 text-xs px-2"
            >
              ✕
            </button>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleResetMemory}
              disabled={isResetting}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition disabled:opacity-50 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Borrando memoria...' : 'Sí, borrar memoria y empezar de cero'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Memory Calibration Health & Maturity Meter */}
      <div className="apple-glass apple-card p-5 space-y-3.5 border-indigo-500/20 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 dark:from-indigo-950/20 dark:via-zinc-900/40 dark:to-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-xs block">
                Nivel de Calibración de la Memoria:
              </span>
              <span className="text-[11px] text-gray-500">
                Determina con cuánta precisión Gemini adapta tus cartas, CVs y prepara tus entrevistas.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {maturity}%
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {maturity >= 80 ? 'Alta Madurez' : maturity >= 50 ? 'Calibrando' : 'Inicial'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200/80 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-700"
            style={{ width: `${maturity}%` }}
          />
        </div>

        {/* Data Points Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">CV Maestro</span>
            <div className="flex items-center space-x-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Analizado & Mapeado</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Postulaciones</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formData.memory_stats?.total_applications_learned || 0} adaptaciones
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Historias STAR</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formData.learned_star_stories?.length || 0} casos de éxito
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Última Sincronización</span>
            <div className="font-medium text-gray-600 dark:text-gray-400 truncate">
              {formData.memory_stats?.last_consolidated_at
                ? new Date(formData.memory_stats.last_consolidated_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                : 'Automática'}
            </div>
          </div>
        </div>
      </div>

      {/* ADN Profesional & Propuesta de Valor (ProfileDNA) */}
      <div className="apple-glass apple-card p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2.5">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-gray-900 dark:text-white text-xs">
              ADN Profesional Inmanente (Deducido por IA)
            </h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              Seniority: {formData.profile_dna?.seniority_level || 'Senior / Lead'}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              Tono: {formData.profile_dna?.communication_tone || 'Técnico-ejecutivo'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
            Propuesta de Valor Sintetizada:
          </span>
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
            "{formData.profile_dna?.summary || 'Profesional de tecnología enfocado en soluciones escalables e ingeniería de software moderna con alta capacidad de resolución técnica.'}"
          </p>
        </div>

        {formData.profile_dna?.core_strengths && formData.profile_dna.core_strengths.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
              Pilares de Fortaleza Clave:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {formData.profile_dna.core_strengths.map((str, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40 font-medium text-[11px]"
                >
                  ✓ {str}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Biblioteca de Historias STAR Memorizadas */}
      <div className="apple-glass apple-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2.5">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-xs">
                Biblioteca de Historias STAR Memorizadas ({formData.learned_star_stories?.length || 0})
              </h3>
              <p className="text-[11px] text-gray-500">
                Logros cuantificables que la IA reutiliza automáticamente al adaptar tu CV y redactar cartas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddStoryModal(!showAddStoryModal)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 hover:bg-amber-100 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Agregar Caso de Éxito</span>
          </button>
        </div>

        {/* Modal / In-line form to add custom STAR Story */}
        {showAddStoryModal && (
          <form onSubmit={handleAddCustomStory} className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                Nuevo Caso de Éxito STAR
              </span>
              <button
                type="button"
                onClick={() => setShowAddStoryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-500">Título del logro:</label>
              <input
                type="text"
                placeholder="Ej. Reducción de latencia en consultas y cacheo en Redis"
                value={newStory.title}
                onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Situación / Desafío (S & T):</label>
                <textarea
                  rows={2}
                  placeholder="El sistema enfrentaba cuellos de botella con 10k usuarios concurrentes..."
                  value={newStory.situation_and_task}
                  onChange={(e) => setNewStory({ ...newStory, situation_and_task: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Acción implementada (A):</label>
                <textarea
                  rows={2}
                  placeholder="Diseñé índices compuestos y capa de caché distribuida..."
                  value={newStory.action}
                  onChange={(e) => setNewStory({ ...newStory, action: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-500">Resultado & Métrica (R):</label>
              <input
                type="text"
                placeholder="Reducción del tiempo de respuesta de 4s a 150ms (-96%) sin errores"
                value={newStory.result_and_metrics}
                onChange={(e) => setNewStory({ ...newStory, result_and_metrics: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs"
              >
                Guardar Historia en Memoria
              </button>
            </div>
          </form>
        )}

        {/* Stories List */}
        {formData.learned_star_stories && formData.learned_star_stories.length > 0 ? (
          <div className="space-y-3">
            {formData.learned_star_stories.map((story) => (
              <div
                key={story.id}
                className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2.5 transition hover:border-black/10 dark:hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                        {story.title}
                      </h4>
                      <span className="text-[9px] px-2 py-0.2 rounded-full font-semibold uppercase bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300">
                        {story.source}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {story.score && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        ⭐ {story.score} pts
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteStory(story.id)}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="Eliminar este recuerdo de la memoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* STAR Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  {story.situation_and_task && (
                    <div className="p-2.5 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block uppercase">
                        Situación / Reto
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 leading-snug">
                        {story.situation_and_task}
                      </p>
                    </div>
                  )}

                  {story.action && (
                    <div className="p-2.5 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase">
                        Acción Ejecutada
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 leading-snug">
                        {story.action}
                      </p>
                    </div>
                  )}

                  {story.result_and_metrics && (
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 space-y-0.5">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block uppercase">
                        Resultado & Métrica
                      </span>
                      <p className="text-emerald-950 dark:text-emerald-200 font-medium leading-snug">
                        {story.result_and_metrics}
                      </p>
                    </div>
                  )}
                </div>

                {story.key_skills && story.key_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {story.key_skills.map((skill, si) => (
                      <span
                        key={si}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-dashed border-gray-300 dark:border-zinc-700">
            <Star className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
              Aún no hay historias STAR memorizadas
            </p>
            <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
              Presiona <strong>"⚡ Sincronizar Memoria"</strong> arriba para extraerlas de tu CV o practica en el Simulador STAR de cualquier postulación para guardarlas automáticamente.
            </p>
          </div>
        )}
      </div>

      {/* Reglas Aprendidas Autónomamente & Patrones de Industria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Radar Insights */}
        <div className="apple-glass apple-card p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-xs">
              Reglas de Afinidad Aprendidas (Radar)
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            Deducidas de tus likes, descartes y motivos de descarte en el Radar:
          </p>

          <div className="space-y-2 pt-1">
            {formData.auto_learned_insights && formData.auto_learned_insights.length > 0 ? (
              formData.auto_learned_insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-gray-800 dark:text-gray-200 flex items-start space-x-2 leading-relaxed"
                >
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{insight}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">Sin reglas de afinidad detectadas aún.</p>
            )}
          </div>
        </div>

        {/* Industry & Market Patterns */}
        <div className="apple-glass apple-card p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-xs">
              Patrones de Industria & Palabras Clave
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            Factores detectados en las empresas y vacantes que más te interesan:
          </p>

          <div className="space-y-2 pt-1">
            {formData.industry_insights && formData.industry_insights.length > 0 ? (
              formData.industry_insights.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-gray-800 dark:text-gray-200 flex items-start space-x-2 leading-relaxed"
                >
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{pattern}</span>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 text-gray-500 text-center py-4">
                Sincroniza tu memoria para deducir patrones de mercado basados en tus empresas seleccionadas.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Explicit Settings Form */}
      <div className="apple-glass apple-card p-6 space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-black/5 dark:border-white/5 pb-2">
          Criterios Explícitos & Parámetros Directos
        </h3>

        {/* Remote & Location */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-xs flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Solo Oportunidades 100% Remotas</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Penaliza o descarta automáticamente ofertas que exijan asistencia presencial a oficina.
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

        {/* Target Roles */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Roles Laborales Deseados
          </label>
          <div className="flex flex-wrap gap-1.5">
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

          <div className="flex items-center space-x-2 pt-1">
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
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Compensación Mínima Anual Deseada (USD)</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              step="5000"
              value={formData.min_salary_usd || 0}
              onChange={(e) => setFormData({ ...formData, min_salary_usd: parseInt(e.target.value) || 0 })}
              className="w-44 text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500">USD brutos / año</span>
          </div>
        </div>

        {/* Deal Breakers */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-red-500 flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>Condiciones Eliminatorias (Deal-Breakers)</span>
          </label>
          <p className="text-[11px] text-gray-500">
            Cualquier vacante que contenga estas características será penalizada o rechazada de inmediato.
          </p>

          <div className="space-y-1.5">
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

          <div className="flex items-center space-x-2 pt-1">
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
