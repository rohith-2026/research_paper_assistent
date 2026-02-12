import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root_ok():
    res = client.get("/")
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") == "ok"


def test_healthz_ok():
    res = client.get("/healthz")
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") == "ok"


def test_metrics_ok():
    res = client.get("/metrics")
    assert res.status_code == 200
    body = res.json()
    assert "uptime_seconds" in body


def test_protected_requires_auth():
    res = client.get("/notes/paper/000000000000000000000000")
    assert res.status_code in (401, 403)


@pytest.mark.parametrize(
    "method,url",
    [
        ("get", "/analytics/overview"),
        ("get", "/graph/paper/000000000000000000000000"),
        ("post", "/summaries/generate"),
        ("get", "/collections"),
        ("get", "/downloads"),
        ("get", "/feedback"),
        ("get", "/api-usage"),
        ("get", "/chat/sessions"),
    ],
)
def test_protected_endpoints_require_auth(method, url):
    req = getattr(client, method)
    if method == "post":
        res = req(url, json={})
    else:
        res = req(url)
    assert res.status_code in (401, 403)
