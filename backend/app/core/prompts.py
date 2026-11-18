"""Enterprise Prompt Templates & Role Personas for Google FDE Agents."""

SYSTEM_GROUNDING_INSTRUCTION = """You are a senior Google Cloud Forward Deployed Engineer (FDE) working on enterprise AI deployment and Google Cloud Run migration.

CRITICAL OPERATIONAL RULES:
1. STRICT GROUNDING: You must ONLY reason based on the provided technical facts, deterministic diagnostic findings, file inventory, and data readiness metrics.
2. ZERO HALLUCINATION: Never claim a defect exists unless it is present in the provided findings. Never claim a file exists unless it is in the inventory.
3. EXACT CITATIONS: Whenever discussing an issue, cite the exact file path and line numbers (e.g., `docker-compose.yml:L14-L16`).
4. OUTPUT FORMAT: You must return valid JSON strictly conforming to the requested schema.
"""

AGENT_ROLES = {
    "discovery": {
        "title": "Architecture & Discovery Specialist",
        "instructions": (
            "Analyze the project inventory, detected frameworks, and languages. "
            "Explain the architectural components, service topology, and potential Cloud Run migration considerations."
        ),
    },
    "security": {
        "title": "Security & Static Diagnostics Reviewer",
        "instructions": (
            "Analyze the deterministic static findings. "
            "Provide root-cause analysis, enterprise security risk assessment (CVSS impact), and exact code remediation guidance for each finding."
        ),
    },
    "data_readiness": {
        "title": "Data Readiness & RAG Pipeline Architect",
        "instructions": (
            "Analyze the structured SQL schema health and unstructured document chunking metrics. "
            "Evaluate RAG retrieval suitability, token chunk distribution, and suggest knowledge base ingestion optimizations."
        ),
    },
    "deployment_planner": {
        "title": "Google Cloud Run Deployment Strategist",
        "instructions": (
            "Generate a concrete, production-grade Google Cloud Run deployment plan. "
            "Provide required configuration fixes, Dockerfile corrections, and Secret Manager environment variable bindings."
        ),
    },
}


def build_agent_prompt(
    agent_type: str,
    project_name: str,
    inventory_summary: dict,
    findings: list,
    data_readiness: dict | None,
    custom_instruction: str | None = None,
) -> str:
    role = AGENT_ROLES.get(agent_type, AGENT_ROLES["discovery"])

    prompt = f"""Target Project: {project_name}
Role Persona: {role['title']}
Task: {role['instructions']}

{f"Enterprise Context / Custom Constraint: {custom_instruction}" if custom_instruction else ""}

=== ENVIRONMENT INVENTORY ===
Total Files: {inventory_summary.get('total_files', 0)}
Total Lines: {inventory_summary.get('total_lines', 0)}
Detected Languages: {', '.join(inventory_summary.get('detected_languages', [])) or 'None'}
Detected Frameworks: {', '.join(inventory_summary.get('detected_frameworks', [])) or 'None'}
Detected Infrastructure: {', '.join(inventory_summary.get('detected_infrastructure', [])) or 'None'}

=== DETERMINISTIC DIAGNOSTIC FINDINGS ===
"""
    if not findings:
        prompt += "No open diagnostic findings. All checks passed.\n"
    else:
        for idx, f in enumerate(findings, 1):
            prompt += (
                f"{idx}. [{f.get('rule_id')}] ({f.get('severity', '').upper()}) {f.get('title')}\n"
                f"   File: {f.get('file_path')}:{f.get('line_start')}-{f.get('line_end')}\n"
                f"   Evidence: {f.get('evidence')}\n"
                f"   Action: {f.get('recommended_action')}\n\n"
            )

    prompt += "\n=== DATA READINESS & RAG METRICS ===\n"
    if not data_readiness:
        prompt += "Data readiness evaluation not performed.\n"
    else:
        prompt += (
            f"Overall Readiness Score: {data_readiness.get('overall_score')}%\n"
            f"Structured SQL Score: {data_readiness.get('structured_score')}%\n"
            f"Unstructured Docs Score: {data_readiness.get('unstructured_score')}%\n"
            f"Total Document Chunks: {data_readiness.get('total_chunks')}\n"
            f"Recommendations: {', '.join(data_readiness.get('recommendations', []))}\n"
        )

    prompt += """
=== RESPONSE JSON SCHEMA INSTRUCTIONS ===
Return a valid JSON object with the following fields:
{
  "thought_chain": [
    {
      "step_number": 1,
      "thought": "Initial assessment of...",
      "action": "Inspecting findings...",
      "observation": "Found..."
    }
  ],
  "output_markdown": "Full professional markdown response with headings, bullet points, and code snippets.",
  "structured_data": {
    "key_findings": [],
    "suggested_actions": []
  },
  "citations": [
    {
      "file_path": "...",
      "line_start": 1,
      "line_end": 5,
      "quote": "..."
    }
  ]
}
"""
    return prompt
