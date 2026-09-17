import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { Announcement } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import {
  Bell,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  const loadData = () => {
    setAnnouncements(storage.getAnnouncements());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const filtered = announcements.filter((ann) => {
    if (selectedPriority !== 'All' && ann.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        ann.title.toLowerCase().includes(q) ||
        ann.description.toLowerCase().includes(q) ||
        ann.publisherName.toLowerCase().includes(q) ||
        (ann.locationName && ann.locationName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
            Official Notice
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            General
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Announcements & Bulletins
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Official communications authenticated by university departments, clubs, and governance boards.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High Priority</option>
            <option value="medium">Official</option>
            <option value="low">General</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-2xl bg-white border transition-all shadow-xs space-y-3 ${
              ann.priority === 'urgent'
                ? 'border-rose-300 bg-rose-50/20'
                : 'border-slate-200/90 hover:border-blue-300'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {getPriorityBadge(ann.priority)}
                <span className="text-xs font-bold text-slate-500">{ann.category}</span>
              </div>
              {ann.verified && <VerifiedBadge size="sm" />}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {ann.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{ann.description}</p>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>By: <strong>{ann.publisherName}</strong></span>
                {ann.locationName && (
                  <Link
                    to={`/locations/${ann.locationId}`}
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{ann.locationName}</span>
                  </Link>
                )}
              </div>

              {ann.actionUrl && (
                <Link
                  to={ann.actionUrl}
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700">No announcements match criteria</h3>
          </div>
        )}
      </div>
    </div>
  );
};
