import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

interface RejectAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  announcementTitle: string;
}

export const RejectAnnouncementModal: React.FC<RejectAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  announcementTitle,
}) => {
  const [reason, setReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  if (!isOpen) return null;

  const presets = [
    'Duplicate announcement already posted.',
    'Does not comply with campus communication guidelines.',
    'Incomplete details. Please provide full contact or event specifics.',
    'Commercial solicitation or unofficial promo not allowed.',
    'Please obtain departmental faculty mentor approval first.',
  ];

  const handleSelectPreset = (p: string) => {
    setSelectedPreset(p);
    setReason(p);
  };

  const handleConfirm = () => {
    onConfirm(reason.trim() || 'Declined by administration');
    setReason('');
    setSelectedPreset('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-black/[0.08] overflow-hidden">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1D1D1F]">
                Reject Student Announcement
              </h3>
              <p className="text-[11px] text-[#86868B]">
                Provide feedback to help the student understand why
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded-full hover:bg-black/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-black/[0.02] rounded-xl border border-black/[0.04]">
            <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-semibold">
              Announcement
            </span>
            <div className="font-medium text-[#1D1D1F] mt-0.5 line-clamp-2">
              "{announcementTitle}"
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#1D1D1F]">Common Reasons:</label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-colors cursor-pointer border ${
                    selectedPreset === preset
                      ? 'bg-rose-50 border-rose-200 text-rose-800 font-medium'
                      : 'bg-black/[0.02] border-black/[0.06] text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#1D1D1F]">
              Review Feedback Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedPreset('');
              }}
              placeholder="Explain to the student why this notice was declined and what changes are required..."
              className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] outline-none focus:bg-white focus:border-rose-500 text-xs resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[0.06]">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-medium transition-colors cursor-pointer shadow-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
