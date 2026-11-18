# User Journeys & Functional Requirements

## End-to-End Workflow

```
[User Auth] ──> [Create Workspace] ──> [Upload Project ZIP]
                                                │
                                                ▼
                                       [Safe Extraction & File Classification]
                                                │
                                                ▼
                                       [Environment Discovery & Dependency Graph]
                                                │
                                                ▼
                                       [Deterministic Diagnostic Rule Engine]
                                                │
                                                ▼
                                       [Findings & Evidence Stored in DB]
                                                │
                                                ▼
                                       [Multi-Agent Reasoning (Gemini + ADK)]
                                                │
                                                ▼
                                       [Production Readiness Report & Remediation]
```

### Detailed Journeys

1. **Workspace & Project Setup**:
   - User authenticates via JWT / session.
   - User provisions a workspace (isolated tenant scope).
   - User initiates a new assessment project.

2. **Project Ingestion & Safe Unpacking**:
   - Accepts `.zip` archive (Max 50MB compressed, 200MB extracted, max 5,000 files).
   - Validates against ZIP slip/path traversal, symlinks, and malformed headers.
   - Classifies files: `Dockerfile`, `docker-compose.yml`, `requirements.txt`, `package.json`, `*.tf`, `*.sql`, `openapi.yaml`.

3. **Discovery & Static Diagnostics**:
   - Extracts component relationships, API route declarations, and DB schemas.
   - Executes deterministic rules (e.g., missing Docker healthchecks, unpinned deps, missing auth).
   - Records finding severity, confidence, file reference, and exact lines.

4. **AI-Assisted Investigation & Remediation**:
   - Discovery Agent summarizes architecture.
   - Integration & Security Agents explain discovered anomalies.
   - Deployment Planning Agent outlines targeted GCP remediations (Cloud Run, Secret Manager, Cloud SQL).

5. **Review & Report Generation**:
   - User reviews findings in interactive UI dashboard.
   - Exports complete evidence-backed audit report in JSON and Markdown formats.
