import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Terminal,
  Activity,
  FileCheck2,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';

interface BackendHealth {
  status: string;
  service: string;
  version: string;
  api_version?: string;
}

export default function App() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'discovery' | 'diagnostics' | 'agents' | 'roadmap'>('overview');

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0d131f]/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Enterprise AI Engineering Platform
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                FDE Flagship
              </span>
            </h1>
            <p className="text-xs text-slate-400">Google Cloud Consulting &bull; Production Readiness & Diagnostics</p>
          </div>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  health ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  health ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-slate-300">
              {loading
                ? 'Connecting to FastAPI...'
                : health
                ? `FastAPI: v${health.version} (${health.status})`
                : 'FastAPI Offline'}
            </span>
          </div>
          <button className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-sm">
            New Assessment
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#0b101b] p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">
              Core Modules
            </div>
            {[
              { id: 'overview', label: 'Platform Overview', icon: Layers },
              { id: 'discovery', label: 'Environment Discovery', icon: FolderGit2 },
              { id: 'diagnostics', label: 'Static Diagnostics', icon: Activity },
              { id: 'agents', label: 'Multi-Agent Reasoning', icon: Cpu },
              { id: 'roadmap', label: '16-Week Roadmap', icon: FileCheck2 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1 text-xs">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Phase 1: Week 1</span>
              <span className="text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-500">Foundation, API Specs, & Local Full-Stack</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'overview' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header Hero */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/50 border border-blue-800/30">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Enterprise AI Deployment Engineering Platform
                </h2>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Automating enterprise environment discovery, deterministic configuration diagnostics,
                  and multi-agent architecture assessments for production Google Cloud deployments.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                    FastAPI + Python 3.11
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                    React + Vite + Tailwind CSS
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                    Google ADK + Gemini
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                    PostgreSQL + pgvector
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                    Docker + Google Cloud Run
                  </span>
                </div>
              </div>

              {/* Status & Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Backend REST API</div>
                  <div className="text-xl font-bold text-white flex items-center gap-2">
                    {health ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 text-base font-semibold">
                        <CheckCircle2 className="w-5 h-5" /> Operational
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1.5 text-base font-semibold">
                        <AlertTriangle className="w-5 h-5" /> {error ? error : 'Connecting...'}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    Endpoint: /api/v1/health
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Architecture Boundary</div>
                  <div className="text-xl font-bold text-white">Local-First Engine</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Zero customer code execution &bull; Deterministic evidence rules
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Development Phase</div>
                  <div className="text-xl font-bold text-blue-400">Week 1 Complete</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Foundation, Architecture & Full-Stack Scaffold
                  </div>
                </div>
              </div>

              {/* Quick Actions / Upload Dropzone */}
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-600/50 bg-[#0d1320]/40 text-center space-y-3 transition-colors cursor-pointer">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Upload Enterprise Project ZIP</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Safely unpacks Dockerfiles, OpenAPI specs, SQL schemas, and dependencies with ZIP-slip protection and evidence recording.
                  </p>
                </div>
                <button className="text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors">
                  Select Archive (.zip)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className="text-xl font-bold text-white">16-Week Google FDE Execution Plan</h2>
              <p className="text-sm text-slate-400">
                Detailed day-by-day plan documented in <code className="text-blue-400">Roadmap.pdf</code>:
              </p>

              <div className="space-y-3 mt-4">
                {[
                  {
                    phase: 'Phase 1 (Weeks 1-2)',
                    title: 'Foundation & Workspace Management',
                    status: 'Week 1 Completed',
                    active: true,
                    details: 'FastAPI backend, React frontend, health endpoints, CORS, test coverage, PRD & architecture specs.',
                  },
                  {
                    phase: 'Phase 2 (Weeks 3-6)',
                    title: 'Environment Discovery & Engineering Diagnostics',
                    status: 'Upcoming',
                    active: false,
                    details: 'Safe ZIP extraction, technology classification, deterministic rules for Docker, OpenAPI, SQL, dependencies.',
                  },
                  {
                    phase: 'Phase 3 (Weeks 7-10)',
                    title: 'Data Readiness & Multi-Agent Reasoning',
                    status: 'Upcoming',
                    active: false,
                    details: 'Chunking, pgvector search, Google ADK orchestration (Discovery, Security, Deployment agents).',
                  },
                  {
                    phase: 'Phase 4 (Weeks 11-16)',
                    title: 'Security, Cloud Run Deployment & Observability',
                    status: 'Upcoming',
                    active: false,
                    details: 'OpenTelemetry, Cloud Run deployment, benchmark evaluation, and public portfolio case study.',
                  },
                ].map((item, idx) => (
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
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.active
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{item.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'roadmap' && (
            <div className="max-w-4xl mx-auto p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
              <Terminal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white capitalize">{activeTab} Module</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Scheduled for Phase 2 &bull; Deterministic static inspection & multi-agent synthesis pipeline.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
