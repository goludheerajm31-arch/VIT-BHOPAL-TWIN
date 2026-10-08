import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Building2, User, Mail, FileText, Info } from 'lucide-react';
import { storage } from '../../services/storage';
import { useToast } from '../layout/Toast';

interface ApplyPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export const ApplyPublisherModal: React.FC<ApplyPublisherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user.name || '');
  const [organization, setOrganization] = useState('');
  const [reason, setReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.name || '');
      setOrganization('');
      setReason('');
      setAdditionalInfo('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Please state your reason for requesting publisher authorization.');
      return;
    }

    if (reason.trim().length < 20) {
      setErrorMsg('Please provide a slightly more descriptive reason (at least 20 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      await storage.submitPublisherApplication({
        name: fullName.trim(),
        email: user.email,
        reason: reason.trim(),
        organization: organization.trim() || undefined,
        additionalInformation: additionalInfo.trim() || undefined,
        authUserId: user.id,
      });

      toast('Publisher Access application submitted successfully for administrative review.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application. Please try again.');
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">Apply for Publisher Access</h2>
              <p className="text-xs text-[#86868B]">Official VIT Bhopal Campus Twin publishing authorization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Institutional Trust Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2.5 text-[#1D1D1F]">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-indigo-950">
              <strong>Single Institutional Identity:</strong> You will remain an authenticated student. Approval simply grants an additional Publisher capability to your account for creating official events and club notices.
            </div>
          </div>

          {/* Institutional Email (Read-Only) */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#86868B]" />
              Institutional Email <span className="text-[#86868B] font-normal">(Read-only identity)</span>
            </label>
            <input
              type="email"
              readOnly
              value={user.email}
              className="w-full px-3.5 py-2.5 bg-black/[0.03] border border-black/[0.08] rounded-xl text-slate-700 font-mono text-xs cursor-not-allowed select-all"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#86868B]" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Patel"
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
            />
          </div>

          {/* Organization / Club / Department */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#86868B]" />
              Organization / Club / Department <span className="text-[#86868B] font-normal">(if applicable)</span>
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. AI & ML Club, Robotics Society, IEEE Student Branch"
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
            />
          </div>

          {/* Reason for Requesting Publisher Access */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#86868B]" />
              Reason for Requesting Publisher Access *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you or your student chapter require publishing permissions (e.g. posting official workshops, hackathons, guest lectures, or club recruitments)."
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.1] rounded-xl text-[#1D1D1F] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] resize-none"
            />
          </div>

          {/* Additional Information (Optional) */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F]">
              Additional Information <span className="text-[#86868B] font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Faculty advisor name, chapter registration ID, or past campus events hosted."
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
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
