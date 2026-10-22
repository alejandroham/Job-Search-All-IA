import React, { useState } from 'react';
import {
  Kanban,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Award,
  ArrowRight,
  Trash2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import type { JobPosting, OutcomeSubmission, UpskillPlan } from '../types';
import { api } from '../api';

interface PipelineTrackerProps {
  jobs: JobPosting[];
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
}

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  jobs,
  onRefresh,
  onApply
}) => {
  const [selectedJobForOutcome, setSelectedJobForOutcome] = useState<JobPosting | null>(null);
  const [wasSuccessful, setWasSuccessful] = useState<boolean>(true);
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [feedbackDetails, setFeedbackDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [latestPlan, setLatestPlan] = useState<UpskillPlan | null>(null);

  const columns = [
    { id: 'saved', title: 'Guardadas / En Radar', icon: Clock, color: 'text-blue-500' },
    { id: 'applied', title: 'CV Enviado / Postulado', icon: ArrowRight, color: 'text-amber-500' },
    { id: 'interviewing', title: 'En Entrevistas', icon: MessageSquare, color: 'text-purple-500' },
    { id: 'offer', title: 'Oferta / Exitoso', icon: CheckCircle2, color: 'text-emerald-500' },
    { id: 'rejected', title: 'Cerrado / No Exitoso', icon: AlertCircle, color: 'text-red-500' }
  ];

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await api.updateJobStatus(jobId, newStatus);
      onRefresh();
    } catch (e) {
      alert('Error actualizando estado: ' + e);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta oportunidad?')) return;
    try {
      await api.deleteJob(jobId);
      onRefresh();
    } catch (e) {
      alert('Error al eliminar: ' + e);
    }
  };

  const handleSubmitOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForOutcome) return;
    setIsSubmitting(true);
    try {
      const submission: OutcomeSubmission = {
        job_id: selectedJobForOutcome.id,
        status: wasSuccessful ? 'offer' : 'rejected',
        was_successful: wasSuccessful,
        reason: outcomeReason,
        feedback_details: feedbackDetails
      };
      const plan = await api.submitOutcome(submission);
      setLatestPlan(plan);
      setSelectedJobForOutcome(null);
      setOutcomeReason('');
      setFeedbackDetails('');
      onRefresh();
    } catch (e) {
      alert('Error registrando resultado: ' + e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Kanban className="w-5 h-5 text-blue-500" />
            <span>Seguimiento de Oportunidades & Estrategia (Outcome & Upskill)</span>
          </h2>
          <p className="text-xs text-gray-500">
            Monitorea el estado de cada postulación y genera planes de estudio cuando un proceso no avance
          </p>
        </div>
      </div>

      {/* Latest Upskill Plan Banner if available */}
      {latestPlan && (
        <div className="apple-glass apple-card p-6 space-y-4 border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 animate-fade-in relative">
          <button
            onClick={() => setLatestPlan(null)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>Plan Estratégico y de Estudios Recomendados para {latestPlan.job_title}:</span>
          </div>

          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
            <strong>Ajuste de Estrategia:</strong> {latestPlan.strategy_adjustment}
          </p>

          {/* Brechas detectadas */}
          {latestPlan.skill_gaps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Brechas Técnicas Clave:</span>
              <div className="flex flex-wrap gap-1.5">
                {latestPlan.skill_gaps.map((gap, i) => (
                  <span key={i} className="text-xs px-2.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Study Plan Cards */}
          {latestPlan.study_plan.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ruta de Aprendizaje Sugerida:</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latestPlan.study_plan.map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                      <span>{t.topic}</span>
                      <span className="text-blue-600 text-[10px]">{t.estimated_time}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-[11px]">{t.description}</p>
                    <div className="text-[10px] text-gray-400">Recursos: {t.suggested_resources}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Certifications */}
          {latestPlan.recommended_certifications.length > 0 && (
            <div className="flex items-center space-x-2 text-xs pt-1">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                <strong>Certificaciones Valoradas:</strong> {latestPlan.recommended_certifications.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columns.map((col) => {
          const colJobs = jobs.filter(j => (j.status || 'saved') === col.id || (col.id === 'saved' && j.status === 'discovered'));
          const Icon = col.icon;

          return (
            <div key={col.id} className="space-y-3">
              {/* Column Header */}
              <div className="apple-glass p-3 rounded-xl flex items-center justify-between border border-black/5 dark:border-white/5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <span>{col.title}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300">
                  {colJobs.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 min-h-[300px]">
                {colJobs.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-zinc-800 text-center text-[11px] text-gray-400">
                    Sin vacantes
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div
                      key={job.id}
                      className="apple-glass apple-card p-3.5 space-y-2 border border-black/5 dark:border-white/5 hover:border-blue-500/40 transition group"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {job.title}
                          </h4>
                          <p className="text-[11px] text-gray-500">{job.company}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="text-gray-300 hover:text-red-500 transition p-1"
                          title="Eliminar del radar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{job.location}</span>
                        {job.fit_score && (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {job.fit_score}% Fit
                          </span>
                        )}
                      </div>

                      {/* Outcome Notes if any */}
                      {job.outcome && (
                        <div className="text-[10px] p-1.5 rounded bg-gray-100/80 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 line-clamp-2">
                          <strong>Nota:</strong> {job.outcome}
                        </div>
                      )}

                      {/* Card Action Controls */}
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                        {col.id === 'saved' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'applied')}
                            className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                          >
                            → Marcar Postulado
                          </button>
                        )}

                        {col.id === 'applied' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'interviewing')}
                            className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100"
                          >
                            → A Entrevista
                          </button>
                        )}

                        {/* Button to Record Final Outcome */}
                        <button
                          onClick={() => setSelectedJobForOutcome(job)}
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                        >
                          Registrar Resultado
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome Recording Modal */}
      {selectedJobForOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Registrar Resultado de la Postulación
                </h3>
                <p className="text-[11px] text-gray-500">
                  {selectedJobForOutcome.title} @ {selectedJobForOutcome.company}
                </p>
              </div>
              <button
                onClick={() => setSelectedJobForOutcome(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOutcome} className="space-y-4 text-xs">
              
              {/* Success / Unsuccessful Selector */}
              <div>
                <label className="block text-gray-500 mb-1.5 font-medium">¿Cómo resultó el proceso?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWasSuccessful(true)}
                    className={`p-3 rounded-xl border text-center transition flex items-center justify-center space-x-1.5 ${
                      wasSuccessful
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-500'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4 text-emerald-600" />
                    <span>Exitoso / Avanzó</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWasSuccessful(false)}
                    className={`p-3 rounded-xl border text-center transition flex items-center justify-center space-x-1.5 ${
                      !wasSuccessful
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-800 dark:text-red-300 font-semibold'
                        : 'bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-500'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <span>No Exitoso / Rechazado</span>
                  </button>
                </div>
              </div>

              {/* Reason / Outcome */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">
                  {wasSuccessful ? 'Motivo del éxito (opcional):' : 'Causa o motivo del rechazo / cierre:'}
                </label>
                <input
                  type="text"
                  placeholder={
                    wasSuccessful
                      ? "Ej. Buena recepción del perfil de liderazgo TI y proyectos cloud"
                      : "Ej. Exigían certificación AWS o inglés avanzado para llamadas en vivo"
                  }
                  value={outcomeReason}
                  onChange={(e) => setOutcomeReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              {/* Feedback notes */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Detalles o feedback del reclutador (opcional):</label>
                <textarea
                  rows={3}
                  placeholder="Comentarios adicionales que te dieron o conclusiones personales para calibrar la IA..."
                  value={feedbackDetails}
                  onChange={(e) => setFeedbackDetails(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForOutcome(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Analizando con IA...' : 'Guardar y Generar Estrategia'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
