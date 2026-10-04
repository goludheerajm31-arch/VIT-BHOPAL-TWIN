import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent, Announcement } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { PostAnnouncementModal } from '../components/announcements/PostAnnouncementModal';
import { useToast } from '../components/layout/Toast';
import {
  Bookmark,
  Calendar,
  MapPin,
  Navigation,
  Compass,
  Search,
  User,
  Clock,
  ArrowRight,
  Sparkles,
  Bell,
  Plus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [savedLocations, setSavedLocations] = useState<CampusLocation[]>([]);
  const [savedEvents, setSavedEvents] = useState<CampusEvent[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const loadData = () => {
    if (!user) return;
    setSavedLocations(storage.getSavedLocations(user.id));
    setSavedEvents(storage.getSavedEvents(user.id));
    setLocations(storage.getLocations());

    const allAnnouncements = storage.getAnnouncements();
    const studentItems = allAnnouncements.filter(
      (a) => a.authorId === user.id || a.publisherId === user.id
    );
    setMyAnnouncements(studentItems);
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [user]);

  const handleDeleteAnnouncement = async (annId: string, title: string) => {
    if (window.confirm(`Are you sure you want to withdraw or delete "${title}"?`)) {
      await storage.deleteAnnouncement(annId);
      toast(`Deleted announcement "${title}"`, 'info');
      loadData();
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Student Dashboard</h2>
        <p className="text-xs text-slate-500">Please sign in to view your dashboard and announcements.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const pendingCount = myAnnouncements.filter((a) => a.status === 'pending').length;
  const approvedCount = myAnnouncements.filter((a) => a.status === 'approved' || (a.verified && a.status !== 'rejected')).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
            {user.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{user.name}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {role}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {user.department || 'Computer Science & Engineering'} · Reg: {user.regNumber || '24BCG10042'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{user.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
          <Link
            to="/explore"
            className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>Map</span>
          </Link>
        </div>
      </div>

      {/* Student Announcements & Verification Status Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  My Campus Announcements ({myAnnouncements.length})
                </h2>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-pulse" />
                    {pendingCount} Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Track verification progress of your announcements. Admin must check and approve before they get published live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/announcements"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Public Board →
            </Link>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Announcement</span>
            </button>
          </div>
        </div>

        {/* Verification Status Explainer for Students */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>Institutional Trust Verification:</strong> When you post an announcement, it enters the administrative verification queue. Once an administrator validates the details, it goes live immediately on the university board with an official verified badge.
          </div>
        </div>

        {/* List of Student Submissions */}
        <div className="space-y-3">
          {myAnnouncements.map((ann) => {
            const isPending = ann.status === 'pending';
            const isRejected = ann.status === 'rejected';
            const isApproved = ann.status === 'approved' || (ann.verified && !isRejected);

            return (
              <div
                key={ann.id}
                className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                  isPending
                    ? 'bg-amber-50/30 border-amber-200'
                    : isRejected
                    ? 'bg-rose-50/30 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ann.category}
                    </span>

                    {/* Status Pill */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3 h-3 animate-pulse text-amber-600" />
                        <span>Pending Admin Verification</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified & Published Live</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Needs Revision / Declined</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(ann.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ann.description}</p>
                </div>

                {/* If rejected, show admin note */}
                {isRejected && ann.rejectionReason && (
                  <div className="p-2.5 rounded-lg bg-rose-100/60 border border-rose-200 text-rose-900 text-xs">
                    <span className="font-semibold">Admin feedback: </span>
                    <span>{ann.rejectionReason}</span>
                  </div>
                )}

                {/* Bottom row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    {ann.locationName && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{ann.locationName}</span>
                      </span>
                    )}
                    {ann.reviewedBy && (
                      <span className="text-[11px] text-slate-400">
                        Reviewed by: {ann.reviewedBy}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved && (
                      <Link
                        to="/announcements"
                        className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>View on Board</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Withdraw Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {myAnnouncements.length === 0 && (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-600 max-w-sm mx-auto">
                You haven't posted any announcements yet. Create a study circle, post lost & found, or share a student initiative.
              </div>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Your First Announcement</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Saved Places & Saved Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Places */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Saved Locations ({savedLocations.length})
              </h2>
            </div>
            <Link to="/locations" className="text-xs font-semibold text-blue-600 hover:underline">
              Browse All →
            </Link>
          </div>

          <div className="space-y-2">
            {savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs sm:text-sm text-slate-900">{loc.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {loc.building} · {loc.floor}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() =>
                      navigate(`/explore?to=${loc.id}&from=loc-ab-1&navigate=true`)
                    }
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Navigate Here"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/locations/${loc.id}`}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                    title="View Details"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {savedLocations.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                No saved locations yet. Tap the bookmark icon on any location to save it.
              </div>
            )}
          </div>
        </div>

        {/* Saved Events */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">
                Bookmarked Events ({savedEvents.length})
              </h2>
            </div>
            <Link to="/events" className="text-xs font-semibold text-blue-600 hover:underline">
              Events Schedule →
            </Link>
          </div>

          <div className="space-y-2">
            {savedEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-rose-50/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {ev.title}
                    </span>
                    {ev.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ev.date} · {ev.startTime} · 📍 {ev.locationName}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() =>
                      navigate(
                        `/explore?to=${ev.locationId}&from=loc-ab-1&navigate=true`
                      )
                    }
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Navigate to Venue"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/events/${ev.id}`}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                    title="View Details"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {savedEvents.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                No bookmarked events yet. Bookmark upcoming workshops and club events!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Announcement Modal */}
      <PostAnnouncementModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => loadData()}
        locations={locations}
      />
    </div>
  );
};
