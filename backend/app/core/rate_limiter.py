import asyncio
import time
from typing import Dict

class AsyncRateLimiter:
    """Controls concurrency and rate limiting across HTTP scan requests."""
    def __init__(self, max_concurrent: int = 15, delay_between_requests: float = 0.05):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.delay = delay_between_requests
        self._last_call: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def acquire(self, host: str = "global"):
        await self.semaphore.acquire()
        async with self._lock:
            now = time.monotonic()
            last = self._last_call.get(host, 0.0)
            elapsed = now - last
            if elapsed < self.delay:
                await asyncio.sleep(self.delay - elapsed)
            self._last_call[host] = time.monotonic()

    def release(self):
        self.semaphore.release()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.release()
