import React, { useState } from 'react';
import {
  FileText,
  Mail,
  CheckCircle2,
  Copy,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import type { ApplicationDraft } from '../types';

interface ApplicationStudioProps {
  applications: ApplicationDraft[];
}

export const ApplicationStudio: React.FC<ApplicationStudioProps> = ({ applications }) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationDraft | null>(
    applications.length > 0 ? applications[0] : null
  );
  const [subTab, setSubTab] = useState<'cv' | 'cover_letter'>('cv');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
            Adaptador & Postulaciones (Drafter-Reviewer)
          </h2>
          <p className="text-xs text-gray-500">
            Documentos generados y auditados para pasar filtros ATS sin falsear datos
          </p>
        </div>

        {applications.length > 0 && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{applications.length} postulaciones preparadas</span>
          </div>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="apple-glass apple-card p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Aún no hay postulaciones generadas</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Ve al "Radar de Empleo" y presiona "Adaptar CV" en cualquier vacante. El pipeline Drafter-Reviewer adaptará tus proyectos reales y redactará la carta de presentación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Applications Selector Sidebar */}
          <div className="no-print lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">
              Postulaciones Listas
            </div>
            {applications.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-800/90 border-blue-500/40 shadow-sm'
                      : 'bg-white/50 dark:bg-zinc-900/40 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {app.job_title}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{app.company}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                      {app.ats_score}% ATS
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400">
                    {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Document Viewer & Editor */}
          {selectedApp && (
            <div className="lg:col-span-8 space-y-4">
              
              {/* Document Actions Bar */}
              <div className="no-print apple-glass apple-card p-4 flex flex-wrap items-center justify-between gap-3">
                {/* Sub tabs: CV vs Cover Letter */}
                <div className="flex items-center bg-gray-200/50 dark:bg-zinc-800/60 p-1 rounded-xl border border-black/5 dark:border-white/5">
                  <button
                    onClick={() => setSubTab('cv')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      subTab === 'cv'
                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CV Adaptado</span>
                  </button>

                  <button
                    onClick={() => setSubTab('cover_letter')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      subTab === 'cover_letter'
                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Carta de Presentación</span>
                  </button>
                </div>

                {/* Export & Copy buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(
                      subTab === 'cv' ? selectedApp.tailored_cv_markdown : selectedApp.cover_letter,
                      subTab
                    )}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied === subTab ? '¡Copiado!' : 'Copiar'}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(
                      subTab === 'cv' ? selectedApp.tailored_cv_markdown : selectedApp.cover_letter,
                      `${selectedApp.company}_${subTab}.md`
                    )}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .md</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>

              </div>

              {/* Reviewer / ATS Critique Card */}
              <div className="no-print apple-glass apple-card p-4 space-y-2 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Auditoría de Revisor & Compatibilidad ATS ({selectedApp.ats_score}/100)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                  "{selectedApp.reviewer_critique || 'Documentos verificados sin exageraciones ni afirmaciones falsas.'}"
                </p>
                {selectedApp.ats_feedback && selectedApp.ats_feedback.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedApp.ats_feedback.map((f, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Document Content */}
              <div className="printable-cv apple-glass apple-card p-6 sm:p-8 min-h-[500px]">
                {subTab === 'cv' ? (
                  <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-mono bg-white dark:bg-zinc-950 p-6 rounded-xl border border-black/5 dark:border-white/5">
                    {selectedApp.tailored_cv_markdown}
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-4 p-6 bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5">
                    <div className="text-xs text-gray-400 font-mono border-b border-black/5 dark:border-white/5 pb-2">
                      Para: Equipo de Selección de {selectedApp.company}<br />
                      Puesto: {selectedApp.job_title}
                    </div>
                    <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line font-sans">
                      {selectedApp.cover_letter}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
