import { useState, useEffect } from 'react';
import type {
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
} from '../types';
import { workspaces as wsApi, projects as projApi } from '../services/api';

export function useProject(token: string | null) {
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Data state
  const [inventory, setInventory] = useState<EnvironmentInventory | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [readinessReport, setReadinessReport] = useState<DataReadinessReport | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [agentHistory, setAgentHistory] = useState<AgentExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<AgentExecution | null>(null);
  const [blackboardData, setBlackboardData] = useState<AgentBlackboard | null>(null);
  const [feedbackList, setFeedbackList] = useState<AgentFeedbackItem[]>([]);
  const [terraformBundle, setTerraformBundle] = useState<TerraformBundle | null>(null);

  // Fetch workspaces when token changes
  useEffect(() => {
    if (!token) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }
    wsApi
      .list(token)
      .then((data) => {
        setWorkspaces(data);
        if (data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(data[0]);
        }
      })
      .catch(console.error);
  }, [token]);

  // Fetch projects when workspace changes
  useEffect(() => {
    if (!token || !activeWorkspace) {
      setProjects([]);
      setActiveProject(null);
      setInventory(null);
      setFindings([]);
      return;
    }
    projApi
      .list(token, activeWorkspace.id)
      .then((data) => {
        setProjects(data);
        if (data.length > 0 && (!activeProject || activeProject.workspace_id !== activeWorkspace.id)) {
          setActiveProject(data[0]);
        }
      })
      .catch(console.error);
  }, [token, activeWorkspace]);

  // Fetch all project-level data when active project changes
  useEffect(() => {
    if (!token || !activeProject) {
      setInventory(null);
      setFindings([]);
      setReadinessReport(null);
      setChunks([]);
      setAuditReport(null);
      return;
    }

    const pid = activeProject.id;
    const h = { Authorization: `Bearer ${token}` };

    fetch(`/api/v1/projects/${pid}/inventory`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((inv) => setInventory(inv))
      .catch(() => setInventory(null));

    fetch(`/api/v1/projects/${pid}/findings`, { headers: h })
      .then((r) => (r.ok ? r.json() : []))
      .then((f) => setFindings(f))
      .catch(() => setFindings([]));

    fetch(`/api/v1/projects/${pid}/data-readiness`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((rep) => setReadinessReport(rep))
      .catch(() => setReadinessReport(null));

    fetch(`/api/v1/projects/${pid}/chunks?limit=100`, { headers: h })
      .then((r) => (r.ok ? r.json() : []))
      .then((c) => setChunks(c))
      .catch(() => setChunks([]));

    fetch(`/api/v1/projects/${pid}/report`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((rep) => setAuditReport(rep))
      .catch(() => setAuditReport(null));

    fetch(`/api/v1/projects/${pid}/agents/history`, { headers: h })
      .then((r) => (r.ok ? r.json() : []))
      .then((hist: AgentExecution[]) => {
        setAgentHistory(hist);
        setCurrentExecution(hist.length > 0 ? hist[0] : null);
      })
      .catch(() => { setAgentHistory([]); setCurrentExecution(null); });

    fetch(`/api/v1/projects/${pid}/agents/memory`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((bb) => setBlackboardData(bb))
      .catch(() => setBlackboardData(null));

    fetch(`/api/v1/projects/${pid}/workbench/feedback`, { headers: h })
      .then((r) => (r.ok ? r.json() : []))
      .then((fl) => setFeedbackList(fl))
      .catch(() => setFeedbackList([]));

    fetch(`/api/v1/projects/${pid}/infra/terraform`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((bundle) => setTerraformBundle(bundle))
      .catch(() => setTerraformBundle(null));
  }, [token, activeProject?.id]);

  const clearProjectData = () => {
    setInventory(null);
    setFindings([]);
    setReadinessReport(null);
    setChunks([]);
    setAuditReport(null);
    setAgentHistory([]);
    setCurrentExecution(null);
  };

  return {
    workspaces, setWorkspaces,
    activeWorkspace, setActiveWorkspace,
    projects, setProjects,
    activeProject, setActiveProject,
    inventory, setInventory,
    findings, setFindings,
    readinessReport, setReadinessReport,
    chunks, setChunks,
    auditReport, setAuditReport,
    agentHistory, setAgentHistory,
    currentExecution, setCurrentExecution,
    blackboardData, setBlackboardData,
    feedbackList, setFeedbackList,
    terraformBundle, setTerraformBundle,
    clearProjectData,
  };
}
