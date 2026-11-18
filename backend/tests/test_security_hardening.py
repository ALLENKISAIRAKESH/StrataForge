import io
from backend.app.core.rate_limiter import TokenBucket
from backend.app.core.security_validator import validate_zip_magic_bytes


def test_security_headers_present(client):
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Strict-Transport-Security" in headers
    assert "Referrer-Policy" in headers


def test_magic_bytes_validation_rejects_fake_zip(client, user_a_headers):
    # Setup workspace and project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Sec WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Fake Zip App"},
    ).json()

    # Upload malicious binary disguised as zip
    fake_zip_bytes = b"MZ\x90\x00\x03\x00\x00\x00not-a-real-zip-archive-payload"
    res = client.post(
        f"/api/v1/projects/{proj['id']}/upload",
        headers=user_a_headers,
        files={"file": ("malicious.zip", io.BytesIO(fake_zip_bytes), "application/zip")},
    )
    assert res.status_code == 400
    assert "Invalid file signature" in res.json()["detail"]


def test_token_bucket_unit_logic():
    bucket = TokenBucket(capacity=3.0, refill_rate=0.0)

    # First 3 should succeed
    assert bucket.consume(1.0)[0] is True
    assert bucket.consume(1.0)[0] is True
    assert bucket.consume(1.0)[0] is True

    # 4th should be denied
    allowed, retry_after = bucket.consume(1.0)
    assert allowed is False
    assert retry_after >= 1.0


def test_health_probes_always_succeed(client):
    for _ in range(10):
        res = client.get("/health")
        assert res.status_code == 200
        api_res = client.get("/api/v1/health")
        assert api_res.status_code == 200
