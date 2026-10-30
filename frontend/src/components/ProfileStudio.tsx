import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  User,
  Briefcase,
  GraduationCap,
  Languages,
  Code2,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Save,
  Plus,
  Trash2,
  FileText,
  Printer,
  Copy,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  Layers,
  Check,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Building2,
  SlidersHorizontal,
  BookmarkCheck,
  Sun,
  Moon
} from 'lucide-react';
import type {
  CandidateProfile,
  WorkExperience,
  EducationItem,
  ProjectItem,
  ResumeVersion
} from '../types';
import { api } from '../api';
import { useToast } from './Toast';

interface ProfileStudioProps {
  profile: CandidateProfile;
  onProfileUpdated: (p: CandidateProfile) => void;
}

type SectionKey =
  | 'overview'
  | 'personal'
  | 'headline'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'projects'
  | 'versions';

export const formatExperiencePeriod = (startDate?: string, endDate?: string): string => {
  const start = (startDate || '').trim();
  const end = (endDate || '').trim();
  if (!start && !end) return '';
  if (start && end) {
    if (start.includes('–') || start.includes(' - ') || start.toLowerCase().includes(' a ')) {
      return start;
    }
    return `${start} – ${end}`;
  }
  if (start && !end) return start;
  return end;
};

type TemplateStyle = 'modern' | 'classic_ats' | 'tech';

