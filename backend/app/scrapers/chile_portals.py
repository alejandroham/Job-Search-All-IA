"""
Chile & LATAM Job Portal Scrapers
==================================
Portales integrados con sus estrategias específicas:

1. GetOnBoard.com  → API REST pública oficial (v0, sin autenticación)
2. LinkedIn Chile  → Guest HTML scraper (presencial + híbrido + remoto en CL)
3. CompuTrabajo CL → HTML scraper con BeautifulSoup
4. ChileTrabajos   → HTML scraper ligero (paginado)
5. Laborum.cl      → HTML scraper con BeautifulSoup

Principios de diseño:
- Preferir APIs públicas oficiales sobre HTML scraping cuando estén disponibles.
- Respetar robots.txt: ningún portal bloquea búsquedas de empleo en su robots.txt.
- Rate limiting suave: sleep() intercalado entre requests.
- Fail-safe: cada fuente captura su excepción de forma aislada.
- Sanitización: se eliminan etiquetas HTML, whitespace excesivo y caracteres raros.
"""

import httpx
import logging
import re
import time
from typing import List, Optional
from bs4 import BeautifulSoup
from app.models.schemas import JobPosting
from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

# Shared headers simulating a real browser (avoids basic anti-bot blocks)
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _strip_html(raw: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", " ", raw or "")
    return re.sub(r"\s+", " ", text).strip()


def _keyword_match(text: str, keyword: str) -> bool:
    """True if keyword (or any word of it) appears in text."""
    if not keyword:
        return True
    kw = keyword.lower().strip()
    if kw in text.lower():
        return True
    # Also check individual words for multi-word keywords
    for word in kw.split():
        if len(word) > 3 and word in text.lower():
            return True
    return False


# ---------------------------------------------------------------------------
# 1. GetOnBoard — Official Public REST API (no auth needed)
# ---------------------------------------------------------------------------

class GetOnBoardScraper(BaseScraper):
    """
    Uses GetOnBoard's official public API v0.
    Endpoint: https://www.getonbrd.com/api/v0/search/jobs
    Docs: https://api-doc.getonbrd.com/
    """
    BASE_URL = "https://www.getonbrd.com/api/v0"

    @property
    def name(self) -> str:
        return "getonbrd"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 20) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        kw = keywords.strip() if keywords else ""

        try:
            # Search jobs endpoint
            params: dict = {
                "per_page": min(limit, 50),
                "page": 1,
                "expand[]": "company",
            }
            if kw:
                params["query"] = kw

            with httpx.Client(timeout=12.0, follow_redirects=True) as client:
                resp = client.get(f"{self.BASE_URL}/search/jobs", params=params)
                if resp.status_code != 200:
                    logger.warning(f"GetOnBoard search returned {resp.status_code}")
                    return jobs

                data = resp.json().get("data", [])

                for item in data:
                    attrs = item.get("attributes", {})
                    title = attrs.get("title", "")
                    if not title:
                        continue

                    # Modality: remote, hybrid, on-site
                    modality = attrs.get("remote_modality", "").lower()
                    is_remote = modality in ("fully_remote", "remote", "remoto")
                    is_hybrid = modality in ("hybrid", "hibrido", "partially_remote")

                    if remote_only and not is_remote:
                        continue

                    # Company info (expanded)
                    company_data = item.get("relationships", {}).get("company", {}).get("data", {})
                    company_name = attrs.get("company_name") or "Empresa en GetOnBoard"

                    # Location
                    locations = attrs.get("remote_locations") or []
                    country = attrs.get("country") or "Chile"
                    loc_str = ", ".join(locations) if locations else country
                    if not loc_str:
                        loc_str = "Chile"

                    # Salary
                    salary_min = attrs.get("min_salary")
                    salary_max = attrs.get("max_salary")
                    salary_currency = attrs.get("salary_currency", "CLP")
                    salary_range = None
                    if salary_min or salary_max:
                        salary_range = f"{salary_currency} {salary_min or '?'} - {salary_max or '?'}"

                    # Tags / tech stack
                    tags = [t.get("name", "") for t in (attrs.get("tags") or []) if t.get("name")]

                    # Description
                    raw_desc = attrs.get("description") or attrs.get("functions") or ""
                    clean_desc = _strip_html(raw_desc)
                    if not clean_desc:
                        clean_desc = f"Oportunidad de {title} en {company_name}. Modalidad: {modality}. País: {country}."

                    # URL
                    job_url = attrs.get("url") or f"https://www.getonbrd.com/jobs/{item.get('id', '')}"

                    # Modality label for location
                    modality_labels = {"fully_remote": "Remoto", "hybrid": "Híbrido", "on_site": "Presencial"}
                    modality_label = modality_labels.get(modality, modality.capitalize() if modality else "")
                    if modality_label:
                        loc_str = f"{loc_str} — {modality_label}"

                    jobs.append(JobPosting(
                        title=title,
                        company=company_name,
                        location=loc_str,
                        is_remote=is_remote,
                        salary_range=salary_range,
                        description=clean_desc[:4000],
                        url=job_url,
                        source="getonbrd",
                        tags=tags,
                        posted_at=attrs.get("published_at", "")
                    ))

                    if len(jobs) >= limit:
                        break

        except Exception as e:
            logger.warning(f"[GetOnBoard] Error: {e}")

        logger.info(f"[GetOnBoard] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# 2. LinkedIn Chile — Guest scraper for presential, hybrid & remote in CL
# ---------------------------------------------------------------------------

class LinkedInChileScraper(BaseScraper):
    """
    Uses LinkedIn's public guest jobs search endpoint.
    Supports f_WT filtering:
      1 = On-site (Presencial)
      2 = Remote (Remoto)
      3 = Hybrid (Híbrido)
    """
    BASE_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

    @property
    def name(self) -> str:
        return "linkedin_chile"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 15) -> List[JobPosting]:
        jobs: List[JobPosting] = []

        # Work type filters: remote=2, presential=1, hybrid=3
        # If remote_only: only fetch remote. Otherwise fetch all 3 modalities
        work_type_sets = ["2"] if remote_only else ["1,2,3"]

        for work_types in work_type_sets:
            try:
                params = {
                    "keywords": keywords or "Tecnología",
                    "location": "Chile",
                    "geoId": "104621616",  # Chile's LinkedIn geoId
                    "f_WT": work_types,
                    "start": 0,
                }

                with httpx.Client(timeout=12.0, headers=_BROWSER_HEADERS, follow_redirects=True) as client:
                    resp = client.get(self.BASE_URL, params=params)
                    if resp.status_code != 200:
                        logger.warning(f"[LinkedIn Chile] HTTP {resp.status_code}")
                        continue

                    soup = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.find_all("li")

                    for card in cards:
                        title_el = card.find("h3", class_="base-search-card__title")
                        company_el = card.find("h4", class_="base-search-card__subtitle")
                        loc_el = card.find("span", class_="job-search-card__location")
                        link_el = card.find("a", class_="base-card__full-link")

                        if not title_el or not company_el:
                            continue

                        title = title_el.get_text(strip=True)
                        company = company_el.get_text(strip=True)
                        loc = loc_el.get_text(strip=True) if loc_el else "Chile"
                        url = ""
                        if link_el and "href" in link_el.attrs:
                            url = link_el["href"].split("?")[0]

                        # Determine modality from location text
                        loc_lower = loc.lower()
                        is_remote = "remoto" in loc_lower or "remote" in loc_lower
                        is_hybrid = "híbrido" in loc_lower or "hybrid" in loc_lower or "hibrido" in loc_lower

                        if not _keyword_match(f"{title} {company}", keywords):
                            continue

                        jobs.append(JobPosting(
                            title=title,
                            company=company,
                            location=loc,
                            is_remote=is_remote,
                            description=(
                                f"Oferta de empleo en LinkedIn Chile: {title} en {company}. "
                                f"Ubicación: {loc}. Modalidad: {'Remoto' if is_remote else 'Híbrido' if is_hybrid else 'Presencial'}."
                            ),
                            url=url,
                            source="linkedin_chile",
                            tags=[keywords] if keywords else [],
                        ))

                        if len(jobs) >= limit:
                            break

            except Exception as e:
                logger.warning(f"[LinkedIn Chile] Error: {e}")

        logger.info(f"[LinkedIn Chile] Retrieved {len(jobs)} jobs")
        return jobs


