import httpx
import logging
from typing import List
from app.models.schemas import JobPosting
from app.scrapers.base import BaseScraper
import re

logger = logging.getLogger(__name__)

class RemoteBoardsScraper(BaseScraper):
    @property
    def name(self) -> str:
        return "remote_boards_aggregator"

    def search(self, keywords: str = "", remote_only: bool = True, limit: int = 30) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        kw_lower = keywords.lower() if keywords else ""

        # 1. Arbeitnow API (Very reliable, JSON API, no auth required)
        try:
            url = "https://www.arbeitnow.com/api/job-board-api"
            with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    for item in data:
                        title = item.get("title", "")
                        desc = item.get("description", "")
                        clean_desc = re.sub(r'<[^>]+>', ' ', desc)
                        is_remote = item.get("remote", False) or "remote" in title.lower() or "remoto" in title.lower()
                        
                        if remote_only and not is_remote:
                            continue

                        if kw_lower and (kw_lower not in title.lower() and kw_lower not in clean_desc.lower() and kw_lower not in " ".join(item.get("tags", [])).lower()):
                            continue

                        jobs.append(JobPosting(
                            title=title,
                            company=item.get("company_name", "Empresa Confidencial"),
                            location=item.get("location", "Remote"),
                            is_remote=is_remote,
                            description=clean_desc[:4000],
                            url=item.get("url"),
                            source="arbeitnow",
                            tags=item.get("tags", []),
                            posted_at=str(item.get("created_at", ""))
                        ))
                        if len(jobs) >= limit:
                            break
        except Exception as e:
            logger.warning(f"Error fetching from Arbeitnow: {e}")

        # 2. Remotive API (High quality global remote tech jobs)
        if len(jobs) < limit:
            try:
                url = "https://remotive.com/api/remote-jobs"
                with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                    resp = client.get(url, params={"limit": 25})
                    if resp.status_code == 200:
                        data = resp.json().get("jobs", [])
                        for item in data:
                            title = item.get("title", "")
                            desc = item.get("description", "")
                            clean_desc = re.sub(r'<[^>]+>', ' ', desc)
                            salary = item.get("salary", "")

                            if kw_lower and (kw_lower not in title.lower() and kw_lower not in clean_desc.lower() and kw_lower not in " ".join(item.get("tags", [])).lower()):
                                continue

                            jobs.append(JobPosting(
                                title=title,
                                company=item.get("company_name", "Empresa"),
                                location=item.get("candidate_required_location", "Worldwide Remote"),
                                is_remote=True,
                                salary_range=salary if salary else None,
                                description=clean_desc[:4000],
                                url=item.get("url"),
                                source="remotive",
                                tags=item.get("tags", []),
                                posted_at=str(item.get("publication_date", ""))
                            ))
                            if len(jobs) >= limit:
                                break
            except Exception as e:
                logger.warning(f"Error fetching from Remotive: {e}")

        # 3. RemoteOK API
        if len(jobs) < limit:
            try:
                url = "https://remoteok.com/api"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                with httpx.Client(timeout=10.0, headers=headers, follow_redirects=True) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        # RemoteOK returns a legal notice as the first item
                        items = [item for item in data if isinstance(item, dict) and "id" in item]
                        for item in items:
                            title = item.get("position", "")
                            desc = item.get("description", "")
                            clean_desc = re.sub(r'<[^>]+>', ' ', desc)
                            salary = item.get("salary", "")
                            
                            if kw_lower and (kw_lower not in title.lower() and kw_lower not in clean_desc.lower() and kw_lower not in " ".join(item.get("tags", [])).lower()):
                                continue

                            jobs.append(JobPosting(
                                title=title,
                                company=item.get("company", "Empresa"),
                                location=item.get("location", "Remote"),
                                is_remote=True,
                                salary_range=salary if salary else None,
                                description=clean_desc[:4000],
                                url=item.get("url"),
                                source="remoteok",
                                tags=item.get("tags", []),
                                posted_at=str(item.get("date", ""))
                            ))
                            if len(jobs) >= limit:
                                break
            except Exception as e:
                logger.warning(f"Error fetching from RemoteOK: {e}")

        return jobs
