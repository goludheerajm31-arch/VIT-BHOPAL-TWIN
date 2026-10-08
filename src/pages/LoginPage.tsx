import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import { UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  Compass,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

type EntryPoint = 'STUDENT' | 'FACULTY' | 'PUBLISHER' | 'ADMIN' | 'GUEST';

const ENTRY_POINTS: { id: EntryPoint; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'STUDENT', label: 'Student', icon: UserIcon },
  { id: 'FACULTY', label: 'Faculty', icon: GraduationCap },
  { id: 'PUBLISHER', label: 'Publisher', icon: Sparkles },
  { id: 'ADMIN', label: 'Admin', icon: ShieldCheck },
  { id: 'GUEST', label: 'Guest', icon: Compass },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, signInWithGoogle, signUpWithPassword, resetPassword } = useAuth();
  const { toast } = useToast();

  const [entryPoint, setEntryPoint] = useState<EntryPoint>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuestSignIn, setShowGuestSignIn] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname;

  // Handle post-OAuth redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      const storedEntryPoint = (sessionStorage.getItem('vit_twin_auth_entry_point') as EntryPoint) || entryPoint;

      // Verify if the user's authoritative roles allow the requested entry point
      if (storedEntryPoint === 'ADMIN' && !user.roles?.includes('ADMIN')) {
        setErrorMessage(
          `Unauthorized: Your authenticated account (${user.email}) does not possess institutional administrator privileges.`
        );
        return;
      }
      if (storedEntryPoint === 'FACULTY' && !user.roles?.includes('FACULTY')) {
        setErrorMessage(
          `Faculty profile not found for "${user.email}". Please apply for faculty access or continue to your Student portal.`
        );
        return;
      }
      if (storedEntryPoint === 'PUBLISHER' && !user.roles?.includes('PUBLISHER')) {
        setErrorMessage(
          `Publisher access is not active for "${user.email}". You can apply for publisher access in your Student profile.`
        );
        return;
      }

      sessionStorage.removeItem('vit_twin_auth_entry_point');

      // Navigate to destination
      if (from) {
        navigate(from, { replace: true });
      } else if (storedEntryPoint === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (storedEntryPoint === 'FACULTY') {
        navigate('/faculty/dashboard', { replace: true });
      } else if (storedEntryPoint === 'PUBLISHER') {
        navigate('/publisher', { replace: true });
      } else if (storedEntryPoint === 'GUEST') {
        navigate('/explore', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, from, navigate, entryPoint]);

  const handleEntryChange = (newEntry: EntryPoint) => {
    setEntryPoint(newEntry);
    setErrorMessage(null);
    setShowGuestSignIn(false);
  };

  const redirectAfterAuth = (targetEntry: EntryPoint, userRoles: UserRole[]) => {
    if (from) {
      navigate(from, { replace: true });
      return;
    }

    if (targetEntry === 'ADMIN' && userRoles.includes('ADMIN')) {
      navigate('/admin', { replace: true });
    } else if (targetEntry === 'FACULTY' && userRoles.includes('FACULTY')) {
      navigate('/faculty/dashboard', { replace: true });
    } else if (targetEntry === 'PUBLISHER' && userRoles.includes('PUBLISHER')) {
      navigate('/publisher', { replace: true });
    } else if (targetEntry === 'GUEST') {
      navigate('/explore', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your institutional email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanEmail, password, entryPoint);
      setLoading(false);

      if (result.success && result.user) {
        toast('Signed in successfully', 'success');
        redirectAfterAuth(entryPoint, result.user.roles || [result.user.role]);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'An unexpected error occurred during sign-in.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your institutional email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }

    setLoading(true);
    const result = await signUpWithPassword(cleanEmail, password, fullName.trim());
    setLoading(false);

    if (result.success) {
      toast(result.message || 'Account created successfully!', 'success');
      setIsSignUpMode(false);
    } else {
      setErrorMessage(result.error || 'Account creation failed. Please check your information.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    const result = await signInWithGoogle(entryPoint);
    if (!result.success) {
      setLoading(false);
      setErrorMessage(result.error || 'Google Sign-In failed to initialize.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    const res = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);
    setForgotFeedback(res.message);
  };

  const handleGuestContinue = () => {
    toast('Browsing as Campus Guest', 'info');
    navigate('/explore');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#FBFBFD]">
      <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        {/* University Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#0071E3] rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_16px_rgba(0,113,227,0.25)]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
              VIT Bhopal Digital Twin
            </h1>
            <p className="text-xs text-[#86868B] mt-0.5">
              Unified Campus Access Portal
            </p>
          </div>
        </div>

        {/* Entry Point Selector: Student, Faculty, Publisher, Admin, Guest */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider text-center">
            Select Entry
          </div>
          <div className="bg-[#F5F5F7] p-1 rounded-2xl grid grid-cols-5 gap-1">
            {ENTRY_POINTS.map((tab) => {
              const isSelected = entryPoint === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleEntryChange(tab.id)}
                  className={`py-2 text-center rounded-xl text-xs font-semibold transition-all cursor-pointer truncate ${
                    isSelected
                      ? 'bg-white text-[#1D1D1F] shadow-xs font-bold'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="leading-relaxed block">{errorMessage}</span>
              {user && (
                <button
                  onClick={() => redirectAfterAuth('STUDENT', user.roles || [user.role])}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0071E3] hover:underline"
                >
                  <span>Continue to Student Portal</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE A: GUEST ENTRY (Default instant guest or master sign-in)  */}
        {/* ============================================================== */}
        {entryPoint === 'GUEST' && !showGuestSignIn ? (
          <div className="space-y-5 text-center">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#1D1D1F]">
                Campus Guest Access
              </h2>
              <p className="text-xs text-[#86868B] max-w-xs mx-auto leading-relaxed">
                Explore the campus map, locate facilities, view public events, and search the directory without an account.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGuestContinue}
              className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="pt-3 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={() => setShowGuestSignIn(true)}
                className="text-xs font-medium text-[#0071E3] hover:underline cursor-pointer"
              >
                Sign in with master / institutional credentials
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* CASE B: ACCOUNT-BASED AUTHENTICATION (STUDENT/FACULTY/PUB/ADMIN/GUEST) */
          /* ============================================================== */
          <div className="space-y-5">
            {/* Header info per entry choice */}
            <div className="text-center space-y-1">
              {entryPoint === 'GUEST' && showGuestSignIn && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setShowGuestSignIn(false)}
                    className="text-[11px] font-semibold text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                  >
                    ← Back to instant guest access
                  </button>
                </div>
              )}
              <h2 className="text-base font-bold text-[#1D1D1F] flex items-center justify-center gap-1.5">
                {entryPoint === 'STUDENT' && <UserIcon className="w-4 h-4 text-[#0071E3]" />}
                {entryPoint === 'FACULTY' && <GraduationCap className="w-4 h-4 text-[#0071E3]" />}
                {entryPoint === 'PUBLISHER' && <Sparkles className="w-4 h-4 text-indigo-600" />}
                {entryPoint === 'ADMIN' && <ShieldCheck className="w-4 h-4 text-purple-600" />}
                {entryPoint === 'GUEST' && <Compass className="w-4 h-4 text-emerald-600" />}
                <span>
                  {isSignUpMode
                    ? 'Create Campus Account'
                    : entryPoint === 'STUDENT'
                    ? 'Student Portal Sign-In'
                    : entryPoint === 'FACULTY'
                    ? 'Faculty Portal Sign-In'
                    : entryPoint === 'PUBLISHER'
                    ? 'Publisher Studio Sign-In'
                    : entryPoint === 'GUEST'
                    ? 'Guest Perspective Sign-In'
                    : 'Administrative Sign-In'}
                </span>
              </h2>
              <p className="text-xs text-[#86868B]">
                {isSignUpMode
                  ? 'Sign up with your official institutional email.'
                  : 'Institutional & Master Administrator Access.'}
              </p>
              {!isSignUpMode && entryPoint === 'ADMIN' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@vitbhopal.ac.in');
                      setPassword('admin9211');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full text-[11px] font-semibold border border-purple-200 transition-colors cursor-pointer"
                  >
                    <span>Click here to fill: admin@vitbhopal.ac.in (admin9211)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Common Credentials Form: Email + Password */}
            <form onSubmit={isSignUpMode ? handleSignUp : handleSignIn} className="space-y-3.5">
              {isSignUpMode && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#1D1D1F]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar or Aarav Sharma"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-[#1D1D1F] text-xs font-medium"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#1D1D1F]">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@vitbhopal.ac.in"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-[#1D1D1F] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#1D1D1F]">
                    Password
                  </label>
                  {!isSignUpMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotFeedback(null);
                        setIsForgotModalOpen(true);
                      }}
                      className="text-[11px] text-[#0071E3] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-[#1D1D1F] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>
                  {loading
                    ? 'Authenticating...'
                    : isSignUpMode
                    ? 'Create Account'
                    : 'Sign In'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-black/[0.06]" />
              <span className="bg-white px-3 text-[11px] text-[#86868B] uppercase tracking-wider relative">
                or
              </span>
            </div>

            {/* Universal Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-[#1D1D1F] border border-black/[0.12] rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.4 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Toggle Sign In / Sign Up */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setErrorMessage(null);
                }}
                className="text-[11px] text-[#86868B] hover:text-[#0071E3] transition-colors cursor-pointer"
              >
                {isSignUpMode
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up with Institutional Email"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotFeedback ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {forgotFeedback}
                </p>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your institutional email address and we will dispatch password recovery instructions through Supabase Auth.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@vitbhopal.ac.in"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
