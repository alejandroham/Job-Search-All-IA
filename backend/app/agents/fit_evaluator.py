import json
from typing import Dict, Any, List
from app.models.schemas import CandidateProfile, UserPreferences, JobPosting, FitEvaluation, FitDimensionScore
from app.agents.llm_provider import llm
from app.storage.db import db
import logging

logger = logging.getLogger(__name__)

class FitEvaluator:
    def evaluate(self, job: JobPosting, profile: CandidateProfile, preferences: UserPreferences) -> FitEvaluation:
        # Pre-check remote dealbreaker if user strictly requested remote
        deal_breakers_found = []
        if preferences.remote_only and not job.is_remote:
            deal_breakers_found.append("La vacante requiere presencia física y tienes configurada preferencia 100% Remota.")

        # Prepare context for LLM evaluation
        system_instruction = (
            "Eres un evaluador implacable y objetivo de ajuste laboral (Fit Evaluator) para talento tecnológico de alto nivel. "
            "Tu deber es calificar con honestidad radical el ajuste entre el perfil del candidato y la vacante en 5 dimensiones. "
            "No infles calificaciones. Si hay brechas tecnológicas o faltan requisitos, márcalos con claridad."
        )

        profile_summary = {
            "name": profile.name,
            "headline": profile.headline,
            "years_experience": profile.years_of_experience,
            "technical_skills": profile.technical_skills,
            "languages": profile.languages,
            "recent_roles": [f"{e.role} en {e.company} ({e.start_date}-{e.end_date}): {', '.join(e.technologies)}" for e in profile.experiences[:4]]
        }

        prompt = f"""
EVALÚA EL AJUSTE ENTRE EL CANDIDATO Y LA SIGUIENTE VACANTE.

PERFIL DEL CANDIDATO:
{json.dumps(profile_summary, ensure_ascii=False, indent=2)}

PREFERENCIAS DEL CANDIDATO Y REGLAS ELIMINATORIAS (DEAL BREAKERS):
- Roles deseados: {', '.join(preferences.target_roles)}
- Modalidad remota obligatoria: {'Sí' if preferences.remote_only else 'Flexible'}
- Salario mínimo deseado: {preferences.min_salary_usd} USD/año
- Deal Breakers declarados: {json.dumps(preferences.deal_breakers, ensure_ascii=False)}
- Aprendizaje continuo de preferencias previas: {json.dumps(preferences.auto_learned_insights, ensure_ascii=False)}

OFERTA DE EMPLEO A EVALUAR:
- Título: {job.title}
- Empresa: {job.company}
- Ubicación / Remoto: {job.location} ({'Remoto' if job.is_remote else 'Presencial/Híbrido'})
- Rango Salarial declarado: {job.salary_range or 'No especificado'}
- Descripción:
{job.description[:4500]}

RESPONDE ÚNICAMENTE CON UN JSON CON ESTA ESTRUCTURA EXACTA:
{{
  "overall_score": 85,
  "verdict": "Altamente Recomendado" | "Buen Ajuste" | "Ajuste Moderado" | "No Recomendado",
  "dimension_scores": [
    {{"dimension": "Technical Skills", "score": 85, "reasoning": "Razón sintética"}},
    {{"dimension": "Experience & Seniority", "score": 80, "reasoning": "Razón sintética"}},
    {{"dimension": "Culture & Work Style", "score": 90, "reasoning": "Razón sintética"}},
    {{"dimension": "Remote Flexibility", "score": 100, "reasoning": "Razón sintética"}},
    {{"dimension": "Career Alignment", "score": 75, "reasoning": "Razón sintética"}}
  ],
  "strengths": [
    "Fortaleza 1 demostrada en su trayectoria",
    "Fortaleza 2"
  ],
  "missing_skills": [
    "Habilidad o herramienta mencionada en la oferta que no está en el perfil"
  ],
  "deal_breakers_found": [
    "Cualquier condición eliminatoria detectada"
  ],
  "recommendation_summary": "Párrafo breve explicando si vale la pena postular y qué ángulo destacar."
}}
"""

        res = llm.generate_json(prompt, system_instruction=system_instruction)
        
        # If deal breaker was caught by rule check, append it
        found_db = res.get("deal_breakers_found", [])
        if deal_breakers_found:
            for d in deal_breakers_found:
                if d not in found_db:
                    found_db.append(d)

        overall = res.get("overall_score", 70)
        if found_db:
            overall = min(overall, 45) # cap score if dealbreaker is present

        verdict = res.get("verdict", "Ajuste Moderado")
        if overall >= 85:
            verdict = "Altamente Recomendado"
        elif overall >= 70:
            verdict = "Buen Ajuste"
        elif overall >= 50:
            verdict = "Ajuste Moderado"
        else:
            verdict = "No Recomendado"

        dim_scores = [FitDimensionScore(**d) for d in res.get("dimension_scores", [])]
        if not dim_scores:
            dim_scores = [
                FitDimensionScore(dimension="Technical Skills", score=overall, reasoning="Evaluación general de habilidades"),
                FitDimensionScore(dimension="Experience & Seniority", score=overall, reasoning="Nivel de experiencia compatible"),
                FitDimensionScore(dimension="Culture & Work Style", score=overall, reasoning="Estilo de trabajo compatible"),
                FitDimensionScore(dimension="Remote Flexibility", score=100 if job.is_remote else 40, reasoning="Modalidad de trabajo"),
                FitDimensionScore(dimension="Career Alignment", score=overall, reasoning="Proyección profesional")
            ]

        evaluation = FitEvaluation(
            job_id=job.id,
            overall_score=overall,
            verdict=verdict,
            dimension_scores=dim_scores,
            strengths=res.get("strengths", ["Alineación con el rol general"]),
            missing_skills=res.get("missing_skills", []),
            deal_breakers_found=found_db,
            recommendation_summary=res.get("recommendation_summary", "Se recomienda revisar los detalles específicos antes de postular.")
        )

        # Update the job with the score in the database
        db.update_job_status(job.id, status=job.status, fit_score=overall)

        return evaluation

fit_evaluator = FitEvaluator()
