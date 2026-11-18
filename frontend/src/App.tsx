import React, { useEffect, useState, useRef } from 'react';
import {
  ShieldCheck,
  Layers,
  Terminal,
  Activity,
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
  AlertCircle,
  Database,
  BookOpen,
  Search,
  Sparkles,
  FileText,
  BarChart2,
  Download,
  ClipboardCheck,
  XCircle,
  Bot,
  Brain,
  Clock,
  Quote,
  Zap,
  Share2,
  Trash2,
  GitPullRequest,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
} from 'lucide-react';
import { ToastContainer, type ToastMessage, type ToastType } from './components/Toast';
import { CopyButton } from './components/CopyButton';
import { DiffViewer } from './components/DiffViewer';
import { Logo } from './components/Logo';

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

interface DataReadinessMetrics {
  structured: {
    total_sql_files: number;
    total_tables: number;
    tables_with_primary_key: number;
    total_indexes: number;
  };
  unstructured: {
    total_doc_files: number;
    total_chunks: number;
    total_tokens_estimated: number;
    chunks_with_headings: number;
    average_tokens_per_chunk: number;
  };
}

interface DataReadinessReport {
  id: string;
  project_id: string;
  artifact_id: string;
  overall_score: number;
  structured_score: number;
  unstructured_score: number;
  metrics: DataReadinessMetrics;
  recommendations: string[];
  total_chunks: number;
  created_at: string;
}

interface DocumentChunk {
  id: string;
  file_path: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: {
    line_start?: number;
    line_end?: number;
    headings?: string[];
    char_count?: number;
  };
  created_at: string;
}

interface AuditReport {
  report_id: string;
  generated_at: string;
  project: {
    id: string;
    name: string;
    description?: string;
    repository_url?: string;
    status: string;
    workspace_id: string;
  };
  artifact?: {
    id?: string;
    filename?: string;
    file_size?: number;
    total_files: number;
    total_lines: number;
  };
  production_readiness: {
    readiness_index: number;
    verdict: string;
    color: string;
    score_breakdown: {
      diagnostics_score: number;
      infrastructure_score: number;
      data_readiness_score: number;
    };
    severity_summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      total_unresolved: number;
    };
  };
  findings: Finding[];
  data_readiness: {
    overall_score?: number;
    structured_score?: number;
    unstructured_score?: number;
    metrics?: any;
    recommendations: string[];
    total_chunks: number;
  };
  remediation_checklist: Array<{
    category: string;
    severity: string;
    rule_id: string;
    title: string;
    file_path: string;
    lines: string;
    action: string;
    validation: string;
  }>;
  cloud_run_checklist: Array<{
    item: string;
    status: 'PASS' | 'FAIL';
    notes: string;
  }>;
}

interface Citation {
  file_path: string;
  line_start?: number;
  line_end?: number;
  quote: string;
}

interface ThoughtStep {
  step_number: number;
  thought: string;
  action?: string;
  observation?: string;
}

interface AgentExecution {
  id: string;
  project_id: string;
  agent_type: string;
  model_name: string;
  status: string;
  thought_chain: ThoughtStep[];
  output_markdown: string;
  structured_data?: any;
  citations: Citation[];
  execution_time_ms: number;
  tokens_used: number;
  created_at: string;
}

interface AgentMemoryEntry {
  id: string;
  project_id: string;
  key: string;
  source_agent: string;
  value: any;
  confidence: number;
  created_at: string;
  updated_at: string;
}

interface AgentBlackboard {
  project_id: string;
  blackboard: Record<string, any>;
  memories: AgentMemoryEntry[];
  total_keys: number;
}

interface AgentFeedbackItem {
  id: string;
  project_id: string;
  user_id?: string;
  finding_id?: string;
  execution_id?: string;
  target_type: string;
  action: 'approve' | 'reject' | 'modify';
  status: 'pending' | 'reviewed' | 'applied' | 'rejected';
  original_content: string;
  modified_content?: string;
  reviewer_comments?: string;
  applied_patch_summary?: string;
  applied_at?: string;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
}

interface TerraformBundle {
  project_id: string;
  region: string;
  files: Record<string, string>;
  is_valid: boolean;
  validation_errors: string[];
}

