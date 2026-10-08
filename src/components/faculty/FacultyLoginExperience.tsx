import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { storage, normalizeEmail, isInstitutionalEmail } from '../../services/storage';
import { useToast } from '../layout/Toast';
import { FacultyAccessApplicationModal } from './FacultyAccessApplicationModal';
import { FacultyApplication, FacultyMember } from '../../types';
import {
  GraduationCap,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Lock,
  DoorOpen,
  Info,
  Building,
  RefreshCw,
} from 'lucide-react';

export const FacultyLoginExperience: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsFaculty } = useAuth();
  const { toast } = useToast();

  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States when looking up faculty status
  const [viewState, setViewState] = useState<
    'INPUT' | 'NOT_FOUND' | 'PENDING' | 'REJECTED' | 'DISABLED'
  >('INPUT');

  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [pendingApplication, setPendingApplication] = useState<FacultyApplication | null>(null);
  const [rejectedApplication, setRejectedApplication] = useState<FacultyApplication | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleContinueWithGoogle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const norm = normalizeEmail(institutionalEmail);
    if (!norm) {
      setError('Please provide your institutional email address.');
      return;
    }

    if (!isInstitutionalEmail(norm)) {
      setError(
        'Only official @vitbhopal.ac.in institutional accounts are accepted. External accounts (e.g. @gmail.com) cannot access the faculty portal.'
      );
      return;
    }

    setLoading(true);
    setVerifiedEmail(norm);

    try {
      // Step 1: Look up existing faculty profile by normalized email
      const existingFaculty = storage.getFacultyByEmail(norm);

      if (existingFaculty) {
        if (existingFaculty.status === 'DISABLED') {
          setViewState('DISABLED');
          setLoading(false);
          return;
        }

        // CASE 1: ADMIN HAS ALREADY ADDED THE FACULTY (PROVISIONED) or ACTIVE
        // Claim existing record, do NOT create another record!
        await loginAsFaculty(existingFaculty.id);

        if (existingFaculty.status === 'PROVISIONED') {
          toast(
            `Welcome, Dr. ${existingFaculty.name}! Your pre-provisioned faculty record was claimed and activated.`,
            'success'
          );
        } else {
          toast(`Welcome back, Dr. ${existingFaculty.name}!`, 'success');
        }

        navigate('/faculty/dashboard');
        return;
      }

      // Step 2: Faculty profile NOT found in faculty table
      // Check if an application has already been submitted
      const existingApp = storage.getFacultyApplicationByEmail(norm);

      if (existingApp) {
        if (existingApp.status === 'PENDING') {
          setPendingApplication(existingApp);
          setViewState('PENDING');
          setLoading(false);
          return;
        }

        if (existingApp.status === 'REJECTED') {
          setRejectedApplication(existingApp);
          setViewState('REJECTED');
          setLoading(false);
          return;
        }

        if (existingApp.status === 'APPROVED') {
          // If approved, an active faculty record should exist or be activated
          const activatedFac = storage.getFacultyByEmail(norm);
          if (activatedFac) {
            await loginAsFaculty(activatedFac.id);
            toast(`Application approved! Signed in as Dr. ${activatedFac.name}.`, 'success');
            navigate('/faculty/dashboard');
            return;
          }
        }
      }

      // CASE 2: No faculty record found and no pending application -> Show exact requested message
      setViewState('NOT_FOUND');
    } catch (err: any) {
      console.error('[Faculty Login Flow Error]', err);
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSubmitted = (app: FacultyApplication) => {
    setPendingApplication(app);
    setViewState('PENDING');
    setIsApplyModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="bg-white rounded-3xl p-6 border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
                <span>FACULTY LOGIN</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Institutional SSO
                </span>
              </h2>
              <p className="text-xs text-[#86868B]">
                Sign in using your VIT Bhopal institutional account.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/[0.04] text-[#86868B]">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>@vitbhopal.ac.in only</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CASE 2: FACULTY PROFILE NOT FOUND                              */}
        {/* ============================================================== */}
        {viewState === 'NOT_FOUND' && (
          <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1D1D1F]">
                Faculty Profile Not Found
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your VIT Bhopal institutional account is verified (
                <span className="font-mono font-semibold text-slate-800">{verifiedEmail}</span>
                ), but no faculty profile is currently registered.
              </p>
              <p className="text-xs font-semibold text-slate-700 pt-1">
                Are you a faculty member?
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Apply for Faculty Access</span>
              </button>

              <button
                type="button"
                onClick={() => setViewState('INPUT')}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Try Another Account
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 3: APPLICATION UNDER REVIEW (PENDING)                     */}
        {/* ============================================================== */}
        {viewState === 'PENDING' && pendingApplication && (
          <div className="p-6 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">
                    Faculty Application Under Review
                  </h3>
                  <span className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">
                    Status: PENDING ADMIN APPROVAL
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                PENDING
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your application for faculty privileges was submitted on{' '}
              <strong>
                {new Date(pendingApplication.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>{' '}
              and is currently being reviewed by IT Governance and the Dean office.
            </p>

            <div className="bg-white rounded-xl p-3.5 border border-black/[0.06] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#86868B]">Applicant Name:</span>
                <span className="font-semibold text-[#1D1D1F]">{pendingApplication.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Institutional Email:</span>
                <span className="font-mono text-[#1D1D1F]">{pendingApplication.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Department:</span>
                <span className="text-[#1D1D1F]">{pendingApplication.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Designation:</span>
                <span className="text-[#1D1D1F]">{pendingApplication.designation}</span>
              </div>
              {pendingApplication.employeeId && (
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Employee ID:</span>
                  <span className="font-mono text-[#1D1D1F]">{pendingApplication.employeeId}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Pending applicants do not receive faculty privileges until an administrator approves. A duplicate application cannot be submitted while one is pending.
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setViewState('INPUT')}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← Back to Login
              </button>
              <button
                type="button"
                onClick={() => handleContinueWithGoogle()}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Status Again</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE: REJECTED APPLICATION                                     */}
        {/* ============================================================== */}
        {viewState === 'REJECTED' && rejectedApplication && (
          <div className="p-6 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Application Not Approved
                </h3>
                <span className="text-[11px] text-rose-700">
                  Your request for faculty privileges was not approved.
                </span>
              </div>
            </div>

            {rejectedApplication.rejectionReason && (
              <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-rose-900">
                <strong>Reason:</strong> {rejectedApplication.rejectionReason}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setViewState('INPUT')}
                className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Try another account
              </button>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(true)}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Re-apply for Faculty Access
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE: DISABLED PROFILE                                         */}
        {/* ============================================================== */}
        {viewState === 'DISABLED' && (
          <div className="p-6 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-rose-900">Faculty Account Disabled</h3>
            <p className="text-xs text-rose-700 max-w-sm mx-auto">
              This faculty profile has been disabled by an administrator. Login access is currently revoked. Please contact IT governance or the Dean office.
            </p>
            <button
              type="button"
              onClick={() => setViewState('INPUT')}
              className="px-4 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* DEFAULT FORM VIEW: GOOGLE AUTH SIMULATOR / ENTRY               */}
        {/* ============================================================== */}
        {viewState === 'INPUT' && (
          <form onSubmit={handleContinueWithGoogle} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1D1D1F] flex items-center justify-between">
                <span>VIT Bhopal Institutional Email</span>
                <span className="text-[11px] text-[#86868B]">Google Workspace Identity</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={institutionalEmail}
                  onChange={(e) => setInstitutionalEmail(e.target.value)}
                  placeholder="e.g. rahul.sharma@vitbhopal.ac.in"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-[#1D1D1F] text-xs font-mono"
                />
              </div>
              <p className="text-[11px] text-[#86868B]">
                Only official institutional addresses ending with{' '}
                <span className="font-semibold text-slate-700">@vitbhopal.ac.in</span> are accepted.
              </p>
            </div>

            {/* Prominent "Continue with Google" Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-slate-50 text-[#1D1D1F] border border-black/[0.12] rounded-2xl text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>{loading ? 'Verifying Institutional Account...' : 'Continue with Google'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Modal for Applying for Faculty Access */}
      <FacultyAccessApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        verifiedEmail={verifiedEmail || institutionalEmail}
        onApplicationSubmitted={handleApplicationSubmitted}
      />
    </div>
  );
};
