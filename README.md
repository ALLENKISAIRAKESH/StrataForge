# StrataForge

**Autonomous Enterprise Cloud Engineering Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Tests](https://img.shields.io/badge/Tests-57%2F57_Passed-4caf50.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

StrataForge ingests enterprise application archives, runs deterministic static analysis, evaluates data readiness for Vertex AI RAG, orchestrates a 4-agent collaborative reasoning pipeline, provides human-in-the-loop diff governance, and generates production-grade Terraform IaC targeting Google Cloud Run v2.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+ and npm

### 1. Backend

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r backend/requirements.txt
python -m backend.scripts.seed  # seed sample data
uvicorn backend.app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                     # starts on http://localhost:5173
```

### Demo Login
| Field | Value |
|---|---|
| Email | `alex.chen@strataforge.io` |
| Password | `StrataSecure#2026!` |

---

## Testing

```bash
.venv\Scripts\pytest -v         # 57 tests, 100% pass rate
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + SQLAlchemy 2.0 + JWT |
| Frontend | React 19 + TypeScript + Tailwind CSS + Vite |
| AI Agents | Google Gemini API (4-agent Blackboard pipeline) |
| Database | SQLite (dev) / Cloud SQL PostgreSQL (prod) |
| Infrastructure | Terraform + Google Cloud Run v2 |
| CI/CD | Google Cloud Build (6-stage pipeline) |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/        # REST endpoints
│   │   ├── core/       # Security, rate limiting, prompts
│   │   ├── models/     # SQLAlchemy entities
│   │   ├── schemas/    # Pydantic schemas
│   │   └── services/   # Diagnostics, agents, Terraform
│   ├── scripts/        # Database seeder
│   └── tests/          # 57 pytest suites
├── frontend/
│   └── src/            # React SPA
├── deploy/terraform/   # Cloud Run + Cloud SQL IaC
├── Dockerfile
├── cloudbuild.yaml
└── api.http            # REST test collection
```

---

## License

[MIT](./LICENSE) — Copyright © 2026 ALLENKI SAI RAKESH
