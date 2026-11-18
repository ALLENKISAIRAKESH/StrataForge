import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Terminal,
  Activity,
  FileCheck2,
  Cpu,
  CheckCircle2,
  FolderGit2,
  Plus,
  Briefcase,
  UserCheck,
  LogOut,
  LogIn,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface BackendHealth {
  status: string;
  service: string;
  version: string;
  api_version?: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  repository_url?: string;
  status: string;
  created_at: string;
}

export default function App() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workspaces' | 'projects' | 'discovery' | 'diagnostics' | 'agents' | 'roadmap'>('overview');

  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('fde_auth_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Workspace & Project State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjRepo, setNewProjRepo] = useState('');

  // 1. Health check
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

  // 2. Fetch current user if token exists
  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      return;
    }
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((user: User) => setCurrentUser(user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem('fde_auth_token');
      });
  }, [token]);

  // 3. Fetch workspaces when user is logged in
  useEffect(() => {
    if (!token) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }
    fetch('/api/v1/workspaces/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Workspace[]) => {
        setWorkspaces(data);
        if (data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(data[0]);
        }
      })
      .catch(console.error);
  }, [token]);

  // 4. Fetch projects for active workspace
  useEffect(() => {
    if (!token || !activeWorkspace) {
      setProjects([]);
      return;
    }
    fetch(`/api/v1/projects/?workspace_id=${activeWorkspace.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Project[]) => setProjects(data))
      .catch(console.error);
  }, [token, activeWorkspace]);

  // Handle Authentication submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = authMode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const body = authMode === 'register'
      ? { email: authEmail, password: authPassword, full_name: authFullName }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      localStorage.setItem('fde_auth_token', data.access_token);
      setToken(data.access_token);
      setCurrentUser(data.user);
      setShowAuthModal(false);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fde_auth_token');
    setToken(null);
    setCurrentUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setProjects([]);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newWsName.trim()) return;
    try {
      const res = await fetch('/api/v1/workspaces/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newWsName, description: newWsDesc }),
      });
      if (!res.ok) throw new Error('Failed to create workspace');
      const ws: Workspace = await res.json();
      setWorkspaces([ws, ...workspaces]);
      setActiveWorkspace(ws);
      setShowNewWorkspaceModal(false);
      setNewWsName('');
      setNewWsDesc('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeWorkspace || !newProjName.trim()) return;
    try {
      const res = await fetch('/api/v1/projects/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          name: newProjName,
          description: newProjDesc,
          repository_url: newProjRepo || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const proj: Project = await res.json();
      setProjects([proj, ...projects]);
      setShowNewProjectModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjRepo('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0d131f]/90 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Enterprise AI Engineering Platform
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                Google FDE Flagship
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Production AI Readiness & Multi-Tenant Diagnostics</p>
          </div>
        </div>

        {/* Right Nav / User & Health */}
        <div className="flex items-center gap-3">
          {/* Active Workspace Selector */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <select
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                value={activeWorkspace?.id || ''}
                onChange={(e) => {
                  const ws = workspaces.find((w) => w.id === e.target.value);
                  if (ws) setActiveWorkspace(ws);
                }}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-slate-100">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Backend Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
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
            <span className="text-slate-300 text-[11px]">
              {loading
                ? 'FastAPI...'
                : health
                ? `v${health.version}`
                : (error ? `Offline (${error})` : 'Offline')}
            </span>
          </div>

          {/* User Auth Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">{currentUser.full_name || currentUser.email}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthError(null);
                setShowAuthModal(true);
              }}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#0b101b] p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">
              Workspace & Projects
            </div>
            {[
              { id: 'overview', label: 'Platform Overview', icon: Layers },
              { id: 'workspaces', label: 'Workspaces', icon: Briefcase, count: workspaces.length },
              { id: 'projects', label: 'Enterprise Projects', icon: FolderGit2, count: projects.length },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pt-4 py-2">
              AI & Diagnostics
            </div>
            {[
              { id: 'discovery', label: 'Environment Discovery', icon: Terminal },
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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
              <span>Phase 1 Milestone</span>
              <span className="text-emerald-400 font-semibold">Week 2 Active</span>
            </div>
            <p className="text-[11px] text-slate-500">Auth, DB Models & Multi-Tenant Workspaces</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/50 border border-blue-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Enterprise AI Deployment Engineering Platform
                    </h2>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Designed for Google Cloud Forward Deployed Engineers: inspects enterprise repositories,
                      diagnoses configuration flaws with deterministic evidence rules, and orchestrates Gemini agents for Cloud Run.
                    </p>
                  </div>
                  {currentUser && (
                    <button
                      onClick={() => setShowNewProjectModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                    >
                      <Plus className="w-4 h-4" /> New Project
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    FastAPI + SQLAlchemy
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    JWT Multi-Tenant Isolation
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    React + TypeScript + Tailwind
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    PostgreSQL / SQLite
                  </span>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Database & Auth</div>
                  <div className="text-xl font-bold text-white flex items-center gap-2">
                    {currentUser ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 text-base font-semibold">
                        <CheckCircle2 className="w-5 h-5" /> Authenticated
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1.5 text-base font-semibold">
                        <KeyRound className="w-5 h-5" /> Guest Mode
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {currentUser ? currentUser.email : 'Sign in to access workspaces & projects'}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Active Workspace</div>
                  <div className="text-xl font-bold text-white truncate">
                    {activeWorkspace ? activeWorkspace.name : 'None Selected'}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {activeWorkspace ? `Slug: ${activeWorkspace.slug}` : 'Create a workspace to begin'}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Registered Projects</div>
                  <div className="text-xl font-bold text-blue-400">{projects.length}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Isolated under current workspace
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => {
                  if (!currentUser) setShowAuthModal(true);
                  else if (!activeWorkspace) setShowNewWorkspaceModal(true);
                  else setShowNewProjectModal(true);
                }}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-600/50 bg-[#0d1320]/40 text-center space-y-3 transition-colors cursor-pointer"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Upload Enterprise Project Archive</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Safely unpacks Dockerfiles, Terraform scripts, and API specs with ZIP-slip protection and evidence recording.
                  </p>
                </div>
                <button className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                  {currentUser ? 'Start Assessment' : 'Sign In to Begin'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WORKSPACES */}
          {activeTab === 'workspaces' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Multi-Tenant Workspaces</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Each workspace represents an isolated enterprise domain with dedicated project boundaries.
                  </p>
                </div>
                {currentUser && (
                  <button
                    onClick={() => setShowNewWorkspaceModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Workspace
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
                  <KeyRound className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">Sign in to manage workspaces.</p>
                </div>
              ) : workspaces.length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
                  <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">No workspaces found. Create your first workspace!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      onClick={() => setActiveWorkspace(ws)}
                      className={`p-5 rounded-xl border transition-all cursor-pointer ${
                        activeWorkspace?.id === ws.id
                          ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white text-base">{ws.name}</h3>
                        {activeWorkspace?.id === ws.id && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{ws.description || 'No description provided'}</p>
                      <div className="text-[11px] font-mono text-slate-500">Slug: {ws.slug}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Projects {activeWorkspace && <span className="text-blue-400 font-normal">in {activeWorkspace.name}</span>}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target enterprise repositories subjected to environment discovery and readiness diagnostics.
                  </p>
                </div>
                {currentUser && activeWorkspace && (
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Project
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
                  <KeyRound className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">Sign in to view and create projects.</p>
                </div>
              ) : !activeWorkspace ? (
                <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
                  <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">Select or create a workspace first.</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
                  <FolderGit2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">No projects registered in this workspace.</p>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="mt-3 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white text-sm">{proj.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {proj.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{proj.description || 'No description'}</p>
                        {proj.repository_url && (
                          <a
                            href={proj.repository_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 inline-flex"
                          >
                            <ExternalLink className="w-3 h-3" /> {proj.repository_url}
                          </a>
                        )}
                      </div>
                      <button className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg">
                        Run Discovery
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className="text-xl font-bold text-white">16-Week Google FDE Execution Plan</h2>
              <div className="space-y-3 mt-4">
                {[
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
                    status: 'Completed (Tested)',
                    active: true,
                    details: 'SQLAlchemy models (Users, Workspaces, Projects), JWT auth, strict tenant isolation, 15 automated pytest tests passing.',
                  },
                  {
                    phase: 'Phase 2: Weeks 3-6',
                    title: 'Environment Discovery & Static Diagnostics',
                    status: 'Next Up',
                    active: false,
                    details: 'Safe ZIP extraction, technology classification, deterministic rules for Docker, OpenAPI, SQL, dependencies.',
                  },
                  {
                    phase: 'Phase 3: Weeks 7-10',
                    title: 'Data Readiness & Multi-Agent Reasoning',
                    status: 'Upcoming',
                    active: false,
                    details: 'Chunking, pgvector search, Google ADK orchestration (Discovery, Security, Deployment agents).',
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
          )}

          {/* OTHER TABS */}
          {activeTab !== 'overview' && activeTab !== 'workspaces' && activeTab !== 'projects' && activeTab !== 'roadmap' && (
            <div className="max-w-4xl mx-auto p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
              <Terminal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white capitalize">{activeTab} Engine</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Scheduled for Phase 2 &bull; Environment Discovery & Multi-Agent Synthesis Pipeline.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {authMode === 'login' ? 'Sign in to Platform' : 'Create an Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {authMode === 'login'
                ? 'Enter your credentials to access your enterprise workspaces.'
                : 'Register as an engineer to provision workspaces and audit environments.'}
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="Alice Engineer"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="engineer@enterprise.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign In'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                  >
                    {authMode === 'login' ? 'Sign In' : 'Register'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW WORKSPACE MODAL */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Workspace</h3>
            <p className="text-xs text-slate-400 mb-4">Provision a new isolated enterprise workspace.</p>
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="Acme Cloud Systems"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="Optional scope and organization notes"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Assessment Project</h3>
            <p className="text-xs text-slate-400 mb-4">
              Adding project to <span className="text-blue-400">{activeWorkspace?.name}</span>
            </p>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Acme Knowledge Assistant"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Repository URL (optional)</label>
                <input
                  type="url"
                  value={newProjRepo}
                  onChange={(e) => setNewProjRepo(e.target.value)}
                  placeholder="https://github.com/acme/knowledge-assistant"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Target system specifications and objectives"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
