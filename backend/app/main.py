import os
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.models.schemas import (
    CandidateProfile, UserPreferences, JobPosting, 
    FitEvaluation, ApplicationDraft, FeedbackAction, LLMConfig,
    OutcomeSubmission, UpskillPlan
)
from app.storage.db import db
from app.agents.profile_analyzer import extract_text_from_file, analyze_cv_content
from app.agents.fit_evaluator import fit_evaluator
from app.agents.drafter_reviewer import drafter_reviewer
from app.agents.preference_learner import preference_learner
from app.agents.interview_coach import interview_coach
from app.agents.outcome_agent import outcome_agent
from app.agents.llm_provider import llm
from app.scrapers.remote_boards import RemoteBoardsScraper
from app.scrapers.linkedin_guest import LinkedInGuestScraper
from app.scrapers.url_parser import extract_job_from_url
from app.scrapers.chile_portals import ChilePortalsScraper
from app.scrapers.ats_scraper import ats_scraper
from app.agents.role_recommender import role_recommender
from app.models.schemas import (
    CompanyDirectoryItem, RoleRecommendation, GeneratedATSQuery
)

app = FastAPI(title="NexusJob AI API", version=settings.VERSION)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Profile Endpoints ---

@app.get("/api/profile", response_model=CandidateProfile)
def get_profile():
    return db.get_profile()

@app.put("/api/profile", response_model=CandidateProfile)
def update_profile(profile: CandidateProfile):
    db.save_profile(profile)
    return profile

@app.post("/api/profile/upload")
async def upload_cv(file: UploadFile = File(...)):
    file_path = settings.UPLOADS_DIR / file.filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    text = extract_text_from_file(file_path)
    if not text:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del archivo subido.")

    profile = analyze_cv_content(text)
    return {"message": "CV analizado exitosamente", "profile": profile}

# --- Preferences & Learning Endpoints ---

@app.get("/api/preferences", response_model=UserPreferences)
def get_preferences():
    return db.get_preferences()

@app.put("/api/preferences", response_model=UserPreferences)
def update_preferences(prefs: UserPreferences):
    db.save_preferences(prefs)
    return prefs

@app.post("/api/feedback")
def record_feedback(event: FeedbackAction):
    updated_prefs = preference_learner.process_feedback(event)
    return {"status": "success", "learned_insights": updated_prefs.auto_learned_insights}

# --- Companies Directory & ATS Endpoints ---

@app.get("/api/companies", response_model=List[CompanyDirectoryItem])
def list_companies(country: Optional[str] = None, industry: Optional[str] = None):
    return db.get_companies(country=country, industry=industry)

@app.get("/api/roles/recommendations", response_model=List[RoleRecommendation])
def get_role_recommendations(force_refresh: bool = False):
    existing = db.get_role_recommendations()
    if existing and not force_refresh:
        return existing
    profile = db.get_profile()
    prefs = db.get_preferences()
    recs = role_recommender.recommend_roles(profile, prefs)
    db.save_role_recommendations(recs)
    return recs

@app.post("/api/roles/recommendations/{rec_id}/status", response_model=RoleRecommendation)
def update_role_rec_status(rec_id: str, data: dict):
    approved = data.get("approved", True)
    updated = db.update_role_recommendation_status(rec_id, approved=approved)
    if not updated:
        raise HTTPException(status_code=404, detail="Recomendación no encontrada")
    return updated

@app.get("/api/roles/ats-queries", response_model=List[GeneratedATSQuery])
def get_ats_queries():
    profile = db.get_profile()
    prefs = db.get_preferences()
    recs = db.get_role_recommendations()
    if not recs:
        recs = role_recommender.recommend_roles(profile, prefs)
        db.save_role_recommendations(recs)
    queries = role_recommender.generate_ats_queries(profile, prefs, recs)
    return queries

@app.post("/api/jobs/scrape-query")
def scrape_custom_query(data: dict):
    query = data.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Consulta no proporcionada")
    jobs = ats_scraper.search(keywords=query, limit=15)
    added = db.save_jobs(jobs)
    return {
        "message": f"Búsqueda ATS ejecutada: {len(jobs)} ofertas encontradas ({added} nuevas).",
        "total_fetched": len(jobs),
        "new_added": added,
        "query": query
    }

# --- Jobs & Radar Endpoints ---

@app.get("/api/jobs", response_model=List[JobPosting])
def list_jobs(status: Optional[str] = None):
    return db.get_jobs(status=status)

