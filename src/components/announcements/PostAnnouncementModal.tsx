import React, { useState } from 'react';
import { useAuth } from '../../services/auth';
import { storage } from '../../services/storage';
import { CampusLocation, AnnouncementPriority } from '../../types';
import { useToast } from '../layout/Toast';
import {
  X,
  Bell,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Link as LinkIcon,
  Send,
  Sparkles,
  Info,
  Clock,
  User,
} from 'lucide-react';

interface PostAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  locations: CampusLocation[];
}

export const PostAnnouncementModal: React.FC<PostAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  locations,
}) => {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Study Group');
  const [priority, setPriority] = useState<AnnouncementPriority>('medium');
  const [locationId, setLocationId] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Study Group',
    'Academic',
    'Lost & Found',
    'Campus Notice',
    'Workshop',
    'Hackathon',
    'Cultural',
    'Sports',
    'Student Initiative',
    'Transit / Commute',
    'General',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter an announcement title.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide announcement details and description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const selectedLoc = locations.find((l) => l.id === locationId);
      const isStudent = role === 'STUDENT';
      const isAdmin = role === 'ADMIN';

      const announcementId = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newAnnouncement = {
        id: announcementId,
        title: title.trim(),
        description: description.trim(),
        publisherId: user?.id || `user-${Date.now()}`,
        publisherName: user?.name ? (isStudent ? `${user.name} (Student)` : user.name) : 'Student Member',
        locationId: selectedLoc?.id || undefined,
        locationName: selectedLoc?.name || undefined,
        category,
        priority,
        actionUrl: actionUrl.trim() || undefined,
        verified: isAdmin || role === 'FACULTY',
        status: (isAdmin || role === 'FACULTY') ? ('approved' as const) : ('pending' as const),
        authorRole: role,
        authorId: user?.id,
        authorEmail: user?.email,
        authorRegNumber: user?.regNumber || (role === 'STUDENT' ? '24BCE10482' : undefined),
        createdAt: now,
      };

      await storage.saveAnnouncement(newAnnouncement);

      if (isStudent) {
        toast(
          'Announcement submitted! Admin will verify before publishing.',
          'success'
        );
      } else if (isAdmin || role === 'FACULTY') {
        toast('Official faculty announcement published live to campus board!', 'success');
      } else {
        toast('Announcement submitted successfully.', 'success');
      }

      // Reset form
      setTitle('');
      setDescription('');
      setLocationId('');
      setActionUrl('');
      setCategory('Study Group');
      setPriority('medium');

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to post announcement:', err);
      setErrorMessage(err.message || 'Failed to submit announcement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStudent = role === 'STUDENT';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-black/[0.08] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-[#F5F5F7]/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isStudent ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                {isStudent ? 'Submit Student Announcement' : 'Create Campus Announcement'}
              </h2>
              <p className="text-[11px] text-[#86868B]">
                {isStudent
                  ? 'Reviewed & verified by campus admin prior to publishing'
                  : 'Official broadcast notice'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Flow Callout for Students */}
        {isStudent && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold text-amber-900">Admin Verification Protocol</span>
              <p className="text-[11px] text-amber-800">
                To prevent spam and keep notices authentic, your announcement will be checked by a campus administrator. Once verified, it automatically goes live for the entire campus.
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="font-medium text-[#1D1D1F]">
              Announcement Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Peer Study Group: Advanced DSA & LeetCode Sprint"
              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:bg-white focus:border-[#0071E3] transition-colors text-xs"
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] text-xs"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#1D1D1F]">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] text-xs"
              >
                <option value="low">Low (General)</option>
                <option value="medium">Medium (Standard Notice)</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent / Time Sensitive</option>
              </select>
            </div>
          </div>

          {/* Campus Location (Optional) */}
          <div className="space-y-1">
            <label className="font-medium text-[#1D1D1F] flex items-center justify-between">
              <span>Campus Venue or Location</span>
              <span className="text-[10px] text-[#86868B]">Optional</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] text-xs"
              >
                <option value="">No specific location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.building ? `(${loc.building})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-medium text-[#1D1D1F]">
              Announcement Details & Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the notice, event details, timings, instructions, or who to contact..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:bg-white focus:border-[#0071E3] transition-colors text-xs resize-none"
            />
            <div className="text-right text-[10px] text-[#86868B]">
              {description.length} characters
            </div>
          </div>

          {/* Action Link / Contact URL */}
          <div className="space-y-1">
            <label className="font-medium text-[#1D1D1F] flex items-center justify-between">
              <span>External Link or Registration / WhatsApp URL</span>
              <span className="text-[10px] text-[#86868B]">Optional</span>
            </label>
            <div className="relative">
              <LinkIcon className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/... or https://forms.gle/..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:bg-white focus:border-[#0071E3] text-xs"
              />
            </div>
          </div>

          {/* Author Badge */}
          {user && (
            <div className="p-2.5 rounded-xl bg-black/[0.03] border border-black/[0.04] flex items-center justify-between text-[11px] text-[#86868B]">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#1D1D1F]" />
                <span>
                  Posting as: <strong className="text-[#1D1D1F]">{user.name}</strong> ({role})
                </span>
              </div>
              {user.regNumber && (
                <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-black/[0.06]">
                  {user.regNumber}
                </span>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium shadow-[0_2px_8px_rgba(0,113,227,0.25)] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Submitting...</span>
                </>
              ) : isStudent ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Admin Verification</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Publish Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
