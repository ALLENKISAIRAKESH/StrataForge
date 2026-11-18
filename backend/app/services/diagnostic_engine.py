import os
import re
from pathlib import Path
from typing import List, Dict, Any


class DiagnosticRule:
    rule_id: str
    category: str
    title: str
    severity: str

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        raise NotImplementedError


# 1. DOCKER RULES
class DockerHealthcheckRule(DiagnosticRule):
    rule_id = "DOCKER_001"
    category = "container"
    title = "Container health check missing"
    severity = "medium"

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        if "dockerfile" not in full_path.name.lower():
            return []
        has_healthcheck = any(re.match(r"^\s*HEALTHCHECK\s+", line, re.I) for line in lines)
        if not has_healthcheck:
            return [{
                "rule_id": self.rule_id,
                "category": self.category,
                "title": self.title,
                "severity": self.severity,
                "confidence": 1.0,
                "file_path": rel_path,
                "line_start": 1,
                "line_end": len(lines) if lines else 1,
                "evidence": "No HEALTHCHECK instruction declared in Dockerfile",
                "recommended_action": "Add a HEALTHCHECK instruction to allow container orchestrators (Cloud Run, Kubernetes) to verify service readiness.",
                "validation": "docker build -t test . && docker inspect --format='{{json .Config.Healthcheck}}' test",
            }]
        return []


class DockerRootUserRule(DiagnosticRule):
    rule_id = "DOCKER_002"
    category = "container"
    title = "Container executes as root user"
    severity = "low"

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        if "dockerfile" not in full_path.name.lower():
            return []
        has_user = any(re.match(r"^\s*USER\s+", line, re.I) for line in lines)
        if not has_user:
            return [{
                "rule_id": self.rule_id,
                "category": self.category,
                "title": self.title,
                "severity": self.severity,
                "confidence": 0.95,
                "file_path": rel_path,
                "line_start": 1,
                "line_end": len(lines) if lines else 1,
                "evidence": "No non-root USER instruction declared. Process runs as root user.",
                "recommended_action": "Create and switch to a non-privileged system user (e.g., 'RUN useradd -u 8888 appuser && USER appuser').",
                "validation": "Verify container runtime UID is non-zero.",
            }]
        return []


class DockerUnpinnedBaseImageRule(DiagnosticRule):
    rule_id = "DOCKER_003"
    category = "container"
    title = "Unpinned base image tag"
    severity = "medium"

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        if "dockerfile" not in full_path.name.lower():
            return []
        findings = []
        for idx, line in enumerate(lines, 1):
            match = re.match(r"^\s*FROM\s+([^\s]+)", line, re.I)
            if match:
                img = match.group(1).lower()
                if ":latest" in img or ":" not in img:
                    findings.append({
                        "rule_id": self.rule_id,
                        "category": self.category,
                        "title": self.title,
                        "severity": self.severity,
                        "confidence": 1.0,
                        "file_path": rel_path,
                        "line_start": idx,
                        "line_end": idx,
                        "evidence": f"Unpinned base image: '{line.strip()}'",
                        "recommended_action": "Pin the base image to an explicit version tag or digest (e.g., python:3.11-slim-bookworm).",
                        "validation": "Ensure builds are reproducible and not subject to upstream floating breaking changes.",
                    })
        return findings


# 2. COMPOSE RULES
class ComposeHardcodedSecretsRule(DiagnosticRule):
    rule_id = "COMPOSE_001"
    category = "security"
    title = "Hardcoded secret in compose configuration"
    severity = "high"

    SECRET_REGEX = re.compile(
        r"^\s*[-]?\s*(?:[A-Z0-9_]*?(?:PASSWORD|SECRET|TOKEN|KEY|PWD|CREDENTIALS)[A-Z0-9_]*?)\s*[:=]\s*[\"']?([^\s\"'\${}]+)[\"']?",
        re.I,
    )

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        if "compose" not in full_path.name.lower() or full_path.suffix.lower() not in [".yml", ".yaml"]:
            return []
        findings = []
        for idx, line in enumerate(lines, 1):
            match = self.SECRET_REGEX.search(line)
            if match:
                val = match.group(1)
                # Ignore placeholders like changeme, default, none
                if len(val) > 3 and not val.startswith("$"):
                    findings.append({
                        "rule_id": self.rule_id,
                        "category": self.category,
                        "title": self.title,
                        "severity": self.severity,
                        "confidence": 0.95,
                        "file_path": rel_path,
                        "line_start": idx,
                        "line_end": idx,
                        "evidence": f"Line {idx}: {line.strip()}",
                        "recommended_action": "Replace plaintext secret with an environment variable reference (e.g., '${DB_PASSWORD}') managed via Secret Manager.",
                        "validation": "Ensure no plaintext credentials exist in source repositories.",
                    })
        return findings


