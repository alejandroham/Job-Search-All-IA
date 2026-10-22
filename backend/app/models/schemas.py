from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

class WorkExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    company: str
    role: str
    start_date: str
    end_date: Optional[str] = "Present"
    location: Optional[str] = None
    is_remote: bool = False
    description: str
    technologies: List[str] = []
    bullet_achievements: List[str] = []

class EducationItem(BaseModel):
    institution: str
    degree: str
    field_of_study: str
    graduation_year: Optional[str] = None

class CandidateProfile(BaseModel):
    name: str = "Candidato"
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = "Remoto / Global"
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    headline: Optional[str] = "Profesional Tecnológico"
    summary: Optional[str] = ""
    years_of_experience: float = 0.0
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    languages: Dict[str, str] = {} # e.g. {"Español": "Nativo", "Inglés": "C1 Avanzado"}
    experiences: List[WorkExperience] = []
    education: List[EducationItem] = []
    certifications: List[str] = []
    raw_cv_text: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UserPreferences(BaseModel):
    target_roles: List[str] = ["Software Engineer", "AI Engineer", "Full Stack Developer", "Data Scientist"]
    preferred_locations: List[str] = ["Remote", "Worldwide", "LatAm", "US", "Europe"]
    remote_only: bool = True
    min_salary_usd: Optional[int] = 50000
    preferred_technologies: List[str] = []
    deal_breakers: List[str] = [
        "100% presencial obligatorio",
        "Disponibilidad 24/7 sin compensación",
        "Empresas de apuestas no reguladas o esquemas dudosos"
    ]
    auto_learned_insights: List[str] = []
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class JobPosting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company: str
    location: str = "Remote"
    is_remote: bool = True
    salary_range: Optional[str] = None
    description: str
    url: Optional[str] = None
    source: str = "direct" # "remoteok", "arbeitnow", "remotive", "freehire", "linkedin", "manual"
    tags: List[str] = []
    posted_at: Optional[str] = None
    discovered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    fit_score: Optional[int] = None
    status: str = "discovered" # "discovered", "saved", "applied", "interviewing", "offer", "rejected", "archived"
    notes: Optional[str] = None
    outcome: Optional[str] = None # e.g. "offer_received", "interview_round_2", "rejected_technical", "ghosted"
    outcome_notes: Optional[str] = None
    outcome_success: Optional[bool] = None
    applied_date: Optional[str] = None
    contact_email: Optional[str] = None
    upskill_recommendations: List[str] = []

class OutcomeSubmission(BaseModel):
    job_id: str
    status: str # "applied", "interviewing", "offer", "rejected"
    was_successful: bool
    reason: Optional[str] = None
    feedback_details: Optional[str] = None

class StudyTopic(BaseModel):
    topic: str
    description: str
    suggested_resources: str
    estimated_time: str

class UpskillPlan(BaseModel):
    job_title: str
    company: str
    was_successful: bool
    strategy_adjustment: str
    skill_gaps: List[str] = []
    study_plan: List[StudyTopic] = []
    recommended_certifications: List[str] = []
    actionable_next_steps: List[str] = []

class FitDimensionScore(BaseModel):
    dimension: str # "Technical Skills", "Experience & Seniority", "Culture & Work Style", "Remote Flexibility", "Career Alignment"
    score: int # 0-100
    reasoning: str

class FitEvaluation(BaseModel):
    job_id: str
    overall_score: int # 0-100
    verdict: str # "Altamente Recomendado", "Buen Ajuste", "Ajuste Moderado", "No Recomendado"
    dimension_scores: List[FitDimensionScore] = []
    strengths: List[str] = []
    missing_skills: List[str] = []
    deal_breakers_found: List[str] = []
    recommendation_summary: str
    evaluated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ApplicationDraft(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    job_title: str
    company: str
    tailored_cv_markdown: str
    tailored_cv_html: Optional[str] = None
    cover_letter: str
    ats_score: int = 85
    ats_feedback: List[str] = []
    reviewer_critique: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class FeedbackAction(BaseModel):
    job_id: str
    action: str # "like", "dislike", "apply", "reject"
    notes: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class LLMConfig(BaseModel):
    provider: str = "gemini" # "gemini", "openai", "claude"
    api_key: Optional[str] = None
    model_name: Optional[str] = None
