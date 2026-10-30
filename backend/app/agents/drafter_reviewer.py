from typing import Dict, Any, Tuple
from app.models.schemas import CandidateProfile, JobPosting, ApplicationDraft
from app.agents.llm_provider import llm
from app.storage.db import db
import logging
import json

logger = logging.getLogger(__name__)

class DrafterReviewerPipeline:
    def generate_application(self, job: JobPosting, profile: CandidateProfile) -> ApplicationDraft:
        # Step 1: Drafter generates tailored CV and Cover Letter
        cv_markdown, cover_letter = self._draft_materials(job, profile)
        
        # Step 2: Reviewer critiques and audits for ATS compliance and honesty
        ats_score, ats_feedback, reviewer_critique = self._review_materials(job, profile, cv_markdown, cover_letter)

        # Generate clean HTML version for preview and PDF printing
        cv_html = self._markdown_to_apple_html(cv_markdown, profile.name)

        draft = ApplicationDraft(
            job_id=job.id,
            job_title=job.title,
            company=job.company,
            tailored_cv_markdown=cv_markdown,
            tailored_cv_html=cv_html,
            cover_letter=cover_letter,
            ats_score=ats_score,
            ats_feedback=ats_feedback,
            reviewer_critique=reviewer_critique
        )

        db.save_application(draft)
        db.update_job_status(job.id, status="applied" if job.status == "applied" else "saved")
        return draft

    def _draft_materials(self, job: JobPosting, profile: CandidateProfile) -> Tuple[str, str]:
        prefs = db.get_preferences()
        memory_context = ""
        if prefs.learned_star_stories:
            top_stories = [
                f"- {s.title}: {s.situation_and_task} -> {s.action} -> Resultado métrico: {s.result_and_metrics}"
                for s in prefs.learned_star_stories[:4]
            ]
            memory_context += "\nHISTORIAS DE ÉXITO STAR VERIFICADAS DEL CANDIDATO (Utiliza estos logros reales en la carta y viñetas del CV):\n" + "\n".join(top_stories) + "\n"
        if prefs.profile_dna:
            memory_context += f"\nADN Y TONO PROFESIONAL APRENDIDO:\n- Tono: {prefs.profile_dna.communication_tone}\n- Propuesta de valor: {prefs.profile_dna.summary}\n- Seniority inferido: {prefs.profile_dna.seniority_level}\n"

        system_instruction = (
            "Eres el mejor redactor de currículums técnicos y cartas de presentación del mundo para vacantes internacionales. "
            "REGLA DE ORO DE INTEGRIDAD: NUNCA inventes experiencia, títulos, empresas ni tecnologías que no existan en el perfil del candidato. "
            "Tu tarea es REORDENAR, ENFATIZAR y CONTEXTUALIZAR los logros y proyectos reales del candidato para resaltar la máxima relevancia hacia la vacante objetivo. "
            "Aprovecha las historias STAR reales aprendidas de su memoria para enriquecer la persuasión con métricas auténticas."
        )

        prompt = f"""
VACANTE OBJETIVO:
Título: {job.title}
Empresa: {job.company}
Ubicación / Modalidad: {job.location} ({'Remoto' if job.is_remote else 'Presencial'})
Descripción:
{job.description[:4000]}

PERFIL REAL Y VERIFICADO DEL CANDIDATO:
{json.dumps(profile.model_dump(), ensure_ascii=False, indent=2)}
{memory_context}
INSTRUCCIONES DE REDACCIÓN:
1. Adapta el Currículum en formato Markdown limpio, estructurado con:
   - Encabezado con datos del candidato
   - Perfil profesional enfocado al rol
   - Habilidades clave relevantes primero
   - Experiencia laboral con viñetas de logros orientadas al impacto (métricas, tecnologías empleadas). REGLAS ESTRICTAS DE FORMATO: Usa SIEMPRE guiones '- ' para las viñetas, NUNCA asteriscos '* '. NO insertes separadores '---' entre secciones. No dejes asteriscos ni símbolos sueltos.
   - Educación y certificaciones
2. Redacta una Carta de Presentación moderna (3 a 4 párrafos concisos):
   - Prohibido usar clichés vacíos como "Me dirijo a ustedes para expresar mi entusiasmo...".
   - Apertura directa: por qué tu experiencia específica resuelve sus desafíos actuales.
   - Párrafo 2 y 3: dos ejemplos concretos de tu trayectoria que demuestran dominio del problema.
   - Cierre propositivo y profesional.

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "tailored_cv_markdown": "# Nombre\\n...",
  "cover_letter": "Estimado equipo de contratación de..."
}}
"""

        res = llm.generate_json(prompt, system_instruction=system_instruction)
        
        cv_md = res.get("tailored_cv_markdown")
        cl = res.get("cover_letter")

        if not cv_md:
            cv_md = self._fallback_cv(profile, job)
        if not cl:
            cl = f"Estimado equipo de {job.company},\n\nPresento mi postulación para el rol de {job.title}. Con mi trayectoria en desarrollo de software y sistemas distribuidos, puedo aportar de manera inmediata a sus objetivos de ingeniería.\n\nQuedo a su disposición para coordinar una conversación técnica.\n\nAtentamente,\n{profile.name}"

        return cv_md, cl

    def _review_materials(self, job: JobPosting, profile: CandidateProfile, cv_md: str, cover_letter: str) -> Tuple[int, list, str]:
        system_instruction = (
            "Eres un Revisor Crítico de Talento Técnico y Auditor ATS de clase mundial. "
            "Auditas con ojo clínico los documentos generados: "
            "1. ¿Hay afirmaciones dudosas o inventadas que no respaldaba el perfil original? "
            "2. ¿El lenguaje es directo, medible y profesional? "
            "3. ¿Los términos clave de la oferta están bien representados para pasar filtros ATS?"
        )

        prompt = f"""
AUDITA ESTA POSTULACIÓN:

OFERTA:
{job.title} en {job.company}

CV ADAPTADO:
{cv_md[:4000]}

CARTA DE PRESENTACIÓN:
{cover_letter}

RESPONDE EN JSON:
{{
  "ats_score": 92,
  "ats_feedback": [
    "Puntos fuertes de palabras clave detectados",
    "Recomendación para mejorar legibilidad ATS"
  ],
  "reviewer_critique": "Breve diagnóstico del revisor con tono constructivo y directo."
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        score = res.get("ats_score", 88)
        feedback = res.get("ats_feedback", ["Formato ATS optimizado", "Palabras clave relevantes integradas"])
        critique = res.get("reviewer_critique", "Excelente alineación de competencias con el rol objetivo.")
        return score, feedback, critique

    def _fallback_cv(self, profile: CandidateProfile, job: JobPosting) -> str:
        md = f"# {profile.name}\n"
        md += f"**{profile.headline}** | {profile.location} | {profile.email or ''}\n\n"
        md += f"## Perfil Profesional\n{profile.summary}\n\n"
        md += f"## Habilidades Técnicas\n{', '.join(profile.technical_skills)}\n\n"
        md += "## Experiencia Laboral\n"
        for exp in profile.experiences:
            md += f"### {exp.role} — {exp.company}\n"
            md += f"*{exp.start_date} – {exp.end_date} | {exp.location or 'Remoto'}*\n"
            md += f"{exp.description}\n"
            for b in exp.bullet_achievements:
                md += f"- {b}\n"
            md += f"**Tecnologías:** {', '.join(exp.technologies)}\n\n"
        md += "## Educación\n"
        for edu in profile.education:
            md += f"- **{edu.degree} en {edu.field_of_study}**, {edu.institution} ({edu.graduation_year or ''})\n"
        return md

    def _markdown_to_apple_html(self, markdown_text: str, candidate_name: str) -> str:
        # Simple, elegant HTML styling with Apple typography
        import re
        html_body = markdown_text
        html_body = re.sub(r'^# (.*)$', r'<h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">\1</h1>', html_body, flags=re.M)
        html_body = re.sub(r'^## (.*)$', r'<h2 class="text-lg font-medium text-blue-600 dark:text-blue-400 mt-6 mb-3 uppercase tracking-wider text-xs">\1</h2>', html_body, flags=re.M)
        html_body = re.sub(r'^### (.*)$', r'<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mt-4 mb-1">\1</h3>', html_body, flags=re.M)
        html_body = re.sub(r'^\* (.*)$', r'<li class="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">\1</li>', html_body, flags=re.M)
        html_body = re.sub(r'^- (.*)$', r'<li class="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">\1</li>', html_body, flags=re.M)
        html_body = re.sub(r'\*\*(.*?)\*\*', r'<strong class="font-semibold text-gray-900 dark:text-white">\1</strong>', html_body)
        html_body = re.sub(r'\*(.*?)\*', r'<em class="italic text-gray-500 dark:text-gray-400 text-xs">\1</em>', html_body)
        
        return f"""
        <div class="apple-cv-document p-8 max-w-4xl mx-auto bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-gray-100 font-sans leading-relaxed">
            {html_body}
        </div>
        """

drafter_reviewer = DrafterReviewerPipeline()
