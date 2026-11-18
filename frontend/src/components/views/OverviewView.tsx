import React, { useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  Play,
  Database,
  Check,
} from 'lucide-react';
import type { User, Project, EnvironmentInventory, Finding, DataReadinessReport, Workspace } from '../../types';
import type { ToastType } from '../Toast';

interface OverviewViewProps {
  currentUser: User | null;
  activeProject: Project | null;
  activeWorkspace: Workspace | null;
  inventory: EnvironmentInventory | null;
  findings: Finding[];
  readinessReport: DataReadinessReport | null;
  chunks: any[];
  isDiagnosing: boolean;
  isAssessingReadiness: boolean;
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: string | null;
  severityCounts: { critical: number; high: number; medium: number; low: number };
  onRunDiagnostics: () => void;
  onAssessReadiness: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowAuthModal: () => void;
  onShowNewWorkspaceModal: () => void;
  onShowNewProjectModal: () => void;
  addToast: (type: ToastType, message: string, title?: string) => void;
}

export function OverviewView({
  currentUser,
  activeProject,
  activeWorkspace,
  inventory,
  findings,
  readinessReport,
  chunks,
  isDiagnosing,
  isAssessingReadiness,
  isUploading,
  uploadError,
  uploadSuccess,
  severityCounts,
  onRunDiagnostics,
  onAssessReadiness,
  onFileUpload,
  onShowAuthModal,
  onShowNewWorkspaceModal,
  onShowNewProjectModal,
}: OverviewViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
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
                onClick={onRunDiagnostics}
                disabled={isDiagnosing}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> {isDiagnosing ? 'Running Rules...' : 'Run Diagnostics'}
              </button>
              <button
                onClick={onAssessReadiness}
                disabled={isAssessingReadiness}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5" /> {isAssessingReadiness ? 'Evaluating...' : 'Assess Readiness'}
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">Zero-Execution AST Sandbox</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">100% Grounded Line Citations</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">Multi-Tenant Workspace Isolation</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-medium">Google Cloud Run v2 Standards</span>
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
            {findings.length > 0
              ? `${severityCounts.high} High, ${severityCounts.medium} Medium`
              : 'Evidence-backed checks'}
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
          if (!currentUser) onShowAuthModal();
          else if (!activeWorkspace) onShowNewWorkspaceModal();
          else if (!activeProject) onShowNewProjectModal();
          else fileInputRef.current?.click();
        }}
        className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-600/50 bg-[#0d1320]/40 text-center space-y-3 transition-colors cursor-pointer"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
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
  );
}
