import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  MessageSquare,
  CheckCircle,
  Send,
  ArrowRight,
  Briefcase,
  Star
} from 'lucide-react';
import type { JobPosting } from '../types';
import { api } from '../api';

interface InterviewPrepProps {
  jobs: JobPosting[];
}

export const InterviewPrep: React.FC<InterviewPrepProps> = ({ jobs }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs.length > 0 ? jobs[0].id : '');
  const [prepKit, setPrepKit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [answerEvaluation, setAnswerEvaluation] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleGeneratePrep = async () => {
    if (!selectedJobId) return;
    setIsLoading(true);
    setPrepKit(null);
    setAnswerEvaluation(null);
    try {
      const data = await api.getInterviewPrep(selectedJobId);
      setPrepKit(data);
      if (data.technical_questions?.length > 0) {
        setSelectedQuestion(data.technical_questions[0].question);
      }
    } catch (e) {
      alert('Error generando preparación: ' + e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !candidateAnswer.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await api.evaluateInterviewAnswer(selectedQuestion, candidateAnswer);
      setAnswerEvaluation(res);
    } catch (e) {
      alert('Error evaluando respuesta: ' + e);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Coach de Entrevistas & Simulador STAR</span>
        </h2>
        <p className="text-xs text-gray-500">
          Entrena respuestas con historias reales de tu CV y recibe retroalimentación de impacto técnico
        </p>
      </div>

      {/* Job Selector Card */}
      <div className="apple-glass apple-card p-6 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Selecciona la vacante para preparar tu entrevista:
        </label>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="flex-1 w-full text-xs p-3 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none"
          >
            {jobs.length === 0 ? (
              <option value="">No hay vacantes en el radar (escanea primero en Radar de Empleo)</option>
            ) : (
              jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} @ {j.company} ({j.location})
                </option>
              ))
            )}
          </select>

          <button
            onClick={handleGeneratePrep}
            disabled={isLoading || !selectedJobId}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Diseñando Preguntas...' : 'Generar Kit de Preparación'}</span>
          </button>
        </div>
      </div>

      {/* Generated Kit Display */}
      {prepKit && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Company Focus */}
          <div className="apple-glass apple-card p-5 border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20 text-xs">
            <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-1">
              Foco del Entrevistador:
            </span>
            <p className="text-gray-700 dark:text-gray-300">{prepKit.company_focus}</p>
          </div>

          {/* Questions Tabs / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Technical Questions */}
            <div className="apple-glass apple-card p-6 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                <Briefcase className="w-4 h-4" />
                <span>Preguntas Técnicas & Arquitectura</span>
              </h4>
              <div className="space-y-2">
                {prepKit.technical_questions?.map((q: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => setSelectedQuestion(q.question)}
                    className={`p-3 rounded-xl cursor-pointer text-xs transition border ${
                      selectedQuestion === q.question
                        ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-500 text-blue-950 dark:text-blue-100'
                        : 'bg-gray-50/70 dark:bg-zinc-800/40 border-black/5 dark:border-white/5 hover:border-blue-400'
                    }`}
                  >
                    <div className="font-medium">{q.question}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Clave: {q.key_concepts}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Behavioral STAR Questions */}
            <div className="apple-glass apple-card p-6 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <Star className="w-4 h-4" />
                <span>Preguntas Conductuales (Método STAR)</span>
              </h4>
              <div className="space-y-2">
                {prepKit.behavioral_questions?.map((q: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => setSelectedQuestion(q.question)}
                    className={`p-3 rounded-xl cursor-pointer text-xs transition border ${
                      selectedQuestion === q.question
                        ? 'bg-emerald-50/80 dark:bg-emerald-900/30 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                        : 'bg-gray-50/70 dark:bg-zinc-800/40 border-black/5 dark:border-white/5 hover:border-emerald-400'
                    }`}
                  >
                    <div className="font-medium">{q.question}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Ejemplo CV sugerido: {q.suggested_star_story}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Mock Practice Box */}
          {selectedQuestion && (
            <div className="apple-glass apple-card p-6 sm:p-8 space-y-4 border-blue-500/20">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Simulador de Respuesta
                </span>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  "{selectedQuestion}"
                </h4>
              </div>

              <form onSubmit={handleEvaluateAnswer} className="space-y-3">
                <textarea
                  rows={4}
                  placeholder="Redacta o sintetiza cómo responderías esta pregunta en la entrevista..."
                  value={candidateAnswer}
                  onChange={(e) => setCandidateAnswer(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-xl bg-gray-100/90 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isEvaluating || !candidateAnswer.trim()}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEvaluating ? 'Analizando...' : 'Evaluar con IA'}</span>
                  </button>
                </div>
              </form>

              {/* AI Feedback on candidate's answer */}
              {answerEvaluation && (
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-300">
                    <span>Diagnóstico de tu respuesta:</span>
                    <span className="text-base text-blue-600">{answerEvaluation.score || 85}/100</span>
                  </div>

                  {answerEvaluation.strengths && (
                    <div className="text-gray-700 dark:text-gray-300">
                      <strong>Fortalezas:</strong> {answerEvaluation.strengths.join(', ')}
                    </div>
                  )}

                  {answerEvaluation.improvements && (
                    <div className="text-amber-700 dark:text-amber-300">
                      <strong>A mejorar:</strong> {answerEvaluation.improvements.join(', ')}
                    </div>
                  )}

                  {answerEvaluation.improved_version_sample && (
                    <div className="mt-2 p-3 rounded-lg bg-white/70 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 italic leading-relaxed">
                      <strong>Versión con mayor impacto recomendada:</strong> "{answerEvaluation.improved_version_sample}"
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Strategic Questions to ask interviewer */}
          {prepKit.questions_to_ask_interviewer && (
            <div className="apple-glass apple-card p-5 space-y-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Preguntas de Alto Impacto para Hacerle al Entrevistador al Final:
              </h5>
              <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {prepKit.questions_to_ask_interviewer.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
