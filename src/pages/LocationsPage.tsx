import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation } from '../types';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import {
  Building2,
  MapPin,
  Clock,
  Navigation,
  Bookmark,
  BookmarkCheck,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const CATEGORIES = [
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
  'Utility',
];

export const LocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = () => {
    setLocations(storage.getLocations());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (activeCategory !== 'All' && loc.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          loc.name.toLowerCase().includes(q) ||
          loc.description.toLowerCase().includes(q) ||
          loc.building.toLowerCase().includes(q) ||
          loc.facilities.some((f) => f.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [locations, activeCategory, searchQuery]);

  const toggleSave = (e: React.MouseEvent, loc: CampusLocation) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Please sign in to save locations', 'info');
      return;
    }
    const saved = storage.toggleSaveLocation(user.id, loc.id);
    toast(saved ? `Saved "${loc.name}"` : `Removed from bookmarks`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Buildings & Facilities
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Directory of academic blocks, high-performance computing labs, dining squares, and student residences.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
              activeCategory === cat
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLocations.map((loc) => {
          const isSaved = user ? storage.isLocationSaved(user.id, loc.id) : false;
          const eventsCount = storage.getEventsByLocationId(loc.id).length;

          return (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all p-5 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-50 text-blue-700">
                    {loc.category}
                  </span>
                  <button
                    onClick={(e) => toggleSave(e, loc)}
                    className="text-slate-400 hover:text-blue-600 p-1"
                    title={isSaved ? 'Remove bookmark' : 'Bookmark location'}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <Link to={`/locations/${loc.id}`}>
                  <h3 className="font-bold text-base text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {loc.name}
                  </h3>
                </Link>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {loc.description}
                </p>

                <div className="space-y-1.5 pt-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {loc.building} · {loc.floor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{loc.openingHours}</span>
                  </div>
                </div>

                {/* Facilities Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {loc.facilities.slice(0, 3).map((f) => (
                    <span
                      key={f}
                      className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                    >
                      {f}
                    </span>
                  ))}
                  {loc.facilities.length > 3 && (
                    <span className="text-[10px] text-slate-400 self-center">
                      +{loc.facilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() =>
                    navigate(`/explore?to=${loc.id}&from=loc-ab-1&navigate=true`)
                  }
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions</span>
                </button>

                <Link
                  to={`/locations/${loc.id}`}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold text-center transition-colors"
                >
                  Details {eventsCount > 0 ? `(${eventsCount} Events)` : ''}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
