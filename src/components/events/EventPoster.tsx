import React from 'react';
import { Calendar, Tag, Sparkles, Code, Wrench, Trophy, BookOpen, Music, Activity, HelpCircle } from 'lucide-react';
import { EventCategory } from '../../types';

interface EventPosterProps {
  coverImage?: string;
  title: string;
  category: EventCategory;
  className?: string;
  aspect?: 'card' | 'banner' | 'square';
}

const CATEGORY_STYLES: Record<
  EventCategory,
  {
    bg: string;
    text: string;
    gradient: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  Technical: {
    bg: 'bg-indigo-900',
    text: 'text-indigo-200',
    gradient: 'from-indigo-900 via-slate-900 to-blue-950',
    icon: Code,
  },
  Workshops: {
    bg: 'bg-emerald-900',
    text: 'text-emerald-200',
    gradient: 'from-emerald-950 via-teal-950 to-slate-950',
    icon: Wrench,
  },
  Clubs: {
    bg: 'bg-purple-900',
    text: 'text-purple-200',
    gradient: 'from-purple-950 via-slate-950 to-indigo-950',
    icon: Sparkles,
  },
  Cultural: {
    bg: 'bg-rose-900',
    text: 'text-rose-200',
    gradient: 'from-rose-950 via-pink-950 to-slate-950',
    icon: Music,
  },
  Sports: {
    bg: 'bg-amber-900',
    text: 'text-amber-200',
    gradient: 'from-amber-950 via-orange-950 to-slate-950',
    icon: Activity,
  },
  Academics: {
    bg: 'bg-blue-900',
    text: 'text-blue-200',
    gradient: 'from-blue-950 via-slate-900 to-indigo-950',
    icon: BookOpen,
  },
  Competition: {
    bg: 'bg-red-900',
    text: 'text-red-200',
    gradient: 'from-red-950 via-rose-950 to-slate-950',
    icon: Trophy,
  },
  Seminar: {
    bg: 'bg-cyan-900',
    text: 'text-cyan-200',
    gradient: 'from-cyan-950 via-slate-900 to-blue-950',
    icon: BookOpen,
  },
  Orientation: {
    bg: 'bg-violet-900',
    text: 'text-violet-200',
    gradient: 'from-violet-950 via-purple-950 to-slate-950',
    icon: Sparkles,
  },
  Other: {
    bg: 'bg-slate-900',
    text: 'text-slate-300',
    gradient: 'from-slate-950 via-slate-900 to-zinc-950',
    icon: HelpCircle,
  },
};

export const EventPoster: React.FC<EventPosterProps> = ({
  coverImage,
  title,
  category,
  className = '',
  aspect = 'card',
}) => {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.Other;
  const CategoryIcon = style.icon;

  if (coverImage && coverImage.trim()) {
    return (
      <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
        <img
          src={coverImage}
          alt={title ? `${title} poster` : 'Event poster'}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback gracefully on broken images to prevent ugly missing image icons
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Clean, professional neutral campus poster placeholder when no image was uploaded
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${style.gradient} flex flex-col justify-between p-5 text-white ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 border border-white/10 flex items-center gap-1.5">
          <CategoryIcon className="w-3 h-3" />
          <span>{category}</span>
        </span>
        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
          <Calendar className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] uppercase font-mono tracking-widest text-white/50">
          VIT Bhopal Event
        </div>
        <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 text-white">
          {title}
        </h4>
      </div>

      <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-white/[0.03] blur-xl pointer-events-none" />
    </div>
  );
};
