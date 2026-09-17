import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacultyMember } from '../../types';
import { useAuth } from '../../services/auth';
import {
  MapPin,
  Navigation,
  Clock,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Edit3,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../layout/Toast';

interface FacultyCabinCardProps {
  faculty: FacultyMember;
  onNavigateToCabin?: (faculty: FacultyMember) => void;
  onViewOnMap?: (faculty: FacultyMember) => void;
  onEdit?: (faculty: FacultyMember) => void;
  onDelete?: (faculty: FacultyMember) => void;
  compact?: boolean;
}

export const FacultyCabinCard: React.FC<FacultyCabinCardProps> = ({
  faculty,
  onNavigateToCabin,
  onViewOnMap,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const [copied, setCopied] = useState(false);
  const [showDirections, setShowDirections] = useState(false);

  const handleCopyCabin = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(faculty.cabinNumber);
    setCopied(true);
    toast(`Cabin ${faculty.cabinNumber} copied`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToCabin) {
      onNavigateToCabin(faculty);
    } else {
      navigate(`/navigation?to=${faculty.buildingId}&cabin=${faculty.cabinNumber}&faculty=${faculty.id}`);
    }
  };

  const handleMapLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewOnMap) {
      onViewOnMap(faculty);
    } else {
      navigate(`/explore?location=${faculty.buildingId}&cabin=${faculty.cabinNumber}`);
    }
  };

  const getStatusDot = () => {
    switch (faculty.status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Available
          </span>
        );
      case 'in_lecture':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Class
          </span>
        );
      case 'meeting':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-600">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Meeting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#86868B]">
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-black/[0.1] transition-all flex flex-col justify-between overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Top Header: Cabin Badge, School & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCabin}
              title="Copy cabin code"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <span>{faculty.cabinNumber}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-[#86868B]" />
              )}
            </button>
            <span className="text-[11px] font-medium text-[#86868B]">
              {faculty.school}
            </span>
          </div>

          <div>{getStatusDot()}</div>
        </div>

        {/* Faculty Profile Summary */}
        <div className="flex items-center gap-3">
          {faculty.avatarUrl ? (
            <img
              src={faculty.avatarUrl}
              alt={faculty.name}
              className="w-11 h-11 rounded-xl object-cover border border-black/[0.06] shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-black/[0.05] text-[#1D1D1F] flex items-center justify-center font-semibold text-sm shrink-0">
              {faculty.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight truncate">
              {faculty.name}
            </h3>
            <p className="text-xs text-[#86868B] truncate">
              {faculty.designation}
            </p>
          </div>
        </div>

        {/* Location & Floor */}
        <div className="flex items-center gap-2 text-xs text-[#1D1D1F] bg-[#F5F5F7] px-3 py-2 rounded-xl">
          <MapPin className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
          <span className="font-medium truncate">{faculty.buildingName}</span>
          <span className="text-[#86868B]">·</span>
          <span className="text-[#86868B] shrink-0">{faculty.floor}</span>
          {faculty.wing && (
            <>
              <span className="text-[#86868B]">·</span>
              <span className="text-[#86868B] truncate">{faculty.wing}</span>
            </>
          )}
        </div>

        {/* Consultation Hours */}
        <div className="flex items-center gap-2 text-xs text-[#86868B]">
          <Clock className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
          <span className="truncate">{faculty.consultationHours}</span>
        </div>

        {!compact && (
          <>
            {/* Contact quick links */}
            <div className="flex items-center gap-4 text-xs text-[#86868B] pt-1">
              <a
                href={`mailto:${faculty.email}`}
                className="flex items-center gap-1.5 hover:text-[#0071E3] transition-colors truncate"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{faculty.email}</span>
              </a>
              {faculty.phone && (
                <a
                  href={`tel:${faculty.phone}`}
                  className="flex items-center gap-1.5 hover:text-[#0071E3] transition-colors shrink-0"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{faculty.phone}</span>
                </a>
              )}
            </div>

            {/* Wayfinding Disclosure */}
            {faculty.directionsGuide && (
              <div className="pt-2 border-t border-black/[0.04]">
                <button
                  onClick={() => setShowDirections(!showDirections)}
                  className="flex items-center gap-1 text-xs font-medium text-[#0071E3] hover:text-[#0077ED] transition-colors cursor-pointer"
                >
                  <span>Wayfinding steps</span>
                  {showDirections ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showDirections && (
                  <div className="mt-2 p-2.5 bg-[#F5F5F7] rounded-xl text-xs text-[#1D1D1F] leading-relaxed">
                    {faculty.directionsGuide}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="px-4 py-3 bg-[#F5F5F7]/50 border-t border-black/[0.04] flex items-center gap-2">
        <button
          onClick={handleDirections}
          className="flex-1 py-1.5 px-3 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition-colors cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Directions</span>
        </button>

        <button
          onClick={handleMapLocate}
          className="p-1.5 rounded-full hover:bg-black/[0.06] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
          title="Locate on map"
        >
          <MapPin className="w-4 h-4" />
        </button>

        {isAdmin && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(faculty);
            }}
            className="p-1.5 rounded-full hover:bg-black/[0.06] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {isAdmin && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(faculty);
            }}
            className="p-1.5 rounded-full hover:bg-rose-50 text-[#86868B] hover:text-rose-600 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