export default function App() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workspaces' | 'projects' | 'discovery' | 'diagnostics' | 'readiness' | 'workbench' | 'agents' | 'roadmap'>('overview');

  // Modern Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

  // Data Readiness State
  const [readinessReport, setReadinessReport] = useState<DataReadinessReport | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isAssessingReadiness, setIsAssessingReadiness] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');

  // Production Readiness Workbench State
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Multi-Agent Reasoning State
  const [selectedAgentType, setSelectedAgentType] = useState<'discovery' | 'security' | 'data_readiness' | 'deployment_planner'>('discovery');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<AgentExecution | null>(null);
  const [agentHistory, setAgentHistory] = useState<AgentExecution[]>([]);
  const [blackboardData, setBlackboardData] = useState<AgentBlackboard | null>(null);
  const [showInjectMemory, setShowInjectMemory] = useState(false);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [newMemoryAgent, setNewMemoryAgent] = useState('human_supervisor');

  // Human-in-the-Loop Workbench & Feedback State
  const [feedbackList, setFeedbackList] = useState<AgentFeedbackItem[]>([]);
  const [activeReviewPatch, setActiveReviewPatch] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);

  // Production IaC & Terraform State
  const [terraformBundle, setTerraformBundle] = useState<TerraformBundle | null>(null);
  const [selectedTfFile, setSelectedTfFile] = useState<string>('main.tf');
  const [isLoadingTerraform, setIsLoadingTerraform] = useState(false);

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
      setReadinessReport(null);
      setChunks([]);
      setAuditReport(null);
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

    fetch(`/api/v1/projects/${activeProject.id}/data-readiness`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((rep: DataReadinessReport | null) => setReadinessReport(rep))
      .catch(() => setReadinessReport(null));

    fetch(`/api/v1/projects/${activeProject.id}/chunks?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((cList: DocumentChunk[]) => setChunks(cList))
      .catch(() => setChunks([]));

    fetch(`/api/v1/projects/${activeProject.id}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((rep: AuditReport | null) => setAuditReport(rep))
      .catch(() => setAuditReport(null));

    fetch(`/api/v1/projects/${activeProject.id}/agents/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((hist: AgentExecution[]) => {
        setAgentHistory(hist);
        if (hist.length > 0) {
          setCurrentExecution(hist[0]);
        } else {
          setCurrentExecution(null);
        }
      })
      .catch(() => {
        setAgentHistory([]);
        setCurrentExecution(null);
      });

    fetch(`/api/v1/projects/${activeProject.id}/agents/memory`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((bb: AgentBlackboard | null) => setBlackboardData(bb))
      .catch(() => setBlackboardData(null));

    fetch(`/api/v1/projects/${activeProject.id}/workbench/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((fList: AgentFeedbackItem[]) => setFeedbackList(fList))
      .catch(() => setFeedbackList([]));

    fetch(`/api/v1/projects/${activeProject.id}/infra/terraform`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((bundle: TerraformBundle | null) => setTerraformBundle(bundle))
      .catch(() => setTerraformBundle(null));
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
    setReadinessReport(null);
    setChunks([]);
    setAuditReport(null);
    setAgentHistory([]);
    setCurrentExecution(null);
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
      addToast('success', `Client workspace '${ws.name}' provisioned.`, 'Workspace Created');
    } catch (err: any) {
      addToast('error', err.message, 'Workspace Creation Failed');
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
      addToast('success', `Enterprise project '${proj.name}' initialized.`, 'Project Created');
    } catch (err: any) {
      addToast('error', err.message, 'Project Creation Failed');
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
      addToast('success', `Deterministic diagnostics flagged ${data.findings.length} findings with line citations.`, 'Diagnostics Complete');
    } catch (err: any) {
      addToast('error', err.message, 'Diagnostics Failed');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Run Data Readiness Handler
  const handleAssessReadiness = async () => {
    if (!token || !activeProject) return;
    setIsAssessingReadiness(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/data-readiness`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Data readiness assessment failed');
      setReadinessReport(data);

      const chunksRes = await fetch(`/api/v1/projects/${activeProject.id}/chunks?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (chunksRes.ok) {
        const chunkData = await chunksRes.json();
        setChunks(chunkData);
      }
      setActiveTab('readiness');
      addToast('success', `Vertex AI Data Readiness: ${data.overall_score.toFixed(1)}% readiness index.`, 'Readiness Assessed');
    } catch (err: any) {
      addToast('error', err.message, 'Readiness Assessment Failed');
    } finally {
      setIsAssessingReadiness(false);
    }
  };

  // Download Audit Report Handler
  const handleDownloadReport = (format: 'markdown' | 'json') => {
    if (!token || !activeProject) return;
    const url = `/api/v1/projects/${activeProject.id}/report/download?format=${format}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to download report');
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '_')}_audit_report.${format === 'json' ? 'json' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        addToast('success', `Audit report exported as .${format === 'json' ? 'json' : 'md'}.`, 'Export Successful');
      })
      .catch((err) => addToast('error', err.message, 'Download Error'));
  };

  const handleRefreshReport = async () => {
    if (!token || !activeProject) return;
    setIsLoadingReport(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data);
      }
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Agent Reasoning Handler
  const handleRunAgentReasoning = async () => {
    if (!token || !activeProject) return;
    setIsAgentRunning(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/reason`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_type: selectedAgentType,
          custom_instruction: customInstruction.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Agent execution failed');
      setCurrentExecution(data);
      setAgentHistory([data, ...agentHistory]);
      setActiveTab('agents');
      addToast('success', `${selectedAgentType.toUpperCase()} reasoning stage completed.`, 'Agent Finished');
    } catch (err: any) {
      addToast('error', err.message, 'Agent Execution Failed');
    } finally {
      setIsAgentRunning(false);
    }
  };

  // 4-Agent Collaborative Pipeline Handler
  const handleRunPipeline = async () => {
    if (!token || !activeProject) return;
    setIsPipelineRunning(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_instruction: customInstruction.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Pipeline execution failed');

      // Refresh history and blackboard
      const histRes = await fetch(`/api/v1/projects/${activeProject.id}/agents/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        setAgentHistory(histData);
        if (histData.length > 0) setCurrentExecution(histData[0]);
      }

      await fetchBlackboard();
      addToast('success', 'Autonomous 4-Agent Collaborative Pipeline completed. Unified diffs generated.', 'Pipeline Finished');
    } catch (err: any) {
      addToast('error', err.message, 'Pipeline Failed');
    } finally {
      setIsPipelineRunning(false);
    }
  };

  const fetchBlackboard = async () => {
    if (!token || !activeProject) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/memory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlackboardData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch blackboard', err);
    }
  };

  const handlePublishMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeProject || !newMemoryKey.trim()) return;
    try {
      let parsedVal: any = newMemoryValue;
      try {
        parsedVal = JSON.parse(newMemoryValue);
      } catch {
        parsedVal = { note: newMemoryValue };
      }
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/memory`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: newMemoryKey.trim(),
          value: parsedVal,
          source_agent: newMemoryAgent.trim() || 'human_supervisor',
          confidence: 1.0,
        }),
      });
      if (!res.ok) throw new Error('Failed to publish memory constraint');
      setNewMemoryKey('');
      setNewMemoryValue('');
      setShowInjectMemory(false);
      await fetchBlackboard();
      addToast('success', `Constraint '${newMemoryKey.trim()}' published to shared memory bus.`, 'Memory Injected');
    } catch (err: any) {
      addToast('error', err.message, 'Memory Injection Failed');
    }
  };

  const handleClearMemory = async () => {
    if (!token || !activeProject) return;
    if (!window.confirm('Clear all shared memory bus keys for this project?')) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/memory`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to clear memory');
      await fetchBlackboard();
      addToast('info', 'Blackboard memory bus cleared.', 'Memory Bus Reset');
    } catch (err: any) {
      addToast('error', err.message, 'Memory Clear Failed');
    }
  };

  // Human-in-the-Loop Workbench Handlers
  const fetchFeedback = async () => {
    if (!token || !activeProject) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/workbench/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedbackList(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch feedback history', err);
    }
  };

  const handleApplyPatch = async (patchContent: string, findingId?: string) => {
    if (!token || !activeProject) return;
    setIsApplyingPatch(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/workbench/apply-patch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patch_content: patchContent,
          finding_id: findingId || undefined,
          reviewer_comments: reviewComments.trim() || 'Approved and applied via Human-in-the-Loop Workbench',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to apply patch');

      // Update local findings if finding was resolved
      if (data.finding_id && data.finding_status) {
        setFindings(
          findings.map((f) => (f.id === data.finding_id ? { ...f, status: data.finding_status as any } : f))
        );
      }

      await fetchFeedback();
      await fetchBlackboard();
      setActiveReviewPatch(null);
      setReviewComments('');
      addToast('success', data.message || 'Remediation patch applied safely to repository disk files.', 'Patch Applied');
    } catch (err: any) {
      addToast('error', err.message, 'Patch Application Failed');
    } finally {
      setIsApplyingPatch(false);
    }
  };

  const handleSubmitReview = async (
    action: 'approve' | 'reject' | 'modify',
    content: string,
    targetType: string = 'patch',
    findingId?: string
  ) => {
    if (!token || !activeProject) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/workbench/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          target_type: targetType,
          original_content: content,
          finding_id: findingId || undefined,
          reviewer_comments: reviewComments.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit review');

      await fetchFeedback();
      await fetchBlackboard();
      setActiveReviewPatch(null);
      setReviewComments('');
      addToast('success', `Human review decision '${action.toUpperCase()}' recorded to audit ledger.`, 'Decision Recorded');
    } catch (err: any) {
      addToast('error', err.message, 'Review Submission Failed');
    }
  };

  // IaC Terraform Handlers
  const fetchTerraformBundle = async () => {
    if (!token || !activeProject) return;
    setIsLoadingTerraform(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/infra/terraform`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTerraformBundle(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch Terraform bundle', err);
    } finally {
      setIsLoadingTerraform(false);
    }
  };

  const handleDownloadTerraformZip = async () => {
    if (!token || !activeProject) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/infra/terraform/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download Terraform bundle');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-terraform.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      addToast('success', 'Complete Terraform archive (.zip) downloaded.', 'Download Started');
    } catch (err: any) {
      addToast('error', err.message, 'Terraform Download Failed');
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
      addToast('info', `Finding marked as ${newStatus}.`, 'Status Updated');
    } catch (err: any) {
      addToast('error', err.message, 'Status Update Failed');
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

  const filteredChunks = chunks.filter((c) => {
    if (!chunkSearch.trim()) return true;
    const q = chunkSearch.toLowerCase();
    return (
      c.file_path.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q) ||
      (c.metadata?.headings && c.metadata.headings.some((h) => h.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Radiant Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.14),rgba(6,182,212,0.05),transparent)] z-0" />

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-[#080d1a]/95 backdrop-blur-xl px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white font-sans">
                StrataForge
              </span>
            </div>
          </div>

          {/* Breadcrumb Hierarchy */}
          {currentUser && activeWorkspace && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-300 hover:border-slate-700 transition-colors">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
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

              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

              {activeProject ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-300">
                    <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <select
                      className="bg-transparent text-cyan-200 font-medium focus:outline-none cursor-pointer max-w-[190px] truncate"
                      value={activeProject?.id || ''}
                      onChange={(e) => {
                        const proj = projects.find((p) => p.id === e.target.value);
                        if (proj) setActiveProject(proj);
                      }}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Indicator */}
                  {findings.length === 0 && activeProject.status === 'ready_for_deployment' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready for Cloud Run
                    </span>
                  ) : findings.length > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {findings.length} Findings Open
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Global Search & User Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 w-60 hover:border-slate-700 transition-colors cursor-text">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400">Search rules, findings...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">⌘K</kbd>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-slate-200">{currentUser.full_name || currentUser.email}</span>
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
              className="text-xs flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#080d19] p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">
              Auditing & Security
            </div>
            {[
              { id: 'overview', label: 'Platform Overview', icon: Layers },
              { id: 'diagnostics', label: 'Static Diagnostics', icon: Activity, count: findings.length },
              { id: 'workbench', label: 'Remediation Workbench', icon: ClipboardCheck, badge: auditReport ? `${auditReport.production_readiness.readiness_index}%` : undefined },
              { id: 'readiness', label: 'Data & RAG Readiness', icon: Database, badge: readinessReport ? `${readinessReport.overall_score}%` : undefined },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-950/50 border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`} />
                    {item.label}
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800/60 font-mono font-semibold">
                      {item.count}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950 text-cyan-300 border border-indigo-800/60 font-mono font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pt-5 py-2">
              Cloud & Automation
            </div>
            {[
              { id: 'agents', label: 'Autonomous Subagents', icon: Cpu, badge: agentHistory.length > 0 ? `${agentHistory.length}` : undefined },
              { id: 'discovery', label: 'Archive Inventory', icon: Terminal },
              { id: 'workspaces', label: 'Workspaces', icon: Briefcase, count: workspaces.length },
              { id: 'projects', label: 'Client Projects', icon: FolderGit2, count: projects.length },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-950/50 border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`} />
                    {item.label}
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                      {item.count}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950 text-cyan-300 border border-indigo-800/60 font-mono font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Clean Infrastructure Target Footer */}
          <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium text-slate-400">Target Platform</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">Production</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Cloud Run v2 (asia-south1)</span>
              <span className="flex items-center gap-1.5 font-mono text-emerald-400 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${health ? 'bg-emerald-400 animate-pulse' : loading ? 'bg-amber-400' : 'bg-rose-400'}`} />
                {health ? 'Live' : loading ? 'Connecting...' : error || 'Offline'}
              </span>
            </div>
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
                    <h2 className="text-xl font-bold text-white mb-1.5 font-sans">
                      Deployment Pre-Flight & Architecture Audit
                    </h2>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Automated static vulnerability analysis, AST evidence extraction, and production readiness governance for Google Cloud Run.
                    </p>
                  </div>
                  {currentUser && inventory && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunDiagnostics}
                        disabled={isDiagnosing}
                        className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" /> {isDiagnosing ? 'Running Rules...' : 'Run Diagnostics'}
                      </button>
                      <button
                        onClick={handleAssessReadiness}
                        disabled={isAssessingReadiness}
                        className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                      >
                        <Database className="w-3.5 h-3.5" /> {isAssessingReadiness ? 'Evaluating...' : 'Assess Readiness'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">
                    Zero-Execution AST Sandbox
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">
                    100% Grounded Line Citations
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">
                    Multi-Tenant Workspace Isolation
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">
                    Google Cloud Run v2 Standards
                  </span>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium uppercase mb-1">Data & RAG Readiness</div>
                  <div className="text-xl font-bold flex items-center gap-1.5 text-base">
                    {readinessReport ? (
                      <span className={readinessReport.overall_score >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                        {readinessReport.overall_score}% Ready
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal text-sm">Not Assessed</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {readinessReport ? `${chunks.length} chunks indexed` : 'Structured & RAG evaluation'}
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

          {/* TAB: DATA & RAG READINESS */}
          {activeTab === 'readiness' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Data Readiness & RAG Suitability Engine
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deterministic evaluation of SQL schemas and hierarchical document chunking for production RAG pipelines.
                  </p>
                </div>
                {currentUser && inventory && (
                  <button
                    onClick={handleAssessReadiness}
                    disabled={isAssessingReadiness}
                    className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAssessingReadiness ? 'Evaluating Data...' : 'Run Readiness Assessment'}
                  </button>
                )}
              </div>

              {!readinessReport ? (
                <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
                  <Database className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white">No Assessment Performed Yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Upload an enterprise project archive and click "Run Readiness Assessment" to evaluate schema integrity and generate semantic document chunks.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Scoreboard Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400 text-xs font-medium uppercase mb-1">Overall RAG Readiness</div>
                      <div className={`text-2xl font-black ${readinessReport.overall_score >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {readinessReport.overall_score}%
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {readinessReport.overall_score >= 70 ? 'Production Ready' : 'Needs Schema/Docs Attention'}
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400 text-xs font-medium uppercase mb-1">Structured Data Score</div>
                      <div className="text-2xl font-black text-blue-400">
                        {readinessReport.structured_score}%
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {readinessReport.metrics.structured.tables_with_primary_key} / {readinessReport.metrics.structured.total_tables} PK constraints
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400 text-xs font-medium uppercase mb-1">Unstructured RAG Score</div>
                      <div className="text-2xl font-black text-indigo-400">
                        {readinessReport.unstructured_score}%
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {readinessReport.metrics.unstructured.chunks_with_headings} / {readinessReport.total_chunks} heading-aligned chunks
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400 text-xs font-medium uppercase mb-1">Indexed Chunks</div>
                      <div className="text-2xl font-black text-purple-400">
                        {readinessReport.total_chunks}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        ~{readinessReport.metrics.unstructured.total_tokens_estimated} tokens extracted
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-400" />
                      Readiness Findings & Remediation Recommendations
                    </h3>
                    <div className="space-y-2">
                      {readinessReport.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300"
                        >
                          <div className="mt-0.5 text-blue-400">•</div>
                          <div className="leading-relaxed">{rec}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chunks Explorer */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-400" />
                          Document Chunks Explorer ({filteredChunks.length})
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Deterministic sliding window chunking with line tracking and markdown hierarchy tags.
                        </p>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          value={chunkSearch}
                          onChange={(e) => setChunkSearch(e.target.value)}
                          placeholder="Search chunks, paths, headings..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {filteredChunks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 border border-slate-800/60 rounded-lg">
                        No chunks match your search query.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {filteredChunks.map((chunk) => (
                          <div
                            key={chunk.id}
                            className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-blue-400" />
                                <span className="font-mono text-slate-200 font-semibold">{chunk.file_path}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                  Chunk #{chunk.chunk_index}
                                </span>
                                {chunk.metadata?.line_start && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                    L{chunk.metadata.line_start}-L{chunk.metadata.line_end}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
                                  ~{chunk.token_count} tokens
                                </span>
                              </div>
                            </div>

                            {chunk.metadata?.headings && chunk.metadata.headings.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="text-slate-500">Section:</span>
                                {chunk.metadata.headings.map((h, hIdx) => (
                                  <span
                                    key={hIdx}
                                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                                  >
                                    #{h}
                                  </span>
                                ))}
                              </div>
                            )}

                            <pre className="p-3 bg-[#0a0e17] rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-900">
                              {chunk.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: PRODUCTION READINESS WORKBENCH */}
          {activeTab === 'workbench' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-400" />
                    Production Readiness Workbench
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unified audit report synthesising static security, containerization, and data readiness for Google Cloud Run.
                  </p>
                </div>
                {currentUser && activeProject && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleRefreshReport}
                      disabled={isLoadingReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isLoadingReport ? 'Refreshing...' : 'Re-compute'}
                    </button>
                    <button
                      onClick={() => handleDownloadReport('markdown')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Report (.md)
                    </button>
                    <button
                      onClick={() => handleDownloadReport('json')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      JSON
                    </button>
                  </div>
                )}
              </div>

              {!auditReport ? (
                <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
                  <ClipboardCheck className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white">No Audit Report Available</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Upload an enterprise project archive and run diagnostics to generate the complete Google Cloud readiness audit.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Executive Summary Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-[#0d1424] border border-slate-800 space-y-6 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
                      <div>
                        <div className="text-[11px] font-mono text-slate-500 mb-1">
                          Audit ID: {auditReport.report_id} &bull; Generated: {new Date(auditReport.generated_at).toLocaleString()}
                        </div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                          {auditReport.project.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Target Environment: <span className="font-semibold text-blue-400">Google Cloud Run (Serverless Container)</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-4 rounded-xl border border-slate-800">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400 uppercase font-medium">Production Index</div>
                          <div className="text-xs font-semibold text-slate-300 mt-0.5">
                            {auditReport.production_readiness.verdict}
                          </div>
                        </div>
                        <div
                          className={`text-3xl font-black px-4 py-2 rounded-xl ${
                            auditReport.production_readiness.color === 'emerald'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                              : auditReport.production_readiness.color === 'amber'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {auditReport.production_readiness.readiness_index}%
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 font-medium">Static Security & AST</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {auditReport.production_readiness.score_breakdown.diagnostics_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${auditReport.production_readiness.score_breakdown.diagnostics_score}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          {auditReport.production_readiness.severity_summary.total_unresolved} open defect(s)
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 font-medium">Infrastructure & Containers</span>
                          <span className="text-xs font-mono font-bold text-blue-400">
                            {auditReport.production_readiness.score_breakdown.infrastructure_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${auditReport.production_readiness.score_breakdown.infrastructure_score}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          Base image, user UID & probes
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 font-medium">Data Readiness & RAG</span>
                          <span className="text-xs font-mono font-bold text-purple-400">
                            {auditReport.production_readiness.score_breakdown.data_readiness_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full"
                            style={{ width: `${auditReport.production_readiness.score_breakdown.data_readiness_score}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          {auditReport.data_readiness.total_chunks} indexed document chunk(s)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Run Deployment Checklist */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      Google Cloud Run Deployment Gate Checklist
                    </h3>
                    <div className="space-y-2">
                      {auditReport.cloud_run_checklist.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-white flex items-center gap-2">
                              {item.item}
                            </div>
                            <div className="text-[11px] text-slate-400">{item.notes}</div>
                          </div>
                          <div>
                            {item.status === 'PASS' ? (
                              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                                <XCircle className="w-3.5 h-3.5" /> FAIL
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Remediation Tracker */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Actionable Remediation Matrix ({auditReport.remediation_checklist.length} items)
                    </h3>
                    {auditReport.remediation_checklist.length === 0 ? (
                      <div className="p-6 text-center text-xs text-emerald-400 border border-emerald-900/40 bg-emerald-950/20 rounded-xl">
                        🎉 All enterprise security and readiness checks passed. Ready for container build and Cloud Run deployment!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {auditReport.remediation_checklist.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                    item.severity === 'critical'
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : item.severity === 'high'
                                      ? 'bg-orange-950 text-orange-400 border border-orange-800'
                                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                                  }`}
                                >
                                  {item.severity}
                                </span>
                                <span className="font-semibold text-white">{item.title}</span>
                                <span className="font-mono text-slate-400 text-[11px]">[{item.rule_id}]</span>
                              </div>
                              <span className="font-mono text-slate-400 text-[11px]">{item.file_path} {item.lines !== 'N/A' && `(${item.lines})`}</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              <strong className="text-slate-400">Remediation:</strong> {item.action}
                            </p>
                            <div className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2.5 py-1 rounded">
                              Validate: {item.validation}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Human-in-the-Loop Audit & Feedback History */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <GitPullRequest className="w-4 h-4 text-emerald-400" />
                        Human-in-the-Loop Audit & Review Trail ({feedbackList.length} decisions)
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Enterprise Sign-off Gate
                      </span>
                    </div>

                    {feedbackList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No engineer sign-offs or reviews recorded yet. Run the agent pipeline to generate code patches, then approve and apply them to record decisions.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbackList.map((item) => (
                          <div key={item.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                    item.status === 'applied'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : item.action === 'approve'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {item.status === 'applied' ? 'Applied to Code' : item.action}
                                </span>
                                <span className="font-semibold text-white uppercase text-[11px] font-mono">
                                  {item.target_type}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                Reviewed by <span className="text-slate-200">{item.reviewer_name}</span> &bull; {new Date(item.created_at).toLocaleString()}
                              </div>
                            </div>
                            {item.reviewer_comments && (
                              <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 italic">
                                &ldquo;{item.reviewer_comments}&rdquo;
                              </p>
                            )}
                            {item.applied_patch_summary && (
                              <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                {item.applied_patch_summary}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Production Infrastructure as Code (Terraform) */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          Production Infrastructure as Code (Terraform & GCP Cloud Run)
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                            Region: {terraformBundle?.region || 'asia-south1'}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Synthesized production HCL: Cloud Run v2, Serverless VPC Access connector, Cloud SQL PostgreSQL 16, Secret Manager, and least-privilege IAM service account.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={fetchTerraformBundle}
                          disabled={isLoadingTerraform}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isLoadingTerraform ? 'Synthesizing...' : 'Re-generate'}
                        </button>
                        <button
                          onClick={handleDownloadTerraformZip}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Bundle (.zip)
                        </button>
                      </div>
                    </div>

                    {terraformBundle ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-1">
                            {Object.keys(terraformBundle.files).map((filename) => (
                              <button
                                key={filename}
                                onClick={() => setSelectedTfFile(filename)}
                                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors ${
                                  selectedTfFile === filename
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                              >
                                {filename}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            {terraformBundle.is_valid ? (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" /> HCL Validated (Cloud Run v2 Verified)
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> {terraformBundle.validation_errors.length} Validation Warning(s)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="relative">
                          <pre className="p-4 bg-[#0a0e17] rounded-xl text-xs font-mono text-blue-200 overflow-x-auto max-h-96 whitespace-pre leading-relaxed border border-slate-800">
                            {terraformBundle.files[selectedTfFile] || 'File not found'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        Click "Re-generate" to synthesize the production Terraform plan for this project.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-400" />
                    Multi-Agent Reasoning Architecture
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                      Gemini + ADK Core
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Autonomous engineering personas reasoning over deterministic static facts with exact file and line grounding.
                  </p>
                </div>
              </div>

              {/* Subagent Persona Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'discovery',
                    title: 'Discovery Specialist',
                    icon: Terminal,
                    desc: 'Explains codebase topology, tech stacks, and microservice boundaries.',
                    tag: 'Architecture',
                    color: 'blue',
                  },
                  {
                    id: 'security',
                    title: 'Security Reviewer',
                    icon: ShieldCheck,
                    desc: 'Evaluates AST findings, hardcoded secrets, and CVSS root-cause impact.',
                    tag: 'Security & AST',
                    color: 'rose',
                  },
                  {
                    id: 'data_readiness',
                    title: 'Data & RAG Architect',
                    icon: Database,
                    desc: 'Analyzes SQL relational constraints, chunk density, and embedding suitability.',
                    tag: 'RAG Pipeline',
                    color: 'purple',
                  },
                  {
                    id: 'deployment_planner',
                    title: 'Cloud Run Strategist',
                    icon: Zap,
                    desc: 'Formulates Google Cloud Run migration specs, secret bindings, and probes.',
                    tag: 'Deployment',
                    color: 'emerald',
                  },
                ].map((agent) => {
                  const Icon = agent.icon;
                  const isSelected = selectedAgentType === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentType(agent.id as any)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500 shadow-md'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                          {agent.tag}
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-xs">{agent.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{agent.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action Box */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Optional Enterprise Constraint or Specific Prompt</span>
                    <span className="text-[11px] text-slate-500 font-normal">Grounded exclusively on uploaded code facts</span>
                  </label>
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="e.g. Focus on container startup latency and Secret Manager integration..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-blue-400" />
                    Model: <span className="font-mono text-slate-300">gemini-1.5-pro</span> (with deterministic grounding fallback)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunAgentReasoning}
                      disabled={isAgentRunning || isPipelineRunning || !activeProject}
                      className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                    >
                      <Bot className="w-4 h-4" />
                      {isAgentRunning ? 'Reasoning...' : 'Run Selected Agent'}
                    </button>
                    <button
                      onClick={handleRunPipeline}
                      disabled={isAgentRunning || isPipelineRunning || !activeProject}
                      className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      {isPipelineRunning ? 'Orchestrating 4-Agent Pipeline...' : 'Run 4-Agent Pipeline'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Blackboard & Shared Memory Bus Card */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-400">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                        Shared Agent Blackboard & Memory Bus
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                          {blackboardData?.total_keys || 0} Key{blackboardData?.total_keys !== 1 ? 's' : ''} Stored
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Inter-agent persistent state bus: subagents synchronize topology, risks, and deployment constraints here.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInjectMemory(!showInjectMemory)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showInjectMemory ? 'Cancel' : 'Inject Memory'}
                    </button>
                    {blackboardData && blackboardData.total_keys > 0 && (
                      <button
                        onClick={handleClearMemory}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition-all"
                        title="Clear all blackboard memories for this project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Bus
                      </button>
                    )}
                  </div>
                </div>

                {/* Inject Memory Form */}
                {showInjectMemory && (
                  <form onSubmit={handlePublishMemory} className="p-4 bg-slate-950 rounded-xl border border-blue-900/40 space-y-3">
                    <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" />
                      Inject Enterprise Architecture Constraint into Memory Bus
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Memory Key</label>
                        <input
                          type="text"
                          required
                          value={newMemoryKey}
                          onChange={(e) => setNewMemoryKey(e.target.value)}
                          placeholder="e.g. enterprise_compliance_target or custom_policy"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Source Agent / Role</label>
                        <input
                          type="text"
                          value={newMemoryAgent}
                          onChange={(e) => setNewMemoryAgent(e.target.value)}
                          placeholder="human_supervisor"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Value (JSON or Text Note)</label>
                      <textarea
                        required
                        rows={2}
                        value={newMemoryValue}
                        onChange={(e) => setNewMemoryValue(e.target.value)}
                        placeholder='{"region": "asia-south1", "max_instances": 10}'
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowInjectMemory(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Publish to Bus
                      </button>
                    </div>
                  </form>
                )}

                {/* Blackboard Keys Grid */}
                {blackboardData && blackboardData.memories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {blackboardData.memories.map((entry) => (
                      <div key={entry.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/90 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-blue-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                            {entry.key}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                            by {entry.source_agent}
                          </span>
                        </div>
                        <pre className="p-2.5 bg-[#0a0e17] rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40 border border-slate-800/60 leading-relaxed">
                          {JSON.stringify(entry.value, null, 2)}
                        </pre>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                          <span>Confidence: {(entry.confidence * 100).toFixed(0)}%</span>
                          <span>{new Date(entry.updated_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No memories published on the blackboard bus yet. Run the 4-Agent Pipeline or inject custom constraints above to initialize shared memory.
                  </div>
                )}
              </div>

              {/* Current Execution Output */}
              {currentExecution ? (
                <div className="space-y-6">
                  {/* Thought Chain Accordion */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        Autonomous Thought Chain ({currentExecution.thought_chain.length} Steps)
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {currentExecution.execution_time_ms}ms
                        </span>
                        <span>&bull;</span>
                        <span>~{currentExecution.tokens_used} tokens</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      {currentExecution.thought_chain.map((step) => (
                        <div
                          key={step.step_number}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 text-blue-400 font-semibold text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800/80">
                              Step {step.step_number}
                            </span>
                            <span>{step.thought}</span>
                          </div>
                          {step.action && (
                            <div className="text-slate-400 text-[11px] pl-2 border-l border-slate-800">
                              <span className="text-slate-500 font-mono">Action: </span>
                              {step.action}
                            </div>
                          )}
                          {step.observation && (
                            <div className="text-slate-300 text-[11px] pl-2 border-l border-blue-900/50">
                              <span className="text-emerald-400 font-mono">Observation: </span>
                              {step.observation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grounded Citations Drawer */}
                  {currentExecution.citations.length > 0 && (
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        <Quote className="w-4 h-4 text-emerald-400" />
                        Deterministic Evidence Citations ({currentExecution.citations.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentExecution.citations.map((c, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-xs"
                          >
                            <div className="font-mono text-blue-400 text-[11px] font-semibold flex items-center justify-between">
                              <span>{c.file_path}</span>
                              {c.line_start && (
                                <span className="text-slate-500">L{c.line_start}-{c.line_end}</span>
                              )}
                            </div>
                            <pre className="text-[10px] text-slate-300 font-mono bg-slate-900 p-2 rounded truncate">
                              {c.quote || 'Citing configuration block'}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formatted Markdown Analysis */}
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Bot className="w-4 h-4 text-blue-400" />
                      Agent Synthesis & Technical Advisory
                    </h3>
                    <div className="p-5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {currentExecution.output_markdown}
                    </div>
                  </div>

                  {/* Generated Artifacts Drawer (Patches & Terraform) */}
                  {currentExecution.structured_data && (currentExecution.structured_data.terraform_config || currentExecution.structured_data.unified_diff_patches) && (
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        Generated Production IaC & Automated Code Patches
                      </h3>
                      {currentExecution.structured_data.unified_diff_patches && currentExecution.structured_data.unified_diff_patches.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase">Git-Compatible Unified Diff Patches (Human Review Gate)</div>
                          {currentExecution.structured_data.unified_diff_patches.map((patch: string, pIdx: number) => {
                            const isApplied = feedbackList.some((f) => f.status === 'applied' && f.original_content === patch);
                            const isRejected = feedbackList.some((f) => f.action === 'reject' && f.original_content === patch);
                            return (
                              <div key={pIdx} className="space-y-2 p-3 bg-[#0a0e17] rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-mono text-slate-400">Patch #{pIdx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    {isApplied ? (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-mono">
                                        <Check className="w-3 h-3" /> Applied to Codebase
                                      </span>
                                    ) : isRejected ? (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 font-mono">
                                        <XCircle className="w-3 h-3" /> Rejected by Reviewer
                                      </span>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => setActiveReviewPatch(activeReviewPatch === patch ? null : patch)}
                                          className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
                                        >
                                          {activeReviewPatch === patch ? 'Cancel Note' : '+ Note'}
                                        </button>
                                        <button
                                          onClick={() => handleApplyPatch(patch)}
                                          disabled={isApplyingPatch}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                          <Check className="w-3 h-3" />
                                          {isApplyingPatch ? 'Applying...' : 'Approve & Apply'}
                                        </button>
                                        <button
                                          onClick={() => handleSubmitReview('reject', patch, 'patch')}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded text-xs font-medium transition-colors"
                                        >
                                          <ThumbsDown className="w-3 h-3" />
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {activeReviewPatch === patch && (
                                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                                    <label className="text-[11px] text-slate-300 block">Reviewer Note / Decision Rationale</label>
                                    <input
                                      type="text"
                                      value={reviewComments}
                                      onChange={(e) => setReviewComments(e.target.value)}
                                      placeholder="e.g. Approved dependency pin for production stability..."
                                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                )}
                                <DiffViewer diffText={patch} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {currentExecution.structured_data.terraform_config && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase">Google Cloud Run v2 Terraform Resource</div>
                            <div className="flex items-center gap-2">
                              <CopyButton text={currentExecution.structured_data.terraform_config} label="Copy HCL" />
                              {feedbackList.some((f) => f.target_type === 'terraform' && f.action === 'approve') ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1 font-mono">
                                  <Check className="w-3 h-3" /> IaC Approved
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSubmitReview('approve', currentExecution.structured_data.terraform_config, 'terraform')}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                                  >
                                    <ThumbsUp className="w-3 h-3" /> Approve IaC
                                  </button>
                                  <button
                                    onClick={() => handleSubmitReview('reject', currentExecution.structured_data.terraform_config, 'terraform')}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded text-xs font-medium transition-colors"
                                  >
                                    <ThumbsDown className="w-3 h-3" /> Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <pre className="p-3 bg-[#0a0e17] rounded-lg text-[11px] font-mono text-blue-300 overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                            {currentExecution.structured_data.terraform_config}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
                  <Bot className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white">No Agent Reasoning Executed Yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Select an engineering persona above and click "Run Agent Reasoning" to generate structured, evidence-backed recommendations.
                  </p>
                </div>
              )}

              {/* Execution History */}
              {agentHistory.length > 0 && (
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Agent Reasoning History ({agentHistory.length} runs)
                  </h3>
                  <div className="space-y-2">
                    {agentHistory.map((hist) => (
                      <div
                        key={hist.id}
                        onClick={() => setCurrentExecution(hist)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          currentExecution?.id === hist.id
                            ? 'bg-blue-950/20 border-blue-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Bot className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-semibold text-white uppercase font-mono">
                            {hist.agent_type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500">&bull;</span>
                          <span className="text-[11px] text-slate-400 font-mono">{hist.model_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          <span>{new Date(hist.created_at).toLocaleTimeString()}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {hist.citations.length} citation(s)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    title: 'Capstone Showcase & Google FDE Portfolio',
                    status: 'Completed (Tested)',
                    active: true,
                    details: 'Complete executive architecture blueprint, Google Cloud Consulting (GCC) competency showcase, full-stack test suite (100% pass), and deployment runbook.',
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

      {/* Modern Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
