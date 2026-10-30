import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
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
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import type { JobPosting, FitEvaluation, CandidateProfile, RoleRecommendation, GeneratedATSQuery, CompanyDirectoryItem } from '../types';
import { api } from '../api';
import { formatDisplayDate, getOfferExpirationBadge } from '../utils/dateUtils';

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
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobPosting | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [likedJobs, setLikedJobs] = useState<Record<string, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<Record<string, string>>({});
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid3' | 'grid2' | 'list'>(() => {
    return (localStorage.getItem('job_radar_view_mode') as 'grid3' | 'grid2' | 'list') || 'grid3';
  });

  // Dynamic ATS & Intelligent Radar States (Sección 5 & 4 del Radar Inteligente)
  const [roleRecs, setRoleRecs] = useState<RoleRecommendation[]>([]);
  const [atsQueries, setAtsQueries] = useState<GeneratedATSQuery[]>([]);
  const [companies, setCompanies] = useState<CompanyDirectoryItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isExecutingATSQuery, setIsExecutingATSQuery] = useState<string | null>(null);
  const [showATSExplorer, setShowATSExplorer] = useState(false);
  const [showCompaniesCatalog, setShowCompaniesCatalog] = useState(false);
  const [selectedCompanyCountry, setSelectedCompanyCountry] = useState<string>('all');
  const [selectedCompanyIndustry, setSelectedCompanyIndustry] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');

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
      console.warn('Error cargando recomendaciones ATS:', e);
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
    } catch (e) {
      alert('Error recalculando roles: ' + e);
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
    } catch (e) {
      alert('Error actualizando rol: ' + e);
    }
  };

  const handleRunATSQuery = async (queryText: string) => {
    setIsExecutingATSQuery(queryText);
    try {
      const res = await api.scrapeCustomATSQuery(queryText);
      alert(res.message);
      onRefresh();
    } catch (e: any) {
      alert('Error ejecutando consulta ATS: ' + (e?.message || e));
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
      getonbrd: '🇨🇱 Get on Board',
      linkedin_chile: '🇨🇱 LinkedIn CL',
      computrabajo: '🇨🇱 CompuTrabajo',
      chiletrabajos: '🇨🇱 ChileTrabajos',
      laborum: '🇨🇱 Laborum',
      ats_greenhouse: '🏢 Greenhouse ATS',
      ats_lever: '🏢 Lever ATS',
      ats_ashby: '🏢 Ashby ATS',
      ats_workday: '🏢 Workday ATS',
      ats_smartrecruiters: '🏢 SmartRecruiters',
      ats_direct: '🏢 ATS Corporativo',
      remotive: '🌍 Remotive',
      arbeitnow: '🌍 Arbeitnow',
      remoteok: '🌍 RemoteOK',
      linkedin: '🌍 LinkedIn',
      url_import: '🔗 Importado'
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
      setFeedbackMsg(prev => ({
        ...prev,
        [job.id]: '✓ Guardada permanentemente en Seguimiento'
      }));
      setTimeout(() => {
        setFeedbackMsg(prev => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }, 4000);
      onRefresh();
    } catch (e: any) {
      alert('Error agregando a Seguimiento: ' + (e?.message || e));
    } finally {
      setTrackingJobId(null);
    }
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
        await api.sendFeedback(jobId, action);
        await api.deleteJob(jobId, 'radar');
        onRefresh();
      }
    } catch (e) {
      console.error('Error registrando feedback:', e);
    }
  };

  const handleOneClickApply = async (job: JobPosting) => {
    const email = getJobContactEmail(job);
    const candidateName = profile?.name || 'Candidato';
    const candidateEmail = profile?.email || '';
    const candidatePhone = profile?.phone || '';

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
      await api.trackJob(job.id);
      setFeedbackMsg(prev => ({
        ...prev,
        [job.id]: email
          ? '¡Correo abierto! Oferta guardada en Seguimiento (Pendiente de confirmación de envío).'
          : '¡Portal abierto! Oferta guardada en Seguimiento (Pendiente de confirmación de envío).'
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
      console.error('Error al registrar en seguimiento:', e);
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleDeleteFromRadar = async (jobId: string) => {
    try {
      await api.deleteJob(jobId, 'radar');
      onRefresh();
    } catch (e) {
      alert('Error eliminando empleo: ' + e);
    }
  };

  const handleClearAllRadar = async () => {
    if (!window.confirm('¿Deseas vaciar las ofertas del Radar? (Las ofertas agregadas a Seguimiento permanecerán seguras).')) return;
    try {
      await api.clearAllJobs();
      onRefresh();
    } catch (e) {
      alert('Error limpiando radar: ' + e);
    }
  };

  // Only display in radar if in_radar is true or not explicitly false
  const radarJobs = jobs.filter(j => j.in_radar !== false);

  const filteredJobs = radarJobs.filter(j => {
    const term = searchTerm.toLowerCase();
    const matchesTerm = !term || j.title.toLowerCase().includes(term) || j.company.toLowerCase().includes(term) || (j.tags && j.tags.some(t => t.toLowerCase().includes(term)));
    const matchesRemote = !remoteOnly || j.is_remote;
    return matchesTerm && matchesRemote;
  });

  return (
    <div className="space-y-6">
      
      {/* Control Banner & Autonomous Search */}
      <div className="apple-glass apple-card p-6 space-y-4">
        {/* Top Control Bar with ATS Explorer Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center space-x-2">
              <span>Radar Inteligente (Chile, ATS Corporativo & Global)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
                En vivo
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Rastreo simultáneo en portales chilenos, sistemas ATS corporativos (Workday, Greenhouse, Lever, Ashby) y vacantes remotas mundiales.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={() => setShowATSExplorer(!showATSExplorer)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                showATSExplorer
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100'
              }`}
              title="Explorar familias de roles y consultas inteligentes ATS inferidas de tu CV"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Estrategia ATS (CV)</span>
              {showATSExplorer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowCompaniesCatalog(!showCompaniesCatalog)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                showCompaniesCatalog
                  ? 'bg-zinc-800 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
              title="Ver catálogo de empresas y portales de contratación"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Directorio Empresas ({companies.length})</span>
            </button>

            <button
              onClick={handleBatchRank}
              disabled={isBatchRanking || filteredJobs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 transition disabled:opacity-50"
              title="Calcular ajuste dimensional de las mejores oportunidades"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isBatchRanking ? 'Evaluando...' : 'Clasificar con IA'}</span>
            </button>

            <button
              onClick={handleClearAllRadar}
              disabled={filteredJobs.length === 0}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 transition disabled:opacity-40"
              title="Vaciar las ofertas del radar (no borra las guardadas en Seguimiento)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Radar</span>
            </button>
          </div>
        </div>

        {/* ATS & Dynamic Roles Explorer Panel (Sección 5 del documento) */}
        {showATSExplorer && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-purple-50/60 dark:from-zinc-900/90 dark:via-zinc-900/60 dark:to-zinc-800/80 border border-blue-200/60 dark:border-blue-900/40 space-y-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Estrategia de Roles Dinámicos & Consultas ATS (Basado en tu CV)
                </h3>
              </div>
              <button
                onClick={handleRefreshRecommendations}
                disabled={isLoadingRecs}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-zinc-800 border border-black/5 hover:bg-gray-50 text-blue-600 transition"
                title="Recalcular análisis de roles contra tu CV"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRecs ? 'animate-spin' : ''}`} />
                <span>{isLoadingRecs ? 'Analizando CV...' : 'Re-analizar Roles'}</span>
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
              La IA infiere familias de cargos a partir de la evidencia demostrable en tu perfil, distinguiendo entre <strong>Coincidencia Directa</strong>, <strong>Transferencia de Habilidades</strong> y <strong>Oportunidades Exploratorias</strong>.
            </p>

            {/* Recommended Role Families Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isApproved
                        ? 'bg-white/80 dark:bg-zinc-800/80 border-blue-300 dark:border-blue-800 shadow-2xs'
                        : 'bg-gray-50/50 dark:bg-zinc-900/40 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${typeBadge.class}`}>
                          {typeBadge.label}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">{rec.seniority}</span>
                      </div>

                      <h4 className="font-bold text-gray-900 dark:text-white text-xs mt-1">
                        {rec.role_family}
                      </h4>

                      <div className="flex flex-wrap gap-1">
                        {rec.suggested_titles.map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300">
                            {t}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug pt-1">
                        {rec.reasoning}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] mt-2">
                      <span className="text-gray-500">
                        {isApproved ? '✓ Incluida en búsquedas' : '✗ Descartada'}
                      </span>
                      <button
                        onClick={() => handleToggleRecStatus(rec.id, rec.approved_by_user)}
                        className={`px-2 py-0.5 rounded-lg font-semibold transition ${
                          isApproved
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-blue-600 hover:bg-blue-50 font-bold'
                        }`}
                      >
                        {isApproved ? 'Descartar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generated ATS Queries Bar (Dorks listos para ejecutar) */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">
                Consultas Booleanas ATS Generadas (Google / DuckDuckGo Dorks):
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {atsQueries.slice(0, 4).map((q) => (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          {q.target_platform}
                        </span>
                        <span className="text-[10px] text-gray-400">• {q.role_family}</span>
                      </div>
                      <p className="font-mono text-[10px] text-gray-700 dark:text-gray-300 truncate" title={q.query_text}>
                        {q.query_text}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunATSQuery(q.query_text)}
                      disabled={isExecutingATSQuery === q.query_text}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] flex items-center space-x-1 shrink-0 transition disabled:opacity-50"
                      title="Ejecutar esta consulta directamente contra el ATS corporativo"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>{isExecutingATSQuery === q.query_text ? 'Rastreando...' : 'Buscar'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Companies Directory Catalog Panel (Sección 4 del documento) */}
        {showCompaniesCatalog && (
          <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-zinc-900/80 border border-black/5 dark:border-white/5 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Directorio de Empresas con Portales ATS ({companies.length} empleadores)
                </h3>
              </div>

              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <input
                  type="text"
                  placeholder="Filtrar empresa..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-black/5"
                />

                <select
                  value={selectedCompanyCountry}
                  onChange={(e) => setSelectedCompanyCountry(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-black/5"
                >
                  <option value="all">Todos los Países</option>
                  <option value="Chile">🇨🇱 Chile</option>
                  <option value="Internacional">🌍 Internacional</option>
                </select>

                <select
                  value={selectedCompanyIndustry}
                  onChange={(e) => setSelectedCompanyIndustry(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-black/5"
                >
                  <option value="all">Todas las Industrias</option>
                  <option value="Tecnología">Tecnología & Software</option>
                  <option value="Banca">Banca & Fintech</option>
                  <option value="Minería">Minería & Energía</option>
                  <option value="Retail">Retail & E-commerce</option>
                  <option value="Telecomunicaciones">Telecomunicaciones</option>
                  <option value="Inteligencia Artificial">IA & Big Tech</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
              {companies
                .filter(c => {
                  const matchSearch = !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase());
                  const matchCountry = selectedCompanyCountry === 'all' || c.country.toLowerCase() === selectedCompanyCountry.toLowerCase();
                  const matchIndustry = selectedCompanyIndustry === 'all' || c.industry.toLowerCase().includes(selectedCompanyIndustry.toLowerCase());
                  return matchSearch && matchCountry && matchIndustry;
                })
                .slice(0, 30)
                .map((comp) => (
                  <div
                    key={comp.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 flex items-center justify-between text-xs"
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
                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-700 transition"
                        title={`Ir al portal de empleo de ${comp.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Search Input, Filters & Scope selector */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cargo, tecnología o empresa (ej: Python, React, Data Engineer)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleScrape}
              disabled={isScraping}
              className="flex items-center justify-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 shrink-0"
            >
              <Globe className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
              <span>{isScraping ? 'Rastreando portales...' : 'Escanear Radar'}</span>
            </button>
          </div>

          {/* Scope & Remote Toggles */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSearchScope('all');
                  localStorage.setItem('job_radar_scope', 'all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  searchScope === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                🌐 Todos (Chile + Global)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchScope('chile');
                  localStorage.setItem('job_radar_scope', 'chile');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  searchScope === 'chile'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
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
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                🌍 Solo Global Remoto
              </button>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span className="text-xs">Solo empleos 100% remotos</span>
            </label>
          </div>
        </div>

        {/* Import URL bar */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5">
          <form onSubmit={handleImport} className="flex gap-2">
            <input
              type="url"
              placeholder="¿Viste una oferta en LinkedIn, Computrabajo, GetOnBoard u otro sitio? Pega el enlace aquí..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isImporting || !importUrl}
              className="px-4 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 transition disabled:opacity-50 shrink-0"
            >
              {isImporting ? 'Importando...' : 'Importar Oferta'}
            </button>
          </form>
          {importStatus && (
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 animate-fade-in">
              {importStatus}
            </p>
          )}
        </div>
      </div>

      {/* Results Header + View Mode Switcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Oportunidades en el Radar
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
              {filteredJobs.length} encontradas
            </span>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid3')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'grid3'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="3 columnas compactas"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>3 Cards</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('grid2')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'grid2'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="2 columnas"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>2 Cards</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Vista de lista"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {/* Job Cards */}
        {filteredJobs.length === 0 ? (
          <div className="apple-glass apple-card p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sin vacantes en el radar todavía</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Haz clic en "Escanear Radar" para buscar oportunidades en portales chilenos y globales, o pega la URL de una oferta que te interese.
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
              const tracked = isTracked(job);
              const isCompact = viewMode === 'grid3' || viewMode === 'grid2';
              const expirationBadge = getOfferExpirationBadge(job.deadline);

              return (
                <div
                  key={job.id}
                  className={`apple-glass apple-card hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-200 group flex flex-col justify-between h-full ${
                    isCompact ? 'p-4 space-y-3' : 'p-5 space-y-3.5'
                  }`}
                >
                  {/* Card Content Area */}
                  <div className="space-y-2.5 flex-1">
                    
                    {/* Top Row: Source, Remote tag, Expiration badge */}
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

                        {/* Expiration badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${expirationBadge.badgeClass}`}>
                          {expirationBadge.label}
                        </span>
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
                      className={`font-semibold text-gray-900 dark:text-white tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition cursor-pointer ${
                        isCompact ? 'text-sm line-clamp-2' : 'text-base'
                      }`}
                      onClick={() => setSelectedJobForDetail(job)}
                      title="Ver detalle completo de la oferta"
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

                    {/* Publication & Deadline Dates */}
                    <div className="flex items-center space-x-3 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>Publicado: <strong>{formatDisplayDate(job.posted_at)}</strong></span>
                      </span>
                      {job.deadline && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Cierre: <strong>{formatDisplayDate(job.deadline)}</strong></span>
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    <p className={`text-xs text-gray-500 dark:text-gray-400 leading-relaxed ${
                      isCompact ? 'line-clamp-2' : 'line-clamp-3'
                    }`}>
                      {job.description}
                    </p>

                    {/* Skill Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
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

                  {/* Bottom Action Bar */}
                  <div className="border-t border-black/5 dark:border-white/5 pt-3 space-y-2 mt-auto">
                    
                    {/* Upper row: Feedback, View Detail, Destination */}
                    <div className="flex items-center justify-between gap-1 text-xs">
                      {/* Thumbs & Trash */}
                      <div className="flex items-center space-x-1.5">
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
                        </button>

                        <button
                          onClick={() => handleFeedback(job.id, 'dislike')}
                          title="Descartar del radar"
                          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-700 transition"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteFromRadar(job.id)}
                          title="Eliminar esta oferta del radar"
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: Ver Detalle button & Direct links */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setSelectedJobForDetail(job)}
                          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                          title="Ver detalle completo de la oferta y requisitos"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>Detalle</span>
                        </button>

                        {contactEmail && (
                          <span
                            title={`Correo receptor: ${contactEmail}`}
                            className="p-1 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                          >
                            <Mail className="w-3 h-3" />
                          </span>
                        )}

                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver enlace original de postulación"
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Feedback message indicator */}
                    {feedbackMsg[job.id] && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium animate-fade-in truncate">
                        {feedbackMsg[job.id]}
                      </p>
                    )}

                    {/* Lower Action Row: + Seguimiento, Adaptar CV, 1-Click Apply */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      
                      {/* Action 1: Add to Tracking / In Tracking */}
                      <button
                        onClick={() => handleTrackJob(job)}
                        disabled={trackingJobId === job.id}
                        className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition ${
                          tracked
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100'
                            : 'border border-gray-200 dark:border-zinc-700 hover:border-blue-400 text-gray-700 dark:text-gray-200 hover:bg-blue-50/50 dark:hover:bg-zinc-800'
                        }`}
                        title={
                          tracked
                            ? 'Esta oferta ya está registrada en Seguimiento. Haz clic para ir al módulo.'
                            : 'Guardar oferta en Seguimiento de forma permanente'
                        }
                      >
                        {tracked ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate">Seguimiento</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                            <span className="truncate">+ Seguimiento</span>
                          </>
                        )}
                      </button>

                      {/* Action 2: Adapt CV */}
                      <button
                        onClick={() => onApply(job)}
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-medium border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 transition"
                        title="Personalizar CV y carta de presentación con IA"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Adaptar CV</span>
                      </button>

                      {/* Action 3: 1-Click Apply */}
                      <button
                        onClick={() => handleOneClickApply(job)}
                        disabled={applyingJobId === job.id}
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition disabled:opacity-50"
                        title={
                          contactEmail
                            ? `Generar correo de postulación a ${contactEmail}`
                            : 'Abrir portal de postulación y registrar en Seguimiento'
                        }
                      >
                        {contactEmail ? (
                          <>
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Email 1-Clic</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Postular</span>
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

      {/* Full Job Detail Modal */}
      {selectedJobForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    {formatSource(selectedJobForDetail.source)}
                  </span>
                  {selectedJobForDetail.is_remote && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      🌍 Remoto
                    </span>
                  )}
                  {(() => {
                    const b = getOfferExpirationBadge(selectedJobForDetail.deadline);
                    return (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.badgeClass}`}>
                        {b.label}
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
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
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700 dark:text-gray-300">
              
              {/* Dates & Method Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5">
                <div>
                  <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider block">Fecha de Publicación</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                    {formatDisplayDate(selectedJobForDetail.posted_at)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider block">Fecha Límite / Término</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                    {formatDisplayDate(selectedJobForDetail.deadline)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider block">Método de Postulación</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5 flex items-center space-x-1">
                    {getJobContactEmail(selectedJobForDetail) ? (
                      <>
                        <Mail className="w-3 h-3 text-blue-500" />
                        <span>Correo Electrónico</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span>Portal Web / Enlace</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {selectedJobForDetail.tags && selectedJobForDetail.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tecnologías y Palabras Clave</span>
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

              {/* Description */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descripción Completa del Cargo</span>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-black/5 dark:border-white/5 whitespace-pre-line leading-relaxed text-xs">
                  {selectedJobForDetail.description}
                </div>
              </div>

              {/* Destination links */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Destino de la Oferta</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {getJobContactEmail(selectedJobForDetail) ? (
                      <span>Correo receptor: <strong>{getJobContactEmail(selectedJobForDetail)}</strong></span>
                    ) : selectedJobForDetail.url ? (
                      <span className="truncate max-w-md block">{selectedJobForDetail.url}</span>
                    ) : (
                      <span>Sin enlace externo registrado</span>
                    )}
                  </p>
                </div>
                {selectedJobForDetail.url && (
                  <a
                    href={selectedJobForDetail.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-50 transition"
                  >
                    <span>Abrir en portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
              >
                Cerrar
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleTrackJob(selectedJobForDetail);
                  }}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isTracked(selectedJobForDetail)
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-white'
                  }`}
                >
                  {isTracked(selectedJobForDetail) ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>En Seguimiento</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Seguimiento</span>
                    </>
                  )}
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

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h5 className="font-semibold text-emerald-600 dark:text-emerald-400">Fortalezas Clave</h5>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {selectedEvaluation.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-semibold text-amber-600 dark:text-amber-400">Brechas Detectadas</h5>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {selectedEvaluation.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 space-y-1">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Acción Estratégica Recomendada:</span>
              <p className="text-xs text-blue-900 dark:text-blue-200">{selectedEvaluation.recommended_action}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
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
