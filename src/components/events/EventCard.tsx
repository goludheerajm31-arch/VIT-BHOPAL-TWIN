import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CampusEvent } from '../../types';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { EventPoster } from './EventPoster';
import { formatISTDate } from '../../lib/dateUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Bookmark,
  BookmarkCheck,
  Users,
  ArrowRight,
} from 'lucide-react';

interface EventCardProps {
  event: CampusEvent;
  isSaved?: boolean;
  onToggleSave?: (event: CampusEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, isSaved = false, onToggleSave }) => {
  const navigate = useNavigate();

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.(event);
  };

  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/explore?to=${event.locationId}&from=loc-ab-1&navigate=true`);
  };

  return (
    <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:border-black/[0.12] transition-all overflow-hidden flex flex-col justify-between group">
      {/* Poster Image / Placeholder */}
      <div className="relative aspect-16/9 sm:aspect-16/10 w-full overflow-hidden bg-slate-950">
        <EventPoster
          coverImage={event.coverImage}
          title={event.title}
          category={event.category}
          className="w-full h-full object-cover"
        />

        {/* Category Pill Tag */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs border border-white/20">
            {event.category}
          </span>
        </div>

        {/* Bookmark Action */}
        <button
          onClick={handleBookmarkClick}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:text-[#0071E3] backdrop-blur-xs border border-white/20 shadow-xs transition-colors cursor-pointer"
          title={isSaved ? 'Remove Bookmark' : 'Bookmark Event'}
          aria-label={isSaved ? `Remove bookmark for ${event.title}` : `Bookmark ${event.title}`}
        >
          {isSaved ? (
            <BookmarkCheck className="w-4 h-4 text-[#0071E3]" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>

        {/* Bottom Banner Ribbon with Date & Time */}
        <div className="absolute bottom-3 left-3 right-3 z-10 text-white flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-xl text-white/95 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-blue-300" />
            <span>{formatISTDate(event.date)}</span>
            <span className="text-white/40">·</span>
            <Clock className="w-3.5 h-3.5 text-blue-300" />
            <span>{event.startTime}</span>
          </div>

          {event.capacity && (
            <div className="hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-xl text-[10px] text-white/80">
              <Users className="w-3 h-3" />
              <span>{event.capacity} seats</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Organizer Header */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#86868B] truncate" title={event.organizer}>
              {event.organizer}
            </span>
            {event.verified && <VerifiedBadge size="sm" />}
          </div>

          {/* Title Link */}
          <Link to={`/events/${event.id}`}>
            <h3 className="font-bold text-sm sm:text-base text-[#1D1D1F] leading-snug group-hover:text-[#0071E3] transition-colors line-clamp-2">
              {event.title}
            </h3>
          </Link>

          {/* Description */}
          <p className="text-xs text-[#86868B] line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Venue Location & Buttons */}
        <div className="space-y-3 pt-3 border-t border-black/[0.04] text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{event.locationName}</span>
            {event.venueDetail && (
              <span className="text-[#86868B] text-[11px] truncate">({event.venueDetail})</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectionsClick}
              className="flex-1 py-2 px-3 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Directions</span>
            </button>

            <Link
              to={`/events/${event.id}`}
              className="py-2 px-3.5 bg-[#F5F5F7] hover:bg-black/[0.06] text-[#1D1D1F] rounded-xl text-xs font-semibold text-center transition-colors flex items-center gap-1"
            >
              <span>Details</span>
              <ArrowRight className="w-3 h-3 text-[#86868B] group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
