import React, { useEffect, useState, useRef } from 'react';
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
  ExternalLink,
  UploadCloud,
  Check,
  Play,
  Filter,
  CheckSquare,
  AlertCircle
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

interface ProjectFile {
  id: string;
  relative_path: string;
  filename: string;
  category: string;
  file_type: string;
  size_bytes: number;
  line_count: number;
}

interface EnvironmentInventory {
  project_id: string;
  artifact_id: string;
  total_files: number;
  total_lines: number;
  category_counts: Record<string, number>;
  file_type_counts: Record<string, number>;
  detected_languages: string[];
  detected_frameworks: string[];
  detected_containers: string[];
  detected_infrastructure: string[];
  files: ProjectFile[];
}

interface Finding {
  id: string;
  rule_id: string;
  category: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  file_path: string;
  line_start: number;
  line_end: number;
  evidence: string;
  recommended_action: string;
  validation: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
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
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjRepo, setNewProjRepo] = useState('');

  // Upload & Inventory State
  const [inventory, setInventory] = useState<EnvironmentInventory | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Diagnostics State
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');

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
      setActiveProject(null);
      setInventory(null);
      setFindings([]);
      return;
    }
    fetch(`/api/v1/projects/?workspace_id=${activeWorkspace.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Project[]) => {
        setProjects(data);
        if (data.length > 0 && (!activeProject || activeProject.workspace_id !== activeWorkspace.id)) {
          setActiveProject(data[0]);
        }
      })
      .catch(console.error);
  }, [token, activeWorkspace]);

  // 5. Fetch inventory & findings for active project
  useEffect(() => {
    if (!token || !activeProject) {
      setInventory(null);
      setFindings([]);
      return;
    }
    fetch(`/api/v1/projects/${activeProject.id}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((inv: EnvironmentInventory | null) => setInventory(inv))
      .catch(() => setInventory(null));

    fetch(`/api/v1/projects/${activeProject.id}/findings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((fList: Finding[]) => setFindings(fList))
      .catch(() => setFindings([]));
  }, [token, activeProject]);

  // Authentication Handlers
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
    setActiveProject(null);
    setInventory(null);
    setFindings([]);
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
      setActiveProject(proj);
      setShowNewProjectModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjRepo('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ZIP Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !activeProject) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setInventory(data);
      setUploadSuccess(`Successfully extracted ${data.total_files} files (${data.total_lines} lines of code)!`);
      setActiveProject({ ...activeProject, status: 'uploaded' });
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Run Diagnostics Handler
  const handleRunDiagnostics = async () => {
    if (!token || !activeProject) return;
    setIsDiagnosing(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/diagnose`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Diagnostics failed');
      setFindings(data.findings);
      setActiveProject({ ...activeProject, status: 'analyzed' });
      setActiveTab('diagnostics');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Status Update Handler
  const handleUpdateFindingStatus = async (findingId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/findings/${findingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      setFindings(findings.map((f) => (f.id === findingId ? { ...f, status: newStatus as any } : f)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (severityFilter === 'all') return true;
    return f.severity === severityFilter;
  });

  const severityCounts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
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

        {/* Right Nav */}
        <div className="flex items-center gap-3">
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
              {loading ? 'FastAPI...' : health ? `v${health.version}` : error ? `Offline` : 'Offline'}
            </span>
          </div>

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
        {/* Sidebar */}
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
              Diagnostics & Architecture
            </div>
            {[
              { id: 'discovery', label: 'Environment Discovery', icon: Terminal },
              { id: 'diagnostics', label: 'Static Diagnostics', icon: Activity, count: findings.length },
              { id: 'agents', label: 'Multi-Agent Reasoning', icon: Cpu },
              { id: 'roadmap', label: '16-Week Roadmap', icon: FileCheck2 },
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
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1 text-xs">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Phase 2 Milestone</span>
              <span className="text-emerald-400 font-semibold">Week 4 Active</span>
            </div>
            <p className="text-[11px] text-slate-500">Deterministic Static Diagnostics & Evidence</p>
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
                      Deterministic static diagnostics and evidence extraction for Google Cloud Run production readiness.
                    </p>
                  </div>
                  {currentUser && inventory && (
                    <button
                      onClick={handleRunDiagnostics}
                      disabled={isDiagnosing}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" /> {isDiagnosing ? 'Running Rules...' : 'Run Diagnostics'}
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    Deterministic AST & Regex Rules
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    Exact File Line Evidence Citations
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    FastAPI + SQLAlchemy
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                    Zero Code Execution Sandbox
                  </span>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Target Project</div>
                  <div className="text-xl font-bold text-white truncate">
                    {activeProject ? activeProject.name : 'None Selected'}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Status: <span className="font-mono text-blue-400">{activeProject?.status || 'idle'}</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Discovered Files</div>
                  <div className="text-xl font-bold text-white">
                    {inventory ? `${inventory.total_files} files` : '0 files'}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {inventory ? `${inventory.total_lines} lines of code` : 'Awaiting archive upload'}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Diagnostic Findings</div>
                  <div className="text-xl font-bold text-amber-400 flex items-center gap-1.5 text-base">
                    {findings.length > 0 ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        {findings.length} Defects Found
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Clean / Not Run
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {findings.length > 0 ? `${severityCounts.high} High, ${severityCounts.medium} Medium` : 'Evidence-backed checks'}
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => {
                  if (!currentUser) setShowAuthModal(true);
                  else if (!activeWorkspace) setShowNewWorkspaceModal(true);
                  else if (!activeProject) setShowNewProjectModal(true);
                  else fileInputRef.current?.click();
                }}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-600/50 bg-[#0d1320]/40 text-center space-y-3 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".zip"
                  className="hidden"
                />
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {isUploading ? 'Extracting & Classifying Files...' : 'Upload Enterprise Project Archive (.zip)'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Safely inspects Dockerfiles, Terraform scripts, and dependencies with zero execution of untrusted user code.
                  </p>
                </div>
                {uploadError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg max-w-md mx-auto">
                    {uploadError}
                  </p>
                )}
                {uploadSuccess && (
                  <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2 rounded-lg max-w-md mx-auto flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" /> {uploadSuccess}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isUploading}
                  className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  {isUploading ? 'Processing...' : activeProject ? `Upload to ${activeProject.name}` : 'Select Archive (.zip)'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Static Diagnostics & Evidence Engine
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deterministic inspection rules with zero false factual claims. Every finding is backed by exact file line references.
                  </p>
                </div>
                {currentUser && inventory && (
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={isDiagnosing}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" /> {isDiagnosing ? 'Running Rules...' : 'Run Diagnostics'}
                  </button>
                )}
              </div>

              {/* Severity Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] font-semibold text-rose-400 uppercase">Critical</div>
                  <div className="text-xl font-bold text-white mt-1">{severityCounts.critical}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] font-semibold text-amber-400 uppercase">High Severity</div>
                  <div className="text-xl font-bold text-white mt-1">{severityCounts.high}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] font-semibold text-yellow-400 uppercase">Medium Severity</div>
                  <div className="text-xl font-bold text-white mt-1">{severityCounts.medium}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] font-semibold text-blue-400 uppercase">Low / Info</div>
                  <div className="text-xl font-bold text-white mt-1">{severityCounts.low}</div>
                </div>
              </div>

              {/* Severity Filter Controls */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-400 mr-2">Filter:</span>
                {['all', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium uppercase text-[10px] transition-colors ${
                      severityFilter === sev
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              {/* Findings List */}
              {findings.length === 0 ? (
                <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
                  <CheckSquare className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white">No Diagnostic Findings</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {inventory
                      ? 'Click "Run Diagnostics" to inspect the uploaded codebase.'
                      : 'Upload a project archive (.zip) first to begin analysis.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-5 rounded-2xl border border-slate-800 bg-[#0d1322] space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {finding.rule_id}
                            </span>
                            <span
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                finding.severity === 'high'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : finding.severity === 'medium'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <span className="text-xs font-semibold text-white">{finding.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            File: <span className="text-blue-300">{finding.file_path}</span> (Lines {finding.line_start}-{finding.line_end})
                          </div>
                        </div>

                        {/* Status Select */}
                        <select
                          value={finding.status}
                          onChange={(e) => handleUpdateFindingStatus(finding.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="resolved">Resolved</option>
                          <option value="false_positive">False Positive</option>
                        </select>
                      </div>

                      {/* Evidence citation block */}
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300">
                        <div className="text-[10px] font-sans font-semibold text-slate-500 uppercase mb-1">
                          Exact Evidence Citation:
                        </div>
                        {finding.evidence}
                      </div>

                      {/* Recommendation */}
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-400 font-medium">Recommended Action: </span>
                          {finding.recommended_action}
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Validation: </span>
                          <span className="font-mono text-slate-400 text-[11px]">{finding.validation}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISCOVERY */}
          {activeTab === 'discovery' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Environment Discovery Engine</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Parses enterprise configurations, mapping service architectures and dependencies.
                  </p>
                </div>
              </div>

              {inventory ? (
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Classified File Inventory</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(inventory.category_counts).map(([cat, count]) => (
                      <div key={cat} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-mono">{cat}</div>
                        <div className="text-lg font-bold text-white mt-1">{count} files</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
                  <Terminal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-300">Upload a project archive to run environment discovery.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WORKSPACES */}
          {activeTab === 'workspaces' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Multi-Tenant Workspaces</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Isolated enterprise boundaries with dedicated project scoping.
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

          {/* TAB 5: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Projects {activeWorkspace && <span className="text-blue-400 font-normal">in {activeWorkspace.name}</span>}
                  </h2>
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

              <div className="space-y-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => setActiveProject(proj)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      activeProject?.id === proj.id
                        ? 'bg-blue-950/20 border-blue-500/40'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">{proj.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {proj.status}
                        </span>
                      </div>
                      {activeProject?.id === proj.id && (
                        <span className="text-[10px] text-blue-400 font-medium">Selected</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{proj.description || 'No description'}</p>
                    {proj.repository_url && (
                      <a
                        href={proj.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 inline-flex mt-2"
                      >
                        <ExternalLink className="w-3 h-3" /> {proj.repository_url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ROADMAP */}
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
                    status: 'Completed (Tested)',
                    active: true,
                    details: 'Deterministic inspection rules for Dockerfiles, OpenAPI, SQL schemas, and unpinned dependencies with exact line citations.',
                  },
                  {
                    phase: 'Phase 2: Week 5',
                    title: 'Data Readiness & RAG Suitability Engine',
                    status: 'Next Up',
                    active: false,
                    details: 'Chunking quality, metadata extraction, semantic segmentation, and RAG retrieval preparation.',
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

          {activeTab === 'agents' && (
            <div className="max-w-4xl mx-auto p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
              <Cpu className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Multi-Agent Reasoning Engine</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Scheduled for Phase 3 &bull; Gemini + Google ADK agent orchestration over deterministic findings.
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
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign In'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
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
