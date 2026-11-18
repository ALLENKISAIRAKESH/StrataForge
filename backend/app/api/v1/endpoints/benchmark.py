import tempfile
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User
from backend.app.services.eval_benchmark import run_grounding_and_diagnostic_benchmark

router = APIRouter()

# In-memory cached latest benchmark
_latest_benchmark: Optional[Dict[str, Any]] = None


@router.post("/benchmarks/run", status_code=status.HTTP_200_OK)
def trigger_benchmark_run(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Executes automated evaluation benchmark comparing rule discovery accuracy,
    precision, recall, F1-score, and line-level zero-hallucination grounding.
    """
    global _latest_benchmark
    with tempfile.TemporaryDirectory() as temp_dir:
        result = run_grounding_and_diagnostic_benchmark(temp_dir)
        _latest_benchmark = result
        return result


@router.get("/benchmarks/latest", status_code=status.HTTP_200_OK)
def get_latest_benchmark(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the most recent automated evaluation benchmark results."""
    global _latest_benchmark
    if not _latest_benchmark:
        with tempfile.TemporaryDirectory() as temp_dir:
            _latest_benchmark = run_grounding_and_diagnostic_benchmark(temp_dir)
    return _latest_benchmark
