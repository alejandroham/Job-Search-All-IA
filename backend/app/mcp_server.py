"""
Standard Model Context Protocol (MCP) Server for NexusJob AI.
Allows calling this autonomous job agent from Gemini, Claude Code, Cursor, or ChatGPT!
"""

import sys
import json
import logging
from typing import Dict, Any, List

from app.storage.db import db
from app.scrapers.remote_boards import RemoteBoardsScraper
from app.scrapers.linkedin_guest import LinkedInGuestScraper
from app.scrapers.url_parser import extract_job_from_url
from app.agents.fit_evaluator import fit_evaluator
from app.agents.drafter_reviewer import drafter_reviewer
from app.agents.preference_learner import preference_learner
from app.agents.interview_coach import interview_coach
from app.models.schemas import JobPosting, FeedbackAction

logger = logging.getLogger(__name__)

TOOLS_DEFINITION = [
    {
        "name": "search_remote_jobs",
        "description": "Busca empleos remotos en portales globales (RemoteOK, Arbeitnow, Remotive, LinkedIn) y los guarda en el radar.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "keywords": {"type": "string", "description": "Términos de búsqueda (ej. Python, React, AI Engineer)"},
                "remote_only": {"type": "boolean", "default": True, "description": "Filtrar únicamente vacantes remotas"},
                "limit": {"type": "integer", "default": 10, "description": "Cantidad máxima de vacantes a traer"}
            },
            "required": ["keywords"]
        }
    },
    {
        "name": "evaluate_job_fit",
        "description": "Evalúa objetivamente el ajuste de una vacante frente al CV del candidato en 5 dimensiones (0 a 100%).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "job_id": {"type": "string", "description": "ID del empleo guardado o URL directa a la oferta"}
            },
            "required": ["job_id"]
        }
    },
    {
        "name": "tailor_application",
        "description": "Genera CV adaptado y carta de presentación personalizada (pipeline Drafter-Reviewer) para un empleo específico.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "job_id": {"type": "string", "description": "ID del empleo guardado"}
            },
            "required": ["job_id"]
        }
    },
    {
        "name": "get_candidate_profile",
        "description": "Devuelve el perfil estructurado del candidato (habilidades, experiencia, preferencias).",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "record_feedback_and_learn",
        "description": "Registra una acción del usuario (like, dislike, apply, reject) para calibrar las preferencias aprendidas del agente.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "job_id": {"type": "string", "description": "ID del empleo"},
                "action": {"type": "string", "enum": ["like", "dislike", "apply", "reject"]},
                "notes": {"type": "string", "description": "Motivo opcional del feedback"}
            },
            "required": ["job_id", "action"]
        }
    }
]

def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Any:
    profile = db.get_profile()
    prefs = db.get_preferences()

    if name == "search_remote_jobs":
        kw = arguments.get("keywords", "Software Engineer")
        remote_only = arguments.get("remote_only", True)
        limit = arguments.get("limit", 10)
        
        scraper = RemoteBoardsScraper()
        jobs = scraper.search(keywords=kw, remote_only=remote_only, limit=limit)
        db.save_jobs(jobs)
        return {"found_jobs_count": len(jobs), "jobs": [j.model_dump() for j in jobs[:limit]]}

    elif name == "evaluate_job_fit":
        job_id = arguments.get("job_id", "")
        job = db.get_job_by_id(job_id)
        if not job:
            if job_id.startswith("http"):
                parsed = extract_job_from_url(job_id)
                if "error" in parsed:
                    return {"error": parsed["error"]}
                job = JobPosting(
                    title=parsed.get("title", "Posición"),
                    company=parsed.get("company", "Empresa"),
                    location=parsed.get("location", "Remoto"),
                    is_remote=parsed.get("is_remote", True),
                    description=parsed.get("description", ""),
                    url=job_id,
                    source="url_import"
                )
                db.save_jobs([job])
            else:
                return {"error": f"No se encontró el empleo con ID {job_id}"}

        evaluation = fit_evaluator.evaluate(job, profile, prefs)
        return evaluation.model_dump()

    elif name == "tailor_application":
        job_id = arguments.get("job_id")
        job = db.get_job_by_id(job_id)
        if not job:
            return {"error": "Empleo no encontrado"}
        draft = drafter_reviewer.generate_application(job, profile)
        return draft.model_dump()

    elif name == "get_candidate_profile":
        return {
            "profile": profile.model_dump(),
            "preferences": prefs.model_dump()
        }

    elif name == "record_feedback_and_learn":
        event = FeedbackAction(
            job_id=arguments.get("job_id"),
            action=arguments.get("action"),
            notes=arguments.get("notes")
        )
        updated_prefs = preference_learner.process_feedback(event)
        return {"status": "success", "learned_insights": updated_prefs.auto_learned_insights}

    return {"error": f"Herramienta {name} no reconocida"}

def run_mcp_stdio_server():
    """
    Standard JSON-RPC 2.0 loop for MCP clients (Gemini, Claude Code, Cursor, ChatGPT).
    """
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            req = json.loads(line)
            method = req.get("method")
            msg_id = req.get("id")

            if method == "tools/list":
                res = {"tools": TOOLS_DEFINITION}
                sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": msg_id, "result": res}) + "\n")
                sys.stdout.flush()

            elif method == "tools/call":
                params = req.get("params", {})
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                output = handle_tool_call(tool_name, tool_args)
                sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": msg_id, "result": {"content": [{"type": "text", "text": json.dumps(output, ensure_ascii=False)}]}}) + "\n")
                sys.stdout.flush()

            else:
                sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": msg_id, "result": {}}) + "\n")
                sys.stdout.flush()
        except Exception as e:
            sys.stderr.write(f"MCP server error: {e}\n")

if __name__ == "__main__":
    run_mcp_stdio_server()
