import {
  Layers,
  Activity,
  ClipboardCheck,
  Database,
  Cpu,
  Terminal,
  Briefcase,
  FolderGit2,
} from 'lucide-react';
import type { ActiveTab, BackendHealth, DataReadinessReport, AuditReport } from '../../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  findingsCount: number;
  agentHistoryCount: number;
  workspacesCount: number;
  projectsCount: number;
  readinessReport: DataReadinessReport | null;
  auditReport: AuditReport | null;
  health: BackendHealth | null;
  loading: boolean;
  error: string | null;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  findingsCount,
  agentHistoryCount,
  workspacesCount,
  projectsCount,
  readinessReport,
  auditReport,
  health,
  loading,
  error,
}: SidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#080d19] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">
          Auditing & Security
        </div>
        {[
          { id: 'overview', label: 'Platform Overview', icon: Layers },
          { id: 'diagnostics', label: 'Static Diagnostics', icon: Activity, count: findingsCount },
          {
            id: 'workbench',
            label: 'Remediation Workbench',
            icon: ClipboardCheck,
            badge: auditReport ? `${auditReport.production_readiness.readiness_index}%` : undefined,
          },
          {
            id: 'readiness',
            label: 'Data & RAG Readiness',
            icon: Database,
            badge: readinessReport ? `${readinessReport.overall_score}%` : undefined,
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
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
              {(item as any).count !== undefined && (item as any).count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800/60 font-mono font-semibold">
                  {(item as any).count}
                </span>
              )}
              {(item as any).badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950 text-cyan-300 border border-indigo-800/60 font-mono font-semibold">
                  {(item as any).badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pt-5 py-2">
          Cloud & Automation
        </div>
        {[
          {
            id: 'agents',
            label: 'Autonomous Subagents',
            icon: Cpu,
            badge: agentHistoryCount > 0 ? `${agentHistoryCount}` : undefined,
          },
          { id: 'discovery', label: 'Archive Inventory', icon: Terminal },
          { id: 'workspaces', label: 'Workspaces', icon: Briefcase, count: workspacesCount },
          { id: 'projects', label: 'Client Projects', icon: FolderGit2, count: projectsCount },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
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
              {(item as any).count !== undefined && (item as any).count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  {(item as any).count}
                </span>
              )}
              {(item as any).badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950 text-cyan-300 border border-indigo-800/60 font-mono font-semibold">
                  {(item as any).badge}
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
  );
}
