import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent, Announcement, FacultyMember } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import {
  Search,
  MapPin,
  Calendar,
  Bell,
  Clock,
  ArrowRight,
  Sparkles,
  X,
  History,
  Navigation,
  GraduationCap,
  DoorOpen,
  Copy,
  Check,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'faculty' | 'events' | 'locations' | 'announcements'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);

  const loadData = () => {
    setLocations(storage.getLocations());
    setEvents(storage.getEvents());
    setAnnouncements(storage.getAnnouncements());
    setFaculty(storage.getFaculty());
    setRecentSearches(storage.getRecentSearches());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  // Filtered Faculty Results
  const filteredFaculty = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return faculty.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.cabinNumber.toLowerCase().includes(q) ||
        f.cabinNumber.toLowerCase().replace(/[-_ ]/g, '').includes(q.replace(/[-_ ]/g, '')) ||
        f.school.toLowerCase().includes(q) ||
        f.departmentName.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        f.buildingName.toLowerCase().includes(q) ||
        f.roomDetails?.toLowerCase().includes(q) ||
        f.subjects.some((s) => s.toLowerCase().includes(q)) ||
        f.researchArea?.toLowerCase().includes(q)
    );
  }, [faculty, query]);

  // Filtered Results
  const filteredEvents = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
        e.description.toLowerCase().includes(q) ||
        e.locationName.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [events, query]);

  const filteredLocations = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.building.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.facilities.some((f) => f.toLowerCase().includes(q))
    );
  }, [locations, query]);

  const filteredAnnouncements = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.publisherName.toLowerCase().includes(q) ||
        (a.locationName && a.locationName.toLowerCase().includes(q))
    );
  }, [announcements, query]);

  const totalResults =
    (activeTab === 'all' || activeTab === 'faculty' ? filteredFaculty.length : 0) +
    (activeTab === 'all' || activeTab === 'events' ? filteredEvents.length : 0) +
    (activeTab === 'all' || activeTab === 'locations' ? filteredLocations.length : 0) +
    (activeTab === 'all' || activeTab === 'announcements' ? filteredAnnouncements.length : 0);

  const handleExecuteSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    storage.addRecentSearch(searchTerm);
    setRecentSearches(storage.getRecentSearches());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Campus Unified Search
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          Instant discovery across professor cabin numbers, buildings, laboratories, scheduled events, and university notices.
        </p>
      </div>

      {/* Main Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              handleExecuteSearch(query);
            }
          }}
          placeholder="Search by cabin no. (e.g. AB1-314), professor name, building, workshop, or notices..."
          className="w-full pl-12 pr-10 py-3.5 text-sm sm:text-base rounded-2xl bg-white border border-slate-300/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Suggestions:
        </span>
        {[
          'Cabin AB1-314',
          'Dr. Ramesh Kumar',
          'SCSE Faculty',
          'AI Club Workshop',
          'Central Library',
          'Seminar Hall',
        ].map((s) => (
          <button
            key={s}
            onClick={() => handleExecuteSearch(s)}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border border-slate-200/80 cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search Filter Tabs */}
      {query.trim() && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { key: 'all', label: `All Results (${totalResults})` },
            { key: 'faculty', label: `Faculty Cabins (${filteredFaculty.length})` },
            { key: 'events', label: `Events (${filteredEvents.length})` },
            { key: 'locations', label: `Locations (${filteredLocations.length})` },
            { key: 'announcements', label: `Announcements (${filteredAnnouncements.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results Container */}
      {query.trim() ? (
        <div className="space-y-6">
          {totalResults === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-800">No results found for "{query}"</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check your spelling or try searching for cabin numbers like 'AB1-314', departments like 'SCSE', or landmarks like 'Central Library'.
              </p>
            </div>
          ) : (
            <>
              {/* FACULTY CABINS SECTION */}
              {(activeTab === 'all' || activeTab === 'faculty') && filteredFaculty.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Faculty & Professor Cabins ({filteredFaculty.length})</span>
                    </div>
                    <Link
                      to={`/faculty?q=${encodeURIComponent(query)}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Open in Directory →
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {filteredFaculty.map((fac) => (
                      <div
                        key={fac.id}
                        className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          {fac.avatarUrl ? (
                            <img
                              src={fac.avatarUrl}
                              alt={fac.name}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {fac.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-slate-900 text-white rounded-md text-xs font-mono font-bold">
                                Cabin {fac.cabinNumber}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                {fac.school}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {fac.floor} · {fac.buildingName}
                              </span>
                            </div>

                            <h3 className="font-bold text-sm sm:text-base text-slate-900">
                              {fac.name}
                            </h3>

                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-blue-600">{fac.designation}</span>
                              <span>•</span>
                              <span>Hours: {fac.consultationHours}</span>
                            </div>

                            {fac.roomDetails && (
                              <p className="text-[11px] text-slate-400">
                                📍 {fac.roomDetails}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() =>
                              navigate(
                                `/navigation?to=${fac.buildingId}&cabin=${fac.cabinNumber}&faculty=${fac.id}`
                              )
                            }
                            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Route to Cabin</span>
                          </button>

                          <Link
                            to={`/faculty?q=${encodeURIComponent(fac.name)}`}
                            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-center"
                          >
                            Directory Profile
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* EVENTS SECTION */}
              {(activeTab === 'all' || activeTab === 'events') && filteredEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    <span>Campus Events ({filteredEvents.length})</span>
                  </div>

                  <div className="space-y-2">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                              {event.category}
                            </span>
                            {event.verified && <VerifiedBadge size="sm" />}
                          </div>

                          <h3 className="font-bold text-sm sm:text-base text-slate-900">
                            {event.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="font-semibold text-blue-600">
                              Today · {event.startTime}
                            </span>
                            <span>📍 {event.locationName}</span>
                            <span>Organizer: {event.organizer}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() =>
                              navigate(
                                `/explore?to=${event.locationId}&from=loc-ab-1&navigate=true`
                              )
                            }
                            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigate</span>
                          </button>

                          <Link
                            to={`/events/${event.id}`}
                            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-center"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LOCATIONS SECTION */}
              {(activeTab === 'all' || activeTab === 'locations') && filteredLocations.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>Campus Locations ({filteredLocations.length})</span>
                  </div>

                  <div className="space-y-2">
                    {filteredLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {loc.category}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {loc.zone || 'Campus Zone'}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm sm:text-base text-slate-900">{loc.name}</h3>

                          <p className="text-xs text-slate-500 line-clamp-1">{loc.description}</p>
                          <div className="text-[11px] text-slate-400">
                            {loc.building} · {loc.floor} · Open: {loc.openingHours}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() =>
                              navigate(`/explore?to=${loc.id}&from=loc-ab-1&navigate=true`)
                            }
                            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigate</span>
                          </button>

                          <Link
                            to={`/locations/${loc.id}`}
                            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-center"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ANNOUNCEMENTS SECTION */}
              {(activeTab === 'all' || activeTab === 'announcements') &&
                filteredAnnouncements.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      <span>Official Announcements ({filteredAnnouncements.length})</span>
                    </div>

                    <div className="space-y-2">
                      {filteredAnnouncements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                              {ann.category}
                            </span>
                            {ann.verified && <VerifiedBadge size="sm" />}
                          </div>

                          <h3 className="font-bold text-sm text-slate-900">{ann.title}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{ann.description}</p>
                          <div className="text-[11px] text-slate-400">
                            By {ann.publisherName} · {ann.locationName || 'Campus Wide'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      ) : (
        /* Empty State: Recent Searches */
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Recent Searches
            </h2>
            {recentSearches.length > 0 && (
              <button
                onClick={() => {
                  storage.clearRecentSearches();
                  setRecentSearches([]);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentSearches.map((term, i) => (
              <button
                key={i}
                onClick={() => handleExecuteSearch(term)}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 hover:bg-slate-50/70 text-left text-xs text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium truncate">{term}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
