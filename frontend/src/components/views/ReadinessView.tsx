import { Database, Sparkles, BarChart2, BookOpen, Search, FileText } from 'lucide-react';
import type { User, EnvironmentInventory, DataReadinessReport, DocumentChunk } from '../../types';

interface ReadinessViewProps {
  currentUser: User | null;
  inventory: EnvironmentInventory | null;
  readinessReport: DataReadinessReport | null;
  filteredChunks: DocumentChunk[];
  chunkSearch: string;
  isAssessingReadiness: boolean;
  onAssessReadiness: () => void;
  onSetChunkSearch: (q: string) => void;
}

export function ReadinessView({
  currentUser,
  inventory,
  readinessReport,
  filteredChunks,
  chunkSearch,
  isAssessingReadiness,
  onAssessReadiness,
  onSetChunkSearch,
}: ReadinessViewProps) {
  return (
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
            onClick={onAssessReadiness}
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
              <div className="text-2xl font-black text-blue-400">{readinessReport.structured_score}%</div>
              <div className="mt-2 text-xs text-slate-500">
                {readinessReport.metrics.structured.tables_with_primary_key} / {readinessReport.metrics.structured.total_tables} PK constraints
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-xs font-medium uppercase mb-1">Unstructured RAG Score</div>
              <div className="text-2xl font-black text-indigo-400">{readinessReport.unstructured_score}%</div>
              <div className="mt-2 text-xs text-slate-500">
                {readinessReport.metrics.unstructured.chunks_with_headings} / {readinessReport.total_chunks} heading-aligned chunks
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 text-xs font-medium uppercase mb-1">Indexed Chunks</div>
              <div className="text-2xl font-black text-purple-400">{readinessReport.total_chunks}</div>
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
                  onChange={(e) => onSetChunkSearch(e.target.value)}
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
                        {chunk.metadata.headings.map((h: string, hIdx: number) => (
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
  );
}
