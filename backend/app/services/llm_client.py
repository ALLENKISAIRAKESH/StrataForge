import json
import logging
import time
from typing import Dict, Any, List, Tuple
import httpx

from backend.app.core.config import settings
from backend.app.core.prompts import (
    SYSTEM_GROUNDING_INSTRUCTION,
    AGENT_ROLES,
    build_agent_prompt,
)

logger = logging.getLogger("fde-platform.llm")


def call_gemini_api(
    prompt: str,
    system_instruction: str = SYSTEM_GROUNDING_INSTRUCTION,
    model: str = settings.GEMINI_MODEL,
    api_key: str = settings.GEMINI_API_KEY,
) -> Dict[str, Any]:
    """Invokes Google Gemini v1beta API using structured JSON output mode."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
            "maxOutputTokens": 4096,
        },
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError("Gemini API returned no candidates")

    raw_text = candidates[0]["content"]["parts"][0]["text"]
    return json.loads(raw_text)


def generate_deterministic_grounded_response(
    agent_type: str,
    project_name: str,
    inventory_summary: dict,
    findings: list,
    data_readiness: dict | None,
    custom_instruction: str | None = None,
) -> Dict[str, Any]:
    """
    Deterministic Grounding Engine for local development and offline CI testing.
    Synthesizes real project facts, findings, and metrics with zero hallucination.
    """
    role = AGENT_ROLES.get(agent_type, AGENT_ROLES["discovery"])
    role_title = role["title"]

    thought_chain = []
    citations = []
    structured_data = {}
    md_lines = []

    # Step 1: Ingestion & Inventory Assessment
    thought_chain.append({
        "step_number": 1,
        "thought": f"Initializing {role_title} reasoning for '{project_name}'.",
        "action": "Inspecting repository inventory and detected technology stacks.",
        "observation": (
            f"Detected {inventory_summary.get('total_files', 0)} files ({inventory_summary.get('total_lines', 0)} LOC). "
            f"Frameworks: {', '.join(inventory_summary.get('detected_frameworks', [])) or 'None'}. "
            f"Languages: {', '.join(inventory_summary.get('detected_languages', [])) or 'None'}."
        ),
    })

    # Step 2: Findings Assessment
    critical_or_high = [f for f in findings if f.get("severity") in ["critical", "high"]]
    thought_chain.append({
        "step_number": 2,
        "thought": "Cross-referencing deterministic AST and regex diagnostic findings.",
        "action": f"Analyzing {len(findings)} total findings ({len(critical_or_high)} critical/high).",
        "observation": f"Identified primary bottlenecks: {', '.join(set(f.get('rule_id', '') for f in findings)) or 'None'}.",
    })

    # Collect citations from findings
    for f in findings:
        citations.append({
            "file_path": f.get("file_path", "unknown"),
            "line_start": f.get("line_start"),
            "line_end": f.get("line_end"),
            "quote": f.get("evidence", ""),
        })

    # Step 3: Persona-Specific Synthesis
    if agent_type == "discovery":
        md_lines.append(f"## Architecture & Service Topology: {project_name}")
        md_lines.append(f"**Specialist:** Google Cloud FDE — {role_title}")
        md_lines.append("")
        md_lines.append("### 1. Technology Stack Analysis")
        md_lines.append(f"- **Languages:** {', '.join(inventory_summary.get('detected_languages', [])) or 'None detected'}")
        md_lines.append(f"- **Frameworks:** {', '.join(inventory_summary.get('detected_frameworks', [])) or 'None detected'}")
        md_lines.append(f"- **Infrastructure:** {', '.join(inventory_summary.get('detected_infrastructure', [])) or 'None detected'}")
        md_lines.append(f"- **Total Discovered Files:** {inventory_summary.get('total_files', 0)}")
        md_lines.append("")
        md_lines.append("### 2. Service Architecture")
        md_lines.append("The project manifests a microservice architecture ready for containerization. Key configuration elements have been identified across container and application tiers.")
        structured_data = {
            "service_type": "Microservice",
            "detected_stacks": inventory_summary.get("detected_frameworks", []),
            "total_files": inventory_summary.get("total_files", 0),
        }

    elif agent_type == "security":
        md_lines.append(f"## Security & Static Diagnostic Review: {project_name}")
        md_lines.append(f"**Specialist:** Google Cloud FDE — {role_title}")
        md_lines.append("")
        if not findings:
            md_lines.append("### ✅ Zero Security Defects Detected")
            md_lines.append("All deterministic container and dependency security checks passed.")
        else:
            md_lines.append(f"### ⚠️ Identified {len(findings)} Security & Configuration Issues")
            for idx, f in enumerate(findings, 1):
                md_lines.append(f"#### {idx}. [{f.get('rule_id')}] {f.get('title')} ({f.get('severity', '').upper()})")
                md_lines.append(f"- **Target File:** `{f.get('file_path')}:{f.get('line_start')}`")
                md_lines.append(f"- **Root Cause Analysis:** {f.get('recommended_action')}")
                md_lines.append(f"- **Evidence Citation:** `{f.get('evidence')}`")
                md_lines.append(f"- **Validation Rule:** `{f.get('validation')}`")
                md_lines.append("")

        structured_data = {
            "total_findings": len(findings),
            "high_severity_count": len(critical_or_high),
            "affected_files": list(set(f.get("file_path", "") for f in findings)),
        }

    elif agent_type == "data_readiness":
        dr = data_readiness or {}
        md_lines.append(f"## Data Readiness & RAG Pipeline Evaluation: {project_name}")
        md_lines.append(f"**Specialist:** Google Cloud FDE — {role_title}")
        md_lines.append("")
        md_lines.append(f"- **Overall RAG Suitability:** `{dr.get('overall_score', 0)}%`")
        md_lines.append(f"- **Structured Schema Score:** `{dr.get('structured_score', 0)}%`")
        md_lines.append(f"- **Unstructured Documentation Score:** `{dr.get('unstructured_score', 0)}%`")
        md_lines.append(f"- **Total Indexed Chunks:** `{dr.get('total_chunks', 0)}`")
        md_lines.append("")
        md_lines.append("### Ingestion & Chunking Optimizations")
        recs = dr.get("recommendations", [])
        if recs:
            for r in recs:
                md_lines.append(f"- {r}")
        else:
            md_lines.append("- Schemas and technical documentation meet Google Cloud AI RAG readiness standards.")

        structured_data = {
            "overall_score": dr.get("overall_score", 0),
            "total_chunks": dr.get("total_chunks", 0),
            "recommendations": recs,
        }

    elif agent_type == "deployment_planner":
        md_lines.append(f"## Google Cloud Run Deployment Blueprint: {project_name}")
        md_lines.append(f"**Specialist:** Google Cloud FDE — {role_title}")
        md_lines.append("")
        md_lines.append("### 1. Cloud Run Architecture Blueprint")
        md_lines.append("Deploying as a stateless container on Cloud Run with Google Cloud Secret Manager integration and IAM least privilege.")
        md_lines.append("")
        md_lines.append("### 2. Pre-Deployment Remediation Checklist")
        if critical_or_high:
            for f in critical_or_high:
                md_lines.append(f"- [ ] **Resolve {f.get('rule_id')}** in `{f.get('file_path')}`: {f.get('recommended_action')}")
        else:
            md_lines.append("- [x] Zero blocking high-severity defects. Container build cleared.")

        md_lines.append("")
        md_lines.append("### 3. Recommended Cloud Run Service Flags")
        md_lines.append("```bash")
        md_lines.append("gcloud run deploy enterprise-service \\")
        md_lines.append("  --image gcr.io/PROJECT_ID/enterprise-service:latest \\")
        md_lines.append("  --platform managed \\")
        md_lines.append("  --region us-central1 \\")
        md_lines.append("  --allow-unauthenticated \\")
        md_lines.append("  --set-secrets DB_PASSWORD=projects/PROJECT_ID/secrets/db-pwd:latest")
        md_lines.append("```")

        structured_data = {
            "deployment_target": "Google Cloud Run",
            "region": "us-central1",
            "remediation_required": len(critical_or_high) > 0,
        }

    thought_chain.append({
        "step_number": 3,
        "thought": "Synthesizing evidence-backed advice and actionable remediation blueprint.",
        "action": "Formatting structured JSON and markdown output.",
        "observation": f"Successfully compiled {len(citations)} citations and complete recommendations.",
    })

    return {
        "thought_chain": thought_chain,
        "output_markdown": "\n".join(md_lines),
        "structured_data": structured_data,
        "citations": citations,
    }


def execute_agent_reasoning(
    agent_type: str,
    project_name: str,
    inventory_summary: dict,
    findings: list,
    data_readiness: dict | None,
    custom_instruction: str | None = None,
) -> Tuple[Dict[str, Any], int, str]:
    """
    Executes agent reasoning with live Gemini API if configured,
    or falls back to the deterministic Grounding Engine.
    Returns: (result_dict, execution_time_ms, model_name_used)
    """
    start_time = time.time()
    model_name = settings.GEMINI_MODEL

    if settings.GEMINI_API_KEY:
        try:
            logger.info("Invoking live Google Gemini API (%s) for agent %s", model_name, agent_type)
            prompt = build_agent_prompt(
                agent_type=agent_type,
                project_name=project_name,
                inventory_summary=inventory_summary,
                findings=findings,
                data_readiness=data_readiness,
                custom_instruction=custom_instruction,
            )
            result = call_gemini_api(
                prompt=prompt,
                system_instruction=SYSTEM_GROUNDING_INSTRUCTION,
                model=model_name,
                api_key=settings.GEMINI_API_KEY,
            )
            elapsed_ms = int((time.time() - start_time) * 1000)
            return result, elapsed_ms, model_name
        except Exception as e:
            logger.warning("Live Gemini API call failed (%s); evaluating fallback.", str(e))
            if not settings.ENABLE_LLM_FALLBACK:
                raise

    # Deterministic fallback mode
    logger.info("Using deterministic Grounding Engine for agent %s", agent_type)
    result = generate_deterministic_grounded_response(
        agent_type=agent_type,
        project_name=project_name,
        inventory_summary=inventory_summary,
        findings=findings,
        data_readiness=data_readiness,
        custom_instruction=custom_instruction,
    )
    elapsed_ms = int((time.time() - start_time) * 1000)
    return result, elapsed_ms, f"{model_name}-grounded-engine"
