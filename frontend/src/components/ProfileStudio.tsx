import React, { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import type { CandidateProfile, WorkExperience, EducationItem } from '../types';
import { api } from '../api';

interface ProfileStudioProps {
  profile: CandidateProfile;
  onProfileUpdated: (p: CandidateProfile) => void;
}

export const ProfileStudio: React.FC<ProfileStudioProps> = ({ profile, onProfileUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'preview' | 'raw'>('editor');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [editableProfile, setEditableProfile] = useState<CandidateProfile>(profile);
  const [newSkill, setNewSkill] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync when prop updates
  React.useEffect(() => {
    setEditableProfile(profile);
  }, [profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage('Analizando tu currículum y extrayendo toda tu experiencia real...');
    try {
      const res = await api.uploadCV(file);
      onProfileUpdated(res.profile);
      setEditableProfile(res.profile);
      setUploadMessage('¡CV analizado y perfil sincronizado exitosamente con tu información real!');
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (err: any) {
      setUploadMessage('Error al subir: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await api.updateProfile(editableProfile);
      onProfileUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      alert('Error guardando perfil: ' + e);
    }
  };

  // Skill management
  const addSkill = () => {
    if (newSkill.trim() && !editableProfile.technical_skills.includes(newSkill.trim())) {
      setEditableProfile({
        ...editableProfile,
        technical_skills: [...editableProfile.technical_skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setEditableProfile({
      ...editableProfile,
      technical_skills: editableProfile.technical_skills.filter(s => s !== skill)
    });
  };

  // Experience management
  const addExperience = () => {
    const newExp: WorkExperience = {
      id: Math.random().toString(36).substring(2, 9),
      company: 'Nueva Empresa',
      role: 'Nuevo Cargo',
      start_date: '2024',
      end_date: 'Presente',
      location: 'Remoto',
      is_remote: true,
      description: 'Descripción de responsabilidades y alcance.',
      technologies: [],
      bullet_achievements: ['Logro principal alcanzado con métricas']
    };
    setEditableProfile({
      ...editableProfile,
      experiences: [newExp, ...editableProfile.experiences]
    });
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: any) => {
    setEditableProfile({
      ...editableProfile,
      experiences: editableProfile.experiences.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const removeExperience = (id: string) => {
    setEditableProfile({
      ...editableProfile,
      experiences: editableProfile.experiences.filter(e => e.id !== id)
    });
  };

  // Education management
  const addEducation = () => {
    const newEdu: EducationItem = {
      institution: 'Institución o Universidad',
      degree: 'Título o Certificación',
      field_of_study: 'Informática / Tecnología',
      graduation_year: '2024'
    };
    setEditableProfile({
      ...editableProfile,
      education: [newEdu, ...editableProfile.education]
    });
  };

  const updateEducation = (idx: number, field: keyof EducationItem, value: any) => {
    const copy = [...editableProfile.education];
    copy[idx] = { ...copy[idx], [field]: value };
    setEditableProfile({ ...editableProfile, education: copy });
  };

  const removeEducation = (idx: number) => {
    setEditableProfile({
      ...editableProfile,
      education: editableProfile.education.filter((_, i) => i !== idx)
    });
  };

  // Build formatted markdown document
  const generateFullMarkdownCV = (): string => {
    const p = editableProfile;
    let md = `# ${p.name}\n`;
    md += `**${p.headline}**\n\n`;
    md += `📍 ${p.location || 'Remoto'} | ✉️ ${p.email || ''} | 📞 ${p.phone || ''}\n`;
    if (p.linkedin_url) md += `LinkedIn: ${p.linkedin_url} | `;
    if (p.github_url) md += `GitHub: ${p.github_url}\n\n`;

    md += `## Perfil Profesional\n${p.summary}\n\n`;

    if (p.technical_skills.length > 0) {
      md += `## Habilidades Técnicas\n${p.technical_skills.join(' • ')}\n\n`;
    }

    if (p.soft_skills.length > 0) {
      md += `## Competencias de Gestión\n${p.soft_skills.join(' • ')}\n\n`;
    }

    md += `## Experiencia Laboral\n`;
    p.experiences.forEach(exp => {
      md += `### ${exp.role} — ${exp.company}\n`;
      md += `*${exp.start_date} – ${exp.end_date || 'Presente'} | ${exp.location || 'Chile'}*\n`;
      if (exp.description) md += `${exp.description}\n`;
      exp.bullet_achievements.forEach(b => {
        md += `- ${b}\n`;
      });
      if (exp.technologies && exp.technologies.length > 0) {
        md += `*Tecnologías:* ${exp.technologies.join(', ')}\n`;
      }
      md += `\n`;
    });

    if (p.education.length > 0) {
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
    navigator.clipboard.writeText(generateFullMarkdownCV());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([generateFullMarkdownCV()], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_${editableProfile.name.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Banner / Upload Zone */}
      <div className="apple-glass apple-card p-6 text-center border-dashed border-2 border-gray-300 dark:border-zinc-700 hover:border-blue-500/50 transition">
        <input
          type="file"
          id="cv-upload"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        <label htmlFor="cv-upload" className="cursor-pointer block space-y-2">
          <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Upload className={`w-5 h-5 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isUploading ? 'Analizando tu currículum...' : 'Subir o Actualizar CV (PDF o Word)'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Sube tu documento para extraer automáticamente tu historial real, o edítalo directamente abajo.
            </p>
          </div>
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition">
            Seleccionar Archivo
          </span>
        </label>

        {uploadMessage && (
          <p className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 animate-fade-in">
            {uploadMessage}
          </p>
        )}
      </div>

      {/* Sub-Navigation (Apple Segmented Bar) */}
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
        <div className="flex items-center bg-gray-200/50 dark:bg-zinc-800/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('editor')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'editor'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor de CV Completo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('preview')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'preview'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Previa del CV (Imprimible)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('raw')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'raw'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Texto Original Extraído</span>
          </button>
        </div>

        {/* Action Button */}
        {activeSubTab === 'editor' && (
          <button
            onClick={handleSaveEdit}
            className="flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveSuccess ? '¡Guardado con Éxito!' : 'Guardar CV Maestro'}</span>
          </button>
        )}

        {activeSubTab === 'preview' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 transition hover:bg-gray-200"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 transition hover:bg-gray-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .md</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* --- TAB 1: COMPLETE CV EDITOR --- */}
      {activeSubTab === 'editor' && (
        <div className="space-y-6">
          
          {/* Section 1: Personal Details */}
          <div className="apple-glass apple-card p-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-blue-500" />
              <span>Datos Personales y Contacto</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Nombre Completo:</label>
                <input
                  type="text"
                  value={editableProfile.name}
                  onChange={(e) => setEditableProfile({ ...editableProfile, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Titular Profesional:</label>
                <input
                  type="text"
                  value={editableProfile.headline || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, headline: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Correo Electrónico:</label>
                <input
                  type="email"
                  value={editableProfile.email || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Teléfono:</label>
                <input
                  type="text"
                  value={editableProfile.phone || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Ubicación:</label>
                <input
                  type="text"
                  value={editableProfile.location || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, location: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Años de Experiencia:</label>
                <input
                  type="number"
                  step="0.5"
                  value={editableProfile.years_of_experience || 0}
                  onChange={(e) => setEditableProfile({ ...editableProfile, years_of_experience: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">LinkedIn URL:</label>
                <input
                  type="text"
                  value={editableProfile.linkedin_url || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, linkedin_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">GitHub URL:</label>
                <input
                  type="text"
                  value={editableProfile.github_url || ''}
                  onChange={(e) => setEditableProfile({ ...editableProfile, github_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional Summary */}
          <div className="apple-glass apple-card p-6 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Perfil Profesional (Resumen Ejecutivo)</h4>
            <textarea
              rows={4}
              value={editableProfile.summary || ''}
              onChange={(e) => setEditableProfile({ ...editableProfile, summary: e.target.value })}
              className="w-full text-xs p-3.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white leading-relaxed focus:outline-none"
            />
          </div>

          {/* Section 3: Technical Skills Cloud */}
          <div className="apple-glass apple-card p-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
              <Code2 className="w-4 h-4 text-blue-500" />
              <span>Competencias & Tecnologías Clave</span>
            </h4>

            <div className="flex flex-wrap gap-1.5">
              {editableProfile.technical_skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50"
                >
                  <span>{skill}</span>
                  <button onClick={() => removeSkill(skill)} className="hover:text-red-500 transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                placeholder="Añadir tecnología o herramienta (ej. Python, Kubernetes, Terraform)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 text-xs px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
              />
              <button onClick={addSkill} className="p-2 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section 4: Work Experiences (Full Editing) */}
          <div className="apple-glass apple-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                <Briefcase className="w-4 h-4 text-emerald-500" />
                <span>Experiencia Laboral ({editableProfile.experiences.length})</span>
              </h4>
              <button
                onClick={addExperience}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Empleo</span>
              </button>
            </div>

            <div className="space-y-4">
              {editableProfile.experiences.map((exp, idx) => (
                <div key={exp.id || idx} className="p-4 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 text-xs">
                      <input
                        type="text"
                        placeholder="Cargo / Rol"
                        value={exp.role}
                        onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Empresa / Institución"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
                      />
                      <input
                        type="text"
                        placeholder="Fechas (ej. 2022 - Presente)"
                        value={exp.start_date}
                        onChange={(e) => updateExperience(exp.id, 'start_date', e.target.value)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
                      />
                    </div>
                    <button
                      onClick={() => removeExperience(exp.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition"
                      title="Eliminar este empleo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bullet achievements textarea */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Logros y responsabilidades (uno por línea):
                    </label>
                    <textarea
                      rows={3}
                      value={exp.bullet_achievements.join('\n')}
                      onChange={(e) => updateExperience(exp.id, 'bullet_achievements', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Viñeta 1 de logro alcanzado..."
                      className="w-full p-2.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Education */}
          <div className="apple-glass apple-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                <GraduationCap className="w-4 h-4 text-purple-500" />
                <span>Formación Académica ({editableProfile.education.length})</span>
              </h4>
              <button
                onClick={addEducation}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Estudio</span>
              </button>
            </div>

            <div className="space-y-3">
              {editableProfile.education.map((edu, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Título / Carrera"
                      value={edu.degree}
                      onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                      className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Institución Educativa"
                      value={edu.institution}
                      onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                      className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
                    />
                    <input
                      type="text"
                      placeholder="Año o Periodo"
                      value={edu.graduation_year || ''}
                      onChange={(e) => updateEducation(idx, 'graduation_year', e.target.value)}
                      className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
                    />
                  </div>
                  <button
                    onClick={() => removeEducation(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: PREVIEW FORMATTED CV (APPLE / ATS RENDER) --- */}
      {activeSubTab === 'preview' && (
        <div className="apple-glass apple-card p-8 sm:p-12 space-y-8 bg-white dark:bg-[#1C1C1E] print:p-0 print:border-none print:shadow-none">
          
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-zinc-800 pb-6 text-center sm:text-left space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {editableProfile.name}
            </h1>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {editableProfile.headline}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              {editableProfile.location && <span>📍 {editableProfile.location}</span>}
              {editableProfile.email && <span>✉️ {editableProfile.email}</span>}
              {editableProfile.phone && <span>📞 {editableProfile.phone}</span>}
              {editableProfile.linkedin_url && (
                <a href={editableProfile.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                  LinkedIn
                </a>
              )}
              {editableProfile.github_url && (
                <a href={editableProfile.github_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {editableProfile.summary && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Perfil Profesional
              </h2>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {editableProfile.summary}
              </p>
            </div>
          )}

          {/* Technical Skills */}
          {editableProfile.technical_skills.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Competencias Técnicas
              </h2>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-mono">
                {editableProfile.technical_skills.join('  •  ')}
              </p>
            </div>
          )}

          {/* Work Experiences */}
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Experiencia Laboral
            </h2>
            <div className="space-y-5">
              {editableProfile.experiences.map((exp, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-gray-900 dark:text-white">
                    <span>{exp.role} <span className="font-normal text-gray-500">— {exp.company}</span></span>
                    <span className="text-[11px] text-gray-400 font-normal">{exp.start_date} – {exp.end_date || 'Presente'}</span>
                  </div>
                  {exp.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">{exp.description}</p>
                  )}
                  {exp.bullet_achievements && exp.bullet_achievements.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-1 pt-1">
                      {exp.bullet_achievements.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          {editableProfile.education.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Formación Académica
              </h2>
              <div className="space-y-2">
                {editableProfile.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {edu.degree} <span className="font-normal text-gray-500">— {edu.institution}</span>
                    </span>
                    <span className="text-gray-400 text-[11px]">{edu.graduation_year}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {editableProfile.languages && Object.keys(editableProfile.languages).length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Idiomas
              </h2>
              <div className="flex flex-wrap gap-4 text-xs text-gray-700 dark:text-gray-300">
                {Object.entries(editableProfile.languages).map(([lang, lvl], i) => (
                  <span key={i}><strong>{lang}:</strong> {lvl}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- TAB 3: RAW EXTRACTED TEXT --- */}
      {activeSubTab === 'raw' && (
        <div className="apple-glass apple-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Texto Íntegro Extraído del Documento
              </h4>
              <p className="text-[11px] text-gray-500">
                Este es el texto original que lee el analizador del archivo PDF o Word.
              </p>
            </div>
          </div>
          <pre className="p-4 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto leading-relaxed">
            {editableProfile.raw_cv_text || 'No hay texto extraído todavía. Sube un archivo arriba para verlo.'}
          </pre>
        </div>
      )}

    </div>
  );
};
