import os
from pathlib import Path
from typing import Dict, Any, Optional
import pypdf
import docx
from app.models.schemas import CandidateProfile, WorkExperience, EducationItem
from app.agents.llm_provider import llm
from app.storage.db import db
import logging

logger = logging.getLogger(__name__)

def extract_text_from_file(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    text = ""
    try:
        if ext == ".pdf":
            reader = pypdf.PdfReader(str(file_path))
            for page in reader.pages:
                text += page.extract_text() or "" + "\n"
        elif ext in [".docx", ".doc"]:
            doc = docx.Document(str(file_path))
            for p in doc.paragraphs:
                text += p.text + "\n"
        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
    return text.strip()

def analyze_cv_content(raw_text: str) -> CandidateProfile:
    """
    Uses Gemini / LLM to parse raw CV text into a structured CandidateProfile.
    """
    system_prompt = (
        "Eres un analista experto de talento técnico y reclutamiento para empresas globales y de alto nivel. "
        "Tu objetivo es extraer de manera precisa, estructurada y verificable toda la información del currículum (CV) "
        "del candidato sin inventar datos."
    )

    prompt = f"""
Analiza el siguiente texto de currículum y extrae la información en un formato JSON exacto con esta estructura:
{{
  "name": "Nombre completo",
  "email": "correo@ejemplo.com",
  "phone": "+123456789",
  "location": "Ciudad, País / Remoto",
  "linkedin_url": "url o null",
  "github_url": "url o null",
  "portfolio_url": "url o null",
  "headline": "Titular profesional sintético",
  "summary": "Resumen ejecutivo de 2 a 3 oraciones destacando fortalezas y valor",
  "years_of_experience": 5.5,
  "technical_skills": ["Python", "React", "Docker", "FastAPI", "SQL", "etc"],
  "soft_skills": ["Comunicación Asíncrona", "Liderazgo Técnico", "Resolución de problemas"],
  "languages": {{"Español": "Nativo", "Inglés": "C1 Profesional"}},
  "experiences": [
    {{
      "company": "Nombre de empresa",
      "role": "Cargo",
      "start_date": "Año o Mes/Año",
      "end_date": "Presente o Fecha",
      "location": "Ubicación",
      "is_remote": true,
      "description": "Breve descripción general",
      "technologies": ["Tecnología 1", "Tecnología 2"],
      "bullet_achievements": [
        "Logro 1 cuantificado con métricas o impacto",
        "Logro 2"
      ]
    }}
  ],
  "education": [
    {{
      "institution": "Universidad o Instituto",
      "degree": "Grado o Título",
      "field_of_study": "Campo de estudio",
      "graduation_year": "2020"
    }}
  ],
  "certifications": ["Certificación 1", "Certificación 2"]
}}

TEXTO DEL CURRÍCULUM:
---
{raw_text[:12000]}
---
"""

    result = llm.generate_json(prompt, system_instruction=system_prompt)
    if not result or not result.get("name"):
        # Fallback basic extraction if LLM fails or is in mock mode
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        first_line = lines[0] if lines else "Candidato"
        profile = CandidateProfile(
            name=first_line[:50],
            headline="Profesional de Tecnología",
            summary=raw_text[:300],
            raw_cv_text=raw_text,
            technical_skills=["Python", "JavaScript", "Cloud", "Git"],
            languages={"Español": "Nativo", "Inglés": "B2/C1 Intermedio-Avanzado"}
        )
    else:
        # Convert experiences and education objects
        experiences = [WorkExperience(**exp) for exp in result.get("experiences", [])]
        education = [EducationItem(**edu) for edu in result.get("education", [])]
        
        profile = CandidateProfile(
            name=result.get("name", "Candidato"),
            email=result.get("email"),
            phone=result.get("phone"),
            location=result.get("location", "Remoto"),
            linkedin_url=result.get("linkedin_url"),
            github_url=result.get("github_url"),
            portfolio_url=result.get("portfolio_url"),
            headline=result.get("headline", "Profesional"),
            summary=result.get("summary", ""),
            years_of_experience=float(result.get("years_of_experience", 0)),
            technical_skills=result.get("technical_skills", []),
            soft_skills=result.get("soft_skills", []),
            languages=result.get("languages", {}),
            experiences=experiences,
            education=education,
            certifications=result.get("certifications", []),
            raw_cv_text=raw_text
        )

    db.save_profile(profile)
    return profile
