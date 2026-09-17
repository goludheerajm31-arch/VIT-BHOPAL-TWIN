import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { CampusEvent, CampusLocation } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { useAuth } from '../services/auth';
import { useToast } from '../components/layout/Toast';
import { CampusMap } from '../components/CampusMap';
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Bookmark,
  BookmarkCheck,
  Share2,
  Users,
  Building2,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [venueLocation, setVenueLocation] = useState<CampusLocation | null>(null);

  const loadData = () => {
    if (!id) return;
    const ev = storage.getEventById(id);
    if (ev) {
      setEvent(ev);
      const loc = storage.getLocationById(ev.locationId);
      if (loc) setVenueLocation(loc);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [id]);

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Event not found</h2>
        <p className="text-xs text-slate-500">
          The requested campus event may have concluded or the link is invalid.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
        </Link>
      </div>
    );
  }

  const isSaved = user ? storage.isEventSaved(user.id, event.id) : false;

  const handleToggleSave = () => {
    if (!user) {
      toast('Please sign in to save events', 'info');
      return;
    }
    const saved = storage.toggleSaveEvent(user.id, event.id);
    toast(saved ? `Saved "${event.title}"` : `Removed from bookmarks`, 'success');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast('Event link copied to clipboard!', 'success');
    } else {
      toast('Link copied', 'info');
    }
  };

  const handleNavigateToVenue = () => {
    // Lead user straight to campus wayfinding navigation with venue highlighted
    navigate(`/navigation?to=${event.locationId}&event=${event.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Breadcrumb */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Events & Calendar
        </button>
      </div>

      {/* Main Header & Cover Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
          <img
            src={event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80'}
            alt={event.title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/90 text-slate-900 backdrop-blur-xs shadow-sm">
              {event.category}
            </span>
            {event.verified && <VerifiedBadge size="md" />}
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white space-y-2">
            <div className="text-xs sm:text-sm font-semibold text-blue-300">
              Organized by {event.organizer}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-1">{event.subtitle}</p>
            )}
          </div>
        </div>

        {/* Quick Action Ribbon */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-900">Date</div>
                <div className="text-slate-500 text-xs">{event.date}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-900">Time</div>
                <div className="text-slate-500 text-xs">
                  {event.startTime} – {event.endTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-900">Venue</div>
                <div className="text-slate-500 text-xs">{event.locationName}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* The primary Hackathon Golden Path action: [Navigate to Venue] */}
            <button
              onClick={handleNavigateToVenue}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Navigate to Venue</span>
            </button>

            <button
              onClick={handleToggleSave}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
              title={isSaved ? 'Remove Bookmark' : 'Save Event'}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
              title="Share Event"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Description & Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs text-slate-400 mb-2">
                About the Event
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Topic Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer Trust Card */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Trusted Publisher Verification</span>
                </div>
                {event.verified && <VerifiedBadge size="sm" />}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This event is officially scheduled by <strong>{event.organizer}</strong> and authenticated by the VIT Bhopal University Academic & Club Governance Board.
              </p>
            </div>
          </div>

          {/* Right Col: Venue Mini Map Preview & Location Details */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Venue Preview
                </span>
                <Link
                  to={`/locations/${event.locationId}`}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  Full Profile <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {venueLocation && (
                <>
                  {/* Embedded Mini Map for Venue */}
                  <div className="h-44 rounded-lg overflow-hidden border border-slate-200">
                    <CampusMap
                      locations={[venueLocation]}
                      selectedLocationId={venueLocation.id}
                      height="100%"
                      showControls={false}
                      interactive={false}
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm">{venueLocation.name}</div>
                    <div className="text-slate-500">{event.venueDetail || venueLocation.building}</div>
                    <div className="text-slate-500">{venueLocation.floor}</div>
                  </div>

                  <button
                    onClick={handleNavigateToVenue}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions to Venue</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
