import React, { useState } from 'react';
import { FacultyApplication } from '../../types';
import { storage } from '../../services/storage';
import { useToast } from '../layout/Toast';
import {
  GraduationCap,
  X,
  User,
  Mail,
  Building,
  Briefcase,
  BadgeAlert,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface FacultyApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: FacultyApplication | null;
  onReviewed?: () => void;
  adminUserId?: string;
}

export const FacultyApplicationDetailModal: React.FC<FacultyApplicationDetailModalProps> = ({
  isOpen,
  onClose,
  application,
  onReviewed,
  adminUserId,
}) => {
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!isOpen || !application) return null;

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await storage.reviewFacultyApplication(application.id, 'APPROVED', adminUserId);
      toast(
        `Application approved! Dr. ${application.name} has been activated with linked faculty privileges.`,
        'success'
      );
      if (onReviewed) onReviewed();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to approve application', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast('Please provide a reason for rejecting the application.', 'error');
      return;
    }

    setProcessing(true);
    try {
      await storage.reviewFacultyApplication(
        application.id,
        'REJECTED',
        adminUserId,
        rejectionReason.trim()
      );
      toast(`Application for ${application.name} rejected.`, 'info');
      if (onReviewed) onReviewed();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to reject application', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const isPending = application.status === 'PENDING';

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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1D1D1F]">
                  Faculty Application Review
                </h2>
                {application.status === 'PENDING' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    PENDING
                  </span>
                )}
                {application.status === 'APPROVED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    APPROVED
                  </span>
                )}
                {application.status === 'REJECTED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    REJECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#86868B] font-mono mt-0.5">
                ID: {application.id}
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

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Main Info Card */}
          <div className="bg-[#F5F5F7] rounded-2xl p-4 space-y-3 border border-black/[0.04]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F]">
                  {application.name}
                </h3>
                <p className="text-xs text-[#86868B] mt-0.5">
                  {application.designation}
                </p>
              </div>
              <span className="text-[11px] text-[#86868B] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(application.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="pt-2 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#86868B] block text-[11px]">Institutional Email</span>
                <span className="font-mono text-[#1D1D1F] font-medium break-all">
                  {application.email}
                </span>
              </div>
              <div>
                <span className="text-[#86868B] block text-[11px]">Department</span>
                <span className="text-[#1D1D1F] font-medium">
                  {application.department}
                </span>
              </div>
              <div>
                <span className="text-[#86868B] block text-[11px]">Employee / Faculty ID</span>
                <span className="font-mono text-[#1D1D1F]">
                  {application.employeeId || application.employee_id || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-[#86868B] block text-[11px]">Linked Auth Identity</span>
                <span className="font-mono text-[11px] text-[#86868B]">
                  {application.authUserId || application.auth_user_id || 'Awaiting Google Sign-In'}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {application.additionalInformation && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                Additional Information & Notes
              </label>
              <div className="p-3 rounded-xl bg-white border border-black/[0.08] text-[#1D1D1F] leading-relaxed">
                {application.additionalInformation}
              </div>
            </div>
          )}

          {/* Supporting Document */}
          {application.supportingDocumentUrl && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                Supporting Verification Document
              </label>
              <a
                href={application.supportingDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[#0071E3] hover:bg-blue-100/70 transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate text-xs font-medium">
                    {application.supportingDocumentUrl}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Status info if already reviewed */}
          {application.status === 'APPROVED' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Approved and Activated.</strong> The faculty record has been created/activated with status ACTIVE.
                {application.reviewedAt && (
                  <span className="block text-[11px] text-emerald-700 mt-0.5">
                    Reviewed on {new Date(application.reviewedAt).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Application Rejected.</strong>
                  {application.rejectionReason && (
                    <p className="mt-1 text-xs">{application.rejectionReason}</p>
                  )}
                  {application.reviewedAt && (
                    <span className="block text-[11px] text-rose-700 mt-0.5">
                      Reviewed on {new Date(application.reviewedAt).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reject Form toggle */}
          {rejecting && isPending && (
            <form onSubmit={handleReject} className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3">
              <div className="flex items-center gap-1.5 text-rose-900 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Specify Rejection Reason</span>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the application is not approved (e.g. invalid employee ID, unverified faculty credential)..."
                rows={2}
                required
                className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-3 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {processing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          )}

          {/* Action Buttons for Pending */}
          {isPending && !rejecting && (
            <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[#86868B] hover:text-[#1D1D1F] rounded-xl text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{processing ? 'Approving...' : 'Approve & Activate'}</span>
                </button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className="pt-3 border-t border-black/[0.06] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1D1D1F] text-white rounded-xl text-xs font-medium hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
