import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, role } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = login(email, password, selectedRole);
    setLoading(false);

    if (success) {
      toast(`Signed in as ${selectedRole}`, 'success');
      if (selectedRole === 'ADMIN') navigate('/admin');
      else if (selectedRole === 'PUBLISHER') navigate('/publisher');
      else navigate(from);
    } else {
      toast('Invalid credentials. Please check your email and password.', 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-md">
          VT
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          VIT Bhopal Digital Twin
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Sign in to access student bookmarks, publisher studio, or campus admin controls.
        </p>
      </div>

      {/* Manual Login Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Account Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['STUDENT', 'PUBLISHER', 'ADMIN'] as UserRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`py-2 px-1 text-center rounded-lg border font-medium capitalize transition-colors ${
                    selectedRole === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">VIT Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@vitbhopal.ac.in"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <button
            onClick={() => navigate('/explore')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Continue as Guest Explorer →
          </button>
        </div>
      </div>
    </div>
  );
};