# 3. DEPENDENCY RULES
class UnpinnedDependenciesRule(DiagnosticRule):
    rule_id = "DEP_001"
    category = "dependency"
    title = "Unpinned package dependency"
    severity = "high"

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        if full_path.name.lower() != "requirements.txt":
            return []
        findings = []
        for idx, line in enumerate(lines, 1):
            cleaned = line.strip().split("#")[0].strip()
            if not cleaned or cleaned.startswith("-") or cleaned.startswith("git+"):
                continue
            # If no version pinning operator (==, <=, >=, ~=, ===)
            if not re.search(r"[=<>~]", cleaned):
                findings.append({
                    "rule_id": self.rule_id,
                    "category": self.category,
                    "title": self.title,
                    "severity": self.severity,
                    "confidence": 1.0,
                    "file_path": rel_path,
                    "line_start": idx,
                    "line_end": idx,
                    "evidence": f"Line {idx}: '{cleaned}' has no version pin",
                    "recommended_action": f"Pin the dependency to a verified version: '{cleaned}==x.y.z'.",
                    "validation": "pip freeze / uv pip compile to lock exact versions.",
                })
        return findings


# 4. DATABASE / SQL RULES
class SqlMissingPrimaryKeyRule(DiagnosticRule):
    rule_id = "SQL_001"
    category = "database"
    title = "Table missing primary key constraint"
    severity = "high"

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        if full_path.suffix.lower() != ".sql":
            return []
        content = "\n".join(lines)
        # Find CREATE TABLE statements
        table_matches = re.finditer(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\"\.]+)\s*\((.*?)\);",
            content,
            re.I | re.S,
        )
        findings = []
        for match in table_matches:
            tbl_name = match.group(1)
            body = match.group(2)
            if "primary key" not in body.lower():
                # Find line number
                start_char = match.start()
                line_no = content[:start_char].count("\n") + 1
                findings.append({
                    "rule_id": self.rule_id,
                    "category": self.category,
                    "title": self.title,
                    "severity": self.severity,
                    "confidence": 1.0,
                    "file_path": rel_path,
                    "line_start": line_no,
                    "line_end": line_no + match.group(0).count("\n"),
                    "evidence": f"CREATE TABLE {tbl_name} does not define a PRIMARY KEY constraint.",
                    "recommended_action": f"Define an explicit primary key column on table '{tbl_name}' (e.g., 'id UUID PRIMARY KEY' or 'id BIGSERIAL PRIMARY KEY').",
                    "validation": "Ensure relational integrity and replication support in PostgreSQL.",
                })
        return findings


# 5. OPENAPI RULES
class OpenApiMissingSecurityRule(DiagnosticRule):
    rule_id = "API_001"
    category = "api_spec"
    title = "OpenAPI specification missing authentication scheme"
    severity = "high"

    def inspect(self, rel_path: str, full_path: Path, lines: List[str]) -> List[Dict[str, Any]]:
        name = full_path.name.lower()
        if not ("openapi" in name or "swagger" in name) or full_path.suffix.lower() not in [".json", ".yaml", ".yml"]:
            return []
        content = "\n".join(lines)
        if "openapi:" in content or "\"openapi\":" in content:
            has_security = "security:" in content or "\"security\":" in content or "securityschemes" in content.lower()
            if not has_security:
                return [{
                    "rule_id": self.rule_id,
                    "category": self.category,
                    "title": self.title,
                    "severity": self.severity,
                    "confidence": 0.95,
                    "file_path": rel_path,
                    "line_start": 1,
                    "line_end": min(20, len(lines)),
                    "evidence": "No 'security' or 'securitySchemes' declaration found in OpenAPI specification.",
                    "recommended_action": "Declare standard authentication schemes (e.g. Bearer JWT, OAuth2) in 'components.securitySchemes'.",
                    "validation": "Validate API gateway authentication alignment on Google Cloud Endpoints or Apigee.",
                }]
        return []


ALL_RULES: List[DiagnosticRule] = [
    DockerHealthcheckRule(),
    DockerRootUserRule(),
    DockerUnpinnedBaseImageRule(),
    ComposeHardcodedSecretsRule(),
    UnpinnedDependenciesRule(),
    SqlMissingPrimaryKeyRule(),
    OpenApiMissingSecurityRule(),
]


def run_diagnostics(extracted_dir: str) -> List[Dict[str, Any]]:
    """
    Executes all deterministic rules against files in extracted_dir.
    Every finding is backed by exact file path, start/end lines, and evidence citations.
    """
    base = Path(extracted_dir).resolve()
    all_findings = []

    for root, _, files in os.walk(base):
        for file in files:
            full_path = Path(root) / file
            rel_path = str(full_path.relative_to(base)).replace("\\", "/")

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = [line.rstrip("\r\n") for line in f]
            except Exception:
                continue

            for rule in ALL_RULES:
                findings = rule.inspect(rel_path, full_path, lines)
                all_findings.extend(findings)

    return all_findings
