import React, { useState } from 'react';
import {
  Kanban,
  CheckCircle2,
  Clock,
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
  X,
  Send,
  RotateCcw,
  BookOpen,
  History,
  Plus,
  PhoneCall,
  Award,
  Code2,
  Check,
  CheckCircle,
  XCircle,
  Sparkles,
  BellRing,
  HelpCircle,
  FileCheck2,
  SendHorizontal
} from 'lucide-react';
import type { JobPosting, ApplicationDraft, CandidateProfile, UpskillPlan, TrackingHistoryEvent } from '../types';
import { api } from '../api';
import { formatDisplayDate, getOfferExpirationBadge } from '../utils/dateUtils';

interface PipelineTrackerProps {
  jobs: JobPosting[];
  applications?: ApplicationDraft[];
  profile?: CandidateProfile | null;
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
}

type MainPhase = 'prep' | 'sent' | 'outcome' | 'all';

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  jobs,
  applications = [],
  profile,
  onRefresh,
  onApply
}) => {
  const [mainPhase, setMainPhase] = useState<MainPhase>('prep');
  const [prepSubFilter, setPrepSubFilter] = useState<'all' | 'eval_pending' | 'eval_approved' | 'preparing' | 'ready_to_send' | 'eval_discarded'>('all');
  const [sentSubFilter, setSentSubFilter] = useState<'all' | 'applied_no_response' | 'contact_received' | 'interview' | 'in_evaluation' | 'final_stage'>('all');
  const [outcomeSubFilter, setOutcomeSubFilter] = useState<'all' | 'offer' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [viewJobModal, setViewJobModal] = useState<JobPosting | null>(null);
  const [viewCvModal, setViewCvModal] = useState<{ job: JobPosting; cvText: string } | null>(null);
  const [viewEmailModal, setViewEmailModal] = useState<JobPosting | null>(null);
  const [editStatusModal, setEditStatusModal] = useState<JobPosting | null>(null);
  const [classifyModal, setClassifyModal] = useState<JobPosting | null>(null);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<JobPosting | null>(null);
  const [historyModalJob, setHistoryModalJob] = useState<JobPosting | null>(null);
  const [evaluateModalJob, setEvaluateModalJob] = useState<JobPosting | null>(null);
  const [confirmSendModalJob, setConfirmSendModalJob] = useState<JobPosting | null>(null);
  const [latestPlan, setLatestPlan] = useState<UpskillPlan | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Evaluation Form state (Etapa 2)
  const [evalDecision, setEvalDecision] = useState<'eval_approved' | 'eval_pending' | 'eval_discarded'>('eval_approved');
  const [evalNotes, setEvalNotes] = useState('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  // Confirm Send Form state (Etapa 4)
  const [sendMethod, setSendMethod] = useState<'url' | 'email' | 'linkedin' | 'referral' | 'other'>('url');
  const [sendDate, setSendDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [sendProof, setSendProof] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [isSubmittingSend, setIsSubmittingSend] = useState(false);

  // Form edit states
  const [editStatusValue, setEditStatusValue] = useState<string>('eval_pending');
  const [editAppliedDate, setEditAppliedDate] = useState<string>('');
  const [editUserNotes, setEditUserNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Email editor state
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);

  // Classify outcome modal state (Etapa 6)
  const [targetCategory, setTargetCategory] = useState<'offer' | 'rejected'>('offer');
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [feedbackDetails, setFeedbackDetails] = useState<string>('');
  const [isClassifying, setIsClassifying] = useState<boolean>(false);

  // Add historical milestone state (Etapa 5)
  const [newEventType, setNewEventType] = useState<'interview' | 'interview_done' | 'contact_received' | 'technical_test' | 'final_stage' | 'note'>('interview');
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [newEventNotes, setNewEventNotes] = useState<string>('');
  const [newEventReminder, setNewEventReminder] = useState<string>('');
  const [isSavingEvent, setIsSavingEvent] = useState<boolean>(false);

  // All tracked jobs
  const trackedJobs = jobs.filter(j => Boolean(j.tracked_at || (j.status && j.status !== 'discovered')));

  // Normalization helper for legacy statuses
  const normalizeStatus = (status: string): string => {
    if (status === 'saved') return 'eval_pending';
    if (status === 'interviewing') return 'interview_scheduled';
    if (status === 'responded') return 'contact_received';
    return status;
  };

  // Phase classification
  const isPrepPhase = (status: string) => {
    const s = normalizeStatus(status);
    return ['eval_pending', 'eval_approved', 'eval_discarded', 'preparing', 'ready_to_send', 'pending_send'].includes(s);
  };

  const isSentPhase = (status: string) => {
    const s = normalizeStatus(status);
    return ['applied', 'applied_no_response', 'contact_received', 'interview_scheduled', 'interview_done', 'in_evaluation', 'final_stage'].includes(s);
  };

  const isOutcomePhase = (status: string) => {
    return status === 'offer' || status === 'rejected';
  };

  // Counts
  const prepJobsList = trackedJobs.filter(j => isPrepPhase(j.status));
  const sentJobsList = trackedJobs.filter(j => isSentPhase(j.status));
  const outcomeJobsList = trackedJobs.filter(j => isOutcomePhase(j.status));
  const allCount = trackedJobs.length;

  // Filtered by active phase and subfilter
  const phaseFilteredJobs = trackedJobs.filter(j => {
    const s = normalizeStatus(j.status);

    if (mainPhase === 'prep') {
      if (!isPrepPhase(j.status)) return false;
      if (prepSubFilter === 'eval_pending') return s === 'eval_pending';
      if (prepSubFilter === 'eval_approved') return s === 'eval_approved';
      if (prepSubFilter === 'preparing') return s === 'preparing';
      if (prepSubFilter === 'ready_to_send') return s === 'ready_to_send' || s === 'pending_send';
      if (prepSubFilter === 'eval_discarded') return s === 'eval_discarded';
      return true;
    }

    if (mainPhase === 'sent') {
      if (!isSentPhase(j.status)) return false;
      if (sentSubFilter === 'applied_no_response') return s === 'applied' || s === 'applied_no_response';
      if (sentSubFilter === 'contact_received') return s === 'contact_received';
      if (sentSubFilter === 'interview') return s === 'interview_scheduled' || s === 'interview_done';
      if (sentSubFilter === 'in_evaluation') return s === 'in_evaluation';
      if (sentSubFilter === 'final_stage') return s === 'final_stage';
      return true;
    }

    if (mainPhase === 'outcome') {
      if (!isOutcomePhase(j.status)) return false;
      if (outcomeSubFilter === 'offer') return j.status === 'offer';
      if (outcomeSubFilter === 'rejected') return j.status === 'rejected';
      return true;
    }

    return true;
  });

  // Search filter
  const displayedJobs = phaseFilteredJobs.filter(j => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      j.title.toLowerCase().includes(term) ||
      j.company.toLowerCase().includes(term) ||
      j.location.toLowerCase().includes(term) ||
      (j.evaluation_notes && j.evaluation_notes.toLowerCase().includes(term)) ||
      (j.user_notes && j.user_notes.toLowerCase().includes(term)) ||
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

  // Open Evaluation Modal (Etapa 2)
  const openEvaluateModal = (job: JobPosting) => {
    setEvaluateModalJob(job);
    const s = normalizeStatus(job.status);
    if (s === 'eval_discarded') setEvalDecision('eval_discarded');
    else if (s === 'eval_approved' || s === 'preparing' || s === 'ready_to_send') setEvalDecision('eval_approved');
    else setEvalDecision('eval_pending');
    setEvalNotes(job.evaluation_notes || job.user_notes || '');
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateModalJob) return;
    setIsSubmittingEval(true);
    try {
      const targetStatus = evalDecision;
      await api.updateJob(evaluateModalJob.id, {
        status: targetStatus as any,
        evaluation_notes: evalNotes.trim() || undefined
      });

      const titleMap = {
        eval_approved: 'Evaluación completada: Apta para postular',
        eval_discarded: 'Evaluada y Descartada antes de postular',
        eval_pending: 'Evaluación actualizada: Pendiente de decisión'
      };

      await api.addJobHistory(evaluateModalJob.id, {
        event_type: 'evaluation',
        title: titleMap[evalDecision],
        date: new Date().toISOString().substring(0, 10),
        notes: evalNotes.trim() || undefined
      });

      setEvaluateModalJob(null);
      onRefresh();
    } catch (e: any) {
      alert('Error guardando evaluación: ' + (e?.message || e));
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // Stage 3: Preparation actions
  const handleMarkAsReadyToSend = async (job: JobPosting) => {
    try {
      await api.updateJob(job.id, { status: 'ready_to_send' });
      await api.addJobHistory(job.id, {
        event_type: 'preparation',
        title: 'Documentos listos para enviar',
        date: new Date().toISOString().substring(0, 10),
        notes: 'CV adaptado, carta y correo revisados y listos para la postulación.'
      });
      onRefresh();
    } catch (e: any) {
      alert('Error al actualizar preparación: ' + (e?.message || e));
    }
  };

  // Stage 4: Open and Confirm Application Send Modal
  const openConfirmSendModal = (job: JobPosting) => {
    setConfirmSendModalJob(job);
    const email = getJobContactEmail(job);
    setSendMethod(email ? 'email' : 'url');
    setSendDate(new Date().toISOString().substring(0, 10));
    setSendProof('');
    setSendNotes('');
  };

  const handleConfirmSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmSendModalJob) return;
    setIsSubmittingSend(true);
    try {
      await api.updateJob(confirmSendModalJob.id, {
        status: 'applied',
        applied_date: sendDate,
        application_proof: sendProof.trim() || undefined,
        application_method: (sendMethod === 'email' ? 'email' : 'url')
      });

      const channelLabel = {
        url: 'Portal Web / Formulario de la Empresa',
        email: 'Correo Electrónico',
        linkedin: 'LinkedIn Easy Apply / Mensaje',
        referral: 'Contacto / Referido Interno',
        other: 'Otro Canal'
      }[sendMethod];

      await api.addJobHistory(confirmSendModalJob.id, {
        event_type: 'applied',
        title: `Candidatura enviada vía ${channelLabel}`,
        date: sendDate,
        notes: [
          sendProof ? `Comprobante / ID: ${sendProof}` : null,
          sendNotes ? `Detalles: ${sendNotes}` : null
        ].filter(Boolean).join(' | ') || 'Envío confirmado por el usuario.'
      });

      setConfirmSendModalJob(null);
      onRefresh();
    } catch (e: any) {
      alert('Error confirmando envío: ' + (e?.message || e));
    } finally {
      setIsSubmittingSend(false);
    }
  };

  // Open Edit Status Modal
  const openEditStatus = (job: JobPosting) => {
    setEditStatusModal(job);
    setEditStatusValue(normalizeStatus(job.status));
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

  // Open History / Timeline Modal (Etapa 5)
  const openHistoryModal = (job: JobPosting, defaultType?: 'interview' | 'contact_received') => {
    setHistoryModalJob(job);
    if (defaultType === 'interview') {
      setNewEventType('interview');
      setNewEventTitle('Entrevista Técnica / Rondas');
    } else if (defaultType === 'contact_received') {
      setNewEventType('contact_received');
      setNewEventTitle('Contacto recibido de la empresa');
    } else {
      setNewEventType('interview');
      setNewEventTitle('');
    }
    setNewEventDate(new Date().toISOString().substring(0, 10));
    setNewEventNotes('');
    setNewEventReminder('');
  };

  const handleAddHistoryEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyModalJob || !newEventTitle.trim()) return;
    setIsSavingEvent(true);
    try {
      const updatedJob = await api.addJobHistory(historyModalJob.id, {
        event_type: newEventType,
        title: newEventTitle.trim(),
        date: newEventDate,
        notes: newEventNotes.trim() || undefined
      });

      if (newEventReminder) {
        await api.updateJob(historyModalJob.id, {
          reminder_date: newEventReminder
        });
      }

      setHistoryModalJob(updatedJob);
      setNewEventTitle('');
      setNewEventNotes('');
      setNewEventReminder('');
      onRefresh();
    } catch (e: any) {
      alert('Error registrando evento histórico: ' + (e?.message || e));
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteHistoryEvent = async (jobId: string, eventId: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de la bitácora?')) return;
    try {
      const updatedJob = await api.deleteJobHistory(jobId, eventId);
      setHistoryModalJob(updatedJob);
      onRefresh();
    } catch (e: any) {
      alert('Error eliminando hito: ' + (e?.message || e));
    }
  };

  // Open Classify Modal (Etapa 6: Decisión)
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
    if (!window.confirm(`¿Deseas reabrir esta postulación y regresarla al seguimiento activo?`)) return;
    try {
      await api.classifyJob(job.id, {
        status: 'applied',
        reason: 'Reabierta manualmente por el usuario'
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
    const s = normalizeStatus(status);
    switch (s) {
      case 'eval_pending':
        return { label: 'Etapa 2: Pendiente de Revisión', class: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 font-semibold' };
      case 'eval_approved':
        return { label: 'Etapa 2: Apta para Postular', class: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold' };
      case 'eval_discarded':
        return { label: 'Descartada en Evaluación', class: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-zinc-700' };
      case 'preparing':
        return { label: 'Etapa 3: En Preparación de CV', class: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold' };
      case 'ready_to_send':
      case 'pending_send':
        return { label: 'Etapa 3: Lista para Enviar', class: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold' };
      case 'applied':
      case 'applied_no_response':
        return { label: 'Etapa 4/5: Enviada (Sin respuesta)', class: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold' };
      case 'contact_received':
        return { label: 'Etapa 5: Contacto Recibido', class: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold' };
      case 'interview_scheduled':
        return { label: 'Etapa 5: Entrevista Agendada', class: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-bold animate-pulse' };
      case 'interview_done':
        return { label: 'Etapa 5: Entrevista Realizada', class: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold' };
      case 'in_evaluation':
        return { label: 'Etapa 5: En Prueba Técnica / Test', class: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 font-bold' };
      case 'final_stage':
        return { label: 'Etapa 5: Etapa Final', class: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold' };
      case 'offer':
        return { label: '🏆 Oferta / Exitoso', class: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold' };
      case 'rejected':
        return { label: '📁 Cerrado / No Exitoso', class: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 font-medium' };
      default:
        return { label: status, class: 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700' };
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'interview':
      case 'interview_done':
        return <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'contact_received':
      case 'responded':
        return <PhoneCall className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'technical_test':
        return <Code2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'applied':
        return <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'offer':
        return <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'evaluation':
        return <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'preparation':
        return <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Module Header & Lifecycle Flow Guide */}
      <div className="apple-glass apple-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center space-x-2">
              <Kanban className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Gestión de Postulaciones (Flujo Lineal de 6 Etapas)</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              <strong>1. Radar</strong> → <strong>2. Evaluación</strong> → <strong>3. Preparación</strong> → <strong>4. Postulación</strong> → <strong>5. Seguimiento</strong> → <strong>6. Decisión</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              {allCount} Registros en Seguimiento
            </span>
          </div>
        </div>

        {/* Main Phase Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            
            {/* Phase 1: Pre-Postulación (Evaluación y Preparación) */}
            <button
              onClick={() => {
                setMainPhase('prep');
                setPrepSubFilter('all');
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                mainPhase === 'prep'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>📝 Pre-Postulación (Evaluación & Preparación)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mainPhase === 'prep' ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
                {prepJobsList.length}
              </span>
            </button>

            {/* Phase 2: Postuladas & Seguimiento */}
            <button
              onClick={() => {
                setMainPhase('sent');
                setSentSubFilter('all');
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                mainPhase === 'sent'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              <span>🚀 Candidaturas Enviadas (En Proceso)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mainPhase === 'sent' ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
                {sentJobsList.length}
              </span>
            </button>

            {/* Phase 3: Decisión y Resultados */}
            <button
              onClick={() => {
                setMainPhase('outcome');
                setOutcomeSubFilter('all');
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                mainPhase === 'outcome'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 hover:bg-emerald-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>🏁 Decisión & Resultados</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mainPhase === 'outcome' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                {outcomeJobsList.length}
              </span>
            </button>

            {/* View All */}
            <button
              onClick={() => setMainPhase('all')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 ${
                mainPhase === 'all'
                  ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>📊 Todas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mainPhase === 'all' ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'}`}>
                {allCount}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar por cargo, empresa, notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sub-Filters for Phase: Pre-Postulación */}
        {mainPhase === 'prep' && (
          <div className="flex items-center space-x-2 pt-2 border-t border-black/5 dark:border-white/5 flex-wrap gap-y-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Filtrar Pre-Postulación:
            </span>

            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs flex-wrap gap-y-1">
              <button
                onClick={() => setPrepSubFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  prepSubFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Todas ({prepJobsList.length})
              </button>

              <button
                onClick={() => setPrepSubFilter('eval_pending')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  prepSubFilter === 'eval_pending'
                    ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🟡 Pendientes de Revisión ({prepJobsList.filter(j => normalizeStatus(j.status) === 'eval_pending').length})
              </button>

              <button
                onClick={() => setPrepSubFilter('eval_approved')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  prepSubFilter === 'eval_approved'
                    ? 'bg-white dark:bg-zinc-700 text-blue-700 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🔵 Aptas para Postular ({prepJobsList.filter(j => normalizeStatus(j.status) === 'eval_approved').length})
              </button>

              <button
                onClick={() => setPrepSubFilter('preparing')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  prepSubFilter === 'preparing'
                    ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🟣 En Preparación CV ({prepJobsList.filter(j => normalizeStatus(j.status) === 'preparing').length})
              </button>

              <button
                onClick={() => setPrepSubFilter('ready_to_send')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  prepSubFilter === 'ready_to_send'
                    ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🟢 Listas para Enviar ({prepJobsList.filter(j => ['ready_to_send', 'pending_send'].includes(normalizeStatus(j.status))).length})
              </button>

              <button
                onClick={() => setPrepSubFilter('eval_discarded')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  prepSubFilter === 'eval_discarded'
                    ? 'bg-white dark:bg-zinc-700 text-gray-800 dark:text-gray-200 shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                ⚪ Descartadas en Evaluación ({prepJobsList.filter(j => normalizeStatus(j.status) === 'eval_discarded').length})
              </button>
            </div>
          </div>
        )}

        {/* Sub-Filters for Phase: Candidaturas Enviadas (Seguimiento Activo) */}
        {mainPhase === 'sent' && (
          <div className="flex items-center space-x-2 pt-2 border-t border-black/5 dark:border-white/5 flex-wrap gap-y-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Filtrar Seguimiento:
            </span>

            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs flex-wrap gap-y-1">
              <button
                onClick={() => setSentSubFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sentSubFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Todas Enviadas ({sentJobsList.length})
              </button>

              <button
                onClick={() => setSentSubFilter('applied_no_response')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sentSubFilter === 'applied_no_response'
                    ? 'bg-white dark:bg-zinc-700 text-blue-700 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                ✉️ Sin Respuesta ({sentJobsList.filter(j => ['applied', 'applied_no_response'].includes(normalizeStatus(j.status))).length})
              </button>

              <button
                onClick={() => setSentSubFilter('contact_received')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sentSubFilter === 'contact_received'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                📞 Contacto Recibido ({sentJobsList.filter(j => normalizeStatus(j.status) === 'contact_received').length})
              </button>

              <button
                onClick={() => setSentSubFilter('interview')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sentSubFilter === 'interview'
                    ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                👥 En Entrevistas ({sentJobsList.filter(j => ['interview_scheduled', 'interview_done'].includes(normalizeStatus(j.status))).length})
              </button>

              <button
                onClick={() => setSentSubFilter('in_evaluation')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sentSubFilter === 'in_evaluation'
                    ? 'bg-white dark:bg-zinc-700 text-cyan-700 dark:text-cyan-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                💻 Prueba Técnica ({sentJobsList.filter(j => normalizeStatus(j.status) === 'in_evaluation').length})
              </button>

              <button
                onClick={() => setSentSubFilter('final_stage')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sentSubFilter === 'final_stage'
                    ? 'bg-white dark:bg-zinc-700 text-rose-700 dark:text-rose-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🎯 Etapa Final ({sentJobsList.filter(j => normalizeStatus(j.status) === 'final_stage').length})
              </button>
            </div>
          </div>
        )}

        {/* Sub-Filters for Phase: Decisión y Resultados */}
        {mainPhase === 'outcome' && (
          <div className="flex items-center space-x-2 pt-2 border-t border-black/5 dark:border-white/5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Resultado:
            </span>

            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setOutcomeSubFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  outcomeSubFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Todas Concluidas ({outcomeJobsList.length})
              </button>

              <button
                onClick={() => setOutcomeSubFilter('offer')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  outcomeSubFilter === 'offer'
                    ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🏆 Oferta / Exitoso ({outcomeJobsList.filter(j => j.status === 'offer').length})
              </button>

              <button
                onClick={() => setOutcomeSubFilter('rejected')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  outcomeSubFilter === 'rejected'
                    ? 'bg-white dark:bg-zinc-700 text-red-700 dark:text-red-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                📁 Cerrado / No Exitoso ({outcomeJobsList.filter(j => j.status === 'rejected').length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Jobs Listing */}
      {displayedJobs.length === 0 ? (
        <div className="apple-glass apple-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600">
            <Kanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Sin postulaciones en esta vista
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {mainPhase === 'prep'
              ? 'Ve al Radar de Búsqueda y presiona "+ Seguimiento" para incorporar nuevas oportunidades y evaluarlas aquí.'
              : mainPhase === 'sent'
              ? 'Cuando envíes formalmente una postulación, confírmala para que comience su seguimiento de entrevistas y respuestas aquí.'
              : 'Las oportunidades concluidas con oferta formal o cerradas se conservarán en este registro de forma indefinida.'}
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
            const historyList = job.history || [];
            const latestEvent = historyList.length > 0 ? historyList[historyList.length - 1] : null;
            const normStatus = normalizeStatus(job.status);

            return (
              <div
                key={job.id}
                className={`apple-glass apple-card p-5 space-y-4 hover:border-blue-500/30 transition-all flex flex-col justify-between ${
                  job.status === 'offer'
                    ? 'border-emerald-400/40 dark:border-emerald-700/40 bg-emerald-50/10'
                    : job.status === 'rejected'
                    ? 'border-red-400/30 dark:border-red-800/30 bg-red-50/5'
                    : ['interview_scheduled', 'interview_done', 'in_evaluation'].includes(normStatus)
                    ? 'border-purple-300 dark:border-purple-900/60 bg-purple-50/5'
                    : normStatus === 'ready_to_send'
                    ? 'border-emerald-300 dark:border-emerald-800/40 bg-emerald-50/5'
                    : ''
                }`}
              >
                {/* Header Information */}
                <div className="space-y-2.5">
                  
                  {/* Top Bar: Status Badge, Method Badge, Expiration Badge */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {/* Current Status Badge */}
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${statusBadge.class}`}>
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
                      title="Editar estado, fechas o notas manuales"
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
                      <span className="text-gray-400 block text-[9px] uppercase font-semibold">
                        {job.applied_date ? 'Envío Confirmado' : 'Estado de Envío'}
                      </span>
                      <span className={`font-medium ${job.applied_date ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500'}`}>
                        {job.applied_date ? formatDisplayDate(job.applied_date) : 'Pendiente de envío'}
                      </span>
                    </div>
                  </div>

                  {/* Evaluation observations preview if in Etapa 2 */}
                  {job.evaluation_notes && (
                    <div className="p-2.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-xs">
                      <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                        Diagnóstico de Evaluación & Brechas
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">
                        {job.evaluation_notes}
                      </p>
                    </div>
                  )}

                  {/* Application proof preview if any */}
                  {job.application_proof && (
                    <div className="p-2 rounded-xl bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span><strong>Comprobante:</strong> {job.application_proof}</span>
                    </div>
                  )}

                  {/* Reminder pill if configured */}
                  {job.reminder_date && (
                    <div className="p-2 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/40 text-[11px] text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
                      <BellRing className="w-3.5 h-3.5 text-purple-600" />
                      <span><strong>Recordatorio de Follow-up:</strong> {formatDisplayDate(job.reminder_date)}</span>
                    </div>
                  )}

                  {/* Historical Log Preview / Recent Milestone */}
                  <div className="p-2.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                        <History className="w-3.5 h-3.5" />
                        <span>Historial del Proceso ({historyList.length} hitos)</span>
                      </div>
                      <button
                        onClick={() => openHistoryModal(job)}
                        className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Registrar Hito</span>
                      </button>
                    </div>

                    {latestEvent ? (
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-1 pt-0.5">
                        <strong>{latestEvent.date || formatDisplayDate(latestEvent.timestamp)}:</strong> {latestEvent.title} {latestEvent.notes ? `— "${latestEvent.notes}"` : ''}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">
                        Sin eventos registrados. Anota llamadas, entrevistas o avances en su bitácora.
                      </p>
                    )}
                  </div>

                  {/* Outcome details if finalized */}
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

                {/* Contextual Action Bars according to Stage */}
                <div className="border-t border-black/5 dark:border-white/5 pt-3 space-y-2.5 mt-auto">
                  
                  {/* Documents & Info bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    {/* View Job */}
                    <button
                      onClick={() => setViewJobModal(job)}
                      className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 transition"
                      title="Consultar requisitos y descripción completa"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">Ver Oferta</span>
                    </button>

                    {/* View/Generate CV */}
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

                    {/* View/Edit Email */}
                    <button
                      onClick={() => openEmailModal(job)}
                      className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 transition"
                      title="Ver o redactar correo de postulación"
                    >
                      <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">Ver Correo</span>
                    </button>

                    {/* External Destination Link (DOES NOT auto-mark as sent!) */}
                    {isEmailMethod && contactEmail ? (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 transition"
                        title="Abrir cliente de correo (no marca como enviada)"
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Abrir Correo</span>
                      </a>
                    ) : job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 transition"
                        title="Abrir portal de postulación (no marca como enviada)"
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

                  {/* Stage-Specific Workflow Bar */}
                  
                  {/* ETAPA 2: Evaluación (Decidir si postular) */}
                  {(normStatus === 'eval_pending' || normStatus === 'eval_discarded') && (
                    <div className="flex items-center justify-between gap-1.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs">
                      <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        Etapa 2: Decidir Postulación
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => openEvaluateModal(job)}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                          title="Registrar observaciones de ajuste y definir si es apta para postular"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Evaluar / Decidir</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ETAPA 3: Preparación (Personalizar CV y Correo) */}
                  {(normStatus === 'eval_approved' || normStatus === 'preparing') && (
                    <div className="flex items-center justify-between gap-1.5 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs">
                      <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">
                        Etapa 3: Personalizar Candidatura
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => onApply(job)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                        >
                          Adaptar CV/Carta
                        </button>

                        <button
                          onClick={() => handleMarkAsReadyToSend(job)}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                          title="Marcar como lista para enviar"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Listo para Enviar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ETAPA 4: Postulación (Lista para enviar / Confirmación real de envío) */}
                  {(normStatus === 'ready_to_send' || normStatus === 'pending_send') && (
                    <div className="flex items-center justify-between gap-1.5 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/50 text-xs">
                      <div>
                        <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-xs">
                          Etapa 4: Lista para Enviar
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Abre el canal y confirma cuando hayas enviado tu CV.
                        </span>
                      </div>

                      <button
                        onClick={() => openConfirmSendModal(job)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs shrink-0"
                        title="Registrar fecha, comprobante y confirmar envío formal"
                      >
                        <SendHorizontal className="w-3.5 h-3.5" />
                        <span>Confirmar Envío</span>
                      </button>
                    </div>
                  )}

                  {/* ETAPA 5: Seguimiento Activo (Postulada y en proceso) */}
                  {isSentPhase(job.status) && (
                    <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 text-xs flex-wrap">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                        Gestión de Proceso:
                      </span>

                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <button
                          onClick={() => openHistoryModal(job, 'contact_received')}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100"
                          title="Registrar que la empresa respondió"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Respuesta</span>
                        </button>

                        <button
                          onClick={() => openHistoryModal(job, 'interview')}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
                          title="Agendar o registrar entrevista"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Entrevista</span>
                        </button>

                        <button
                          onClick={() => openHistoryModal(job)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300"
                          title="Registrar prueba técnica u otro avance"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Hito</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ETAPA 6: Decisión y Conclusión */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
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
                          title="Revertir y devolver a Seguimiento Activo"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                          <span>Reabrir Postulación</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openHistoryModal(job)}
                        className="p-1.5 rounded-xl text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-zinc-800 transition"
                        title="Ver bitácora completa de eventos"
                      >
                        <History className="w-4 h-4" />
                      </button>

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

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ETAPA 2: Evaluación & Decisión de Postulación */}
      {evaluateModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-amber-600" />
                  <span>Etapa 2: Evaluación & Decisión</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {evaluateModalJob.title} en <strong>{evaluateModalJob.company}</strong>
                </p>
              </div>
              <button
                onClick={() => setEvaluateModalJob(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Decisión sobre esta Oportunidad:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEvalDecision('eval_approved')}
                    className={`p-3 rounded-xl border text-left transition ${
                      evalDecision === 'eval_approved'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span>Apta</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Cumple perfil; continuar a preparación de CV.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvalDecision('eval_pending')}
                    className={`p-3 rounded-xl border text-left transition ${
                      evalDecision === 'eval_pending'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Pendiente</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Analizar requisitos o consultar disponibilidad.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvalDecision('eval_discarded')}
                    className={`p-3 rounded-xl border text-left transition ${
                      evalDecision === 'eval_discarded'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 ring-2 ring-red-500/20'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Descartar</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">No postular (se conserva en histórico de descartadas).</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones, Brechas y Prioridades:
                </label>
                <textarea
                  rows={3}
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Ej: Cumplo 90% del stack, piden inglés conversacional B2, sueldo acorde, preparar viñetas de liderazgo..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEvaluateModalJob(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEval}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  {isSubmittingEval ? 'Guardando...' : 'Guardar Decisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ETAPA 4: Confirmación Explícita de Envío Real */}
      {confirmSendModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <SendHorizontal className="w-5 h-5 text-blue-600" />
                  <span>Etapa 4: Confirmar Envío de Postulación</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {confirmSendModalJob.title} en <strong>{confirmSendModalJob.company}</strong>
                </p>
              </div>
              <button
                onClick={() => setConfirmSendModalJob(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              El sistema nunca marca una postulación como enviada por el simple hecho de abrir un enlace. Confirma aquí que completaste y enviaste tu candidatura formalmente.
            </p>

            <form onSubmit={handleConfirmSendSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Canal Utilizado:
                  </label>
                  <select
                    value={sendMethod}
                    onChange={(e) => setSendMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="url">🌐 Portal Web / Formulario de la Empresa</option>
                    <option value="email">✉️ Correo Electrónico</option>
                    <option value="linkedin">💼 LinkedIn (Easy Apply / Mensaje)</option>
                    <option value="referral">👥 Referido / Contacto Interno</option>
                    <option value="other">Otro Canal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Envío:
                  </label>
                  <input
                    type="date"
                    value={sendDate}
                    onChange={(e) => setSendDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Comprobante o ID de Postulación (opcional):
                </label>
                <input
                  type="text"
                  value={sendProof}
                  onChange={(e) => setSendProof(e.target.value)}
                  placeholder="Ej: Número de ticket #49102, confirmación recibida por correo, etc."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones del Envío:
                </label>
                <textarea
                  rows={2}
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  placeholder="Anota si respondiste preguntas filtro, si adjuntaste portafolio o expectativas salariales indicadas..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSendModalJob(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSend}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  {isSubmittingSend ? 'Registrando...' : 'Confirmar Envío y Pasar a Seguimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ETAPA 5: Bitácora del Proceso & Cronología de Eventos */}
      {historyModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Bitácora Histórica del Proceso (Etapa 5)
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {historyModalJob.title} en <strong>{historyModalJob.company}</strong>
                </p>
              </div>

              <button
                onClick={() => setHistoryModalJob(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* Form to Register New Milestone */}
              <form onSubmit={handleAddHistoryEvent} className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                    <Plus className="w-4 h-4 text-purple-600" />
                    <span>Registrar Nuevo Hito en el Proceso</span>
                  </h4>
                  <span className="text-[10px] text-gray-500">Actualiza automáticamente el estado</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Tipo de Hito:
                    </label>
                    <select
                      value={newEventType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setNewEventType(val);
                        if (!newEventTitle) {
                          if (val === 'interview') setNewEventTitle('Entrevista Técnica / Rondas');
                          else if (val === 'contact_received') setNewEventTitle('Respuesta de la empresa (contacto inicial)');
                          else if (val === 'technical_test') setNewEventTitle('Prueba técnica / Challenge');
                          else if (val === 'final_stage') setNewEventTitle('Etapa Final / Negociación');
                          else setNewEventTitle('');
                        }
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="interview">👥 Entrevista Agendada / Rondas</option>
                      <option value="interview_done">👥 Entrevista Realizada</option>
                      <option value="contact_received">📞 Respuesta / Contacto de la empresa</option>
                      <option value="technical_test">💻 Prueba Técnica / Assessment</option>
                      <option value="final_stage">🎯 Etapa Final</option>
                      <option value="note">📝 Nota / Seguimiento continuo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Fecha del Hito:
                    </label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                    Título o Descripción del Hito:
                  </label>
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Ej: Entrevista técnica con Líder de Ingeniería, Prueba en HackerRank..."
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Notas y Observaciones (opcional):
                    </label>
                    <textarea
                      rows={2}
                      value={newEventNotes}
                      onChange={(e) => setNewEventNotes(e.target.value)}
                      placeholder="Detalla lo conversado, preguntas realizadas o pasos a seguir..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Programar Recordatorio / Follow-up (opcional):
                    </label>
                    <input
                      type="date"
                      value={newEventReminder}
                      onChange={(e) => setNewEventReminder(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Fecha para consultar estado si no responden.</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingEvent || !newEventTitle.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition shadow-xs disabled:opacity-50"
                  >
                    {isSavingEvent ? 'Guardando...' : 'Guardar Hito en Bitácora'}
                  </button>
                </div>
              </form>

              {/* Historical Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5 text-xs uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Cronología Completa del Proceso</span>
                </h4>

                {(!historyModalJob.history || historyModalJob.history.length === 0) ? (
                  <p className="text-gray-500 italic p-4 text-center">
                    No se han registrado eventos históricos para esta postulación aún.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-zinc-700">
                    {historyModalJob.history.map((event) => (
                      <div key={event.id} className="relative group">
                        
                        {/* Timeline Bullet */}
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-2 border-purple-500 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                        </div>

                        {/* Event Card */}
                        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              {getEventIcon(event.event_type)}
                              <span className="font-bold text-gray-900 dark:text-white text-xs">
                                {event.title}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                              <span>{event.date || formatDisplayDate(event.timestamp)}</span>
                              <button
                                onClick={() => handleDeleteHistoryEvent(historyModalJob.id, event.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                                title="Eliminar este evento"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {event.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line pt-0.5">
                              {event.notes}
                            </p>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-900/80 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Estado actual: <strong>{getStatusBadge(historyModalJob.status).label}</strong>
              </span>

              <button
                onClick={() => setHistoryModalJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200"
              >
                Cerrar Bitácora
              </button>
            </div>

          </div>
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

      {/* MODAL EDIT STATUS */}
      {editStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Editar Estado Manualmente
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
                  Estado en el Ciclo de Vida:
                </label>
                <select
                  value={editStatusValue}
                  onChange={(e) => setEditStatusValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <optgroup label="Etapa 2: Evaluación">
                    <option value="eval_pending">🟡 Pendiente de Revisión</option>
                    <option value="eval_approved">🔵 Apta para Postular</option>
                    <option value="eval_discarded">⚪ Descartada en Evaluación</option>
                  </optgroup>
                  <optgroup label="Etapa 3: Preparación">
                    <option value="preparing">🟣 En Preparación (CV / Correo)</option>
                    <option value="ready_to_send">🟢 Lista para Enviar</option>
                  </optgroup>
                  <optgroup label="Etapa 4/5: Postulación & Seguimiento">
                    <option value="applied">✉️ Enviada (Sin respuesta aún)</option>
                    <option value="contact_received">📞 Contacto Recibido</option>
                    <option value="interview_scheduled">👥 Entrevista Agendada</option>
                    <option value="interview_done">👥 Entrevista Realizada</option>
                    <option value="in_evaluation">💻 En Evaluación / Prueba Técnica</option>
                    <option value="final_stage">🎯 Etapa Final</option>
                  </optgroup>
                  <optgroup label="Etapa 6: Decisión">
                    <option value="offer">🏆 Oferta / Exitoso</option>
                    <option value="rejected">📁 Cerrado / No Exitoso</option>
                  </optgroup>
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

      {/* MODAL ETAPA 6: Clasificación Final del Resultado */}
      {classifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Clasificar Resultado Final del Proceso (Etapa 6)
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
                      Postulante seleccionado o con oferta laboral formal recibida.
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
                      Rechazo, contratación de otro candidato o cierre sin éxito.
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
                  <strong>Regla de Decisión:</strong> Las convocatorias que no responden o vencen nunca se cierran solas; el usuario decide cuándo archivar. Podrás reabrirla en cualquier momento si fue un error.
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

      {/* MODAL ELIMINAR REGISTRO */}
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

      {/* MODAL UPSKILL PLAN */}
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
