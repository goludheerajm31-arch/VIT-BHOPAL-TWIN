import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusLocation, CampusEvent, FacultyMember } from '../types';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import { CampusMap } from '../components/CampusMap';
import { FacultyCabinCard } from '../components/faculty/FacultyCabinCard';
import {
  Building2,
  Clock,
  Navigation,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Calendar,
  Phone,
  Compass,
  ArrowLeft,
  Share2,
  Accessibility,
  GraduationCap,
} from 'lucide-react';

export const LocationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [location, setLocation] = useState<CampusLocation | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);

  const loadData = () => {
    if (!id) return;
    const loc = storage.getLocationById(id);
    if (loc) {
      setLocation(loc);
      const evs = storage.getEventsByLocationId(id);
      setEvents(evs);
      const facs = storage.getFacultyByBuilding(id);
      setFacultyMembers(facs);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [id]);

  if (!location) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Location not found</h2>
        <p className="text-xs text-slate-500">We couldn't find that campus location.</p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Explore
        </Link>
      </div>
    );
  }

  const isSaved = user ? storage.isLocationSaved(user.id, location.id) : false;

  const handleToggleSave = () => {
    if (!user) {
      toast('Please sign in to save locations', 'info');
      return;
    }
    const saved = storage.toggleSaveLocation(user.id, location.id);
    toast(saved ? `Saved "${location.name}"` : `Removed from bookmarks`, 'success');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast('Location link copied to clipboard!', 'success');
    }
  };

  const scrollToEvents = () => {
    const el = document.getElementById('events-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCabins = () => {
    const el = document.getElementById('cabins-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back breadcrumb */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </button>
      </div>

      {/* Main Location Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                {location.category}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {location.zone || 'Campus Zone'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {location.name}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {location.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() =>
                navigate(`/navigation?to=${location.id}`)
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Directions</span>
            </button>

            <button
              onClick={handleToggleSave}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              title={isSaved ? 'Remove bookmark' : 'Save location'}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleShare}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              title="Share link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {events.length > 0 && (
              <button
                onClick={scrollToEvents}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>View Events Here ({events.length})</span>
              </button>
            )}

            {facultyMembers.length > 0 && (
              <button
                onClick={scrollToCabins}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Faculty Cabins ({facultyMembers.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Structured Spec Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              BUILDING COMPLEX
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">{location.building}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              FLOOR LEVEL
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">{location.floor}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              HOURS OF OPERATION
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">{location.openingHours}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CONTACT DESK
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {location.contactPhone || '+91 7560 254500'}
            </div>
          </div>
        </div>

        {/* Accessibility & Facilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Facilities */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Available Facilities & Amenities
            </div>
            <div className="flex flex-wrap gap-2">
              {location.facilities.map((fac) => (
                <span
                  key={fac}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Accessibility className="w-4 h-4 text-emerald-600" />
              <span>Accessibility Features</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{location.accessibility}</p>
          </div>
        </div>

        {/* Embedded Interactive Map */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Campus Location Map
          </div>
          <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
            <CampusMap
              locations={[location]}
              selectedLocationId={location.id}
              height="100%"
              showControls={false}
            />
          </div>
        </div>
      </div>

      {/* Faculty Cabins in this Building Section */}
      {facultyMembers.length > 0 && (
        <div id="cabins-section" className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Staff & Professor Directory
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>Faculty Cabins in this Building ({facultyMembers.length})</span>
              </h2>
            </div>
            <Link
              to={`/faculty?building=${encodeURIComponent(location.name)}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View full directory filters →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facultyMembers.map((fac) => (
              <FacultyCabinCard key={fac.id} faculty={fac} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events at this Location Section */}
      <div id="events-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Upcoming Events at this Location
          </h2>
          <span className="text-xs text-slate-500">{events.length} events scheduled</span>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                      {ev.category}
                    </span>
                    <span className="text-xs font-semibold text-blue-600">{ev.startTime}</span>
                  </div>

                  <Link to={`/events/${ev.id}`}>
                    <h3 className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors">
                      {ev.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2">{ev.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">By {ev.organizer}</span>
                  <Link
                    to={`/events/${ev.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No events are currently scheduled at {location.name}.
          </div>
        )}
      </div>
    </div>
  );
};
