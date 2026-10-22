import json
import logging
from typing import Dict, Any, List
from app.models.schemas import JobPosting, CandidateProfile, UserPreferences, OutcomeSubmission, UpskillPlan, StudyTopic
from app.agents.llm_provider import llm
from app.storage.db import db

logger = logging.getLogger(__name__)

class OutcomeAndStrategyAgent:
    def process_outcome(self, submission: OutcomeSubmission, job: JobPosting, profile: CandidateProfile, prefs: UserPreferences) -> UpskillPlan:
        # Update job in database
        job.status = submission.status
        job.outcome_success = submission.was_successful
        job.outcome = submission.reason or submission.status
        job.outcome_notes = submission.feedback_details
        
        system_instruction = (
            "Eres un Estratega Senior de Carrera Tecnológica y Diseñador de Planes de Aprendizaje (Upskill Coach). "
            "Tu misión es analizar el resultado de una postulación real (éxito o rechazo) y determinar qué ajustes de "
            "estrategia debe hacer el candidato y qué estudios, tecnologías o certificaciones adicionales debe cursar."
        )

        prompt = f"""
RESULTADO DE LA POSTULACIÓN:
- Vacante: {job.title} en {job.company}
- Modalidad: {job.location} ({'Remoto' if job.is_remote else 'Presencial'})
- ¿Fue exitosa (avanzó/oferta)?: {'SÍ' if submission.was_successful else 'NO (Rechazado / Sin respuesta)'}
- Estado actual: {submission.status}
- Motivo indicado: {submission.reason or 'No especificado'}
- Notas adicionales del feedback: {submission.feedback_details or 'Sin feedback detallado'}

PERFIL ACTUAL DEL CANDIDATO:
- Nombre: {profile.name}
- Titular: {profile.headline}
- Años de experiencia: {profile.years_of_experience}
- Habilidades técnicas actuales: {', '.join(profile.technical_skills)}
- Idiomas: {json.dumps(profile.languages, ensure_ascii=False)}

DESCRIPCIÓN DE LA VACANTE:
{job.description[:3500]}

TAREA:
Genera un análisis estratégico y un plan de acción:
1. 'strategy_adjustment': Párrafo claro explicando qué cambio de enfoque debe hacer el candidato para futuras vacantes.
2. 'skill_gaps': Lista de 2 a 4 brechas técnicas detectadas que impidieron avanzar o que acelerarían su contratación.
3. 'study_plan': Lista de 2 o 3 temas específicos a estudiar con recursos recomendados y tiempo estimado (e.g. 2 semanas, 1 mes).
4. 'recommended_certifications': 1 o 2 certificaciones de la industria altamente valoradas para este perfil.
5. 'actionable_next_steps': 2 o 3 pasos inmediatos a seguir.

RESPONDE ÚNICAMENTE CON UN JSON VÁLIDO:
{{
  "strategy_adjustment": "Explicación del cambio de estrategia...",
  "skill_gaps": ["Brecha 1", "Brecha 2"],
  "study_plan": [
    {{
      "topic": "Nombre del tema o tecnología",
      "description": "Qué debe aprender y practicar",
      "suggested_resources": "Cursos, documentación o proyectos recomendados",
      "estimated_time": "3 semanas"
    }}
  ],
  "recommended_certifications": ["Certificación A", "Certificación B"],
  "actionable_next_steps": ["Paso 1", "Paso 2"]
}}
"""

        res = llm.generate_json(prompt, system_instruction=system_instruction)

        # Fallback heuristic if LLM key is not yet set
        if not res or not res.get("strategy_adjustment"):
            if submission.was_successful:
                strategy = f"Estrategia validada positivamente para roles similares a {job.title}. Reforzar las fortalezas demostradas en gestión tecnológica y arquitecturas modernas."
                gaps = []
                topics = [
                    StudyTopic(
                        topic="Profundización en Arquitecturas Cloud Avanzadas",
                        description="Optimización de costes y patrones de escalabilidad empresarial.",
                        suggested_resources="AWS / Azure Well-Architected Framework",
                        estimated_time="2 semanas"
                    )
                ]
                certs = ["AWS Certified Solutions Architect", "Microsoft Certified: Azure Solutions Architect Expert"]
            else:
                strategy = f"Ajustar el enfoque de postulación para roles de {job.title}: enfocar el CV más hacia métricas de liderazgo y certificaciones oficiales, evitando vacantes que tengan requisitos no declarados."
                gaps = ["Profundización en orquestación de contenedores y pipelines CI/CD", "Práctica técnica en entrevistas en inglés"]
                topics = [
                    StudyTopic(
                        topic="Kubernetes & GitOps",
                        description="Despliegue y administración de clústeres en entornos cloud distribuidos.",
                        suggested_resources="Kubernetes.io Docs, CKA Course, Minikube Labs",
                        estimated_time="3 a 4 semanas"
                    ),
                    StudyTopic(
                        topic="Inglés Técnico Conversacional para Entrevistas Remotas",
                        description="Práctica de historias STAR y vocabulario de arquitectura en inglés fluido.",
                        suggested_resources="Mock technical interviews, plataformas de intercambio técnico",
                        estimated_time="Constante (30 min diarios)"
                    )
                ]
                certs = ["Kubernetes Certified Administrator (CKA)", "Microsoft Azure Solutions Architect"]
            
            steps = [
                "Actualizar el CV destacando casos de éxito con métricas cuantitativas",
                "Filtrar vacantes prioritarias que valoren tu experiencia comprobada en transformación digital"
            ]
        else:
            strategy = res.get("strategy_adjustment", "Revisar alineación de palabras clave y certificaciones.")
            gaps = res.get("skill_gaps", [])
            topics = [StudyTopic(**t) for t in res.get("study_plan", [])]
            certs = res.get("recommended_certifications", [])
            steps = res.get("actionable_next_steps", [])

        # Update candidate preferences with new learned strategic insights
        insight_text = f"Estrategia {'exitosa' if submission.was_successful else 'a calibrar'} en vacantes tipo '{job.title}': {strategy[:120]}..."
        if insight_text not in prefs.auto_learned_insights:
            prefs.auto_learned_insights.insert(0, insight_text)
            db.save_preferences(prefs)

        # Save recommendations to job
        job.upskill_recommendations = [f"{t.topic}: {t.description}" for t in topics] + [f"Certificación: {c}" for c in certs]
        db.save_jobs([job])

        return UpskillPlan(
            job_title=job.title,
            company=job.company,
            was_successful=submission.was_successful,
            strategy_adjustment=strategy,
            skill_gaps=gaps,
            study_plan=topics,
            recommended_certifications=certs,
            actionable_next_steps=steps
        )

outcome_agent = OutcomeAndStrategyAgent()
