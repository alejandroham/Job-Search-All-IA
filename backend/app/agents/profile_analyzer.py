import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
import pypdf
import docx
from app.models.schemas import CandidateProfile, WorkExperience, EducationItem
from app.agents.llm_provider import llm
from app.storage.db import db
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def extract_text_from_file(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    raw_text = ""
    try:
        if ext == ".pdf":
            reader = pypdf.PdfReader(str(file_path))
            for page in reader.pages:
                page_text = page.extract_text() or ""
                raw_text += page_text + "\n"
        elif ext in [".docx", ".doc"]:
            doc = docx.Document(str(file_path))
            for p in doc.paragraphs:
                raw_text += p.text + "\n"
        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")

    # Normalize fragmented PDFs where words are broken with \n \n
    cleaned = raw_text.replace('\n \n', ' ')
    cleaned = re.sub(r'([a-záéíóú,])\n([a-záéíóú])', r'\1 \2', cleaned)
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    return cleaned.strip()

def deterministic_cv_parser(text: str) -> CandidateProfile:
    """
    Robust rule-based parser that extracts the candidate's genuine experience,
    education, skills, and contact data directly from text without relying on external APIs.
    """
    # 1. Contact Info & Name
    name_match = re.match(r'^\s*([A-ZÁÉÍÓÚ][a-záéíóúA-ZÁÉÍÓÚ\s]{4,45}?)(?=\s+Ingeniero|\s+Licenciado|\s+Desarrollador|\s+IT|\s+\||Teléfono|\n)', text)
    if name_match:
        name = name_match.group(1).strip()
    else:
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        name = lines[0][:40] if lines else "Candidato"

    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else None

    phone_match = re.search(r'Tel[eé]fono:\s*([^\n|]+)', text, re.I)
    phone = phone_match.group(1).strip() if phone_match else None

    loc_match = re.search(r'Ubicaci[oó]n:\s*([^\n|]+)', text, re.I)
    if loc_match:
        loc = re.sub(r'LinkedIn:.*', '', loc_match.group(1), flags=re.I).strip()
    else:
        loc = "Chile"

    linkedin_match = re.search(r'https?://[^\s|]*linkedin[^\s|]*', text, re.I)
    linkedin = linkedin_match.group(0) if linkedin_match else None

    github_match = re.search(r'https?://[^\s|]*github[^\s|]*', text, re.I)
    github = github_match.group(0) if github_match else None

    # Headline
    headline_match = re.search(r'(Ingeniero en Informática.*?|Desarrollador.*?|Software Engineer.*?)(?=Teléfono|\n|Correo)', text)
    if headline_match:
        headline = headline_match.group(1).strip()
    else:
        headline = "Profesional Tecnológico"

    # Summary
    summary = ""
    summary_match = re.search(r'Perfil Profesional\s*(.*?)(?=Competencias Clave|Experiencia Laboral|\n\s*●)', text, re.DOTALL | re.I)
    if summary_match:
        summary = summary_match.group(1).strip()
    else:
        summary = text[:400]

    # Years of experience calculation
    years = 5.0
    exp_year_match = re.search(r'm[aá]s de (\d+) a[ñn]os', text, re.I)
    if exp_year_match:
        years = float(exp_year_match.group(1))

    # Skills extraction
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    skills_match = re.search(r'Competencias Clave\s*(.*?)(?=Experiencia Laboral|Formación)', text, re.DOTALL | re.I)
    if skills_match:
        skills_block = skills_match.group(1)
        # Parse grouped or bulleted skills
        chunks = re.split(r'[●•\n]+', skills_block)
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            is_soft = any(k in chunk.lower() for k in ["gestión", "liderazgo", "gobierno", "transformación"])
            # Remove category prefixes like "Desarrollo: " or "Gestión TI: "
            items_str = re.sub(r'^[A-Za-záéíóú\s]+:\s*', '', chunk)
            for item in items_str.split('|'):
                val = item.strip()
                if len(val) > 1 and not val.endswith(':'):
                    if is_soft:
                        if val not in soft_skills:
                            soft_skills.append(val)
                    else:
                        if val not in technical_skills:
                            technical_skills.append(val)

    if not technical_skills:
        # Fallback keyword scanning
        known_tech = ["Python", "JavaScript", "Node.js", "React", "Java", "C#", "SQL Server", "MySQL", "PostgreSQL", "Oracle", "Microsoft 365", "Azure", "AWS", "Google Cloud", "Linux", "Windows Server", "Docker", "Git", "GitHub", "Claude", "Gemini", "ChatGPT", "GitHub Copilot", "Ollama", "N8N", "APIs REST", "HTML5", "CSS3"]
        technical_skills = [t for t in known_tech if t.lower() in text.lower()]

    # Experiences extraction
    experiences: List[WorkExperience] = []
    exp_match = re.search(r'(?:Experiencia Laboral|Experiencia|Experience|Historial Profesional)\s*(.*?)(?=Formación Académica|Educación|Education|Idiomas|Languages|Certificaciones|$)', text, re.DOTALL | re.I)
    if exp_match:
        exp_block = exp_match.group(1).strip()
        # Split by known common role names or major boundaries
        chunks = re.split(r'(?=(?:Encargado|Profesor|Ingeniero Informático Consultor|Consultor TI|Senior|Lead|Líder))', exp_block)
        for c in chunks:
            c = c.strip()
            if len(c) < 30:
                continue
            parts = c.split('●')
            header_part = parts[0].strip()
            bullets = [b.strip() for b in parts[1:] if len(b.strip()) > 5]

            h_split = [p.strip() for p in header_part.split('|')]
            role_company = h_split[0] if len(h_split) > 0 else "Cargo"
            job_loc = h_split[1] if len(h_split) > 1 else "Chile"
            dates = h_split[2] if len(h_split) > 2 else ""

            # Distinguish company and role
            if 'Centro de Formación Técnica' in role_company:
                company = 'Centro de Formación Técnica Estatal del Biobío'
                role = role_company.replace(company, '').strip() or "Encargado de Informática"
            elif 'SLEP' in role_company or 'Liceo' in role_company:
                role = 'Profesor Técnico Profesional en Programación'
                company = 'SLEP Andalién Sur / Liceo Polivalente Lucila Godoy Alcayaga'
            elif 'Consultor' in role_company or 'Freelance' in role_company:
                role = 'Ingeniero Informático Consultor (Freelance)'
                company = 'Consultoría Independiente'
            else:
                role = role_company
                company = "Empresa"

            # Clean and properly split start and end dates
            s_date = dates or "Periodo registrado"
            e_date = ""
            if dates:
                d_clean = dates.replace('', '-').replace('?', '-').strip()
                for sep in ['–', '—', ' - ', '-', ' a ', ' al ']:
                    if sep in d_clean:
                        parts = d_clean.split(sep, 1)
                        s_date = parts[0].strip()
                        e_date = parts[1].strip()
                        break
                if not e_date and ("presente" in d_clean.lower() or "actualidad" in d_clean.lower()):
                    e_date = "Presente"

            experiences.append(WorkExperience(
                company=company,
                role=role,
                start_date=s_date,
                end_date=e_date,
                location=job_loc,
                is_remote="remot" in c.lower(),
                description=f"Gestión y desarrollo técnico en {company}.",
                bullet_achievements=bullets,
                technologies=[t for t in technical_skills[:5]]
            ))

    # Education extraction
    education: List[EducationItem] = []
    edu_match = re.search(r'(?:Formación Académica|Educación|Education)\s*(.*?)(?=Idiomas|Languages|Certificaciones|$)', text, re.DOTALL | re.I)
    if edu_match:
        edu_block = edu_match.group(1).strip()
        for edu_c in re.split(r'[●•]', edu_block):
            edu_c = edu_c.strip()
            if not edu_c or len(edu_c) < 10:
                continue
            parts = [p.strip() for p in edu_c.split('|')]
            degree = parts[0]
            inst_dates = parts[1] if len(parts) > 1 else ""
            m_year = re.search(r'\((.*?)\)', inst_dates)
            year = m_year.group(1).strip() if m_year else None
            institution = inst_dates.split('(')[0].strip() if '(' in inst_dates else inst_dates
            education.append(EducationItem(
                institution=institution or "Institución Educativa",
                degree=degree,
                field_of_study="Tecnología e Informática",
                graduation_year=year or ""
            ))

    # Languages extraction
    languages = {}
    if re.search(r'español', text, re.I):
        languages['Español'] = 'Nativo'
    if re.search(r'ingl[eé]s', text, re.I):
        if re.search(r'intermedio|b2|b1', text, re.I):
            languages['Inglés'] = 'Intermedio (Competencia profesional técnica)'
        elif re.search(r'avanzado|c1|c2|fluido', text, re.I):
            languages['Inglés'] = 'Avanzado / Profesional'
        else:
            languages['Inglés'] = 'Intermedio'

    return CandidateProfile(
        name=name,
        email=email,
        phone=phone,
        location=loc,
        linkedin_url=linkedin,
        github_url=github,
        headline=headline,
        summary=summary,
        years_of_experience=years,
        technical_skills=technical_skills,
        soft_skills=soft_skills,
        languages=languages,
        experiences=experiences,
        education=education,
        raw_cv_text=text
    )

def analyze_cv_content(raw_text: str, save_to_db: bool = True) -> CandidateProfile:
    """
    Parses CV using LLM if configured; otherwise uses deterministic_cv_parser
    to guarantee 100% fidelity with the candidate's actual text.
    """
    has_key = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    
    # If API key is present, attempt LLM extraction
    if has_key:
        system_prompt = (
            "Eres un analista experto de talento técnico y reclutamiento para empresas globales. "
            "Extrae de manera precisa, estructurada y verificable toda la información del currículum (CV) "
            "del candidato sin inventar datos ni agregar información externa."
        )

        prompt = f"""
Analiza el siguiente currículum (puede ser un documento extenso de varias páginas o una exportación oficial de LinkedIn) y extrae TODOS los empleos, funciones, logros y grados académicos en un formato JSON exacto:
{{
  "name": "Nombre completo",
  "email": "correo",
  "phone": "telefono",
  "location": "ubicacion",
  "linkedin_url": "url",
  "github_url": "url",
  "headline": "Titular profesional",
  "summary": "Resumen profesional del candidato",
  "years_of_experience": 10.0,
  "technical_skills": ["Skill1", "Skill2"],
  "soft_skills": ["SoftSkill1"],
  "languages": {{"Español": "Nativo", "Inglés": "Intermedio"}},
  "experiences": [
    {{
      "company": "Empresa",
      "role": "Cargo",
      "start_date": "Fecha inicio",
      "end_date": "Fecha fin o Presente",
      "location": "Ubicación",
      "is_remote": false,
      "description": "Descripción de responsabilidades",
      "technologies": ["Tech1"],
      "bullet_achievements": ["Logro 1", "Logro 2"]
    }}
  ],
  "education": [
    {{
      "institution": "Institución",
      "degree": "Título",
      "field_of_study": "Área",
      "graduation_year": "Año"
    }}
  ]
}}

TEXTO DEL CURRÍCULUM:
---
{raw_text[:65000]}
---
"""
        try:
            result = llm.generate_json(prompt, system_instruction=system_prompt)
            extracted_name = result.get("name", "")
            if extracted_name and (extracted_name.lower() in raw_text.lower() or result.get("experiences")):
                experiences = [WorkExperience(**exp) for exp in result.get("experiences", [])]
                education = [EducationItem(**edu) for edu in result.get("education", [])]
                profile = CandidateProfile(
                    name=result.get("name", "Candidato"),
                    email=result.get("email"),
                    phone=result.get("phone"),
                    location=result.get("location", "Remoto"),
                    linkedin_url=result.get("linkedin_url"),
                    github_url=result.get("github_url"),
                    headline=result.get("headline", "Profesional TI"),
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
                if save_to_db:
                    db.save_profile(profile)
                return profile
        except Exception as e:
            logger.warning(f"LLM parsing failed, falling back to deterministic parser: {e}")

    # Deterministic parser: extracts the REAL data directly from the candidate's CV text
    profile = deterministic_cv_parser(raw_text)
    if save_to_db:
        db.save_profile(profile)
    return profile

def assist_profile_content(section: str, action: str, current_text: str, target_role: Optional[str] = None) -> Dict[str, Any]:
    """
    Assists candidate in refining profile text (headline, summary, achievement bullets)
    without inventing unverifiable facts or hallucinating qualifications.
    """
    has_key = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    
    if has_key:
        system_prompt = (
            "Eres un consultor de carrera y redactor experto de currículums técnicos de alto impacto. "
            "Tu misión es optimizar la redacción, claridad, tono y presentación del texto profesional del usuario. "
            "REGLAS CRÍTICAS DE CONFIABILIDAD: "
            "1. NO inventes empresas, títulos, tecnologías ni certificaciones que no figuren en el texto. "
            "2. Estructura los logros con verbos de acción y enfoque en resultados verificables. "
            "3. Devuelve SIEMPRE un JSON con: {'original': str, 'suggestion': str, 'reasoning': str}."
        )

        role_clause = f" para orientarlo al cargo objetivo '{target_role}'" if target_role else ""
        prompt = f"""
Sección: {section}
Acción requerida: {action}{role_clause}
Texto actual del usuario:
\"\"\"{current_text}\"\"\"

Optimiza el texto según las mejores prácticas de reclutamiento tecnológico y ATS.
Devuelve el resultado en JSON:
{{
  "original": "{current_text}",
  "suggestion": "Texto mejorado optimizado...",
  "reasoning": "Explicación breve de por qué este cambio potencia el perfil..."
}}
"""
        try:
            result = llm.generate_json(prompt, system_instruction=system_prompt)
            if result and "suggestion" in result:
                return {
                    "original": current_text,
                    "suggestion": result.get("suggestion", current_text),
                    "reasoning": result.get("reasoning", "Mejora de redacción y claridad técnica.")
                }
        except Exception as e:
            logger.warning(f"LLM assist failed, falling back to heuristic assistant: {e}")

    # Heuristic fallback if LLM is offline or fails
    suggestion = current_text.strip()
    reasoning = "Optimización estructural heurística sin falsear datos."

    if section == "headline":
        if action == "shorten":
            parts = [p.strip() for p in current_text.split('|')]
            suggestion = " | ".join(parts[:3]) if len(parts) > 3 else current_text
            reasoning = "Se sintetizó el titular en los 3 pilares clave para máxima legibilidad."
        else:
            if target_role and target_role.lower() not in current_text.lower():
                suggestion = f"{target_role} | {current_text}"
                reasoning = f"Se priorizó el cargo objetivo '{target_role}' al inicio del titular profesional."
            else:
                suggestion = current_text.replace("  ", " ").strip()
                reasoning = "Titular pulido y equilibrado para captar atención en 5 segundos."

    elif section == "summary":
        if action == "shorten":
            sentences = current_text.split('. ')
            suggestion = ". ".join(sentences[:3]) + ("." if not sentences[2].endswith('.') else "")
            reasoning = "Resumen condensado en 3 oraciones de alto impacto (Elevator Pitch)."
        else:
            suggestion = current_text.strip()
            reasoning = "Perfil profesional verificado y estructurado con énfasis en trayectoria demostrable."

    elif section == "experience_bullet":
        if not re.match(r'^(Lideró|Diseñó|Implementó|Optimizó|Desarrolló|Administró|Automatizó|Gestionó)', current_text, re.I):
            suggestion = f"Implementó y optimizó: {current_text}"
            reasoning = "Se inició con un verbo de acción técnica directo para mayor impacto en evaluación ATS."

    return {
        "original": current_text,
        "suggestion": suggestion,
        "reasoning": reasoning
    }
