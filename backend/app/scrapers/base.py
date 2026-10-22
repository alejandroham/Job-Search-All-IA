from abc import ABC, abstractmethod
from typing import List
from app.models.schemas import JobPosting

class BaseScraper(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def search(self, keywords: str, remote_only: bool = True, limit: int = 20) -> List[JobPosting]:
        pass
