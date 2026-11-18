import { Plus, KeyRound } from 'lucide-react';
import type { User, Workspace } from '../../types';

interface WorkspacesViewProps {
  currentUser: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSetActiveWorkspace: (ws: Workspace) => void;
  onShowNewWorkspaceModal: () => void;
}

export function WorkspacesView({
  currentUser,
  workspaces,
  activeWorkspace,
  onSetActiveWorkspace,
  onShowNewWorkspaceModal,
}: WorkspacesViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Multi-Tenant Workspaces</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Isolated enterprise boundaries with dedicated project scoping.
          </p>
        </div>
        {currentUser && (
          <button
            onClick={onShowNewWorkspaceModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Workspace
          </button>
        )}
      </div>

      {!currentUser ? (
        <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
          <KeyRound className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-300">Sign in to manage workspaces.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => onSetActiveWorkspace(ws)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                activeWorkspace?.id === ws.id
                  ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-base">{ws.name}</h3>
                {activeWorkspace?.id === ws.id && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-3">{ws.description || 'No description provided'}</p>
              <div className="text-[11px] font-mono text-slate-500">Slug: {ws.slug}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