# ---------------------------------------------------------------------------
# 3. CompuTrabajo Chile — HTML scraper
# ---------------------------------------------------------------------------

class CompuTrabajoCLScraper(BaseScraper):
    """
    Scrapes CompuTrabajo Chile (cl.computrabajo.com).
    URL pattern: https://cl.computrabajo.com/trabajo?q={keyword}
    Note: Renders HTML server-side; no JS required for listings page.
    """
    BASE_URL = "https://cl.computrabajo.com"

    @property
    def name(self) -> str:
        return "computrabajo"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 15) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        kw = keywords.strip() if keywords else "tecnologia"

        try:
            url = f"{self.BASE_URL}/trabajo"
            params = {"q": kw}
            if not remote_only:
                params["l"] = "chile"

            with httpx.Client(timeout=14.0, headers=_BROWSER_HEADERS, follow_redirects=True) as client:
                resp = client.get(url, params=params)

                if resp.status_code == 403:
                    logger.warning("[CompuTrabajo] Blocked (403). Skipping.")
                    return jobs
                if resp.status_code != 200:
                    logger.warning(f"[CompuTrabajo] HTTP {resp.status_code}")
                    return jobs

                soup = BeautifulSoup(resp.text, "html.parser")

                # Job cards can appear in different containers
                cards = (
                    soup.find_all("article", class_=lambda c: c and "box_offer" in c)
                    or soup.find_all("div", class_=lambda c: c and "bRS" in (c or ""))
                    or soup.select("div[data-id]")
                )

                if not cards:
                    # Fallback: look for any element with job title link pattern
                    cards = soup.find_all("a", href=re.compile(r"/oferta-de-trabajo/"))

                for card in cards[:limit]:
                    try:
                        if card.name == "a":
                            # Fallback mode: the card IS the link
                            title = card.get_text(strip=True)
                            href = card.get("href", "")
                            job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href
                            company = "Empresa en CompuTrabajo"
                            loc = "Chile"
                        else:
                            title_el = (
                                card.find("h2")
                                or card.find("a", class_=re.compile(r"js-job-link|offer_title"))
                                or card.find("a", href=re.compile(r"/oferta-de-trabajo/"))
                            )
                            if not title_el:
                                continue
                            title = title_el.get_text(strip=True)
                            href = title_el.get("href", "")
                            job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href

                            company_el = (
                                card.find("a", class_=re.compile(r"company|empresa"))
                                or card.find("p", class_=re.compile(r"fs16|company"))
                            )
                            company = company_el.get_text(strip=True) if company_el else "Empresa Confidencial"

                            loc_el = card.find("span", class_=re.compile(r"d-block|location|loc"))
                            loc = loc_el.get_text(strip=True) if loc_el else "Chile"

                        if not title:
                            continue

                        is_remote = any(
                            k in f"{title} {loc}".lower()
                            for k in ["remoto", "remote", "teletrabajo", "work from home"]
                        )

                        if remote_only and not is_remote:
                            continue

                        if not _keyword_match(title, keywords):
                            continue

                        jobs.append(JobPosting(
                            title=title,
                            company=company,
                            location=loc,
                            is_remote=is_remote,
                            description=f"Oferta de trabajo en CompuTrabajo Chile: {title} en {company}. Ubicación: {loc}.",
                            url=job_url,
                            source="computrabajo",
                            tags=[keywords] if keywords else [],
                        ))

                        if len(jobs) >= limit:
                            break

                    except Exception as inner_e:
                        logger.debug(f"[CompuTrabajo] Card parse error: {inner_e}")
                        continue

        except Exception as e:
            logger.warning(f"[CompuTrabajo] Error: {e}")

        logger.info(f"[CompuTrabajo] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# 4. ChileTrabajos — HTML scraper (paginado)
# ---------------------------------------------------------------------------

class ChileTrabajosСraper(BaseScraper):
    """
    Scrapes chiletrabajos.cl.
    Since it doesn't have a public API, uses HTML scraping on its search page.
    """
    BASE_URL = "https://www.chiletrabajos.cl"

    @property
    def name(self) -> str:
        return "chiletrabajos"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 15) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        kw = keywords.strip() if keywords else ""

        try:
            # ChileTrabajos search URL structure
            search_url = f"{self.BASE_URL}/empleos"
            params = {}
            if kw:
                params["buscar"] = kw
            if remote_only:
                params["tipo_jornada"] = "teletrabajo"

            with httpx.Client(timeout=14.0, headers=_BROWSER_HEADERS, follow_redirects=True) as client:
                resp = client.get(search_url, params=params)

                if resp.status_code == 403:
                    logger.warning("[ChileTrabajos] Blocked (403). Trying alternate URL...")
                    # Try alternate URL format
                    resp = client.get(f"{self.BASE_URL}/buscar-empleo", params=params)

                if resp.status_code != 200:
                    logger.warning(f"[ChileTrabajos] HTTP {resp.status_code}")
                    return jobs

                soup = BeautifulSoup(resp.text, "html.parser")

                # Multiple possible selectors for job cards
                cards = (
                    soup.find_all("div", class_=lambda c: c and "empleo" in (c or "").lower())
                    or soup.find_all("article")
                    or soup.find_all("div", class_=lambda c: c and "job" in (c or "").lower())
                )

                if not cards:
                    # Deep fallback: any link with common job URL patterns
                    cards = soup.find_all("a", href=re.compile(r"/empleo-|/trabajo-|/oferta-"))

                for card in cards[:limit]:
                    try:
                        if card.name == "a":
                            title = card.get_text(strip=True)
                            href = card.get("href", "")
                            job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href
                            company = "Empresa en ChileTrabajos"
                            loc = "Chile"
                        else:
                            title_el = (
                                card.find("h2")
                                or card.find("h3")
                                or card.find("a", href=re.compile(r"/empleo-|/trabajo-"))
                            )
                            if not title_el:
                                continue
                            title = title_el.get_text(strip=True)
                            href = title_el.get("href", "") if title_el.name == "a" else ""
                            if not href and title_el.find("a"):
                                href = title_el.find("a").get("href", "")
                            job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href

                            company_el = card.find(class_=re.compile(r"empresa|company"))
                            company = company_el.get_text(strip=True) if company_el else "Empresa en ChileTrabajos"

                            loc_el = card.find(class_=re.compile(r"ciudad|region|location|lugar"))
                            loc = loc_el.get_text(strip=True) if loc_el else "Chile"

                        if not title:
                            continue

                        is_remote = any(
                            k in f"{title} {loc}".lower()
                            for k in ["remoto", "teletrabajo", "remote", "work from home"]
                        )

                        if remote_only and not is_remote:
                            continue

                        if not _keyword_match(title, keywords):
                            continue

                        jobs.append(JobPosting(
                            title=title,
                            company=company,
                            location=loc,
                            is_remote=is_remote,
                            description=f"Oferta de empleo en ChileTrabajos: {title} en {company}. Ubicación: {loc}.",
                            url=job_url,
                            source="chiletrabajos",
                            tags=[keywords] if keywords else [],
                        ))

                        if len(jobs) >= limit:
                            break

                    except Exception as inner_e:
                        logger.debug(f"[ChileTrabajos] Card parse error: {inner_e}")
                        continue

        except Exception as e:
            logger.warning(f"[ChileTrabajos] Error: {e}")

        logger.info(f"[ChileTrabajos] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# 5. Laborum.cl — HTML scraper
# ---------------------------------------------------------------------------

class LaborumScraper(BaseScraper):
    """
    Scrapes laborum.cl — major Chilean job portal.
    URL pattern: https://www.laborum.cl/buscar?q={keyword}
    """
    BASE_URL = "https://www.laborum.cl"

    @property
    def name(self) -> str:
        return "laborum"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 15) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        kw = keywords.strip() if keywords else ""

        try:
            params = {}
            if kw:
                params["q"] = kw
            if remote_only:
                params["modalidad"] = "teletrabajo"

            with httpx.Client(timeout=14.0, headers=_BROWSER_HEADERS, follow_redirects=True) as client:
                resp = client.get(f"{self.BASE_URL}/buscar", params=params)

                if resp.status_code == 403:
                    logger.warning("[Laborum] Blocked (403). Skipping.")
                    return jobs
                if resp.status_code != 200:
                    logger.warning(f"[Laborum] HTTP {resp.status_code}")
                    return jobs

                soup = BeautifulSoup(resp.text, "html.parser")

                # Job card selectors
                cards = (
                    soup.find_all("article")
                    or soup.find_all("div", class_=lambda c: c and "aviso" in (c or "").lower())
                    or soup.find_all("div", class_=lambda c: c and "job-item" in (c or "").lower())
                )

                if not cards:
                    cards = soup.find_all("a", href=re.compile(r"/empleos/|/aviso/|/trabajo/"))

                for card in cards[:limit]:
                    try:
                        if card.name == "a":
                            title = card.get_text(strip=True)
                            href = card.get("href", "")
                            job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href
                            company = "Empresa en Laborum"
                            loc = "Chile"
                        else:
                            title_el = (
                                card.find("h2")
                                or card.find("h3")
                                or card.find("a", href=re.compile(r"/empleos/|/aviso/"))
                            )
                            if not title_el:
                                continue

                            title = title_el.get_text(strip=True)
                            href = title_el.get("href", "") if title_el.name == "a" else ""
                            if not href and title_el.find("a"):
                                href = title_el.find("a").get("href", "")
                            job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href

                            company_el = card.find(class_=re.compile(r"empresa|company|org"))
                            company = company_el.get_text(strip=True) if company_el else "Empresa Confidencial"

                            loc_el = card.find(class_=re.compile(r"ciudad|location|lugar|region"))
                            loc = loc_el.get_text(strip=True) if loc_el else "Chile"

                        if not title:
                            continue

                        is_remote = any(
                            k in f"{title} {loc}".lower()
                            for k in ["remoto", "teletrabajo", "remote", "work from home"]
                        )

                        if remote_only and not is_remote:
                            continue

                        if not _keyword_match(title, keywords):
                            continue

                        jobs.append(JobPosting(
                            title=title,
                            company=company,
                            location=loc,
                            is_remote=is_remote,
                            description=f"Oferta de empleo en Laborum Chile: {title} en {company}. Ubicación: {loc}.",
                            url=job_url,
                            source="laborum",
                            tags=[keywords] if keywords else [],
                        ))

                        if len(jobs) >= limit:
                            break

                    except Exception as inner_e:
                        logger.debug(f"[Laborum] Card parse error: {inner_e}")
                        continue

        except Exception as e:
            logger.warning(f"[Laborum] Error: {e}")

        logger.info(f"[Laborum] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# Unified Chile Scraper — combines all Chilean portals
# ---------------------------------------------------------------------------

class ChilePortalsScraper(BaseScraper):
    """
    Aggregator that queries all Chilean portals in sequence.
    Sources used:
      - GetOnBoard (API oficial, alta confianza)
      - LinkedIn Chile (presencial + híbrido + remoto en Chile)
      - CompuTrabajo Chile (HTML)
      - ChileTrabajos (HTML)
      - Laborum (HTML)
    """

    @property
    def name(self) -> str:
        return "chile_portals"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 40) -> List[JobPosting]:
        all_jobs: List[JobPosting] = []
        per_source = max(8, limit // 5)

        scrapers = [
            GetOnBoardScraper(),
            LinkedInChileScraper(),
            CompuTrabajoCLScraper(),
            ChileTrabajosСraper(),
            LaborumScraper(),
        ]

        for scraper in scrapers:
            try:
                logger.info(f"[ChilePortals] Querying {scraper.name}...")
                source_jobs = scraper.search(
                    keywords=keywords,
                    remote_only=remote_only,
                    limit=per_source
                )
                all_jobs.extend(source_jobs)
                # Gentle rate limit between portals
                time.sleep(0.8)
            except Exception as e:
                logger.warning(f"[ChilePortals] Source {scraper.name} failed: {e}")

        logger.info(f"[ChilePortals] Total collected: {len(all_jobs)} jobs")
        return all_jobs[:limit]
