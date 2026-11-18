def test_benchmark_execution_and_metrics(client, user_a_headers):
    res = client.post("/api/v1/benchmarks/run", headers=user_a_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "PASSED"
    metrics = data["metrics"]

    assert metrics["precision"] >= 0.80
    assert metrics["recall"] >= 0.80
    assert metrics["f1_score"] >= 0.80
    assert metrics["grounding_faithfulness"] == 1.0
    assert metrics["zero_hallucination_verified"] is True
    assert metrics["true_positives"] >= 4


def test_get_latest_benchmark(client, user_a_headers):
    res = client.get("/api/v1/benchmarks/latest", headers=user_a_headers)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "rule_coverage" in data


def test_benchmark_unauthorized(client):
    res = client.post("/api/v1/benchmarks/run")
    assert res.status_code == 401
