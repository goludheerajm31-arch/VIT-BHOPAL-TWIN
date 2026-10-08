import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent, Announcement } from '../types';
import { CampusMap } from '../components/CampusMap';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { EventPoster } from '../components/events/EventPoster';
import { formatISTDate, getCurrentISTParts } from '../lib/dateUtils';
import {
  Compass,
  Search,
  Calendar,
  Navigation,
  MapPin,
  Clock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Bell,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const ist = getCurrentISTParts();

  const loadData = () => {
    const locs = storage.getLocations();
    // Use getActiveEvents() to guarantee only non-expired upcoming events are shown
    const evts = storage.getActiveEvents();
    const anns = storage.getAnnouncements().filter(
      (a) => a.status === 'approved' || (a.verified && a.status !== 'rejected')
    );

    setLocations(locs);
    setEvents(evts);
    setAnnouncements(anns);

    // Default landmark for preview
    const defaultLoc = locs.find((l) => l.id === 'loc-ab-1') || locs[0];
    setSelectedLocation(defaultLoc || null);
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const quickShortcuts = [
    {
      title: 'Campus Map',
      description: 'Interactive map & 3D landmarks',
      path: '/explore',
      icon: Compass,
      color: 'text-[#0071E3] bg-[#0071E3]/10',
    },
    {
      title: 'Faculty Cabins',
      description: 'Room finder & cabin directory',
      path: '/faculty',
      icon: GraduationCap,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Pedestrian Navigation',
      description: 'Walking routes & estimated times',
      path: '/navigation',
      icon: Navigation,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Campus Hub',
      description: 'Announcements & student guides',
      path: '/hub',
      icon: BookOpen,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  // Up to 3 nearest upcoming events
  const upcomingEvents = events.slice(0, 3);
  // Up to 3 recent notices
  const latestNotices = announcements.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. Header: Date context & Quick Search */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
              VIT Bhopal University · Today {formatISTDate(ist.dateStr)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
              Campus Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#86868B] max-w-xl">
              Access places, faculty locations, real-time events, and walking directions across the campus.
            </p>
          </div>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 sm:max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search building, cabin, or event..."
                className="w-full pl-9 pr-14 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-2xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all font-medium"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white hover:bg-black/[0.04] text-[11px] font-semibold text-[#1D1D1F] border border-black/[0.08] rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Go
              </button>
            </div>
          </form>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-black/[0.04]">
          {quickShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="p-4 rounded-2xl bg-[#F5F5F7]/70 hover:bg-[#F5F5F7] border border-black/[0.04] hover:border-black/[0.08] transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#86868B] group-hover:text-[#1D1D1F] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <div className="font-semibold text-xs sm:text-sm text-[#1D1D1F] tracking-tight">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[#86868B] line-clamp-1 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Urgent Notices / Current Information */}
      {latestNotices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1D1D1F]">
                Active Notices & Bulletins
              </h2>
            </div>
            <Link
              to="/hub"
              className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {latestNotices.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-black/[0.1] transition-all flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#86868B]">
                    <span className="font-semibold text-slate-700">
                      {ann.publisherName}
                    </span>
                    <span>{ann.category}</span>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#1D1D1F] line-clamp-2">
                    {ann.title}
                  </h3>
                  <p className="text-xs text-[#86868B] line-clamp-2 leading-relaxed">
                    {ann.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[11px] text-[#86868B]">
                  <span>{new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  {ann.actionUrl && (
                    <a
                      href={ann.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0071E3] font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <span>Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Upcoming Campus Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">
              Campus Activities
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F] tracking-tight">
              Upcoming Events
            </h2>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1"
          >
            <span>All Events ({events.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-black/[0.06] text-xs text-[#86868B]">
            No upcoming events scheduled right now. Check back soon or browse previous bulletins in the Campus Hub.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:border-black/[0.12] transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Poster / Thumbnail */}
                <div className="relative aspect-16/9 overflow-hidden bg-slate-950">
                  <EventPoster
                    coverImage={event.coverImage}
                    title={event.title}
                    category={event.category}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                      {event.category}
                    </span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#86868B]">
                      <span className="truncate">{event.organizer}</span>
                      {event.verified && <VerifiedBadge size="sm" />}
                    </div>

                    <Link to={`/events/${event.id}`}>
                      <h3 className="font-bold text-sm text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-[#86868B] line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-black/[0.04] space-y-2.5 text-xs text-[#86868B]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-medium text-[#1D1D1F]">
                        <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
                        {formatISTDate(event.date)}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[#1D1D1F]">
                        <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
                        {event.startTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] truncate">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate text-slate-700">{event.locationName}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() =>
                          navigate(
                            `/explore?to=${event.locationId}&from=loc-ab-1&navigate=true`
                          )
                        }
                        className="flex-1 py-1.5 px-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </button>

                      <Link
                        to={`/events/${event.id}`}
                        className="py-1.5 px-3 bg-[#F5F5F7] hover:bg-black/[0.07] text-[#1D1D1F] rounded-xl text-xs font-semibold text-center transition-colors"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Campus Map Canvas & Location Quick Finder */}
      <section className="bg-white rounded-3xl border border-black/[0.06] p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">
              Geospatial Campus Layer
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F] tracking-tight">
              Interactive Campus Twin
            </h2>
          </div>
          <Link
            to="/explore"
            className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1"
          >
            <span>Open Fullscreen Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map Viewport */}
          <div className="lg:w-3/4 h-[380px] sm:h-[420px] rounded-2xl overflow-hidden relative border border-black/[0.06] bg-[#E8ECE9]">
            <CampusMap
              locations={locations}
              events={events}
              selectedLocationId={selectedLocation?.id}
              onSelectLocation={(loc) => setSelectedLocation(loc)}
              onStartNavigationTo={(loc) => {
                navigate(`/explore?to=${loc.id}&from=loc-ab-1&navigate=true`);
              }}
              height="100%"
              className="w-full h-full"
            />
          </div>

          {/* Quick Selected Location Inspector */}
          <div className="lg:w-1/4 flex flex-col justify-between p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] space-y-4">
            {selectedLocation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-[#0071E3]">
                    {selectedLocation.category}
                  </span>
                  <span className="text-[#86868B]">{selectedLocation.floor}</span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[#1D1D1F] leading-snug">
                    {selectedLocation.name}
                  </h3>
                  <p className="text-xs text-[#86868B] mt-1 line-clamp-3 leading-relaxed">
                    {selectedLocation.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-black/[0.06] space-y-1.5 text-xs text-[#86868B]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedLocation.building}</span>
                  </div>
                  {selectedLocation.openingHours && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{selectedLocation.openingHours}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[#86868B]">
                Select any location on the map to preview details.
              </div>
            )}

            {selectedLocation && (
              <div className="pt-3 border-t border-black/[0.06] flex items-center gap-2">
                <Link
                  to={`/locations/${selectedLocation.id}`}
                  className="flex-1 py-2 text-center text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-slate-100 rounded-xl border border-black/[0.08] transition-colors"
                >
                  Profile
                </Link>
                <button
                  onClick={() =>
                    navigate(
                      `/explore?to=${selectedLocation.id}&from=loc-ab-1&navigate=true`
                    )
                  }
                  className="flex-1 py-2 text-center text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
