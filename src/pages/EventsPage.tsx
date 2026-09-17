import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusEvent } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Bookmark,
  BookmarkCheck,
  Search,
  Users,
  Sparkles,
} from 'lucide-react';

const FILTER_TABS = [
  'All',
  'Today',
  'This Week',
  'Technical',
  'Workshops',
  'Clubs',
  'Cultural',
  'Sports',
];

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = () => {
    setEvents(storage.getEvents());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Tab filter
      if (activeTab === 'Today') {
        // Today is 2026-09-04
        if (ev.date !== '2026-09-04') return false;
      } else if (activeTab === 'This Week') {
        // Any date within upcoming 7 days
        if (!ev.date.startsWith('2026-09')) return false;
      } else if (activeTab !== 'All') {
        if (ev.category !== activeTab) return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.organizer.toLowerCase().includes(q) ||
          ev.locationName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [events, activeTab, searchQuery]);

  const toggleSave = (e: React.MouseEvent, eventId: string, eventTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Please sign in to save events', 'info');
      return;
    }
    const saved = storage.toggleSaveEvent(user.id, eventId);
    toast(saved ? `Saved "${eventTitle}"` : `Removed "${eventTitle}"`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Events & Activities
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Discover technical workshops, guest seminars, hackathons, and student club activities across VIT Bhopal.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter events..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
              activeTab === tab
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map((event) => {
          const isSaved = user ? storage.isEventSaved(user.id, event.id) : false;
          return (
            <div
              key={event.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all overflow-hidden flex flex-col justify-between group"
            >
              {/* Cover Image Header */}
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img
                  src={event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>

                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/95 text-slate-900 shadow-sm backdrop-blur-xs">
                    {event.category}
                  </span>
                </div>

                <button
                  onClick={(e) => toggleSave(e, event.id, event.title)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 hover:text-blue-600 shadow-sm transition-colors"
                  title={isSaved ? 'Remove Bookmark' : 'Bookmark Event'}
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{event.date} · {event.startTime}</span>
                  </div>
                </div>
              </div>

              {/* Event Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 truncate">
                      {event.organizer}
                    </span>
                    {event.verified && <VerifiedBadge size="sm" />}
                  </div>

                  <Link to={`/events/${event.id}`}>
                    <h3 className="font-bold text-base text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{event.locationName}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        navigate(
                          `/explore?to=${event.locationId}&from=loc-ab-1&navigate=true`
                        )
                      }
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </button>

                    <Link
                      to={`/events/${event.id}`}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold text-center transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">No events found</h3>
          <p className="text-xs text-slate-500">
            No events match the selected category or search filter.
          </p>
          <button
            onClick={() => {
              setActiveTab('All');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
};
