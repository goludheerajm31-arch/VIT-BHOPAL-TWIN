import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useDemoRole } from '../services/demoRoleSwitcher';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent, Announcement, PublisherApplication } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { PostAnnouncementModal } from '../components/announcements/PostAnnouncementModal';
import { ApplyPublisherModal } from '../components/publisher/ApplyPublisherModal';
import { useToast } from '../components/layout/Toast';
import {
  Bookmark,
  Calendar,
  MapPin,
  Navigation,
  Compass,
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
  LogOut,
  Mail,
  GraduationCap,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { activeRole, isSimulated } = useDemoRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [savedLocations, setSavedLocations] = useState<CampusLocation[]>([]);
  const [savedEvents, setSavedEvents] = useState<CampusEvent[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [publisherApp, setPublisherApp] = useState<PublisherApplication | null>(null);
  const [hasPublisherAccess, setHasPublisherAccess] = useState(false);

  const loadData = () => {
    if (!user) return;
    setSavedLocations(storage.getSavedLocations(user.id));
    setSavedEvents(storage.getSavedEvents(user.id));
    setLocations(storage.getLocations());

    const isPub =
      storage.hasPublisherAccess(user.email) ||
      storage.hasPublisherAccess(user.id) ||
      Boolean(user.isPublisher);
    setHasPublisherAccess(isPub);

    const app = storage.getPublisherApplicationByEmail(user.email);
    setPublisherApp(app || null);

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
        <h2 className="text-xl font-bold text-[#1D1D1F]">Profile & Dashboard</h2>
        <p className="text-xs text-[#86868B]">Please sign in to view your profile and saved items.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-[#0071E3] text-white font-semibold rounded-xl text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Profile Identity Card */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0071E3] text-white font-bold text-xl flex items-center justify-center shadow-xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#1D1D1F] tracking-tight">{user.name}</h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/[0.04] text-[#1D1D1F]">
                {role}
              </span>
              {isSimulated && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Demo: {activeRole}
                </span>
              )}
            </div>
            <div className="text-xs text-[#86868B]">
              {user.department || 'School of Computing Science & Engineering'}
              {user.regNumber && <span> · Reg: {user.regNumber}</span>}
            </div>
            <div className="text-[11px] text-[#86868B] font-mono">{user.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. Publisher Access Contextual Section */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
              Publishing Privileges
            </div>
            <h2 className="text-base font-bold text-[#1D1D1F] tracking-tight">Publisher Access</h2>
            {hasPublisherAccess ? (
              <p className="text-xs text-[#86868B]">
                Your account is authorized to schedule live events and post official notices.
              </p>
            ) : publisherApp?.status === 'PENDING' ? (
              <p className="text-xs text-amber-700">
                Application under review by campus administration.
              </p>
            ) : (
              <p className="text-xs text-[#86868B]">
                Apply for publisher privileges to organize club activities and publish events.
              </p>
            )}
          </div>

          <div className="shrink-0">
            {hasPublisherAccess ? (
              <Link
                to="/publisher"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Open Publisher Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : publisherApp?.status === 'PENDING' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Application Pending</span>
              </div>
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Apply for Access
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bookmarks & Saved Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Saved Places */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-bold text-[#1D1D1F]">
                Saved Locations ({savedLocations.length})
              </h2>
            </div>
            <Link to="/locations" className="text-xs font-semibold text-[#0071E3] hover:underline">
              Explore All
            </Link>
          </div>

          <div className="space-y-2">
            {savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] flex items-center justify-between gap-3 hover:bg-black/[0.05] transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-[#1D1D1F] truncate">{loc.name}</div>
                  <div className="text-[11px] text-[#86868B] truncate">
                    {loc.building} · {loc.floor}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      navigate(`/explore?to=${loc.id}&from=loc-ab-1&navigate=true`)
                    }
                    className="p-1.5 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs cursor-pointer shadow-2xs"
                    title="Navigate Here"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/locations/${loc.id}`}
                    className="p-1.5 rounded-lg bg-white border border-black/[0.08] text-[#1D1D1F] hover:bg-slate-50 text-xs"
                    title="View Profile"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {savedLocations.length === 0 && (
              <div className="text-center py-6 text-xs text-[#86868B]">
                No saved locations yet. Tap the bookmark icon on any campus location to save it.
              </div>
            )}
          </div>
        </div>

        {/* Bookmarked Events */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-bold text-[#1D1D1F]">
                Bookmarked Events ({savedEvents.length})
              </h2>
            </div>
            <Link to="/events" className="text-xs font-semibold text-[#0071E3] hover:underline">
              Events
            </Link>
          </div>

          <div className="space-y-2">
            {savedEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] flex items-center justify-between gap-3 hover:bg-black/[0.05] transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-[#1D1D1F] truncate">{ev.title}</div>
                  <div className="text-[11px] text-[#86868B] truncate">
                    {ev.date} · {ev.startTime} · {ev.locationName}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      navigate(
                        `/explore?to=${ev.locationId}&from=loc-ab-1&navigate=true`
                      )
                    }
                    className="p-1.5 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs cursor-pointer shadow-2xs"
                    title="Directions"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/events/${ev.id}`}
                    className="p-1.5 rounded-lg bg-white border border-black/[0.08] text-[#1D1D1F] hover:bg-slate-50 text-xs"
                    title="Details"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {savedEvents.length === 0 && (
              <div className="text-center py-6 text-xs text-[#86868B]">
                No bookmarked events yet. Bookmark workshops to get quick access here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Submissions / Announcements */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#1D1D1F]">
              My Posted Notices ({myAnnouncements.length})
            </h2>
            <p className="text-xs text-[#86868B]">
              Announcements submitted from your account
            </p>
          </div>
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Notice</span>
          </button>
        </div>

        <div className="space-y-2">
          {myAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1D1D1F] truncate">{ann.title}</span>
                  <span className="text-[10px] text-[#86868B]">
                    {ann.status === 'approved' ? 'Active' : ann.status === 'pending' ? 'Pending' : 'Declined'}
                  </span>
                </div>
                <div className="text-[11px] text-[#86868B] line-clamp-1">{ann.description}</div>
              </div>

              <button
                onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                className="p-1.5 text-[#86868B] hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                title="Remove Notice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {myAnnouncements.length === 0 && (
            <div className="text-center py-6 text-xs text-[#86868B]">
              You haven't posted any notices yet.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PostAnnouncementModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => loadData()}
        locations={locations}
      />

      <ApplyPublisherModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSuccess={() => loadData()}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
        }}
      />
    </div>
  );
};
