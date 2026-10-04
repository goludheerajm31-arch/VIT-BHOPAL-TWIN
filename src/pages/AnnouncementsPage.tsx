import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { Announcement, CampusLocation } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { PostAnnouncementModal } from '../components/announcements/PostAnnouncementModal';
import { RejectAnnouncementModal } from '../components/announcements/RejectAnnouncementModal';
import { useToast } from '../components/layout/Toast';
import {
  Bell,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  User,
  Filter,
  Check,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const { user, role, quickSwitchUser } = useAuth();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'live' | 'my-submissions' | 'verification-queue'>('live');

  // Modals state
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [rejectingAnnouncement, setRejectingAnnouncement] = useState<Announcement | null>(null);

  const loadData = () => {
    setAnnouncements(storage.getAnnouncements());
    setLocations(storage.getLocations());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const pendingAnnouncements = announcements.filter((a) => a.status === 'pending');
  const mySubmissions = user
    ? announcements.filter((a) => a.authorId === user.id || a.publisherId === user.id)
    : [];

  const handleVerify = async (annId: string, title: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can verify announcements', 'error');
      return;
    }
    const updated = await storage.verifyAnnouncement(annId, 'approved');
    if (updated) {
      toast(`Verified and posted "${title}" live to campus board!`, 'success');
      loadData();
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingAnnouncement) return;
    const annId = rejectingAnnouncement.id;
    const title = rejectingAnnouncement.title;

    await storage.verifyAnnouncement(annId, 'rejected', reason);
    toast(`Declined "${title}". Feedback sent to student author.`, 'info');
    setRejectingAnnouncement(null);
    loadData();
  };

  const handleDelete = async (annId: string, title: string) => {
    if (window.confirm(`Are you sure you want to withdraw or delete "${title}"?`)) {
      await storage.deleteAnnouncement(annId);
      toast(`Deleted announcement "${title}"`, 'info');
      loadData();
    }
  };

  // Determine list according to tab
  let displayList: Announcement[] = [];
  if (activeTab === 'verification-queue') {
    displayList = pendingAnnouncements;
  } else if (activeTab === 'my-submissions') {
    displayList = mySubmissions;
  } else {
    // Live announcements: only approved
    displayList = announcements.filter((a) => a.status === 'approved' || (a.verified && a.status !== 'rejected'));
  }

  // Filter query & category
  const filtered = displayList.filter((ann) => {
    if (selectedPriority !== 'All' && ann.priority !== selectedPriority) return false;
    if (selectedCategory !== 'All' && ann.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        ann.title.toLowerCase().includes(q) ||
        ann.description.toLowerCase().includes(q) ||
        ann.publisherName.toLowerCase().includes(q) ||
        (ann.locationName && ann.locationName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Notice
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            General
          </span>
        );
    }
  };

  const getStatusBadge = (ann: Announcement) => {
    if (ann.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 animate-pulse text-amber-600" />
          <span>Pending Admin Verification</span>
        </span>
      );
    }
    if (ann.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Needs Revision / Declined</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>Verified & Live</span>
      </span>
    );
  };

  const allCategories = ['All', ...Array.from(new Set(announcements.map((a) => a.category)))];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Campus Announcements
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Verified Board
            </span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Official communications & verified student initiatives. Student submissions are checked by campus admins before going live.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-semibold shadow-[0_2px_8px_rgba(0,113,227,0.25)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        </div>
      </div>

      {/* Admin Review Banner Alert (Visible to Admin when pending exists) */}
      {role === 'ADMIN' && pendingAnnouncements.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                {pendingAnnouncements.length} Student {pendingAnnouncements.length === 1 ? 'Announcement' : 'Announcements'} Awaiting Verification
              </div>
              <p className="text-[11px] text-amber-800">
                Check and verify student submissions to post them to the public notice board.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('verification-queue')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs whitespace-nowrap cursor-pointer transition-colors"
          >
            Review Queue ({pendingAnnouncements.length})
          </button>
        </div>
      )}

      {/* Student Pending Submissions Notice */}
      {role === 'STUDENT' && mySubmissions.some((s) => s.status === 'pending') && (
        <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Your announcement is currently in the <strong>Admin Verification Queue</strong>. Once approved, it will be published live to the campus board.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('my-submissions')}
            className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
          >
            View Status →
          </button>
        </div>
      )}

      {/* Navigation Tabs (Apple Segmented Style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Bulletins
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('my-submissions')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my-submissions'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>My Submissions</span>
              {mySubmissions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                  {mySubmissions.length}
                </span>
              )}
            </button>
          )}

          {role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('verification-queue')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'verification-queue'
                  ? 'bg-white text-amber-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Verification Queue</span>
              {pendingAnnouncements.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                  {pendingAnnouncements.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High Priority</option>
            <option value="medium">Notice</option>
            <option value="low">General</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((ann) => {
          const isPending = ann.status === 'pending';
          const isRejected = ann.status === 'rejected';
          const isOwner = user && (ann.authorId === user.id || ann.publisherId === user.id);

          return (
            <div
              key={ann.id}
              className={`p-5 rounded-2xl bg-white border transition-all shadow-xs space-y-3.5 ${
                isPending
                  ? 'border-amber-300 bg-amber-50/20'
                  : isRejected
                  ? 'border-rose-300 bg-rose-50/20'
                  : ann.priority === 'urgent'
                  ? 'border-rose-300 bg-rose-50/15'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Top metadata tags */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(ann.priority)}
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {ann.category}
                  </span>
                  {getStatusBadge(ann)}
                </div>

                <div className="flex items-center gap-2">
                  {ann.verified && <VerifiedBadge size="sm" />}
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(ann.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Title & Body */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {ann.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1.5 whitespace-pre-line">
                  {ann.description}
                </p>
              </div>

              {/* Rejection / Feedback Note if rejected */}
              {isRejected && ann.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-900 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Admin Feedback & Reason:</span>
                  </div>
                  <p className="text-[11px] pl-5 text-rose-800">{ann.rejectionReason}</p>
                </div>
              )}

              {/* Footer info & Admin controls */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      By: <strong>{ann.publisherName}</strong>
                    </span>
                    {ann.authorRegNumber && (
                      <span className="text-[10px] bg-slate-100 font-mono px-1.5 py-0.2 rounded border border-slate-200">
                        {ann.authorRegNumber}
                      </span>
                    )}
                  </span>

                  {ann.locationName && (
                    <Link
                      to={ann.locationId ? `/locations/${ann.locationId}` : '/locations'}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{ann.locationName}</span>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Action URL button */}
                  {ann.actionUrl && (
                    <a
                      href={ann.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Action Link</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  )}

                  {/* Owner Withdraw/Delete button */}
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(ann.id, ann.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Withdraw Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Admin Verification Controls */}
                  {role === 'ADMIN' && isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerify(ann.id, ann.title)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify & Post</span>
                      </button>
                      <button
                        onClick={() => setRejectingAnnouncement(ann)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {/* Admin Delete button */}
                  {role === 'ADMIN' && !isPending && (
                    <button
                      onClick={() => handleDelete(ann.id, ann.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700">
              {activeTab === 'verification-queue'
                ? 'All clear! No announcements waiting in the verification queue.'
                : activeTab === 'my-submissions'
                ? 'You have not submitted any announcements yet.'
                : 'No announcements match current filter criteria.'}
            </h3>
            {activeTab === 'my-submissions' && (
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="mt-2 px-4 py-2 bg-[#0071E3] text-white rounded-full text-xs font-semibold shadow-xs"
              >
                Submit Your First Announcement
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post Modal */}
      <PostAnnouncementModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => loadData()}
        locations={locations}
      />

      {/* Reject Modal */}
      <RejectAnnouncementModal
        isOpen={Boolean(rejectingAnnouncement)}
        onClose={() => setRejectingAnnouncement(null)}
        onConfirm={handleRejectConfirm}
        announcementTitle={rejectingAnnouncement?.title || ''}
      />
    </div>
  );
};
