import os
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
    
    # LLM Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "gemini") # "gemini", "openai", "claude"
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
    
    # Storage Paths
    PROFILE_FILE: Path = DATA_DIR / "profile.json"
    PREFERENCES_FILE: Path = DATA_DIR / "preferences.json"
    JOBS_FILE: Path = DATA_DIR / "jobs.json"
    APPLICATIONS_FILE: Path = DATA_DIR / "applications.json"
    FEEDBACK_FILE: Path = DATA_DIR / "feedback_events.json"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"

Settings.UPLOADS_DIR.mkdir(exist_ok=True)
settings = Settings()
