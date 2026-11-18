import React, { useState } from 'react';

interface AuthModalProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
  onClose: () => void;
}

export function AuthModal({ onLogin, onRegister, onClose }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'register') {
        await onRegister(authEmail, authPassword, authFullName);
      } else {
        await onLogin(authEmail, authPassword);
      }
      onClose();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0e1424] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">
          {authMode === 'login' ? 'Sign in to Platform' : 'Create an Account'}
        </h3>
        {authError && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg">
            {authError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {authMode === 'register' && (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={authFullName}
                onChange={(e) => setAuthFullName(e.target.value)}
                placeholder="Alice Engineer"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email</label>
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="engineer@enterprise.com"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
            <input
              type="password"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-blue-400 hover:underline"
            >
              {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign In'}
            </button>
            <div className="flex gap-2">
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
                {authMode === 'login' ? 'Sign In' : 'Register'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
