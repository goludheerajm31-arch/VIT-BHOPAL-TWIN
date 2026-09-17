import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { api } from '../services/api';
import { CampusLocation, CampusEvent, Publisher, FacultyMember, FacultyStatus } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { AddFacultyModal } from '../components/faculty/AddFacultyModal';
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
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, role, quickSwitchUser } = useAuth();
  const { toast } = useToast();

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [facultySearch, setFacultySearch] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);

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
    api.getAuditLogs().then(setAuditLogs).catch(() => {});
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const handleToggleVerification = (pubId: string, currentStatus: boolean, name: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can verify publishers', 'error');
      return;
    }
    const updated = storage.togglePublisherVerification(pubId);
    if (updated) {
      toast(
        updated.verified ? `Verified ${name}` : `Unverified ${name}`,
        updated.verified ? 'success' : 'info'
      );
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can remove events', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Campus Event',
      message: `Are you sure you want to remove "${title}"? This event will be permanently deleted from the calendar.`,
      confirmLabel: 'Delete Event',
      isDestructive: true,
      onConfirm: () => {
        storage.deleteEvent(eventId);
        toast(`Removed event "${title}"`, 'info');
      },
    });
  };

  const handleOpenAddFaculty = (member?: FacultyMember) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can add or edit faculty members', 'error');
      return;
    }
    setEditingFaculty(member || null);
    setIsFacultyModalOpen(true);
  };

  const handleDeleteFaculty = (id: string, name: string, cabin: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can remove faculty members', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Faculty Cabin',
      message: `Are you sure you want to remove Cabin ${cabin} (${name})? This will delete this faculty member from campus search, directory, and wayfinding.`,
      confirmLabel: 'Delete Cabin',
      isDestructive: true,
      onConfirm: () => {
        storage.deleteFaculty(id);
        toast(`Removed Cabin ${cabin}`, 'info');
      },
    });
  };

  const handleStatusChange = (id: string, newStatus: FacultyStatus, name: string) => {
    if (role !== 'ADMIN') {
      toast('Only administrators can update faculty status', 'error');
      return;
    }
    storage.updateFacultyStatus(id, newStatus);
    toast(`Updated status for ${name}`, 'success');
  };

  const handleResetFaculty = () => {
    if (role !== 'ADMIN') {
      toast('Only administrators can reset faculty directory', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Reset Faculty Directory',
      message: 'Are you sure you want to reset the faculty directory to the verified campus default cabins? Custom added cabins will be restored to original seed records.',
      confirmLabel: 'Reset Directory',
      isDestructive: true,
      onConfirm: () => {
        storage.resetFaculty();
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                Admin Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black/[0.05] text-[#86868B]">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-1">
              Campus directory allocation and verification governance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/faculty"
              className="px-3.5 py-1.5 bg-white hover:bg-black/[0.04] text-[#1D1D1F] text-xs font-medium rounded-full border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors"
            >
              View Directory
            </Link>
            <button
              onClick={() => handleOpenAddFaculty()}
              className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Faculty</span>
            </button>
          </div>
        </div>

        {/* Minimal Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="text-[11px] text-emerald-600 mt-0.5">Active nodes</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Events</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{events.length}</div>
            <div className="text-[11px] text-[#86868B] mt-0.5">Live on map</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#86868B]">Publishers</div>
            <div className="text-xl font-semibold text-[#1D1D1F] mt-1">{publishers.length}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              {publishers.filter((p) => p.verified).length} verified
            </div>
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

          {/* Search & School Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-black/[0.04]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                placeholder="Search name or cabin..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F7] border border-black/[0.04] rounded-xl text-xs text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:bg-white focus:border-[#0071E3] transition-colors"
              />
            </div>

            <div className="bg-black/[0.04] p-0.5 rounded-full inline-flex items-center gap-0.5 overflow-x-auto">
              {['all', 'SCSE', 'SEEE', 'SMEC', 'SASL', 'VSB', 'CIR'].map((sch) => (
                <button
                  key={sch}
                  onClick={() => setSelectedSchoolFilter(sch)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedSchoolFilter === sch
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {sch.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Faculty List Items */}
          <div className="divide-y divide-black/[0.04] text-xs">
            {filteredFaculty.length > 0 ? (
              filteredFaculty.map((member) => (
                <div
                  key={member.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-black/[0.02] rounded-xl px-2 transition-colors"
                >
                  {/* Cabin + Photo + Name */}
                  <div className="flex items-center gap-3 min-w-[260px]">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-10 h-10 rounded-xl object-cover border border-black/[0.08] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-black/[0.05] text-[#1D1D1F] flex items-center justify-center font-bold text-xs shrink-0 border border-black/[0.04]">
                        {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                    )}

                    <div className="px-2.5 py-1 bg-black/[0.06] text-[#1D1D1F] rounded-lg font-mono font-medium text-xs tracking-wider shrink-0">
                      {member.cabinNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1D1D1F] text-xs">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-[#86868B] bg-black/[0.04] px-1.5 py-0.5 rounded-md">
                          {member.school}
                        </span>
                      </div>
                      <div className="text-[#86868B] text-[11px]">
                        {member.designation}
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="text-[#86868B] text-xs min-w-[160px]">
                    <div className="text-[#1D1D1F] font-medium">
                      {member.buildingName}
                    </div>
                    <div className="text-[11px]">
                      {member.floor} {member.wing ? `• ${member.wing}` : ''}
                    </div>
                  </div>

                  {/* Status Dropdown & Actions */}
                  <div className="flex items-center gap-2">
                    <select
                      value={member.status}
                      onChange={(e) =>
                        handleStatusChange(member.id, e.target.value as FacultyStatus, member.name)
                      }
                      className="px-2 py-1 bg-white border border-black/[0.08] rounded-full text-xs text-[#1D1D1F] outline-none cursor-pointer"
                    >
                      <option value="available">Available</option>
                      <option value="in_lecture">In Lecture</option>
                      <option value="meeting">In Meeting</option>
                      <option value="busy">Out of Office</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddFaculty(member)}
                        className="p-1.5 text-[#0071E3] hover:bg-black/[0.04] rounded-full transition-colors cursor-pointer"
                        title="Edit cabin"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        to={`/navigation?to=${member.buildingId}&cabin=${member.cabinNumber}`}
                        className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors"
                        title="Route"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() =>
                          handleDeleteFaculty(member.id, member.name, member.cabinNumber)
                        }
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[#86868B] space-y-2">
                <p>No faculty cabins match your search.</p>
                <button
                  onClick={() => handleOpenAddFaculty()}
                  className="px-3 py-1 bg-[#0071E3] text-white rounded-full text-xs font-medium hover:bg-[#0077ED] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Faculty</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Publishers Review */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1D1D1F]">
              Publishers & Verified Badges
            </h2>
            <Link
              to="/admin/verification"
              className="text-xs font-medium text-[#0071E3] hover:underline"
            >
              All Publishers
            </Link>
          </div>

          <div className="divide-y divide-black/[0.04]">
            {publishers.map((pub) => (
              <div
                key={pub.id}
                className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
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

        {/* Events Moderation */}
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#1D1D1F]">
            Events Moderation ({events.length})
          </h2>

          <div className="divide-y divide-black/[0.04] text-xs">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#1D1D1F]">{ev.title}</span>
                    <span className="text-[10px] text-[#86868B] px-1.5 py-0.5 bg-black/[0.04] rounded-md">
                      {ev.category}
                    </span>
                  </div>
                  <div className="text-[#86868B] text-[11px]">
                    {ev.locationName} · {ev.date}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/events/${ev.id}`}
                    className="px-2.5 py-1 text-xs bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] rounded-full transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.title)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                        {log.resourceType}: {log.resourceId || 'System'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#86868B]">
                      by {log.userEmail || 'System'} ({log.userRole || 'GUEST'})
                    </div>
                  </div>
                  <div className="text-[10px] text-[#86868B] font-mono">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
