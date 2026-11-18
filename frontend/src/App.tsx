import React, { useState, useEffect } from 'react';
import type {
  BackendHealth,
  ActiveTab,
  AgentType,
  Workspace,
  Project,
} from './types';
import { useAuth } from './hooks/useAuth';
import { useProject } from './hooks/useProject';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AuthModal } from './components/modals/AuthModal';
import { NewWorkspaceModal } from './components/modals/NewWorkspaceModal';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { OverviewView } from './components/views/OverviewView';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { ReadinessView } from './components/views/ReadinessView';
import { WorkbenchView } from './components/views/WorkbenchView';
import { AgentsView } from './components/views/AgentsView';
import { RoadmapView } from './components/views/RoadmapView';
import { WorkspacesView } from './components/views/WorkspacesView';
import { ProjectsView } from './components/views/ProjectsView';
import { DiscoveryView } from './components/views/DiscoveryView';

export default function App() {
  // Backend Health
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Custom Hooks
  const { toasts, addToast, removeToast } = useToast();
  const { token, currentUser, login, logout, register } = useAuth();
  const projectState = useProject(token);

  const {
    workspaces,
    setWorkspaces,
    activeWorkspace,
    setActiveWorkspace,
    projects,
    setProjects,
    activeProject,
    setActiveProject,
    inventory,
    setInventory,
    findings,
    setFindings,
    readinessReport,
    setReadinessReport,
    chunks,
    setChunks,
    auditReport,
    setAuditReport,
    agentHistory,
    setAgentHistory,
    currentExecution,
    setCurrentExecution,
    blackboardData,
    setBlackboardData,
    feedbackList,
    setFeedbackList,
    terraformBundle,
    setTerraformBundle,
    clearProjectData,
  } = projectState;

  // Local view-specific states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');

  const [isAssessingReadiness, setIsAssessingReadiness] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');

  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('discovery');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [showInjectMemory, setShowInjectMemory] = useState(false);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryAgent, setNewMemoryAgent] = useState('human_supervisor');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [activeReviewPatch, setActiveReviewPatch] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);

  const [selectedTfFile, setSelectedTfFile] = useState('main.tf');
  const [isLoadingTerraform, setIsLoadingTerraform] = useState(false);

  // Initial Health Check
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

  const handleLogout = () => {
    logout();
    clearProjectData();
    addToast('info', 'Logged out of StrataForge session.');
  };

  // Workspace Creation
  const handleCreateWorkspace = async (name: string, description: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/workspaces/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error('Failed to create workspace');
      const ws: Workspace = await res.json();
      setWorkspaces([ws, ...workspaces]);
      setActiveWorkspace(ws);
      addToast('success', `Client workspace '${ws.name}' provisioned.`, 'Workspace Created');
    } catch (err: any) {
      addToast('error', err.message, 'Workspace Creation Failed');
    }
  };

  // Project Creation
  const handleCreateProject = async (name: string, description: string, repository_url: string) => {
    if (!token || !activeWorkspace) return;
    try {
      const res = await fetch('/api/v1/projects/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          name,
          description,
          repository_url: repository_url || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const proj: Project = await res.json();
      setProjects([proj, ...projects]);
      setActiveProject(proj);
      addToast('success', `Enterprise project '${proj.name}' initialized.`, 'Project Created');
    } catch (err: any) {
      addToast('error', err.message, 'Project Creation Failed');
    }
  };

  // File Upload
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
      addToast('success', `Ingested archive: ${data.total_files} files classified.`, 'Upload Complete');
    } catch (err: any) {
      setUploadError(err.message);
      addToast('error', err.message, 'Upload Failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Diagnostics
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

  const handleUpdateFindingStatus = async (findingId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/findings/${findingId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      setFindings(findings.map((f) => (f.id === findingId ? { ...f, status: newStatus as any } : f)));
      addToast('info', `Finding marked as ${newStatus}.`, 'Status Updated');
    } catch (err: any) {
      addToast('error', err.message, 'Status Update Failed');
    }
  };

  // Data Readiness
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
        setChunks(await chunksRes.json());
      }
      setActiveTab('readiness');
      addToast('success', `Vertex AI Data Readiness: ${data.overall_score.toFixed(1)}% readiness index.`, 'Readiness Assessed');
    } catch (err: any) {
      addToast('error', err.message, 'Readiness Assessment Failed');
    } finally {
      setIsAssessingReadiness(false);
    }
  };

  // Reports
  const handleRefreshReport = async () => {
    if (!token || !activeProject) return;
    setIsLoadingReport(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuditReport(await res.json());
      }
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownloadReport = (format: 'markdown' | 'json') => {
    if (!token || !activeProject) return;
    const url = `/api/v1/projects/${activeProject.id}/report/download?format=${format}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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

  // Autonomous Agents
  const handleRunAgentReasoning = async () => {
    if (!token || !activeProject) return;
    setIsAgentRunning(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/reason`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

  const handleRunPipeline = async () => {
    if (!token || !activeProject) return;
    setIsPipelineRunning(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/agents/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instruction: customInstruction.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Pipeline execution failed');

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
      if (res.ok) setBlackboardData(await res.json());
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

  // Human Workbench & Feedback
  const fetchFeedback = async () => {
    if (!token || !activeProject) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/workbench/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFeedbackList(await res.json());
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patch_content: patchContent,
          finding_id: findingId || undefined,
          reviewer_comments: reviewComments.trim() || 'Approved and applied via Human-in-the-Loop Workbench',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to apply patch');

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
    action: 'approve' | 'reject',
    content: string,
    targetType: string = 'patch'
  ) => {
    if (!token || !activeProject) return;
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/workbench/feedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          target_type: targetType,
          original_content: content,
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

  // IaC / Terraform
  const fetchTerraformBundle = async () => {
    if (!token || !activeProject) return;
    setIsLoadingTerraform(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProject.id}/infra/terraform`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTerraformBundle(await res.json());
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

  // Filter computations
  const filteredFindings = findings.filter((f) => severityFilter === 'all' || f.severity === severityFilter);
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
      <Navbar
        currentUser={currentUser}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        activeProject={activeProject}
        projects={projects}
        findings={findings}
        onSetActiveWorkspace={setActiveWorkspace}
        onSetActiveProject={setActiveProject}
        onLogout={handleLogout}
        onShowAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          findingsCount={findings.length}
          agentHistoryCount={agentHistory.length}
          workspacesCount={workspaces.length}
          projectsCount={projects.length}
          readinessReport={readinessReport}
          auditReport={auditReport}
          health={health}
          loading={loading}
          error={error}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'overview' && (
            <OverviewView
              currentUser={currentUser}
              activeProject={activeProject}
              activeWorkspace={activeWorkspace}
              inventory={inventory}
              findings={findings}
              readinessReport={readinessReport}
              chunks={chunks}
              isDiagnosing={isDiagnosing}
              isAssessingReadiness={isAssessingReadiness}
              isUploading={isUploading}
              uploadError={uploadError}
              uploadSuccess={uploadSuccess}
              severityCounts={severityCounts}
              onRunDiagnostics={handleRunDiagnostics}
              onAssessReadiness={handleAssessReadiness}
              onFileUpload={handleFileUpload}
              onShowAuthModal={() => setShowAuthModal(true)}
              onShowNewWorkspaceModal={() => setShowNewWorkspaceModal(true)}
              onShowNewProjectModal={() => setShowNewProjectModal(true)}
              addToast={addToast}
            />
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsView
              currentUser={currentUser}
              inventory={inventory}
              findings={findings}
              filteredFindings={filteredFindings}
              severityCounts={severityCounts}
              severityFilter={severityFilter}
              isDiagnosing={isDiagnosing}
              onRunDiagnostics={handleRunDiagnostics}
              onSetSeverityFilter={setSeverityFilter}
              onUpdateFindingStatus={handleUpdateFindingStatus}
            />
          )}

          {activeTab === 'readiness' && (
            <ReadinessView
              currentUser={currentUser}
              inventory={inventory}
              readinessReport={readinessReport}
              filteredChunks={filteredChunks}
              chunkSearch={chunkSearch}
              isAssessingReadiness={isAssessingReadiness}
              onAssessReadiness={handleAssessReadiness}
              onSetChunkSearch={setChunkSearch}
            />
          )}

          {activeTab === 'workbench' && (
            <WorkbenchView
              currentUser={currentUser}
              activeProject={activeProject}
              auditReport={auditReport}
              isLoadingReport={isLoadingReport}
              handleRefreshReport={handleRefreshReport}
              handleDownloadReport={handleDownloadReport}
              feedbackList={feedbackList}
              terraformBundle={terraformBundle}
              selectedTfFile={selectedTfFile}
              setSelectedTfFile={setSelectedTfFile}
              isLoadingTerraform={isLoadingTerraform}
              fetchTerraformBundle={fetchTerraformBundle}
              handleDownloadTerraformZip={handleDownloadTerraformZip}
            />
          )}

          {activeTab === 'agents' && (
            <AgentsView
              activeProject={activeProject}
              selectedAgentType={selectedAgentType}
              setSelectedAgentType={setSelectedAgentType}
              customInstruction={customInstruction}
              setCustomInstruction={setCustomInstruction}
              isAgentRunning={isAgentRunning}
              isPipelineRunning={isPipelineRunning}
              handleRunAgentReasoning={handleRunAgentReasoning}
              handleRunPipeline={handleRunPipeline}
              blackboardData={blackboardData}
              showInjectMemory={showInjectMemory}
              setShowInjectMemory={setShowInjectMemory}
              handleClearMemory={handleClearMemory}
              handlePublishMemory={handlePublishMemory}
              newMemoryKey={newMemoryKey}
              setNewMemoryKey={setNewMemoryKey}
              newMemoryAgent={newMemoryAgent}
              setNewMemoryAgent={setNewMemoryAgent}
              newMemoryValue={newMemoryValue}
              setNewMemoryValue={setNewMemoryValue}
              currentExecution={currentExecution}
              setCurrentExecution={setCurrentExecution}
              agentHistory={agentHistory}
              feedbackList={feedbackList}
              activeReviewPatch={activeReviewPatch}
              setActiveReviewPatch={setActiveReviewPatch}
              reviewComments={reviewComments}
              setReviewComments={setReviewComments}
              handleApplyPatch={handleApplyPatch}
              isApplyingPatch={isApplyingPatch}
              handleSubmitReview={handleSubmitReview}
            />
          )}

          {activeTab === 'roadmap' && <RoadmapView />}

          {activeTab === 'workspaces' && (
            <WorkspacesView
              currentUser={currentUser}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              onSetActiveWorkspace={setActiveWorkspace}
              onShowNewWorkspaceModal={() => setShowNewWorkspaceModal(true)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              currentUser={currentUser}
              activeWorkspace={activeWorkspace}
              projects={projects}
              activeProject={activeProject}
              onSetActiveProject={setActiveProject}
              onShowNewProjectModal={() => setShowNewProjectModal(true)}
            />
          )}

          {activeTab === 'discovery' && <DiscoveryView inventory={inventory} />}
        </main>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          onLogin={login}
          onRegister={register}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showNewWorkspaceModal && (
        <NewWorkspaceModal
          onSubmit={handleCreateWorkspace}
          onClose={() => setShowNewWorkspaceModal(false)}
        />
      )}

      {showNewProjectModal && (
        <NewProjectModal
          onSubmit={handleCreateProject}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
