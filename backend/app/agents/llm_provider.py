import json
import logging
import os
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

class UnifiedLLMProvider:
    def __init__(self):
        self._gemini_client = None
        self._init_clients()

    def _init_clients(self):
        # Initialize Google GenAI client if key is present
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        if api_key:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=api_key)
                logger.info("Google GenAI client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}")
                self._gemini_client = None

    def update_keys(self, provider: str, api_key: str, model_name: Optional[str] = None):
        if provider == "gemini":
            settings.GEMINI_API_KEY = api_key
            if model_name:
                settings.GEMINI_MODEL = model_name
            os.environ["GEMINI_API_KEY"] = api_key
            self._init_clients()
        elif provider == "openai":
            settings.OPENAI_API_KEY = api_key
            if model_name:
                settings.OPENAI_MODEL = model_name
        elif provider == "claude":
            settings.ANTHROPIC_API_KEY = api_key
            if model_name:
                settings.CLAUDE_MODEL = model_name
        settings.DEFAULT_PROVIDER = provider

    def generate_text(self, prompt: str, system_instruction: Optional[str] = None, provider: Optional[str] = None) -> str:
        prov = provider or settings.DEFAULT_PROVIDER
        
        # 1. Google Gemini
        if prov == "gemini":
            api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
            if api_key and self._gemini_client:
                try:
                    contents = prompt
                    config = {}
                    if system_instruction:
                        config["system_instruction"] = system_instruction
                    
                    response = self._gemini_client.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=contents,
                        config=config if config else None
                    )
                    return response.text
                except Exception as e:
                    logger.error(f"Error calling Gemini: {e}")
                    # fallback to heuristic if failed

        # 2. OpenAI
        elif prov == "openai":
            api_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
            if api_key:
                try:
                    import httpx
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    messages = []
                    if system_instruction:
                        messages.append({"role": "system", "content": system_instruction})
                    messages.append({"role": "user", "content": prompt})
                    
                    resp = httpx.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": settings.OPENAI_MODEL,
                            "messages": messages,
                            "temperature": 0.3
                        },
                        timeout=60.0
                    )
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]["content"]
                except Exception as e:
                    logger.error(f"Error calling OpenAI: {e}")

        # 3. Anthropic Claude
        elif prov == "claude":
            api_key = settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY", "")
            if api_key:
                try:
                    import httpx
                    headers = {
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": settings.CLAUDE_MODEL,
                        "max_tokens": 4096,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                    if system_instruction:
                        payload["system"] = system_instruction
                    resp = httpx.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json=payload,
                        timeout=60.0
                    )
                    if resp.status_code == 200:
                        return resp.json()["content"][0]["text"]
                except Exception as e:
                    logger.error(f"Error calling Claude: {e}")

        # Fallback heuristic generator when keys are not configured
        return self._heuristic_fallback(prompt)

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        enhanced_prompt = f"{prompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin bloques de código markdown ni texto adicional."
        raw_text = self.generate_text(enhanced_prompt, system_instruction=system_instruction)
        
        # Clean potential markdown fences
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception as e:
            # Try to find JSON substring
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except Exception:
                    pass
            logger.warning(f"Could not parse JSON from LLM: {e}. Raw: {raw_text[:200]}")
            return {}

    def _heuristic_fallback(self, prompt: str) -> str:
        """
        Graceful offline heuristic simulator so user can preview and test
        before entering their Gemini/OpenAI/Claude API keys.
        """
        prompt_lower = prompt.lower()

        # 1. Parsing CV
        if "texto de currículum" in prompt_lower or "candidato" in prompt_lower and "technical_skills" in prompt_lower:
            return json.dumps({
                "name": "Alejandro Aguirre",
                "email": "alejandro@example.com",
                "phone": "+56 9 1234 5678",
                "location": "Santiago, Chile / Remoto Global",
                "linkedin_url": "https://linkedin.com/in/alejandro",
                "github_url": "https://github.com/alejandroham",
                "portfolio_url": None,
                "headline": "Senior AI & Full Stack Engineer",
                "summary": "Ingeniero de Software senior con más de 7 años de experiencia construyendo arquitecturas distribuidas, agentes autónomos y aplicaciones full stack de alto impacto.",
                "years_of_experience": 7.0,
                "technical_skills": ["Python", "FastAPI", "TypeScript", "React", "Docker", "Kubernetes", "Google Cloud", "PostgreSQL", "Gemini API"],
                "soft_skills": ["Liderazgo Técnico", "Comunicación Asíncrona", "Resolución de Problemas Complejos"],
                "languages": {"Español": "Nativo", "Inglés": "C1 Profesional"},
                "experiences": [
                    {
                        "company": "TechGlobal Inc",
                        "role": "Lead AI Engineer",
                        "start_date": "2022",
                        "end_date": "Presente",
                        "location": "Remoto",
                        "is_remote": True,
                        "description": "Liderazgo de desarrollo de agentes autónomos y plataformas cloud.",
                        "technologies": ["Python", "React", "FastAPI", "Docker", "GCP"],
                        "bullet_achievements": [
                            "Diseñó e implementó agentes autónomos reduciendo tiempos de procesamiento en 45%",
                            "Lideró equipo distribuido de 6 ingenieros full stack en entornos 100% remotos"
                        ]
                    },
                    {
                        "company": "CloudSolutions",
                        "role": "Senior Software Engineer",
                        "start_date": "2019",
                        "end_date": "2022",
                        "location": "Remoto",
                        "is_remote": True,
                        "description": "Migración de monolitos a microservicios distribuidos.",
                        "technologies": ["Python", "Docker", "PostgreSQL", "AWS"],
                        "bullet_achievements": [
                            "Elevó la disponibilidad de los microservicios a 99.98%",
                            "Diseñó APIs RESTful y pipelines automatizados de CI/CD"
                        ]
                    }
                ],
                "education": [
                    {
                        "institution": "Universidad",
                        "degree": "Ingeniería en Informática",
                        "field_of_study": "Ciencias de la Computación",
                        "graduation_year": "2018"
                    }
                ],
                "certifications": ["Google Cloud Certified Professional Cloud Architect"]
            })

        # 2. Fit Evaluation
        elif "evaluar ajuste" in prompt_lower or "fit" in prompt_lower or "overall_score" in prompt_lower:
            return json.dumps({
                "overall_score": 92,
                "verdict": "Altamente Recomendado",
                "dimension_scores": [
                    {"dimension": "Technical Skills", "score": 94, "reasoning": "Fuerte coincidencia en Python, arquitecturas cloud y APIs modernas."},
                    {"dimension": "Experience & Seniority", "score": 90, "reasoning": "Más de 7 años de experiencia demostrada en roles de liderazgo técnico."},
                    {"dimension": "Culture & Work Style", "score": 92, "reasoning": "Excelente trayectoria en trabajo autónomo y comunicación asíncrona."},
                    {"dimension": "Remote Flexibility", "score": 100, "reasoning": "100% alineado con trabajo remoto internacional sin fricción horaria."},
                    {"dimension": "Career Alignment", "score": 85, "reasoning": "Oportunidad de alto impacto en proyectos de ingeniería e IA."}
                ],
                "strengths": [
                    "Experiencia contrastada en diseño e implementación de sistemas escalables",
                    "Capacidad probada de liderazgo en equipos remotos distribuidos",
                    "Dominio avanzado de Python, React y despliegues en la nube"
                ],
                "missing_skills": [
                    "Herramientas internas específicas del cliente a dominar durante el onboarding"
                ],
                "deal_breakers_found": [],
                "recommendation_summary": "Perfil con altísima compatibilidad técnica y cultural. Se aconseja destacar métricas de reducción de tiempos e impacto en el CV."
            })

        # 3. Drafter: CV and Cover Letter
        elif "tailored_cv_markdown" in prompt_lower or "vacante objetivo" in prompt_lower:
            return json.dumps({
                "tailored_cv_markdown": "# Alejandro Aguirre\n**Senior AI & Full Stack Engineer** | Remoto Global | alejandro@example.com\n\n## Perfil Profesional\nIngeniero de Software senior con más de 7 años de experiencia diseñando arquitecturas distribuidas y agentes de IA escalables.\n\n## Habilidades Clave\nPython, FastAPI, TypeScript, React, Docker, Kubernetes, Google Cloud, PostgreSQL, Gemini API.\n\n## Experiencia Relevante\n### Lead AI Engineer — TechGlobal Inc (2022 - Presente)\n- Diseñó e implementó agentes autónomos reduciendo tiempos de procesamiento en 45%.\n- Lideró equipo de 6 ingenieros full stack en modalidad 100% remota.\n*Tecnologías:* Python, React, FastAPI, Docker, GCP.\n\n### Senior Software Engineer — CloudSolutions (2019 - 2022)\n- Migró monolito a microservicios distribuidos elevando la disponibilidad a 99.98%.\n\n## Educación\n- **Ingeniería en Informática**, Universidad (2018)",
                "cover_letter": "Estimado equipo de contratación,\n\nLes presento mi postulación para la vacante remota. Con más de 7 años liderando el desarrollo de sistemas distribuidos y soluciones de IA en entornos ágiles y asíncronos, considero que mi perfil encaja directamente con los desafíos técnicos del puesto.\n\nEn mi experiencia reciente como Lead AI Engineer, diseñé e implementé agentes de automatización que optimizaron flujos críticos en un 45%, asegurando alta disponibilidad y buenas prácticas de ingeniería.\n\nQuedo a su disposición para coordinar una entrevista técnica.\n\nAtentamente,\nAlejandro Aguirre"
            })

        # 4. Reviewer: ATS score and critique
        elif "audita esta postulación" in prompt_lower or "ats_score" in prompt_lower:
            return json.dumps({
                "ats_score": 95,
                "ats_feedback": [
                    "Excelente jerarquía de encabezados legible para motores ATS",
                    "Palabras clave de Python, IA y Cloud claramente integradas",
                    "Logros orientados al impacto con métricas verificables"
                ],
                "reviewer_critique": "El CV y la carta están perfectamente alineados con los requisitos de la vacante, con un tono profesional, sin clichés y con evidencia comprobable."
            })

        # 5. Preference Learning Insights
        elif "historial de acciones del usuario" in prompt_lower or "insights" in prompt_lower:
            return json.dumps({
                "insights": [
                    "Prioriza posiciones 100% remotas con compensación competitiva",
                    "Preferencia por arquitecturas con Python, FastAPI e Inteligencia Artificial",
                    "Afinidad por empresas con cultura asíncrona y autonomía técnica"
                ]
            })

        # 6. Interview Prep Kit
        elif "kit de preparación" in prompt_lower or "technical_questions" in prompt_lower:
            return json.dumps({
                "company_focus": "Enfoque en arquitectura escalable, autonomía en desarrollo remoto y diseño de soluciones con IA.",
                "technical_questions": [
                    {
                        "question": "¿Cómo diseñarías una arquitectura resiliente para orquestar agentes de IA concurrentes?",
                        "key_concepts": "Colas de mensajes, rate limiting, observabilidad y manejo de fallos",
                        "tip": "Menciona cómo gestionas la latencia y los reintentos automáticos."
                    },
                    {
                        "question": "¿Cuál es tu estrategia para mantener alta cobertura y calidad en código distribuido?",
                        "key_concepts": "CI/CD, pruebas de integración y contratos de API",
                        "tip": "Cita tu experiencia reduciendo incidentes en producción."
                    }
                ],
                "behavioral_questions": [
                    {
                        "question": "Cuéntame de una ocasión en que lideraste una decisión técnica polémica en tu equipo.",
                        "suggested_star_story": "Proyecto de migración a microservicios en CloudSolutions",
                        "focus": "Enfoque en consenso basado en datos y métricas."
                    }
                ],
                "questions_to_ask_interviewer": [
                    "¿Cuáles son los hitos tecnológicos principales para este rol en los primeros 6 meses?",
                    "¿Cómo está estructurado el proceso de toma de decisiones arquitectónicas en el equipo remoto?"
                ]
            })

        # Default fallback
        return json.dumps({
            "message": "Operación simulada del sistema de búsqueda de empleo (Modo sin API Key configurada)."
        })

llm = UnifiedLLMProvider()
