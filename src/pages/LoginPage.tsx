import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import { UserRole } from '../types';
import { SEED_FACULTY } from '../services/data/seeds';
import {
  GraduationCap,
  ShieldCheck,
  User,
  Sparkles,
  Compass,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  DoorOpen,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, quickLoginAs, loginAsFaculty, role } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'FACULTY' | 'ALL'>('FACULTY');
  const [email, setEmail] = useState('faculty@vitbhopal.ac.in');
  const [password, setPassword] = useState('Faculty@123');
  const [selectedRole, setSelectedRole] = useState<UserRole>('FACULTY');
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname;

  const handleRoleSelect = (r: UserRole) => {
    setSelectedRole(r);
    if (r === 'FACULTY') {
      setEmail('faculty@vitbhopal.ac.in');
      setPassword('Faculty@123');
    } else if (r === 'STUDENT') {
      setEmail('student@vitbhopal.ac.in');
      setPassword('Student@123');
    } else if (r === 'ADMIN') {
      setEmail('admin@vitbhopal.ac.in');
      setPassword('Admin@123');
    } else if (r === 'PUBLISHER') {
      setEmail('aiclub@vitbhopal.ac.in');
      setPassword('Publisher@123');
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password, selectedRole);
    setLoading(false);

    if (result.success) {
      toast(`Signed in as ${selectedRole}`, 'success');
      redirectForRole(selectedRole);
    } else {
      toast(result.error || 'Invalid credentials. Please check your email and password.', 'error');
    }
  };

  const redirectForRole = (r: UserRole) => {
    if (from) {
      navigate(from);
      return;
    }
    if (r === 'ADMIN') navigate('/admin');
    else if (r === 'FACULTY') navigate('/faculty/dashboard');
    else if (r === 'PUBLISHER') navigate('/publisher');
    else navigate('/dashboard');
  };

  const handleQuickFacultyLogin = async (facultyId: string) => {
    setLoading(true);
    await loginAsFaculty(facultyId);
    setLoading(false);
    toast('Signed in to Faculty Cabin Portal', 'success');
    navigate('/faculty/dashboard');
  };

  const handleQuickLogin = async (targetRole: UserRole) => {
    setLoading(true);
    await quickLoginAs(targetRole);
    setLoading(false);
    toast(`Switched to ${targetRole} account`, 'success');
    redirectForRole(targetRole);
  };

  const demoAccounts = [
    {
      role: 'FACULTY' as UserRole,
      title: 'Faculty Member',
      name: 'Dr. Ramesh Kumar',
      meta: 'Dean / Professor · Cabin AB1-314',
      email: 'faculty@vitbhopal.ac.in',
      icon: GraduationCap,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    },
    {
      role: 'STUDENT' as UserRole,
      title: 'Student Explorer',
      name: 'Aarav Patel',
      meta: 'B.Tech CSE · 24BCE10482',
      email: 'student@vitbhopal.ac.in',
      icon: User,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    {
      role: 'ADMIN' as UserRole,
      title: 'Super Admin',
      name: 'Dr. Rajesh Sharma',
      meta: 'Dean Office & IT Governance',
      email: 'admin@vitbhopal.ac.in',
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    },
    {
      role: 'PUBLISHER' as UserRole,
      title: 'Club Publisher',
      name: 'AI & ML Club',
      meta: 'Technical Student Chapter',
      email: 'aiclub@vitbhopal.ac.in',
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-[#0071E3] rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_16px_rgba(0,113,227,0.3)]">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          VIT Bhopal Digital Twin
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Sign in to manage your faculty cabin presence, student services, or campus governance.
        </p>
      </div>

      {/* Tabs: Faculty Login vs All Roles */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab('FACULTY');
            handleRoleSelect('FACULTY');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'FACULTY'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <span>Faculty & Staff Portal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#0071E3]" />
          <span>All Demo Roles</span>
        </button>
      </div>

      {/* Faculty Dedicated 1-Click Cards */}
      {activeTab === 'FACULTY' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-emerald-600" />
              <span>Instant Faculty Sign-In (1-Click)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Select your profile</span>
          </div>

          <p className="text-[11px] text-slate-500">
            Sign in as any registered faculty member to control real-time cabin status, update office hours,
            or post official course bulletins.
          </p>

          <div className="space-y-2">
            {SEED_FACULTY.slice(0, 4).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleQuickFacultyLogin(f.id)}
                className="w-full p-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={f.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={f.name}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-emerald-200 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-900 truncate">
                      {f.name}
                    </div>
                    <div className="text-[10px] text-emerald-800 font-semibold truncate">
                      {f.designation} · Cabin {f.cabinNumber}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{f.departmentName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-emerald-700 text-xs font-semibold pl-2">
                  <span className="hidden sm:inline">Sign In</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1-Click Instant Demo Login Strip for All Roles */}
      {activeTab === 'ALL' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Instant Demo Sign-In (1-Click)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Select any profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoAccounts.map((acc) => {
              const IconComponent = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc.role)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${acc.color}`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">{acc.name}</div>
                    <div className="text-[10px] font-semibold opacity-90">{acc.title}</div>
                    <div className="text-[10px] opacity-75 truncate">{acc.meta}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Login Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Email & Password Login
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">Official VITB Credentials</span>
        </div>

        <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Account Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['FACULTY', 'STUDENT', 'PUBLISHER', 'ADMIN'] as UserRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => handleRoleSelect(r)}
                  className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                    selectedRole === r
                      ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">VIT Bhopal Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. faculty@vitbhopal.ac.in"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Password</label>
              <span className="text-[10px] text-slate-400 font-mono">
                Hint: {selectedRole === 'FACULTY' ? 'Faculty@123' : selectedRole === 'ADMIN' ? 'Admin@123' : selectedRole === 'PUBLISHER' ? 'Publisher@123' : 'Student@123'}
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In as {selectedRole}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link to="/faculty" className="hover:text-blue-600 font-medium">
            Browse Faculty Directory →
          </Link>
          <button
            onClick={() => navigate('/explore')}
            className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
