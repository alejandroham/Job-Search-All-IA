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
  Trash2,
  Mail,
  Send,
  Eye,
  LayoutGrid,
  Columns,
  List
} from 'lucide-react';
import type { JobPosting, FitEvaluation, CandidateProfile } from '../types';
import { api } from '../api';

interface JobRadarProps {
  jobs: JobPosting[];
  profile?: CandidateProfile | null;
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
}

export const JobRadar: React.FC<JobRadarProps> = ({ jobs, profile, onRefresh, onApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searchScope, setSearchScope] = useState<'global' | 'chile' | 'all'>(() => {
    return (localStorage.getItem('job_radar_scope') as 'global' | 'chile' | 'all') || 'all';
  });
  const [isScraping, setIsScraping] = useState(false);
  const [isBatchRanking, setIsBatchRanking] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<FitEvaluation | null>(null);
  const [evaluatingJobId, setEvaluatingJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [likedJobs, setLikedJobs] = useState<Record<string, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<Record<string, string>>({});
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid3' | 'grid2' | 'list'>(() => {
    return (localStorage.getItem('job_radar_view_mode') as 'grid3' | 'grid2' | 'list') || 'grid3';
  });

  const handleSetViewMode = (mode: 'grid3' | 'grid2' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('job_radar_view_mode', mode);
  };

  const getJobContactEmail = (job: JobPosting): string | null => {
    if (job.contact_email && job.contact_email.trim()) {
      return job.contact_email.trim();
    }
    if (job.description) {
      const match = job.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) return match[0];
    }
    return null;
  };

  const formatSource = (src: string): string => {
    const map: Record<string, string> = {
      getonbrd: '🇨🇱 Get on Board',
      linkedin_chile: '🇨🇱 LinkedIn CL',
      computrabajo: '🇨🇱 CompuTrabajo',
      chiletrabajos: '🇨🇱 ChileTrabajos',
      laborum: '🇨🇱 Laborum',
      remotive: '🌍 Remotive',
      arbeitnow: '🌍 Arbeitnow',
      remoteok: '🌍 RemoteOK',
      linkedin: '🌍 LinkedIn',
      url_import: '🔗 Importado'
    };
    return map[src] || src;
  };

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      await api.scrapeJobs(searchTerm, remoteOnly, searchScope);
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
      if (action === 'like') {
        setLikedJobs(prev => ({ ...prev, [jobId]: true }));
        setFeedbackMsg(prev => ({ ...prev, [jobId]: '¡Interés guardado! La IA priorizará ofertas afines.' }));
        setTimeout(() => {
          setFeedbackMsg(prev => {
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }, 3500);
        await api.sendFeedback(jobId, action);
      } else {
        // Dislike: teach agent preferences and remove from radar
        await api.sendFeedback(jobId, action);
        await api.deleteJob(jobId);
        onRefresh();
      }
    } catch (e) {
      console.error('Error registrando feedback:', e);
    }
  };

  const handleOneClickApply = async (job: JobPosting) => {
    const email = getJobContactEmail(job);
    const candidateName = profile?.full_name || 'Candidato';
    const candidateEmail = profile?.contact_info?.email || '';
    const candidatePhone = profile?.contact_info?.phone || '';

    setApplyingJobId(job.id);

    if (email) {
      const subject = encodeURIComponent(`Postulación: ${job.title} - ${candidateName}`);
      const body = encodeURIComponent(
        `Estimado equipo de selección de ${job.company},\n\n` +
        `Me pongo en contacto para presentar formalmente mi candidatura a la posición de ${job.title}.\n\n` +
        `Cuento con sólida experiencia en las responsabilidades del puesto y motivación para integrarme a sus desafíos.\n\n` +
        `Quedo a su disposición para coordinar una entrevista y conversar en profundidad.\n\n` +
        `Atentamente,\n` +
        `${candidateName}\n` +
        `${candidateEmail ? `Email: ${candidateEmail}\n` : ''}` +
        `${candidatePhone ? `Teléfono: ${candidatePhone}\n` : ''}`
      );
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer');
    }

    try {
      await api.updateJobStatus(job.id, 'applied');
      setFeedbackMsg(prev => ({
        ...prev,
        [job.id]: email
          ? '¡Correo preparado y oferta registrada en Seguimiento!'
          : '¡Portal abierto y oferta registrada en Seguimiento!'
      }));
      setTimeout(() => {
        setFeedbackMsg(prev => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }, 4000);
      onRefresh();
    } catch (e) {
      console.error('Error al registrar postulación:', e);
    } finally {
      setApplyingJobId(null);
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
    const matchesTerm = !term || j.title.toLowerCase().includes(term) || j.company.toLowerCase().includes(term) || (j.tags && j.tags.some(t => t.toLowerCase().includes(term)));
    const matchesRemote = !remoteOnly || j.is_remote;
    return matchesTerm && matchesRemote;
  });

  return (
    <div className="space-y-6">
      
      {/* Control Banner & Autonomous Search */}
      <div className="apple-glass apple-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center space-x-2">
              <span>Radar de Búsqueda (Chile & Global)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
                En vivo
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Búsqueda en portales chilenos (GetOnBoard, LinkedIn Chile, CompuTrabajo, ChileTrabajos, Laborum) y globales. Admite modalidades presencial, híbrida y remota.
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchRank}
              disabled={isBatchRanking || jobs.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 transition flex items-center space-x-1.5 disabled:opacity-40"
              title="Evalúa y clasifica automáticamente los empleos según tu CV"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{isBatchRanking ? 'Evaluando...' : 'Reclasificar Todo (IA)'}</span>
            </button>

            <button
              onClick={handleScrape}
              disabled={isScraping}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition flex items-center space-x-2 disabled:opacity-40"
            >
              <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: isScraping ? '1s' : '0s' }} />
              <span>{isScraping ? 'Escaneando portales...' : 'Escanear Radar'}</span>
            </button>

            {jobs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                title="Limpiar radar completo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scope Selector: Chile, Global, or Ambos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-1">Alcance:</span>
            <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSearchScope('chile');
                  localStorage.setItem('job_radar_scope', 'chile');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  searchScope === 'chile'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Buscar en GetOnBoard, LinkedIn Chile, CompuTrabajo, ChileTrabajos y Laborum"
              >
                🇨🇱 Solo Chile
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchScope('global');
                  localStorage.setItem('job_radar_scope', 'global');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  searchScope === 'global'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Buscar en portales internacionales remotos"
              >
                🌍 Global Remoto
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchScope('all');
                  localStorage.setItem('job_radar_scope', 'all');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  searchScope === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Escanear simultáneamente Chile + Global"
              >
                🌐 Ambos (Chile + Global)
              </button>
            </div>
          </div>

          {/* Modality Filter */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center space-x-1.5 ${
                remoteOnly
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100/70 dark:bg-zinc-800/60 border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-400'
              }`}
              title="Alternar entre ver solo remoto o todas las modalidades (presencial, híbrido y remoto)"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{remoteOnly ? 'Modalidad: Solo Remoto' : 'Modalidad: Todas (Presencial + Híbrido + Remoto)'}</span>
            </button>
          </div>
        </div>

        {/* Keyword Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cargo, palabra clave o tecnología (ej. Administrador de Redes, DevOps, Python, Soporte)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            />
          </div>
        </div>

        {/* URL Importer */}
        <form onSubmit={handleImport} className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
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

      {/* Jobs Section */}
      <div className="space-y-4">
        {/* Header with Counter and Layout Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
          <div className="flex items-center space-x-2">
            <span>Mostrando <strong className="text-gray-900 dark:text-white">{filteredJobs.length}</strong> oportunidades activas</span>
            <span>•</span>
            <span>Ordenadas por coincidencia</span>
          </div>

          {/* View Mode Switcher: 3 por fila, 2 por fila, Lista */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-black/5 dark:border-white/5 self-start sm:self-auto">
            <button
              onClick={() => handleSetViewMode('grid3')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                viewMode === 'grid3'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Mostrar 3 ofertas por fila"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>3 por fila</span>
            </button>

            <button
              onClick={() => handleSetViewMode('grid2')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                viewMode === 'grid2'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Mostrar 2 ofertas por fila"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>2 por fila</span>
            </button>

            <button
              onClick={() => handleSetViewMode('list')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Mostrar 1 oferta por fila (Lista amplia)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
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
          <div className={
            viewMode === 'grid3'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : viewMode === 'grid2'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-3'
          }>
            {filteredJobs.map((job) => {
              const hasFit = job.fit_score !== null && job.fit_score !== undefined;
              const score = job.fit_score || 0;
              const isTopFit = score >= 85;
              const isGoodFit = score >= 70 && score < 85;
              const contactEmail = getJobContactEmail(job);
              const isLiked = Boolean(likedJobs[job.id]);
              const isCompact = viewMode === 'grid3' || viewMode === 'grid2';

              return (
                <div
                  key={job.id}
                  className={`apple-glass apple-card hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-200 group flex flex-col justify-between h-full ${
                    isCompact ? 'p-4 space-y-3' : 'p-5 space-y-3.5'
                  }`}
                >
                  {/* Card Content Area */}
                  <div className="space-y-2 flex-1">
                    {/* Top Row: Tags + Fit Score */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 tracking-wide">
                          {formatSource(job.source)}
                        </span>

                        {job.is_remote && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-1">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Remoto</span>
                          </span>
                        )}
                      </div>

                      {/* Score Pill / Button */}
                      {hasFit ? (
                        <button
                          onClick={() => handleEvaluate(job)}
                          className={`px-2.5 py-0.5 rounded-full flex items-center space-x-1 text-[11px] font-semibold transition ${
                            isTopFit
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : isGoodFit
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                          title="Haz clic para ver el desglose en 5 dimensiones"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{score}% Ajuste</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEvaluate(job)}
                          disabled={evaluatingJobId === job.id}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition flex items-center space-x-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                          <span>{evaluatingJobId === job.id ? '...' : 'Ajuste'}</span>
                        </button>
                      )}
                    </div>

                    {/* Job Title */}
                    <h3
                      className={`font-semibold text-gray-900 dark:text-white tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition ${
                        isCompact ? 'text-sm line-clamp-2' : 'text-base'
                      }`}
                      title={job.title}
                    >
                      {job.title}
                    </h3>

                    {/* Company, Location, Salary */}
                    <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-200">{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      {job.salary_range && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                            <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                            {job.salary_range}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Description preview */}
                    <p className={`text-xs text-gray-500 dark:text-gray-400 leading-relaxed pt-0.5 ${
                      isCompact ? 'line-clamp-2' : 'line-clamp-2'
                    }`}>
                      {job.description}
                    </p>

                    {/* Skill Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {job.tags.slice(0, isCompact ? 3 : 5).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100/70 dark:bg-zinc-800/60 text-gray-600 dark:text-gray-400 truncate max-w-[120px]"
                          >
                            {t}
                          </span>
                        ))}
                        {isCompact && job.tags.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                            +{job.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar (Anchored at Bottom) */}
                  <div className="border-t border-black/5 dark:border-white/5 pt-3 space-y-2 mt-auto">
                    
                    {/* Upper Action Row: Thumbs, Delete, Email chip, External Link */}
                    <div className="flex items-center justify-between gap-1 text-xs">
                      {/* Thumbs & Trash */}
                      <div className="flex items-center space-x-1.5">
                        {/* Thumb Up */}
                        <button
                          onClick={() => handleFeedback(job.id, 'like')}
                          title="Me interesa (enseña a la IA tus preferencias)"
                          className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
                            isLiked
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 shadow-xs'
                              : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-500/20' : ''}`} />
                          {!isCompact && <span>{isLiked ? 'Te interesa' : 'Me interesa'}</span>}
                        </button>

                        {/* Thumb Down */}
                        <button
                          onClick={() => handleFeedback(job.id, 'dislike')}
                          title="Descartar (descarta y enseña a la IA lo que no buscas)"
                          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-700 transition"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {!isCompact && <span>Descartar</span>}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          title="Eliminar esta oferta del radar"
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: Email chip & Web portal link */}
                      <div className="flex items-center space-x-1 max-w-[50%] justify-end">
                        {contactEmail && (
                          <div
                            title={`Correo de contacto detectado: ${contactEmail}`}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-medium border border-blue-200/50 dark:border-blue-900/40 truncate"
                          >
                            <Mail className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{contactEmail}</span>
                          </div>
                        )}
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver publicación original en portal web"
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Feedback message indicator if any */}
                    {feedbackMsg[job.id] && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium animate-fade-in truncate">
                        {feedbackMsg[job.id]}
                      </p>
                    )}

                    {/* Lower Action Row: Adapt CV & 1-Click Apply */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        onClick={() => onApply(job)}
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 transition"
                        title="Personalizar CV y carta de presentación con IA"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Adaptar CV</span>
                      </button>

                      <button
                        onClick={() => handleOneClickApply(job)}
                        disabled={applyingJobId === job.id}
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition disabled:opacity-50"
                        title={
                          contactEmail
                            ? `Generar correo de postulación prellenado a ${contactEmail}`
                            : 'Abrir portal original y registrar como postulado'
                        }
                      >
                        {contactEmail ? (
                          <>
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Email (1 Clic)</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Postular (1 Clic)</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
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
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  {selectedEvaluation.candidate_strengths.length > 0 ? (
                    selectedEvaluation.candidate_strengths.map((s, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-emerald-500">✓</span>
                        <span>{s}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400 text-xs">Sin fortalezas destacadas registradas.</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Habilidades / Brechas Faltantes:</span>
                </h5>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
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
                className="px-5 py-2 rounded-xl text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition"
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
