import React, { useState } from 'react';
import {
  Kanban,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Mail,
  FileText,
  Eye,
  Calendar,
  Globe,
  DollarSign,
  Copy,
  Download,
  Printer,
  Edit3,
  BookmarkCheck,
  Check,
  X,
  Send,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import type { JobPosting, ApplicationDraft, CandidateProfile, UpskillPlan } from '../types';
import { api } from '../api';
import { formatDisplayDate, getOfferExpirationBadge } from '../utils/dateUtils';

interface PipelineTrackerProps {
  jobs: JobPosting[];
  applications?: ApplicationDraft[];
  profile?: CandidateProfile | null;
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
}

type TabType = 'active' | 'offer' | 'rejected' | 'all';

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  jobs,
  applications = [],
  profile,
  onRefresh,
  onApply
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [viewJobModal, setViewJobModal] = useState<JobPosting | null>(null);
  const [viewCvModal, setViewCvModal] = useState<{ job: JobPosting; cvText: string } | null>(null);
  const [viewEmailModal, setViewEmailModal] = useState<JobPosting | null>(null);
  const [editStatusModal, setEditStatusModal] = useState<JobPosting | null>(null);
  const [classifyModal, setClassifyModal] = useState<JobPosting | null>(null);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<JobPosting | null>(null);
  const [latestPlan, setLatestPlan] = useState<UpskillPlan | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form edit states
  const [editStatusValue, setEditStatusValue] = useState<string>('saved');
  const [editAppliedDate, setEditAppliedDate] = useState<string>('');
  const [editUserNotes, setEditUserNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Email editor state
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);

  // Classify outcome modal state
  const [targetCategory, setTargetCategory] = useState<'offer' | 'rejected'>('offer');
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [feedbackDetails, setFeedbackDetails] = useState<string>('');
  const [isClassifying, setIsClassifying] = useState<boolean>(false);

  // Filter tracked jobs: either tracked_at is present or status != 'discovered'
  const trackedJobs = jobs.filter(j => Boolean(j.tracked_at || (j.status && j.status !== 'discovered')));

  // Counts
  const activeCount = trackedJobs.filter(j => ['saved', 'applied', 'interviewing', 'responded'].includes(j.status)).length;
  const offerCount = trackedJobs.filter(j => j.status === 'offer').length;
  const rejectedCount = trackedJobs.filter(j => j.status === 'rejected').length;
  const allCount = trackedJobs.length;

  // Filtered by tab
  const tabJobs = trackedJobs.filter(j => {
    if (activeTab === 'active') return ['saved', 'applied', 'interviewing', 'responded'].includes(j.status);
    if (activeTab === 'offer') return j.status === 'offer';
    if (activeTab === 'rejected') return j.status === 'rejected';
    return true;
  });

  // Search filter
  const displayedJobs = tabJobs.filter(j => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      j.title.toLowerCase().includes(term) ||
      j.company.toLowerCase().includes(term) ||
      j.location.toLowerCase().includes(term) ||
      (j.tags && j.tags.some(t => t.toLowerCase().includes(term)))
    );
  });

  // Helpers
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

  const getApplicationDraft = (jobId: string): ApplicationDraft | undefined => {
    return applications.find(a => a.job_id === jobId);
  };

  const getTailoredCvText = (job: JobPosting): string | null => {
    if (job.tailored_cv_markdown && job.tailored_cv_markdown.trim()) {
      return job.tailored_cv_markdown;
    }
    const app = getApplicationDraft(job.id);
    if (app && app.tailored_cv_markdown) {
      return app.tailored_cv_markdown;
    }
    return null;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open Edit Status Modal
  const openEditStatus = (job: JobPosting) => {
    setEditStatusModal(job);
    setEditStatusValue(job.status || 'saved');
    setEditAppliedDate(job.applied_date ? job.applied_date.substring(0, 10) : '');
    setEditUserNotes(job.user_notes || job.notes || '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStatusModal) return;
    setIsUpdating(true);
    try {
      await api.updateJob(editStatusModal.id, {
        status: editStatusValue as any,
        applied_date: editAppliedDate ? new Date(editAppliedDate).toISOString() : undefined,
        user_notes: editUserNotes
      });
      setEditStatusModal(null);
      onRefresh();
    } catch (e: any) {
      alert('Error actualizando postulación: ' + (e?.message || e));
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Email Modal
  const openEmailModal = (job: JobPosting) => {
    setViewEmailModal(job);
    const email = getJobContactEmail(job) || '';
    setEmailRecipient(email);
    const candidateName = profile?.name || 'Candidato';
    const defaultSubject = `Postulación: ${job.title} - ${candidateName}`;
    const defaultBody = 
      `Estimado equipo de selección de ${job.company},\n\n` +
      `Me pongo en contacto para presentar formalmente mi candidatura al cargo de ${job.title}.\n\n` +
      `Cuento con experiencia alineada a sus desafíos técnicos y gran motivación para sumarme a su equipo.\n\n` +
      `Adjunto mi currículum adaptado para su revisión y quedo a su total disposición para coordinar una entrevista.\n\n` +
      `Saludos cordiales,\n` +
      `${candidateName}\n` +
      `${profile?.email ? `Email: ${profile.email}\n` : ''}` +
      `${profile?.phone ? `Teléfono: ${profile.phone}\n` : ''}`;

    setEmailSubject(job.email_subject || defaultSubject);
    setEmailBody(job.email_body || defaultBody);
  };

  const handleSaveEmail = async () => {
    if (!viewEmailModal) return;
    setIsSavingEmail(true);
    try {
      await api.updateJob(viewEmailModal.id, {
        email_subject: emailSubject,
        email_body: emailBody,
        contact_email: emailRecipient
      });
      alert('Correo guardado correctamente.');
      onRefresh();
    } catch (e: any) {
      alert('Error guardando correo: ' + (e?.message || e));
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Open Classify Modal
  const openClassifyModal = (job: JobPosting, initialCategory: 'offer' | 'rejected') => {
    setClassifyModal(job);
    setTargetCategory(initialCategory);
    setOutcomeReason(job.outcome_reason || '');
    setFeedbackDetails(job.outcome_feedback || '');
  };

  const handleConfirmClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classifyModal) return;
    setIsClassifying(true);
    try {
      await api.classifyJob(classifyModal.id, {
        status: targetCategory,
        reason: outcomeReason,
        feedback: feedbackDetails
      });

      // If rejected, also trigger AI outcome process for upskilling if details given
      if (targetCategory === 'rejected') {
        try {
          const plan = await api.submitOutcome({
            job_id: classifyModal.id,
            status: 'rejected',
            was_successful: false,
            reason: outcomeReason,
            feedback_details: feedbackDetails
          });
          if (plan) {
            setLatestPlan(plan);
          }
        } catch {
          // ignore background plan error
        }
      }

      setClassifyModal(null);
      onRefresh();
    } catch (e: any) {
      alert('Error clasificando postulación: ' + (e?.message || e));
    } finally {
      setIsClassifying(false);
    }
  };

  const handleRevertToActive = async (job: JobPosting) => {
    if (!window.confirm(`¿Deseas reabrir esta postulación y moverla a "Postulaciones Activas"?`)) return;
    try {
      await api.classifyJob(job.id, {
        status: 'applied',
        reason: 'Reabierta por el usuario'
      });
      onRefresh();
    } catch (e: any) {
      alert('Error reabriendo postulación: ' + (e?.message || e));
    }
  };

  // Delete explicit confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirmJob) return;
    try {
      await api.deleteJob(deleteConfirmJob.id, 'tracker');
      setDeleteConfirmJob(null);
      onRefresh();
    } catch (e: any) {
      alert('Error al eliminar registro: ' + (e?.message || e));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'saved':
        return { label: 'Guardada / Pendiente', class: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'applied':
        return { label: 'CV Enviado / Postulado', class: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'interviewing':
        return { label: 'En Entrevistas', class: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'responded':
        return { label: 'Respondida / En Contacto', class: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'offer':
        return { label: '🏆 Oferta / Exitoso', class: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold' };
      case 'rejected':
        return { label: '📁 Cerrado / No Exitoso', class: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' };
      default:
        return { label: status, class: 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Module Header */}
      <div className="apple-glass apple-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center space-x-2">
              <Kanban className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Seguimiento de Postulaciones (Registro Permanente)</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Tus oportunidades guardadas se conservan protegidas de forma indefinida, junto con los CVs adaptados, correos redactados y estados de postulación.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              {allCount} Registros en Total
            </span>
          </div>
        </div>

        {/* Search bar & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/5">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>📋 Postulaciones Activas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'active' ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('offer')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                activeTab === 'offer'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Oferta / Exitoso</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'offer' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                {offerCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/30 hover:bg-red-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Cerrado / No Exitoso</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'rejected' ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/40'}`}>
                {rejectedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
                activeTab === 'all'
                  ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>📊 Todas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'}`}>
                {allCount}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Filtrar por cargo o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Jobs Listing */}
      {displayedJobs.length === 0 ? (
        <div className="apple-glass apple-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600">
            <Kanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {activeTab === 'offer'
              ? 'Aún no hay ofertas clasificadas como "Oferta / Exitoso"'
              : activeTab === 'rejected'
              ? 'No hay ofertas en "Cerrado / No Exitoso"'
              : activeTab === 'active'
              ? 'No tienes postulaciones activas en Seguimiento'
              : 'Sin registros en Seguimiento'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {activeTab === 'active'
              ? 'Dirígete al Radar de Búsqueda y presiona "+ Seguimiento" o "Postular" en las oportunidades que te interesen para monitorearlas aquí permanentemente.'
              : 'Las oportunidades clasificadas se conservarán en esta vista con sus documentos y notas asociadas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedJobs.map((job) => {
            const contactEmail = getJobContactEmail(job);
            const isEmailMethod = Boolean(contactEmail || job.application_method === 'email');
            const statusBadge = getStatusBadge(job.status);
            const expirationBadge = getOfferExpirationBadge(job.deadline);
            const tailoredCv = getTailoredCvText(job);
            const isFinalized = job.status === 'offer' || job.status === 'rejected';

            return (
              <div
                key={job.id}
                className={`apple-glass apple-card p-5 space-y-4 hover:border-blue-500/30 transition-all flex flex-col justify-between ${
                  job.status === 'offer'
                    ? 'border-emerald-400/40 dark:border-emerald-700/40 bg-emerald-50/10'
                    : job.status === 'rejected'
                    ? 'border-red-400/30 dark:border-red-800/30 bg-red-50/5'
                    : ''
                }`}
              >
                {/* Header Information */}
                <div className="space-y-2.5">
                  {/* Top Bar: Status Badge, Method Badge, Expiration Badge */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {/* Current Status Badge */}
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>

                      {/* Application Method Badge */}
                      {isEmailMethod ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center space-x-1">
                          <Mail className="w-2.5 h-2.5" />
                          <span>Vía Email</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 flex items-center space-x-1">
                          <Globe className="w-2.5 h-2.5" />
                          <span>Portal / Enlace</span>
                        </span>
                      )}

                      {/* Expiration badge */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${expirationBadge.badgeClass}`}>
                        {expirationBadge.label}
                      </span>
                    </div>

                    {/* Quick Edit Status button */}
                    <button
                      onClick={() => openEditStatus(job)}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 transition flex items-center space-x-1"
                      title="Actualizar estado, fecha de envío o notas"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  </div>

                  {/* Title and Company */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                      {job.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-0.5 flex-wrap">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      {job.is_remote && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Remoto</span>
                        </>
                      )}
                      {job.salary_range && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                            <DollarSign className="w-2.5 h-2.5" />
                            {job.salary_range}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Key Dates Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 text-[11px]">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-semibold">Publicación</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {formatDisplayDate(job.posted_at)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-semibold">Fecha Límite</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {formatDisplayDate(job.deadline)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-semibold">Fecha Postulado</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {job.applied_date ? formatDisplayDate(job.applied_date) : 'Pendiente'}
                      </span>
                    </div>
                  </div>

                  {/* User Notes Preview if any */}
                  {(job.user_notes || job.notes) && (
                    <div className="p-2.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-900/30 text-xs">
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Notas Personales</span>
                      <p className="text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">
                        {job.user_notes || job.notes}
                      </p>
                    </div>
                  )}

                  {/* Outcome Reason & Feedback if Finalized */}
                  {isFinalized && (job.outcome_reason || job.outcome_feedback) && (
                    <div className={`p-2.5 rounded-xl text-xs space-y-1 border ${
                      job.status === 'offer'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                        : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-200'
                    }`}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider block">
                        Detalle del Resultado ({job.status === 'offer' ? 'Oferta Aceptada / Formal' : 'Proceso Cerrado'})
                      </span>
                      {job.outcome_reason && <p className="font-medium">Motivo: {job.outcome_reason}</p>}
                      {job.outcome_feedback && <p className="text-[11px] opacity-90">Feedback: {job.outcome_feedback}</p>}
                    </div>
                  )}
                </div>

                {/* Actions Grid (Full Suite of Requirements) */}
                <div className="border-t border-black/5 dark:border-white/5 pt-3 space-y-2.5 mt-auto">
                  
                  {/* Action Row 1: Document Viewers (Ver Oferta, Ver CV, Ver Correo, Ver Destino) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    
                    {/* Action: Ver Oferta */}
                    <button
                      onClick={() => setViewJobModal(job)}
                      className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 transition"
                      title="Consultar requisitos y descripción completa"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">Ver Oferta</span>
                    </button>

                    {/* Action: Ver CV Adaptado */}
                    <button
                      onClick={() => {
                        if (tailoredCv) {
                          setViewCvModal({ job, cvText: tailoredCv });
                        } else {
                          onApply(job);
                        }
                      }}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl border transition ${
                        tailoredCv
                          ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200'
                      }`}
                      title={tailoredCv ? 'Ver CV adaptado para esta vacante' : 'Generar CV adaptado con IA'}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tailoredCv ? 'Ver CV' : 'Generar CV'}</span>
                    </button>

                    {/* Action: Ver Correo Generado */}
                    <button
                      onClick={() => openEmailModal(job)}
                      className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 transition"
                      title="Ver o redactar correo de postulación"
                    >
                      <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">Ver Correo</span>
                    </button>

                    {/* Action: Ver Destino / Postular */}
                    {isEmailMethod && contactEmail ? (
                      <button
                        onClick={() => openEmailModal(job)}
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 transition"
                        title={`Enviar a ${contactEmail}`}
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Destino Email</span>
                      </button>
                    ) : job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 transition"
                        title="Abrir enlace de postulación en pestaña nueva"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Ir al Portal</span>
                      </a>
                    ) : (
                      <span className="flex items-center justify-center py-1.5 px-2 rounded-xl text-gray-400 bg-gray-50 dark:bg-zinc-800 text-[11px]">
                        Sin destino
                      </span>
                    )}
                  </div>

                  {/* Action Row 2: Outcomes & Status Management */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    
                    {/* Outcome Classification / Reopen button */}
                    {!isFinalized ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => openClassifyModal(job, 'offer')}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition"
                          title="Clasificar como Oferta Aceptada / Exitoso"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Oferta / Exitoso</span>
                        </button>

                        <button
                          onClick={() => openClassifyModal(job, 'rejected')}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          title="Clasificar como Cerrado / No Exitoso"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Cerrar</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRevertToActive(job)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition"
                          title="Revertir y devolver a Postulaciones Activas"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                          <span>Reabrir Postulación</span>
                        </button>
                      </div>
                    )}

                    {/* Manual Delete with explicit confirmation */}
                    <button
                      onClick={() => setDeleteConfirmJob(job)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 transition"
                      title="Eliminar registro definitivamente de Seguimiento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Ver Oferta Completa */}
      {viewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  {viewJobModal.source}
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {viewJobModal.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewJobModal.company} • {viewJobModal.location}
                </p>
              </div>
              <button
                onClick={() => setViewJobModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-700 dark:text-gray-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Publicado</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDisplayDate(viewJobModal.posted_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Término</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDisplayDate(viewJobModal.deadline)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">En Seguimiento</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDisplayDate(viewJobModal.tracked_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Canal</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getJobContactEmail(viewJobModal) ? 'Correo' : 'Enlace Web'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Descripción y Requisitos</span>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/5 whitespace-pre-line leading-relaxed font-sans">
                  {viewJobModal.description}
                </div>
              </div>

              {viewJobModal.tags && viewJobModal.tags.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-1.5">Etiquetas</span>
                  <div className="flex flex-wrap gap-1">
                    {viewJobModal.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex justify-end space-x-2">
              <button
                onClick={() => setViewJobModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Ver Currículum Adaptado */}
      {viewCvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Currículum Adaptado para {viewCvModal.job.company}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cargo: {viewCvModal.job.title} • Versión preservada para esta postulación
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(viewCvModal.cvText, 'cv_modal')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'cv_modal' ? '¡Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  onClick={() => handleDownload(viewCvModal.cvText, `CV_${viewCvModal.job.company}.md`)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .md</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={() => setViewCvModal(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-mono bg-white dark:bg-zinc-950 p-6 rounded-xl border border-black/5 dark:border-white/5">
                {viewCvModal.cvText}
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex justify-end">
              <button
                onClick={() => setViewCvModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Ver & Editar Correo Generado */}
      {viewEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Correo de Postulación
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Empresa: {viewEmailModal.company} • Posición: {viewEmailModal.title}
                </p>
              </div>

              <button
                onClick={() => setViewEmailModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Correo Electrónico del Destinatario:
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Asunto del Correo:
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contenido del Mensaje:
                </label>
                <textarea
                  rows={10}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleCopy(`${emailSubject}\n\n${emailBody}`, 'email_content')}
                  className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'email_content' ? '¡Copiado!' : 'Copiar Texto'}</span>
                </button>

                {emailRecipient && (
                  <a
                    href={`mailto:${emailRecipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir en Cliente de Correo</span>
                  </a>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setViewEmailModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEmail}
                  disabled={isSavingEmail}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  {isSavingEmail ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Gestionar Estado, Fecha y Notas */}
      {editStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Gestionar Estado de Postulación
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editStatusModal.title} • {editStatusModal.company}
                </p>
              </div>
              <button
                onClick={() => setEditStatusModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Estado Actual:
                </label>
                <select
                  value={editStatusValue}
                  onChange={(e) => setEditStatusValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="saved">Guardada / Pendiente</option>
                  <option value="applied">CV Enviado / Postulado</option>
                  <option value="interviewing">En Entrevistas</option>
                  <option value="responded">Respondida / En Contacto</option>
                  <option value="offer">🏆 Oferta / Exitoso</option>
                  <option value="rejected">📁 Cerrado / No Exitoso</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Envío de Postulación:
                </label>
                <input
                  type="date"
                  value={editAppliedDate}
                  onChange={(e) => setEditAppliedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones / Notas Personales:
                </label>
                <textarea
                  rows={4}
                  value={editUserNotes}
                  onChange={(e) => setEditUserNotes(e.target.value)}
                  placeholder="Anota detalles de contactos, llamadas, fechas de entrevista o impresiones..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStatusModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  {isUpdating ? 'Actualizando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Clasificación Final del Resultado (Oferta / Exitoso vs Cerrado / No Exitoso) */}
      {classifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Clasificar Resultado Final del Proceso
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {classifyModal.title} en {classifyModal.company}
                </p>
              </div>
              <button
                onClick={() => setClassifyModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClassify} className="space-y-4 text-xs">
              
              {/* Category Radio selector */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Selecciona la Categoría de Destino:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetCategory('offer')}
                    className={`p-3 rounded-xl border text-left transition ${
                      targetCategory === 'offer'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Oferta / Exitoso</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      Postulante seleccionado o con oferta laboral formal.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCategory('rejected')}
                    className={`p-3 rounded-xl border text-left transition ${
                      targetCategory === 'rejected'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 ring-2 ring-red-500/20'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>Cerrado / No Exitoso</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      Rechazo, selección de otro candidato o cierre sin éxito.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Motivo principal:
                </label>
                <input
                  type="text"
                  value={outcomeReason}
                  onChange={(e) => setOutcomeReason(e.target.value)}
                  placeholder={
                    targetCategory === 'offer'
                      ? 'Ej: Excelente match técnico y propuesta salarial aceptada'
                      : 'Ej: Buscaban seniority específico en arquitectura Cloud o inglés bilingüe'
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones adicionales y feedback recibido:
                </label>
                <textarea
                  rows={3}
                  value={feedbackDetails}
                  onChange={(e) => setFeedbackDetails(e.target.value)}
                  placeholder="Anota lo que te comentaron los entrevistadores o las conclusiones del proceso..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <strong>Importante:</strong> Esta acción archivará la postulación en la categoría seleccionada, preservando todos sus documentos, CV adaptado, fechas e historial.
                </p>
                <p className="text-gray-500">
                  Podrás consultarla en cualquier momento o reabrirla si fue un error.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClassifyModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isClassifying}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition ${
                    targetCategory === 'offer' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isClassifying ? 'Guardando...' : 'Confirmar Clasificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Confirmación Explícita de Eliminación del Seguimiento */}
      {deleteConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-md w-full p-6 space-y-4 shadow-2xl border-red-500/20">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  ¿Eliminar del Seguimiento?
                </h3>
                <p className="text-xs text-gray-500">Esta acción es irreversible</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Estás a punto de eliminar permanentemente la postulación para <strong>{deleteConfirmJob.title}</strong> en <strong>{deleteConfirmJob.company}</strong>, incluyendo su currículum adaptado, correos redactados y notas de seguimiento.
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300">
              💡 Si el proceso terminó sin éxito, te recomendamos clasificarla como <strong>Cerrado / No Exitoso</strong> en vez de eliminarla, para conservar tu historial de postulaciones.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-xs"
              >
                Eliminar Registro Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Latest Upskill Plan Result if generated */}
      {latestPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Plan de Upskilling IA Generado
                </h3>
              </div>
              <button
                onClick={() => setLatestPlan(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              Basado en el resultado de tu postulación a <strong>{latestPlan.job_title}</strong> en <strong>{latestPlan.company}</strong>:
            </p>

            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200">
              <strong>Ajuste Estratégico:</strong> {latestPlan.strategy_adjustment}
            </div>

            {latestPlan.skill_gaps && latestPlan.skill_gaps.length > 0 && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Brechas Detectadas:</span>
                <div className="flex flex-wrap gap-1">
                  {latestPlan.skill_gaps.map((g, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setLatestPlan(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
