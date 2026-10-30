"""
ATS Search Scraper
Permite descubrir vacantes publicadas directamente en portales ATS corporativos
(Greenhouse, Lever, Ashby, Workday, SmartRecruiters) utilizando DuckDuckGo / Bing Search
mediante operadores booleanos (Google Dorks) y APIs públicas autorizadas.
"""

import requests
import re
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from app.models.schemas import JobPosting
from app.scrapers.base import BaseScraper
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ATSScraper(BaseScraper):
    @property
    def name(self) -> str:
        return "ats_direct"

    def search(self, keywords: str, remote_only: bool = True, limit: int = 15) -> List[JobPosting]:
        """
        Ejecuta búsquedas orientadas a ATS.
        Si 'keywords' es una consulta 'site:...', la ejecuta directamente.
        Si no, construye dorks para Greenhouse, Lever y Ashby.
        """
        results: List[JobPosting] = []
        user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        headers = {"User-Agent": user_agent}

        queries = []
        if keywords.startswith("site:"):
            queries = [keywords]
        else:
            kw_clean = keywords.strip()
            loc_clause = '("Chile" OR "Remote" OR "Remoto" OR "LATAM")' if remote_only else '("Chile" OR "Santiago")'
            queries = [
                f'site:boards.greenhouse.io "{kw_clean}" {loc_clause}',
                f'site:jobs.lever.co "{kw_clean}" {loc_clause}',
                f'site:jobs.ashbyhq.com "{kw_clean}" {loc_clause}',
            ]

        for query in queries[:2]:
            try:
                # Usar DuckDuckGo HTML Lite para consultar resultados limpios de portales ATS
                encoded_q = urllib.parse.quote_plus(query)
                url = f"https://html.duckduckgo.com/html/?q={encoded_q}"
                
                resp = requests.post(
                    url,
                    data={"q": query},
                    headers=headers,
                    timeout=10
                )

                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    links = soup.find_all("a", class_="result__url") or soup.find_all("a", class_="result__snippet")

                    for link in soup.find_all("div", class_="result__body"):
                        title_elem = link.find("a", class_="result__a")
                        snippet_elem = link.find("a", class_="result__snippet") or link.find("div", class_="result__snippet")
                        if not title_elem:
                            continue

                        raw_url = title_elem.get("href", "")
                        # DuckDuckGo wraps links in /l/?kh=-1&uddg=...
                        clean_url = raw_url
                        if "uddg=" in raw_url:
                            m = re.search(r'uddg=([^&]+)', raw_url)
                            if m:
                                clean_url = urllib.parse.unquote(m.group(1))

                        # Validate it's an ATS target URL
                        ats_platform = "ats_direct"
                        if "greenhouse.io" in clean_url:
                            ats_platform = "Greenhouse"
                        elif "lever.co" in clean_url:
                            ats_platform = "Lever"
                        elif "ashbyhq.com" in clean_url:
                            ats_platform = "Ashby"
                        elif "myworkdayjobs.com" in clean_url:
                            ats_platform = "Workday"
                        elif "smartrecruiters.com" in clean_url:
                            ats_platform = "SmartRecruiters"
                        elif "workable.com" in clean_url:
                            ats_platform = "Workable"

                        raw_title = title_elem.get_text(strip=True)
                        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                        # Extract company name from title or URL
                        company = "Empresa Corporativa"
                        title = raw_title
                        if " - " in raw_title:
                            parts = raw_title.split(" - ")
                            title = parts[0].strip()
                            company = parts[-1].replace("Careers", "").replace("Jobs", "").strip() or company
                        elif " at " in raw_title:
                            parts = raw_title.split(" at ")
                            title = parts[0].strip()
                            company = parts[1].strip() or company

                        # Extract company from subpath if Greenhouse/Lever/Ashby
                        if "boards.greenhouse.io/" in clean_url:
                            sub = clean_url.split("boards.greenhouse.io/")[1].split("/")[0]
                            if sub and sub != "embed":
                                company = sub.replace("-", " ").title()
                        elif "jobs.lever.co/" in clean_url:
                            sub = clean_url.split("jobs.lever.co/")[1].split("/")[0]
                            if sub:
                                company = sub.replace("-", " ").title()
                        elif "jobs.ashbyhq.com/" in clean_url:
                            sub = clean_url.split("jobs.ashbyhq.com/")[1].split("/")[0]
                            if sub:
                                company = sub.replace("-", " ").title()

                        is_remote = any(k in (title + snippet).lower() for k in ["remoto", "remote", "latam", "worldwide", "cualquier"])

                        job = JobPosting(
                            title=title[:100],
                            company=company[:60],
                            location="Chile / Remoto" if is_remote else "Chile",
                            is_remote=is_remote,
                            description=snippet or f"Vacante publicada directamente en portal ATS corporativo ({ats_platform}).",
                            url=clean_url,
                            source=f"ats_{ats_platform.lower()}",
                            tags=[ats_platform, "ATS Directo", "Corporativo"],
                            posted_at=datetime.utcnow().strftime("%Y-%m-%d"),
                            application_method="url"
                        )
                        results.append(job)

                        if len(results) >= limit:
                            break
            except Exception as e:
                logger.warning(f"Error consultando ATS ({query}): {e}")

        return results

ats_scraper = ATSScraper()
