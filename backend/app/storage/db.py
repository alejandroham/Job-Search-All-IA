import json
import re
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models.schemas import (
    CandidateProfile, UserPreferences, JobPosting, 
    FitEvaluation, ApplicationDraft, FeedbackAction, TrackingHistoryEvent
)

class Database:
    def __init__(self):
        self._ensure_files()

    def _ensure_files(self):
        if not settings.PROFILE_FILE.exists():
            default_profile = CandidateProfile()
            self.save_profile(default_profile)

        if not settings.PREFERENCES_FILE.exists():
            default_pref = UserPreferences()
            self.save_preferences(default_pref)

        if not settings.JOBS_FILE.exists():
            self._write_json(settings.JOBS_FILE, [])

        if not settings.APPLICATIONS_FILE.exists():
            self._write_json(settings.APPLICATIONS_FILE, [])

        if not settings.FEEDBACK_FILE.exists():
            self._write_json(settings.FEEDBACK_FILE, [])

    def _read_json(self, path: Path) -> Any:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def _write_json(self, path: Path, data: Any):
        temp_path = path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        temp_path.replace(path)

    # Profile
    def get_profile(self) -> CandidateProfile:
        data = self._read_json(settings.PROFILE_FILE)
        if data:
            return CandidateProfile(**data)
        return CandidateProfile()

    def save_profile(self, profile: CandidateProfile):
        self._write_json(settings.PROFILE_FILE, profile.model_dump())

    # Preferences
    def get_preferences(self) -> UserPreferences:
        data = self._read_json(settings.PREFERENCES_FILE)
        if data:
            return UserPreferences(**data)
        return UserPreferences()

    def save_preferences(self, preferences: UserPreferences):
        self._write_json(settings.PREFERENCES_FILE, preferences.model_dump())

    # Jobs
    def get_jobs(self, status: Optional[str] = None) -> List[JobPosting]:
        raw = self._read_json(settings.JOBS_FILE) or []
        jobs = [JobPosting(**item) for item in raw]
        if status:
            jobs = [j for j in jobs if j.status == status]
        return sorted(jobs, key=lambda x: (x.fit_score or 0), reverse=True)

    def get_job_by_id(self, job_id: str) -> Optional[JobPosting]:
        jobs = self.get_jobs()
        for j in jobs:
            if j.id == job_id:
                return j
        return None

    def save_jobs(self, new_jobs: List[JobPosting]) -> int:
        existing = {j.url.strip().lower() if j.url else f"{j.company.lower()}-{j.title.lower()}": j for j in self.get_jobs()}
        added_count = 0
        for job in new_jobs:
            if not job.contact_email:
                email_m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', job.description or "")
                if email_m:
                    job.contact_email = email_m.group(0)
            if not job.application_method:
                job.application_method = "email" if job.contact_email else "url"
            
            key = job.url.strip().lower() if job.url else f"{job.company.lower()}-{job.title.lower()}"
            if key not in existing:
                existing[key] = job
                added_count += 1
            else:
                # Update score/status/fields if already present without overwriting tracking state
                ex = existing[key]
                if job.fit_score is not None and ex.fit_score is None:
                    ex.fit_score = job.fit_score
                if not ex.posted_at and job.posted_at:
                    ex.posted_at = job.posted_at
                if not ex.deadline and job.deadline:
                    ex.deadline = job.deadline
                if not ex.contact_email and job.contact_email:
                    ex.contact_email = job.contact_email
                    ex.application_method = "email"
                if not ex.salary_range and job.salary_range:
                    ex.salary_range = job.salary_range
        
        all_jobs = list(existing.values())
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in all_jobs])
        return added_count

    def track_job(self, job_id: str) -> Optional[JobPosting]:
        """
        Incorporates a job from the Radar into Seguimiento.
        Preserves all existing data, generates/links tailored content, and sets tracked_at.
        """
        jobs = self.get_jobs()
        target = None
        for j in jobs:
            if j.id == job_id:
                target = j
                break
        
        if not target:
            return None

        from datetime import datetime
        now_iso = datetime.utcnow().isoformat()

        # If not tracked yet, set initial tracking state
        if not target.tracked_at:
            target.tracked_at = now_iso
        
        if target.status == "discovered":
            target.status = "saved"

        # Initialize tracking history if empty
        if not target.history:
            target.history.append(
                TrackingHistoryEvent(
                    event_type="saved",
                    title="Oferta guardada en Seguimiento (Pendiente)",
                    date=now_iso[:10],
                    notes="Incorporada desde el Radar de Búsqueda."
                )
            )

        if not target.application_method:
            target.application_method = "email" if target.contact_email else "url"

        # Check if an existing ApplicationDraft is already available
        draft = self.get_application_by_job_id(job_id)
        if draft:
            if not target.tailored_cv_markdown:
                target.tailored_cv_markdown = draft.tailored_cv_markdown
            if not target.tailored_cv_html:
                target.tailored_cv_html = draft.tailored_cv_html
            if not target.tailored_cover_letter:
                target.tailored_cover_letter = draft.cover_letter

        # Auto-prefill default application email subject and body if email channel
        profile = self.get_profile()
        candidate_name = profile.name or "Candidato"
        if not target.email_subject:
            target.email_subject = f"Postulación: {target.title} - {candidate_name}"
        if not target.email_body:
            target.email_body = (
                f"Estimado equipo de selección de {target.company},\n\n"
                f"Me pongo en contacto para presentar formalmente mi postulación a la posición de {target.title}.\n\n"
                f"Cuento con sólida experiencia en las responsabilidades del puesto y motivación para integrarme a sus desafíos. "
                f"Adjunto comparto mi perfil y quedo a su total disposición para una entrevista.\n\n"
                f"Atentamente,\n"
                f"{candidate_name}\n"
                f"{profile.email or ''}\n"
                f"{profile.phone or ''}"
            )

        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])
        return target

    def update_job(self, job_id: str, updates: Dict[str, Any]) -> Optional[JobPosting]:
        jobs = self.get_jobs()
        target = None
        for j in jobs:
            if j.id == job_id:
                target = j
                break
        
        if not target:
            return None

        from datetime import datetime
        for key, value in updates.items():
            if hasattr(target, key) and value is not None:
                setattr(target, key, value)

        # Automatic date handling and history logging when status changes
        if updates.get("status") == "applied":
            if not target.applied_date:
                target.applied_date = datetime.utcnow().strftime("%Y-%m-%d")
            # Log to history if not logged yet
            if not any(h.event_type == "applied" for h in target.history):
                target.history.append(
                    TrackingHistoryEvent(
                        event_type="applied",
                        title="CV Enviado y Postulado",
                        date=target.applied_date,
                        notes="Postulación enviada exitosamente."
                    )
                )

        if updates.get("status") in ("offer", "rejected") and not target.outcome_date:
            target.outcome_date = datetime.utcnow().strftime("%Y-%m-%d")
            target.outcome_success = (updates.get("status") == "offer")

        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])
        return target

    def classify_job(self, job_id: str, status: str, reason: Optional[str] = None, feedback: Optional[str] = None) -> Optional[JobPosting]:
        """
        Manually classifies a job into a final category: 'offer' (Exitoso) or 'rejected' (No Exitoso).
        Preserves all history and documents.
        """
        from datetime import datetime
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        updates = {
            "status": status,
            "outcome_reason": reason,
            "outcome_feedback": feedback,
            "outcome_date": today_str,
            "outcome_success": (status == "offer")
        }
        res = self.update_job(job_id, updates)
        if res:
            title = "Oferta Laboral Formal / Proceso Exitoso" if status == "offer" else "Proceso Concluido / No Exitoso"
            res.history.append(
                TrackingHistoryEvent(
                    event_type="offer" if status == "offer" else "rejected",
                    title=title,
                    date=today_str,
                    notes=f"Motivo: {reason}" if reason else feedback
                )
            )
            jobs = self.get_jobs()
            for idx, j in enumerate(jobs):
                if j.id == job_id:
                    jobs[idx] = res
                    break
            self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])
        return res

    def add_job_history_event(self, job_id: str, event_data: Dict[str, Any]) -> Optional[JobPosting]:
        jobs = self.get_jobs()
        target = next((j for j in jobs if j.id == job_id), None)
        if not target:
            return None

        from datetime import datetime
        import uuid

        event = TrackingHistoryEvent(
            id=event_data.get("id") or str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_data.get("event_type", "note"),
            title=event_data.get("title", "Actualización del proceso"),
            date=event_data.get("date") or datetime.utcnow().strftime("%Y-%m-%d"),
            notes=event_data.get("notes")
        )
        target.history.append(event)

        # Automatic status progression based on event type
        ev_type = event.event_type
        if ev_type == "interview":
            target.status = "interviewing"
        elif ev_type == "responded":
            if target.status in ("saved", "applied"):
                target.status = "responded"
        elif ev_type == "applied":
            target.status = "applied"
            if not target.applied_date:
                target.applied_date = event.date or datetime.utcnow().strftime("%Y-%m-%d")
        elif ev_type == "offer":
            target.status = "offer"
            target.outcome_success = True
            target.outcome_date = event.date or datetime.utcnow().strftime("%Y-%m-%d")
            if event.notes and not target.outcome_reason:
                target.outcome_reason = event.notes
        elif ev_type == "rejected":
            target.status = "rejected"
            target.outcome_success = False
            target.outcome_date = event.date or datetime.utcnow().strftime("%Y-%m-%d")
            if event.notes and not target.outcome_reason:
                target.outcome_reason = event.notes

        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])
        return target

    def delete_job_history_event(self, job_id: str, event_id: str) -> Optional[JobPosting]:
        jobs = self.get_jobs()
        target = next((j for j in jobs if j.id == job_id), None)
        if not target:
            return None
        target.history = [h for h in target.history if h.id != event_id]
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])
        return target

    def update_job_status(self, job_id: str, status: str, fit_score: Optional[int] = None):
        updates: Dict[str, Any] = {"status": status}
        if fit_score is not None:
            updates["fit_score"] = fit_score
        self.update_job(job_id, updates)

    def delete_job_from_radar(self, job_id: str):
        """
        Removes an offer from the Radar.
        CRITICAL RULE: If the job is in Seguimiento (tracked_at is set or status != 'discovered'),
        it is NEVER deleted from the database! Only in_radar is set to False.
        """
        jobs = self.get_jobs()
        new_jobs = []
        for j in jobs:
            if j.id == job_id:
                if j.tracked_at or j.status != "discovered":
                    # Protected: keep in DB and tracker, hide only from radar
                    j.in_radar = False
                    new_jobs.append(j)
                else:
                    # Not tracked: can safely delete
                    pass
            else:
                new_jobs.append(j)
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in new_jobs])

    def delete_job_from_tracker(self, job_id: str):
        """
        Explicit user action from Seguimiento. Requires confirmation.
        """
        jobs = [j for j in self.get_jobs() if j.id != job_id]
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])

    def delete_job(self, job_id: str, from_section: str = "radar"):
        if from_section == "tracker":
            self.delete_job_from_tracker(job_id)
        else:
            self.delete_job_from_radar(job_id)

    def clear_radar_jobs(self):
        """
        Clears the Radar.
        CRITICAL RULE: Any job in Seguimiento is 100% preserved!
        Only untracked discovered jobs are deleted. Tracked jobs have in_radar set to False.
        """
        jobs = self.get_jobs()
        preserved = []
        for j in jobs:
            if j.tracked_at or j.status != "discovered":
                j.in_radar = False
                preserved.append(j)
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in preserved])

    def clear_jobs(self):
        self.clear_radar_jobs()

    # Applications
    def get_applications(self) -> List[ApplicationDraft]:
        raw = self._read_json(settings.APPLICATIONS_FILE) or []
        return [ApplicationDraft(**item) for item in raw]

    def save_application(self, app: ApplicationDraft):
        apps = self.get_applications()
        apps = [a for a in apps if a.job_id != app.job_id]
        apps.append(app)
        self._write_json(settings.APPLICATIONS_FILE, [a.model_dump() for a in apps])

    def delete_application(self, app_id: str):
        apps = [a for a in self.get_applications() if a.id != app_id and a.job_id != app_id]
        self._write_json(settings.APPLICATIONS_FILE, [a.model_dump() for a in apps])

    def get_application_by_job_id(self, job_id: str) -> Optional[ApplicationDraft]:
        apps = self.get_applications()
        for a in apps:
            if a.job_id == job_id:
                return a
        return None

    # Feedback / Learning
    def record_feedback(self, event: FeedbackAction):
        history = self._read_json(settings.FEEDBACK_FILE) or []
        history.append(event.model_dump())
        self._write_json(settings.FEEDBACK_FILE, history)

    def get_feedback_history(self) -> List[Dict[str, Any]]:
        return self._read_json(settings.FEEDBACK_FILE) or []

db = Database()
