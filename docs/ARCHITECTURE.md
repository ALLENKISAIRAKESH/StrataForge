# System Architecture & Technical Specifications

## High-Level Architecture

```
                    ┌────────────────────────────────────────┐
                    │      React + TypeScript Frontend       │
                    │      (Tailwind CSS, Vite, UI Tabs)     │
                    └───────────────────┬────────────────────┘
                                        │ REST API (JSON)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │            FastAPI Backend             │
                    │   (Authentication, Projects, Reports)  │
                    └──────┬────────────┬─────────────┬──────┘
                           │            │             │
        ┌──────────────────┴──┐  ┌──────┴──────┐  ┌───┴────────────────┐
        │ Safe Ingestion &    │  │ Findings &  │  │ Multi-Agent Layer  │
        │ Static Discovery    │  │ Rule Engine │  │ (Gemini / ADK)     │
        └─────────────────────┘  └─────────────┘  └────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      PostgreSQL Database & Storage     │
                    │  (Workspaces, Findings, pgvector, Docs)│
                    └────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Primary Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite | Responsive dashboard, findings viewer, upload UX |
| **Backend API** | Python 3.11, FastAPI, Pydantic v2, Uvicorn | High-throughput REST API, validation, async tasks |
| **Discovery Engine** | Static AST / Regex / YAML / SQL Parsers | Deterministic analysis of Docker, Terraform, Code |
| **AI Layer** | Google GenAI SDK (Gemini), Google ADK | Orchestrated agent analysis, reasoning & synthesis |
| **Database** | PostgreSQL 16 + `pgvector` | Workspace isolation, relational entities, vector store |
| **ORM & Migrations**| SQLAlchemy 2.0 + Alembic | Type-safe DB modeling & migrations |
| **Testing** | Pytest, Vitest, Playwright | Automated unit, API, component, and E2E coverage |
| **DevOps & Cloud** | Docker Compose, Google Cloud Run, Terraform | Containerized local dev and scalable GCP deployment |
