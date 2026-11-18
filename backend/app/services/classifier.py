import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any

IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".pytest_cache",
    "dist",
    "build",
    ".idea",
    ".vscode",
}


def classify_file(relative_path: str, file_path: Path) -> Tuple[str, str]:
    """
    Returns (category, file_type) based on filename, path and extension.
    Categories:
    - container, orchestration, infrastructure, api_spec, database,
      dependency, source_code, documentation, configuration, unknown
    """
    filename = file_path.name.lower()
    ext = file_path.suffix.lower()

    # Container & Orchestration
    if filename == "dockerfile" or filename.startswith("dockerfile.") or ext == ".dockerfile":
        return "container", "dockerfile"
    if "compose" in filename and (ext in [".yml", ".yaml"]):
        return "orchestration", "compose"
    if filename.endswith(".k8s.yaml") or filename.endswith(".k8s.yml"):
        return "orchestration", "kubernetes"

    # Infrastructure as Code
    if ext in [".tf", ".tfvars"]:
        return "infrastructure", "terraform"

    # API Specs
    if ("openapi" in filename or "swagger" in filename) and ext in [".json", ".yaml", ".yml"]:
        return "api_spec", "openapi"

    # Database
    if ext == ".sql":
        return "database", "sql"

    # Dependencies
    if filename in ["requirements.txt", "pipfile", "pyproject.toml", "setup.py"]:
        return "dependency", "python_manifest"
    if filename in ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"]:
        return "dependency", "nodejs_manifest"
    if filename in ["gemfile", "pom.xml", "build.gradle", "cargo.toml", "go.mod"]:
        return "dependency", "manifest"

    # Source Code
    if ext == ".py":
        return "source_code", "python"
    if ext in [".ts", ".tsx"]:
        return "source_code", "typescript"
    if ext in [".js", ".jsx", ".mjs", ".cjs"]:
        return "source_code", "javascript"
    if ext in [".java", ".kt"]:
        return "source_code", "jvm"
    if ext in [".go"]:
        return "source_code", "golang"
    if ext in [".cpp", ".cc", ".c", ".h", ".hpp"]:
        return "source_code", "cpp"
    if ext == ".rs":
        return "source_code", "rust"

    # Documentation
    if ext in [".md", ".markdown", ".rst", ".txt"] and ("readme" in filename or "doc" in filename or "license" in filename):
        return "documentation", "markdown"

    # Configuration
    if ext in [".json", ".yaml", ".yml", ".toml", ".ini", ".conf"] or filename.startswith(".env"):
        return "configuration", ext.lstrip(".") or "env"

    return "unknown", ext.lstrip(".") or "unknown"


def count_file_lines(file_path: Path) -> int:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def scan_and_classify_project(extracted_dir: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Scans extracted project directory, classifies all files, and detects
    technology stack.
    """
    base = Path(extracted_dir).resolve()
    classified_files = []
    category_counts: Dict[str, int] = {}
    file_type_counts: Dict[str, int] = {}
    total_lines = 0

    detected_languages = set()
    detected_frameworks = set()
    detected_containers = set()
    detected_infrastructure = set()

    for root, dirs, files in os.walk(base):
        # Prune ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

        for file in files:
            full_path = Path(root) / file
            rel_path = str(full_path.relative_to(base)).replace("\\", "/")
            file_size = full_path.stat().st_size
            lines = count_file_lines(full_path)
            total_lines += lines

            category, file_type = classify_file(rel_path, full_path)

            category_counts[category] = category_counts.get(category, 0) + 1
            file_type_counts[file_type] = file_type_counts.get(file_type, 0) + 1

            # Detect stack details
            if file_type == "python":
                detected_languages.add("Python")
            elif file_type == "typescript":
                detected_languages.add("TypeScript")
            elif file_type == "javascript":
                detected_languages.add("JavaScript")
            elif file_type == "sql":
                detected_languages.add("SQL")
            elif file_type == "dockerfile":
                detected_containers.add("Docker")
            elif file_type == "compose":
                detected_containers.add("Docker Compose")
            elif file_type == "terraform":
                detected_infrastructure.add("Terraform")

            # Inspect dependency files for specific frameworks
            if file_type == "python_manifest":
                try:
                    content = full_path.read_text(encoding="utf-8", errors="ignore").lower()
                    if "fastapi" in content:
                        detected_frameworks.add("FastAPI")
                    if "flask" in content:
                        detected_frameworks.add("Flask")
                    if "django" in content:
                        detected_frameworks.add("Django")
                    if "langchain" in content or "langgraph" in content:
                        detected_frameworks.add("LangGraph")
                    if "google-adk" in content or "google-genai" in content:
                        detected_frameworks.add("Google ADK / Gemini")
                    if "sqlalchemy" in content:
                        detected_frameworks.add("SQLAlchemy")
                except Exception:
                    pass

            if file_type == "nodejs_manifest":
                try:
                    content = full_path.read_text(encoding="utf-8", errors="ignore").lower()
                    if "react" in content:
                        detected_frameworks.add("React")
                    if "express" in content:
                        detected_frameworks.add("Express")
                    if "next" in content:
                        detected_frameworks.add("Next.js")
                    if "tailwindcss" in content:
                        detected_frameworks.add("Tailwind CSS")
                except Exception:
                    pass

            classified_files.append({
                "relative_path": rel_path,
                "filename": file,
                "category": category,
                "file_type": file_type,
                "size_bytes": file_size,
                "line_count": lines,
            })

    summary = {
        "total_files": len(classified_files),
        "total_lines": total_lines,
        "category_counts": category_counts,
        "file_type_counts": file_type_counts,
        "detected_languages": sorted(list(detected_languages)),
        "detected_frameworks": sorted(list(detected_frameworks)),
        "detected_containers": sorted(list(detected_containers)),
        "detected_infrastructure": sorted(list(detected_infrastructure)),
    }

    return classified_files, summary
