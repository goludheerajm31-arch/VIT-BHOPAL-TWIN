import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CampusMap } from '../components/CampusMap';
import { storage } from '../services/storage';
import { getCampusRoute } from '../services/navigation';
import { Location, CampusEvent, NavigationPath, FacultyMember } from '../types';
import {
  Navigation,
  ArrowUpDown,
  Footprints,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Share2,
  Calendar,
  Compass,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../components/layout/Toast';

export const NavigationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const locations = storage.getLocations();
  const events = storage.getEvents();

  const defaultFrom = locations.find((l) => l.id === 'loc-ab-1')?.id || locations[0]?.id || 'loc-ab-1';
  const defaultTo = locations.find((l) => l.id === 'loc-mph')?.id || locations[1]?.id || 'loc-ab-2';

  const toParam = searchParams.get('to') || defaultTo;
  const fromParam = searchParams.get('from') || defaultFrom;
  const eventParam = searchParams.get('event');
  const cabinParam = searchParams.get('cabin');
  const facultyParam = searchParams.get('faculty');

  // Look up faculty if cabin or faculty ID is provided
  const targetedFaculty = React.useMemo(() => {
    if (facultyParam) return storage.getFacultyById(facultyParam);
    if (cabinParam) return storage.getFacultyByCabin(cabinParam);
    return undefined;
  }, [facultyParam, cabinParam]);

  const [fromId, setFromId] = useState<string>(fromParam);
  const [toId, setToId] = useState<string>(() => {
    if (targetedFaculty) return targetedFaculty.buildingId;
    return toParam;
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventParam);
  const [currentRoute, setCurrentRoute] = useState<NavigationPath | null>(null);
  const [isGuidanceActive, setIsGuidanceActive] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Sync with searchParams if they change
  useEffect(() => {
    if (targetedFaculty) {
      setToId(targetedFaculty.buildingId);
    } else if (searchParams.get('to')) {
      setToId(searchParams.get('to')!);
    }
    if (searchParams.get('from')) setFromId(searchParams.get('from')!);
    if (searchParams.get('event')) setSelectedEventId(searchParams.get('event'));
  }, [searchParams, targetedFaculty]);

  // Recalculate route whenever fromId or toId changes
  useEffect(() => {
    if (fromId && toId && fromId !== toId) {
      const calculated = getCampusRoute(fromId, toId);
      setCurrentRoute(calculated);
      setCurrentStepIdx(0);
    } else {
      setCurrentRoute(null);
    }
  }, [fromId, toId]);

  const handleSwap = () => {
    const temp = fromId;
    setFromId(toId);
    setToId(temp);
    setSearchParams({ from: toId, to: temp });
  };

  const handleSelectQuickDest = (destId: string) => {
    setToId(destId);
    setSearchParams({ from: fromId, to: destId });
  };

  const handleShareRoute = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast('Route link copied to clipboard!', 'success');
    }
  };

  const selectedToLoc = locations.find((l) => l.id === toId);
  const selectedFromLoc = locations.find((l) => l.id === fromId);
  const targetedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Subheader bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <Navigation className="w-4 h-4" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Campus Wayfinding & Route Navigation
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live pedestrian routing across academic blocks, labs, library, food courts, and hostel zones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareRoute}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Route</span>
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Full Twin Explorer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 max-w-[96rem] w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Route Controller & Turn-by-Turn Steps */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 flex flex-col gap-4">
          {/* Targeted Event Banner if navigating to an event venue */}
          {targetedEvent && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                  Navigating to Event Venue
                </span>
                <span className="text-xs text-rose-700 font-semibold">{targetedEvent.startTime}</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{targetedEvent.title}</h4>
              <p className="text-xs text-slate-600">
                Venue: <span className="font-semibold text-slate-800">{targetedEvent.locationName}</span>
              </p>
            </div>
          )}

          {/* Targeted Faculty Cabin Destination Banner */}
          {targetedFaculty && (
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                    Cabin {targetedFaculty.cabinNumber}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-blue-200 text-blue-800 rounded">
                    {targetedFaculty.school}
                  </span>
                </div>
                <span className="text-xs text-blue-700 font-semibold">{targetedFaculty.floor}</span>
              </div>

              <div className="flex items-center gap-2.5">
                {targetedFaculty.avatarUrl ? (
                  <img
                    src={targetedFaculty.avatarUrl}
                    alt={targetedFaculty.name}
                    className="w-10 h-10 rounded-lg object-cover border border-blue-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {targetedFaculty.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{targetedFaculty.name}</h4>
                  <p className="text-xs text-blue-600 font-medium">{targetedFaculty.designation}</p>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100 text-xs space-y-1">
                <div className="font-semibold text-blue-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Indoor Wayfinding:
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {targetedFaculty.directionsGuide}
                </p>
              </div>
            </div>
          )}

          {/* Origin & Destination Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trip Endpoints
            </h3>

            <div className="relative space-y-3">
              {/* Origin */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-white"></span>
                  <span>Starting Location (Point A)</span>
                </label>
                <select
                  value={fromId}
                  onChange={(e) => {
                    setFromId(e.target.value);
                    setSearchParams({ from: e.target.value, to: toId });
                  }}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {locations.map((loc) => (
                    <option key={`nav-from-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  onClick={handleSwap}
                  title="Reverse starting point and destination"
                  className="p-2 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>Destination (Point B)</span>
                </label>
                <select
                  value={toId}
                  onChange={(e) => {
                    setToId(e.target.value);
                    setSearchParams({ from: fromId, to: e.target.value });
                  }}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {locations.map((loc) => (
                    <option key={`nav-to-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Destination Chips */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Campus Destinations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'VITB Academic Block 1', id: 'loc-ab-1' },
                  { label: 'VITB Academic Block 2', id: 'loc-ab-2' },
                  { label: 'Multi-purpose Hall', id: 'loc-mph' },
                  { label: 'Dr. Morepen Health Care', id: 'loc-dr-morepen' },
                  { label: 'Girls Hostel Block 1', id: 'loc-girls-hostel-1' },
                  { label: 'Girls Hostel Block 2', id: 'loc-girls-hostel-2' },
                  { label: 'Boys Hostel Block 1', id: 'loc-boys-hostel-1' },
                  { label: 'Boys Hostel Block 8', id: 'loc-boys-hostel-8' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => handleSelectQuickDest(chip.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                      toId === chip.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance & Time Box */}
            {currentRoute ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Footprints className="w-4 h-4 text-blue-600" />
                    <span>{currentRoute.distanceMeters} meters</span>
                  </div>
                  <div className="w-px h-4 bg-blue-200"></div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>~{currentRoute.walkingMinutes} min walk</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsGuidanceActive(!isGuidanceActive)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isGuidanceActive ? 'Exit Walk Guidance' : 'Start Live Walk Guidance'}</span>
                </button>
              </div>
            ) : fromId === toId ? (
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Please choose different start and destination locations.
              </div>
            ) : (
              <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium text-center">
                No route available
              </div>
            )}
          </div>

          {/* Turn-by-Turn Directions List */}
          {currentRoute && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Turn-by-Turn Walk Guide
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {currentRoute.steps.length} checkpoints
                </span>
              </div>

              {isGuidanceActive ? (
                <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Walking In Progress
                    </span>
                    <span>
                      Step {currentStepIdx + 1} of {currentRoute.steps.length}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {currentRoute.steps[currentStepIdx]}
                  </p>
                  <button
                    onClick={() => {
                      if (currentStepIdx < currentRoute.steps.length - 1) {
                        setCurrentStepIdx((p) => p + 1);
                      } else {
                        setIsGuidanceActive(false);
                        setCurrentStepIdx(0);
                        toast('You have arrived at your campus destination!', 'success');
                      }
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    {currentStepIdx === currentRoute.steps.length - 1 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Arrived at Destination
                      </>
                    ) : (
                      <>
                        Next Checkpoint <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {currentRoute.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Reusable CampusMap Interactive Canvas */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[560px] lg:min-h-[700px]">
          <CampusMap
            locations={locations}
            events={events}
            selectedLocationId={toId}
            selectedEventId={selectedEventId}
            initialFromId={fromId}
            initialToId={toId}
            navigationPath={currentRoute}
            height="100%"
            className="flex-1"
            showSearchBar={true}
            showCategoryFilters={true}
            showRoutingPanel={false}
            showControls={true}
            onSelectLocation={(loc) => {
              setToId(loc.id);
              setSearchParams({ from: fromId, to: loc.id });
            }}
            onSelectEvent={(ev) => {
              setSelectedEventId(ev.id);
              setToId(ev.locationId);
              setSearchParams({ from: fromId, to: ev.locationId, event: ev.id });
            }}
            onStartNavigationTo={(loc) => {
              setToId(loc.id);
              setSearchParams({ from: fromId, to: loc.id });
            }}
            onNavigateToVenue={(ev) => {
              setSelectedEventId(ev.id);
              setToId(ev.locationId);
              setSearchParams({ from: fromId, to: ev.locationId, event: ev.id });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NavigationPage;
