import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent } from '../types';
import { CampusMap } from '../components/CampusMap';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import {
  Compass,
  Search,
  Calendar,
  Navigation,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Building2,
  Users,
  Layers,
  Flame,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);

  const loadData = () => {
    const locs = storage.getLocations();
    const evts = storage.getEvents();
    setLocations(locs);
    setEvents(evts);
    // Default preview location: AB-1
    const defaultLoc = locs.find((l) => l.id === 'loc-ab-1') || locs[0];
    setSelectedLocation(defaultLoc || null);
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>VIT Bhopal Digital Twin Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-tight">
            One VIT Bhopal. <br />
            <span className="text-blue-600">One digital experience.</span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal max-w-2xl mx-auto">
            Explore the campus, find places, discover events and navigate with confidence — all through one intelligent digital layer.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/explore"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Campus</span>
            </Link>

            <Link
              to="/events"
              className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl border border-slate-200/90 shadow-xs hover:shadow transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Discover Events</span>
            </Link>
          </div>
        </div>

        {/* Hero Interactive Visualization Preview */}
        <div className="mt-12 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Embedded Interactive Map Preview */}
            <div className="lg:w-3/4 h-[500px] sm:h-[560px] rounded-xl overflow-hidden relative flex flex-col bg-[#E8ECE9]">
              <CampusMap
                locations={locations}
                events={events}
                selectedLocationId={selectedLocation?.id}
                onSelectLocation={(loc) => setSelectedLocation(loc)}
                onStartNavigationTo={(loc) => {
                  navigate(`/explore?to=${loc.id}&from=loc-ab-1`);
                }}
                height="100%"
                className="w-full h-full flex-1 min-h-0"
              />
            </div>

            {/* Quick Interactive Location / Search Sidebar Preview */}
            <div className="lg:w-1/4 flex flex-col justify-between space-y-4 p-2 sm:p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <div className="space-y-3">
                {/* Search Bar Preview */}
                <div
                  onClick={() => navigate('/search')}
                  className="w-full flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>Search building, lab, or event...</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    TRY
                  </span>
                </div>

                {/* Selected Location Card Preview */}
                {selectedLocation && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                        {selectedLocation.category}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {selectedLocation.floor}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {selectedLocation.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {selectedLocation.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedLocation.building}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedLocation.openingHours}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Link
                        to={`/locations/${selectedLocation.id}`}
                        className="flex-1 py-1.5 px-3 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() =>
                          navigate(`/explore?to=${selectedLocation.id}&from=loc-ab-1`)
                        }
                        className="flex-1 py-1.5 px-3 text-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Campus Notice Teaser */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-amber-800 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-600" /> Featured Event Today
                    </span>
                    <VerifiedBadge size="sm" showText={false} />
                  </div>
                  <div className="font-semibold text-slate-900">AI Club Workshop · 4:00 PM</div>
                  <div className="text-[11px] text-slate-600">Seminar Hall (AB-1 Ground Floor)</div>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  to="/explore"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <span>Open Full Interactive Map Canvas</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Pillars: EXPLORE, SEARCH, DISCOVER, NAVIGATE, TRUST */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            How the Digital Twin Serves VIT Bhopal
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            A cohesive bridge transforming fragmented campus information into an instant, trusted experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
          {/* EXPLORE */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">EXPLORE</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find buildings, labs, libraries and facilities with precise floor plans and accessibility data.
            </p>
            <Link to="/explore" className="text-xs font-semibold text-blue-600 flex items-center gap-1 pt-1">
              Campus Map <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* SEARCH */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">SEARCH</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find any campus place, faculty room, lab or scheduled workshop instantly with live fuzzy suggestions.
            </p>
            <Link to="/search" className="text-xs font-semibold text-indigo-600 flex items-center gap-1 pt-1">
              Unified Search <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* DISCOVER */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">DISCOVER</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              See events and announcements anchored directly at their actual physical venues on campus.
            </p>
            <Link to="/events" className="text-xs font-semibold text-rose-600 flex items-center gap-1 pt-1">
              Active Events <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* NAVIGATE */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Navigation className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">NAVIGATE</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Get campus-level pedestrian walking directions with exact meters and estimated walking times.
            </p>
            <Link to="/explore?navigate=true" className="text-xs font-semibold text-emerald-600 flex items-center gap-1 pt-1">
              Plan Walking Route <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* TRUST */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">TRUST</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Know who published the information with verified institutional badges for registered clubs and faculties.
            </p>
            <Link to="/about#trust" className="text-xs font-semibold text-amber-600 flex items-center gap-1 pt-1">
              Trust Protocol <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Digital Twin Conceptual Architecture Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-10 shadow-xl overflow-hidden relative">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              The Digital Twin Paradigm
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Physical Campus → Digital Twin → Smart Experience
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              "The point is not just a 3D model. The point is a useful digital layer over the real VIT Bhopal campus."
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">Tier 1</div>
              <div className="text-base font-bold text-white">PHYSICAL CAMPUS</div>
              <ul className="space-y-1 text-slate-300">
                <li>• Academic blocks & lecture halls</li>
                <li>• Pedestrian avenues & perimeter gates</li>
                <li>• Labs, library & residential hostels</li>
              </ul>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="text-blue-400 font-bold uppercase text-[10px] tracking-wider">Tier 2</div>
              <div className="text-base font-bold text-white">DIGITAL TWIN</div>
              <ul className="space-y-1 text-slate-300">
                <li>• Geo-referenced locations & facilities</li>
                <li>• Real-time scheduled events & venues</li>
                <li>• Designated walking paths & verified clubs</li>
              </ul>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider">Tier 3</div>
              <div className="text-base font-bold text-white">SMART EXPERIENCE</div>
              <ul className="space-y-1 text-slate-300">
                <li>• Instant global search across data types</li>
                <li>• Step-by-step turn guidance & ETAs</li>
                <li>• Role-based verification & confidence</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">16+</div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Geo-Mapped Locations</div>
            <div className="text-[11px] text-slate-400">Labs, hostels, complexes</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">8+</div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Scheduled Events</div>
            <div className="text-[11px] text-slate-400">Workshops & hackathons</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">420 m</div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Smart Walk Routing</div>
            <div className="text-[11px] text-slate-400">Library to Seminar Hall</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">100%</div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Verified Publishers</div>
            <div className="text-[11px] text-slate-400">Authentic university source</div>
          </div>
        </div>
      </section>
    </div>
  );
};
