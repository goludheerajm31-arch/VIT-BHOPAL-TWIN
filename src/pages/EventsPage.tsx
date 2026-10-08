import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusEvent, EventCategory } from '../types';
import { EventCard } from '../components/events/EventCard';
import { getCurrentISTParts } from '../lib/dateUtils';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  PlusCircle,
  Calendar,
  RotateCcw,
} from 'lucide-react';

type TimeFilter = 'Upcoming' | 'Today' | 'Tomorrow' | 'This Week' | 'All';

const TIME_FILTERS: TimeFilter[] = ['Upcoming', 'Today', 'Tomorrow', 'This Week', 'All'];

const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Technical', value: 'Technical' },
  { label: 'Workshop', value: 'Workshops' },
  { label: 'Club', value: 'Clubs' },
  { label: 'Cultural', value: 'Cultural' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Academic', value: 'Academics' },
  { label: 'Competition', value: 'Competition' },
  { label: 'Seminar', value: 'Seminar' },
  { label: 'Other', value: 'Other' },
];

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Upcoming');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Temporary state for the mobile sheet
  const [tempTimeFilter, setTempTimeFilter] = useState<TimeFilter>('Upcoming');
  const [tempCategory, setTempCategory] = useState<string>('ALL');

  const loadData = () => {
    // Authoritative: getActiveEvents() only includes non-expired, non-cancelled events
    setEvents(storage.getActiveEvents());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const isAuthorizedPublisher =
    user && (user.role === 'ADMIN' || user.role === 'PUBLISHER' || user.isPublisher === true);

  const ist = getCurrentISTParts();

  // Evaluate 7-day range for 'This Week' filter
  const thisWeekDates = useMemo(() => {
    const dates = new Set<string>();
    const baseEpoch = Date.now();
    for (let i = 0; i <= 7; i++) {
      const d = new Date(baseEpoch + i * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().split('T')[0];
      dates.add(iso);
    }
    return dates;
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Time filter
      if (timeFilter === 'Today') {
        if (ev.date !== ist.dateStr) return false;
      } else if (timeFilter === 'Tomorrow') {
        if (ev.date !== ist.tomorrowStr) return false;
      } else if (timeFilter === 'This Week') {
        if (!thisWeekDates.has(ev.date) && ev.date !== ist.dateStr) return false;
      } else if (timeFilter === 'Upcoming') {
        // Any date starting today or later
        if (ev.date < ist.dateStr) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL') {
        if (ev.category !== selectedCategory) return false;
      }

      // 3. Search query filter (title, organizer, venue/location, category, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          ev.title.toLowerCase().includes(q) ||
          ev.organizer.toLowerCase().includes(q) ||
          ev.locationName.toLowerCase().includes(q) ||
          ev.category.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          (ev.venueDetail && ev.venueDetail.toLowerCase().includes(q)) ||
          (ev.tags && ev.tags.some((t) => t.toLowerCase().includes(q)));
        if (!matches) return false;
      }

      return true;
    });
  }, [events, timeFilter, selectedCategory, searchQuery, ist.dateStr, ist.tomorrowStr, thisWeekDates]);

  const handleToggleSave = (event: CampusEvent) => {
    if (!user) {
      toast('Please sign in to save events', 'info');
      return;
    }
    const saved = storage.toggleSaveEvent(user.id, event.id);
    toast(saved ? `Saved "${event.title}"` : `Removed from bookmarks`, 'success');
  };

  const handleOpenMobileFilter = () => {
    setTempTimeFilter(timeFilter);
    setTempCategory(selectedCategory);
    setIsMobileFilterOpen(true);
  };

  const handleApplyMobileFilters = () => {
    setTimeFilter(tempTimeFilter);
    setSelectedCategory(tempCategory);
    setIsMobileFilterOpen(false);
  };

  const handleClearFilters = () => {
    setTimeFilter('Upcoming');
    setSelectedCategory('ALL');
    setSearchQuery('');
    setTempTimeFilter('Upcoming');
    setTempCategory('ALL');
    setIsMobileFilterOpen(false);
  };

  const hasActiveFilters = timeFilter !== 'Upcoming' || selectedCategory !== 'ALL' || searchQuery.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Call-to-action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
            India Standard Time (IST) · Concluded events auto-expire
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight mt-1">
            Campus Events
          </h1>
          <p className="text-[#86868B] text-xs sm:text-sm mt-1 max-w-2xl">
            Live technical workshops, guest seminars, hackathons, and student activities across VIT Bhopal University.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAuthorizedPublisher && (
            <Link
              to="/publisher/events/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish Event</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, club, venue, or keyword..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Category Selector */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <label className="text-xs font-semibold text-[#86868B] whitespace-nowrap">
              Category:
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-[#1D1D1F] hover:bg-black/[0.05] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#86868B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handleOpenMobileFilter}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                hasActiveFilters
                  ? 'bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20'
                  : 'bg-[#F5F5F7] text-[#1D1D1F] border-black/[0.06] hover:bg-black/[0.05]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {selectedCategory !== 'ALL' || timeFilter !== 'Upcoming' ? '• Active' : ''}</span>
            </button>
          </div>
        </div>

        {/* Desktop Time Filter Bar */}
        <div className="hidden sm:flex items-center justify-between pt-2 border-t border-black/[0.04]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] mr-2">
              Time:
            </span>
            {TIME_FILTERS.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  timeFilter === tf
                    ? 'bg-[#1D1D1F] text-white shadow-2xs'
                    : 'bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-[#86868B] px-1">
        <div>
          Showing <span className="font-bold text-[#1D1D1F]">{filteredEvents.length}</span> active{' '}
          {filteredEvents.length === 1 ? 'event' : 'events'}
          {selectedCategory !== 'ALL' && <span> in <strong className="text-[#1D1D1F]">{selectedCategory}</strong></span>}
          {timeFilter !== 'All' && <span> ({timeFilter})</span>}
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-black/[0.06] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] text-[#86868B] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F]">No upcoming events found</h3>
          <p className="text-xs text-[#86868B] max-w-sm mx-auto">
            Check back later for new campus events, or adjust your active filters.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-[#F5F5F7] hover:bg-black/[0.06] text-[#1D1D1F] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => {
            const isSaved = user ? storage.isEventSaved(user.id, event.id) : false;
            return (
              <EventCard
                key={event.id}
                event={event}
                isSaved={isSaved}
                onToggleSave={handleToggleSave}
              />
            );
          })}
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-black/[0.08] p-6 space-y-6 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0071E3]" />
                <h3 className="text-base font-bold text-[#1D1D1F]">Filter Events</h3>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-full text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Filter Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
                Time & Schedule (IST)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_FILTERS.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTempTimeFilter(tf)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                      tempTimeFilter === tf
                        ? 'bg-[#1D1D1F] text-white shadow-2xs'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.05]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTempCategory(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer truncate ${
                      tempCategory === opt.value
                        ? 'bg-[#0071E3] text-white shadow-2xs'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.05]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sheet Actions */}
            <div className="pt-2 flex items-center gap-3 border-t border-black/[0.06]">
              <button
                onClick={handleClearFilters}
                className="flex-1 py-2.5 bg-[#F5F5F7] hover:bg-black/[0.06] text-[#1D1D1F] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={handleApplyMobileFilters}
                className="flex-1 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
