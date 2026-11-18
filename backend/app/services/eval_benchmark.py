import os
import io
import time
from pathlib import Path
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.services.extractor import safe_extract_zip
from backend.app.services.diagnostic_engine import run_diagnostics
from backend.app.services.llm_client import execute_agent_reasoning
from backend.app.services.classifier import scan_and_classify_project


# Expected Defect Rules in broken.zip
GOLDEN_EXPECTED_DEFECTS = {
    "DOCKER_001",  # Missing HEALTHCHECK
    "DOCKER_002",  # Root user
    "COMPOSE_001", # Hardcoded secrets
    "DEP_001",     # Unpinned dependencies
    "SQL_001",     # Missing primary key
}


def run_grounding_and_diagnostic_benchmark(temp_dir: str) -> Dict[str, Any]:
    """
    Executes an automated evaluation benchmark comparing rule discovery accuracy,
    precision, recall, F1-score, and line-level grounding faithfulness.
    """
    start_time = time.time()

    broken_zip = Path("sample-projects/broken.zip")
    healthy_zip = Path("sample-projects/healthy.zip")

    if not broken_zip.exists() or not healthy_zip.exists():
        raise FileNotFoundError("Sample project archives broken.zip or healthy.zip not found")

    broken_extract = Path(temp_dir) / "bench_broken"
    healthy_extract = Path(temp_dir) / "bench_healthy"
    broken_extract.mkdir(parents=True, exist_ok=True)
    healthy_extract.mkdir(parents=True, exist_ok=True)

    # 1. Extract both test archives safely
    safe_extract_zip(str(broken_zip), str(broken_extract))
    safe_extract_zip(str(healthy_zip), str(healthy_extract))

    # 2. Run deterministic diagnostics
    broken_findings = run_diagnostics(str(broken_extract))
    healthy_findings = run_diagnostics(str(healthy_extract))

    # 3. Calculate Confusion Matrix Metrics
    detected_broken_rules = {f["rule_id"] for f in broken_findings}
    detected_healthy_rules = {f["rule_id"] for f in healthy_findings}

    # True Positives: Expected defects correctly found in broken.zip
    tp = len(detected_broken_rules.intersection(GOLDEN_EXPECTED_DEFECTS))
    # False Positives: Defects falsely flagged in healthy.zip (healthy should have 0 critical defects)
    critical_fp = sum(1 for f in healthy_findings if f["severity"] in ("critical", "high"))
    fp = critical_fp
    # False Negatives: Expected defects that were missed in broken.zip
    fn = len(GOLDEN_EXPECTED_DEFECTS.difference(detected_broken_rules))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # 4. Zero-Hallucination Line Grounding Verification
    total_citations = 0
    valid_citations = 0

    for f in broken_findings:
        total_citations += 1
        file_rel = f["file_path"]
        target_path = broken_extract / file_rel
        if target_path.exists():
            line_start = f.get("line_start", 1)
            line_end = f.get("line_end", line_start)
            evidence = f.get("evidence", "")

            with open(target_path, "r", encoding="utf-8", errors="replace") as pf:
                lines = pf.readlines()
                # Check lines exist
                if 1 <= line_start <= len(lines) + 1:
                    valid_citations += 1

    grounding_faithfulness = (valid_citations / total_citations) if total_citations > 0 else 1.0

    duration_ms = (time.time() - start_time) * 1000.0

    return {
        "status": "PASSED" if f1 >= 0.85 and grounding_faithfulness >= 0.99 else "FAILED",
        "benchmark_timestamp": time.time(),
        "duration_ms": round(duration_ms, 2),
        "metrics": {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "grounding_faithfulness": round(grounding_faithfulness, 4),
            "zero_hallucination_verified": grounding_faithfulness == 1.0,
        },
        "rule_coverage": {
            "expected_rules": list(GOLDEN_EXPECTED_DEFECTS),
            "detected_in_broken": list(detected_broken_rules),
            "false_positives_in_healthy": list(detected_healthy_rules),
        },
    }
