import React, { useState } from 'react';
import { X, UserPlus, Mail, User, Building2, FileText, Info, ShieldCheck } from 'lucide-react';
import { storage } from '../../services/storage';
import { normalizeEmail, isInstitutionalEmail } from '../../lib/facultyAuthUtils';
import { useToast } from '../layout/Toast';

interface AddPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminUserId?: string;
}

export const AddPublisherModal: React.FC<AddPublisherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminUserId,
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normEmail = normalizeEmail(email);
    if (!normEmail) {
      setErrorMsg('Institutional email is required.');
      return;
    }

    if (!isInstitutionalEmail(normEmail)) {
      setErrorMsg('Only valid @vitbhopal.ac.in institutional emails are eligible for Publisher authorization.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await storage.addManualPublisher({
        email: normEmail,
        name: fullName.trim() || undefined,
        organization: organization.trim() || undefined,
        notes: notes.trim() || undefined,
        adminUserId,
      });

      if (result.isExistingUser) {
        toast(
          `Granted Publisher authorization to existing user "${normEmail}". Access is ACTIVE.`,
          'success'
        );
      } else {
        toast(
          `Created PROVISIONED Publisher authorization for "${normEmail}". Access will activate automatically when this user logs in.`,
          'info'
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add publisher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.18)] max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">Add Publisher Authorization</h2>
              <p className="text-xs text-[#86868B]">Direct administrative provisioning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Architecture Explainer Callout */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-black/[0.06] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-[#1D1D1F]">
              <strong>Single Identity Architecture:</strong> Institutional email is the primary identity lookup. If the user already exists, Publisher capability is added directly to their account. If not, a PROVISIONED record is created with no fake credentials, and claimed upon first sign-in.
            </div>
          </div>

          {/* Institutional Email */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#86868B]" />
              Institutional Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. gdg@vitbhopal.ac.in or student@vitbhopal.ac.in"
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
            />
            <p className="text-[10px] text-[#86868B]">
              Email will be normalized (trimmed and lowercase). Must end with @vitbhopal.ac.in.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#86868B]" />
              Full Name <span className="text-[#86868B] font-normal">(Optional if already in student directory)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Google Developer Group Lead"
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
            />
          </div>

          {/* Department / Organization */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#86868B]" />
              Department / Organization
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Google Developer Groups on Campus / SCSE"
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#86868B]" />
              Administrative Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Authorized by Dean Office for 2026-2027 technical symposium organizing committee."
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-[0_2px_8px_rgba(0,113,227,0.3)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Provisioning...' : 'Add Publisher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
