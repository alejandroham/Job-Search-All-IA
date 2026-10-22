import httpx
import logging
from bs4 import BeautifulSoup
from typing import List
from app.models.schemas import JobPosting
from app.scrapers.base import BaseScraper
import urllib.parse

logger = logging.getLogger(__name__)

class LinkedInGuestScraper(BaseScraper):
    @property
    def name(self) -> str:
        return "linkedin_guest"

    def search(self, keywords: str = "Software Engineer", remote_only: bool = True, limit: int = 15) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        base_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        
        params = {
            "keywords": keywords,
            "location": "Worldwide" if remote_only else "",
            "start": 0
        }
        if remote_only:
            # f_WT=2 corresponds to Remote on LinkedIn
            params["f_WT"] = "2"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8"
        }

        try:
            with httpx.Client(timeout=10.0, headers=headers, follow_redirects=True) as client:
                resp = client.get(base_url, params=params)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    job_cards = soup.find_all("li")
                    for card in job_cards:
                        title_el = card.find("h3", class_="base-search-card__title")
                        company_el = card.find("h4", class_="base-search-card__subtitle")
                        loc_el = card.find("span", class_="job-search-card__location")
                        link_el = card.find("a", class_="base-card__full-link")

                        if title_el and company_el:
                            title = title_el.get_text(strip=True)
                            company = company_el.get_text(strip=True)
                            loc = loc_el.get_text(strip=True) if loc_el else "Remote"
                            link = link_el["href"] if link_el and "href" in link_el.attrs else ""

                            # Clean link tracking
                            if link and "?" in link:
                                link = link.split("?")[0]

                            jobs.append(JobPosting(
                                title=title,
                                company=company,
                                location=loc,
                                is_remote=True,
                                description=f"Oportunidad laboral en {company} para el rol de {title}. Ubicación: {loc}.",
                                url=link,
                                source="linkedin",
                                tags=[keywords]
                            ))
                            if len(jobs) >= limit:
                                break
        except Exception as e:
            logger.warning(f"Error fetching from LinkedIn guest scraper: {e}")

        return jobs
