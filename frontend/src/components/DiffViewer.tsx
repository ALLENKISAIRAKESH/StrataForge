import { Download, FileCode, CheckCircle2, XCircle } from 'lucide-react';
import { CopyButton } from './CopyButton';

interface DiffViewerProps {
  diffText: string;
  filename?: string;
  onApply?: () => void;
  onReject?: () => void;
  isApplying?: boolean;
}

export function DiffViewer({
  diffText,
  filename,
  onApply,
  onReject,
  isApplying = false,
}: DiffViewerProps) {
  if (!diffText) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
        No diff content available.
      </div>
    );
  }

  const lines = diffText.split('\n');

  // Detect filename from diff header if not passed
  let resolvedFilename = filename;
  if (!resolvedFilename) {
    const fileHeaderLine = lines.find((l) => l.startsWith('+++ b/'));
    if (fileHeaderLine) {
      resolvedFilename = fileHeaderLine.replace('+++ b/', '').trim();
    }
  }

  const handleDownloadPatch = () => {
    const blob = new Blob([diffText], { type: 'text/x-diff' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resolvedFilename || 'patch'}.diff`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-slate-200 font-mono font-medium">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span>{resolvedFilename || 'Unified Diff Patch'}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={diffText} label="Copy Diff" />
          <button
            onClick={handleDownloadPatch}
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save .patch</span>
          </button>
          {onApply && (
            <button
              onClick={onApply}
              disabled={isApplying}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isApplying ? 'Applying...' : 'Approve & Apply'}</span>
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700/60 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Table */}
      <div className="font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto divide-y divide-slate-900/40 select-text">
        {lines.map((line, idx) => {
          let lineType: 'add' | 'del' | 'header' | 'hunk' | 'normal' = 'normal';
          if (line.startsWith('+++') || line.startsWith('---')) {
            lineType = 'header';
          } else if (line.startsWith('@@')) {
            lineType = 'hunk';
          } else if (line.startsWith('+')) {
            lineType = 'add';
          } else if (line.startsWith('-')) {
            lineType = 'del';
          }

          const style = {
            header: 'bg-slate-900/60 text-slate-400 font-semibold',
            hunk: 'bg-indigo-950/40 text-indigo-300 border-l-4 border-indigo-500 font-semibold',
            add: 'bg-emerald-950/35 text-emerald-200 border-l-4 border-emerald-500/80',
            del: 'bg-rose-950/35 text-rose-200 border-l-4 border-rose-500/80 line-through opacity-85',
            normal: 'text-slate-300 border-l-4 border-transparent hover:bg-slate-900/40',
          }[lineType];

          return (
            <div key={idx} className={`flex items-stretch px-2 py-0.5 font-mono leading-relaxed ${style}`}>
              <span className="w-10 shrink-0 text-right pr-3 select-none text-slate-600 text-[11px]">
                {idx + 1}
              </span>
              <span className="w-4 shrink-0 text-center select-none font-bold">
                {lineType === 'add' ? '+' : lineType === 'del' ? '-' : lineType === 'hunk' ? '@' : ' '}
              </span>
              <span className="flex-1 pl-1 whitespace-pre overflow-x-visible">
                {lineType === 'add' || lineType === 'del' ? line.slice(1) : line}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
