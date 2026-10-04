import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { api } from '../services/api';
import { realtimeClient, RealtimeStatus } from '../services/realtime';
import { CampusLocation, CampusEvent, Publisher, FacultyMember, FacultyStatus, Announcement } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { AddFacultyModal } from '../components/faculty/AddFacultyModal';
import { AddEditEventModal } from '../components/admin/AddEditEventModal';
import { AddEditLocationModal } from '../components/admin/AddEditLocationModal';
import { RejectAnnouncementModal } from '../components/announcements/RejectAnnouncementModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../components/layout/Toast';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Trash2,
  Plus,
  GraduationCap,
  Edit3,
  Search,
  Navigation,
  RotateCcw,
  Activity,
  Radio,
  MapPin,
  Bell,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, role, quickSwitchUser } = useAuth();
  const { toast } = useToast();

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connected');
  const [announcementFilter, setAnnouncementFilter] = useState<'pending' | 'all'>('pending');
  const [rejectingAnnouncement, setRejectingAnnouncement] = useState<Announcement | null>(null);

  // Faculty state
  const [facultySearch, setFacultySearch] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

  // Events state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);

  // Locations state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampusLocation | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const loadData = () => {
    setPublishers(storage.getPublishers());
    setEvents(storage.getEvents());
    setLocations(storage.getLocations());
    setFaculty(storage.getFaculty());
    setAnnouncements(storage.getAnnouncements());
    setAuditLogs(storage.getAuditLogs());
  };

  const handleVerifyAnnouncement = async (annId: string, title: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can verify announcements', 'error');
      return;
    }
    const updated = await storage.verifyAnnouncement(annId, 'approved');
    if (updated) {
      toast(`Verified & posted "${title}" live to campus!`, 'success');
      loadData();
    }
  };

  const handleRejectAnnouncementConfirm = async (reason: string) => {
    if (!rejectingAnnouncement) return;
    const annId = rejectingAnnouncement.id;
    const title = rejectingAnnouncement.title;

    await storage.verifyAnnouncement(annId, 'rejected', reason);
    toast(`Declined announcement "${title}".`, 'info');
    setRejectingAnnouncement(null);
    loadData();
  };

  const handleDeleteAnnouncement = async (annId: string, title: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can delete announcements', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Announcement',
      message: `Are you sure you want to delete "${title}"?`,
      confirmLabel: 'Delete Announcement',
      isDestructive: true,
      onConfirm: async () => {
        await storage.deleteAnnouncement(annId);
        toast(`Removed announcement "${title}"`, 'info');
        loadData();
      },
    });
  };

  useEffect(() => {
    loadData();

    // Listen for real-time changes
    const handleDataChange = () => {
      loadData();
    };
    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange);

    const unsubRealtime = realtimeClient.onStatusChange((status) => {
      setRealtimeStatus(status);
    });

    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange);
      unsubRealtime();
    };
  }, []);

  const handleToggleVerification = async (publisherId: string, currentStatus: boolean, name: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can change publisher verification', 'error');
      return;
    }
    await storage.togglePublisherVerification(publisherId);
    toast(
      currentStatus ? `Revoked verified badge for ${name}` : `Granted verified badge to ${name}`,
      'success'
    );
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can remove events', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Event',
      message: `Are you sure you want to delete "${title}"? Connected students and users will see it removed instantly.`,
      confirmLabel: 'Delete Event',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await storage.deleteEvent(eventId);
          toast(`Removed event "${title}"`, 'success');
        } catch (err: any) {
          toast(err.message || 'Failed to delete event', 'error');
        }
      },
    });
  };

  const handleDeleteLocation = (locationId: string, name: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can remove campus locations', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Campus Node',
      message: `Are you sure you want to remove "${name}" from campus locations?`,
      confirmLabel: 'Delete Location',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await storage.deleteLocation(locationId);
          toast(`Removed location "${name}"`, 'success');
        } catch (err: any) {
          toast(err.message || 'Failed to delete location', 'error');
        }
      },
    });
  };

  const handleOpenAddFaculty = () => {
    setEditingFaculty(null);
    setIsFacultyModalOpen(true);
  };

  const handleOpenEditFaculty = (fac: FacultyMember) => {
    setEditingFaculty(fac);
    setIsFacultyModalOpen(true);
  };

  const handleDeleteFaculty = (fac: FacultyMember) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can delete faculty', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Faculty Cabin',
      message: `Are you sure you want to delete ${fac.name}'s cabin record (${fac.cabinNumber})? This will immediately sync to all interactive maps.`,
      confirmLabel: 'Delete Record',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await storage.deleteFaculty(fac.id);
          toast(`Deleted cabin record for ${fac.name}`, 'success');
        } catch (err: any) {
          toast(err.message || 'Failed to delete faculty', 'error');
        }
      },
    });
  };

  const handleStatusChange = async (id: string, newStatus: FacultyStatus, name: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can update faculty status', 'error');
      return;
    }
    try {
      await storage.updateFacultyStatus(id, newStatus);
      toast(`Updated status for ${name}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleResetFaculty = () => {
    if (role !== 'ADMIN') {
      toast('Only administrators can reset faculty directory', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Reset Faculty Directory',
      message:
        'Are you sure you want to reset the faculty directory to the verified campus default cabins? Custom added cabins will be restored to original seed records.',
      confirmLabel: 'Reset Directory',
      isDestructive: true,
      onConfirm: async () => {
        await storage.resetFaculty();
        toast('Reset to verified defaults', 'success');
      },
    });
  };

  const filteredFaculty = faculty.filter((f) => {
    const matchesSearch =
      facultySearch === '' ||
      f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
      f.cabinNumber.toLowerCase().includes(facultySearch.toLowerCase()) ||
      f.school.toLowerCase().includes(facultySearch.toLowerCase()) ||
      f.floor.toLowerCase().includes(facultySearch.toLowerCase());
    const matchesSchool =
      selectedSchoolFilter === 'all' || f.school.toLowerCase() === selectedSchoolFilter.toLowerCase();
    return matchesSearch && matchesSchool;
  });

  if (role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] pb-24 pt-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-3xl p-8 text-center space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-black/[0.06]">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.04] text-[#1D1D1F] mx-auto flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#0071E3]" />
            </div>
            <h1 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">
              Admin Console Protected
            </h1>
            <p className="text-xs text-[#86868B] leading-relaxed">
              Faculty management, additions, and removals are restricted exclusively to campus administrators. You are currently viewing as <span className="font-semibold text-[#1D1D1F] uppercase">{role}</span>.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => quickSwitchUser('ADMIN')}
                className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition-colors cursor-pointer"
              >
                Switch to Admin Account
              </button>
              <Link
                to="/faculty"
                className="w-full py-2.5 bg-black/[0.04] hover:bg-black/[0.07] text-[#1D1D1F] text-xs font-medium rounded-full transition-colors"
              >
                Return to Faculty Directory
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24 pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Apple Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                Admin Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black/[0.05] text-[#86868B]">
                Super Admin
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Realtime Active
              </span>
              {isSupabaseConfigured() ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Supabase Connected
                </span>
              ) : (
                <span
                  title="Supabase URL detected, but Anon Public Key is missing or invalid. Go to Settings to add your Supabase anon key."
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Local Mode (Needs Anon Key)
                </span>
              )}
            </div>
            <p className="text-xs text-[#86868B] mt-1">
              Multi-user campus digital twin management. All edits broadcast instantly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
            <button
              onClick={() => handleOpenAddFaculty()}
              className="px-3.5 py-1.5 bg-white hover:bg-black/[0.04] text-[#1D1D1F] text-xs font-medium rounded-full border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Faculty</span>
            </button>
          </div>
        </div>

        {/* Minimal Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Faculty Cabins</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{faculty.length}</div>
            <div className="text-[11px] text-[#0071E3] mt-0.5">
              {faculty.filter((f) => f.status === 'available').length} available
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Campus Locations</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{locations.length}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Live markers</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Events</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{events.length}</div>
            <div className="text-[11px] text-[#0071E3] mt-0.5">Live on map</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Publishers</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{publishers.length}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              {publishers.filter((p) => p.verified).length} verified
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Announcements</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{announcements.length}</div>
            <div className="text-[11px] mt-0.5">
              {announcements.filter((a) => a.status === 'pending').length > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {announcements.filter((a) => a.status === 'pending').length} to verify
                </span>
              ) : (
                <span className="text-emerald-600">All verified</span>
              )}
            </div>
          </div>
        </div>

        {/* Events Moderation Section with Real-Time Add/Edit */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Events Management ({events.length})
              </h2>
            </div>
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              className="px-3 py-1 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          <div className="divide-y divide-black/[0.04] text-xs">
            {events.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#86868B]">
                No campus events currently scheduled. Click Add Event to create one.
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1D1D1F] text-xs">{ev.title}</span>
                      <span className="text-[10px] text-[#86868B] px-1.5 py-0.5 bg-black/[0.04] rounded-md">
                        {ev.category}
                      </span>
                      {ev.venueDetail && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium">
                          {ev.venueDetail}
                        </span>
                      )}
                    </div>
                    <div className="text-[#86868B] text-[11px]">
                      {ev.locationName} · {ev.date} · {ev.startTime || '10:00 AM'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setEditingEvent(ev);
                        setIsEventModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit Event"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <Link
                      to={`/events/${ev.id}`}
                      className="px-2.5 py-1 text-xs bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.title)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                      title="Remove Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Campus Locations & Buildings Management Section */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Campus Buildings & Markers ({locations.length})
              </h2>
            </div>
            <button
              onClick={() => {
                setEditingLocation(null);
                setIsLocationModalOpen(true);
              }}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>
          </div>

          <div className="divide-y divide-black/[0.04] text-xs max-h-72 overflow-y-auto pr-1">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1D1D1F]">{loc.name}</span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md font-medium">
                      {loc.category}
                    </span>
                    {loc.floor && (
                      <span className="text-[10px] text-[#86868B]">{loc.floor}</span>
                    )}
                  </div>
                  <div className="text-[#86868B] text-[11px]">
                    Lat: {loc.latitude.toFixed(5)}, Lng: {loc.longitude.toFixed(5)} {loc.zone ? `· ${loc.zone}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setEditingLocation(loc);
                      setIsLocationModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                    title="Edit Location"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                    title="Remove Location"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Cabins Management Section */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Faculty & Cabin Allocations
              </h2>
              <span className="text-[11px] text-[#86868B] px-2 py-0.5 rounded-full bg-black/[0.04]">
                {faculty.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFaculty}
                title="Reset defaults"
                className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-full hover:bg-black/[0.04] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleOpenAddFaculty()}
                className="px-3 py-1 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cabin</span>
              </button>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                placeholder="Search faculty name, cabin (e.g. AB1-204), school..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'SCSE', 'SEEE', 'SMEC', 'SASL'].map((sch) => (
                <button
                  key={sch}
                  onClick={() => setSelectedSchoolFilter(sch)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSchoolFilter === sch
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-black/[0.04] text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {sch.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Faculty Table */}
          <div className="divide-y divide-black/[0.04] max-h-96 overflow-y-auto pr-1 text-xs">
            {filteredFaculty.map((fac) => (
              <div
                key={fac.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                    {fac.name.replace('Dr. ', '').charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1D1D1F]">{fac.name}</span>
                      <span className="text-[10px] text-blue-600 font-mono px-1.5 py-0.2 rounded bg-blue-50 border border-blue-100">
                        {fac.cabinNumber}
                      </span>
                      <span className="text-[10px] text-[#86868B]">{fac.school}</span>
                    </div>
                    <div className="text-[#86868B] text-[11px] mt-0.5">
                      {fac.designation} · {fac.buildingName}, {fac.floor}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <select
                    value={fac.status || 'available'}
                    onChange={(e) =>
                      handleStatusChange(fac.id, e.target.value as FacultyStatus, fac.name)
                    }
                    className={`text-[11px] font-medium px-2 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
                      fac.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : fac.status === 'in_lecture'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : fac.status === 'meeting'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <option value="available">Available</option>
                    <option value="in_lecture">In Lecture</option>
                    <option value="meeting">Meeting</option>
                    <option value="busy">Busy / Away</option>
                  </select>

                  <button
                    onClick={() => handleOpenEditFaculty(fac)}
                    className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors cursor-pointer"
                    title="Edit Cabin"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteFaculty(fac)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                    title="Delete Cabin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Announcements Verification Queue Section */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Student Announcements Verification Queue
              </h2>
              {announcements.filter((a) => a.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {announcements.filter((a) => a.status === 'pending').length} Pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-black/[0.04] p-1 rounded-xl text-[11px] font-medium">
                <button
                  onClick={() => setAnnouncementFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    announcementFilter === 'pending'
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Pending Review ({announcements.filter((a) => a.status === 'pending').length})
                </button>
                <button
                  onClick={() => setAnnouncementFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    announcementFilter === 'all'
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  All ({announcements.length})
                </button>
              </div>

              <Link
                to="/announcements"
                className="px-3 py-1 bg-black/[0.04] hover:bg-black/[0.07] text-[#1D1D1F] rounded-full text-xs font-medium transition-colors"
              >
                Open Board →
              </Link>
            </div>
          </div>

          <div className="divide-y divide-black/[0.04] text-xs max-h-96 overflow-y-auto pr-1">
            {announcements
              .filter((a) => (announcementFilter === 'pending' ? a.status === 'pending' : true))
              .map((ann) => {
                const isPending = ann.status === 'pending';
                const isApproved = ann.status === 'approved' || (ann.verified && ann.status !== 'rejected');
                const isRejected = ann.status === 'rejected';

                return (
                  <div
                    key={ann.id}
                    className={`py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isPending ? 'bg-amber-50/20 px-2 rounded-xl my-1' : ''
                    }`}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1D1D1F] text-xs">{ann.title}</span>
                        <span className="text-[10px] text-[#86868B] px-1.5 py-0.5 bg-black/[0.04] rounded">
                          {ann.category}
                        </span>

                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-2.5 h-2.5 animate-pulse text-amber-600" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-2.5 h-2.5 text-rose-600" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#86868B] line-clamp-2">{ann.description}</p>

                      <div className="text-[10px] text-[#86868B] flex items-center gap-2">
                        <span>Author: <strong>{ann.publisherName}</strong></span>
                        {ann.authorRegNumber && <span>({ann.authorRegNumber})</span>}
                        {ann.locationName && <span>· 📍 {ann.locationName}</span>}
                        <span>· {new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleVerifyAnnouncement(ann.id, ann.title)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Post</span>
                          </button>
                          <button
                            onClick={() => setRejectingAnnouncement(ann)}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleVerifyAnnouncement(ann.id, ann.title)}
                          className="px-2.5 py-1 text-xs bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full transition-colors cursor-pointer"
                        >
                          {isApproved ? 'Re-Verify' : 'Approve'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                        title="Remove Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {announcements.filter((a) => (announcementFilter === 'pending' ? a.status === 'pending' : true)).length === 0 && (
              <div className="py-8 text-center text-xs text-[#86868B] space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <div className="font-semibold text-[#1D1D1F]">
                  {announcementFilter === 'pending'
                    ? 'No pending student announcements to verify!'
                    : 'No announcements recorded.'}
                </div>
                <div className="text-[11px]">
                  All student submissions have been reviewed and processed.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Publishers & Badges Section */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1D1D1F]">
              Publishers & Verified Badges ({publishers.length})
            </h2>
          </div>

          <div className="divide-y divide-black/[0.04] text-xs">
            {publishers.map((pub) => (
              <div key={pub.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#1D1D1F]">{pub.name}</span>
                    {pub.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <div className="text-[#86868B] text-[11px]">{pub.department}</div>
                </div>

                <button
                  onClick={() => handleToggleVerification(pub.id, pub.verified, pub.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    pub.verified
                      ? 'bg-black/[0.05] text-[#1D1D1F] hover:bg-black/[0.08]'
                      : 'bg-[#0071E3] text-white hover:bg-[#0077ED]'
                  }`}
                >
                  {pub.verified ? 'Revoke' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Multi-User Audit Trail */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Real-Time Multi-User Audit Trail
              </h2>
            </div>
            <span className="text-[10px] text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full font-mono">
              {auditLogs.length} events logged
            </span>
          </div>

          <div className="divide-y divide-black/[0.04] max-h-64 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-xs text-[#86868B] py-4 text-center">
                No recent administrative actions recorded.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1D1D1F] uppercase text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-[#1D1D1F] font-medium">
                        {log.resource_type || log.resourceType}: {log.resource_id || log.resourceId || 'System'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#86868B]">
                      by {log.user_email || log.userEmail || 'System'} ({log.user_role || log.userRole || 'ADMIN'})
                    </div>
                  </div>
                  <div className="text-[10px] text-[#86868B] font-mono">
                    {new Date(log.created_at || log.createdAt || Date.now()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Faculty Cabin Modal */}
      <AddFacultyModal
        isOpen={isFacultyModalOpen}
        onClose={() => {
          setIsFacultyModalOpen(false);
          setEditingFaculty(null);
        }}
        initialFaculty={editingFaculty}
      />

      {/* Add / Edit Event Modal */}
      <AddEditEventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        initialEvent={editingEvent}
        locations={locations}
      />

      {/* Add / Edit Location Modal */}
      <AddEditLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          setEditingLocation(null);
        }}
        initialLocation={editingLocation}
      />

      {/* Reject Announcement Modal */}
      <RejectAnnouncementModal
        isOpen={Boolean(rejectingAnnouncement)}
        onClose={() => setRejectingAnnouncement(null)}
        onConfirm={handleRejectAnnouncementConfirm}
        announcementTitle={rejectingAnnouncement?.title || ''}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
