import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent, NavigationPath } from '../types';
import { getCampusRoute } from '../services/navigation';
import { CampusMap } from '../components/CampusMap';
import { RoutePlanner } from '../components/navigation/RoutePlanner';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import {
  Search,
  Navigation,
  Bookmark,
  BookmarkCheck,
  Building2,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Calendar,
  X,
  Compass,
  User as UserIcon,
  CheckCircle2,
  Share2,
} from 'lucide-react';

const FILTER_CATEGORIES = [
  'All',
  'Academic',
  'Labs',
  'Library',
  'Hostel',
  'Food',
  'Sports',
  'Medical',
  'Administration',
  'Innovation',
  'Events',
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationPath, setNavigationPath] = useState<NavigationPath | null>(null);
  const [navFromId, setNavFromId] = useState<string>('loc-ab-1');
  const [navToId, setNavToId] = useState<string>('loc-mph');
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  const loadData = () => {
    const locs = storage.getLocations();
    const evts = storage.getEvents();
    setLocations(locs);
    setEvents(evts);

    // Check URL params
    const toParam = searchParams.get('to');
    const fromParam = searchParams.get('from');
    const navigateParam = searchParams.get('navigate');
    const locIdParam = searchParams.get('location');

    if (toParam) {
      setNavToId(toParam);
      const targetLoc = locs.find((l) => l.id === toParam);
      if (targetLoc) setSelectedLocation(targetLoc);
      setIsNavigating(true);
      const fromP = fromParam || 'loc-ab-1';
      const calculated = getCampusRoute(fromP, toParam);
      if (calculated) setNavigationPath(calculated);
    }
    if (fromParam) {
      setNavFromId(fromParam);
    }
    if (navigateParam === 'true') {
      setIsNavigating(true);
      if (!toParam) {
        const defaultRoute = getCampusRoute('loc-ab-1', 'loc-mph');
        if (defaultRoute) setNavigationPath(defaultRoute);
      }
    }
    if (locIdParam) {
      const loc = locs.find((l) => l.id === locIdParam);
      if (loc) setSelectedLocation(loc);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [searchParams]);

  // Filter locations
  const filteredLocations = locations.filter((loc) => {
    const matchesFilter =
      activeFilter === 'All' || activeFilter === 'Events' || loc.category === activeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (activeFilter !== 'All' && activeFilter !== 'Events') return false;
    if (!searchQuery.trim()) return true;
    return (
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.organizer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSelectLocation = (loc: CampusLocation) => {
    setSelectedLocation(loc);
    setSelectedEvent(null);
  };

  const handleSelectEvent = (ev: CampusEvent) => {
    setSelectedEvent(ev);
    const loc = locations.find((l) => l.id === ev.locationId);
    if (loc) setSelectedLocation(loc);
  };

  const handleStartNavigationTo = (loc: CampusLocation) => {
    const fromP = navFromId || 'loc-ab-1';
    setNavToId(loc.id);
    setIsNavigating(true);
    setSelectedLocation(loc);
    const calculated = getCampusRoute(fromP, loc.id);
    if (calculated) {
      setNavigationPath(calculated);
    }
  };

  const toggleSaveCurrentLocation = (loc: CampusLocation) => {
    if (!user) {
      toast('Please sign in to save locations', 'info');
      return;
    }
    const saved = storage.toggleSaveLocation(user.id, loc.id);
    toast(saved ? `Saved ${loc.name} to bookmarks` : `Removed ${loc.name}`, 'success');
  };

  const isCurrentSaved = user && selectedLocation ? storage.isLocationSaved(user.id, selectedLocation.id) : false;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-[#E8ECE9]">
      {/* 1. Fullscreen Map Canvas Filling Almost Entire Screen */}
      <div className="absolute inset-0 w-full h-full z-0">
        <CampusMap
          locations={locations}
          events={events}
          selectedLocationId={selectedLocation?.id}
          selectedEventId={selectedEvent?.id}
          initialFromId={navFromId}
          initialToId={navToId}
          navigationPath={navigationPath}
          onRouteCalculated={(route) => setNavigationPath(route)}
          onSelectLocation={handleSelectLocation}
          onSelectEvent={handleSelectEvent}
          onStartNavigationTo={handleStartNavigationTo}
          height="100%"
          className="w-full h-full min-h-0"
          showControls={true}
        />
      </div>

      {/* 2. Floating Top Search & Quick Category HUD */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-30 pointer-events-none flex flex-col items-center">
        <div className="w-full max-w-4xl pointer-events-auto flex flex-col gap-2">
          {/* Main Search & Control Bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 p-2 sm:p-2.5 flex items-center justify-between gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search VIT Bhopal building, lab, library, hostel, sports, or event..."
                className="w-full bg-slate-100/90 border-none rounded-xl py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Directory / Places Toggle Button */}
            <button
              onClick={() => setIsDirectoryOpen(!isDirectoryOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 cursor-pointer ${
                isDirectoryOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
              }`}
              title="Toggle Campus Directory"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Directory</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isDirectoryOpen ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {filteredLocations.length}
              </span>
            </button>

            {/* Live Feed Status */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 shrink-0">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-tight">Live Campus</span>
            </div>

            {/* + New Event Button */}
            <button
              onClick={() => navigate('/publisher/events/create')}
              className="bg-[#0071E3] hover:bg-blue-600 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>+ Event</span>
            </button>
          </div>

          {/* Horizontal Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar px-1">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all border shadow-xs backdrop-blur-md cursor-pointer ${
                  activeFilter === cat
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white/90 text-slate-700 hover:bg-white border-slate-200/90'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Floating Directory & Route Planner Drawer (Left) */}
      {isDirectoryOpen && (
        <div className="absolute left-3 sm:left-4 top-24 sm:top-28 bottom-6 z-30 w-80 sm:w-88 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden pointer-events-auto">
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs text-slate-800">Campus Directory</h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                {filteredLocations.length} locations
              </span>
            </div>
            <button
              onClick={() => setIsDirectoryOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Directory"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Planner in Sidebar if Active */}
          {isNavigating && (
            <div className="p-3 border-b border-blue-100 bg-blue-50/50 shrink-0">
              <RoutePlanner
                locations={locations}
                initialFromId={navFromId}
                initialToId={navToId}
                onRouteCalculated={(route) => setNavigationPath(route)}
                onClose={() => {
                  setIsNavigating(false);
                  setNavigationPath(null);
                }}
              />
            </div>
          )}

          {/* Location / Event items list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-1">
              <span className="text-[11px] font-medium">
                {filteredLocations.length} locations {filteredEvents.length > 0 ? `· ${filteredEvents.length} events` : ''}
              </span>
              {activeFilter !== 'All' && (
                <button
                  onClick={() => setActiveFilter('All')}
                  className="text-blue-600 hover:underline text-[10px] font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Events matching search */}
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleSelectEvent(ev)}
                className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                  selectedEvent?.id === ev.id
                    ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    EVENT · {ev.category}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">{ev.date}</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 leading-snug">{ev.title}</h3>
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
                  <span className="truncate">{ev.locationName}</span>
                  <span className="text-blue-600 font-semibold">{ev.startTime}</span>
                </div>
              </div>
            ))}

            {/* Locations */}
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => handleSelectLocation(loc)}
                className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                  selectedLocation?.id === loc.id && !selectedEvent
                    ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {loc.category}
                  </span>
                  <span className="text-[10px] text-slate-400">{loc.floor}</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 leading-snug">{loc.name}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-1">{loc.description}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {loc.building}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartNavigationTo(loc);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    Directions <Navigation className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Floating Selected Node Detail Drawer (Right) */}
      {(selectedEvent || selectedLocation) && (
        <div className="absolute right-3 sm:right-4 top-24 sm:top-28 bottom-6 z-30 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden pointer-events-auto">
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {selectedEvent ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Upcoming Event
                  </span>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-slate-500 text-xs">
                    {selectedEvent.subtitle || selectedEvent.description.slice(0, 70) + '...'}
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 border border-slate-100 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Time & Date</div>
                      <div className="text-xs font-medium text-slate-800">
                        {selectedEvent.date}, {selectedEvent.startTime} – {selectedEvent.endTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 border border-slate-100 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Venue</div>
                      <div className="text-xs font-medium text-blue-600 hover:underline cursor-pointer">
                        {selectedEvent.locationName}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 border border-slate-100 shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Organizer</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-800">{selectedEvent.organizer}</span>
                        {selectedEvent.verified && <VerifiedBadge size="sm" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About Event</h3>
                  <p className="text-xs leading-relaxed text-slate-600 italic">
                    {selectedEvent.description}
                  </p>
                </div>
              </>
            ) : selectedLocation ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Campus Node · {selectedLocation.category}
                  </span>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                    {selectedLocation.name}
                  </h2>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {selectedLocation.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Building</div>
                    <div className="font-medium text-slate-800 truncate mt-0.5">{selectedLocation.building}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Floor</div>
                    <div className="font-medium text-slate-800 truncate mt-0.5">{selectedLocation.floor}</div>
                  </div>
                </div>

                {selectedLocation.facilities && selectedLocation.facilities.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Key Amenities
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLocation.facilities.map((fac) => (
                        <span
                          key={fac}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            {selectedEvent ? (
              <>
                <button
                  onClick={() => {
                    if (!user) toast('Please sign in to save events', 'info');
                    else {
                      const saved = storage.toggleSaveEvent(user.id, selectedEvent.id);
                      toast(saved ? 'Event saved to bookmarks' : 'Event removed', 'success');
                    }
                  }}
                  className="flex-1 bg-white border border-slate-300 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Save Event
                </button>
                <button
                  onClick={() => {
                    const loc = locations.find((l) => l.id === selectedEvent.locationId);
                    if (loc) handleStartNavigationTo(loc);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>
              </>
            ) : selectedLocation ? (
              <>
                <button
                  onClick={() => toggleSaveCurrentLocation(selectedLocation)}
                  className="flex-1 bg-white border border-slate-300 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  {isCurrentSaved ? 'Saved ★' : 'Save Place'}
                </button>
                <button
                  onClick={() => handleStartNavigationTo(selectedLocation)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 5. Floating Active Route Card (Bottom-Left) */}
      <div className="absolute bottom-4 left-3 sm:left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/90 w-68 sm:w-72 z-20 pointer-events-auto">
        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">
          Active Route
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-slate-800">
              {navigationPath
                ? `${navigationPath.fromName || navigationPath.from?.name || 'Start'} → ${navigationPath.toName || navigationPath.to?.name || 'Destination'}`
                : 'Library → Seminar Hall'}
            </div>
            <div className="text-[11px] text-slate-500">
              {navigationPath
                ? `Estimated walk: ${navigationPath.walkingMinutes ?? navigationPath.estimatedWalkingMinutes ?? 5} mins`
                : 'Estimated walk: 5 mins'}
            </div>
          </div>
          <div className="text-blue-600 font-bold text-sm italic">
            {navigationPath ? `${navigationPath.distanceMeters}m` : '420m'}
          </div>
        </div>
        <button
          onClick={() => {
            if (!isNavigating) {
              setIsNavigating(true);
              setIsDirectoryOpen(true);
              if (!navigationPath) {
                const defaultRoute = getCampusRoute(navFromId || 'loc-ab-1', navToId || 'loc-mph');
                if (defaultRoute) setNavigationPath(defaultRoute);
              }
            } else {
              setIsNavigating(false);
            }
          }}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {isNavigating ? 'Modify Route' : 'Start Navigation'}
        </button>
      </div>

      {/* 6. Floating Telemetry Badge (Bottom-Right alongside map zoom controls) */}
      <div className="hidden sm:flex absolute bottom-4 right-16 z-20 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm items-center gap-2.5 text-[11px] text-slate-500">
        <div className="flex -space-x-1.5">
          <div className="w-4 h-4 rounded-full border border-white bg-slate-300 flex items-center justify-center text-[8px] text-slate-700 font-bold">
            A
          </div>
          <div className="w-4 h-4 rounded-full border border-white bg-blue-400 flex items-center justify-center text-[8px] text-white font-bold">
            R
          </div>
          <div className="w-4 h-4 rounded-full border border-white bg-indigo-400 flex items-center justify-center text-[8px] text-white font-bold">
            V
          </div>
        </div>
        <span>142 Viewing Campus</span>
        <span className="text-slate-300">•</span>
        <span className="font-medium text-slate-400">VIT Bhopal Twin</span>
      </div>
    </div>
  );
};
