import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
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
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [savedLocations, setSavedLocations] = useState<CampusLocation[]>([]);
  const [savedEvents, setSavedEvents] = useState<CampusEvent[]>([]);

  const loadData = () => {
    if (!user) return;
    setSavedLocations(storage.getSavedLocations(user.id));
    setSavedEvents(storage.getSavedEvents(user.id));
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Student Dashboard</h2>
        <p className="text-xs text-slate-500">Please sign in to view your saved places and events.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

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
          <Link
            to="/explore"
            className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Open Map</span>
          </Link>
          <Link
            to="/search"
            className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </Link>
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
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
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
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
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
    </div>
  );
};
