import type {
  User,
  Workspace,
  Project,
  EnvironmentInventory,
  Finding,
  DataReadinessReport,
  DocumentChunk,
  AuditReport,
  AgentExecution,
  AgentBlackboard,
  AgentFeedbackItem,
  TerraformBundle,
  AgentType,
} from '../types';

// ---------------------------------------------------------------------------
// Base fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as any)?.detail || `HTTP ${res.status}`);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, full_name: string) =>
    apiFetch<{ access_token: string; user: User }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),

  getMe: (token: string) =>
    apiFetch<User>('/api/v1/auth/me', {}, token),
};

// ---------------------------------------------------------------------------
// workspaces
// ---------------------------------------------------------------------------
export const workspaces = {
  list: (token: string) =>
    apiFetch<Workspace[]>('/api/v1/workspaces/', {}, token),

  create: (token: string, name: string, description: string) =>
    apiFetch<Workspace>('/api/v1/workspaces/', { method: 'POST', body: JSON.stringify({ name, description }) }, token),
};

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
export const projects = {
  list: (token: string, workspace_id: string) =>
    apiFetch<Project[]>(`/api/v1/projects/?workspace_id=${workspace_id}`, {}, token),

  create: (
    token: string,
    workspace_id: string,
    name: string,
    description: string,
    repository_url?: string
  ) =>
    apiFetch<Project>(
      '/api/v1/projects/',
      { method: 'POST', body: JSON.stringify({ workspace_id, name, description, repository_url }) },
      token
    ),
};

// ---------------------------------------------------------------------------
// artifacts
// ---------------------------------------------------------------------------
export const artifacts = {
  getInventory: (token: string, projectId: string) =>
    apiFetch<EnvironmentInventory | null>(`/api/v1/projects/${projectId}/inventory`, {}, token),

  upload: async (token: string, projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/v1/projects/${projectId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    return data as EnvironmentInventory;
  },
};

// ---------------------------------------------------------------------------
// diagnostics
// ---------------------------------------------------------------------------
export const diagnostics = {
  runDiagnostics: (token: string, projectId: string) =>
    apiFetch<{ findings: Finding[] }>(
      `/api/v1/projects/${projectId}/diagnose`,
      { method: 'POST' },
      token
    ),

  getFindings: (token: string, projectId: string) =>
    apiFetch<Finding[]>(`/api/v1/projects/${projectId}/findings`, {}, token),

  updateFindingStatus: (token: string, findingId: string, status: string) =>
    apiFetch<Finding>(`/api/v1/findings/${findingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, token),
};

// ---------------------------------------------------------------------------
// dataReadiness
// ---------------------------------------------------------------------------
export const dataReadiness = {
  assess: (token: string, projectId: string) =>
    apiFetch<DataReadinessReport>(
      `/api/v1/projects/${projectId}/data-readiness`,
      { method: 'POST' },
      token
    ),

  getReport: (token: string, projectId: string) =>
    apiFetch<DataReadinessReport | null>(`/api/v1/projects/${projectId}/data-readiness`, {}, token),

  getChunks: (token: string, projectId: string, limit = 100) =>
    apiFetch<DocumentChunk[]>(`/api/v1/projects/${projectId}/chunks?limit=${limit}`, {}, token),
};

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------
export const reports = {
  getAuditReport: (token: string, projectId: string) =>
    apiFetch<AuditReport | null>(`/api/v1/projects/${projectId}/report`, {}, token),

  downloadReport: async (token: string, projectId: string, projectName: string, format: 'markdown' | 'json') => {
    const res = await fetch(`/api/v1/projects/${projectId}/report/download?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to download report');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_audit_report.${format === 'json' ? 'json' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};

// ---------------------------------------------------------------------------
// agents
// ---------------------------------------------------------------------------
export const agents = {
  runReason: (
    token: string,
    projectId: string,
    agent_type: AgentType,
    custom_instruction?: string
  ) =>
    apiFetch<AgentExecution>(
      `/api/v1/projects/${projectId}/agents/reason`,
      { method: 'POST', body: JSON.stringify({ agent_type, custom_instruction: custom_instruction || undefined }) },
      token
    ),

  runPipeline: (token: string, projectId: string, custom_instruction?: string) =>
    apiFetch<any>(
      `/api/v1/projects/${projectId}/agents/pipeline`,
      { method: 'POST', body: JSON.stringify({ custom_instruction: custom_instruction || undefined }) },
      token
    ),

  getHistory: (token: string, projectId: string) =>
    apiFetch<AgentExecution[]>(`/api/v1/projects/${projectId}/agents/history`, {}, token),

  getMemory: (token: string, projectId: string) =>
    apiFetch<AgentBlackboard | null>(`/api/v1/projects/${projectId}/agents/memory`, {}, token),

  publishMemory: (
    token: string,
    projectId: string,
    key: string,
    value: any,
    source_agent: string
  ) =>
    apiFetch<any>(
      `/api/v1/projects/${projectId}/agents/memory`,
      { method: 'POST', body: JSON.stringify({ key, value, source_agent, confidence: 1.0 }) },
      token
    ),

  clearMemory: (token: string, projectId: string) =>
    apiFetch<any>(
      `/api/v1/projects/${projectId}/agents/memory`,
      { method: 'DELETE' },
      token
    ),
};

// ---------------------------------------------------------------------------
// workbench
// ---------------------------------------------------------------------------
export const workbench = {
  getFeedback: (token: string, projectId: string) =>
    apiFetch<AgentFeedbackItem[]>(`/api/v1/projects/${projectId}/workbench/feedback`, {}, token),

  applyPatch: (
    token: string,
    projectId: string,
    patch_content: string,
    reviewer_comments: string,
    finding_id?: string
  ) =>
    apiFetch<any>(
      `/api/v1/projects/${projectId}/workbench/apply-patch`,
      {
        method: 'POST',
        body: JSON.stringify({ patch_content, finding_id: finding_id || undefined, reviewer_comments }),
      },
      token
    ),

  submitReview: (
    token: string,
    projectId: string,
    action: 'approve' | 'reject' | 'modify',
    original_content: string,
    target_type: string,
    finding_id?: string,
    reviewer_comments?: string
  ) =>
    apiFetch<any>(
      `/api/v1/projects/${projectId}/workbench/feedback`,
      {
        method: 'POST',
        body: JSON.stringify({
          action,
          target_type,
          original_content,
          finding_id: finding_id || undefined,
          reviewer_comments: reviewer_comments || undefined,
        }),
      },
      token
    ),
};

// ---------------------------------------------------------------------------
// infra
// ---------------------------------------------------------------------------
export const infra = {
  getTerraform: (token: string, projectId: string) =>
    apiFetch<TerraformBundle | null>(`/api/v1/projects/${projectId}/infra/terraform`, {}, token),

  downloadTerraform: async (token: string, projectId: string, projectName: string) => {
    const res = await fetch(`/api/v1/projects/${projectId}/infra/terraform/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to download Terraform bundle');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-terraform.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};
