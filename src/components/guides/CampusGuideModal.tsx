import React, { useState } from 'react';
import { CampusGuide, GuideAttachment } from '../../types';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
  ChevronRight,
  User,
  ShieldCheck,
} from 'lucide-react';

interface CampusGuideModalProps {
  guide: CampusGuide | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (guide: CampusGuide) => void;
  isAdmin?: boolean;
}

export const CampusGuideModal: React.FC<CampusGuideModalProps> = ({
  guide,
  isOpen,
  onClose,
  onEdit,
  isAdmin = false,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen || !guide) return null;

  const pdfAttachments = guide.attachments?.filter((a) =>
    a.fileType.toLowerCase().includes('pdf') || a.fileName.toLowerCase().endsWith('.pdf')
  ) || [];

  const imageAttachments = guide.attachments?.filter((a) =>
    a.fileType.toLowerCase().startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(a.fileName)
  ) || [];

  const categoryLabels: Record<string, { label: string; color: string }> = {
    ACADEMICS: { label: 'Academics', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    HOSTEL: { label: 'Hostel', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    STUDENT_SERVICES: { label: 'Student Services', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    ADMINISTRATION: { label: 'Administration', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    FINANCE: { label: 'Finance', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLAINTS: { label: 'Complaints', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    PLACEMENTS: { label: 'Placements', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    GENERAL: { label: 'General', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const catMeta = categoryLabels[guide.category] || {
    label: guide.category,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-5 border-b border-black/[0.06] flex items-start justify-between gap-3 bg-[#F5F5F7]/60">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${catMeta.color}`}
              >
                {catMeta.label}
              </span>

              {guide.status === 'DRAFT' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Draft
                </span>
              )}

              {guide.status === 'ARCHIVED' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                  Archived
                </span>
              )}

              <span className="text-[11px] text-[#86868B] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {formatDate(guide.updatedAt)}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F] tracking-tight leading-snug">
              {guide.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(guide)}
                className="px-3 py-1 bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full text-xs font-medium transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/[0.06] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-[#1D1D1F] leading-relaxed">
          {/* Short Description Lead */}
          {guide.shortDescription && (
            <p className="text-sm font-medium text-[#424245] bg-[#F5F5F7] p-3.5 rounded-2xl border border-black/[0.04]">
              {guide.shortDescription}
            </p>
          )}

          {/* Main Description / Overview */}
          {guide.content && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider text-[#86868B]">
                Overview & Context
              </h3>
              <p className="text-xs sm:text-sm text-[#1D1D1F] leading-relaxed whitespace-pre-line">
                {guide.content}
              </p>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {guide.steps && guide.steps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider text-[#86868B] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0071E3]" />
                Step-by-Step Procedure
              </h3>

              <div className="space-y-2.5">
                {guide.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#0071E3]/10 text-[#0071E3] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#1D1D1F] leading-relaxed">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Information Box */}
          {guide.additionalInfo && (
            <div className="space-y-3 bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.05]">
              <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#86868B]" />
                Important Details
              </h3>

              {guide.additionalInfo.whoCanUse && (
                <div className="text-xs">
                  <span className="font-semibold text-[#1D1D1F]">Who can use this: </span>
                  <span className="text-[#424245]">{guide.additionalInfo.whoCanUse}</span>
                </div>
              )}

              {guide.additionalInfo.requiredInformation &&
                guide.additionalInfo.requiredInformation.length > 0 && (
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-[#1D1D1F]">Required Information / Checklist:</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-[#424245]">
                      {guide.additionalInfo.requiredInformation.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {guide.additionalInfo.importantNotes && (
                <div className="text-xs text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                  <span className="font-semibold">Note: </span>
                  {guide.additionalInfo.importantNotes}
                </div>
              )}
            </div>
          )}

          {/* Official External Links */}
          {guide.externalLinks && guide.externalLinks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider text-[#86868B]">
                Official Portals & Resources
              </h3>
              <div className="flex flex-wrap gap-2">
                {guide.externalLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] rounded-full text-xs font-medium transition-colors"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* PDF Attachments */}
          {pdfAttachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider text-[#86868B] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                Documents & Forms ({pdfAttachments.length})
              </h3>
              <div className="space-y-2">
                {pdfAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.fileName}
                    className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.06] hover:border-black/[0.15] bg-white hover:bg-black/[0.01] transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-[#1D1D1F] truncate group-hover:text-[#0071E3] transition-colors">
                          {att.fileName}
                        </div>
                        <div className="text-[10px] text-[#86868B]">
                          PDF Document {att.fileSize ? `· ${formatFileSize(att.fileSize)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[#0071E3] text-xs font-medium shrink-0 pl-2">
                      <span>Download</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Image Attachments */}
          {imageAttachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider text-[#86868B] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#0071E3]" />
                Reference Photos & Examples ({imageAttachments.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {imageAttachments.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img.url || '')}
                    className="group relative rounded-2xl overflow-hidden border border-black/[0.08] aspect-4/3 bg-black/[0.04] cursor-pointer"
                  >
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[10px] text-white truncate font-medium">
                        {img.fileName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Preview for clicked image */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh]">
              <img
                src={selectedImage}
                alt="Enlarged Reference"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#F5F5F7]/80 border-t border-black/[0.06] flex items-center justify-between text-xs text-[#86868B]">
          <span>VIT Bhopal Campus Hub · Official Student Guide</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1D1D1F] hover:bg-black text-white text-xs font-medium rounded-full transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
