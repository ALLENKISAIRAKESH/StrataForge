import { Terminal } from 'lucide-react';
import type { EnvironmentInventory } from '../../types';

interface DiscoveryViewProps {
  inventory: EnvironmentInventory | null;
}

export function DiscoveryView({ inventory }: DiscoveryViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Environment Discovery Engine</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Parses enterprise configurations, mapping service architectures and dependencies.
          </p>
        </div>
      </div>

      {inventory ? (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Classified File Inventory</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(inventory.category_counts).map(([cat, count]) => (
              <div key={cat} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">{cat}</div>
                <div className="text-lg font-bold text-white mt-1">{count} files</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
          <Terminal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-300">Upload a project archive to run environment discovery.</p>
        </div>
      )}
    </div>
  );
}
