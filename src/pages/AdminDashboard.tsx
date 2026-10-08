import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useDemoRole } from '../services/demoRoleSwitcher';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { realtimeClient, RealtimeStatus } from '../services/realtime';
import { CampusLocation, CampusEvent, Publisher, FacultyMember, FacultyStatus, Announcement, CampusGuide, GuideCategory, GuideStatus, FacultyApplication, FacultyApplicationStatus, PublisherApplication, PublisherApplicationStatus, PublisherRoleStatus } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { AddFacultyModal } from '../components/faculty/AddFacultyModal';
import { AddEditEventModal } from '../components/admin/AddEditEventModal';
import { AddEditLocationModal } from '../components/admin/AddEditLocationModal';
import { AddEditGuideModal } from '../components/admin/AddEditGuideModal';
import { FacultyApplicationDetailModal } from '../components/admin/FacultyApplicationDetailModal';
import { PublisherApplicationDetailModal } from '../components/admin/PublisherApplicationDetailModal';
import { AddPublisherModal } from '../components/admin/AddPublisherModal';
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
  Mail,
  UserCheck,
  UserX,
  BookOpen,
  Archive,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  UserPlus,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const { activeRole, isSimulated } = useDemoRole();
  const { toast } = useToast();

  const effectiveAdmin = role === 'ADMIN' || activeRole === 'ADMIN' || user?.isMasterAdmin || user?.roles?.includes('ADMIN');

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
  const [facultyStatusFilter, setFacultyStatusFilter] = useState<'all' | 'PROVISIONED' | 'ACTIVE' | 'DISABLED'>('all');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

  // Events state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);

  // Locations state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampusLocation | null>(null);

  // Campus Guides CMS state
  const [guides, setGuides] = useState<CampusGuide[]>([]);
  const [guideSearch, setGuideSearch] = useState('');
  const [guideStatusFilter, setGuideStatusFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('all');
  const [guideCategoryFilter, setGuideCategoryFilter] = useState<GuideCategory | 'all'>('all');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<CampusGuide | null>(null);

  // Faculty Applications state
  const [facultyApplications, setFacultyApplications] = useState<FacultyApplication[]>([]);
  const [facultyAppFilter, setFacultyAppFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [facultyAppSearch, setFacultyAppSearch] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<FacultyApplication | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  // Publisher Applications state
  const [publisherApplications, setPublisherApplications] = useState<PublisherApplication[]>([]);
  const [publisherAppFilter, setPublisherAppFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [publisherAppSearch, setPublisherAppSearch] = useState('');
  const [selectedPublisherApp, setSelectedPublisherApp] = useState<PublisherApplication | null>(null);
  const [isPublisherAppModalOpen, setIsPublisherAppModalOpen] = useState(false);

  // Publisher Management state
  const [isAddPublisherModalOpen, setIsAddPublisherModalOpen] = useState(false);
  const [publisherSearch, setPublisherSearch] = useState('');
  const [publisherStatusFilter, setPublisherStatusFilter] = useState<'all' | 'ACTIVE' | 'PROVISIONED' | 'DISABLED'>('all');

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
    setEvents(storage.getAllEvents());
    setLocations(storage.getLocations());
    setFaculty(storage.getFaculty());
    setAnnouncements(storage.getAnnouncements());
    setAuditLogs(storage.getAuditLogs());
    setGuides(storage.getCampusGuides('all'));
    setFacultyApplications(storage.getFacultyApplications());
    setPublisherApplications(storage.getPublisherApplications());
  };

  const handleOpenApplicationDetail = (app: FacultyApplication) => {
    setSelectedApplication(app);
    setIsApplicationModalOpen(true);
  };

  const handleOpenPublisherAppDetail = (app: PublisherApplication) => {
    setSelectedPublisherApp(app);
    setIsPublisherAppModalOpen(true);
  };

  const handleApprovePublisherApp = async (app: PublisherApplication) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can approve publisher applications', 'error');
      return;
    }
    try {
      await storage.reviewPublisherApplication(app.id, 'APPROVED', user?.id);
      toast(`Approved publisher access for ${app.name}! Authorization is active.`, 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to approve application', 'error');
    }
  };

  const handleTogglePublisherStatus = async (pub: Publisher) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can modify publisher status', 'error');
      return;
    }
    try {
      const updated = await storage.togglePublisherStatus(pub.id, user?.id);
      toast(`Publisher "${pub.name || pub.organizationName}" is now ${updated?.status}.`, 'info');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to update publisher status', 'error');
    }
  };

  const handleRevokePublisher = (pub: Publisher) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Publisher Authorization',
      message: `Are you sure you want to revoke publisher permissions from "${pub.name || pub.organizationName}" (${pub.contactEmail})? They will no longer be able to create campus events. Their student identity will remain intact.`,
      confirmLabel: 'Revoke Authorization',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await storage.revokePublisherAccess(pub.id, user?.id);
          toast(`Revoked publisher permissions from "${pub.name || pub.organizationName}".`, 'info');
          loadData();
        } catch (err: any) {
          toast(err.message || 'Failed to revoke publisher', 'error');
        }
      },
    });
  };

  const handleApproveApplication = async (app: FacultyApplication) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can approve faculty applications', 'error');
      return;
    }
    try {
      await storage.reviewFacultyApplication(app.id, 'APPROVED', user?.id);
      toast(`Approved Dr. ${app.name}! Faculty record is now ACTIVE with no duplicates.`, 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to approve application', 'error');
    }
  };

  const handleOpenAddGuide = () => {
    setEditingGuide(null);
    setIsGuideModalOpen(true);
  };

  const handleEditGuide = (guide: CampusGuide) => {
    setEditingGuide(guide);
    setIsGuideModalOpen(true);
  };

  const handleToggleGuidePublish = async (guide: CampusGuide) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can publish or unpublish campus guides.', 'error');
      return;
    }
    const newStatus: GuideStatus = guide.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await storage.updateCampusGuideStatus(guide.id, newStatus, user?.id);
      toast(
        newStatus === 'PUBLISHED'
          ? `Published "${guide.title}" live to students!`
          : `Unpublished "${guide.title}" (saved as draft).`,
        'success'
      );
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to update guide status.', 'error');
    }
  };

  const handleArchiveGuide = async (guide: CampusGuide) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can archive campus guides.', 'error');
      return;
    }
    try {
      await storage.updateCampusGuideStatus(guide.id, 'ARCHIVED', user?.id);
      toast(`Archived guide "${guide.title}".`, 'info');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to archive guide.', 'error');
    }
  };

  const handleDeleteGuide = (guide: CampusGuide) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can delete campus guides.', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Campus Guide',
      message: `Are you sure you want to permanently delete "${guide.title}"? Any linked attachments will also be removed.`,
      confirmLabel: 'Delete Guide',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await storage.deleteCampusGuide(guide.id);
          toast(`Deleted guide "${guide.title}".`, 'info');
          loadData();
        } catch (err: any) {
          toast(err.message || 'Failed to delete guide.', 'error');
        }
      },
    });
  };

  const formatGuideDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
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
      await storage.updateFacultyCabinStatus(id, newStatus);
      toast(`Updated cabin status for ${name}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleToggleFacultyAccountStatus = async (fac: FacultyMember) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can manage faculty account status', 'error');
      return;
    }
    const nextStatus = fac.status === 'DISABLED'
      ? (fac.auth_user_id ? 'ACTIVE' : 'PROVISIONED')
      : 'DISABLED';

    try {
      await storage.updateFacultyAccountStatus(fac.id, nextStatus);
      toast(
        nextStatus === 'DISABLED'
          ? `Disabled faculty profile for ${fac.name}. Login access revoked.`
          : `Re-enabled faculty profile for ${fac.name} (Status: ${nextStatus}).`,
        nextStatus === 'DISABLED' ? 'info' : 'success'
      );
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to update faculty account status', 'error');
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
    const q = facultySearch.toLowerCase();
    const matchesSearch =
      facultySearch === '' ||
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      f.cabinNumber.toLowerCase().includes(q) ||
      f.school.toLowerCase().includes(q) ||
      (f.departmentName || f.department || '').toLowerCase().includes(q) ||
      f.designation.toLowerCase().includes(q) ||
      f.floor.toLowerCase().includes(q);

    const matchesSchool =
      selectedSchoolFilter === 'all' || f.school.toLowerCase() === selectedSchoolFilter.toLowerCase();
    const matchesStatus =
      facultyStatusFilter === 'all' || f.status === facultyStatusFilter;

    return matchesSearch && matchesSchool && matchesStatus;
  });

  if (!effectiveAdmin) {
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
              Faculty management, applications, and campus publishing CMS are restricted exclusively to university administrators. You are currently viewing as <span className="font-semibold text-[#1D1D1F] uppercase">{role}</span>.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition-colors text-center"
              >
                Sign In with Admin Account
              </Link>
              <Link
                to="/explore"
                className="w-full py-2.5 bg-black/[0.04] hover:bg-black/[0.07] text-[#1D1D1F] text-xs font-medium rounded-full transition-colors text-center"
              >
                Return to Campus Explorer
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
        {/* Simulation Notice Banner if viewing via professor demonstration */}
        {isSimulated && role !== 'ADMIN' && !user?.isMasterAdmin && (
          <div className="p-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-blue-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Demonstration Mode:</strong> Admin Console is active in simulation view. Live database mutations remain protected by PostgreSQL RLS.
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 rounded-md text-blue-800 shrink-0">
              Simulated Admin
            </span>
          </div>
        )}
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenAddGuide()}
              className="px-3.5 py-1.5 bg-[#1D1D1F] hover:bg-black text-white text-xs font-medium rounded-full shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guide</span>
            </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Faculty Apps</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{facultyApplications.length}</div>
            <div className="text-[11px] mt-0.5">
              {facultyApplications.filter((a) => a.status === 'PENDING').length > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {facultyApplications.filter((a) => a.status === 'PENDING').length} pending
                </span>
              ) : (
                <span className="text-emerald-600">All reviewed</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Campus Guides</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{guides.length}</div>
            <div className="text-[11px] text-[#0071E3] mt-0.5">
              {guides.filter((g) => g.status === 'PUBLISHED').length} published
            </div>
          </div>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Faculty & Cabin Allocations
              </h2>
              <span className="text-[11px] text-[#86868B] px-2 py-0.5 rounded-full bg-black/[0.04]">
                {faculty.length} Total
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {faculty.filter((f) => f.status === 'ACTIVE').length} Active
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {faculty.filter((f) => f.status === 'PROVISIONED').length} Provisioned
              </span>
              {faculty.filter((f) => f.status === 'DISABLED').length > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {faculty.filter((f) => f.status === 'DISABLED').length} Disabled
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
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
                <span>Add Faculty</span>
              </button>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty name, email (@vitbhopal.ac.in), cabin (e.g. AB1-204), department..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] transition-colors"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'ACTIVE', 'PROVISIONED', 'DISABLED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFacultyStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      facultyStatusFilter === st
                        ? 'bg-[#1D1D1F] text-white'
                        : 'bg-black/[0.04] text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {st === 'all' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* School Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-[#86868B] shrink-0">School:</span>
              {['all', 'SCSE', 'SEEE', 'SMEC', 'SASL', 'VSB', 'CIR'].map((sch) => (
                <button
                  key={sch}
                  onClick={() => setSelectedSchoolFilter(sch)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSchoolFilter === sch
                      ? 'bg-[#0071E3] text-white'
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
            {filteredFaculty.map((fac) => {
              const isProvisioned = fac.status === 'PROVISIONED';
              const isActive = fac.status === 'ACTIVE';
              const isDisabled = fac.status === 'DISABLED';

              return (
                <div
                  key={fac.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-black/[0.01] transition-colors rounded-xl px-1.5"
                >
                  {/* Left: Name, Email, Department, Designation */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
                      {fac.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').charAt(0) || 'F'}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#1D1D1F] text-xs truncate">{fac.name}</span>
                        <span className="text-[10px] text-blue-600 font-mono px-1.5 py-0.2 rounded bg-blue-50 border border-blue-100 shrink-0">
                          {fac.cabinNumber}
                        </span>
                        <span className="text-[10px] text-[#86868B] shrink-0">{fac.school}</span>
                      </div>

                      {/* Institutional Email */}
                      <div className="flex items-center gap-1.5 text-[#86868B] text-[11px] font-mono">
                        <Mail className="w-3 h-3 text-[#86868B] shrink-0" />
                        <span className="truncate">{fac.email}</span>
                      </div>

                      {/* Department & Designation */}
                      <div className="text-[#86868B] text-[11px] truncate">
                        <span className="font-medium text-[#1D1D1F]">{fac.designation}</span> · {fac.departmentName || fac.department} · {fac.buildingName}, {fac.floor}
                      </div>
                    </div>
                  </div>

                  {/* Right: Account Status Badge, Live Cabin Selector & Admin Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
                    {/* Account Status Badge */}
                    {isProvisioned && (
                      <span
                        title="Pre-registered by administrator. Awaiting faculty Google sign-in from institutional email to claim."
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 cursor-help"
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        PROVISIONED
                      </span>
                    )}

                    {isActive && (
                      <span
                        title="Active and verified. Faculty record claimed and linked to authenticated Google institutional account."
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 cursor-help"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ACTIVE
                      </span>
                    )}

                    {isDisabled && (
                      <span
                        title="Disabled by administrator. Faculty member access revoked."
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 cursor-help"
                      >
                        <XCircle className="w-3 h-3 text-rose-600" />
                        DISABLED
                      </span>
                    )}

                    {/* Live Cabin Availability Selector (Campus Digital Twin) */}
                    <div className="flex items-center gap-1" title="Campus Map Cabin Availability">
                      <select
                        value={fac.liveStatus || fac.cabinStatus || 'available'}
                        onChange={(e) =>
                          handleStatusChange(fac.id, e.target.value as FacultyStatus, fac.name)
                        }
                        className={`text-[11px] font-medium px-2 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
                          (fac.liveStatus || fac.cabinStatus) === 'available'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (fac.liveStatus || fac.cabinStatus) === 'in_lecture'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : (fac.liveStatus || fac.cabinStatus) === 'meeting'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <option value="available">Available</option>
                        <option value="in_lecture">In Lecture</option>
                        <option value="meeting">Meeting</option>
                        <option value="busy">Busy / Away</option>
                      </select>
                    </div>

                    {/* Admin Account Controls: Disable / Re-enable */}
                    <button
                      onClick={() => handleToggleFacultyAccountStatus(fac)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isDisabled
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-amber-600 hover:bg-amber-50'
                      }`}
                      title={isDisabled ? 'Re-enable Faculty Account' : 'Disable Faculty Account'}
                    >
                      {isDisabled ? (
                        <UserCheck className="w-3.5 h-3.5" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit Cabin & Profile */}
                    <button
                      onClick={() => handleOpenEditFaculty(fac)}
                      className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Record */}
                    <button
                      onClick={() => handleDeleteFaculty(fac)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredFaculty.length === 0 && (
              <div className="py-8 text-center text-[#86868B] space-y-1">
                <p>No faculty matching the current filters.</p>
                <button
                  onClick={() => {
                    setFacultySearch('');
                    setSelectedSchoolFilter('all');
                    setFacultyStatusFilter('all');
                  }}
                  className="text-xs text-[#0071E3] hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* Faculty Access Applications Queue (CMS & Governance)                */}
        {/* ================================================================== */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Faculty Applications
              </h2>
              <span className="text-[11px] text-[#86868B] px-2 py-0.5 rounded-full bg-black/[0.04]">
                {facultyApplications.length} Total
              </span>
              {facultyApplications.filter((a) => a.status === 'PENDING').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {facultyApplications.filter((a) => a.status === 'PENDING').length} Pending Review
                </span>
              )}
              {facultyApplications.filter((a) => a.status === 'APPROVED').length > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {facultyApplications.filter((a) => a.status === 'APPROVED').length} Approved
                </span>
              )}
            </div>

            {/* Quick Status Segmented Switcher */}
            <div className="flex items-center bg-black/[0.04] p-1 rounded-xl text-[11px] font-medium self-end sm:self-auto">
              {(
                [
                  { id: 'PENDING', label: 'Pending' },
                  { id: 'all', label: 'All' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'REJECTED', label: 'Rejected' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFacultyAppFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    facultyAppFilter === tab.id
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'PENDING' && facultyApplications.filter((a) => a.status === 'PENDING').length > 0 && (
                    <span className="ml-1 px-1 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[9px] font-bold">
                      {facultyApplications.filter((a) => a.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={facultyAppSearch}
              onChange={(e) => setFacultyAppSearch(e.target.value)}
              placeholder="Search applicant name, email (@vitbhopal.ac.in), department, designation, employee ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white"
            />
          </div>

          {/* Applications Cards Grid */}
          <div className="space-y-2.5">
            {facultyApplications
              .filter((app) => {
                const q = facultyAppSearch.toLowerCase();
                const matchesSearch =
                  facultyAppSearch === '' ||
                  app.name.toLowerCase().includes(q) ||
                  app.email.toLowerCase().includes(q) ||
                  app.department.toLowerCase().includes(q) ||
                  app.designation.toLowerCase().includes(q) ||
                  Boolean(app.employeeId && app.employeeId.toLowerCase().includes(q)) ||
                  Boolean(app.employee_id && app.employee_id.toLowerCase().includes(q));

                const matchesStatus = facultyAppFilter === 'all' || app.status === facultyAppFilter;
                return matchesSearch && matchesStatus;
              })
              .map((app) => {
                const isPending = app.status === 'PENDING';
                const isApproved = app.status === 'APPROVED';
                const isRejected = app.status === 'REJECTED';

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isPending
                        ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                        : isApproved
                        ? 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'border-black/[0.06] bg-[#F5F5F7]/60 hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#1D1D1F]">
                          {app.name}
                        </span>

                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            PENDING
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            APPROVED
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300 flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" />
                            REJECTED
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-[#86868B] bg-white px-2 py-0.5 rounded-md border border-black/[0.06]">
                          {app.email}
                        </span>
                      </div>

                      <div className="text-xs text-[#1D1D1F] flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#0071E3]">{app.department}</span>
                        <span className="text-[#86868B]">·</span>
                        <span className="text-[#86868B]">{app.designation}</span>
                        {(app.employeeId || app.employee_id) && (
                          <>
                            <span className="text-[#86868B]">·</span>
                            <span className="font-mono text-[11px] text-[#86868B]">
                              ID: {app.employeeId || app.employee_id}
                            </span>
                          </>
                        )}
                      </div>

                      {app.additionalInformation && (
                        <p className="text-[11px] text-[#86868B] line-clamp-1 italic">
                          "{app.additionalInformation}"
                        </p>
                      )}

                      <div className="text-[10px] text-[#86868B] flex items-center gap-3 pt-0.5">
                        <span>
                          Submitted:{' '}
                          {new Date(app.createdAt || app.created_at || Date.now()).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {app.supportingDocumentUrl && (
                          <span className="text-[#0071E3] flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Has Document Attachment
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: [ View ] [ Approve ] [ Reject ] */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleOpenApplicationDetail(app)}
                        className="px-3 py-1.5 bg-white hover:bg-black/[0.04] text-[#1D1D1F] border border-black/[0.08] rounded-xl text-xs font-medium shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>View</span>
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApproveApplication(app)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => handleOpenApplicationDetail(app)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {facultyApplications.length === 0 && (
              <div className="py-8 text-center text-[#86868B] space-y-1">
                <GraduationCap className="w-8 h-8 text-[#86868B]/40 mx-auto mb-2" />
                <p className="text-xs">No faculty access applications in the queue.</p>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* Publisher Access Applications (Student Publisher Requests)     */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Publisher Applications
              </h2>
              <span className="text-[11px] text-[#86868B] px-2 py-0.5 rounded-full bg-black/[0.04]">
                {publisherApplications.length} Total
              </span>
              {publisherApplications.filter((a) => a.status === 'PENDING').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {publisherApplications.filter((a) => a.status === 'PENDING').length} Pending
                </span>
              )}
            </div>

            {/* Filter Tabs: All, Pending, Approved, Rejected */}
            <div className="flex items-center bg-black/[0.04] p-1 rounded-xl text-[11px] font-medium self-end sm:self-auto">
              {(
                [
                  { id: 'PENDING', label: 'Pending' },
                  { id: 'all', label: 'All' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'REJECTED', label: 'Rejected' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPublisherAppFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    publisherAppFilter === tab.id
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'PENDING' && publisherApplications.filter((a) => a.status === 'PENDING').length > 0 && (
                    <span className="ml-1 px-1 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[9px] font-bold">
                      {publisherApplications.filter((a) => a.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={publisherAppSearch}
              onChange={(e) => setPublisherAppSearch(e.target.value)}
              placeholder="Search applicant name, email (@vitbhopal.ac.in), organization, or reason..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white"
            />
          </div>

          {/* Applications List */}
          <div className="space-y-2.5">
            {publisherApplications
              .filter((app) => {
                const q = publisherAppSearch.toLowerCase();
                const matchesSearch =
                  publisherAppSearch === '' ||
                  app.name.toLowerCase().includes(q) ||
                  app.email.toLowerCase().includes(q) ||
                  (app.organization && app.organization.toLowerCase().includes(q)) ||
                  app.reason.toLowerCase().includes(q);
                const matchesStatus = publisherAppFilter === 'all' || app.status === publisherAppFilter;
                return matchesSearch && matchesStatus;
              })
              .map((app) => {
                const isPending = app.status === 'PENDING';
                const isApproved = app.status === 'APPROVED';
                const isRejected = app.status === 'REJECTED';

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isPending
                        ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                        : isApproved
                        ? 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'border-black/[0.06] bg-[#F5F5F7]/60 hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#1D1D1F]">
                          {app.name}
                        </span>

                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            PENDING
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            APPROVED
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300 flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" />
                            REJECTED
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-[#86868B] bg-white px-2 py-0.5 rounded-md border border-black/[0.06]">
                          {app.email}
                        </span>

                        {app.organization && (
                          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {app.organization}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        <strong>Reason:</strong> {app.reason}
                      </p>

                      <div className="text-[10px] text-[#86868B] flex items-center gap-2 font-mono">
                        <span>Submitted: {new Date(app.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {app.reviewedBy && (
                          <span>· Reviewed by {app.reviewedBy}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPublisherAppDetail(app)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-black/[0.08] hover:bg-black/[0.04] text-xs font-medium text-[#1D1D1F] transition-colors cursor-pointer"
                      >
                        View
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprovePublisherApp(app)}
                            className="px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenPublisherAppDetail(app)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {publisherApplications.length === 0 && (
              <div className="py-8 text-center text-[#86868B] space-y-1">
                <Sparkles className="w-8 h-8 text-[#86868B]/40 mx-auto mb-2" />
                <p className="text-xs">No publisher access applications in the queue.</p>
              </div>
            )}
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

        {/* ================================================================== */}
        {/* Campus Guide Management Section (CMS)                             */}
        {/* ================================================================== */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Campus Guide Management
              </h2>
              <span className="text-[11px] text-[#86868B] px-2 py-0.5 rounded-full bg-black/[0.04]">
                {guides.length} Total
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {guides.filter((g) => g.status === 'PUBLISHED').length} Published
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {guides.filter((g) => g.status === 'DRAFT').length} Draft
              </span>
              {guides.filter((g) => g.status === 'ARCHIVED').length > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {guides.filter((g) => g.status === 'ARCHIVED').length} Archived
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddGuide}
                className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Guide</span>
              </button>
              <Link
                to="/hub"
                className="px-3 py-1 bg-black/[0.04] hover:bg-black/[0.07] text-[#1D1D1F] rounded-full text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>View Campus Hub</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={guideSearch}
                onChange={(e) => setGuideSearch(e.target.value)}
                placeholder="Search guides..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-full text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] transition-all"
              />
              {guideSearch && (
                <button
                  onClick={() => setGuideSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter Segment */}
              <div className="flex items-center bg-black/[0.04] p-0.5 rounded-full text-xs">
                <span className="text-[11px] text-[#86868B] px-2.5 font-medium hidden md:inline">
                  Filter:
                </span>
                {(['all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((filterVal) => {
                  const label =
                    filterVal === 'all'
                      ? 'All'
                      : filterVal === 'PUBLISHED'
                      ? 'Published'
                      : filterVal === 'DRAFT'
                      ? 'Draft'
                      : 'Archived';
                  const isSelected = guideStatusFilter === filterVal;
                  return (
                    <button
                      key={filterVal}
                      onClick={() => setGuideStatusFilter(filterVal)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Category Filter Dropdown */}
              <select
                value={guideCategoryFilter}
                onChange={(e) => setGuideCategoryFilter(e.target.value as GuideCategory | 'all')}
                className="px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="ACADEMICS">Academics</option>
                <option value="HOSTEL">Hostel</option>
                <option value="STUDENT_SERVICES">Student Services</option>
                <option value="ADMINISTRATION">Administration</option>
                <option value="FINANCE">Finance</option>
                <option value="COMPLAINTS">Complaints</option>
                <option value="PLACEMENTS">Placements</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>

          {/* Guide Management Items List */}
          <div className="divide-y divide-black/[0.06] text-xs">
            {guides
              .filter((g) => {
                const q = guideSearch.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  g.title.toLowerCase().includes(q) ||
                  g.category.toLowerCase().includes(q) ||
                  g.category.replace(/_/g, ' ').toLowerCase().includes(q) ||
                  g.shortDescription.toLowerCase().includes(q) ||
                  g.content.toLowerCase().includes(q) ||
                  g.steps.some((s) => s.toLowerCase().includes(q));

                const matchesStatus = guideStatusFilter === 'all' || g.status === guideStatusFilter;
                const matchesCategory = guideCategoryFilter === 'all' || g.category === guideCategoryFilter;

                return matchesSearch && matchesStatus && matchesCategory;
              })
              .length === 0 ? (
              <div className="py-8 text-center text-xs text-[#86868B] space-y-1">
                <BookOpen className="w-6 h-6 text-[#86868B]/60 mx-auto" />
                <div className="font-semibold text-[#1D1D1F]">No campus guides found</div>
                <div className="text-[11px]">
                  {guideSearch || guideStatusFilter !== 'all' || guideCategoryFilter !== 'all'
                    ? 'Try adjusting your search query or status filter.'
                    : 'Click "+ Add Guide" to author your first permanent procedure.'}
                </div>
              </div>
            ) : (
              guides
                .filter((g) => {
                  const q = guideSearch.trim().toLowerCase();
                  const matchesSearch =
                    !q ||
                    g.title.toLowerCase().includes(q) ||
                    g.category.toLowerCase().includes(q) ||
                    g.category.replace(/_/g, ' ').toLowerCase().includes(q) ||
                    g.shortDescription.toLowerCase().includes(q) ||
                    g.content.toLowerCase().includes(q) ||
                    g.steps.some((s) => s.toLowerCase().includes(q));

                  const matchesStatus = guideStatusFilter === 'all' || g.status === guideStatusFilter;
                  const matchesCategory = guideCategoryFilter === 'all' || g.category === guideCategoryFilter;

                  return matchesSearch && matchesStatus && matchesCategory;
                })
                .map((guide) => {
                  const pdfCount =
                    guide.attachments?.filter(
                      (a) => a.fileType.includes('pdf') || a.fileName.toLowerCase().endsWith('.pdf')
                    ).length || 0;
                  const imgCount =
                    guide.attachments?.filter(
                      (a) =>
                        a.fileType.startsWith('image/') ||
                        /\.(jpg|jpeg|png|webp)$/i.test(a.fileName)
                    ).length || 0;

                  return (
                    <div
                      key={guide.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group hover:bg-black/[0.01] px-2 rounded-2xl transition-colors"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1D1D1F] text-xs sm:text-sm">
                            {guide.title}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-black/[0.04] text-[#424245] rounded-full border border-black/[0.04]">
                            {guide.category.charAt(0) + guide.category.slice(1).toLowerCase().replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              guide.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : guide.status === 'DRAFT'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {guide.status === 'PUBLISHED'
                              ? 'Published'
                              : guide.status === 'DRAFT'
                              ? 'Draft'
                              : 'Archived'}
                          </span>
                        </div>

                        <div className="text-[#86868B] text-[11px] flex items-center gap-2 flex-wrap">
                          <span>Updated: {formatGuideDate(guide.updatedAt)}</span>
                          <span>·</span>
                          <span>
                            {guide.steps.length} {guide.steps.length === 1 ? 'step' : 'steps'}
                          </span>
                          {pdfCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5 text-rose-600">
                                <FileText className="w-3 h-3" /> {pdfCount} PDF
                              </span>
                            </>
                          )}
                          {imgCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5 text-blue-600">
                                <ImageIcon className="w-3 h-3" /> {imgCount} {imgCount === 1 ? 'photo' : 'photos'}
                              </span>
                            </>
                          )}
                          {guide.externalLinks && guide.externalLinks.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5 text-[#0071E3]">
                                <ExternalLink className="w-3 h-3" /> {guide.externalLinks.length}{' '}
                                {guide.externalLinks.length === 1 ? 'link' : 'links'}
                              </span>
                            </>
                          )}
                        </div>

                        {guide.shortDescription && (
                          <p className="text-xs text-[#86868B] line-clamp-1">
                            {guide.shortDescription}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleEditGuide(guide)}
                          className="px-3 py-1 text-xs bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit Guide"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {guide.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => handleArchiveGuide(guide)}
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                            title="Archive Guide"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Archive</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleGuidePublish(guide)}
                            className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Publish Guide to Students"
                          >
                            <Check className="w-3 h-3" />
                            <span>Publish</span>
                          </button>
                        )}

                        {guide.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleToggleGuidePublish(guide)}
                            className="px-2.5 py-1 text-xs text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors cursor-pointer"
                            title="Unpublish (Save as Draft)"
                          >
                            <span>Unpublish</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteGuide(guide)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title="Delete Guide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* Publisher Management (Direct Administrative Provisioning & RBAC) */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Publisher Management ({publishers.length})
              </h2>
              <span className="text-[11px] text-[#86868B] px-2 py-0.5 rounded-full bg-black/[0.04]">
                {publishers.filter((p) => p.status === 'ACTIVE' || (!p.status && p.verified)).length} Active
              </span>
              {publishers.filter((p) => p.status === 'PROVISIONED').length > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {publishers.filter((p) => p.status === 'PROVISIONED').length} Provisioned
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center bg-black/[0.04] p-1 rounded-xl text-[11px] font-medium">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'ACTIVE', label: 'Active' },
                    { id: 'PROVISIONED', label: 'Provisioned' },
                    { id: 'DISABLED', label: 'Disabled' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPublisherStatusFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      publisherStatusFilter === tab.id
                        ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* + Add Publisher Button */}
              <button
                onClick={() => setIsAddPublisherModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-[#0071E3] text-white text-xs font-medium hover:bg-[#0077ED] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Publisher</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={publisherSearch}
              onChange={(e) => setPublisherSearch(e.target.value)}
              placeholder="Search publishers by organization, lead name, contact email, or department..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white"
            />
          </div>

          {/* Publishers Table/List */}
          <div className="divide-y divide-black/[0.04] text-xs">
            {publishers
              .filter((pub) => {
                const q = publisherSearch.toLowerCase();
                const matchesSearch =
                  publisherSearch === '' ||
                  (pub.name && pub.name.toLowerCase().includes(q)) ||
                  pub.organizationName.toLowerCase().includes(q) ||
                  pub.contactEmail.toLowerCase().includes(q) ||
                  (pub.department && pub.department.toLowerCase().includes(q));

                const currentStatus = pub.status || (pub.verified ? 'ACTIVE' : 'DISABLED');
                const matchesStatus =
                  publisherStatusFilter === 'all' || currentStatus === publisherStatusFilter;

                return matchesSearch && matchesStatus;
              })
              .map((pub) => {
                const currentStatus = pub.status || (pub.verified ? 'ACTIVE' : 'DISABLED');
                const isActive = currentStatus === 'ACTIVE';
                const isProvisioned = currentStatus === 'PROVISIONED';
                const isDisabled = currentStatus === 'DISABLED';

                return (
                  <div key={pub.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#1D1D1F]">
                          {pub.name || pub.organizationName}
                        </span>
                        {pub.verified && <VerifiedBadge size="sm" />}

                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ACTIVE
                          </span>
                        )}
                        {isProvisioned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            PROVISIONED
                          </span>
                        )}
                        {isDisabled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            DISABLED
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded border border-black/[0.06]">
                          {pub.contactEmail}
                        </span>
                      </div>

                      <div className="text-[#86868B] text-[11px] flex items-center gap-3">
                        <span>{pub.department || pub.category}</span>
                        {pub.userId ? (
                          <span className="text-emerald-700 font-mono text-[10px]">● Linked to User</span>
                        ) : (
                          <span className="text-blue-700 font-mono text-[10px]">○ Awaiting Login Link</span>
                        )}
                        {pub.notes && (
                          <span className="truncate max-w-xs text-[10px] text-slate-500 italic">"{pub.notes}"</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Disable / Enable Toggle */}
                      <button
                        onClick={() => handleTogglePublisherStatus(pub)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          isDisabled
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-black/[0.05] text-[#1D1D1F] hover:bg-black/[0.08]'
                        }`}
                      >
                        {isDisabled ? 'Enable' : 'Disable'}
                      </button>

                      {/* Revoke Authorization Button */}
                      {!isDisabled && (
                        <button
                          onClick={() => handleRevokePublisher(pub)}
                          className="px-2.5 py-1 rounded-full text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          title="Revoke Publisher Authorization"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {publishers.length === 0 && (
              <div className="py-6 text-center text-xs text-[#86868B]">
                No campus publishers registered yet. Click "+ Add Publisher" to provision authorized publishers.
              </div>
            )}
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

      {/* Campus Guide Management Modal (CMS) */}
      <AddEditGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => {
          setIsGuideModalOpen(false);
          setEditingGuide(null);
        }}
        initialGuide={editingGuide}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Faculty Application Review Modal */}
      <FacultyApplicationDetailModal
        isOpen={isApplicationModalOpen}
        onClose={() => {
          setIsApplicationModalOpen(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        onReviewed={() => {
          loadData();
        }}
        adminUserId={user?.id}
      />

      {/* Publisher Application Review Modal */}
      <PublisherApplicationDetailModal
        isOpen={isPublisherAppModalOpen}
        onClose={() => {
          setIsPublisherAppModalOpen(false);
          setSelectedPublisherApp(null);
        }}
        application={selectedPublisherApp}
        onSuccess={() => {
          loadData();
        }}
        adminUserId={user?.id}
      />

      {/* Add Publisher Authorization Modal */}
      <AddPublisherModal
        isOpen={isAddPublisherModalOpen}
        onClose={() => setIsAddPublisherModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        adminUserId={user?.id}
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
