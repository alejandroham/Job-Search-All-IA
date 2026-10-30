import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

load_dotenv(BASE_DIR / ".env")

class Settings:
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    PROJECT_NAME: str = "NexusJob AI - Agente Autónomo de Búsqueda de Empleo"
    VERSION: str = "1.0.0"
    
    # Storage Paths
    PROFILE_FILE: Path = DATA_DIR / "profile.json"
    PREFERENCES_FILE: Path = DATA_DIR / "preferences.json"
    JOBS_FILE: Path = DATA_DIR / "jobs.json"
    APPLICATIONS_FILE: Path = DATA_DIR / "applications.json"
    FEEDBACK_FILE: Path = DATA_DIR / "feedback_events.json"
    LLM_SETTINGS_FILE: Path = DATA_DIR / "llm_settings.json"
    COMPANIES_FILE: Path = DATA_DIR / "companies.json"
    ROLE_RECOMMENDATIONS_FILE: Path = DATA_DIR / "role_recommendations.json"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"

    # LLM Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "gemini") # "gemini", "openai", "claude"
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")

    def __init__(self):
        self.UPLOADS_DIR.mkdir(exist_ok=True)
        self.load_persisted_llm_settings()

    def load_persisted_llm_settings(self):
        if self.LLM_SETTINGS_FILE.exists():
            try:
                with open(self.LLM_SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("gemini_api_key"):
                        self.GEMINI_API_KEY = data["gemini_api_key"]
                    if data.get("openai_api_key"):
                        self.OPENAI_API_KEY = data["openai_api_key"]
                    if data.get("anthropic_api_key"):
                        self.ANTHROPIC_API_KEY = data["anthropic_api_key"]
                    if data.get("provider"):
                        self.DEFAULT_PROVIDER = data["provider"]
                    if data.get("gemini_model"):
                        model = data["gemini_model"]
                        # Auto-upgrade deprecated models
                        if model in ["gemini-2.5-flash", "models/gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
                            model = "gemini-3.5-flash"
                        self.GEMINI_MODEL = model
                    if data.get("openai_model"):
                        self.OPENAI_MODEL = data["openai_model"]
                    if data.get("claude_model"):
                        self.CLAUDE_MODEL = data["claude_model"]
            except Exception:
                pass

    def save_persisted_llm_settings(self):
        try:
            data = {
                "provider": self.DEFAULT_PROVIDER,
                "gemini_api_key": self.GEMINI_API_KEY,
                "openai_api_key": self.OPENAI_API_KEY,
                "anthropic_api_key": self.ANTHROPIC_API_KEY,
                "gemini_model": self.GEMINI_MODEL,
                "openai_model": self.OPENAI_MODEL,
                "claude_model": self.CLAUDE_MODEL
            }
            with open(self.LLM_SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

settings = Settings()
