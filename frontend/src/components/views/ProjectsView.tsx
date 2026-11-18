import { Plus, ExternalLink } from 'lucide-react';
import type { User, Workspace, Project } from '../../types';

interface ProjectsViewProps {
  currentUser: User | null;
  activeWorkspace: Workspace | null;
  projects: Project[];
  activeProject: Project | null;
  onSetActiveProject: (proj: Project) => void;
  onShowNewProjectModal: () => void;
}

export function ProjectsView({
  currentUser,
  activeWorkspace,
  projects,
  activeProject,
  onSetActiveProject,
  onShowNewProjectModal,
}: ProjectsViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Projects {activeWorkspace && <span className="text-blue-400 font-normal">in {activeWorkspace.name}</span>}
          </h2>
        </div>
        {currentUser && activeWorkspace && (
          <button
            onClick={onShowNewProjectModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      <div className="space-y-3">
        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => onSetActiveProject(proj)}
            className={`p-5 rounded-xl border transition-all cursor-pointer ${
              activeProject?.id === proj.id
                ? 'bg-blue-950/20 border-blue-500/40'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">{proj.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {proj.status}
                </span>
              </div>
              {activeProject?.id === proj.id && (
                <span className="text-[10px] text-blue-400 font-medium">Selected</span>
              )}
            </div>
            <p className="text-xs text-slate-400">{proj.description || 'No description'}</p>
            {proj.repository_url && (
              <a
                href={proj.repository_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 inline-flex mt-2"
              >
                <ExternalLink className="w-3 h-3" /> {proj.repository_url}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
