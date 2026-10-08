import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage } from '../services/storage';
import { useToast } from '../components/layout/Toast';
import { CampusEvent, EventCategory } from '../types';
import { EventPosterUploader } from '../components/events/EventPosterUploader';
import { uploadEventPosterFile, deleteEventPosterFile } from '../lib/supabase';
import { getCurrentISTParts } from '../lib/dateUtils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
} from 'lucide-react';

const CATEGORIES: EventCategory[] = [
  'Workshops',
  'Technical',
  'Clubs',
  'Cultural',
  'Sports',
  'Academics',
  'Competition',
  'Seminar',
  'Orientation',
  'Other',
];

export const PublisherCreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const locations = storage.getLocations();
  const istToday = getCurrentISTParts();

  // Basic Information
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Workshops');
  const [description, setDescription] = useState('');

  // When & Where
  const [date, setDate] = useState(istToday.tomorrowStr || istToday.dateStr);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');

  // Poster
  const [posterFile, setPosterFile] = useState<File | null>(null);

  // Progressive Disclosure: Additional Optional Details
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [capacity, setCapacity] = useState('150');
  const [tags, setTags] = useState('technical, workshop, hands-on');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authorization Security Check: Verify user has Publisher or Admin capability
  const hasAuth =
    user && (user.role === 'ADMIN' || user.role === 'PUBLISHER' || user.isPublisher === true);

  if (!hasAuth) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#1D1D1F]">Publisher Authorization Required</h2>
        <p className="text-xs text-[#86868B] leading-relaxed">
          You do not possess authorized campus publisher credentials. Please apply for Publisher
          Access in your student profile or contact campus administration.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071E3] text-white rounded-xl text-xs font-semibold"
        >
          Go to Student Profile
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Please provide an event title', 'error');
      return;
    }

    const selectedLoc = locations.find((l) => l.id === selectedLocationId);
    if (!selectedLoc) {
      toast('Please select a valid campus venue', 'error');
      return;
    }

    const pubRecord = user?.email
      ? storage.getPublisherByEmail(user.email) || storage.getPublisherByUserId(user.id)
      : undefined;

    const organizerName =
      pubRecord?.organizationName ||
      pubRecord?.name ||
      user?.department ||
      user?.name ||
      'Authorized Campus Publisher';
    const publisherId = pubRecord?.id || storage.getPublishers()[0]?.id || 'pub-campus';

    const eventId = `evt-${Date.now()}`;
    setIsSubmitting(true);

    try {
      let uploadedPosterUrl: string | undefined = undefined;
      let storagePath: string | undefined = undefined;
      let posterMeta = undefined;

      // Handle Poster Upload through Supabase Storage if file selected
      if (posterFile) {
        toast('Uploading event poster to secure storage...', 'info');
        const uploadResult = await uploadEventPosterFile(eventId, posterFile);
        uploadedPosterUrl = uploadResult.publicUrl;
        storagePath = uploadResult.storagePath;
        posterMeta = {
          fileName: uploadResult.fileName,
          storagePath: uploadResult.storagePath,
          mimeType: uploadResult.fileType,
          fileSize: uploadResult.fileSize,
          uploadedAt: new Date().toISOString(),
        };
      }

      const newEvent: CampusEvent = {
        id: eventId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || 'No description provided.',
        category,
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        locationId: selectedLoc.id,
        locationName: selectedLoc.name,
        venueDetail: `${selectedLoc.building}, ${selectedLoc.floor || 'Floor'}`,
        organizer: organizerName,
        publisherId,
        verified: true,
        status: 'upcoming',
        approvalStatus: 'approved',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        coverImage: uploadedPosterUrl || undefined,
        storagePath,
        posterMetadata: posterMeta,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        registrationUrl: registrationUrl.trim() || undefined,
      };

      try {
        await storage.saveEvent(newEvent, user?.id);
      } catch (saveErr) {
        if (storagePath) {
          deleteEventPosterFile(storagePath).catch((err) =>
            console.warn('[PublisherCreateEventPage] Clean up orphaned poster error:', err)
          );
        }
        throw saveErr;
      }

      toast('Event published live to the Campus Twin!', 'success');
      navigate(`/events/${newEvent.id}`);
    } catch (err: any) {
      console.error('[PublisherCreateEventPage]', err);
      toast(err.message || 'Failed to publish event. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/publisher')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] mb-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Publisher Studio
        </button>
        <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
          Publish New Event
        </h1>
        <p className="text-xs text-[#86868B] mt-1">
          Geo-referenced on the interactive map, discoverable in campus search, and auto-expires upon conclusion in IST.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Basic Information */}
        <div className="bg-white p-6 rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
            1. Basic Information
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1D1D1F]">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Autonomous Robotics Workshop"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-xs font-medium text-[#1D1D1F]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1D1D1F]">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs font-medium text-[#1D1D1F]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1D1D1F]">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline agenda, prerequisites, kit requirements, guest speakers, and target audience..."
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white text-xs leading-relaxed text-[#1D1D1F]"
            />
          </div>
        </div>

        {/* SECTION 2: When & Where */}
        <div className="bg-white p-6 rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
            2. When & Where
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1D1D1F]">
                Date (IST) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1D1D1F]">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                required
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1D1D1F]">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="12:00 PM"
                required
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1D1D1F]">
              Campus Venue <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs font-medium text-[#1D1D1F]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.building})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 3: Event Poster */}
        <div className="bg-white p-6 rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
            3. Event Poster
          </div>

          <EventPosterUploader
            onFileSelect={(file) => setPosterFile(file)}
            onRemovePoster={() => setPosterFile(null)}
            disabled={isSubmitting}
          />
        </div>

        {/* SECTION 4: Progressive Disclosure (Additional Details) */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-5 text-left flex items-center justify-between text-xs font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
          >
            <span>Additional Details (Registration link, capacity, tags)</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-[#86868B]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#86868B]" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-6 pt-0 space-y-4 border-t border-black/[0.04]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1D1D1F]">
                  Subtitle / Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Build your first autonomous obstacle rover"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Registration / RSVP URL</span>
                  </label>
                  <input
                    type="url"
                    value={registrationUrl}
                    onChange={(e) => setRegistrationUrl(e.target.value)}
                    placeholder="https://vitbhopal.ac.in/events/rsvp"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1D1D1F]">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="150"
                    min="0"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1D1D1F]">
                  Search Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="robotics, hardware, hands-on, competition"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-xs text-[#1D1D1F]"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Publishing Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/publisher')}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-[#F5F5F7] hover:bg-black/[0.06] text-[#1D1D1F] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Publishing Event...' : 'Publish Event Live'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
