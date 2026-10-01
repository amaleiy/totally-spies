from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, Optional
from pydantic import BaseModel

class ProbeResult(BaseModel):
    platform: str
    url: str
    is_match: bool
    status_code: Optional[int] = None
    response_time: Optional[float] = None
    metadata: Dict[str, Any] = {}
    error: Optional[str] = None

class BaseScannerModule(ABC):
    """Abstract base class for all Totally Spies intelligence modules."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Module identifier (e.g. 'clover', 'sam', 'alex')."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Module human-readable description."""
        pass

    @abstractmethod
    async def run(
        self,
        target_value: str,
        config: Dict[str, Any]
    ) -> AsyncGenerator[ProbeResult, None]:
        """Execute scan and yield ProbeResult items in real time."""
        pass
