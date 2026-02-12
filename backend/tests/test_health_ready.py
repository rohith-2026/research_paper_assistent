from fastapi.testclient import TestClient

from app.main import app


def test_healthz_ready_shape():
    client = TestClient(app)
    resp = client.get("/healthz/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "app" in data
    assert "db" in data
    assert "gemini" in data
