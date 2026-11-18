import React from 'react';
import {
  ClipboardCheck,
  Sparkles,
  Download,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  GitPullRequest,
  Check,
  Layers,
} from 'lucide-react';
import type { User, Project, AuditReport, AgentFeedbackItem, TerraformBundle } from '../../types';

interface WorkbenchViewProps {
  currentUser: User | null;
  activeProject: Project | null;
  auditReport: AuditReport | null;
  isLoadingReport: boolean;
  handleRefreshReport: () => Promise<void>;
  handleDownloadReport: (format: 'markdown' | 'json') => void;
  feedbackList: AgentFeedbackItem[];
  terraformBundle: TerraformBundle | null;
  selectedTfFile: string;
  setSelectedTfFile: (file: string) => void;
  isLoadingTerraform: boolean;
  fetchTerraformBundle: () => Promise<void>;
  handleDownloadTerraformZip: () => Promise<void>;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  currentUser,
  activeProject,
  auditReport,
  isLoadingReport,
  handleRefreshReport,
  handleDownloadReport,
  feedbackList,
  terraformBundle,
  selectedTfFile,
  setSelectedTfFile,
  isLoadingTerraform,
  fetchTerraformBundle,
  handleDownloadTerraformZip,
}) => {
  return (
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
  );
};
