import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [publisherEvents, setPublisherEvents] = useState<CampusEvent[]>([]);
  const [publisherAnnouncements, setPublisherAnnouncements] = useState<Announcement[]>([]);

  const loadData = () => {
    const allEvents = storage.getEvents();
    const allAnnouncements = storage.getAnnouncements();

    if (user) {
      // Filter by organizer or publisherId
      const myEvents = allEvents.filter(
        (e) =>
          e.publisherId === user.id ||
          e.organizer.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes('club')
      );
      setPublisherEvents(myEvents.length > 0 ? myEvents : allEvents.slice(0, 3));

      const myAnn = allAnnouncements.filter(
        (a) => a.publisherId === user.id || a.publisherName === user.name
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Publisher Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
            AI
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {user?.name || 'AI & ML Club'}
              </h1>
              <VerifiedBadge size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified Student Organization · School of Computing Science & Engineering
            </p>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Publisher ID: {user?.id || 'pub-aiml-club'} · Verified since Jan 2025
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
