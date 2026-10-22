import React, { useState } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  Link as LinkIcon,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  FileText,
  Briefcase,
  DollarSign,
  ChevronRight,
  Filter,
  Trash2
} from 'lucide-react';
import type { JobPosting, FitEvaluation } from '../types';
import { api } from '../api';

interface JobRadarProps {
  jobs: JobPosting[];
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
}

export const JobRadar: React.FC<JobRadarProps> = ({ jobs, onRefresh, onApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isBatchRanking, setIsBatchRanking] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<FitEvaluation | null>(null);
  const [evaluatingJobId, setEvaluatingJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      await api.scrapeJobs(searchTerm, remoteOnly);
      onRefresh();
    } catch (e) {
      alert('Error al buscar empleos: ' + e);
    } finally {
      setIsScraping(false);
    }
  };

  const handleBatchRank = async () => {
    setIsBatchRanking(true);
    try {
      await api.batchRank();
      onRefresh();
    } catch (e) {
      alert('Error en batch rank: ' + e);
    } finally {
      setIsBatchRanking(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setIsImporting(true);
    setImportStatus('Extrayendo y verificando seguridad de la oferta...');
    try {
      await api.importJobUrl(importUrl);
      setImportUrl('');
      setImportStatus('¡Oferta importada exitosamente!');
      setTimeout(() => setImportStatus(null), 3000);
      onRefresh();
    } catch (err: any) {
      setImportStatus('Error: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleEvaluate = async (job: JobPosting) => {
    setEvaluatingJobId(job.id);
    try {
      const evaluation = await api.evaluateJob(job.id);
      setSelectedEvaluation(evaluation);
      onRefresh();
    } catch (e) {
      alert('Error evaluando ajuste: ' + e);
    } finally {
      setEvaluatingJobId(null);
    }
  };

  const handleFeedback = async (jobId: string, action: 'like' | 'dislike') => {
    try {
      await api.sendFeedback(jobId, action);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await api.deleteJob(jobId);
      onRefresh();
    } catch (e) {
      alert('Error eliminando empleo: ' + e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Deseas vaciar todo el radar de empleos?')) return;
    try {
      await api.clearAllJobs();
      onRefresh();
    } catch (e) {
      alert('Error limpiando radar: ' + e);
    }
  };

  const filteredJobs = jobs.filter(j => {
    const term = searchTerm.toLowerCase();
    const matchesTerm = !term || j.title.toLowerCase().includes(term) || j.company.toLowerCase().includes(term) || j.tags.some(t => t.toLowerCase().includes(term));
    const matchesRemote = !remoteOnly || j.is_remote;
    return matchesTerm && matchesRemote;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Actions Bar (Cupertino Minimalist) */}
      <div className="apple-glass apple-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por rol, stack o empresa (ej. Python, React, AI Engineer)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Remote Only Toggle */}
            <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-0 border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>100% Remoto</span>
              </span>
            </label>

            {/* Scrape Button */}
            <button
              onClick={handleScrape}
              disabled={isScraping}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
              <span>{isScraping ? 'Rastreando...' : 'Escanear Radar'}</span>
            </button>

            {/* Batch Rank Button */}
            <button
              onClick={handleBatchRank}
              disabled={isBatchRanking || jobs.length === 0}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5 transition disabled:opacity-50"
            >
              <CheckCircle className={`w-3.5 h-3.5 text-emerald-500 ${isBatchRanking ? 'animate-pulse' : ''}`} />
              <span>{isBatchRanking ? 'Evaluando...' : 'Evaluar Ajuste Masivo'}</span>
            </button>

            {/* Clear All Button */}
            {jobs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                title="Limpiar todas las ofertas del radar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* URL Importer Row */}
        <form onSubmit={handleImport} className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              placeholder="¿Viste una oferta en LinkedIn, Greenhouse o Lever? Pega la URL aquí para importarla..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-transparent border border-dashed border-gray-300 dark:border-zinc-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isImporting || !importUrl}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition disabled:opacity-40"
          >
            {isImporting ? 'Extrayendo...' : 'Importar Oferta'}
          </button>
        </form>

        {importStatus && (
          <p className="text-xs text-blue-600 dark:text-blue-400 animate-fade-in">{importStatus}</p>
        )}
      </div>

      {/* Jobs Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span>Mostrando {filteredJobs.length} oportunidades activas</span>
          <span>Ordenadas por coincidencia de ajuste</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="apple-glass apple-card p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sin vacantes en el radar todavía</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Haz clic en "Escanear Radar" para que el agente busque oportunidades remotas activas en portales globales, o pega la URL de una oferta que te interese.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasFit = job.fit_score !== null && job.fit_score !== undefined;
            const score = job.fit_score || 0;
            const isTopFit = score >= 85;
            const isGoodFit = score >= 70 && score < 85;

            return (
              <div
                key={job.id}
                className="apple-glass apple-card p-5 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-200 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  
                  {/* Job Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                        {job.title}
                      </h3>

                      {/* Source tag */}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        {job.source}
                      </span>

                      {/* Remote badge */}
                      {job.is_remote && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-1">
                          <Globe className="w-2.5 h-2.5" />
                          <span>100% Remoto</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-gray-200">{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      {job.salary_range && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            {job.salary_range}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Description preview */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed pt-1">
                      {job.description}
                    </p>

                    {/* Skill Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.tags.slice(0, 5).map((t, idx) => (
                          <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100/70 dark:bg-zinc-800/60 text-gray-600 dark:text-gray-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Match Score & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                    
                    {/* Score Pill */}
                    {hasFit ? (
                      <div className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 text-xs font-semibold ${
                        isTopFit
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isGoodFit
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{score}% Ajuste</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEvaluate(job)}
                        disabled={evaluatingJobId === job.id}
                        className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition"
                      >
                        {evaluatingJobId === job.id ? 'Evaluando...' : 'Calcular Ajuste'}
                      </button>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      {/* Like button (teaches preference) */}
                      <button
                        onClick={() => handleFeedback(job.id, 'like')}
                        title="Me interesa (enseña a la IA tus gustos)"
                        className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 transition"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>

                      {/* Dislike button */}
                      <button
                        onClick={() => handleFeedback(job.id, 'dislike')}
                        title="Descartar (enseña a la IA lo que no buscas)"
                        className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>

                      {/* External Link */}
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver en portal original"
                          className="p-1.5 rounded-full text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Delete Job Button */}
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        title="Eliminar esta oferta del radar"
                        className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Drafter / Apply */}
                      <button
                        onClick={() => onApply(job)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Adaptar CV</span>
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5D Fit Evaluation Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Evaluación de Ajuste (5 Dimensiones)
                </h3>
                <p className="text-xs text-gray-500">Diagnóstico imparcial y honesto contra tu perfil</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedEvaluation.overall_score}%
                </span>
                <p className="text-[11px] font-medium text-gray-500">{selectedEvaluation.verdict}</p>
              </div>
            </div>

            {/* Deal Breakers Alert if any */}
            {selectedEvaluation.deal_breakers_found.length > 0 && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 space-y-2">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Condiciones Eliminatorias Detectadas (Deal-Breakers):</span>
                </div>
                <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                  {selectedEvaluation.deal_breakers_found.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5 Dimensions Scores */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Desglose de Calificación</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedEvaluation.dimension_scores.map((dim, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-1">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-gray-800 dark:text-gray-200">{dim.dimension}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{dim.score}%</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{dim.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Missing Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Fortalezas que Cumples:</span>
                </h5>
                <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  {selectedEvaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-emerald-500">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Brechas Honestras (Para preparar o aprender):</span>
                </h5>
                <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  {selectedEvaluation.missing_skills.length > 0 ? (
                    selectedEvaluation.missing_skills.map((m, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-amber-500">•</span>
                        <span>{m}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400 text-xs">No se detectaron brechas críticas.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Recommendation summary */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Veredicto del Agente:</strong> {selectedEvaluation.recommendation_summary}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="px-5 py-2 rounded-xl text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900"
              >
                Cerrar Diagnóstico
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
