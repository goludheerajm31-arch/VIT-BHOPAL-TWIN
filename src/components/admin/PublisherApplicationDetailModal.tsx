import React, { useState } from 'react';
import { X, Check, XCircle, Clock, ShieldCheck, Mail, Building2, User, FileText, AlertTriangle } from 'lucide-react';
import { PublisherApplication } from '../../types';
import { storage } from '../../services/storage';
import { useToast } from '../layout/Toast';

interface PublisherApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: PublisherApplication | null;
  onSuccess: () => void;
  adminUserId?: string;
}

export const PublisherApplicationDetailModal: React.FC<PublisherApplicationDetailModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
  adminUserId,
}) => {
  const { toast } = useToast();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !application) return null;

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await storage.reviewPublisherApplication(application.id, 'APPROVED', adminUserId);
      toast(`Publisher Access approved for ${application.name}! Authorization is active.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to approve application', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast('Please provide a reason for rejecting the application.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      await storage.reviewPublisherApplication(
        application.id,
        'REJECTED',
        adminUserId,
        rejectionReason.trim()
      );
      toast(`Application for ${application.name} has been rejected.`, 'info');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to reject application', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.18)] max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                Publisher Access Application
              </h2>
              {application.status === 'PENDING' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-pulse" />
                  Pending Review
                </span>
              )}
              {application.status === 'APPROVED' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Approved & Active
                </span>
              )}
              {application.status === 'REJECTED' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Rejected
                </span>
              )}
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              Submitted on {new Date(application.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(application.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Identity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04]">
            <div className="space-y-1">
              <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-semibold flex items-center gap-1">
                <User className="w-3 h-3" /> Applicant Name
              </span>
              <div className="font-semibold text-sm text-[#1D1D1F]">{application.name}</div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-semibold flex items-center gap-1">
                <Mail className="w-3 h-3" /> Institutional Email
              </span>
              <div className="font-mono text-xs text-[#0071E3] truncate">{application.email}</div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-semibold flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Organization / Club
              </span>
              <div className="font-medium text-xs text-[#1D1D1F]">
                {application.organization || 'General Campus Community Publisher'}
              </div>
            </div>
          </div>

          {/* Stated Reason */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#1D1D1F] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0071E3]" />
              Purpose & Publishing Reason
            </span>
            <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] text-slate-700 leading-relaxed text-xs whitespace-pre-wrap">
              {application.reason}
            </div>
          </div>

          {/* Additional Information */}
          {application.additionalInformation && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#1D1D1F]">Additional Information / Endorsements</span>
              <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/[0.04] text-[#86868B] text-xs">
                {application.additionalInformation}
              </div>
            </div>
          )}

          {/* Rejection Feedback if already rejected */}
          {application.status === 'REJECTED' && application.rejectionReason && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" /> Rejection Feedback
              </div>
              <p className="text-[11px] leading-relaxed">{application.rejectionReason}</p>
              {application.reviewedBy && (
                <div className="text-[10px] text-rose-600 mt-1">
                  Reviewed by {application.reviewedBy} on {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : 'N/A'}
                </div>
              )}
            </div>
          )}

          {/* Approved Metadata if already approved */}
          {application.status === 'APPROVED' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Authorization Active:</strong> This user has been granted Publisher privileges. Their existing authenticated student identity was preserved without duplicate profiles or credentials.
              </div>
            </div>
          )}

          {/* Rejection Form Input (when admin clicks Reject) */}
          {isRejecting && (
            <form onSubmit={handleReject} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
              <div className="font-semibold text-rose-900 text-xs flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                Specify Reason for Rejection
              </div>
              <textarea
                required
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being declined (e.g., student chapter authorization letter required, contact faculty mentor)."
                className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 focus:outline-hidden focus:ring-2 focus:ring-rose-400 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
          >
            Close
          </button>

          {application.status === 'PENDING' && !isRejecting && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRejecting(true)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              >
                Reject Application...
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-[0_2px_8px_rgba(0,113,227,0.3)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Approving...' : 'Approve & Activate'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
