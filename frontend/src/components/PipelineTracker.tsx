import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  Printer,
  Copy,
  Download,
  Sparkles,
  ExternalLink,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  RefreshCw,
  Search,
  ChevronRight,
  MessageSquare,
  Award,
  ShieldCheck,
  Check,
  Building2,
  DollarSign,
  Plus,
  ArrowRight,
  SlidersHorizontal,
  BookmarkCheck,
  Layers,
  Sun,
  Moon,
  AlignJustify,
  AlignLeft,
  Star,
  Mic,
  Target
} from 'lucide-react';
import type {
  JobPosting,
  ApplicationDraft,
  CandidateProfile,
  TrackingHistoryEvent
} from '../types';
import { api } from '../api';
import { formatDisplayDate } from '../utils/dateUtils';
import { useToast } from './Toast';
import { formatExperiencePeriod } from './ProfileStudio';

interface PipelineTrackerProps {
  jobs: JobPosting[];
  applications?: ApplicationDraft[];
  profile?: CandidateProfile | null;
  onRefresh: () => void;
  onApply: (job: JobPosting) => void;
}

type FilterTab = 'all' | 'prep' | 'active' | 'outcome';
type DetailSection = 'documents' | 'interview' | 'timeline';

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  jobs,
  applications = [],
  profile,
  onRefresh,
  onApply
}) => {
  const toast = useToast();

  // Tracked jobs list
  const trackedJobs = jobs.filter(j => Boolean(j.tracked_at || (j.status && j.status !== 'discovered')));

  // Selected job
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    return trackedJobs.length > 0 ? trackedJobs[0].id : '';
  });

  // Ensure selectedJobId is valid
  useEffect(() => {
    if (trackedJobs.length > 0 && !trackedJobs.some(j => j.id === selectedJobId)) {
      setSelectedJobId(trackedJobs[0].id);
    }
  }, [trackedJobs, selectedJobId]);

  const selectedJob = trackedJobs.find(j => j.id === selectedJobId) || null;

  // Filter & Search states
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Active detail section
  const [activeSection, setActiveSection] = useState<DetailSection>('documents');

  // Document sub-tab (CV vs Cover Letter)
  const [docSubTab, setDocSubTab] = useState<'cv' | 'cover_letter'>('cv');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // CV Version & Template states (Multi-format in-line preview)
  const [selectedCVVersion, setSelectedCVVersion] = useState<string>('tailored');
  const [activeTemplate, setActiveTemplate] = useState<'modern' | 'classic_ats' | 'tech'>('modern');
  const [paperTheme, setPaperTheme] = useState<'white' | 'dark'>('white');
  const [textAlign, setTextAlign] = useState<'justify' | 'left'>('justify');

  // Loading states
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isLoadingPrep, setIsLoadingPrep] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Interview Prep Cache (per job)
  const [interviewPrepMap, setInterviewPrepMap] = useState<Record<string, any>>({});

  // Interactive Interview Simulator State
  const [simulatingQuestion, setSimulatingQuestion] = useState<string>('');
  const [simulatingCategory, setSimulatingCategory] = useState<'tech' | 'star'>('tech');
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState<boolean>(false);
  const [answerEvaluation, setAnswerEvaluation] = useState<any>(null);

  // Quick Note Form
  const [newNoteText, setNewNoteText] = useState('');

  // Confirm Delete Dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status mapping and category normalization
  const getStatusCategory = (status: string): 'prep' | 'active' | 'outcome' => {
    const prepStatuses = ['ready_to_send', 'preparing', 'eval_pending', 'eval_approved', 'pending_send', 'saved', 'discovered'];
    const outcomeStatuses = ['offer', 'rejected', 'archived', 'eval_discarded'];
    if (outcomeStatuses.includes(status)) return 'outcome';
    if (prepStatuses.includes(status)) return 'prep';
    return 'active';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'offer':
        return { label: 'Oferta Recibida 🎉', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' };
      case 'rejected':
      case 'eval_discarded':
        return { label: 'Proceso Finalizado', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' };
      case 'interview':
      case 'interview_scheduled':
      case 'interviewing':
      case 'interview_done':
      case 'final_stage':
        return { label: 'En Entrevistas 🎯', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' };
      case 'contact_received':
        return { label: 'Contacto Recibido 📞', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' };
      case 'applied':
      case 'applied_no_response':
        return { label: 'Enviada (En Espera) 🚀', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300' };
      case 'ready_to_send':
        return { label: 'CV Listo para Enviar 📝', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' };
      default:
        return { label: 'Por Preparar / En Revisión', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' };
    }
  };

  // Find associated application draft
  const currentDraft = selectedJob
    ? applications.find(a => a.job_id === selectedJob.id) || null
    : null;

  // Check if AI-tailored CV exists for selected job
  const hasTailoredCV = Boolean(currentDraft?.tailored_cv_markdown || selectedJob?.tailored_cv_markdown);
  const tailoredCVMarkdown = currentDraft?.tailored_cv_markdown || selectedJob?.tailored_cv_markdown || '';
  const currentCoverLetter = currentDraft?.cover_letter || selectedJob?.tailored_cover_letter || '';

  // Synchronize active CV version when selectedJob changes
  useEffect(() => {
    if (selectedJob) {
      const hasTailored = Boolean(currentDraft?.tailored_cv_markdown || selectedJob.tailored_cv_markdown);
      setSelectedCVVersion(hasTailored ? 'tailored' : 'master');
    }
  }, [selectedJob?.id, hasTailoredCV]);

  // Resolve effective profile for the selected version
  const getEffectiveProfileForView = (): CandidateProfile | null => {
    if (!profile) return null;
    if (selectedCVVersion === 'master' || selectedCVVersion === 'tailored') {
      return profile;
    }
    const customVer = (profile.versions || []).find(v => v.id === selectedCVVersion);
    if (!customVer) return profile;
    return {
      ...profile,
      headline: customVer.headline || profile.headline,
      summary: customVer.summary || profile.summary,
      technical_skills: customVer.selected_skills.length > 0 ? customVer.selected_skills : profile.technical_skills
    };
  };

  const generateMarkdownForProfile = (p: CandidateProfile): string => {
    let md = `# ${p.name}\n`;
    md += `**${p.headline}**\n\n`;
    md += `📍 ${p.location || 'Remoto'} | ✉️ ${p.email || ''} | 📞 ${p.phone || ''}\n`;
    if (p.linkedin_url) md += `LinkedIn: ${p.linkedin_url} | `;
    if (p.github_url) md += `GitHub: ${p.github_url}\n\n`;
    md += `## Perfil Profesional\n${p.summary}\n\n`;
    if (p.technical_skills && p.technical_skills.length > 0) {
      md += `## Competencias Técnicas\n${p.technical_skills.join(' • ')}\n\n`;
    }
    if (p.experiences && p.experiences.length > 0) {
      md += `## Experiencia Laboral\n`;
      p.experiences.forEach(exp => {
        md += `### ${exp.role} — ${exp.company}\n`;
        md += `*${formatExperiencePeriod(exp.start_date, exp.end_date)} | ${exp.location || 'Chile'}*\n`;
        if (exp.description) md += `${exp.description}\n`;
        if (exp.bullet_achievements) {
          exp.bullet_achievements.forEach(b => {
            const cleanB = b.replace(/^[*\-●•+]\s*/, '').trim();
            if (cleanB) md += `- ${cleanB}\n`;
          });
        }
        if (exp.technologies && exp.technologies.length > 0) {
          md += `**Tecnologías:** ${exp.technologies.join(', ')}\n`;
        }
        md += `\n`;
      });
    }
    if (p.education && p.education.length > 0) {
      md += `## Formación Académica\n`;
      p.education.forEach(edu => {
        md += `- **${edu.degree}**, ${edu.institution} ${edu.graduation_year ? `(${edu.graduation_year})` : ''}\n`;
      });
    }
    return md;
  };

  const getActiveDocumentText = (): string => {
    if (docSubTab === 'cover_letter') {
      return currentCoverLetter;
    }
    if (selectedCVVersion === 'tailored' && hasTailoredCV) {
      return tailoredCVMarkdown;
    }
    const eff = getEffectiveProfileForView();
    return eff ? generateMarkdownForProfile(eff) : tailoredCVMarkdown;
  };

  // Helper to parse inline markdown (**bold**, *italic*) and purge raw unformatted asterisks
  const renderFormattedInline = (raw: string, isDark: boolean) => {
    if (!raw) return null;
    const text = raw.trim();

    // Match **bold** or *italic*
    const tokens: { type: 'text' | 'bold' | 'italic'; value: string }[] = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        tokens.push({
          type: 'text',
          value: text.substring(lastIdx, match.index)
        });
      }
      if (match[2]) {
        tokens.push({ type: 'bold', value: match[2] });
      } else if (match[3]) {
        tokens.push({ type: 'italic', value: match[3] });
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      tokens.push({
        type: 'text',
        value: text.substring(lastIdx)
      });
    }

    return (
      <>
        {tokens.map((token, i) => {
          // Strip any accidental dangling asterisks or backticks
          const cleanVal = token.value.replace(/[*`]/g, '');
          if (token.type === 'bold') {
            return (
              <strong key={i} className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {cleanVal}
              </strong>
            );
          }
          if (token.type === 'italic') {
            return (
              <span key={i} className={`italic ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                {cleanVal}
              </span>
            );
          }
          return <span key={i}>{cleanVal}</span>;
        })}
      </>
    );
  };

  const renderVisualMarkdown = (markdown: string, template: 'modern' | 'classic_ats' | 'tech', theme: 'white' | 'dark' = 'white', alignment: 'justify' | 'left' = 'justify') => {
    const isDark = theme === 'dark';
    const lines = markdown.split('\n');
    let title = '';
    let subtitle = '';
    let contactInfo = '';
    const sections: { heading: string; lines: string[] }[] = [];
    let currentSection: { heading: string; lines: string[] } | null = null;
    let inHeader = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip standalone markdown horizontal divider lines (---, ***, ___)
      if (/^[-*_]{3,}$/.test(line)) {
        continue;
      }
      if (line.startsWith('# ') && !title) {
        title = line.substring(2).replace(/[*`#]/g, '').trim();
        continue;
      }
      if (inHeader && (line.startsWith('**') || line.includes('|') || line.includes('@') || line.includes('📍') || line.includes('📞') || line.includes('LinkedIn'))) {
        if (!subtitle && (line.startsWith('**') || (!line.includes('|') && !line.includes('@')))) {
          subtitle = line.replace(/[*`]/g, '').trim();
        } else if (!contactInfo) {
          contactInfo = line.replace(/[*`]/g, '').trim();
        }
        continue;
      }
      if (line.startsWith('## ')) {
        inHeader = false;
        if (currentSection) sections.push(currentSection);
        currentSection = { heading: line.substring(3).replace(/[*`#]/g, '').trim(), lines: [] };
        continue;
      }
      if (currentSection) {
        currentSection.lines.push(line);
      }
    }
    if (currentSection) sections.push(currentSection);

    return (
      <div className="space-y-6">
        {/* Header Block */}
        <div className={`pb-6 border-b ${
          template === 'modern'
            ? (isDark ? 'border-blue-400/40' : 'border-blue-500/30')
            : template === 'tech'
            ? (isDark ? 'border-blue-500/50' : 'border-blue-300')
            : (isDark ? 'border-zinc-700 border-b-2' : 'border-gray-900 border-b-2')
        } space-y-1.5`}>
          <h1 className={`text-2xl font-bold tracking-tight ${
            template === 'tech'
              ? (isDark ? 'font-mono text-white' : 'font-mono text-gray-900')
              : (isDark ? 'text-white' : 'text-gray-900')
          }`}>
            {title || profile?.name}
          </h1>
          {subtitle && (
            <p className={`text-sm font-semibold ${
              template === 'modern'
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : template === 'tech'
                ? (isDark ? 'font-mono text-blue-400' : 'font-mono text-blue-700')
                : (isDark ? 'text-zinc-200 uppercase text-xs tracking-wider' : 'text-gray-800 uppercase text-xs tracking-wider')
            }`}>
              {subtitle}
            </p>
          )}
          {contactInfo && (
            <p className={`text-xs pt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
              {contactInfo}
            </p>
          )}
        </div>

        {/* Sections */}
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className={`space-y-3 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'} last:border-b-0`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              template === 'modern'
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : template === 'tech'
                ? (isDark ? 'text-blue-400 font-mono border-b border-blue-500/40 pb-1' : 'text-blue-700 font-mono border-b border-blue-200 pb-1')
                : (isDark ? 'text-white border-b border-zinc-700 pb-1' : 'text-gray-900 border-b border-gray-900 pb-1')
            }`}>
              {sec.heading}
            </h2>

            <div className={`space-y-2 text-xs leading-relaxed ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
              {sec.lines.map((l, lIdx) => {
                // 1. Role or Subsection Header (### Role)
                if (l.startsWith('### ')) {
                  const headingContent = l.substring(4).replace(/[*`#]/g, '').trim();
                  return (
                    <h3 key={lIdx} className={`font-bold text-xs mt-3 pt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {headingContent}
                    </h3>
                  );
                }

                // 2. Dates & Location Metadata (e.g. *Enero 2026 – Octubre 2026 | Chile*)
                const cleanMetaCandidate = l.replace(/[*`]/g, '').trim();
                const isDateLocationLine =
                  (l.startsWith('*') && l.endsWith('*') && !l.includes('**')) ||
                  (cleanMetaCandidate.includes('|') && (
                    cleanMetaCandidate.includes('20') ||
                    cleanMetaCandidate.includes('19') ||
                    cleanMetaCandidate.toLowerCase().includes('presente') ||
                    cleanMetaCandidate.toLowerCase().includes('actualidad')
                  ));

                if (isDateLocationLine) {
                  return (
                    <p key={lIdx} className={`text-[11px] font-medium italic ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {cleanMetaCandidate}
                    </p>
                  );
                }

                // 3. Technologies line (e.g. *Tecnologías:* React, Node.js or **Tecnologías:** ...)
                if (/^(\*|\*)?(Tecnolog[ií]as|Herramientas|Tech Stack|Stack):?(\*|\*)?/i.test(l)) {
                  const techPart = l.replace(/^(\*|\*)?(Tecnolog[ií]as|Herramientas|Tech Stack|Stack):?(\*|\*)?\s*/i, '').replace(/[*`]/g, '').trim();
                  const techList = techPart.split(/[,•|]+/).map(t => t.trim()).filter(Boolean);
                  return (
                    <div key={lIdx} className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className={`text-[11px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Tecnologías:</span>
                      {techList.map((tech, ti) => (
                        <span
                          key={ti}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/80'
                              : 'bg-blue-50/80 text-blue-700 border border-blue-200/60'
                          }`}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  );
                }

                // 0. Horizontal rule divider (---, ***, ___)
                if (/^[-*_]{3,}$/.test(l.trim())) {
                  return (
                    <hr key={lIdx} className={`my-3 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`} />
                  );
                }

                // 4. Bullet Points (e.g. * logro, - logro, • logro, ● logro)
                if (/^[*\-●•+]\s+/.test(l)) {
                  const bulletContent = l.replace(/^[*\-●•+]\s+/, '').trim();
                  return (
                    <li key={lIdx} className={`list-disc list-inside ml-2 leading-snug text-left ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
                      {renderFormattedInline(bulletContent, isDark)}
                    </li>
                  );
                }

                // 5. Standard paragraph
                return (
                  <p key={lIdx} className={`leading-relaxed ${alignment === 'justify' ? 'formal-justify' : 'formal-left'}`}>
                    {renderFormattedInline(l, isDark)}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStructuredProfileVisual = (p: CandidateProfile, template: 'modern' | 'classic_ats' | 'tech', theme: 'white' | 'dark' = 'white', alignment: 'justify' | 'left' = 'justify') => {
    const isDark = theme === 'dark';
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className={`pb-6 border-b ${
          template === 'modern'
            ? (isDark ? 'border-blue-400/40' : 'border-blue-500/30')
            : template === 'tech'
            ? (isDark ? 'border-blue-500/50' : 'border-blue-300')
            : (isDark ? 'border-zinc-700 border-b-2' : 'border-gray-900 border-b-2')
        } space-y-1.5`}>
          <h1 className={`text-2xl font-bold tracking-tight ${
            template === 'tech'
              ? (isDark ? 'font-mono text-white' : 'font-mono text-gray-900')
              : (isDark ? 'text-white' : 'text-gray-900')
          }`}>
            {p.name}
          </h1>
          <p className={`text-sm font-semibold ${
            template === 'modern'
              ? (isDark ? 'text-blue-400' : 'text-blue-600')
              : template === 'tech'
              ? (isDark ? 'font-mono text-blue-400' : 'font-mono text-blue-700')
              : (isDark ? 'text-zinc-200 uppercase text-xs tracking-wider' : 'text-gray-800 uppercase text-xs tracking-wider')
          }`}>
            {p.headline}
          </p>
          <div className={`flex items-center space-x-3 text-xs flex-wrap gap-y-1 pt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            {p.location && <span>📍 {p.location}</span>}
            {p.email && <span>✉️ {p.email}</span>}
            {p.phone && <span>📞 {p.phone}</span>}
            {p.linkedin_url && <span>🔗 {p.linkedin_url.replace('https://', '')}</span>}
            {p.github_url && <span>💻 {p.github_url.replace('https://', '')}</span>}
          </div>
        </div>

        {/* Profile Summary */}
        {p.summary && (
          <div className={`space-y-2 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              template === 'modern'
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : template === 'tech'
                ? (isDark ? 'text-blue-400 font-mono border-b border-blue-500/40 pb-1' : 'text-blue-700 font-mono border-b border-blue-200 pb-1')
                : (isDark ? 'text-white border-b border-zinc-700 pb-1' : 'text-gray-900 border-b border-gray-900 pb-1')
            }`}>
              Perfil Profesional
            </h2>
            <p className={`text-xs leading-relaxed whitespace-pre-line ${alignment === 'justify' ? 'formal-justify' : 'formal-left'} ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
              {p.summary}
            </p>
          </div>
        )}

        {/* Technical Skills */}
        {p.technical_skills && p.technical_skills.length > 0 && (
          <div className={`space-y-2 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              template === 'modern'
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : template === 'tech'
                ? (isDark ? 'text-blue-400 font-mono border-b border-blue-500/40 pb-1' : 'text-blue-700 font-mono border-b border-blue-200 pb-1')
                : (isDark ? 'text-white border-b border-zinc-700 pb-1' : 'text-gray-900 border-b border-gray-900 pb-1')
            }`}>
              Competencias & Tecnologías
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {p.technical_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className={`text-[11px] px-2 py-0.5 rounded-md ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                      : template === 'tech'
                      ? 'bg-blue-50 text-blue-700 font-mono border border-blue-200'
                      : template === 'classic_ats'
                      ? 'bg-gray-100 text-gray-900 border border-gray-300'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {p.experiences && p.experiences.length > 0 && (
          <div className={`space-y-4 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              template === 'modern'
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : template === 'tech'
                ? (isDark ? 'text-blue-400 font-mono border-b border-blue-500/40 pb-1' : 'text-blue-700 font-mono border-b border-blue-200 pb-1')
                : (isDark ? 'text-white border-b border-zinc-700 pb-1' : 'text-gray-900 border-b border-gray-900 pb-1')
            }`}>
              Experiencia Laboral
            </h2>
            <div className="space-y-4">
              {p.experiences.map((exp) => (
                <div key={exp.id} className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>{exp.role}</h3>
                      <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{exp.company} • {exp.location}</p>
                    </div>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {formatExperiencePeriod(exp.start_date, exp.end_date)}
                    </span>
                  </div>

                  {exp.description && (
                    <p className={`text-xs leading-relaxed ${alignment === 'justify' ? 'formal-justify' : 'formal-left'} ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                      {exp.description}
                    </p>
                  )}

                  {exp.bullet_achievements && exp.bullet_achievements.length > 0 && (
                    <ul className={`list-disc list-inside space-y-1 text-xs pt-0.5 text-left ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                      {exp.bullet_achievements.map((bullet, i) => (
                        <li key={i} className="leading-snug text-left">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {p.education && p.education.length > 0 && (
          <div className="space-y-3">
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              template === 'modern'
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : template === 'tech'
                ? (isDark ? 'text-blue-400 font-mono border-b border-blue-500/40 pb-1' : 'text-blue-700 font-mono border-b border-blue-200 pb-1')
                : (isDark ? 'text-white border-b border-zinc-700 pb-1' : 'text-gray-900 border-b border-gray-900 pb-1')
            }`}>
              Formación Académica
            </h2>
            <div className="space-y-2">
              {p.education.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{edu.degree}</span>
                    <span className={isDark ? 'text-zinc-300' : 'text-gray-600'}> • {edu.institution}</span>
                  </div>
                  {edu.graduation_year && (
                    <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>{edu.graduation_year}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Filtered list
  const filteredTrackedJobs = trackedJobs.filter(job => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      job.title.toLowerCase().includes(term) ||
      job.company.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (filterTab === 'all') return true;
    return getStatusCategory(job.status) === filterTab;
  });

  // Action: Update status directly
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedJob) return;
    setIsUpdatingStatus(true);
    try {
      await api.updateJob(selectedJob.id, {
        status: newStatus as any,
        applied_date: newStatus === 'applied' && !selectedJob.applied_date ? new Date().toISOString() : selectedJob.applied_date
      });

      const eventTitles: Record<string, string> = {
        applied: 'Candidatura enviada formalmente',
        contact_received: 'Contacto recibido por el reclutador',
        interview_scheduled: 'Entrevista agendada',
        offer: '¡Oferta de empleo recibida!',
        rejected: 'Proceso finalizado por la empresa',
        ready_to_send: 'Documentación lista para enviar'
      };

      if (eventTitles[newStatus]) {
        await api.addJobHistory(selectedJob.id, {
          event_type: newStatus === 'offer' ? 'offer' : newStatus === 'rejected' ? 'rejected' : 'note',
          title: eventTitles[newStatus],
          date: new Date().toISOString().substring(0, 10)
        });
      }

      toast.success('Estado actualizado correctamente');
      onRefresh();
    } catch (e: any) {
      toast.error('Error actualizando estado: ' + (e?.message || e));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Action: Generate or Regenerate custom CV
  const handleGenerateDraft = async () => {
    if (!selectedJob) return;
    setIsGeneratingDoc(true);
    try {
      await onApply(selectedJob);
      toast.success('CV y carta adaptados con éxito');
      onRefresh();
    } catch (e: any) {
      toast.error('Error generando documentos: ' + (e?.message || e));
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Action: Load Interview Prep for this job
  const handleLoadInterviewPrep = async () => {
    if (!selectedJob) return;
    setIsLoadingPrep(true);
    try {
      const data = await api.getInterviewPrep(selectedJob.id);
      setInterviewPrepMap(prev => ({ ...prev, [selectedJob.id]: data }));
      if (data.technical_questions?.length > 0 && !simulatingQuestion) {
        setSimulatingQuestion(data.technical_questions[0].question);
        setSimulatingCategory('tech');
      }
      toast.success('Glosario de preguntas y tips cargado');
    } catch (e: any) {
      toast.error('Error cargando tips de entrevista: ' + (e?.message || e));
    } finally {
      setIsLoadingPrep(false);
    }
  };

  // Action: Evaluate Mock Answer with AI
  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatingQuestion || !candidateAnswer.trim()) return;
    setIsEvaluatingAnswer(true);
    try {
      const res = await api.evaluateInterviewAnswer(simulatingQuestion, candidateAnswer, selectedJob?.company);
      setAnswerEvaluation(res);
      toast.success('Respuesta evaluada con metodología STAR');
    } catch (err: any) {
      toast.error('Error al evaluar respuesta: ' + (err?.message || err));
    } finally {
      setIsEvaluatingAnswer(false);
    }
  };

  // Load interview prep automatically if switching to interview tab
  useEffect(() => {
    if (activeSection === 'interview' && selectedJob && !interviewPrepMap[selectedJob.id]) {
      handleLoadInterviewPrep();
    }
  }, [activeSection, selectedJob?.id]);

  // Action: Add note to history
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      await api.addJobHistory(selectedJob.id, {
        event_type: 'note',
        title: 'Nota de seguimiento',
        notes: newNoteText.trim(),
        date: new Date().toISOString().substring(0, 10)
      });
      setNewNoteText('');
      toast.success('Nota registrada en la bitácora');
      onRefresh();
    } catch (e: any) {
      toast.error('Error agregando nota: ' + (e?.message || e));
    } finally {
      setIsAddingNote(false);
    }
  };

  // Action: Delete from tracking
  const handleDeleteFromTracking = async () => {
    if (!selectedJob) return;
    try {
      await api.deleteJob(selectedJob.id, 'tracker');
      setShowDeleteConfirm(false);
      toast.info('Postulación eliminada del seguimiento');
      onRefresh();
    } catch (e: any) {
      toast.error('Error eliminando postulación: ' + (e?.message || e));
    }
  };

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Download markdown helper
  const handleDownloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.info(`Descargado ${filename}`);
  };

  // Print helper (Prints only .printable-cv cleanly)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Mis Postulaciones & Seguimiento
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Centro de control unificado: estado del proceso, CV adaptado listo para imprimir y glosario para la entrevista.
          </p>
        </div>

        {trackedJobs.length > 0 && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-semibold">
              {trackedJobs.length} ofertas en proceso
            </span>
          </div>
        )}
      </div>

      {trackedJobs.length === 0 ? (
        /* Empty State */
        <div className="apple-glass apple-card p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BookmarkCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              No tienes postulaciones en seguimiento aún
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Explora el <strong>Radar de Empleo</strong> y presiona <strong>"+ Guardar"</strong> o <strong>"Postular"</strong> en las ofertas que te interesen. Aparecerán aquí con su CV adaptado y preguntas de entrevista listas.
            </p>
          </div>
        </div>
      ) : (
        /* Master-Detail (Split View) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Clean List of Applications (Master) */}
          <div className="no-print lg:col-span-4 space-y-3">
            
            {/* Search input in list */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar por empresa o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-100/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter Tabs Pills */}
            <div className="flex bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs space-x-1">
              <button
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1 rounded-lg font-medium transition ${
                  filterTab === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterTab('prep')}
                className={`flex-1 py-1 rounded-lg font-medium transition ${
                  filterTab === 'prep'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Por Enviar
              </button>
              <button
                onClick={() => setFilterTab('active')}
                className={`flex-1 py-1 rounded-lg font-medium transition ${
                  filterTab === 'active'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                En Proceso
              </button>
              <button
                onClick={() => setFilterTab('outcome')}
                className={`flex-1 py-1 rounded-lg font-medium transition ${
                  filterTab === 'outcome'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Finalizadas
              </button>
            </div>

            {/* Applications List */}
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {filteredTrackedJobs.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">
                  No hay postulaciones en este filtro.
                </p>
              ) : (
                filteredTrackedJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  const statusInfo = getStatusInfo(job.status);
                  const hasDraft = Boolean(applications.some(a => a.job_id === job.id) || job.tailored_cv_markdown);

                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 border flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-800/90 border-blue-500/50 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-white/60 dark:bg-zinc-900/40 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                            {job.company}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-gray-900 dark:text-white tracking-tight mt-1 line-clamp-1">
                          {job.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-black/5 dark:border-white/5">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{job.applied_date ? `Enviada: ${formatDisplayDate(job.applied_date)}` : `Guardada`}</span>
                        </span>

                        {hasDraft ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
                            <Check className="w-3 h-3" />
                            <span>CV Listo</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">Sin CV adaptado</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Ficha Individual 360° (Detail) */}
          {selectedJob ? (
            <div className="lg:col-span-8 space-y-4">

              {/* CARD HEADER: Job Profile, Direct Status Selector, Links */}
              <div className="no-print apple-glass apple-card p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">
                        {selectedJob.company}
                      </span>
                      <span>•</span>
                      <span className="text-xs text-gray-500">{selectedJob.location}</span>
                      {selectedJob.is_remote && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Remoto
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
                      {selectedJob.title}
                    </h2>
                  </div>

                  {/* Actions & Links */}
                  <div className="flex items-center space-x-2 self-start sm:self-center">
                    {selectedJob.url && (
                      <a
                        href={selectedJob.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                      >
                        <span>Ver Oferta</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-zinc-800 transition"
                      title="Quitar de mis postulaciones"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* STATUS BAR: Direct 1-Click State Changer */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-medium">Estado actual:</span>
                    <select
                      value={selectedJob.status}
                      disabled={isUpdatingStatus}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <optgroup label="Fase 1: Preparación">
                        <option value="eval_pending">Por preparar documentos</option>
                        <option value="ready_to_send">Documentos listos para enviar</option>
                      </optgroup>
                      <optgroup label="Fase 2: Enviada / Espera">
                        <option value="applied">Postulación enviada (esperando respuesta)</option>
                        <option value="contact_received">Contacto recibido por reclutador</option>
                      </optgroup>
                      <optgroup label="Fase 3: Entrevistas">
                        <option value="interview_scheduled">Entrevista agendada</option>
                        <option value="interview_done">Entrevista realizada (esperando feedback)</option>
                        <option value="final_stage">Etapa final / Terna</option>
                      </optgroup>
                      <optgroup label="Fase 4: Desenlace">
                        <option value="offer">🎉 Oferta Recibida</option>
                        <option value="rejected">❌ Proceso Finalizado / Descartada</option>
                      </optgroup>
                    </select>
                  </div>

                  {selectedJob.applied_date && (
                    <span className="text-[11px] text-gray-500">
                      Enviada el: <strong>{formatDisplayDate(selectedJob.applied_date)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* THREE MAIN TABS: 1) Documentos (CV/Carta/PDF), 2) Tips Entrevista, 3) Bitácora */}
              <div className="no-print flex items-center bg-gray-200/60 dark:bg-zinc-800/60 p-1 rounded-2xl border border-black/5 dark:border-white/5 space-x-1 text-xs font-semibold">
                <button
                  onClick={() => setActiveSection('documents')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition ${
                    activeSection === 'documents'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documentos a Enviar (CV & Carta)</span>
                </button>

                <button
                  onClick={() => setActiveSection('interview')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition ${
                    activeSection === 'interview'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>🎯 Coach & Simulador STAR</span>
                </button>

                <button
                  onClick={() => setActiveSection('timeline')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition ${
                    activeSection === 'timeline'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Bitácora & Notas</span>
                </button>
              </div>

              {/* =========================================================
                  SECTION 1: DOCUMENTOS A ENVIAR (CV, CARTA & IMPRESIÓN PDF)
                  ========================================================= */}
              {activeSection === 'documents' && (
                <div className="space-y-4">
                  
                  {/* Document Controls & Format Toolbar */}
                  <div className="no-print apple-glass apple-card p-4 space-y-3">
                    
                    {/* Top Row: Sub-tab switcher + Export actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
                      
                      {/* Sub tab: CV vs Cover letter */}
                      <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs space-x-1">
                        <button
                          onClick={() => setDocSubTab('cv')}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                            docSubTab === 'cv'
                              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Currículum Vitae</span>
                        </button>
                        <button
                          onClick={() => setDocSubTab('cover_letter')}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                            docSubTab === 'cover_letter'
                              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Carta de Presentación</span>
                        </button>
                      </div>

                      {/* Export & Print Actions */}
                      <div className="flex items-center space-x-2">
                        {/* Adapt with AI button */}
                        <button
                          onClick={handleGenerateDraft}
                          disabled={isGeneratingDoc}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100 transition disabled:opacity-50"
                          title="Analizar oferta con Gemini y adaptar CV y carta automáticamente"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDoc ? 'animate-spin' : ''}`} />
                          <span>{isGeneratingDoc ? 'Adaptando con IA...' : hasTailoredCV ? 'Re-adaptar con IA' : '✨ Adaptar con IA'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const content = getActiveDocumentText();
                            handleCopyText(content, docSubTab);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedKey === docSubTab ? '¡Copiado!' : 'Copiar'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const content = getActiveDocumentText();
                            handleDownloadMarkdown(content, `${selectedJob.company}_${docSubTab}_${selectedCVVersion}.md`);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar</span>
                        </button>

                        {/* PRIMARY ACTION: IMPRIMIR / PDF */}
                        <button
                          onClick={handlePrint}
                          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                          title="Imprimir documento o guardar como archivo PDF en formato A4 limpio"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir / PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Version & Template Selectors (When viewing CV) */}
                    {docSubTab === 'cv' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                        
                        {/* CV Version Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <span>Versión de CV:</span>
                          </span>
                          <select
                            value={selectedCVVersion}
                            onChange={(e) => setSelectedCVVersion(e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-gray-900 dark:text-white"
                          >
                            {hasTailoredCV && (
                              <option value="tailored">✨ CV Adaptado con IA ({selectedJob.company})</option>
                            )}
                            <option value="master">📜 CV Maestro ({profile?.name || 'Completo'})</option>
                            {(profile?.versions || []).map((ver) => (
                              <option key={ver.id} value={ver.id}>
                                🎯 {ver.name} ({ver.target_role})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Template Format Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Plantilla:</span>
                          <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs">
                            <button
                              onClick={() => setActiveTemplate('modern')}
                              className={`px-3 py-1 rounded-lg font-semibold transition ${
                                activeTemplate === 'modern'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                            >
                              Moderna Apple HIG
                            </button>
                            <button
                              onClick={() => setActiveTemplate('classic_ats')}
                              className={`px-3 py-1 rounded-lg font-semibold transition ${
                                activeTemplate === 'classic_ats'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                            >
                              ATS Clásica
                            </button>
                            <button
                              onClick={() => setActiveTemplate('tech')}
                              className={`px-3 py-1 rounded-lg font-semibold transition ${
                                activeTemplate === 'tech'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                            >
                              Tech Developer
                            </button>
                          </div>
                        </div>

                        {/* Paper Contrast / Theme Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Visualización:</span>
                          <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs space-x-0.5">
                            <button
                              onClick={() => setPaperTheme('white')}
                              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition ${
                                paperTheme === 'white'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                              title="Mostrar hoja de papel blanco idéntica al PDF o versión impresa"
                            >
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                              <span>Papel Blanco</span>
                            </button>
                            <button
                              onClick={() => setPaperTheme('dark')}
                              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition ${
                                paperTheme === 'dark'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                              title="Fondo oscuro de alto contraste con texto blanco para lectura descansada"
                            >
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                              <span>Texto Blanco</span>
                            </button>
                          </div>
                        </div>

                        {/* Text Alignment Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Alineación:</span>
                          <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs space-x-0.5">
                            <button
                              onClick={() => setTextAlign('justify')}
                              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-semibold transition ${
                                textAlign === 'justify'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                              title="Alineación justificada formal equilibrada (sin separación excesiva de palabras)"
                            >
                              <AlignJustify className="w-3.5 h-3.5 text-blue-500" />
                              <span>Justificado Formal</span>
                            </button>
                            <button
                              onClick={() => setTextAlign('left')}
                              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-semibold transition ${
                                textAlign === 'left'
                                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                              title="Alineación estándar a la izquierda (recomendada para filtros ATS)"
                            >
                              <AlignLeft className="w-3.5 h-3.5 text-blue-500" />
                              <span>Izquierda (ATS)</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* ATS Score & Audit Note */}
                  {selectedCVVersion === 'tailored' && currentDraft?.ats_score && (
                    <div className="no-print p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          Compatibilidad ATS Auditada para {selectedJob.company}: {currentDraft.ats_score}%
                        </span>
                      </div>
                      {currentDraft.reviewer_critique && (
                        <span className="text-[11px] text-gray-500 italic max-w-sm truncate">
                          "{currentDraft.reviewer_critique}"
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notification banner when user hasn't generated the AI tailored version yet */}
                  {!hasTailoredCV && docSubTab === 'cv' && (
                    <div className="no-print p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Mostrando <strong>CV Maestro</strong>. Puedes generar una versión optimizada específicamente con las palabras clave de <strong>{selectedJob.company}</strong>.
                        </span>
                      </div>
                      <button
                        onClick={handleGenerateDraft}
                        disabled={isGeneratingDoc}
                        className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] shrink-0 ml-3"
                      >
                        {isGeneratingDoc ? 'Adaptando...' : '✨ Adaptar con IA'}
                      </button>
                    </div>
                  )}

                  {/* =========================================================
                      HIGH-FIDELITY PRINTABLE CONTAINER (A4 Executive Sheet)
                      ========================================================= */}
                  <div
                    className={`printable-cv apple-card p-8 sm:p-12 max-w-4xl mx-auto min-h-[750px] shadow-2xl transition-colors duration-200 ${
                      paperTheme === 'dark'
                        ? 'paper-dark bg-zinc-900 text-zinc-100 border border-zinc-800'
                        : 'paper-white bg-white text-gray-900 border border-gray-200/90'
                    }`}
                  >
                    {docSubTab === 'cv' ? (
                      /* RENDER CV: Tailored or Structured Profile */
                      selectedCVVersion === 'tailored' && hasTailoredCV ? (
                        renderVisualMarkdown(tailoredCVMarkdown, activeTemplate, paperTheme, textAlign)
                      ) : (
                        getEffectiveProfileForView() ? (
                          renderStructuredProfileVisual(getEffectiveProfileForView()!, activeTemplate, paperTheme, textAlign)
                        ) : (
                          <div className={`p-8 text-center ${paperTheme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>
                            No hay información de perfil disponible.
                          </div>
                        )
                      )
                    ) : (
                      /* RENDER COVER LETTER */
                      currentCoverLetter ? (
                        <div className={`max-w-2xl mx-auto space-y-6 text-xs ${paperTheme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>
                          {/* Letterhead */}
                          <div className={`border-b pb-5 space-y-1 ${paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
                            <h1 className={`text-xl font-bold tracking-tight ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{profile?.name || 'Candidato'}</h1>
                            <p className={`text-xs ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>{profile?.headline} • {profile?.location || 'Chile'}</p>
                            <div className={`flex space-x-3 text-[11px] pt-1 ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                              {profile?.email && <span>✉️ {profile.email}</span>}
                              {profile?.phone && <span>📞 {profile.phone}</span>}
                              {profile?.linkedin_url && <span>🔗 {profile.linkedin_url.replace('https://', '')}</span>}
                            </div>
                          </div>

                          {/* Recipient & Date block */}
                          <div className="flex justify-between items-start text-xs pt-1">
                            <div className="space-y-0.5">
                              <span className={`text-[10px] uppercase tracking-wider block font-bold ${paperTheme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>Destinatario</span>
                              <p className={`font-bold ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Equipo de Selección y Reclutamiento</p>
                              <p className={`font-medium ${paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>{selectedJob.company}</p>
                              <p className={`italic ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>Referencia: Postulación al cargo de {selectedJob.title}</p>
                            </div>
                            <div className={`text-right text-[11px] ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                              {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>

                          {/* Letter Body */}
                          <div className={`pt-3 text-xs leading-relaxed whitespace-pre-line space-y-3 font-sans ${textAlign === 'justify' ? 'formal-justify' : 'formal-left'} border-t ${paperTheme === 'dark' ? 'text-zinc-200 border-zinc-800' : 'text-gray-800 border-gray-100'}`}>
                            {currentCoverLetter}
                          </div>

                          {/* Formal Sign-off */}
                          <div className={`pt-6 border-t text-xs space-y-1 ${paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                            <p className={paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}>Atentamente,</p>
                            <p className={`font-bold text-sm pt-2 ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{profile?.name || 'El Candidato'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-16 text-center space-y-4">
                          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                            <Mail className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className={`font-bold text-sm ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              Aún no has generado la carta de presentación
                            </h3>
                            <p className={`text-xs mt-1 max-w-sm mx-auto ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                              Gemini redactará una carta formal de alta persuasión adaptada a los desafíos de {selectedJob.company}.
                            </p>
                          </div>
                          <button
                            onClick={handleGenerateDraft}
                            disabled={isGeneratingDoc}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                          >
                            {isGeneratingDoc ? 'Redactando con IA...' : '✨ Redactar Carta con IA'}
                          </button>
                        </div>
                      )
                    )}
                  </div>

                </div>
              )}

              {/* =========================================================
                  SECTION 2: COACH & SIMULADOR STAR INTERACTIVO
                  ========================================================= */}
              {activeSection === 'interview' && (
                <div className="space-y-4">
                  {interviewPrepMap[selectedJob.id] ? (
                    <div className="space-y-4 animate-fade-in text-xs">
                      
                      {/* Company Focus Banner */}
                      {interviewPrepMap[selectedJob.id].company_focus && (
                        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                          <span className="font-semibold text-amber-800 dark:text-amber-300 block">
                            🎯 Foco y Expectativa del Reclutador en {selectedJob.company}:
                          </span>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {interviewPrepMap[selectedJob.id].company_focus}
                          </p>
                        </div>
                      )}

                      {/* Live Interactive STAR Simulator Card */}
                      <div id="interview-simulator" className="apple-glass apple-card p-5 sm:p-6 space-y-4 border border-blue-500/30 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <Mic className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white text-xs flex items-center space-x-2">
                                <span>Simulador de Respuesta en Vivo</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                                  simulatingCategory === 'star'
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                }`}>
                                  {simulatingCategory === 'star' ? 'Conductual STAR' : 'Técnica & Arquitectura'}
                                </span>
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Escribe tu respuesta y Gemini evaluará tu estructura STAR, impacto técnico y solvencia profesional.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Current Question Being Simulated */}
                        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                              Pregunta en Entrenamiento:
                            </span>
                            <span className="text-[10px] text-gray-400">
                              (Haz clic en cualquier pregunta abajo para cargarla aquí)
                            </span>
                          </div>
                          <p className="font-bold text-xs text-gray-900 dark:text-white leading-relaxed">
                            "{simulatingQuestion || (interviewPrepMap[selectedJob.id].technical_questions?.[0]?.question || '¿Cuéntame de ti y de tus principales logros técnicos?')}"
                          </p>
                        </div>

                        {/* Candidate Answer Form */}
                        <form onSubmit={handleEvaluateAnswer} className="space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                Tu respuesta como candidato:
                              </label>
                              <span className="text-[10px] text-gray-400">
                                Tip: Estructura en <strong>Situación</strong>, <strong>Tarea</strong>, <strong>Acción</strong> y <strong>Resultado</strong>
                              </span>
                            </div>
                            <textarea
                              rows={4}
                              value={candidateAnswer}
                              onChange={(e) => setCandidateAnswer(e.target.value)}
                              placeholder="Ejemplo: 'En mi experiencia anterior, nos enfrentamos a un reto donde... Mi rol consistió en... Diseñé e implementé la solución utilizando..., logrando reducir los incidentes en un 40%...'"
                              className="w-full text-xs p-3.5 rounded-xl bg-gray-50/90 dark:bg-zinc-800/90 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-400 leading-relaxed"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            {candidateAnswer.trim() ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCandidateAnswer('');
                                  setAnswerEvaluation(null);
                                }}
                                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                              >
                                Limpiar borrador
                              </button>
                            ) : <div />}

                            <button
                              type="submit"
                              disabled={isEvaluatingAnswer || !candidateAnswer.trim() || !simulatingQuestion}
                              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-40"
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${isEvaluatingAnswer ? 'animate-spin' : ''}`} />
                              <span>{isEvaluatingAnswer ? 'Evaluando con IA...' : '✨ Evaluar Respuesta con IA (STAR)'}</span>
                            </button>
                          </div>
                        </form>

                        {/* AI Diagnostic Feedback Report */}
                        {answerEvaluation && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 via-white to-purple-50/50 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 space-y-3 animate-fade-in text-xs">
                            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
                              <div className="flex items-center space-x-2">
                                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold text-gray-900 dark:text-white text-xs">
                                  Diagnóstico del Evaluador IA:
                                </span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                (answerEvaluation.score || 85) >= 80
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : (answerEvaluation.score || 85) >= 60
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}>
                                Calificación: {answerEvaluation.score || 85}/100
                              </span>
                            </div>

                            {answerEvaluation.strengths && answerEvaluation.strengths.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
                                  ✅ Fortalezas detectadas:
                                </span>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-0.5 pl-1">
                                  {answerEvaluation.strengths.map((str: string, sIdx: number) => (
                                    <li key={sIdx}>{str}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {answerEvaluation.improvements && answerEvaluation.improvements.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">
                                  💡 Oportunidades de mejora / Faltantes:
                                </span>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-0.5 pl-1">
                                  {answerEvaluation.improvements.map((imp: string, iIdx: number) => (
                                    <li key={iIdx}>{imp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {answerEvaluation.improved_version_sample && (
                              <div className="mt-2 p-3.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-blue-200/50 dark:border-blue-900/40 text-gray-800 dark:text-gray-200 space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                                  🌟 Versión Recomendada de Alto Impacto (STAR):
                                </span>
                                <p className="italic leading-relaxed">
                                  "{answerEvaluation.improved_version_sample}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Technical Questions Glossary */}
                      <div className="apple-glass apple-card p-5 space-y-3">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-4 h-4" />
                            <span>Glosario de Preguntas Técnicas & Respuestas Sugeridas</span>
                          </div>
                          <span className="text-[10px] font-normal text-gray-500 lowercase">
                            {interviewPrepMap[selectedJob.id].technical_questions?.length || 0} preguntas clave
                          </span>
                        </h4>

                        <div className="space-y-2.5">
                          {interviewPrepMap[selectedJob.id].technical_questions?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-gray-900 dark:text-white leading-relaxed">
                                  {idx + 1}. {item.question}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSimulatingQuestion(item.question);
                                    setSimulatingCategory('tech');
                                    setCandidateAnswer('');
                                    setAnswerEvaluation(null);
                                    document.getElementById('interview-simulator')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-[10px] inline-flex items-center space-x-1 transition"
                                  title="Cargar esta pregunta en el simulador interactivo"
                                >
                                  <Mic className="w-3 h-3" />
                                  <span>Practicar</span>
                                </button>
                              </div>

                              {item.intent && (
                                <p className="text-[11px] text-gray-500">
                                  <strong>¿Qué evalúan?</strong> {item.intent}
                                </p>
                              )}
                              {item.tip && (
                                <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-[11px] font-medium leading-relaxed">
                                  💡 <strong>Tip / Cómo responder:</strong> {item.tip}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Behavioral / STAR Questions */}
                      {interviewPrepMap[selectedJob.id].behavioral_questions && (
                        <div className="apple-glass apple-card p-5 space-y-3">
                          <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <MessageSquare className="w-4 h-4" />
                              <span>Preguntas de Comportamiento (Metodología STAR)</span>
                            </div>
                            <span className="text-[10px] font-normal text-gray-500 lowercase">
                              {interviewPrepMap[selectedJob.id].behavioral_questions.length} preguntas STAR
                            </span>
                          </h4>

                          <div className="space-y-2.5">
                            {interviewPrepMap[selectedJob.id].behavioral_questions.map((item: any, idx: number) => (
                              <div key={idx} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-bold text-gray-900 dark:text-white leading-relaxed">
                                    {item.question}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSimulatingQuestion(item.question);
                                      setSimulatingCategory('star');
                                      setCandidateAnswer('');
                                      setAnswerEvaluation(null);
                                      document.getElementById('interview-simulator')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="shrink-0 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 font-semibold text-[10px] inline-flex items-center space-x-1 transition"
                                    title="Cargar esta pregunta conductual en el simulador"
                                  >
                                    <Star className="w-3 h-3 text-purple-500" />
                                    <span>Practicar STAR</span>
                                  </button>
                                </div>

                                {item.tip && (
                                  <div className="p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 text-[11px] font-medium leading-relaxed">
                                    ⭐ <strong>Estrategia STAR sugerida:</strong> {item.tip}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Salary Negotiation & Tough Questions Strategy */}
                      <div className="apple-glass apple-card p-5 space-y-3">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                          <DollarSign className="w-4 h-4" />
                          <span>Estrategia de Negociación Salarial & Preguntas Capciosas</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Salary question */}
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1.5">
                            <p className="font-bold text-gray-900 dark:text-white">
                              💰 "¿Cuáles son tus pretensiones de renta líquida?"
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                              <strong>Estrategia recomendada:</strong> Expresa un rango acorde al mercado chileno/remoto. Di: <em>"Mi expectativa se encuentra en el rango de $X a $Y líquidos, dependiendo del paquete de beneficios, modalidad y posibilidades de crecimiento."</em>
                            </p>
                          </div>

                          {/* Reason for change */}
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1.5">
                            <p className="font-bold text-gray-900 dark:text-white">
                              🔄 "¿Por qué estás buscando un cambio de empleo?"
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                              <strong>Estrategia recomendada:</strong> Siempre enfoca hacia adelante en positivo, nunca hables mal de tu empleador anterior: <em>"Busco nuevos desafíos técnicos donde pueda impactar a mayor escala, y la propuesta tecnológica de {selectedJob.company} calza exactamente con mi plan de desarrollo."</em>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Questions to Ask Interviewer */}
                      {interviewPrepMap[selectedJob.id].questions_to_ask && (
                        <div className="apple-glass apple-card p-5 space-y-3">
                          <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                            <Award className="w-4 h-4" />
                            <span>Preguntas Inteligentes que tú debes hacerle a la empresa</span>
                          </h4>

                          <ul className="space-y-1.5 list-disc list-inside text-gray-700 dark:text-gray-300 text-xs">
                            {interviewPrepMap[selectedJob.id].questions_to_ask.map((q: any, idx: number) => (
                              <li key={idx} className="leading-relaxed">
                                {typeof q === 'string' ? q : q.question || q.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  ) : (
                    /* Empty Interview Prep State */
                    <div className="apple-glass apple-card p-10 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-zinc-800 text-amber-500 flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          Coach & Simulador de Entrevista para {selectedJob.company}
                        </h3>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                          Genera un simulador STAR interactivo en vivo, banco de preguntas técnicas probables y respuestas clave basadas en tu perfil para esta vacante.
                        </p>
                      </div>

                      <button
                        onClick={handleLoadInterviewPrep}
                        disabled={isLoadingPrep}
                        className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition disabled:opacity-50"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isLoadingPrep ? 'animate-spin' : ''}`} />
                        <span>{isLoadingPrep ? 'Analizando vacante...' : 'Preparar Coach & Simulador para la Entrevista'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================
                  SECTION 3: BITÁCORA, HISTORIAL & NOTAS
                  ========================================================= */}
              {activeSection === 'timeline' && (
                <div className="space-y-4 text-xs">
                  {/* Add Note Form */}
                  <div className="apple-glass apple-card p-4 space-y-2">
                    <label className="font-semibold text-gray-900 dark:text-white block">
                      Añadir nota rápida o actualización del proceso:
                    </label>
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: Hablé con Carolina de RRHH, entrevista técnica el martes 10:00..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={isAddingNote || !newNoteText.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 shrink-0"
                      >
                        Guardar Nota
                      </button>
                    </form>
                  </div>

                  {/* Historical Events Timeline */}
                  <div className="apple-glass apple-card p-5 space-y-3">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-gray-400">
                      Línea de Tiempo del Proceso
                    </h4>

                    {selectedJob.history && selectedJob.history.length > 0 ? (
                      <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-200 dark:before:bg-zinc-800">
                        {selectedJob.history.map((ev, i) => (
                          <div key={ev.id || i} className="relative flex items-start space-x-3 pl-6">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-900 shadow-xs -translate-x-1/2" />
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {ev.title}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {ev.date ? formatDisplayDate(ev.date) : ''}
                                </span>
                              </div>
                              {ev.notes && (
                                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                                  {ev.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-4">
                        Sin eventos registrados en la bitácora todavía.
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* No Job Selected */
            <div className="lg:col-span-8 apple-glass apple-card p-12 text-center text-gray-400 space-y-2">
              <p className="text-sm">Selecciona una postulación de la lista izquierda para ver sus detalles.</p>
            </div>
          )}

        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="apple-glass apple-card max-w-sm w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                ¿Quitar postulación del seguimiento?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Se removerá <strong>{selectedJob.title}</strong> de tu lista de postulaciones activas.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFromTracking}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                Sí, quitar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
