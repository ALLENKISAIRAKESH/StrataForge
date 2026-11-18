import { Activity, Play, Filter, CheckSquare } from 'lucide-react';
import type { User, EnvironmentInventory, Finding } from '../../types';

interface DiagnosticsViewProps {
  currentUser: User | null;
  inventory: EnvironmentInventory | null;
  findings: Finding[];
  filteredFindings: Finding[];
  severityCounts: { critical: number; high: number; medium: number; low: number };
  severityFilter: string;
  isDiagnosing: boolean;
  onRunDiagnostics: () => void;
  onSetSeverityFilter: (sev: string) => void;
  onUpdateFindingStatus: (findingId: string, newStatus: string) => void;
}

export function DiagnosticsView({
  currentUser,
  inventory,
  findings,
  filteredFindings,
  severityCounts,
  severityFilter,
  isDiagnosing,
  onRunDiagnostics,
  onSetSeverityFilter,
  onUpdateFindingStatus,
}: DiagnosticsViewProps) {
  return (
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
            onClick={onRunDiagnostics}
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
            onClick={() => onSetSeverityFilter(sev)}
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
                  onChange={(e) => onUpdateFindingStatus(finding.id, e.target.value)}
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
  );
}
