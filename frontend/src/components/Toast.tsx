import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 4000;
    const interval = 20;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast, onDismiss]);

  const styles = {
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40',
      progress: 'bg-emerald-400',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/40',
      progress: 'bg-rose-400',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-amber-950/40',
      progress: 'bg-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-950/90 border-indigo-500/50 text-indigo-100 shadow-indigo-950/40',
      progress: 'bg-cyan-400',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-xl p-4 shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 ${styles.bg}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="flex-1 pr-2">
          {toast.title && <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">{toast.title}</h4>}
          <p className="text-xs font-medium leading-relaxed opacity-95">{toast.message}</p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
        <div
          className={`h-full transition-all duration-75 ease-linear ${styles.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
