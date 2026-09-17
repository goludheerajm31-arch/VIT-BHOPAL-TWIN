import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { useToast } from '../components/layout/Toast';
import { Bookmark, Calendar, MapPin, Navigation, Trash2, ArrowRight } from 'lucide-react';

export const SavedItemsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'locations' | 'events'>('locations');
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
        <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Saved Bookmarks</h2>
        <p className="text-xs text-slate-500">Sign in to save and access your campus bookmarks.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const removeLocation = (locId: string, name: string) => {
    storage.toggleSaveLocation(user.id, locId);
    toast(`Removed ${name}`, 'info');
  };

  const removeEvent = (eventId: string, title: string) => {
    storage.toggleSaveEvent(user.id, eventId);
    toast(`Removed ${title}`, 'info');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Your Saved Bookmarks
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          Quick access to your frequently visited laboratories, academic blocks, and event venues.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('locations')}
          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'locations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Saved Locations ({savedLocations.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'events'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Saved Events ({savedEvents.length})
        </button>
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-3">
          {savedLocations.map((loc) => (
            <div
              key={loc.id}
              className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {loc.category}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">{loc.name}</h3>
                <div className="text-xs text-slate-500">
                  {loc.building} · {loc.floor}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    navigate(`/explore?to=${loc.id}&from=loc-ab-1&navigate=true`)
                  }
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>

                <Link
                  to={`/locations/${loc.id}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Details
                </Link>

                <button
                  onClick={() => removeLocation(loc.id, loc.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {savedLocations.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 text-xs text-slate-400">
              No saved locations yet. Tap the bookmark icon on any campus location!
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          {savedEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                    {ev.category}
                  </span>
                  {ev.verified && <VerifiedBadge size="sm" />}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mt-1">{ev.title}</h3>
                <div className="text-xs text-slate-500">
                  {ev.date} · {ev.startTime} · 📍 {ev.locationName}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    navigate(`/explore?to=${ev.locationId}&from=loc-ab-1&navigate=true`)
                  }
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>

                <Link
                  to={`/events/${ev.id}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Details
                </Link>

                <button
                  onClick={() => removeEvent(ev.id, ev.title)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {savedEvents.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 text-xs text-slate-400">
              No saved events yet. Browse the campus events schedule and save what you want to attend!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
