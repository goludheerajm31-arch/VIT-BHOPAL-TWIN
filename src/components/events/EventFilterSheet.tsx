import React from 'react';
import { X, Calendar, Clock, Filter, Sparkles, RotateCcw } from 'lucide-react';
import { EventCategory } from '../../types';

export type EventTimeFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'UPCOMING';

export const TIME_FILTER_OPTIONS: { id: EventTimeFilter; label: string }[] = [
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'TODAY', label: 'Today' },
  { id: 'TOMORROW', label: 'Tomorrow' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'ALL', label: 'All Active' },
];

export const CATEGORY_OPTIONS: { id: EventCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'Technical', label: 'Technical' },
  { id: 'Workshops', label: 'Workshops' },
  { id: 'Clubs', label: 'Clubs & Chapters' },
  { id: 'Cultural', label: 'Cultural' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Academics', label: 'Academics' },
  { id: 'Competition', label: 'Competition & Hackathon' },
  { id: 'Seminar', label: 'Seminar & Guest Lecture' },
  { id: 'Orientation', label: 'Orientation' },
  { id: 'Other', label: 'Other Activities' },
];

interface EventFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTime: EventTimeFilter;
  onSelectTime: (time: EventTimeFilter) => void;
  selectedCategory: EventCategory | 'ALL';
  onSelectCategory: (cat: EventCategory | 'ALL') => void;
  onReset: () => void;
}

export const EventFilterSheet: React.FC<EventFilterSheetProps> = ({
  isOpen,
  onClose,
  selectedTime,
  onSelectTime,
  selectedCategory,
  onSelectCategory,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-black/[0.08] p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Event Filters</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Filters */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Time & Schedule (IST)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_FILTER_OPTIONS.map((opt) => {
              const isSelected = selectedTime === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectTime(opt.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filters */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Event Category
          </label>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
