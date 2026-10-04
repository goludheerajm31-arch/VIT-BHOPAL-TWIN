import React, { useState, useEffect } from 'react';
import { CampusEvent, CampusLocation, EventCategory } from '../../types';
import { storage } from '../../services/storage';
import { useToast } from '../layout/Toast';
import { X, Calendar, MapPin, Clock, Tag, Sparkles } from 'lucide-react';

interface AddEditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEvent?: CampusEvent | null;
  locations: CampusLocation[];
  onSuccess?: (event: CampusEvent) => void;
}

export const AddEditEventModal: React.FC<AddEditEventModalProps> = ({
  isOpen,
  onClose,
  initialEvent,
  locations,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Technical');
  const [date, setDate] = useState('2026-09-25');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('01:00 PM');
  const [locationId, setLocationId] = useState('');
  const [venueDetail, setVenueDetail] = useState('AB1-204');
  const [organizer, setOrganizer] = useState('AI & Machine Learning Club');
  const [capacity, setCapacity] = useState('100');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80'
  );

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setSubtitle(initialEvent.subtitle || '');
      setCategory(initialEvent.category || 'Technical');
      setDate(initialEvent.date);
      setStartTime(initialEvent.startTime || '10:00 AM');
      setEndTime(initialEvent.endTime || '01:00 PM');
      setLocationId(initialEvent.locationId || (locations[0]?.id ?? ''));
      setVenueDetail(initialEvent.venueDetail || '');
      setOrganizer(initialEvent.organizer || 'AI & Machine Learning Club');
      setCapacity(initialEvent.capacity ? String(initialEvent.capacity) : '100');
      setDescription(initialEvent.description || '');
      setCoverImage(
        initialEvent.coverImage ||
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80'
      );
    } else {
      setTitle('');
      setSubtitle('');
      setCategory('Workshops');
      setDate('2026-09-25');
      setStartTime('10:00 AM');
      setEndTime('01:00 PM');
      setLocationId(locations[0]?.id || 'loc-ab-1');
      setVenueDetail('AB1-204');
      setOrganizer('AI & Machine Learning Club');
      setCapacity('100');
      setDescription('Hands-on technical workshop covering modern AI architectures and practical labs.');
      setCoverImage(
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80'
      );
    }
  }, [initialEvent, isOpen, locations]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Please provide an event title', 'error');
      return;
    }
    if (!locationId) {
      toast('Please select a campus location', 'error');
      return;
    }

    const selectedLoc = locations.find((l) => l.id === locationId) || locations[0];

    const eventToSave: CampusEvent = {
      id: initialEvent ? initialEvent.id : `evt-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      category,
      date,
      startTime,
      endTime,
      locationId: selectedLoc?.id || 'loc-ab-1',
      locationName: selectedLoc?.name || 'VITB Academic Block 1',
      venueDetail: venueDetail.trim() || undefined,
      organizer: organizer.trim() || 'VIT Bhopal Campus',
      publisherId: initialEvent?.publisherId || 'pub-aiml-club',
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      description: description.trim(),
      coverImage: coverImage.trim() || undefined,
      verified: true,
      status: 'upcoming',
      approvalStatus: 'approved',
      tags: [category, 'Campus', 'Live'],
    };

    setIsSubmitting(true);
    try {
      await storage.saveEvent(eventToSave);
      toast(
        initialEvent ? `Updated "${eventToSave.title}"` : `Created event "${eventToSave.title}" live!`,
        'success'
      );
      onSuccess?.(eventToSave);
      onClose();
    } catch (err: any) {
      console.error('[AddEditEventModal]', err);
      toast(err.message || 'Failed to save event to database', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-black/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/[0.06] sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                {initialEvent ? 'Edit Campus Event' : 'Add Campus Event'}
              </h2>
              <p className="text-xs text-[#86868B]">
                Changes sync to all connected devices in real time via Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#86868B] hover:text-[#1D1D1F] rounded-full hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Club Workshop"
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none cursor-pointer focus:bg-white focus:border-[#0071E3]"
              >
                <option value="Technical">Technical</option>
                <option value="Workshops">Workshops</option>
                <option value="Clubs">Clubs</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Academics">Academics</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Date (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                End Time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g. 01:00 PM"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Campus Building / Node *
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none cursor-pointer focus:bg-white focus:border-[#0071E3]"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.building || loc.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Venue Detail / Room
              </label>
              <input
                type="text"
                value={venueDetail}
                onChange={(e) => setVenueDetail(e.target.value)}
                placeholder="e.g. AB1-204"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Organizer / Club
              </label>
              <input
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. AI & Machine Learning Club"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Attendee Capacity
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Workshop highlights, prerequisites, agenda, etc."
              className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
            />
          </div>

          <div className="pt-4 border-t border-black/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.05] rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : initialEvent ? 'Save Changes' : 'Publish Live Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
