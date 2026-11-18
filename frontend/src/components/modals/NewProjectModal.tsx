import React, { useState } from 'react';

interface NewProjectModalProps {
  onSubmit: (name: string, description: string, repoUrl: string) => Promise<void>;
  onClose: () => void;
}

export function NewProjectModal({ onSubmit, onClose }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [repo, setRepo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, desc, repo);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0e1424] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">Create Assessment Project</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Knowledge Assistant"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Repository URL (optional)</label>
            <input
              type="url"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/acme/knowledge-assistant"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Target system specifications and objectives"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
