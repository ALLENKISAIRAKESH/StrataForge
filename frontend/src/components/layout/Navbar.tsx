import {
  Briefcase,
  FolderGit2,
  UserCheck,
  LogOut,
  LogIn,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '../Logo';
import type { User, Workspace, Project, Finding } from '../../types';

interface NavbarProps {
  currentUser: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  activeProject: Project | null;
  projects: Project[];
  findings: Finding[];
  onSetActiveWorkspace: (ws: Workspace) => void;
  onSetActiveProject: (proj: Project) => void;
  onLogout: () => void;
  onShowAuthModal: () => void;
}

export function Navbar({
  currentUser,
  activeWorkspace,
  workspaces,
  activeProject,
  projects,
  findings,
  onSetActiveWorkspace,
  onSetActiveProject,
  onLogout,
  onShowAuthModal,
}: NavbarProps) {
  return (
    <header className="border-b border-slate-800/80 bg-[#080d1a]/95 backdrop-blur-xl px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xl">
      <div className="flex items-center gap-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white font-sans">
              StrataForge
            </span>
          </div>
        </div>

        {/* Breadcrumb Hierarchy */}
        {currentUser && activeWorkspace && (
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-300 hover:border-slate-700 transition-colors">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <select
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
                value={activeWorkspace?.id || ''}
                onChange={(e) => {
                  const ws = workspaces.find((w) => w.id === e.target.value);
                  if (ws) onSetActiveWorkspace(ws);
                }}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-slate-100">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            {activeProject ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-300">
                  <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                  <select
                    className="bg-transparent text-cyan-200 font-medium focus:outline-none cursor-pointer max-w-[190px] truncate"
                    value={activeProject?.id || ''}
                    onChange={(e) => {
                      const proj = projects.find((p) => p.id === e.target.value);
                      if (proj) onSetActiveProject(proj);
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Indicator */}
                {findings.length === 0 && activeProject.status === 'ready_for_deployment' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ready for Cloud Run
                  </span>
                ) : findings.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {findings.length} Findings Open
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Global Search & User Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 w-60 hover:border-slate-700 transition-colors cursor-text">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-400">Search rules, findings...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">⌘K</kbd>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium text-slate-200">{currentUser.full_name || currentUser.email}</span>
            </div>
            <button
              onClick={onLogout}
              title="Log Out"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onShowAuthModal}
            className="text-xs flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
        )}
      </div>
    </header>
  );
}
