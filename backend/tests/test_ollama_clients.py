import os
import asyncio
import pytest
from app.core.config import settings

from app.utils.gemini_client import GeminiClient


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        self._payload = kwargs.pop("_payload", {"response": "ok"})

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, json=None, **kwargs):
        return _FakeResponse(self._payload)

    async def get(self, url):
        return _FakeResponse({})


def test_gemini_client_generate(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

    def _client_factory(*args, **kwargs):
        return _FakeAsyncClient(
            _payload={
                "candidates": [
                    {"content": {"parts": [{"text": "answer"}]}}
                ]
            }
        )

    monkeypatch.setattr("app.utils.gemini_client.httpx.AsyncClient", _client_factory)
    async def _run():
        client = GeminiClient()
        return await client.generate(prompt="hello", fallback_text="fallback")
    text = asyncio.run(_run())
    assert text == "answer"


def test_gemini_client_fallback(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    def _client_factory(*args, **kwargs):
        return _FakeAsyncClient(
            _payload={
                "candidates": [
                    {"content": {"parts": [{"text": "summary"}]}}
                ]
            }
        )

    monkeypatch.setattr("app.utils.gemini_client.httpx.AsyncClient", _client_factory)
    async def _run():
        client = GeminiClient()
        return await client.generate(prompt="paper text", fallback_text="fallback")
    text = asyncio.run(_run())
    assert text == "fallback"
