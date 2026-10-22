import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models.schemas import (
    CandidateProfile, UserPreferences, JobPosting, 
    FitEvaluation, ApplicationDraft, FeedbackAction
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
            key = job.url.strip().lower() if job.url else f"{job.company.lower()}-{job.title.lower()}"
            if key not in existing:
                existing[key] = job
                added_count += 1
            else:
                # Update score/status if already present
                if job.fit_score is not None:
                    existing[key].fit_score = job.fit_score
        
        all_jobs = list(existing.values())
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in all_jobs])
        return added_count

    def update_job_status(self, job_id: str, status: str, fit_score: Optional[int] = None):
        jobs = self.get_jobs()
        for j in jobs:
            if j.id == job_id:
                j.status = status
                if fit_score is not None:
                    j.fit_score = fit_score
                break
        self._write_json(settings.JOBS_FILE, [j.model_dump() for j in jobs])

    # Applications
    def get_applications(self) -> List[ApplicationDraft]:
        raw = self._read_json(settings.APPLICATIONS_FILE) or []
        return [ApplicationDraft(**item) for item in raw]

    def save_application(self, app: ApplicationDraft):
        apps = self.get_applications()
        apps = [a for a in apps if a.job_id != app.job_id]
        apps.append(app)
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