export const ProfileStudio: React.FC<ProfileStudioProps> = ({ profile, onProfileUpdated }) => {
  const toast = useToast();

  // Active navigation section
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [activeTemplate, setActiveTemplate] = useState<TemplateStyle>('modern');
  const [paperTheme, setPaperTheme] = useState<'white' | 'dark'>('white');

  // Active Version: 'master' or version.id
  const [activeVersionId, setActiveVersionId] = useState<string>('master');

  // Editable Profile State
  const [editableProfile, setEditableProfile] = useState<CandidateProfile>(profile);

  // Autosave & Diff state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<any>(null);

  // Sync when prop updates
  useEffect(() => {
    setEditableProfile(profile);
  }, [profile]);

  // Autosave debouncer (800ms)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const updated = await api.updateProfile(editableProfile);
        onProfileUpdated(updated);
        setSaveStatus('saved');
      } catch (e: any) {
        console.error('Error in autosave:', e);
        setSaveStatus('dirty');
      }
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editableProfile]);

  // Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExtractingPreview, setIsExtractingPreview] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<{ profile: CandidateProfile; filename: string } | null>(null);

  // LinkedIn Import State
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedInSubTab, setLinkedInSubTab] = useState<'pdf' | 'text'>('pdf');
  const [linkedInText, setLinkedInText] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isProcessingLinkedIn, setIsProcessingLinkedIn] = useState(false);
  const [linkedInResult, setLinkedInResult] = useState<{
    profile: CandidateProfile;
    experiences_count: number;
    education_count: number;
    skills_count: number;
  } | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'replace'>('merge');

  // AI Assist Modal State
  const [aiModal, setAiModal] = useState<{
    isOpen: boolean;
    section: string;
    action: string;
    original: string;
    suggestion: string;
    reasoning: string;
    isLoading: boolean;
    targetField?: string;
    targetId?: string;
  } | null>(null);

  // Create Version Modal State
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionRole, setNewVersionRole] = useState('');

  // Expandable experiences tracker
  const [expandedExpIds, setExpandedExpIds] = useState<Record<string, boolean>>({});

  // Skill Search and Category Filtering
  const [skillSearch, setSkillSearch] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Confirm delete experience
  const [deleteExpConfirmId, setDeleteExpConfirmId] = useState<string | null>(null);

  // ==========================================
  // PROFILE QUALITY DIAGNOSTIC (0-100 SCORE)
  // ==========================================
  const calculateProfileDiagnostic = () => {
    const p = editableProfile;
    let score = 0;
    const checks: { label: string; pass: boolean; weight: number; tip: string }[] = [];

    // 1. Contact info (Weight: 20)
    const hasContact = Boolean(p.name && p.email && p.phone && p.location);
    const hasSocials = Boolean(p.linkedin_url && (p.github_url || p.portfolio_url));
    const contactScore = (hasContact ? 12 : 0) + (hasSocials ? 8 : 4);
    score += contactScore;
    checks.push({
      label: 'Datos de contacto y enlaces profesionales completos',
      pass: hasContact && hasSocials,
      weight: 20,
      tip: !hasSocials ? 'Añade tu LinkedIn y GitHub/Portafolio para maximizar confianza.' : 'Datos de contacto verificados.'
    });

    // 2. Professional Headline (Weight: 15)
    const hasHeadline = Boolean(p.headline && p.headline.length >= 25);
    if (hasHeadline) score += 15;
    checks.push({
      label: 'Titular profesional claro y representativo',
      pass: hasHeadline,
      weight: 15,
      tip: !hasHeadline ? 'Escribe un titular con tu especialidad y tecnologías clave (mín. 25 caracteres).' : 'Titular enfocado.'
    });

    // 3. Professional Summary (Weight: 20)
    const summaryWords = p.summary ? p.summary.trim().split(/\s+/).length : 0;
    const hasGoodSummary = summaryWords >= 40 && summaryWords <= 160;
    if (hasGoodSummary) score += 20;
    else if (summaryWords > 15) score += 10;
    checks.push({
      label: 'Perfil profesional sustancial (40 a 160 palabras)',
      pass: hasGoodSummary,
      weight: 20,
      tip: summaryWords < 40 ? 'El resumen es breve. Explica tus años de experiencia, especialidad y logros clave.' : 'Extensión óptima.'
    });

    // 4. Work Experience & Achievements (Weight: 25)
    const hasExperiences = p.experiences && p.experiences.length >= 2;
    const hasMetrics = p.experiences.some(e =>
      e.bullet_achievements && e.bullet_achievements.some(b => /\d+|%|\$|millones|ahorro|aumento/i.test(b))
    );
    let expScore = 0;
    if (hasExperiences) expScore += 15;
    if (hasMetrics) expScore += 10;
    score += expScore;
    checks.push({
      label: 'Experiencias laborales con logros cuantificables (%, $ o métricas)',
      pass: hasExperiences && hasMetrics,
      weight: 25,
      tip: !hasMetrics ? 'Agrega números concretos o resultados (% de optimización, impacto) en tus logros.' : 'Logros verificables detectados.'
    });

    // 5. Technical Skills (Weight: 10)
    const hasSkills = p.technical_skills && p.technical_skills.length >= 8;
    if (hasSkills) score += 10;
    else if (p.technical_skills.length >= 4) score += 5;
    checks.push({
      label: 'Competencias técnicas categorizadas (mínimo 8 registradas)',
      pass: hasSkills,
      weight: 10,
      tip: !hasSkills ? 'Registra más herramientas y tecnologías clave para filtros ATS.' : 'Buen catálogo de tecnologías.'
    });

    // 6. Education & Languages (Weight: 10)
    const hasEdu = p.education && p.education.length >= 1;
    const hasLang = p.languages && Object.keys(p.languages).length >= 1;
    if (hasEdu && hasLang) score += 10;
    else if (hasEdu || hasLang) score += 5;
    checks.push({
      label: 'Formación académica e idiomas declarados',
      pass: hasEdu && hasLang,
      weight: 10,
      tip: !hasLang ? 'Indica tus idiomas y nivel de competencia.' : 'Educación e idiomas completos.'
    });

    return { score: Math.min(score, 100), checks };
  };

  const diagnostic = calculateProfileDiagnostic();

  // ==========================================
  // SKILLS CATEGORIZATION
  // ==========================================
  const categorizeSkills = () => {
    const categories: Record<string, string[]> = {
      'Lenguajes & Paradigmas': [],
      'Frameworks & Web': [],
      'Bases de Datos & SQL': [],
      'Cloud, DevOps & Infra': [],
      'Inteligencia Artificial & Datos': [],
      'Gestión TI & Metodologías': []
    };

    const techLower = editableProfile.technical_skills || [];

    techLower.forEach(skill => {
      const s = skill.toLowerCase();
      if (/python|javascript|typescript|java|c#|golang|rust|php|ruby|c\+\+|bash/i.test(s)) {
        categories['Lenguajes & Paradigmas'].push(skill);
      } else if (/react|node|angular|vue|next|express|django|fastapi|spring|\.net|laravel|tailwind/i.test(s)) {
        categories['Frameworks & Web'].push(skill);
      } else if (/sql|postgres|mysql|oracle|mongo|redis|database|bigquery/i.test(s)) {
        categories['Bases de Datos & SQL'].push(skill);
      } else if (/azure|aws|cloud|docker|kubernetes|linux|server|git|ci\/cd|devops/i.test(s)) {
        categories['Cloud, DevOps & Infra'].push(skill);
      } else if (/gemini|claude|chatgpt|gpt|copilot|ai|ollama|n8n|langchain|machine learning|ia/i.test(s)) {
        categories['Inteligencia Artificial & Datos'].push(skill);
      } else {
        categories['Gestión TI & Metodologías'].push(skill);
      }
    });

    return categories;
  };

  const categorizedSkills = categorizeSkills();

  // ==========================================
  // HANDLERS FOR IMPORT (Section 7 Guided Flow)
  // ==========================================
  const handleSelectFileForPreview = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingPreview(true);
    setShowImportModal(true);
    try {
      const res = await api.extractCVPreview(file);
      setExtractedPreview({
        profile: res.extracted_profile,
        filename: res.filename
      });
      toast.success('Documento analizado. Revisa los datos antes de confirmar.');
    } catch (err: any) {
      toast.error('Error al analizar archivo: ' + (err?.message || err));
      setShowImportModal(false);
    } finally {
      setIsExtractingPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!extractedPreview) return;
    try {
      const updated = await api.updateProfile(extractedPreview.profile);
      setEditableProfile(updated);
      onProfileUpdated(updated);
      setShowImportModal(false);
      setExtractedPreview(null);
      toast.success('CV Maestro actualizado exitosamente con la información del documento');
    } catch (err: any) {
      toast.error('Error guardando perfil: ' + (err?.message || err));
    }
  };

  // ==========================================
  // HANDLERS FOR LINKEDIN IMPORT
  // ==========================================
  const handleLinkedInFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingLinkedIn(true);
    try {
      const res = await api.importFromLinkedIn({ file });
      const targetProf = res.profile || res.extracted_profile;
      if (!targetProf) {
        throw new Error('No se pudo estructurar el contenido de LinkedIn.');
      }
      setLinkedInResult({
        profile: targetProf,
        experiences_count: res.experiences_count ?? (targetProf.experiences?.length || 0),
        education_count: res.education_count ?? (targetProf.education?.length || 0),
        skills_count: res.skills_count ?? (targetProf.technical_skills?.length || 0)
      });
      toast.success(`Datos de LinkedIn analizados: ${res.experiences_count || 0} empleos y ${res.education_count || 0} estudios`);
    } catch (err: any) {
      toast.error('Error al analizar archivo de LinkedIn: ' + (err?.message || err));
    } finally {
      setIsProcessingLinkedIn(false);
    }
  };

  const handleLinkedInTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedInText.trim() && !linkedInUrl.trim()) {
      toast.warning('Ingresa el texto de tu perfil o la URL de LinkedIn');
      return;
    }

    setIsProcessingLinkedIn(true);
    try {
      const res = await api.importFromLinkedIn({
        text: linkedInText.trim() || undefined,
        linkedin_url: linkedInUrl.trim() || undefined
      });
      const targetProf = res.profile || res.extracted_profile;
      if (!targetProf) {
        throw new Error('No se pudo estructurar el contenido de LinkedIn.');
      }
      setLinkedInResult({
        profile: targetProf,
        experiences_count: res.experiences_count ?? (targetProf.experiences?.length || 0),
        education_count: res.education_count ?? (targetProf.education?.length || 0),
        skills_count: res.skills_count ?? (targetProf.technical_skills?.length || 0)
      });
      toast.success(`Datos de LinkedIn analizados: ${res.experiences_count || 0} empleos y ${res.education_count || 0} estudios`);
    } catch (err: any) {
      toast.error('Error importando desde LinkedIn: ' + (err?.message || err));
    } finally {
      setIsProcessingLinkedIn(false);
    }
  };

  const handleConfirmLinkedInImport = async () => {
    if (!linkedInResult || !linkedInResult.profile) return;
    const imported = linkedInResult.profile;

    let newExperiences: WorkExperience[] = [];
    if (mergeStrategy === 'replace') {
      newExperiences = imported.experiences || [];
    } else {
      // Merge without duplicates (by company + role)
      const existing = [...(editableProfile.experiences || [])];
      const incoming = imported.experiences || [];
      incoming.forEach(inc => {
        const comp = (inc.company || '').toLowerCase().trim();
        const rle = (inc.role || '').toLowerCase().trim();
        const exists = existing.some(
          e => (e.company || '').toLowerCase().trim() === comp &&
               (e.role || '').toLowerCase().trim() === rle
        );
        if (!exists) {
          existing.push(inc);
        }
      });
      newExperiences = existing;
    }

    let newEducation: EducationItem[] = [];
    if (mergeStrategy === 'replace') {
      newEducation = imported.education || [];
    } else {
      const existingEdu = [...(editableProfile.education || [])];
      const incomingEdu = imported.education || [];
      incomingEdu.forEach(inc => {
        const inst = (inc.institution || '').toLowerCase().trim();
        const deg = (inc.degree || '').toLowerCase().trim();
        const exists = existingEdu.some(
          e => (e.institution || '').toLowerCase().trim() === inst &&
               (e.degree || '').toLowerCase().trim() === deg
        );
        if (!exists) {
          existingEdu.push(inc);
        }
      });
      newEducation = existingEdu;
    }

    const mergedSkills = Array.from(new Set([
      ...(editableProfile.technical_skills || []),
      ...(imported.technical_skills || [])
    ]));

    const updatedProfile: CandidateProfile = {
      ...editableProfile,
      experiences: newExperiences,
      education: newEducation,
      technical_skills: mergedSkills,
      headline: imported.headline && imported.headline !== 'Profesional Tecnológico' ? imported.headline : editableProfile.headline,
      linkedin_url: imported.linkedin_url || editableProfile.linkedin_url || (linkedInUrl.trim() ? linkedInUrl.trim() : editableProfile.linkedin_url)
    };

    try {
      const saved = await api.updateProfile(updatedProfile);
      setEditableProfile(saved);
      onProfileUpdated(saved);
      setShowLinkedInModal(false);
      setLinkedInResult(null);
      setLinkedInText('');
      setLinkedInUrl('');
      toast.success('Experiencia y formación de LinkedIn incorporadas al CV Maestro');
    } catch (err: any) {
      toast.error('Error al guardar datos de LinkedIn: ' + (err?.message || err));
    }
  };

  // ==========================================
  // AI ASSIST HANDLER (Section 8)
  // ==========================================
  const triggerAIAssist = async (section: string, action: string, currentText: string, targetField?: string, targetId?: string) => {
    setAiModal({
      isOpen: true,
      section,
      action,
      original: currentText,
      suggestion: '',
      reasoning: 'Generando propuesta con Inteligencia Artificial...',
      isLoading: true,
      targetField,
      targetId
    });

    try {
      const res = await api.aiAssistProfile({
        section,
        action,
        current_text: currentText,
        target_role: editableProfile.headline
      });

      setAiModal(prev => prev ? {
        ...prev,
        suggestion: res.suggestion,
        reasoning: res.reasoning,
        isLoading: false
      } : null);
    } catch (e: any) {
      toast.error('Error en asistencia de IA: ' + (e?.message || e));
      setAiModal(null);
    }
  };

  const handleApplyAISuggestion = () => {
    if (!aiModal) return;
    const { section, suggestion, targetField, targetId } = aiModal;

    if (section === 'headline') {
      setEditableProfile(prev => ({ ...prev, headline: suggestion }));
    } else if (section === 'summary') {
      setEditableProfile(prev => ({ ...prev, summary: suggestion }));
    } else if (section === 'experience_bullet' && targetId) {
      setEditableProfile(prev => ({
        ...prev,
        experiences: prev.experiences.map(exp => {
          if (exp.id === targetId) {
            const index = Number(targetField || 0);
            const bullets = [...exp.bullet_achievements];
            bullets[index] = suggestion;
            return { ...exp, bullet_achievements: bullets };
          }
          return exp;
        })
      }));
    }

    toast.success('Sugerencia de IA aplicada');
    setAiModal(null);
  };

  // ==========================================
  // VERSIONS MANAGEMENT (Section 10)
  // ==========================================
  const handleCreateVersion = () => {
    if (!newVersionName.trim() || !newVersionRole.trim()) {
      toast.warning('Ingresa un nombre y cargo objetivo para la versión');
      return;
    }

    const newVer: ResumeVersion = {
      id: Math.random().toString(36).substring(2, 9),
      name: newVersionName.trim(),
      target_role: newVersionRole.trim(),
      headline: `${newVersionRole.trim()} | ${editableProfile.name}`,
      summary: editableProfile.summary,
      selected_skills: [...editableProfile.technical_skills],
      template: activeTemplate,
      created_at: new Date().toISOString()
    };

    const updatedVersions = [...(editableProfile.versions || []), newVer];
    setEditableProfile(prev => ({ ...prev, versions: updatedVersions }));
    setActiveVersionId(newVer.id);
    setShowNewVersionModal(false);
    setNewVersionName('');
    setNewVersionRole('');
    toast.success(`Versión personalizada "${newVer.name}" creada`);
  };

  const handleDeleteVersion = (versionId: string) => {
    const updated = (editableProfile.versions || []).filter(v => v.id !== versionId);
    setEditableProfile(prev => ({ ...prev, versions: updated }));
    if (activeVersionId === versionId) {
      setActiveVersionId('master');
    }
    toast.info('Versión eliminada (el CV maestro no se vio afectado)');
  };

  // Active version data resolver
  const currentActiveVersion = activeVersionId === 'master'
    ? null
    : (editableProfile.versions || []).find(v => v.id === activeVersionId) || null;

  // Active effective display profile
  const effectiveProfile: CandidateProfile = currentActiveVersion
    ? {
        ...editableProfile,
        headline: currentActiveVersion.headline || editableProfile.headline,
        summary: currentActiveVersion.summary || editableProfile.summary,
        technical_skills: currentActiveVersion.selected_skills.length > 0 ? currentActiveVersion.selected_skills : editableProfile.technical_skills
      }
    : editableProfile;

  // ==========================================
  // MARKDOWN GENERATOR & PRINT
  // ==========================================
  const generateMarkdownForProfile = (p: CandidateProfile): string => {
    let md = `# ${p.name}\n`;
    md += `**${p.headline}**\n\n`;
    md += `📍 ${p.location || 'Remoto'} | ✉️ ${p.email || ''} | 📞 ${p.phone || ''}\n`;
    if (p.linkedin_url) md += `LinkedIn: ${p.linkedin_url} | `;
    if (p.github_url) md += `GitHub: ${p.github_url}\n\n`;

    md += `## Perfil Profesional\n${p.summary}\n\n`;

    if (p.technical_skills.length > 0) {
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
      md += `\n`;
    }

    if (p.languages && Object.keys(p.languages).length > 0) {
      md += `## Idiomas\n`;
      Object.entries(p.languages).forEach(([lang, lvl]) => {
        md += `- **${lang}:** ${lvl}\n`;
      });
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownForProfile(effectiveProfile));
    setCopiedPreview(true);
    toast.success('CV copiado al portapapeles');
    setTimeout(() => setCopiedPreview(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const text = generateMarkdownForProfile(effectiveProfile);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_${effectiveProfile.name.replace(/\s+/g, '_')}_${activeVersionId}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info('Descargando archivo Markdown...');
  };

  return (
    <div className="space-y-6">

      {/* ========================================================
          TOP HEADER: Control de Perfil, Versiones & Autoguardado
          ======================================================== */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Perfil Profesional & CV Maestro
            </h1>

            {/* Save Status Capsule */}
            <span
              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition ${
                saveStatus === 'saved'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : saveStatus === 'saving'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  saveStatus === 'saved' ? 'bg-emerald-500' : saveStatus === 'saving' ? 'bg-blue-500 animate-spin' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>
                {saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando...' : 'Cambios pendientes'}
              </span>
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tu fuente de información profesional confiable para postular, generar currículums y pasar filtros ATS.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          
          {/* Active Version Selector Dropdown */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setActiveVersionId('master')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeVersionId === 'master'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              👑 CV Maestro
            </button>

            {editableProfile.versions && editableProfile.versions.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVersionId(v.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition truncate max-w-[140px] ${
                  activeVersionId === v.id
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
                title={v.name}
              >
                🎯 {v.name}
              </button>
            ))}

            <button
              onClick={() => setShowNewVersionModal(true)}
              className="px-2 py-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-700 transition"
              title="Crear nueva versión adaptada a un cargo objetivo"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* LinkedIn Import Button */}
          <button
            onClick={() => setShowLinkedInModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20 text-[#0A66C2] dark:text-[#3897f0] border border-[#0A66C2]/30 hover:bg-[#0A66C2]/20 transition shadow-2xs"
            title="Importar experiencia y formación académica desde LinkedIn"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.62 1.62 0 1 0-.01-3.24 1.62 1.62 0 0 0 .01 3.24M7.86 18.5v-8.37H5.07v8.37h2.79Z"/>
            </svg>
            <span>Importar de LinkedIn</span>
          </button>

          {/* Upload Button */}
          <label className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-700 transition shadow-2xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>Importar PDF/Word</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={handleSelectFileForPreview}
              className="hidden"
            />
          </label>

          {/* Toggle Preview Button */}
          <button
            onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewMode === 'preview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100'
            }`}
          >
            {viewMode === 'preview' ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{viewMode === 'preview' ? 'Volver al Editor' : 'Vista Previa & PDF'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          VISTA PREVIA DINÁMICA & EXPORTACIÓN (Section 12)
          ======================================================== */}
      {viewMode === 'preview' ? (
        <div className="space-y-4 animate-fade-in">
          
          {/* Preview Toolbar */}
          <div className="no-print apple-glass apple-card p-4 flex flex-wrap items-center justify-between gap-3">
            {/* Template selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 font-medium">Plantilla:</span>
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs">
                <button
                  onClick={() => setActiveTemplate('modern')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    activeTemplate === 'modern'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Moderna Apple HIG
                </button>
                <button
                  onClick={() => setActiveTemplate('classic_ats')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    activeTemplate === 'classic_ats'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  ATS Clásica
                </button>
                <button
                  onClick={() => setActiveTemplate('tech')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    activeTemplate === 'tech'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tech Developer
                </button>
              </div>
            </div>

            {/* Paper Contrast / Theme Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-xs">Visualización:</span>
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs space-x-0.5">
                <button
                  onClick={() => setPaperTheme('white')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-semibold transition ${
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
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-semibold transition ${
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

            {/* Actions: Copy, Download, Print */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPreview ? '¡Copiado!' : 'Copiar'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar .md</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Container: A4 Clean Print Layout */}
          <div
            className={`printable-cv apple-card p-8 sm:p-12 max-w-4xl mx-auto min-h-[800px] shadow-2xl transition-colors duration-200 ${
              paperTheme === 'dark'
                ? 'paper-dark bg-zinc-900 text-zinc-100 border border-zinc-800'
                : 'paper-white bg-white text-gray-900 border border-gray-200/90'
            }`}
          >
            {/* Header */}
            <div className={`pb-6 border-b ${activeTemplate === 'modern' ? (paperTheme === 'dark' ? 'border-blue-400/40' : 'border-blue-500/30') : (paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-200')} space-y-2`}>
              <h1 className={`text-2xl font-bold tracking-tight ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {effectiveProfile.name}
              </h1>
              <p className={`text-sm font-semibold ${activeTemplate === 'modern' ? (paperTheme === 'dark' ? 'text-blue-400' : 'text-blue-600') : (paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-700')}`}>
                {effectiveProfile.headline}
              </p>
              <div className={`flex items-center space-x-3 text-xs flex-wrap gap-y-1 pt-1 ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
                {effectiveProfile.location && <span>📍 {effectiveProfile.location}</span>}
                {effectiveProfile.email && <span>✉️ {effectiveProfile.email}</span>}
                {effectiveProfile.phone && <span>📞 {effectiveProfile.phone}</span>}
                {effectiveProfile.linkedin_url && (
                  <span>🔗 {effectiveProfile.linkedin_url.replace('https://', '')}</span>
                )}
                {effectiveProfile.github_url && (
                  <span>💻 {effectiveProfile.github_url.replace('https://', '')}</span>
                )}
              </div>
            </div>

            {/* Profile Summary */}
            {effectiveProfile.summary && (
              <div className={`py-5 border-b space-y-2 ${paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Perfil Profesional
                </h3>
                <p className={`text-xs leading-relaxed whitespace-pre-line formal-justify ${paperTheme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>
                  {effectiveProfile.summary}
                </p>
              </div>
            )}

            {/* Technical Skills */}
            {effectiveProfile.technical_skills && effectiveProfile.technical_skills.length > 0 && (
              <div className={`py-5 border-b space-y-2 ${paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Competencias & Tecnologías
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {effectiveProfile.technical_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className={`text-[11px] px-2 py-0.5 rounded-md ${
                        paperTheme === 'dark'
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          : activeTemplate === 'tech'
                          ? 'bg-blue-50 text-blue-700 font-mono border border-blue-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {effectiveProfile.experiences && effectiveProfile.experiences.length > 0 && (
              <div className={`py-5 border-b space-y-4 ${paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Experiencia Laboral
                </h3>
                <div className="space-y-4">
                  {effectiveProfile.experiences.map((exp) => (
                    <div key={exp.id} className="space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={`font-bold text-xs ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{exp.role}</h4>
                          <p className={`text-xs font-medium ${paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>{exp.company} • {exp.location}</p>
                        </div>
                        <span className={`text-[11px] font-medium ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                          {formatExperiencePeriod(exp.start_date, exp.end_date)}
                        </span>
                      </div>

                      {exp.description && (
                        <p className={`text-xs leading-relaxed ${paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                          {exp.description}
                        </p>
                      )}

                      {exp.bullet_achievements && exp.bullet_achievements.length > 0 && (
                        <ul className={`list-disc list-inside space-y-1 text-xs pt-0.5 ${paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                          {exp.bullet_achievements.map((bullet, i) => (
                            <li key={i} className="leading-snug">{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {effectiveProfile.education && effectiveProfile.education.length > 0 && (
              <div className={`py-5 border-b space-y-3 ${paperTheme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Formación Académica
                </h3>
                <div className="space-y-2">
                  {effectiveProfile.education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-baseline text-xs">
                      <div>
                        <span className={`font-bold ${paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{edu.degree}</span>
                        <span className={paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}> • {edu.institution}</span>
                      </div>
                      {edu.graduation_year && (
                        <span className={paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}>{edu.graduation_year}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {effectiveProfile.languages && Object.keys(effectiveProfile.languages).length > 0 && (
              <div className="pt-4 space-y-2 text-xs">
                <h3 className={`font-bold uppercase tracking-wider text-xs ${paperTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Idiomas
                </h3>
                <div className="flex space-x-4">
                  {Object.entries(effectiveProfile.languages).map(([lang, lvl], i) => (
                    <span key={i} className={paperTheme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}>
                      <strong className={paperTheme === 'dark' ? 'text-white' : 'text-gray-900'}>{lang}:</strong> {lvl}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (

        /* ========================================================
            EDITOR ESTRUCTURADO POR SECCIONES (Sections 4 & 5)
            ======================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* NAVIGATION SIDEBAR (Left Column: Sections Index) */}
          <div className="no-print lg:col-span-4 space-y-2">
            
            {/* Quick Diagnostic Badge Widget */}
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                activeSection === 'overview'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/40 shadow-xs ring-1 ring-blue-500/20'
                  : 'apple-glass apple-card border-black/5 dark:border-white/5 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Diagnóstico de Calidad
                  </span>
                </div>
                <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                  {diagnostic.score}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${diagnostic.score}%` }}
                />
              </div>
            </button>

            {/* Sections Menu List */}
            <div className="apple-glass apple-card p-2 space-y-1 text-xs font-semibold">
              <span className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Secciones del Perfil
              </span>

              {[
                { id: 'personal', label: 'Datos Personales & Contacto', icon: User, count: editableProfile.name ? '✓' : '' },
                { id: 'headline', label: 'Titular Profesional', icon: Award, count: editableProfile.headline ? '✓' : '' },
                { id: 'summary', label: 'Perfil Profesional (Resumen)', icon: FileText, count: editableProfile.summary ? '✓' : '' },
                { id: 'experience', label: 'Experiencia Laboral', icon: Briefcase, count: `${editableProfile.experiences?.length || 0}` },
                { id: 'education', label: 'Formación Académica', icon: GraduationCap, count: `${editableProfile.education?.length || 0}` },
                { id: 'skills', label: 'Competencias por Categoría', icon: Code2, count: `${editableProfile.technical_skills?.length || 0}` },
                { id: 'certifications', label: 'Certificaciones e Idiomas', icon: Languages, count: `${editableProfile.certifications?.length || 0}` },
                { id: 'projects', label: 'Proyectos & Portafolio', icon: FolderGit2, count: `${editableProfile.projects?.length || 0}` },
                { id: 'versions', label: 'Versiones Personalizadas', icon: SlidersHorizontal, count: `${editableProfile.versions?.length || 0}` }
              ].map(sec => {
                const IconComponent = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id as SectionKey)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span className="truncate">{sec.label}</span>
                    </div>
                    {sec.count && (
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
                        }`}
                      >
                        {sec.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE SECTION EDITOR (Right Column) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* ========================================================
                SECTION: OVERVIEW & QUALITY DIAGNOSTIC (Section 9)
                ======================================================== */}
            {activeSection === 'overview' && (
              <div className="apple-glass apple-card p-6 space-y-6 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <span>Diagnóstico de Calidad y Completitud</span>
                    </h2>
                    <p className="text-xs text-gray-500">
                      Evaluación dimensional de tu CV para garantizar máxima efectividad ante reclutadores y sistemas ATS.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {diagnostic.score}%
                    </span>
                    <p className="text-[10px] text-gray-400 font-semibold">Índice Profesional</p>
                  </div>
                </div>

                {/* Dimension Checklist */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Criterios Evaluados
                  </h4>
                  <div className="space-y-2">
                    {diagnostic.checks.map((chk, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                          chk.pass
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                            : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        {chk.pass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <p className="font-semibold">{chk.label}</p>
                          <p className="text-[11px] opacity-80">{chk.tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: PERSONAL DETAILS & CONTACT (Section 6.1)
                ======================================================== */}
            {activeSection === 'personal' && (
              <div className="apple-glass apple-card p-6 space-y-5 animate-fade-in text-xs">
                <div className="border-b border-black/5 dark:border-white/5 pb-3">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Datos Personales y Contacto
                  </h2>
                  <p className="text-xs text-gray-500">
                    Información visible en la cabecera de tus postulaciones.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={editableProfile.name}
                      onChange={(e) => setEditableProfile({ ...editableProfile, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      value={editableProfile.email || ''}
                      onChange={(e) => setEditableProfile({ ...editableProfile, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="text"
                      value={editableProfile.phone || ''}
                      onChange={(e) => setEditableProfile({ ...editableProfile, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Ciudad y País (Ubicación) *</label>
                    <input
                      type="text"
                      value={editableProfile.location || ''}
                      onChange={(e) => setEditableProfile({ ...editableProfile, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Perfil de LinkedIn</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/usuario"
                      value={editableProfile.linkedin_url || ''}
                      onChange={(e) => setEditableProfile({ ...editableProfile, linkedin_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Perfil de GitHub</label>
                    <input
                      type="url"
                      placeholder="https://github.com/usuario"
                      value={editableProfile.github_url || ''}
                      onChange={(e) => setEditableProfile({ ...editableProfile, github_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Sitio Web / Portafolio Online</label>
                    <input
                      type="url"
                      placeholder="https://tuportafolio.dev"
                      value={editableProfile.portfolio_url || ''}
                      onChange={(e) => setEditableProfile({ ...editableProfile, portfolio_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: PROFESSIONAL HEADLINE (Section 6.2)
                ======================================================== */}
            {activeSection === 'headline' && (
              <div className="apple-glass apple-card p-6 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Titular Profesional
                    </h2>
                    <p className="text-xs text-gray-500">
                      Define tu posición estratégica ante los reclutadores en 5 segundos de lectura.
                    </p>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {(editableProfile.headline || '').length} caracteres
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editableProfile.headline || ''}
                    onChange={(e) => setEditableProfile({ ...editableProfile, headline: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans"
                    placeholder="Ej: IT Manager | Líder de Transformación Digital | Cloud Solutions Architect..."
                  />

                  {/* AI Assistant Quick Actions */}
                  <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                    <button
                      onClick={() => triggerAIAssist('headline', 'improve', editableProfile.headline || '')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100 transition font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Optimizar con IA</span>
                    </button>

                    <button
                      onClick={() => triggerAIAssist('headline', 'shorten', editableProfile.headline || '')}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
                    >
                      <span>Sintetizar en 3 Pilares</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: PROFESSIONAL SUMMARY (Section 6.3)
                ======================================================== */}
            {activeSection === 'summary' && (
              <div className="apple-glass apple-card p-6 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Perfil Profesional (Resumen Ejecutivo)
                    </h2>
                    <p className="text-xs text-gray-500">
                      Sintetiza tu valor diferencial, años de trayectoria e impacto verificable.
                    </p>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {(editableProfile.summary || '').trim().split(/\s+/).filter(Boolean).length} palabras
                  </span>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={8}
                    value={editableProfile.summary || ''}
                    onChange={(e) => setEditableProfile({ ...editableProfile, summary: e.target.value })}
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans text-xs"
                    placeholder="Describe tus años de experiencia, especialidad tecnológica y logros de negocio..."
                  />

                  {/* AI Assistant Quick Actions */}
                  <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                    <button
                      onClick={() => triggerAIAssist('summary', 'improve', editableProfile.summary || '')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100 transition font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mejorar Redacción & Impacto</span>
                    </button>

                    <button
                      onClick={() => triggerAIAssist('summary', 'shorten', editableProfile.summary || '')}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
                    >
                      <span>Resumir (Elevator Pitch)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: WORK EXPERIENCE (Section 6.4 Expandable Cards)
                ======================================================== */}
            {activeSection === 'experience' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Experiencia Laboral ({editableProfile.experiences?.length || 0})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Tarjetas expandibles. Destaca resultados cuantitativos y tecnologías utilizadas.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowLinkedInModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5] dark:text-[#3897d3] font-semibold transition border border-[#0077b5]/20 shadow-xs"
                      title="Importar experiencia directamente desde LinkedIn"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z"/>
                      </svg>
                      <span>Importar de LinkedIn</span>
                    </button>

                    <button
                      onClick={() => {
                        const newExp: WorkExperience = {
                          id: Math.random().toString(36).substring(2, 9),
                          company: 'Nueva Empresa',
                          role: 'Nuevo Cargo',
                          start_date: '2024',
                          end_date: 'Presente',
                          location: 'Chile',
                          is_remote: true,
                          description: 'Responsabilidades clave y alcance de la posición.',
                          technologies: ['Tecnología 1'],
                          bullet_achievements: ['Logro alcanzado con métricas cuantificables']
                        };
                        setEditableProfile({
                          ...editableProfile,
                          experiences: [newExp, ...(editableProfile.experiences || [])]
                        });
                        setExpandedExpIds(prev => ({ ...prev, [newExp.id]: true }));
                        toast.info('Nueva experiencia agregada');
                      }}
                      className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Empleo</span>
                    </button>
                  </div>
                </div>

                {/* Experience Cards List */}
                <div className="space-y-3">
                  {(editableProfile.experiences || []).map((exp, expIdx) => {
                    const isExpanded = expandedExpIds[exp.id] ?? (expIdx === 0);

                    return (
                      <div
                        key={exp.id}
                        className="apple-glass apple-card border border-black/5 dark:border-white/5 overflow-hidden transition"
                      >
                        {/* Header Row (Always visible) */}
                        <div
                          onClick={() => setExpandedExpIds(prev => ({ ...prev, [exp.id]: !isExpanded }))}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-gray-900 dark:text-white text-xs">
                                {exp.role}
                              </h3>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium text-gray-600 dark:text-gray-300">{exp.company}</span>
                              {exp.is_remote && (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  Remoto
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">
                              {formatExperiencePeriod(exp.start_date, exp.end_date)} • {exp.location || 'Chile'}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteExpConfirmId(exp.id);
                              }}
                              className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Eliminar experiencia"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {/* Expanded Form Fields */}
                        {isExpanded && (
                          <div className="p-4 border-t border-black/5 dark:border-white/5 bg-gray-50/30 dark:bg-zinc-900/30 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Cargo *</label>
                                <input
                                  type="text"
                                  value={exp.role}
                                  onChange={(e) => {
                                    const exps = [...editableProfile.experiences];
                                    exps[expIdx].role = e.target.value;
                                    setEditableProfile({ ...editableProfile, experiences: exps });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                                />
                              </div>

                              <div>
                                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Empresa *</label>
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) => {
                                    const exps = [...editableProfile.experiences];
                                    exps[expIdx].company = e.target.value;
                                    setEditableProfile({ ...editableProfile, experiences: exps });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                                />
                              </div>

                              <div>
                                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Fecha Inicio</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Ene 2020 o 2020"
                                  value={exp.start_date}
                                  onChange={(e) => {
                                    const exps = [...editableProfile.experiences];
                                    exps[expIdx].start_date = e.target.value;
                                    setEditableProfile({ ...editableProfile, experiences: exps });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="font-semibold text-gray-700 dark:text-gray-300 block">Fecha Término</label>
                                  <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-blue-600 dark:text-blue-400">
                                    <input
                                      type="checkbox"
                                      checked={exp.end_date?.toLowerCase().trim() === 'presente'}
                                      onChange={(e) => {
                                        const exps = [...editableProfile.experiences];
                                        exps[expIdx].end_date = e.target.checked ? 'Presente' : '';
                                        setEditableProfile({ ...editableProfile, experiences: exps });
                                      }}
                                      className="rounded text-blue-600 focus:ring-0 w-3 h-3"
                                    />
                                    <span>Empleo actual</span>
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Ej: Octubre 2026 o Presente"
                                  disabled={exp.end_date?.toLowerCase().trim() === 'presente'}
                                  value={exp.end_date || ''}
                                  onChange={(e) => {
                                    const exps = [...editableProfile.experiences];
                                    exps[expIdx].end_date = e.target.value;
                                    setEditableProfile({ ...editableProfile, experiences: exps });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 disabled:opacity-50"
                                />
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                Responsabilidades y Alcance
                              </label>
                              <textarea
                                rows={2}
                                value={exp.description}
                                onChange={(e) => {
                                  const exps = [...editableProfile.experiences];
                                  exps[expIdx].description = e.target.value;
                                  setEditableProfile({ ...editableProfile, experiences: exps });
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
                              />
                            </div>

                            {/* Bullet Achievements (STAR) */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="font-semibold text-gray-700 dark:text-gray-300">
                                  Logros Clave & Resultados Cuantificables
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const exps = [...editableProfile.experiences];
                                    exps[expIdx].bullet_achievements = [
                                      ...(exps[expIdx].bullet_achievements || []),
                                      'Implementó iniciativa que generó impacto verificable'
                                    ];
                                    setEditableProfile({ ...editableProfile, experiences: exps });
                                  }}
                                  className="text-blue-600 hover:underline text-[11px] font-semibold"
                                >
                                  + Añadir Logro
                                </button>
                              </div>

                              {(exp.bullet_achievements || []).map((bullet, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={bullet}
                                    onChange={(e) => {
                                      const exps = [...editableProfile.experiences];
                                      exps[expIdx].bullet_achievements[bIdx] = e.target.value;
                                      setEditableProfile({ ...editableProfile, experiences: exps });
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
                                  />

                                  {/* AI STAR optimizer button */}
                                  <button
                                    type="button"
                                    onClick={() => triggerAIAssist('experience_bullet', 'star_bullet', bullet, String(bIdx), exp.id)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-700 transition shrink-0"
                                    title="Estructurar con método STAR y verbos de acción técnica"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const exps = [...editableProfile.experiences];
                                      exps[expIdx].bullet_achievements = exps[expIdx].bullet_achievements.filter((_, i) => i !== bIdx);
                                      setEditableProfile({ ...editableProfile, experiences: exps });
                                    }}
                                    className="p-1 text-gray-400 hover:text-rose-500 shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: EDUCATION (Section 6.5)
                ======================================================== */}
            {activeSection === 'education' && (
              <div className="apple-glass apple-card p-6 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Formación Académica ({editableProfile.education?.length || 0})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Títulos universitarios, diplomados y carreras técnicas.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowLinkedInModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5] dark:text-[#3897d3] font-semibold transition border border-[#0077b5]/20 shadow-xs"
                      title="Importar formación académica desde LinkedIn"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z"/>
                      </svg>
                      <span>Importar de LinkedIn</span>
                    </button>

                    <button
                      onClick={() => {
                        const newEdu: EducationItem = {
                          institution: 'Institución o Universidad',
                          degree: 'Título o Programa',
                          field_of_study: 'Especialidad',
                          graduation_year: '2024'
                        };
                        setEditableProfile({
                          ...editableProfile,
                          education: [newEdu, ...(editableProfile.education || [])]
                        });
                        toast.info('Título agregado');
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Título</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(editableProfile.education || []).map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Título Obtenido *</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => {
                              const list = [...editableProfile.education];
                              list[idx].degree = e.target.value;
                              setEditableProfile({ ...editableProfile, education: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Año de Egreso</label>
                          <input
                            type="text"
                            value={edu.graduation_year || ''}
                            onChange={(e) => {
                              const list = [...editableProfile.education];
                              list[idx].graduation_year = e.target.value;
                              setEditableProfile({ ...editableProfile, education: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Institución / Universidad *</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => {
                              const list = [...editableProfile.education];
                              list[idx].institution = e.target.value;
                              setEditableProfile({ ...editableProfile, education: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const list = editableProfile.education.filter((_, i) => i !== idx);
                            setEditableProfile({ ...editableProfile, education: list });
                          }}
                          className="text-rose-500 hover:underline text-[11px]"
                        >
                          Eliminar registro
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: CATEGORIZED SKILLS (Section 6.6)
                ======================================================== */}
            {activeSection === 'skills' && (
              <div className="apple-glass apple-card p-6 space-y-5 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Competencias y Tecnologías ({editableProfile.technical_skills?.length || 0})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Organizadas por familias tecnológicas para facilitar la lectura de reclutadores y algoritmos ATS.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Nueva tecnología..."
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkillName.trim()) {
                          if (!editableProfile.technical_skills.includes(newSkillName.trim())) {
                            setEditableProfile({
                              ...editableProfile,
                              technical_skills: [...editableProfile.technical_skills, newSkillName.trim()]
                            });
                            setNewSkillName('');
                            toast.success(`Habilidad agregada: ${newSkillName.trim()}`);
                          }
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs w-40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSkillName.trim() && !editableProfile.technical_skills.includes(newSkillName.trim())) {
                          setEditableProfile({
                            ...editableProfile,
                            technical_skills: [...editableProfile.technical_skills, newSkillName.trim()]
                          });
                          setNewSkillName('');
                          toast.success('Habilidad agregada');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* Categorized Displays */}
                <div className="space-y-4">
                  {Object.entries(categorizedSkills).map(([catName, skillsList]) => {
                    if (skillsList.length === 0) return null;
                    return (
                      <div key={catName} className="space-y-2">
                        <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block">
                          {catName} ({skillsList.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skillsList.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-black/5 font-medium"
                            >
                              <span>{skill}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditableProfile({
                                    ...editableProfile,
                                    technical_skills: editableProfile.technical_skills.filter(s => s !== skill)
                                  });
                                }}
                                className="text-gray-400 hover:text-rose-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: CERTIFICATIONS & LANGUAGES (Section 6.7)
                ======================================================== */}
            {activeSection === 'certifications' && (
              <div className="apple-glass apple-card p-6 space-y-6 animate-fade-in text-xs">
                {/* Certifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Certificaciones Oficiales
                    </h2>
                    <button
                      onClick={() => {
                        setEditableProfile({
                          ...editableProfile,
                          certifications: [...(editableProfile.certifications || []), 'Nueva Certificación']
                        });
                      }}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      + Añadir Certificación
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editableProfile.certifications || []).map((cert, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={cert}
                          onChange={(e) => {
                            const list = [...editableProfile.certifications];
                            list[i] = e.target.value;
                            setEditableProfile({ ...editableProfile, certifications: list });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = editableProfile.certifications.filter((_, idx) => idx !== i);
                            setEditableProfile({ ...editableProfile, certifications: list });
                          }}
                          className="p-1 text-gray-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">
                    Idiomas
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Español', 'Inglés', 'Portugués', 'Alemán'].map(lang => {
                      const currentVal = editableProfile.languages ? editableProfile.languages[lang] || '' : '';
                      return (
                        <div key={lang} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800">
                          <span className="font-semibold text-gray-900 dark:text-white">{lang}</span>
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const map = { ...(editableProfile.languages || {}) };
                              if (!e.target.value) {
                                delete map[lang];
                              } else {
                                map[lang] = e.target.value;
                              }
                              setEditableProfile({ ...editableProfile, languages: map });
                            }}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-black/10 text-xs"
                          >
                            <option value="">No declarado</option>
                            <option value="Nativo">Nativo</option>
                            <option value="C2 Bilingüe">C2 Bilingüe</option>
                            <option value="C1 Avanzado">C1 Avanzado</option>
                            <option value="B2 Intermedio Alto">B2 Intermedio Alto</option>
                            <option value="B1 Intermedio">B1 Intermedio</option>
                            <option value="A2 Básico">A2 Básico</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: PROJECTS & PORTFOLIO (Section 6.8)
                ======================================================== */}
            {activeSection === 'projects' && (
              <div className="apple-glass apple-card p-6 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Proyectos Destacados & Portafolio ({editableProfile.projects?.length || 0})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Evidencias técnicas tangibles para roles de desarrollo, innovación o consultoría.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const newProj: ProjectItem = {
                        id: Math.random().toString(36).substring(2, 9),
                        name: 'Proyecto de Innovación / Sistema',
                        description: 'Descripción de la solución desarrollada y alcance técnico.',
                        role: 'Tech Lead / Desarrollador',
                        technologies: ['React', 'Python', 'AWS']
                      };
                      setEditableProfile({
                        ...editableProfile,
                        projects: [newProj, ...(editableProfile.projects || [])]
                      });
                      toast.info('Proyecto agregado');
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Proyecto</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(editableProfile.projects || []).length === 0 ? (
                    <p className="text-gray-400 py-4 text-center">
                      No has registrado proyectos destacados aún. Haz clic en "Agregar Proyecto" para incorporar tus mejores iniciativas.
                    </p>
                  ) : (
                    (editableProfile.projects || []).map((proj, idx) => (
                      <div key={proj.id} className="p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/40 border border-black/5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Nombre del Proyecto</label>
                            <input
                              type="text"
                              value={proj.name}
                              onChange={(e) => {
                                const list = [...(editableProfile.projects || [])];
                                list[idx].name = e.target.value;
                                setEditableProfile({ ...editableProfile, projects: list });
                              }}
                              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Tu Rol</label>
                            <input
                              type="text"
                              value={proj.role || ''}
                              onChange={(e) => {
                                const list = [...(editableProfile.projects || [])];
                                list[idx].role = e.target.value;
                                setEditableProfile({ ...editableProfile, projects: list });
                              }}
                              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Descripción e Impacto</label>
                          <textarea
                            rows={2}
                            value={proj.description}
                            onChange={(e) => {
                              const list = [...(editableProfile.projects || [])];
                              list[idx].description = e.target.value;
                              setEditableProfile({ ...editableProfile, projects: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 text-xs"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const list = (editableProfile.projects || []).filter(p => p.id !== proj.id);
                              setEditableProfile({ ...editableProfile, projects: list });
                            }}
                            className="text-rose-500 hover:underline text-[11px]"
                          >
                            Eliminar proyecto
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION: CUSTOMIZED VERSIONS (Section 10)
                ======================================================== */}
            {activeSection === 'versions' && (
              <div className="apple-glass apple-card p-6 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Versiones de Currículum por Cargo Objetivo
                    </h2>
                    <p className="text-xs text-gray-500">
                      Crea versiones específicas (ej. Jefatura TI, Arquitectura Cloud, Full Stack) protegiendo siempre tu CV maestro.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowNewVersionModal(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Versión</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-blue-900 dark:text-blue-300">👑 CV Maestro (Fuente Principal)</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 text-blue-700 font-semibold">Activo permanente</span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                        Contiene la totalidad de tus datos validados.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveVersionId('master')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeVersionId === 'master'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-zinc-800 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {activeVersionId === 'master' ? 'En Uso' : 'Seleccionar'}
                    </button>
                  </div>

                  {(editableProfile.versions || []).map(ver => (
                    <div
                      key={ver.id}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 dark:text-white">🎯 {ver.name}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                            {ver.target_role}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Titular: {ver.headline}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setActiveVersionId(ver.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            activeVersionId === ver.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {activeVersionId === ver.id ? 'En Uso' : 'Seleccionar'}
                        </button>

                        <button
                          onClick={() => handleDeleteVersion(ver.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-500"
                          title="Eliminar versión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================
          MODAL: GUIDED IMPORT REVIEW (Section 7)
          ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in text-xs">
          <div className="apple-glass apple-card max-w-xl w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Revisión de Extracción Guiada</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isExtractingPreview ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-gray-600">Extrayendo y normalizando datos del documento sin modificar tu perfil...</p>
              </div>
            ) : extractedPreview ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Hemos analizado <strong>{extractedPreview.filename}</strong>. Revisa los datos detectados antes de incorporarlos a tu CV maestro:
                </p>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nombre detectado:</span>
                    <strong className="text-gray-900 dark:text-white">{extractedPreview.profile.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contacto:</span>
                    <span className="text-gray-800 dark:text-gray-200">{extractedPreview.profile.email} • {extractedPreview.profile.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Experiencias encontradas:</span>
                    <strong className="text-blue-600">{extractedPreview.profile.experiences?.length || 0} cargos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Competencias técnicas:</span>
                    <strong className="text-blue-600">{extractedPreview.profile.technical_skills?.length || 0} tecnologías</strong>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                  >
                    ✓ Confirmar e incorporar al CV Maestro
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: AI SUGGESTION & DIFF COMPARISON (Section 8)
          ======================================================== */}
      {aiModal && aiModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in text-xs">
          <div className="apple-glass apple-card max-w-lg w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Asistente de Redacción Profesional</span>
              </h3>
              <button onClick={() => setAiModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiModal.isLoading ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-gray-500">Diseñando optimización con Inteligencia Artificial...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Reasoning Banner */}
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 text-blue-900 dark:text-blue-200 text-xs flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>{aiModal.reasoning}</p>
                </div>

                {/* Diff Side by Side */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Texto Original:</span>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-xs">
                    {aiModal.original}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Propuesta Optimizada:</span>
                  <textarea
                    rows={4}
                    value={aiModal.suggestion}
                    onChange={(e) => setAiModal({ ...aiModal, suggestion: e.target.value })}
                    className="w-full p-3 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700 text-gray-900 dark:text-white text-xs leading-relaxed focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-gray-400 italic">Puedes editar el texto propuesto antes de aceptar.</span>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setAiModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleApplyAISuggestion}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                  >
                    ✓ Aceptar y Aplicar Cambio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: IMPORT FROM LINKEDIN
          ======================================================== */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in text-xs">
          <div className="apple-glass apple-card max-w-2xl w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0077b5] text-white flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Importar Experiencia y Educación desde LinkedIn
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Extrae automáticamente tu trayectoria profesional sin tener que escribirla de nuevo
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLinkedInModal(false);
                  setLinkedInResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* STATE 1: Processing */}
              {isProcessingLinkedIn && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-[#0077b5] border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Analizando información con Gemini AI...</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                      Detectando empresas, cargos, períodos, logros cuantificables y formación académica.
                    </p>
                  </div>
                </div>
              )}

              {/* STATE 2: Input Selection (Upload PDF or Paste Text) */}
              {!isProcessingLinkedIn && !linkedInResult && (
                <div className="space-y-4">
                  {/* SubTabs */}
                  <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl space-x-1">
                    <button
                      type="button"
                      onClick={() => setLinkedInSubTab('pdf')}
                      className={`flex-1 py-1.5 rounded-lg font-medium text-center transition ${
                        linkedInSubTab === 'pdf'
                          ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📄 Exportación PDF de LinkedIn (Recomendado)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkedInSubTab('text')}
                      className={`flex-1 py-1.5 rounded-lg font-medium text-center transition ${
                        linkedInSubTab === 'text'
                          ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📋 Pegar Texto / URL
                    </button>
                  </div>

                  {/* SubTab PDF */}
                  {linkedInSubTab === 'pdf' && (
                    <div className="space-y-4">
                      {/* 3 Step Instruction Card */}
                      <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 space-y-2">
                        <div className="font-semibold text-xs flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>¿Cómo descargar tu perfil oficial de LinkedIn en 10 segundos?</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800/90 dark:text-blue-300">
                          <li>Ve a tu perfil en <strong>LinkedIn.com</strong>.</li>
                          <li>Haz clic en el botón <strong>"Recursos"</strong> (o botón <strong>"Más" / "..."</strong> debajo de tu foto de portada y nombre).</li>
                          <li>Selecciona <strong>"Guardar en PDF"</strong> (descargará automáticamente el archivo oficial <em>Profile.pdf</em>).</li>
                        </ol>
                      </div>

                      {/* Dropzone */}
                      <div className="border-2 border-dashed border-[#0077b5]/30 hover:border-[#0077b5] dark:border-zinc-700 rounded-2xl p-8 text-center transition bg-white/40 dark:bg-zinc-800/40">
                        <input
                          type="file"
                          id="linkedin-pdf-input"
                          accept=".pdf"
                          onChange={handleLinkedInFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="linkedin-pdf-input"
                          className="cursor-pointer flex flex-col items-center space-y-2.5"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[#0077b5]/10 text-[#0077b5] flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block text-sm">
                              Selecciona tu archivo Profile.pdf de LinkedIn
                            </span>
                            <span className="text-gray-500 text-xs mt-0.5 block">
                              o arrastra y suelta el archivo aquí (solo formato .PDF)
                            </span>
                          </div>
                          <span className="px-4 py-1.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white font-semibold shadow-xs transition mt-2">
                            Explorar Archivo
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* SubTab Text / URL */}
                  {linkedInSubTab === 'text' && (
                    <form onSubmit={handleLinkedInTextSubmit} className="space-y-3">
                      <div>
                        <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                          Enlace a tu perfil de LinkedIn (opcional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://www.linkedin.com/in/tu-perfil"
                          value={linkedInUrl}
                          onChange={(e) => setLinkedInUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                          Texto copiado de tu perfil de LinkedIn *
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Copia y pega aquí la información de tu perfil de LinkedIn: sección Experiencia laboral, Cargos, Fechas, Educación y Tecnologías..."
                          value={linkedInText}
                          onChange={(e) => setLinkedInText(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs leading-relaxed font-mono"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={!linkedInText.trim() && !linkedInUrl.trim()}
                          className="px-4 py-2 rounded-xl bg-[#0077b5] hover:bg-[#006097] disabled:opacity-50 text-white font-semibold transition shadow-xs flex items-center space-x-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Analizar con Inteligencia Artificial</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* STATE 3: Review & Merge Strategy Selection */}
              {!isProcessingLinkedIn && linkedInResult && (
                <div className="space-y-4">
                  
                  {/* Results Count Summary Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Extracción de LinkedIn Completada</span>
                      </h4>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                        Gemini estructuró con éxito tu trayectoria profesional y académica.
                      </p>
                    </div>

                    <div className="flex space-x-2 text-center">
                      <div className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-zinc-800 border border-emerald-200">
                        <span className="block font-bold text-gray-900 dark:text-white text-xs">{linkedInResult.experiences_count}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-tight">Empleos</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-zinc-800 border border-emerald-200">
                        <span className="block font-bold text-gray-900 dark:text-white text-xs">{linkedInResult.education_count}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-tight">Estudios</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-zinc-800 border border-emerald-200">
                        <span className="block font-bold text-gray-900 dark:text-white text-xs">{linkedInResult.skills_count}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-tight">Skills</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview Items */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                      Vista previa de elementos detectados
                    </h5>

                    {/* Experiences Preview List */}
                    <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-xl bg-gray-50/60 dark:bg-zinc-800/40 border border-black/5">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] mb-1">
                        Experiencias ({linkedInResult.profile?.experiences?.length || 0}):
                      </div>
                      {(linkedInResult.profile?.experiences || []).map((exp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-black/5 text-[11px]">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-gray-900 dark:text-white">{exp.role || 'Cargo registrado'}</span>
                            <span className="text-gray-500 text-[10px]">{formatExperiencePeriod(exp.start_date, exp.end_date)}</span>
                          </div>
                          <span className="text-gray-600 dark:text-gray-300 font-medium">{exp.company || 'Empresa'}</span>
                          {exp.technologies && exp.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {exp.technologies.slice(0, 5).map((t, ti) => (
                                <span key={ti} className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Education Preview List */}
                      {linkedInResult.profile?.education && (linkedInResult.profile.education?.length || 0) > 0 && (
                        <>
                          <div className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] mt-2 mb-1">
                            Educación ({linkedInResult.profile.education?.length || 0}):
                          </div>
                          {(linkedInResult.profile.education || []).map((edu, ei) => (
                            <div key={ei} className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-black/5 text-[11px] flex justify-between">
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white">{edu.degree || 'Título'}</span>
                                <span className="text-gray-500"> • {edu.institution || 'Institución'}</span>
                              </div>
                              <span className="text-gray-500 text-[10px]">{edu.graduation_year || ''}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Merge Strategy Radio Options */}
                  <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                    <label className="font-semibold text-gray-900 dark:text-white block">
                      ¿Cómo deseas integrar estos datos a tu CV Maestro?
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        onClick={() => setMergeStrategy('merge')}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                          mergeStrategy === 'merge'
                            ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-500 shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-black/10 dark:border-white/10 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mergeStrategy"
                          checked={mergeStrategy === 'merge'}
                          onChange={() => setMergeStrategy('merge')}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">
                            Combinar sin duplicar (Recomendado)
                          </span>
                          <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                            Conserva tus registros actuales y agrega los nuevos empleos y títulos de LinkedIn.
                          </span>
                        </div>
                      </label>

                      <label
                        onClick={() => setMergeStrategy('replace')}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                          mergeStrategy === 'replace'
                            ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-500 shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-black/10 dark:border-white/10 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mergeStrategy"
                          checked={mergeStrategy === 'replace'}
                          onChange={() => setMergeStrategy('replace')}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">
                            Reemplazar secciones
                          </span>
                          <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                            Sustituye la lista de empleos y estudios actuales por los de LinkedIn.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-black/5 dark:border-white/5 pt-3 flex items-center justify-between">
              <div>
                {linkedInResult && (
                  <button
                    type="button"
                    onClick={() => setLinkedInResult(null)}
                    className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                  >
                    ← Elegir otro archivo o texto
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkedInModal(false);
                    setLinkedInResult(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>

                {linkedInResult && (
                  <button
                    type="button"
                    onClick={handleConfirmLinkedInImport}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0077b5] hover:bg-[#006097] text-white shadow-xs transition flex items-center space-x-1.5"
                  >
                    <span>✓ Confirmar e incorporar al CV Maestro</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: NEW TARGETED CV VERSION (Section 10)
          ======================================================== */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in text-xs">
          <div className="apple-glass apple-card max-w-md w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Crear Versión Personalizada de CV
              </h3>
              <button onClick={() => setShowNewVersionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Genera una variante orientada a un cargo o industria específica. Tu CV maestro no se modificará.
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Nombre de la Versión *</label>
                <input
                  type="text"
                  placeholder="Ej: Jefatura TI & Cloud"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Cargo Objetivo *</label>
                <input
                  type="text"
                  placeholder="Ej: IT Manager / Cloud Solutions Architect"
                  value={newVersionRole}
                  onChange={(e) => setNewVersionRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                Crear Versión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM DELETE EXPERIENCE DIALOG
          ======================================================== */}
      {deleteExpConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in text-xs">
          <div className="apple-glass apple-card max-w-sm w-full p-6 space-y-4 bg-white/95 dark:bg-zinc-900/95 shadow-2xl text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">¿Eliminar esta experiencia?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Esta acción removerá el empleo de tu currículum maestro.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeleteExpConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setEditableProfile({
                    ...editableProfile,
                    experiences: (editableProfile.experiences || []).filter(e => e.id !== deleteExpConfirmId)
                  });
                  setDeleteExpConfirmId(null);
                  toast.info('Experiencia eliminada');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
