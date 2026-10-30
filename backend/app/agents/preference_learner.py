import json
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.schemas import (
    FeedbackAction,
    UserPreferences,
    ProfileDNA,
    LearnedStarStory,
    MemoryStats,
    CandidateProfile
)
from app.storage.db import db
from app.agents.llm_provider import llm

logger = logging.getLogger(__name__)

class PreferenceLearner:
    def reset_memory(self) -> UserPreferences:
        """Wipes all learned cognitive memory and feedback history to start completely fresh."""
        prefs = db.get_preferences()
        prefs.auto_learned_insights = []
        prefs.learned_star_stories = []
        prefs.industry_insights = []
        prefs.profile_dna = ProfileDNA(
            summary="Perfil en proceso de calibración inicial.",
            seniority_level="Por calibrar",
            core_strengths=[],
            communication_tone="Por definir"
        )
        prefs.memory_stats = MemoryStats(
            cv_analyzed=False,
            total_applications_learned=0,
            total_star_answers_learned=0,
            maturity_percentage=10,
            last_consolidated_at=None
        )
        prefs.updated_at = datetime.utcnow().isoformat()

        # Reset feedback events history as well so prior likes/dismisses don't repopulate
        try:
            from app.config import settings
            db._write_json(settings.FEEDBACK_FILE, [])
        except Exception as e:
            logger.warning(f"Could not reset feedback file: {e}")

        db.save_preferences(prefs)
        logger.info("Cognitive AI Memory completely reset to clean state.")
        return prefs

    def process_feedback(self, event: FeedbackAction) -> UserPreferences:
        """Records feedback and incrementally learns radar preferences."""
        db.record_feedback(event)
        history = db.get_feedback_history()
        prefs = db.get_preferences()

        if len(history) >= 2:
            try:
                new_insights = self._extract_insights(history, prefs)
                if new_insights:
                    prefs.auto_learned_insights = new_insights
                    self._update_maturity(prefs)
                    db.save_preferences(prefs)
            except Exception as e:
                logger.error(f"Error extracting learned insights: {e}")

        return prefs

    def learn_from_star_answer(
        self,
        question: str,
        candidate_answer: str,
        evaluation: Dict[str, Any],
        company: Optional[str] = None
    ) -> Optional[LearnedStarStory]:
        """
        Learns an achievement story from the candidate's answer in the STAR simulator.
        Stores it as a reusable STAR Story in the AI Memory.
        """
        score = evaluation.get("score", 75)
        # We learn especially from answers with acceptable or good substance
        if len(candidate_answer.strip()) < 30:
            return None

        prefs = db.get_preferences()
        system_instruction = (
            "Eres un extractor de logros profesionales con metodología STAR (Situación, Tarea, Acción, Resultado). "
            "A partir de la pregunta y la respuesta del candidato en una entrevista simulada, extrae un caso de éxito "
            "conciso, concreto y verificado para su memoria profesional."
        )

        prompt = f"""
PREGUNTA DE ENTREVISTA:
{question}

RESPUESTA DEL CANDIDATO:
{candidate_answer}

DIAGNÓSTICO DEL EVALUADOR:
Fortalezas: {json.dumps(evaluation.get('strengths', []), ensure_ascii=False)}
Versión recomendada: {evaluation.get('improved_version_sample', '')}

INSTRUCCIONES:
Extrae un caso de éxito STAR estructurado:
- title: Título profesional de 4 a 7 palabras del logro (ej. 'Optimización de consultas y reducción de latencia').
- situation_and_task: Contexto y desafío enfrentado (1-2 oraciones).
- action: Acción técnica u organizativa tomada por el candidato (1-2 oraciones).
- result_and_metrics: Resultado cuantificable o impacto logrado (1-2 oraciones).
- key_skills: Lista de 2 a 4 tecnologías o competencias demostradas.

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "title": "Título del logro",
  "situation_and_task": "...",
  "action": "...",
  "result_and_metrics": "...",
  "key_skills": ["Skill1", "Skill2"]
}}
"""
        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
            if res and res.get("title"):
                new_story = LearnedStarStory(
                    id=str(uuid.uuid4()),
                    title=res.get("title", f"Logro en respuesta a: {question[:30]}..."),
                    situation_and_task=res.get("situation_and_task", candidate_answer[:100]),
                    action=res.get("action", candidate_answer),
                    result_and_metrics=res.get("result_and_metrics", evaluation.get("improved_version_sample", "")[:120]),
                    key_skills=res.get("key_skills", []),
                    source=f"interview_simulation ({company})" if company else "interview_simulation",
                    score=score,
                    created_at=datetime.utcnow().isoformat()
                )

                # Avoid duplicate titles
                existing_titles = [s.title.lower() for s in prefs.learned_star_stories]
                if new_story.title.lower() not in existing_titles:
                    prefs.learned_star_stories.insert(0, new_story)
                    # Keep maximum 15 high-impact stories
                    if len(prefs.learned_star_stories) > 15:
                        prefs.learned_star_stories = prefs.learned_star_stories[:15]

                if not prefs.memory_stats:
                    prefs.memory_stats = MemoryStats()
                prefs.memory_stats.total_star_answers_learned += 1
                self._update_maturity(prefs)
                db.save_preferences(prefs)
                return new_story
        except Exception as e:
            logger.error(f"Error learning from STAR answer: {e}")
        return None

    def consolidate_memory(self) -> UserPreferences:
        """
        Deep cross-module memory consolidation:
        Reads CV/Profile, Applications history, Radar feedback, and STAR answers.
        Synthesizes ProfileDNA, STAR stories from CV, refined behavioral insights, and industry patterns.
        """
        profile = db.get_profile()
        applications = db.get_applications()
        feedback = db.get_feedback_history()
        prefs = db.get_preferences()

        system_instruction = (
            "Eres el Arquitecto de Memoria Cognitiva para un Agente Autónomo de Búsqueda de Empleo. "
            "Tu objetivo es sintetizar todo el conocimiento acumulado del candidato (su CV real, vacantes a las "
            "que ha postulado, preferencias que ha demostrado y respuestas de entrevistas) en un modelo mental "
            "preciso que guiará futuras postulaciones automáticas de alto impacto."
        )

        profile_summary = {
            "name": profile.name,
            "headline": profile.headline,
            "summary": profile.summary,
            "skills": profile.technical_skills + profile.soft_skills,
            "experience_count": len(profile.experiences),
            "top_experiences": [
                {
                    "role": exp.role,
                    "company": exp.company,
                    "period": f"{exp.start_date} - {exp.end_date}",
                    "bullets": exp.bullet_achievements[:3] if exp.bullet_achievements else [exp.description[:150]],
                    "technologies": exp.technologies
                }
                for exp in profile.experiences[:4]
            ]
        }

        app_context = [
            {"company": a.company, "title": a.job_title, "ats_score": a.ats_score}
            for a in applications[:6]
        ]

        feedback_context = feedback[-10:] if feedback else []

        prompt = f"""
PERFIL Y EXPERIENCIA DEL CANDIDATO:
{json.dumps(profile_summary, ensure_ascii=False, indent=2)}

HISTORIAL DE POSTULACIONES REALIZADAS:
{json.dumps(app_context, ensure_ascii=False, indent=2)}

HISTORIAL DE INTERACCIONES EN EL RADAR (LIKES / DESCARTES / MOTIVOS):
{json.dumps(feedback_context, ensure_ascii=False, indent=2)}

REGLAS APRENDIDAS PREVIAS:
{json.dumps(prefs.auto_learned_insights, ensure_ascii=False)}

TAREA DE SÍNTESIS COGNITIVA:
1. profile_dna:
   - summary: Resumen ejecutivo conciso (máximo 2 oraciones) de la propuesta de valor única del candidato.
   - seniority_level: Nivel inferido (ej. 'Mid-Senior', 'Senior', 'Tech Lead', 'Staff').
   - core_strengths: Lista de 3 a 5 fortalezas troncales demostrables.
   - communication_tone: Tono característico (ej. 'Ejecutivo, directo y orientado a métricas cuantificables').
2. star_stories:
   - Extrae entre 2 y 4 casos de éxito STAR de la experiencia real del candidato si su CV contiene proyectos medibles.
   - Cada uno con: title, situation_and_task, action, result_and_metrics, key_skills (lista).
3. auto_learned_insights:
   - Entre 3 y 5 reglas claras de preferencia inferidas de su comportamiento y vacantes (ej. 'Prioriza empresas con stack moderno Python/TypeScript', 'Foco en cargos con autonomía técnica', 'Evita ofertas presenciales o sin rango claro').
4. industry_insights:
   - 2 a 3 observaciones sobre los sectores o empresas hacia donde se perfila el candidato (ej. 'Alta compatibilidad con empresas SaaS y Fintech que valoran escalabilidad', 'Palabras clave de alto impacto detectadas: microservicios, CI/CD, arquitecturas cloud').

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "profile_dna": {{
    "summary": "...",
    "seniority_level": "...",
    "core_strengths": ["...", "..."],
    "communication_tone": "..."
  }},
  "star_stories": [
    {{
      "title": "...",
      "situation_and_task": "...",
      "action": "...",
      "result_and_metrics": "...",
      "key_skills": ["..."]
    }}
  ],
  "auto_learned_insights": [
    "Regla 1",
    "Regla 2"
  ],
  "industry_insights": [
    "Patrón 1",
    "Patrón 2"
  ]
}}
"""
        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
            if res:
                # 1. Update Profile DNA
                if res.get("profile_dna"):
                    prefs.profile_dna = ProfileDNA(**res["profile_dna"])

                # 2. Update or supplement STAR Stories from CV
                if res.get("star_stories"):
                    existing_titles = [s.title.lower() for s in prefs.learned_star_stories]
                    for s_data in res["star_stories"]:
                        if s_data.get("title") and s_data["title"].lower() not in existing_titles:
                            story = LearnedStarStory(
                                id=str(uuid.uuid4()),
                                title=s_data.get("title", "Caso de éxito"),
                                situation_and_task=s_data.get("situation_and_task", ""),
                                action=s_data.get("action", ""),
                                result_and_metrics=s_data.get("result_and_metrics", ""),
                                key_skills=s_data.get("key_skills", []),
                                source="cv",
                                score=90,
                                created_at=datetime.utcnow().isoformat()
                            )
                            prefs.learned_star_stories.append(story)

                # 3. Update Insights
                if res.get("auto_learned_insights"):
                    prefs.auto_learned_insights = res["auto_learned_insights"]

                # 4. Update Industry Insights
                if res.get("industry_insights"):
                    prefs.industry_insights = res["industry_insights"]

                # 5. Update Stats
                if not prefs.memory_stats:
                    prefs.memory_stats = MemoryStats()
                prefs.memory_stats.cv_analyzed = len(profile.experiences) > 0
                prefs.memory_stats.total_applications_learned = len(applications)
                prefs.memory_stats.last_consolidated_at = datetime.utcnow().isoformat()
                self._update_maturity(prefs)

                prefs.updated_at = datetime.utcnow().isoformat()
                db.save_preferences(prefs)
                logger.info("Cognitive AI Memory successfully consolidated.")
        except Exception as e:
            logger.error(f"Error during memory consolidation: {e}")

        return prefs

    def _extract_insights(self, history: List[Dict[str, Any]], prefs: UserPreferences) -> List[str]:
        system_instruction = (
            "Eres un agente de aprendizaje de preferencias de carrera laboral. Analiza las acciones "
            "del usuario (empleos con like, empleos descartados, motivos de descarte) y deduce reglas "
            "claras y concisas sobre sus preferencias implícitas."
        )

        prompt = f"""
HISTORIAL DE ACCIONES DEL USUARIO (Últimas interacciones):
{json.dumps(history[-10:], ensure_ascii=False, indent=2)}

REGLAS APRENDIDAS PREVIAMENTE:
{json.dumps(prefs.auto_learned_insights, ensure_ascii=False)}

Deduce entre 3 y 5 reglas de preferencia aprendidas en lenguaje claro (e.g., 'Prioriza vacantes remotas en dólares', 'Prefiere roles de arquitectura en Python/FastAPI', 'Descarta ofertas sin flexibilidad horaria').

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "insights": [
    "Regla de preferencia 1",
    "Regla de preferencia 2"
  ]
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        return res.get("insights", prefs.auto_learned_insights)

    def _update_maturity(self, prefs: UserPreferences):
        """Calculates dynamic maturity percentage of the AI Memory."""
        score = 25  # Base calibration
        if prefs.memory_stats and prefs.memory_stats.cv_analyzed:
            score += 25
        if prefs.memory_stats and prefs.memory_stats.total_applications_learned > 0:
            score += min(20, prefs.memory_stats.total_applications_learned * 7)
        if len(prefs.learned_star_stories) > 0:
            score += min(20, len(prefs.learned_star_stories) * 6)
        if len(prefs.auto_learned_insights) >= 3:
            score += 10

        if not prefs.memory_stats:
            prefs.memory_stats = MemoryStats()
        prefs.memory_stats.maturity_percentage = min(100, score)

preference_learner = PreferenceLearner()
