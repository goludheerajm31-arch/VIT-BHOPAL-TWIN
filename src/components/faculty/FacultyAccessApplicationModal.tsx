import React, { useState } from 'react';
import { FacultyApplication } from '../../types';
import { storage, normalizeEmail, isInstitutionalEmail } from '../../services/storage';
import { useToast } from '../layout/Toast';
import {
  GraduationCap,
  X,
  Mail,
  User,
  Building,
  Briefcase,
  BadgeAlert,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface FacultyAccessApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifiedEmail: string;
  onApplicationSubmitted?: (application: FacultyApplication) => void;
}

const DEPARTMENTS = [
  'School of Computing Science and Engineering (SCSE)',
  'School of Mechanical Engineering (SMEC)',
  'School of Electrical and Electronics Engineering (SEEE)',
  'School of Advanced Sciences and Languages (SASL)',
  'VIT Bhopal Business School (VSB)',
  'Centre for Industrial Relations & Placement (CIR)',
  'Department of Mathematics',
  'Department of Physics & Chemistry',
  'Other Academic Division',
];

const DESIGNATIONS = [
  'Assistant Professor',
  'Assistant Professor (Senior Grade)',
  'Associate Professor',
  'Professor',
  'Senior Professor',
  'Dean / Division Head',
  'Visiting Professor',
  'Adjunct Faculty',
];

export const FacultyAccessApplicationModal: React.FC<FacultyAccessApplicationModalProps> = ({
  isOpen,
  onClose,
  verifiedEmail,
  onApplicationSubmitted,
}) => {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [employeeId, setEmployeeId] = useState('');
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [supportingDocumentUrl, setSupportingDocumentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<FacultyApplication | null>(null);

  if (!isOpen) return null;

  const cleanEmail = normalizeEmail(verifiedEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanEmail) {
      setError('A valid institutional email is required.');
      return;
    }

    if (!isInstitutionalEmail(cleanEmail)) {
      setError('Only official @vitbhopal.ac.in institutional emails can submit faculty applications.');
      return;
    }

    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }

    if (!department) {
      setError('Academic department is required.');
      return;
    }

    if (!designation) {
      setError('Designation is required.');
      return;
    }

    setSubmitting(true);
    try {
      const app = await storage.submitFacultyApplication({
        name: name.trim(),
        email: cleanEmail,
        department,
        designation,
        employeeId: employeeId.trim() || undefined,
        additionalInformation: additionalInformation.trim() || undefined,
        supportingDocumentUrl: supportingDocumentUrl.trim() || undefined,
      });

      setIsSuccess(true);
      setSubmittedApp(app);
      toast('Faculty access application submitted successfully!', 'success');
      if (onApplicationSubmitted) {
        onApplicationSubmitted(app);
      }
    } catch (err: any) {
      console.error('[Faculty Application Error]', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        {/* Header */}
        <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                Apply for Faculty Access
              </h2>
              <p className="text-xs text-[#86868B]">
                Submit your institutional details for admin verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSuccess && submittedApp ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-[#1D1D1F]">
                Application Submitted
              </h3>
              <p className="text-xs text-[#86868B] max-w-sm mx-auto">
                Your request has been received with status{' '}
                <span className="font-semibold text-amber-600">PENDING</span>.
                The IT governance and Dean office will review your institutional credentials.
              </p>
            </div>

            <div className="bg-[#F5F5F7] rounded-2xl p-4 text-left text-xs space-y-2 border border-black/[0.04]">
              <div className="flex justify-between">
                <span className="text-[#86868B]">Applicant:</span>
                <span className="font-medium text-[#1D1D1F]">{submittedApp.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Institutional Email:</span>
                <span className="font-mono text-[#1D1D1F]">{submittedApp.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Department:</span>
                <span className="font-medium text-[#1D1D1F]">{submittedApp.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Designation:</span>
                <span className="font-medium text-[#1D1D1F]">{submittedApp.designation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868B]">Application ID:</span>
                <span className="font-mono text-[11px] text-[#86868B]">
                  {submittedApp.id.slice(0, 13)}...
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-800 text-left">
              <strong>Notice:</strong> Pending applicants do not receive faculty privileges until an administrator approves the application. Once approved, your profile will become active upon your next sign in.
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field - Locked & Read-only */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F] flex items-center justify-between">
                <span>Institutional Email</span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Verified Identity (Locked)
                </span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={cleanEmail}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl text-xs font-mono text-[#1D1D1F] cursor-not-allowed select-none opacity-90"
                />
              </div>
              <p className="text-[10px] text-[#86868B]">
                Automatically obtained from your verified VIT Bhopal institutional account.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-black/[0.12] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">
                Academic Department <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-black/[0.12] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Designation */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">
                Academic Designation <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-black/[0.12] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                >
                  {DESIGNATIONS.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee ID */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">
                Faculty / Employee ID <span className="text-[#86868B] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <BadgeAlert className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. VITB-FAC-1024"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-black/[0.12] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">
                Additional Information <span className="text-[#86868B] font-normal">(Optional)</span>
              </label>
              <textarea
                value={additionalInformation}
                onChange={(e) => setAdditionalInformation(e.target.value)}
                rows={2}
                placeholder="Specialization, cabin requirements, or date of joining..."
                className="w-full px-3.5 py-2.5 bg-white border border-black/[0.12] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              />
            </div>

            {/* Supporting Document URL */}
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">
                Supporting Document URL <span className="text-[#86868B] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={supportingDocumentUrl}
                  onChange={(e) => setSupportingDocumentUrl(e.target.value)}
                  placeholder="e.g. https://drive.google.com/file/... or appointment letter URL"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-black/[0.12] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.05] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
