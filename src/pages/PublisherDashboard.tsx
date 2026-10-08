import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useDemoRole } from '../services/demoRoleSwitcher';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusEvent, Announcement } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { useToast } from '../components/layout/Toast';
import {
  PlusCircle,
  Calendar,
  Bell,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Users,
  Eye,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';

export const PublisherDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const { activeRole, isSimulated } = useDemoRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [publisherEvents, setPublisherEvents] = useState<CampusEvent[]>([]);
  const [publisherAnnouncements, setPublisherAnnouncements] = useState<Announcement[]>([]);

  const isAuthorizedPublisher =
    role === 'ADMIN' ||
    role === 'PUBLISHER' ||
    activeRole === 'ADMIN' ||
    activeRole === 'PUBLISHER' ||
    Boolean(user?.isPublisher) ||
    Boolean(user?.email && storage.hasPublisherAccess(user.email)) ||
    Boolean(user?.id && storage.hasPublisherAccess(user.id));

  const pubRecord = user
    ? storage.getPublisherByEmail(user.email) || storage.getPublisherByUserId(user.id)
    : undefined;

  const loadData = () => {
    const allEvents = storage.getAllEvents();
    const allAnnouncements = storage.getAnnouncements();

    if (user) {
      // Filter by organizer or publisherId
      const orgName = pubRecord?.organizationName || user.name;
      const myEvents = allEvents.filter(
        (e) =>
          e.publisherId === user.id ||
          (pubRecord && e.publisherId === pubRecord.id) ||
          e.organizer.toLowerCase().includes(user.name.toLowerCase()) ||
          e.organizer.toLowerCase().includes(orgName.toLowerCase())
      );
      setPublisherEvents(myEvents.length > 0 ? myEvents : allEvents.slice(0, 3));

      const myAnn = allAnnouncements.filter(
        (a) =>
          a.publisherId === user.id ||
          (pubRecord && a.publisherId === pubRecord.id) ||
          a.publisherName === user.name ||
          (pubRecord && a.publisherName === pubRecord.organizationName)
      );
      setPublisherAnnouncements(myAnn.length > 0 ? myAnn : allAnnouncements.slice(0, 2));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [user]);

  const handleDeleteEvent = (eventId: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}"?`)) {
      storage.deleteEvent(eventId);
      toast(`Deleted "${title}"`, 'info');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Publisher Studio</h2>
        <p className="text-xs text-slate-500">Please sign in with your institutional account to access the publisher dashboard.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!isAuthorizedPublisher) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Publisher Authorization Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your account (<strong>{user.email}</strong>) does not currently have active Publisher access.
          Campus publishing privileges are granted to authorized student chapters and clubs following administrative review.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Apply for Publisher Access in Profile
          </Link>
          <Link
            to="/"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Campus Home
          </Link>
        </div>
      </div>
    );
  }

  const displayName = pubRecord?.organizationName || pubRecord?.name || user.name;
  const displayDepartment = pubRecord?.department || user.department || 'Authorized Student Organization';
  const displayInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Simulation Notice Banner if viewing via professor demonstration */}
      {isSimulated && role !== 'PUBLISHER' && role !== 'ADMIN' && !user?.isMasterAdmin && (
        <div className="p-3.5 bg-indigo-50/90 border border-indigo-200/80 rounded-2xl text-indigo-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Demonstration Mode:</strong> Publisher Studio is active in simulation view. Live event creation requires authorized publisher permissions.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-100 rounded-md text-indigo-800 shrink-0">
            Simulated Publisher
          </span>
        </div>
      )}

      {/* Publisher Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
            {displayInitials}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {displayName}
              </h1>
              <VerifiedBadge size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {displayDepartment} · Official Campus Publisher
            </p>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Contact: {user.email} {user.regNumber && `· Student Reg: ${user.regNumber}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/publisher/events/create"
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publish New Event</span>
          </Link>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
          <div className="text-2xl font-extrabold text-indigo-600">{publisherEvents.length}</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Published Events</div>
          <div className="text-[10px] text-slate-400">Live on campus map</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
          <div className="text-2xl font-extrabold text-blue-600">380+</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Student Engagements</div>
          <div className="text-[10px] text-slate-400">Unique view sessions</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
          <div className="text-2xl font-extrabold text-emerald-600">100%</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Verification Score</div>
          <div className="text-[10px] text-slate-400">Zero false venue flags</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
          <div className="text-2xl font-extrabold text-amber-600">Active</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Publisher Status</div>
          <div className="text-[10px] text-slate-400">Governed by DSW</div>
        </div>
      </div>

      {/* Published Events Table/List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Live Managed Events ({publisherEvents.length})
            </h2>
          </div>

          <Link
            to="/publisher/events/create"
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {publisherEvents.map((ev) => (
            <div
              key={ev.id}
              className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {ev.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    ● Live on Map
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900">{ev.title}</h3>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                  <span>📅 {ev.date}</span>
                  <span>⏰ {ev.startTime}</span>
                  <span>📍 {ev.locationName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  to={`/events/${ev.id}`}
                  className="p-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
                  title="View Public Event Page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Public View</span>
                </Link>

                <button
                  onClick={() => handleDeleteEvent(ev.id, ev.title)}
                  className="p-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                  title="Delete Event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
