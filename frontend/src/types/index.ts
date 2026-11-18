export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  api_version?: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  repository_url?: string;
  status: string;
  created_at: string;
}

export interface ProjectFile {
  id: string;
  relative_path: string;
  filename: string;
  category: string;
  file_type: string;
  size_bytes: number;
  line_count: number;
}

export interface EnvironmentInventory {
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

export interface Finding {
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

export interface DataReadinessMetrics {
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

export interface DataReadinessReport {
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

export interface DocumentChunk {
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

export interface AuditReport {
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

export interface Citation {
  file_path: string;
  line_start?: number;
  line_end?: number;
  quote: string;
}

export interface ThoughtStep {
  step_number: number;
  thought: string;
  action?: string;
  observation?: string;
}

export interface AgentExecution {
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

export interface AgentMemoryEntry {
  id: string;
  project_id: string;
  key: string;
  source_agent: string;
  value: any;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface AgentBlackboard {
  project_id: string;
  blackboard: Record<string, any>;
  memories: AgentMemoryEntry[];
  total_keys: number;
}

export interface AgentFeedbackItem {
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

export interface TerraformBundle {
  project_id: string;
  region: string;
  files: Record<string, string>;
  is_valid: boolean;
  validation_errors: string[];
}

export type ActiveTab =
  | 'overview'
  | 'workspaces'
  | 'projects'
  | 'discovery'
  | 'diagnostics'
  | 'readiness'
  | 'workbench'
  | 'agents'
  | 'roadmap';

export type AgentType = 'discovery' | 'security' | 'data_readiness' | 'deployment_planner';
