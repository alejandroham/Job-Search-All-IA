import httpx
from bs4 import BeautifulSoup
import re
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

# Zero-width spaces, soft hyphens, and invisible formatting
ZERO_WIDTH_RE = re.compile(r'[\u200B-\u200D\uFEFF\u00AD\u2060\u200E\u200F]')

# Common prompt injection signatures found in untrusted job postings
INJECTION_PATTERNS = [
    re.compile(r'ignore\s+(all\s+)?(previous|prior)\s+instructions', re.IGNORECASE),
    re.compile(r'system\s+prompt', re.IGNORECASE),
    re.compile(r'output\s+(the\s+following|this\s+text)', re.IGNORECASE),
    re.compile(r'you\s+must\s+say', re.IGNORECASE),
    re.compile(r'override\s+the\s+rules', re.IGNORECASE)
]

def sanitize_job_text(raw_text: str) -> Tuple[str, bool]:
    """
    Cleans hidden characters and checks for potential prompt injection attempts.
    Returns (cleaned_text, is_suspicious).
    """
    # Remove zero-width characters
    cleaned = ZERO_WIDTH_RE.sub('', raw_text)
    
    # Check for prompt injection signatures
    is_suspicious = False
    for pat in INJECTION_PATTERNS:
        if pat.search(cleaned):
            is_suspicious = True
            logger.warning(f"Potential prompt injection pattern detected in job text: {pat.pattern}")
            # Neutralize the suspicious instruction line
            cleaned = pat.sub('[BLOCKED_INSTRUCTION_REMOVED]', cleaned)

    # Normalize excessive spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned, is_suspicious

def extract_job_from_url(url: str) -> Dict[str, Any]:
    """
    Fetches and parses a job posting webpage cleanly.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    try:
        with httpx.Client(timeout=15.0, headers=headers, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return {"error": f"Error al cargar la página (Status {resp.status_code})"}
            
            soup = BeautifulSoup(resp.text, "html.parser")

            # Remove scripts, styles, iframes
            for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
                tag.decompose()

            # Attempt to grab page title / h1
            title = ""
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text(strip=True)
            elif soup.title:
                title = soup.title.get_text(strip=True)

            # Get body text
            body_text = soup.get_text(separator="\n", strip=True)
            cleaned_text, suspicious = sanitize_job_text(body_text)

            is_remote = any(k in cleaned_text.lower() for k in ["remote", "remoto", "teletrabajo", "anywhere", "work from home"])

            return {
                "title": title or "Posición detectada",
                "company": "Empresa extraída de URL",
                "location": "Remoto" if is_remote else "Por determinar",
                "is_remote": is_remote,
                "description": cleaned_text[:6000],
                "url": url,
                "is_suspicious": suspicious
            }
    except Exception as e:
        logger.error(f"Error parsing job URL {url}: {e}")
        return {"error": f"No se pudo extraer el contenido del enlace: {str(e)}"}
