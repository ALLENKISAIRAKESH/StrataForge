import React from 'react';

export const RoadmapView: React.FC = () => {
  const roadmapItems = [
    {
      phase: 'Phase 1: Week 1',
      title: 'Foundation & Application Architecture',
      status: 'Completed',
      active: true,
      details: 'FastAPI backend, React frontend, health endpoints, CORS, test coverage, PRD & architecture specs.',
    },
    {
      phase: 'Phase 1: Week 2',
      title: 'Database, Authentication & Multi-Tenant Isolation',
      status: 'Completed',
      active: true,
      details: 'SQLAlchemy models (Users, Workspaces, Projects), JWT auth, strict tenant isolation.',
    },
    {
      phase: 'Phase 2: Week 3',
      title: 'Secure File Ingestion & File Classification',
      status: 'Completed',
      active: true,
      details: 'Zip Slip & bomb defenses, deterministic file classifier, ProjectFile metadata inventory.',
    },
    {
      phase: 'Phase 2: Week 4',
      title: 'Static Diagnostic Rule Engine & Evidence Collection',
      status: 'Completed',
      active: true,
      details: 'Deterministic inspection rules for Dockerfiles, OpenAPI, SQL schemas, and unpinned dependencies with exact line citations.',
    },
    {
      phase: 'Phase 2: Week 5',
      title: 'Data Readiness & RAG Suitability Engine',
      status: 'Completed',
      active: true,
      details: 'Chunking quality, metadata extraction, semantic segmentation, and RAG retrieval preparation.',
    },
    {
      phase: 'Phase 2: Week 6',
      title: 'Production Readiness Workbench & Report Generator',
      status: 'Completed',
      active: true,
      details: 'Executive audit reports, composite production readiness index, Google Cloud Run gate checklists, and downloadable Markdown/JSON exports.',
    },
    {
      phase: 'Phase 3: Week 7',
      title: 'LLM Foundation Layer & Agent Core Architecture',
      status: 'Completed',
      active: true,
      details: 'Gemini 1.5/2.0 API client, Pydantic structured output validation, deterministic grounding engine, and thought chain telemetry.',
    },
    {
      phase: 'Phase 3: Week 8',
      title: 'Specialized Subagents & Collaborative Pipeline',
      status: 'Completed (Tested)',
      active: true,
      details: 'Domain specialists (Discovery, Security with diff patches, Data Readiness, Deployment Strategist with Terraform/Cloud Build), and 4-agent collaborative synthesis.',
    },
    {
      phase: 'Phase 3: Week 9',
      title: 'Multi-Agent Orchestration & Shared Memory Bus',
      status: 'Completed (Tested)',
      active: true,
      details: 'Persistent shared blackboard memory bus allowing subagents to share structured architectural facts, security risks, RAG strategies, and deployment constraints with idempotency and human injection.',
    },
    {
      phase: 'Phase 3: Week 10',
      title: 'Human-in-the-Loop Workbench & Feedback Loop',
      status: 'Completed (Tested)',
      active: true,
      details: 'Enterprise engineer review workbench for automated diff patches, approval gates, virtual patch application with file safety, and audit feedback trail.',
    },
    {
      phase: 'Phase 4: Week 11',
      title: 'Production IaC (Terraform for Cloud Run & Cloud SQL)',
      status: 'Completed (Tested)',
      active: true,
      details: 'Production-grade HCL synthesizing Cloud Run v2, Serverless VPC Access connector, Cloud SQL PostgreSQL 16, Secret Manager, least-privilege IAM service account, and downloadable bundle.',
    },
    {
      phase: 'Phase 4: Week 12',
      title: 'Enterprise Security Hardening & Rate Limiting',
      status: 'Completed (Tested)',
      active: true,
      details: 'Token bucket rate limiting, OWASP security headers (HSTS, CSP, X-Frame-Options), and strict zip magic bytes file upload verification.',
    },
    {
      phase: 'Phase 4: Week 13',
      title: 'Distributed Observability & OpenTelemetry',
      status: 'Completed (Tested)',
      active: true,
      details: 'W3C TraceContext distributed propagation (X-Trace-ID, X-Span-ID), structured Google Cloud Logging, and Prometheus metrics exporter (/api/v1/metrics).',
    },
    {
      phase: 'Phase 4: Week 14',
      title: 'Automated Evaluation & Benchmark Suite',
      status: 'Completed (Tested)',
      active: true,
      details: 'Golden dataset confusion matrix benchmarking (Precision, Recall, F1 >= 0.85), rule coverage index, and 100% line-level zero-hallucination grounding verification.',
    },
    {
      phase: 'Phase 4: Week 15',
      title: 'Containerized CI/CD & Google Cloud Build Pipeline',
      status: 'Completed (Tested)',
      active: true,
      details: 'Multi-stage Docker builds with least-privilege non-root execution (UID 10001), Cloud Build 6-stage pipeline (cloudbuild.yaml), and Trivy vulnerability gate.',
    },
    {
      phase: 'Phase 4: Week 16',
      title: 'Production Capstone & Engineering Portfolio',
      status: 'Completed (Tested)',
      active: true,
      details: 'Complete executive architecture blueprint, Google Cloud Consulting (GCC) competency showcase, full-stack test suite (100% pass), and deployment runbook.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-white">Cloud Architecture & Engineering Execution Plan</h2>
      <div className="space-y-3 mt-4">
        {roadmapItems.map((item, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl border ${
              item.active
                ? 'bg-blue-950/20 border-blue-500/30'
                : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                {item.phase}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {item.status}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">{item.title}</h3>
            <p className="text-xs text-slate-400 mt-1">{item.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
