import React, { useState, useEffect } from 'react';
import {
  CampusGuide,
  GuideCategory,
  GuideStatus,
  GuideAttachment,
  GuideExternalLink,
} from '../../types';
import { storage } from '../../services/storage';
import { uploadGuideFileToStorage } from '../../lib/supabase';
import { useToast } from '../layout/Toast';
import { useAuth } from '../../services/auth';
import {
  X,
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  Layers,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface AddEditGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (guide: CampusGuide) => void;
  initialGuide?: CampusGuide | null;
}

const CATEGORIES: { value: GuideCategory; label: string }[] = [
  { value: 'ACADEMICS', label: 'Academics' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'STUDENT_SERVICES', label: 'Student Services' },
  { value: 'ADMINISTRATION', label: 'Administration' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'COMPLAINTS', label: 'Complaints' },
  { value: 'PLACEMENTS', label: 'Placements' },
  { value: 'GENERAL', label: 'General' },
];

export const AddEditGuideModal: React.FC<AddEditGuideModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialGuide,
}) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isEditing = Boolean(initialGuide);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GuideCategory>('HOSTEL');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<GuideStatus>('DRAFT');
  const [displayOrder, setDisplayOrder] = useState<number>(1);

  // Structured Steps
  const [steps, setSteps] = useState<string[]>(['']);

  // Additional Information
  const [whoCanUse, setWhoCanUse] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [requiredItems, setRequiredItems] = useState<string[]>(['']);

  // External Links
  const [externalLinks, setExternalLinks] = useState<GuideExternalLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<GuideAttachment[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialGuide) {
      setTitle(initialGuide.title);
      setCategory(initialGuide.category);
      setShortDescription(initialGuide.shortDescription || '');
      setContent(initialGuide.content || '');
      setStatus(initialGuide.status || 'DRAFT');
      setDisplayOrder(initialGuide.displayOrder || 1);
      setSteps(initialGuide.steps && initialGuide.steps.length > 0 ? initialGuide.steps : ['']);
      setWhoCanUse(initialGuide.additionalInfo?.whoCanUse || '');
      setImportantNotes(initialGuide.additionalInfo?.importantNotes || '');
      setRequiredItems(
        initialGuide.additionalInfo?.requiredInformation &&
          initialGuide.additionalInfo.requiredInformation.length > 0
          ? initialGuide.additionalInfo.requiredInformation
          : ['']
      );
      setExternalLinks(initialGuide.externalLinks || []);
      setAttachments(initialGuide.attachments || []);
    } else {
      resetForm();
    }
  }, [initialGuide, isOpen]);

  const resetForm = () => {
    setTitle('');
    setCategory('HOSTEL');
    setShortDescription('');
    setContent('');
    setStatus('DRAFT');
    setDisplayOrder(storage.getCampusGuides('all').length + 1);
    setSteps(['']);
    setWhoCanUse('');
    setImportantNotes('');
    setRequiredItems(['']);
    setExternalLinks([]);
    setAttachments([]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  if (!isOpen) return null;

  // Step Management
  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleUpdateStep = (index: number, val: string) => {
    const next = [...steps];
    next[index] = val;
    setSteps(next);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) {
      setSteps(['']);
      return;
    }
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  // Required Information Items
  const handleAddRequiredItem = () => {
    setRequiredItems([...requiredItems, '']);
  };

  const handleUpdateRequiredItem = (index: number, val: string) => {
    const next = [...requiredItems];
    next[index] = val;
    setRequiredItems(next);
  };

  const handleRemoveRequiredItem = (index: number) => {
    if (requiredItems.length === 1) {
      setRequiredItems(['']);
      return;
    }
    setRequiredItems(requiredItems.filter((_, idx) => idx !== index));
  };

  // External Link Management
  const handleAddLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      toast('Please enter both a label and a URL for the official link.', 'error');
      return;
    }

    let cleanUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    setExternalLinks([...externalLinks, { label: newLinkLabel.trim(), url: cleanUrl }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, idx) => idx !== index));
  };

  // File Upload Handler (Supabase Storage)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const targetGuideId = initialGuide?.id || crypto.randomUUID();

    try {
      setIsUploadingFile(true);
      const uploaded = await uploadGuideFileToStorage(file, targetGuideId);

      const newAttachment: GuideAttachment = {
        id: crypto.randomUUID(),
        guideId: targetGuideId,
        fileName: uploaded.fileName,
        fileType: uploaded.fileType,
        storagePath: uploaded.storagePath,
        fileSize: uploaded.fileSize,
        createdAt: new Date().toISOString(),
        url: uploaded.publicUrl,
      };

      setAttachments((prev) => [...prev, newAttachment]);
      toast(`Uploaded ${file.name} successfully!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to upload file.', 'error');
    } finally {
      setIsUploadingFile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
    toast('Attachment removed from guide draft.', 'info');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role !== 'ADMIN') {
      toast('Only administrators can create or modify campus guides.', 'error');
      return;
    }

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast('Guide title is required.', 'error');
      return;
    }

    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    const cleanRequired = requiredItems.map((r) => r.trim()).filter(Boolean);

    const guidePayload: Partial<CampusGuide> & { title: string; category: GuideCategory } = {
      id: initialGuide?.id,
      title: cleanTitle,
      category,
      shortDescription: shortDescription.trim(),
      content: content.trim(),
      steps: cleanSteps,
      additionalInfo: {
        whoCanUse: whoCanUse.trim() || undefined,
        requiredInformation: cleanRequired.length > 0 ? cleanRequired : undefined,
        importantNotes: importantNotes.trim() || undefined,
      },
      externalLinks,
      attachments,
      status,
      displayOrder: Number(displayOrder) || 1,
    };

    try {
      setIsSubmitting(true);
      const saved = await storage.saveCampusGuide(guidePayload, user?.id);
      toast(
        isEditing
          ? `Updated guide "${saved.title}" (Status: ${saved.status})`
          : `Created guide "${saved.title}" (Status: ${saved.status})`,
        'success'
      );

      if (onSuccess) {
        onSuccess(saved);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to save campus guide.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-[#F5F5F7]/70">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F] tracking-tight">
              {isEditing ? 'Edit Campus Guide' : 'Add New Campus Guide'}
            </h2>
            <p className="text-xs text-[#86868B]">
              CMS Content Editor for permanent campus procedures, rules, and student checklists.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/[0.06] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#1D1D1F]">
          {/* Title & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-[#1D1D1F] flex items-center gap-1">
                <span>Guide Title</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to Submit a Hostel Complaint"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1D1D1F]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GuideCategory)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lifecycle Status & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F5F5F7]/70 p-3.5 rounded-2xl border border-black/[0.04]">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#1D1D1F]">Lifecycle Status</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as GuideStatus[]).map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setStatus(st)}
                    className={`py-1.5 rounded-xl font-medium text-[11px] transition-all cursor-pointer border ${
                      status === st
                        ? st === 'PUBLISHED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : st === 'DRAFT'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                        : 'bg-white text-[#424245] border-black/[0.08] hover:bg-black/[0.02]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#86868B]">
                {status === 'PUBLISHED'
                  ? 'Visible immediately to all students on Campus Hub.'
                  : status === 'DRAFT'
                  ? 'Visible only to administrators in CMS management view.'
                  : 'Hidden from active student listings, archived for records.'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1D1D1F]">Display Order Priority</label>
              <input
                type="number"
                min="1"
                max="999"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/[0.08] focus:border-[#0071E3] outline-none text-xs"
              />
              <p className="text-[10px] text-[#86868B]">
                Lower numbers appear higher on student category pages (1 = Top).
              </p>
            </div>
          </div>

          {/* Short Summary */}
          <div className="space-y-1">
            <label className="font-semibold text-[#1D1D1F]">
              Short Description (Card Teaser)
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Concise 1-line summary displayed on search results and cards..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs"
            />
          </div>

          {/* Main Context / Body */}
          <div className="space-y-1">
            <label className="font-semibold text-[#1D1D1F]">
              Overview & Procedural Context
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Background context, university policy notes, or scope of this procedure..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs leading-relaxed"
            />
          </div>

          {/* Step-by-Step Instructions Builder */}
          <div className="space-y-2 border-t border-black/[0.06] pt-3.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0071E3]" />
                Step-by-Step Instructions
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="px-2.5 py-1 bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Step
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-black/[0.05] text-[#1D1D1F] font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    placeholder={`Step ${idx + 1} action (e.g. Open the hostel portal and select Maintenance...)`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1.5 text-[#86868B] hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information / Rules Box */}
          <div className="space-y-3 border-t border-black/[0.06] pt-3.5">
            <label className="font-semibold text-[#1D1D1F] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#86868B]" />
              Additional Details & Eligibility
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-[#424245] font-medium">Who can use this:</span>
                <input
                  type="text"
                  value={whoCanUse}
                  onChange={(e) => setWhoCanUse(e.target.value)}
                  placeholder="e.g. All residential hostellers in Block 1 & 2"
                  className="w-full px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#424245] font-medium">Important Note / Warning:</span>
                <input
                  type="text"
                  value={importantNotes}
                  onChange={(e) => setImportantNotes(e.target.value)}
                  placeholder="e.g. In case of emergency electrical leaks, notify warden directly."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#0071E3] outline-none text-xs"
                />
              </div>
            </div>

            {/* Required Checklist Items */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#424245] font-medium">Required Documents / Information:</span>
                <button
                  type="button"
                  onClick={handleAddRequiredItem}
                  className="text-[10px] text-[#0071E3] font-medium hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add item
                </button>
              </div>

              <div className="space-y-1.5">
                {requiredItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateRequiredItem(idx, e.target.value)}
                      placeholder="e.g. Room number, Parent consent slip, or Student ID..."
                      className="flex-1 px-3 py-1 rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-xs focus:bg-white focus:border-[#0071E3] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRequiredItem(idx)}
                      className="p-1 text-[#86868B] hover:text-rose-600 rounded-full cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Official External Links */}
          <div className="space-y-2 border-t border-black/[0.06] pt-3.5">
            <label className="font-semibold text-[#1D1D1F] flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-[#0071E3]" />
              Official Portal Links & Resources
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Button Label (e.g. Open Hostel Portal)"
                className="w-full sm:w-1/3 px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white text-xs outline-none"
              />
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="URL (e.g. https://vitbhopal.ac.in/portal)"
                className="w-full sm:flex-1 px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] focus:bg-white text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-3 py-1.5 bg-[#1D1D1F] hover:bg-black text-white rounded-xl text-xs font-medium shrink-0 cursor-pointer"
              >
                Add Link
              </button>
            </div>

            {externalLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {externalLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/[0.04] text-[#1D1D1F] rounded-full text-xs font-medium border border-black/[0.06]"
                  >
                    <span>{link.label}</span>
                    <span className="text-[#86868B] text-[10px]">({link.url})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(idx)}
                      className="text-[#86868B] hover:text-rose-600 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Attachments (Supabase Storage) */}
          <div className="space-y-2.5 border-t border-black/[0.06] pt-3.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-[#0071E3]" />
                Attachments (PDFs & Photos)
              </label>
              <span className="text-[10px] text-[#86868B]">
                Max 15MB · PDF, JPG, PNG, WEBP
              </span>
            </div>

            {/* Upload Drop Zone / Button */}
            <div className="p-4 border-2 border-dashed border-black/[0.1] rounded-2xl hover:bg-black/[0.01] transition-colors text-center relative">
              <input
                type="file"
                accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={isUploadingFile}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                <UploadCloud className="w-6 h-6 text-[#0071E3]" />
                <span className="font-semibold text-xs text-[#1D1D1F]">
                  {isUploadingFile ? 'Uploading to Supabase Storage...' : 'Click or Drag files to attach'}
                </span>
                <span className="text-[10px] text-[#86868B]">
                  Official handbook PDFs, application forms, or portal screenshots
                </span>
              </div>
            </div>

            {/* List of Attached Files */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-black/[0.06] bg-[#F5F5F7] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.fileType.includes('pdf') ? (
                        <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-[#0071E3] shrink-0" />
                      )}
                      <span className="font-medium text-[#1D1D1F] truncate">{att.fileName}</span>
                      <span className="text-[10px] text-[#86868B] shrink-0 font-mono">
                        {(att.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 text-[#86868B] hover:text-rose-600 rounded-full transition-colors cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="p-4 bg-[#F5F5F7]/80 rounded-2xl flex items-center justify-between gap-3 border border-black/[0.04]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-black/[0.1] text-xs font-semibold text-[#1D1D1F] hover:bg-black/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(0,113,227,0.25)]"
            >
              {isSubmitting ? 'Saving Guide...' : isEditing ? 'Save Changes' : 'Create Guide'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