@app.post("/api/jobs/scrape")
def trigger_scrape(keywords: Optional[str] = None, remote_only: bool = True, scope: str = "global"):
    """
    Scrape job postings from multiple sources.
    
    Params:
      - keywords: role or technology to search for
      - remote_only: filter only remote positions
      - scope: "global" | "chile" | "all"
          global  → remote-friendly international boards (Arbeitnow, Remotive, RemoteOK, LinkedIn Global)
          chile   → Chilean portals (GetOnBoard, LinkedIn Chile, CompuTrabajo, ChileTrabajos, Laborum)
          all     → both international + Chilean portals
    """
    prefs = db.get_preferences()
    kw = keywords or (prefs.target_roles[0] if prefs.target_roles else "Software Engineer")
    jobs: list = []

    # ── International / Global remote boards ────────────────────────────────
    if scope in ("global", "all"):
        try:
            remote_scraper = RemoteBoardsScraper()
            global_jobs = remote_scraper.search(keywords=kw, remote_only=remote_only, limit=20)
            jobs.extend(global_jobs)
        except Exception as e:
            import logging; logging.getLogger(__name__).warning(f"Remote boards error: {e}")

        try:
            linkedin_scraper = LinkedInGuestScraper()
            li_jobs = linkedin_scraper.search(keywords=kw, remote_only=remote_only, limit=8)
            jobs.extend(li_jobs)
        except Exception:
            pass

    # ── Chilean Portals ──────────────────────────────────────────────────────
    if scope in ("chile", "all"):
        try:
            chile_scraper = ChilePortalsScraper()
            # For Chilean portals, remote_only=False by default to include presential/hybrid
            chile_remote = remote_only if scope == "chile" else False
            chile_jobs = chile_scraper.search(keywords=kw, remote_only=chile_remote, limit=40)
            jobs.extend(chile_jobs)
        except Exception as e:
            import logging; logging.getLogger(__name__).warning(f"Chile portals error: {e}")

    # ── Direct ATS Corporate Scraper (Workday, Greenhouse, Lever, Ashby) ──
    try:
        ats_jobs = ats_scraper.search(keywords=kw, remote_only=remote_only, limit=15)
        jobs.extend(ats_jobs)
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"ATS direct error: {e}")

    added = db.save_jobs(jobs)
    scope_labels = {
        "global": "portales internacionales remotos + ATS",
        "chile": "portales chilenos + ATS Corporativo",
        "all": "portales globales + chilenos + ATS Corporativo"
    }
    return {
        "message": f"Radar actualizado — {scope_labels.get(scope, scope)}: {len(jobs)} vacantes encontradas ({added} nuevas).",
        "total_fetched": len(jobs),
        "new_added": added,
        "scope": scope,
        "sources": list({j.source for j in jobs})
    }

@app.post("/api/jobs/import-url")
def import_job_from_url(data: dict):
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL es requerida")

    parsed = extract_job_from_url(url)
    if "error" in parsed:
        raise HTTPException(status_code=400, detail=parsed["error"])

    job = JobPosting(
        title=parsed.get("title", "Posición Detectada"),
        company=parsed.get("company", "Empresa Externa"),
        location=parsed.get("location", "Remoto"),
        is_remote=parsed.get("is_remote", True),
        description=parsed.get("description", ""),
        url=url,
        source="url_import"
    )

    db.save_jobs([job])
    return {"message": "Oferta importada exitosamente", "job": job}

@app.post("/api/jobs/{job_id}/evaluate", response_model=FitEvaluation)
def evaluate_job(job_id: str):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    
    profile = db.get_profile()
    prefs = db.get_preferences()
    evaluation = fit_evaluator.evaluate(job, profile, prefs)
    return evaluation

@app.post("/api/jobs/batch-rank")
def batch_rank_jobs():
    jobs = db.get_jobs()
    profile = db.get_profile()
    prefs = db.get_preferences()

    evaluated_count = 0
    for job in jobs[:15]: # rank top 15 in batch
        if job.fit_score is None:
            fit_evaluator.evaluate(job, profile, prefs)
            evaluated_count += 1

    return {"message": f"{evaluated_count} ofertas evaluadas y ordenadas por ajuste."}

@app.post("/api/jobs/{job_id}/track", response_model=JobPosting)
def track_job_endpoint(job_id: str):
    job = db.track_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return job

