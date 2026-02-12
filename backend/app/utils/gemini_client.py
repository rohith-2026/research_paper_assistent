import os
import logging
import httpx
from app.core.config import settings


class GeminiClient:
    def __init__(
        self,
        model_env: str = "GEMINI_MODEL",
        default_model: str = "gemini-2.5-flash-lite",
        timeout_s: float = 60.0,
    ):
        self.api_base = (
            (settings.GEMINI_API_BASE or "").strip()
            or os.getenv("GEMINI_API_BASE", "").strip()
            or "https://generativelanguage.googleapis.com/v1beta"
        ).rstrip("/")
        self.api_key = (
            (settings.GEMINI_API_KEY or "").strip()
            or os.getenv("GEMINI_API_KEY", "").strip()
        )
        self.model = (
            (settings.GEMINI_MODEL or "").strip()
            if model_env == "GEMINI_MODEL"
            else (settings.GEMINI_SUMMARY_MODEL or "").strip()
        ) or os.getenv(model_env, default_model).strip()
        self.timeout_s = float(timeout_s)
        self._logger = logging.getLogger(__name__)
        self._reported_ok = False

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        fallback_text: str = "",
    ) -> str:
        if not self.api_key:
            self._logger.warning("GEMINI_API_KEY is not configured.")
            return fallback_text
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {"temperature": float(temperature)},
        }
        url = f"{self.api_base}/models/{self.model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                resp = await client.post(url, params={"key": self.api_key}, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = self._extract_text(data)
                if not self._reported_ok:
                    self._logger.info(
                        "Gemini API reachable | Model: %s | Base: %s",
                        self.model,
                        self.api_base,
                    )
                    self._reported_ok = True
                return text or fallback_text
        except Exception:
            return fallback_text

    def _extract_text(self, data: dict) -> str:
        candidates = data.get("candidates") or []
        for c in candidates:
            content = c.get("content") or {}
            parts = content.get("parts") or []
            for p in parts:
                text = p.get("text")
                if text:
                    return str(text).strip()
        return ""
