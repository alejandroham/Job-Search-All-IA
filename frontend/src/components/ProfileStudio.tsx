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
  Save
} from 'lucide-react';
import type { CandidateProfile } from '../types';
import { api } from '../api';

interface ProfileStudioProps {
  profile: CandidateProfile;
  onProfileUpdated: (p: CandidateProfile) => void;
}

export const ProfileStudio: React.FC<ProfileStudioProps> = ({ profile, onProfileUpdated }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableProfile, setEditableProfile] = useState<CandidateProfile>(profile);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage('Analizando CV con Gemini / LLM y extrayendo competencias verificables...');
    try {
      const res = await api.uploadCV(file);
      onProfileUpdated(res.profile);
      setEditableProfile(res.profile);
      setUploadMessage('¡CV analizado y perfil actualizado exitosamente!');
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
      setIsEditing(false);
    } catch (e) {
      alert('Error guardando perfil: ' + e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* CV Uploader Dropzone (Apple Style) */}
      <div className="apple-glass apple-card p-6 sm:p-8 text-center border-dashed border-2 border-gray-300 dark:border-zinc-700 hover:border-blue-500/50 transition">
        <input
          type="file"
          id="cv-upload"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        <label htmlFor="cv-upload" className="cursor-pointer block space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Upload className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isUploading ? 'Analizando tu currículum...' : 'Sube tu Currículum (CV)'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
              Soporta archivos PDF, Word (DOCX) o Texto. El agente de IA extraerá tus fortalezas, años de experiencia y proyectos verificables.
            </p>
          </div>
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition">
            Seleccionar Archivo
          </span>
        </label>

        {uploadMessage && (
          <p className="mt-4 text-xs font-medium text-blue-600 dark:text-blue-400 animate-fade-in">
            {uploadMessage}
          </p>
        )}
      </div>

      {/* Main Profile View */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-8">
        
        {/* Header / Basic Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-700 to-gray-900 text-white flex items-center justify-center text-xl font-bold">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editableProfile.name}
                    onChange={(e) => setEditableProfile({ ...editableProfile, name: e.target.value })}
                    className="text-lg font-semibold bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded"
                  />
                  <input
                    type="text"
                    value={editableProfile.headline || ''}
                    onChange={(e) => setEditableProfile({ ...editableProfile, headline: e.target.value })}
                    className="text-xs text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded block"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    {profile.name || 'Candidato'}
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {profile.headline || 'Perfil Tecnológico'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {profile.location || 'Remoto'} • {profile.years_of_experience} años de experiencia
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <button
                onClick={handleSaveEdit}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditableProfile(profile);
                  setIsEditing(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Perfil</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Resumen Profesional</h4>
          {isEditing ? (
            <textarea
              rows={3}
              value={editableProfile.summary || ''}
              onChange={(e) => setEditableProfile({ ...editableProfile, summary: e.target.value })}
              className="w-full text-xs p-3 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {profile.summary || 'Aún no se ha generado un resumen profesional. Sube tu CV para que el agente lo analice automáticamente.'}
            </p>
          )}
        </div>

        {/* Skills Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
            <Code2 className="w-3.5 h-3.5" />
            <span>Habilidades Técnicas Extraídas</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {profile.technical_skills && profile.technical_skills.length > 0 ? (
              profile.technical_skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">Sin habilidades cargadas aún.</span>
            )}
          </div>
        </div>

        {/* Languages */}
        {profile.languages && Object.keys(profile.languages).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
              <Languages className="w-3.5 h-3.5" />
              <span>Idiomas</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(profile.languages).map(([lang, level], i) => (
                <div key={i} className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 text-xs">
                  <div className="font-semibold text-gray-900 dark:text-white">{lang}</div>
                  <div className="text-gray-500 text-[11px]">{level}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience Timeline */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Experiencia Laboral Verificada</span>
          </h4>

          <div className="space-y-4">
            {profile.experiences && profile.experiences.length > 0 ? (
              profile.experiences.map((exp, i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {exp.role} <span className="text-blue-600 dark:text-blue-400 font-normal">@ {exp.company}</span>
                    </h5>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {exp.start_date} – {exp.end_date || 'Presente'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300">{exp.description}</p>

                  {exp.bullet_achievements && exp.bullet_achievements.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-0.5 pt-1">
                      {exp.bullet_achievements.map((ach, idx) => (
                        <li key={idx}>{ach}</li>
                      ))}
                    </ul>
                  )}

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {exp.technologies.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-gray-200/60 dark:bg-zinc-700/60 text-gray-700 dark:text-gray-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Sin experiencia registrada. Carga tu CV para sincronizarla.</p>
            )}
          </div>
        </div>

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Educación y Formación</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.education.map((edu, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 text-xs">
                  <div className="font-semibold text-gray-900 dark:text-white">{edu.degree} en {edu.field_of_study}</div>
                  <div className="text-gray-500">{edu.institution} {edu.graduation_year ? `(${edu.graduation_year})` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