@app.put("/api/jobs/{job_id}", response_model=JobPosting)
def update_job_endpoint(job_id: str, data: dict):
    updated = db.update_job(job_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return updated

@app.post("/api/jobs/{job_id}/classify", response_model=JobPosting)
def classify_job_endpoint(job_id: str, data: dict):
    status = data.get("status")
    allowed_statuses = (
        "offer", "rejected", "applied", "interviewing", "saved", "responded",
        "eval_pending", "eval_approved", "eval_discarded",
        "preparing", "ready_to_send", "pending_send",
        "applied_no_response", "contact_received",
        "interview_scheduled", "interview_done", "in_evaluation", "final_stage"
    )
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Estado de clasificación inválido")
    reason = data.get("reason")
    feedback = data.get("feedback")
    classified = db.classify_job(job_id, status=status, reason=reason, feedback=feedback)
    if not classified:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return classified

@app.post("/api/jobs/{job_id}/history", response_model=JobPosting)
def add_job_history_endpoint(job_id: str, data: dict):
    updated = db.add_job_history_event(job_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return updated

@app.delete("/api/jobs/{job_id}/history/{event_id}", response_model=JobPosting)
def delete_job_history_endpoint(job_id: str, event_id: str):
    updated = db.delete_job_history_event(job_id, event_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Empleo o evento no encontrado")
    return updated

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str, from_section: str = "radar"):
    db.delete_job(job_id, from_section=from_section)
    msg = "Oportunidad descartada del Radar" if from_section == "radar" else "Registro eliminado del Seguimiento"
    return {"message": msg}

@app.delete("/api/jobs")
def clear_all_jobs():
    db.clear_radar_jobs()
    return {"message": "Radar limpiado exitosamente. Las ofertas en Seguimiento se mantienen protegidas."}

@app.put("/api/jobs/{job_id}/status")
def update_job_status_endpoint(job_id: str, data: dict):
    new_status = data.get("status", "saved")
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    db.update_job_status(job_id, status=new_status)
    return {"message": f"Estado actualizado a {new_status}"}

@app.post("/api/jobs/{job_id}/outcome", response_model=UpskillPlan)
def register_job_outcome(job_id: str, submission: OutcomeSubmission):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    profile = db.get_profile()
    prefs = db.get_preferences()
    plan = outcome_agent.process_outcome(submission, job, profile, prefs)
    return plan

# --- Drafter-Reviewer Application Endpoints ---

@app.post("/api/jobs/{job_id}/apply", response_model=ApplicationDraft)
def apply_to_job(job_id: str):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    
    profile = db.get_profile()
    draft = drafter_reviewer.generate_application(job, profile)
    return draft

@app.get("/api/applications", response_model=List[ApplicationDraft])
def list_applications():
    return db.get_applications()

@app.get("/api/applications/{job_id}", response_model=Optional[ApplicationDraft])
def get_application(job_id: str):
    return db.get_application_by_job_id(job_id)

@app.delete("/api/applications/{job_id}")
def delete_application_endpoint(job_id: str):
    db.delete_application(job_id)
    return {"message": "Postulación eliminada exitosamente"}

# --- Interview Coach Endpoints ---

@app.post("/api/jobs/{job_id}/interview-prep")
def get_interview_prep(job_id: str):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    
    profile = db.get_profile()
    kit = interview_coach.generate_prep_kit(job, profile)
    return kit

@app.post("/api/interview/evaluate-answer")
def evaluate_interview_answer(data: dict):
    question = data.get("question", "")
    answer = data.get("answer", "")
    if not question or not answer:
        raise HTTPException(status_code=400, detail="Pregunta y respuesta requeridas")
    return interview_coach.evaluate_mock_answer(question, answer)

# --- Settings & Keys Endpoints ---

@app.get("/api/settings")
def get_current_settings():
    provider = settings.DEFAULT_PROVIDER
    has_active_key = False
    active_model_name = ""

    if provider == "gemini":
        has_active_key = bool(settings.GEMINI_API_KEY)
        active_model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
    elif provider == "openai":
        has_active_key = bool(settings.OPENAI_API_KEY)
        active_model_name = settings.OPENAI_MODEL or "gpt-4o"
    elif provider == "claude":
        has_active_key = bool(settings.ANTHROPIC_API_KEY)
        active_model_name = settings.CLAUDE_MODEL or "claude-3-5-sonnet-20241022"

    return {
        "provider": provider,
        "has_active_key": has_active_key,
        "active_model_name": active_model_name,
        "status_label": f"{provider.capitalize()} ({active_model_name})" if has_active_key else "Modo Offline Heurístico",
        "status_color": "green" if has_active_key else "yellow",
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
        "has_openai_key": bool(settings.OPENAI_API_KEY),
        "has_claude_key": bool(settings.ANTHROPIC_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "openai_model": settings.OPENAI_MODEL,
        "claude_model": settings.CLAUDE_MODEL
    }

@app.post("/api/settings")
def update_llm_settings(config: LLMConfig):
    if config.api_key is not None:
        llm.update_keys(config.provider, config.api_key, config.model_name)
    else:
        settings.DEFAULT_PROVIDER = config.provider
        if config.model_name:
            if config.provider == "gemini":
                settings.GEMINI_MODEL = config.model_name
            elif config.provider == "openai":
                settings.OPENAI_MODEL = config.model_name
            elif config.provider == "claude":
                settings.CLAUDE_MODEL = config.model_name
        settings.save_persisted_llm_settings()
    return {"message": "Configuración de IA actualizada y guardada localmente"}

# Serve frontend build if present
FRONTEND_DIST = settings.BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
