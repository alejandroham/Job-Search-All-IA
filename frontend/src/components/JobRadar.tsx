import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  FileText,
  Briefcase,
  DollarSign,
  Trash2,
  Mail,
  Send,
  Eye,
  Columns,
  List,
  Calendar,
  Clock,
  BookmarkPlus,
  BookmarkCheck,
  Building2,
  Cpu,
  Target,
  RefreshCw,
  Play,
  X,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Check,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import type {
  JobPosting,
  FitEvaluation,
  CandidateProfile,
  RoleRecommendation,
  GeneratedATSQuery,
  CompanyDirectoryItem
} from '../types';
import { api } from '../api';
import { formatDisplayDate, getOfferExpirationBadge } from '../utils/dateUtils';
import { useToast } from './Toast';

interface JobRadarProps {
  jobs: JobPosting[];
  profile?: CandidateProfile | null;
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
  onNavigateToTracker?: () => void;
}

export const JobRadar: React.FC<JobRadarProps> = ({
  jobs,
  profile,
  onRefresh,
  onApply,
  onNavigateToTracker
}) => {
  const toast = useToast();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searchScope, setSearchScope] = useState<'global' | 'chile' | 'all'>(() => {
    return (localStorage.getItem('job_radar_scope') as 'global' | 'chile' | 'all') || 'all';
  });
  const [viewMode, setViewMode] = useState<'grid3' | 'grid2' | 'list'>(() => {
    return (localStorage.getItem('job_radar_view_mode') as 'grid3' | 'grid2' | 'list') || 'grid3';
  });

  // Action states
  const [isScraping, setIsScraping] = useState(false);
  const [isBatchRanking, setIsBatchRanking] = useState(false);
  const [evaluatingJobId, setEvaluatingJobId] = useState<string | null>(null);
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);

  // Modals & Panels
  const [selectedEvaluation, setSelectedEvaluation] = useState<FitEvaluation | null>(null);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobPosting | null>(null);
  const [showStrategyDrawer, setShowStrategyDrawer] = useState(false);
  const [strategyTab, setStrategyTab] = useState<'roles' | 'companies'>('roles');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Import URL Form
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // ATS & Companies Data
  const [roleRecs, setRoleRecs] = useState<RoleRecommendation[]>([]);
  const [atsQueries, setAtsQueries] = useState<GeneratedATSQuery[]>([]);
  const [companies, setCompanies] = useState<CompanyDirectoryItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isExecutingATSQuery, setIsExecutingATSQuery] = useState<string | null>(null);
  const [selectedCompanyCountry, setSelectedCompanyCountry] = useState<string>('all');
  const [selectedCompanyIndustry, setSelectedCompanyIndustry] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');

  // Close card menu on outside click
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuJobId(null);
      }
    };
    if (activeMenuJobId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenuJobId]);

  const loadATSData = async () => {
    try {
      const [recs, queries, comps] = await Promise.all([
        api.getRoleRecommendations(),
        api.getATSQueries(),
        api.getCompanies()
      ]);
      setRoleRecs(recs);
      setAtsQueries(queries);
      setCompanies(comps);
    } catch (e) {
      console.warn('Error cargando estrategia ATS:', e);
    }
  };

  useEffect(() => {
    loadATSData();
  }, []);

  const handleRefreshRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const recs = await api.getRoleRecommendations(true);
      setRoleRecs(recs);
      const queries = await api.getATSQueries();
      setAtsQueries(queries);
      toast.success('Estrategia de roles recalculada según tu CV');
    } catch (e: any) {
      toast.error('Error recalculando roles: ' + (e?.message || e));
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleToggleRecStatus = async (recId: string, currentStatus?: boolean | null) => {
    try {
      const next = currentStatus === true ? false : true;
      const updated = await api.updateRoleRecStatus(recId, next);
      setRoleRecs(prev => prev.map(r => r.id === recId ? updated : r));
      const queries = await api.getATSQueries();
      setAtsQueries(queries);
      toast.info(next ? 'Rol activado para búsquedas' : 'Rol descartado');
    } catch (e: any) {
      toast.error('Error actualizando rol: ' + (e?.message || e));
    }
  };

  const handleRunATSQuery = async (queryText: string) => {
    setIsExecutingATSQuery(queryText);
    try {
      const res = await api.scrapeCustomATSQuery(queryText);
      toast.success(res.message || 'Búsqueda ATS ejecutada');
      onRefresh();
    } catch (e: any) {
      toast.error('Error ejecutando consulta ATS: ' + (e?.message || e));
    } finally {
      setIsExecutingATSQuery(null);
    }
  };

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
      getonbrd: 'Get on Board',
      linkedin_chile: 'LinkedIn CL',
      computrabajo: 'CompuTrabajo',
      chiletrabajos: 'ChileTrabajos',
      laborum: 'Laborum',
      ats_greenhouse: 'Greenhouse',
      ats_lever: 'Lever',
      ats_ashby: 'Ashby',
      ats_workday: 'Workday',
      ats_smartrecruiters: 'SmartRecruiters',
      ats_direct: 'ATS Corporativo',
      remotive: 'Remotive',
      arbeitnow: 'Arbeitnow',
      remoteok: 'RemoteOK',
      linkedin: 'LinkedIn',
      url_import: 'Importado'
    };
    return map[src] || src;
  };

  const isTracked = (job: JobPosting): boolean => {
    return Boolean(job.tracked_at || (job.status && job.status !== 'discovered'));
  };

  const handleTrackJob = async (job: JobPosting) => {
    if (isTracked(job)) {
      if (onNavigateToTracker) {
        onNavigateToTracker();
      }
      return;
    }
    setTrackingJobId(job.id);
    try {
      await api.trackJob(job.id);
      toast.success('Guardada en Seguimiento', job.title);
      onRefresh();
    } catch (e: any) {
      toast.error('Error al guardar en Seguimiento: ' + (e?.message || e));
    } finally {
      setTrackingJobId(null);
    }
  };

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      await api.scrapeJobs(searchTerm, remoteOnly, searchScope);
      toast.success('Búsqueda completada con éxito');
      onRefresh();
    } catch (e: any) {
      toast.error('Error al escanear empleos: ' + (e?.message || e));
    } finally {
      setIsScraping(false);
    }
  };

  const handleBatchRank = async () => {
    setIsBatchRanking(true);
    try {
      await api.batchRank();
      toast.success('Oportunidades clasificadas con IA');
      onRefresh();
    } catch (e: any) {
      toast.error('Error al clasificar: ' + (e?.message || e));
    } finally {
      setIsBatchRanking(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setIsImporting(true);
    try {
      await api.importJobUrl(importUrl);
      setImportUrl('');
      setShowImportModal(false);
      toast.success('Oferta importada correctamente');
      onRefresh();
    } catch (err: any) {
      toast.error('Error importando oferta: ' + (err?.message || err));
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
    } catch (e: any) {
      toast.error('Error evaluando ajuste: ' + (e?.message || e));
    } finally {
      setEvaluatingJobId(null);
    }
  };

  const handleFeedback = async (jobId: string, action: 'like' | 'dislike') => {
    try {
      setActiveMenuJobId(null);
      if (action === 'like') {
        await api.sendFeedback(jobId, action);
        toast.success('Interés guardado. La IA priorizará vacantes afines.');
      } else {
        await api.sendFeedback(jobId, action);
        await api.deleteJob(jobId, 'radar');
        toast.info('Oferta descartada del radar');
        onRefresh();
      }
    } catch (e: any) {
      toast.error('Error registrando feedback: ' + (e?.message || e));
    }
  };

  const handleOneClickApply = async (job: JobPosting) => {
    const email = getJobContactEmail(job);
    const candidateName = profile?.name || 'Candidato';
    const candidateEmail = profile?.email || '';
    const candidatePhone = profile?.phone || '';

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
      await api.trackJob(job.id);
      toast.success('Portal abierto y oferta añadida a Seguimiento');
      onRefresh();
    } catch (e) {
      console.error('Error registrando en seguimiento:', e);
    }
  };

  const handleDeleteFromRadar = async (jobId: string) => {
    setActiveMenuJobId(null);
    try {
      await api.deleteJob(jobId, 'radar');
      toast.info('Oferta eliminada del radar');
      onRefresh();
    } catch (e: any) {
      toast.error('Error eliminando empleo: ' + (e?.message || e));
    }
  };

  const handleClearAllRadar = async () => {
    try {
      await api.clearAllJobs();
      setShowClearConfirm(false);
      toast.success('Radar vaciado con éxito');
      onRefresh();
    } catch (e: any) {
      toast.error('Error limpiando radar: ' + (e?.message || e));
    }
  };

  // Filter jobs
  const radarJobs = jobs.filter(j => j.in_radar !== false);
  const filteredJobs = radarJobs.filter(j => {
    const term = searchTerm.toLowerCase();
    const matchesTerm =
      !term ||
      j.title.toLowerCase().includes(term) ||
      j.company.toLowerCase().includes(term) ||
      (j.tags && j.tags.some(t => t.toLowerCase().includes(term)));
    const matchesRemote = !remoteOnly || j.is_remote;
    return matchesTerm && matchesRemote;
  });

  return (
    <div className="space-y-6">

      {/* Hero Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Radar de Empleo
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
              En vivo
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Explora ofertas recomendadas, portales chilenos y ATS corporativos analizados para tu perfil.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Strategy Drawer Trigger */}
          <button
            onClick={() => setShowStrategyDrawer(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-700/80 transition shadow-2xs"
            title="Estrategia de roles sugeridos y directorio de empresas"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            <span>Estrategia & ATS</span>
            {roleRecs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold">
                {roleRecs.length}
              </span>
            )}
          </button>

          {/* AI Batch Rank */}
          <button
            onClick={handleBatchRank}
            disabled={isBatchRanking || filteredJobs.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 hover:bg-purple-100/80 dark:hover:bg-purple-900/40 transition disabled:opacity-50 shadow-2xs"
            title="Evaluar ajuste de compatibilidad en lote con Inteligencia Artificial"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isBatchRanking ? 'animate-spin' : ''}`} />
            <span>{isBatchRanking ? 'Evaluando...' : 'Evaluar con IA'}</span>
          </button>

          {/* Import URL Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            title="Importar una oferta específica mediante su enlace"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar URL</span>
          </button>

          {/* Clear Radar Option */}
          {filteredJobs.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-zinc-800 transition"
              title="Vaciar ofertas del radar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Apple-grade Search & Filters Bar */}
      <div className="apple-glass apple-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Main search field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cargo, tecnología o empresa (ej: Senior Python, React, Data Engineer)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-gray-50/80 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Primary Scan Button */}
          <button
            onClick={handleScrape}
            disabled={isScraping}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 shrink-0"
          >
            <Globe className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Rastreando portales...' : 'Escanear Radar'}</span>
          </button>
        </div>

        {/* Filter Pill Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-gray-600 dark:text-gray-400">
          {/* Scope Segmented Control */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setSearchScope('all');
                localStorage.setItem('job_radar_scope', 'all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                searchScope === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🌐 Todos
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchScope('chile');
                localStorage.setItem('job_radar_scope', 'chile');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                searchScope === 'chile'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🇨🇱 Solo Chile
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchScope('global');
                localStorage.setItem('job_radar_scope', 'global');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                searchScope === 'global'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🌍 Remoto Global
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Remote checkbox */}
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span className="text-xs">Solo 100% Remoto</span>
            </label>

            {/* View layout modes */}
            <div className="hidden sm:flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid3')}
                className={`p-1 rounded-lg transition ${
                  viewMode === 'grid3'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="3 columnas"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('grid2')}
                className={`p-1 rounded-lg transition ${
                  viewMode === 'grid2'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="2 columnas"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`p-1 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500">
        <span>
          Mostrando <strong className="text-gray-900 dark:text-white">{filteredJobs.length}</strong> oportunidades
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {/* Main Job Feed */}
      {filteredJobs.length === 0 ? (
        <div className="apple-glass apple-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Sin vacantes en el radar todavía
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Haz clic en <strong>"Escanear Radar"</strong> para rastrear portales chilenos y bolsas de empleo globales, o importa el enlace de una oferta.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid3'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : viewMode === 'grid2'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-3'
          }
        >
          {filteredJobs.map((job) => {
            const hasFit = job.fit_score !== null && job.fit_score !== undefined;
            const score = job.fit_score || 0;
            const isTopFit = score >= 85;
            const isGoodFit = score >= 70 && score < 85;
            const contactEmail = getJobContactEmail(job);
            const tracked = isTracked(job);
            const expirationBadge = getOfferExpirationBadge(job.deadline);
            const isMenuOpen = activeMenuJobId === job.id;

            return (
              <div
                key={job.id}
                className="apple-glass apple-card hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-200 group flex flex-col justify-between p-5 space-y-3 relative"
              >
                {/* Content Top */}
                <div className="space-y-2 flex-1">
                  
                  {/* Meta Row: Company + Location and Fit Score Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-1">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white block truncate">
                        {job.company}
                      </span>
                      <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="truncate max-w-[140px]">{job.location}</span>
                        {job.is_remote && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Remoto</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Match Score Badge (Clickable for 5D Diagnostic) */}
                    {hasFit ? (
                      <button
                        onClick={() => handleEvaluate(job)}
                        className={`shrink-0 px-2.5 py-0.5 rounded-full flex items-center space-x-1 text-[11px] font-semibold transition ${
                          isTopFit
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : isGoodFit
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                        title="Ver diagnóstico dimensional de compatibilidad con tu CV"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{score}% Match</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEvaluate(job)}
                        disabled={evaluatingJobId === job.id}
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex items-center space-x-1"
                        title="Calcular ajuste con IA"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                        <span>{evaluatingJobId === job.id ? '...' : 'Evaluar'}</span>
                      </button>
                    )}
                  </div>

                  {/* Job Title (Click opens details) */}
                  <h3
                    onClick={() => setSelectedJobForDetail(job)}
                    className="font-semibold text-sm text-gray-900 dark:text-white tracking-tight line-clamp-2 cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                    title="Ver detalles completos de la oferta"
                  >
                    {job.title}
                  </h3>

                  {/* Salary & Expiration pills (compact) */}
                  <div className="flex items-center space-x-2 text-[10px] text-gray-500 flex-wrap gap-y-1">
                    {job.salary_range && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                        <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                        {job.salary_range}
                      </span>
                    )}

                    <span className="text-gray-400">
                      {formatDisplayDate(job.posted_at)}
                    </span>

                    {expirationBadge.label && (
                      <span className={`px-1.5 py-0.2 rounded-md font-medium ${expirationBadge.badgeClass}`}>
                        {expirationBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Clean 2-line description clamp */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 pt-0.5">
                    {job.description}
                  </p>

                  {/* Max 3 clean tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.tags.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100/70 dark:bg-zinc-800/60 text-gray-600 dark:text-gray-400 truncate max-w-[100px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apple HIG Clean Action Bar: 1 Dominant Action, 1 Secondary, 1 Overflow Menu */}
                <div className="border-t border-black/5 dark:border-white/5 pt-3 flex items-center justify-between gap-2 mt-auto">
                  
                  {/* Left: Secondary Action (+ Seguimiento / En Seguimiento) */}
                  <button
                    onClick={() => handleTrackJob(job)}
                    disabled={trackingJobId === job.id}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      tracked
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                        : 'border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                    title={tracked ? 'Oferta guardada. Haz clic para ir al Seguimiento.' : 'Guardar en Seguimiento'}
                  >
                    {tracked ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Guardada</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5 text-gray-400" />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>

                  {/* Right Actions: Primary Action + Overflow Context Menu */}
                  <div className="flex items-center space-x-1.5">
                    
                    {/* Primary Action Button (Apple Blue) */}
                    <button
                      onClick={() => handleOneClickApply(job)}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                      title={contactEmail ? `Enviar correo a ${contactEmail}` : 'Abrir portal de postulación'}
                    >
                      {contactEmail ? (
                        <>
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </>
                      ) : (
                        <>
                          <span>Postular</span>
                          <ExternalLink className="w-3 h-3" />
                        </>
                      )}
                    </button>

                    {/* Secondary Overflow Menu (•••) */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuJobId(isMenuOpen ? null : job.id)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                        title="Más opciones"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 bottom-full mb-1 z-30 w-44 apple-glass border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-1.5 space-y-0.5 text-xs bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl animate-fade-in"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuJobId(null);
                              onApply(job);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-800 dark:text-gray-200 hover:text-blue-600 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>Adaptar CV con IA</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuJobId(null);
                              setSelectedJobForDetail(job);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                            <span>Ver Detalle</span>
                          </button>

                          <button
                            onClick={() => handleFeedback(job.id, 'like')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-800 dark:text-gray-200 hover:text-emerald-600 transition"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Me interesa (Like)</span>
                          </button>

                          <button
                            onClick={() => handleFeedback(job.id, 'dislike')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-800 dark:text-gray-200 hover:text-rose-600 transition"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                            <span>Descartar oferta</span>
                          </button>

                          <div className="border-t border-black/5 dark:border-white/5 my-1" />

                          <button
                            onClick={() => handleDeleteFromRadar(job.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar del radar</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* STRATEGY & ATS SLIDE-OVER DRAWER (Progressive Disclosure) */}
      {showStrategyDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass bg-white/95 dark:bg-zinc-900/95 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-black/10 dark:border-white/10 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  <span>Estrategia de Búsqueda & Directorio ATS</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Herramientas avanzadas generadas por el agente a partir de tu perfil
                </p>
              </div>
              <button
                onClick={() => setShowStrategyDrawer(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Bar inside Drawer */}
            <div className="px-5 pt-3">
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs space-x-1">
                <button
                  onClick={() => setStrategyTab('roles')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                    strategyTab === 'roles'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🎯 Familias de Roles ({roleRecs.length})
                </button>
                <button
                  onClick={() => setStrategyTab('companies')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                    strategyTab === 'companies'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🏢 Directorio Empresas ({companies.length})
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* TAB 1: ROLES & ATS DORKS */}
              {strategyTab === 'roles' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      Roles inferidos con Inteligencia Artificial a partir de la evidencia demostrable en tu CV:
                    </p>
                    <button
                      onClick={handleRefreshRecommendations}
                      disabled={isLoadingRecs}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 transition shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingRecs ? 'animate-spin' : ''}`} />
                      <span>{isLoadingRecs ? 'Analizando...' : 'Recalcular'}</span>
                    </button>
                  </div>

                  {/* Role Cards */}
                  <div className="space-y-2.5">
                    {roleRecs.map((rec) => {
                      const isApproved = rec.approved_by_user !== false;
                      const typeBadge = {
                        direct: { label: 'Coincidencia Directa', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        transferable: { label: 'Habilidad Transferible', class: 'bg-blue-50 text-blue-700 border-blue-200' },
                        exploratory: { label: 'Exploratoria', class: 'bg-purple-50 text-purple-700 border-purple-200' }
                      }[rec.recommendation_type] || { label: rec.recommendation_type, class: 'bg-gray-100 text-gray-700 border-gray-200' };

                      return (
                        <div
                          key={rec.id}
                          className={`p-3.5 rounded-xl border transition ${
                            isApproved
                              ? 'bg-white dark:bg-zinc-800/80 border-blue-200 dark:border-blue-900 shadow-2xs'
                              : 'bg-gray-50/50 dark:bg-zinc-900/40 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${typeBadge.class}`}>
                              {typeBadge.label}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">{rec.seniority}</span>
                          </div>

                          <h4 className="font-bold text-gray-900 dark:text-white text-xs mt-1.5">
                            {rec.role_family}
                          </h4>

                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.suggested_titles.map((t, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300">
                                {t}
                              </span>
                            ))}
                          </div>

                          <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug pt-1.5">
                            {rec.reasoning}
                          </p>

                          <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">
                              {isApproved ? '✓ Incluida en búsquedas' : '✗ Descartada'}
                            </span>
                            <button
                              onClick={() => handleToggleRecStatus(rec.id, rec.approved_by_user)}
                              className={`px-2 py-0.5 rounded-lg font-semibold transition ${
                                isApproved ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {isApproved ? 'Descartar' : 'Activar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ATS Dorks Section */}
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Consultas Booleanas ATS Generadas (Google / DuckDuckGo Dorks)
                    </span>

                    <div className="space-y-2">
                      {atsQueries.map((q) => (
                        <div
                          key={q.id}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5 overflow-hidden">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                {q.target_platform}
                              </span>
                              <span className="text-[10px] text-gray-400">• {q.role_family}</span>
                            </div>
                            <p className="font-mono text-[10px] text-gray-600 dark:text-gray-300 truncate" title={q.query_text}>
                              {q.query_text}
                            </p>
                          </div>

                          <button
                            onClick={() => handleRunATSQuery(q.query_text)}
                            disabled={isExecutingATSQuery === q.query_text}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] flex items-center space-x-1 shrink-0 transition disabled:opacity-50"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>{isExecutingATSQuery === q.query_text ? 'Buscando...' : 'Buscar'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPANIES DIRECTORY */}
              {strategyTab === 'companies' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Filtrar empresa..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5"
                    />

                    <select
                      value={selectedCompanyCountry}
                      onChange={(e) => setSelectedCompanyCountry(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5"
                    >
                      <option value="all">Todos los Países</option>
                      <option value="Chile">🇨🇱 Chile</option>
                      <option value="Internacional">🌍 Internacional</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {companies
                      .filter(c => {
                        const matchSearch = !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase());
                        const matchCountry = selectedCompanyCountry === 'all' || c.country.toLowerCase() === selectedCompanyCountry.toLowerCase();
                        const matchIndustry = selectedCompanyIndustry === 'all' || c.industry.toLowerCase().includes(selectedCompanyIndustry.toLowerCase());
                        return matchSearch && matchCountry && matchIndustry;
                      })
                      .map((comp) => (
                        <div
                          key={comp.id}
                          className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white block">{comp.name}</span>
                            <div className="flex items-center space-x-1.5 text-[10px] text-gray-500">
                              <span>{comp.country === 'Chile' ? '🇨🇱 Chile' : '🌍 Global'}</span>
                              <span>•</span>
                              <span className="text-purple-600 dark:text-purple-400 font-medium">{comp.ats_platform || 'ATS Directo'}</span>
                            </div>
                          </div>

                          {comp.careers_url && (
                            <a
                              href={comp.careers_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-700 transition"
                            >
                              <span>Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MANUAL IMPORT URL MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-md w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Importar Oferta por URL</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Pega el enlace de una vacante encontrada en LinkedIn, Computrabajo, Get on Board u otro portal para analizarla con IA.
            </p>
            <form onSubmit={handleImport} className="space-y-3">
              <input
                type="url"
                required
                placeholder="https://..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                >
                  {isImporting ? 'Analizando...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR CONFIRM MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-sm w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">¿Vaciar ofertas del radar?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Las ofertas guardadas en tu módulo de Seguimiento permanecerán seguras.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAllRadar}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                Sí, vaciar radar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL JOB DETAIL MODAL */}
      {selectedJobForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl bg-white/95 dark:bg-zinc-900/95">
            
            {/* Header */}
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    {formatSource(selectedJobForDetail.source)}
                  </span>
                  {selectedJobForDetail.is_remote && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      🌍 Remoto
                    </span>
                  )}
                  {(() => {
                    const b = getOfferExpirationBadge(selectedJobForDetail.deadline);
                    return b.label ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.badgeClass}`}>
                        {b.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  {selectedJobForDetail.title}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedJobForDetail.company}</span>
                  <span>•</span>
                  <span>{selectedJobForDetail.location}</span>
                  {selectedJobForDetail.salary_range && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {selectedJobForDetail.salary_range}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-700 dark:text-gray-300">
              
              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descripción del Puesto</span>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 whitespace-pre-line leading-relaxed text-xs">
                  {selectedJobForDetail.description}
                </div>
              </div>

              {/* Tags */}
              {selectedJobForDetail.tags && selectedJobForDetail.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tecnologías Requeridas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJobForDetail.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
              >
                Cerrar
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTrackJob(selectedJobForDetail)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isTracked(selectedJobForDetail)
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 text-gray-800 dark:text-white'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{isTracked(selectedJobForDetail) ? 'En Seguimiento' : '+ Seguimiento'}</span>
                </button>

                <button
                  onClick={() => {
                    const j = selectedJobForDetail;
                    setSelectedJobForDetail(null);
                    onApply(j);
                  }}
                  className="flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-white transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Adaptar CV</span>
                </button>

                <button
                  onClick={() => {
                    const j = selectedJobForDetail;
                    handleOneClickApply(j);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Postular Ahora</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5D FIT EVALUATION MODAL */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 bg-white/95 dark:bg-zinc-900/95 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Diagnóstico de Ajuste (5 Dimensiones)
                </h3>
                <p className="text-xs text-gray-500">Evaluación imparcial de compatibilidad con tu perfil</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedEvaluation.overall_score}%
                </span>
                <p className="text-[11px] font-medium text-gray-500">{selectedEvaluation.verdict}</p>
              </div>
            </div>

            {/* Deal Breakers */}
            {selectedEvaluation.deal_breakers_found.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 space-y-1">
                <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Condición Excluyente Detectada:</span>
                </div>
                <ul className="list-disc list-inside text-xs text-rose-700 dark:text-rose-300">
                  {selectedEvaluation.deal_breakers_found.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimension Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Desglose Dimensional</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

            {/* Action Strategy */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 space-y-1">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Recomendación Estratégica:</span>
              <p className="text-xs text-blue-900 dark:text-blue-200">{selectedEvaluation.recommended_action}</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
