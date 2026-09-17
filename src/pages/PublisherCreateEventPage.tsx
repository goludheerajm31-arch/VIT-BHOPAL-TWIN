import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage } from '../services/storage';
import { useToast } from '../components/layout/Toast';
import { CampusEvent } from '../types';
import { ArrowLeft, Calendar, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

export const PublisherCreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const locations = storage.getLocations();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Workshops');
  const [date, setDate] = useState('2026-09-05');
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('technical, robotics, hands-on');
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'
  );

  const handleSubmit = (e: React.FormEvent) => {
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

    const newEvent: CampusEvent = {
      id: `event-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || 'No description provided.',
      category: category as any,
      date,
      startTime,
      endTime,
      locationId: selectedLoc.id,
      locationName: selectedLoc.name,
      venueDetail: `${selectedLoc.building}, ${selectedLoc.floor}`,
      organizer: user?.name || 'AI & ML Club',
      publisherId: user?.id || 'pub-aiml-club',
      verified: true,
      status: 'upcoming',
      approvalStatus: 'approved',
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      coverImage,
    };

    storage.saveEvent(newEvent);
    toast('Event published live to the Campus Twin!', 'success');
    navigate(`/events/${newEvent.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Publisher Studio
        </button>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Publish New Campus Event
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Your event will be immediately geo-referenced on the interactive map and discoverable through global search.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs"
      >
        {/* Title & Subtitle */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Robotics Hands-on Boot Camp"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Short Subtitle / Tagline</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Build your first autonomous obstacle-avoidance rover"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Category & Venue Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Workshops">Workshops</option>
              <option value="Technical">Technical</option>
              <option value="Clubs">Clubs</option>
              <option value="Cultural">Cultural</option>
              <option value="Sports">Sports</option>
              <option value="Academics">Academics</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Campus Venue *</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.building})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Times */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Event Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline agenda, prerequisites, kit requirements, and who should attend..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
          ></textarea>
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ai, robotics, workshop, hackathon"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/publisher')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Publish to Campus Map</span>
          </button>
        </div>
      </form>
    </div>
  );
};
