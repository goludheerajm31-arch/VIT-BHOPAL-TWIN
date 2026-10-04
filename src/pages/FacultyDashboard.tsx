import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { api } from '../services/api';
import { useToast } from '../components/layout/Toast';
import { FacultyMember, FacultyStatus, Announcement, CampusLocation } from '../types';
import { SEED_FACULTY } from '../services/data/seeds';
import { PostAnnouncementModal } from '../components/announcements/PostAnnouncementModal';
import {
  GraduationCap,
  Building2,
  MapPin,
  Navigation,
  Clock,
  Phone,
  Mail,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Plus,
  Trash2,
  ArrowUpRight,
  Compass,
  Sparkles,
  Send,
  Calendar,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Users,
  Eye,
  Radio,
} from 'lucide-react';

interface StudentAppointment {
  id: string;
  studentName: string;
  regNumber: string;
  department: string;
  topic: string;
  slotTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

const DEFAULT_APPOINTMENTS: StudentAppointment[] = [
  {
    id: 'apt-1',
    studentName: 'Aarav Patel',
    regNumber: '24BCE10482',
    department: 'B.Tech CSE - 3rd Year',
    topic: 'Distributed Paxos consensus & CAP theorem discussion for capstone project',
    slotTime: 'Today, 03:30 PM - 04:00 PM',
    status: 'pending',
    notes: 'Requested review of high-level architecture diagram',
  },
  {
    id: 'apt-2',
    studentName: 'Priya Singh',
    regNumber: '23BCE10190',
    department: 'B.Tech CSE - 4th Year',
    topic: 'Recommendation Letter review for MS in Computer Science applications',
    slotTime: 'Tomorrow, 11:15 AM - 11:45 AM',
    status: 'confirmed',
    notes: 'Draft statement of purpose attached to student email',
  },
  {
    id: 'apt-3',
    studentName: 'Rohan Sharma',
    regNumber: '24BCE10731',
    department: 'B.Tech AI & Data Science - 2nd Year',
    topic: 'Course syllabus doubt: Cloud Orchestration Kubernetes operator pattern',
    slotTime: 'Thursday, 02:30 PM - 03:00 PM',
    status: 'confirmed',
  },
];

const APPOINTMENTS_STORAGE_KEY = 'vit_faculty_appointments_v1';

export const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, loginAsFaculty, quickLoginAs } = useAuth();
  const { toast } = useToast();

  const [faculty, setFaculty] = useState<FacultyMember | null>(null);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [customStatusNote, setCustomStatusNote] = useState('Available in Cabin for consultation');

  // Appointments state
  const [appointments, setAppointments] = useState<StudentAppointment[]>(() => {
    try {
      const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn(e);
    }
    return DEFAULT_APPOINTMENTS;
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    consultationHours: '',
    phone: '',
    directionsGuide: '',
    researchArea: '',
    subjectsText: '',
  });

  // Load faculty & announcements
  const loadData = () => {
    const allFaculty = storage.getFaculty();
    setLocations(storage.getLocations());

    // Match logged-in user to faculty member
    let currentFac: FacultyMember | undefined;
    if (user?.facultyId) {
      currentFac = allFaculty.find((f) => f.id === user.facultyId);
    }
    if (!currentFac && user?.email) {
      currentFac = allFaculty.find(
        (f) =>
          f.email.toLowerCase() === user.email.toLowerCase() ||
          (user.email.includes('faculty') && f.id === 'fac-scse-01')
      );
    }
    if (!currentFac && user?.name) {
      currentFac = allFaculty.find((f) => f.name.toLowerCase() === user.name.toLowerCase());
    }

    // Fallback to first faculty if still not found
    if (!currentFac) {
      currentFac = allFaculty[0] || SEED_FACULTY[0];
    }

    setFaculty(currentFac);

    if (currentFac) {
      setEditForm({
        consultationHours: currentFac.consultationHours || '',
        phone: currentFac.phone || '',
        directionsGuide: currentFac.directionsGuide || '',
        researchArea: currentFac.researchArea || '',
        subjectsText: (currentFac.subjects || []).join(', '),
      });
    }

    // Load announcements posted by this faculty
    const allAnnouncements = storage.getAnnouncements();
    const myAnnouncements = allAnnouncements.filter((a) => {
      if (user?.id && (a.authorId === user.id || a.publisherId === user.id)) return true;
      if (currentFac && (a.publisherName.includes(currentFac.name) || a.publisherId === currentFac.id)) return true;
      return false;
    });
    setAnnouncements(myAnnouncements);
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [user]);

  // Persist appointments
  const updateAppointments = (newApts: StudentAppointment[]) => {
    setAppointments(newApts);
    try {
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(newApts));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleStatusChange = async (newStatus: FacultyStatus) => {
    if (!faculty) return;
    setIsUpdatingStatus(true);
    try {
      await storage.updateFacultyStatus(faculty.id, newStatus);
      await api.updateFacultyStatus(faculty.id, newStatus).catch(() => {});
      setFaculty((prev) => (prev ? { ...prev, status: newStatus } : null));

      const statusLabels: Record<FacultyStatus, string> = {
        available: 'Available in Cabin',
        in_lecture: 'In Lecture / Lab',
        meeting: 'In Faculty Meeting',
        busy: 'Busy / Do Not Disturb',
      };
      toast(`Status updated to "${statusLabels[newStatus]}". Live directory updated.`, 'success');
    } catch (err: any) {
      console.error(err);
      toast('Failed to update status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty) return;

    const subjectsArray = editForm.subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedFaculty: FacultyMember = {
      ...faculty,
      consultationHours: editForm.consultationHours.trim(),
      phone: editForm.phone.trim() || undefined,
      directionsGuide: editForm.directionsGuide.trim(),
      researchArea: editForm.researchArea.trim() || undefined,
      subjects: subjectsArray.length > 0 ? subjectsArray : faculty.subjects,
    };

    try {
      await storage.saveFaculty(updatedFaculty);
      await api.saveFaculty(updatedFaculty).catch(() => {});
      setFaculty(updatedFaculty);
      setIsEditModalOpen(false);
      toast('Cabin details and consultation hours saved successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      toast('Failed to save faculty details', 'error');
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      await storage.deleteAnnouncement(annId);
      await api.deleteAnnouncement(annId).catch(() => {});
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
      toast('Announcement deleted', 'info');
    } catch (err) {
      toast('Failed to delete announcement', 'error');
    }
  };

  const handleUpdateAppointmentStatus = (aptId: string, nextStatus: StudentAppointment['status']) => {
    const updated = appointments.map((a) => (a.id === aptId ? { ...a, status: nextStatus } : a));
    updateAppointments(updated);
    const messages: Record<string, string> = {
      confirmed: 'Appointment confirmed with student.',
      completed: 'Consultation marked as completed.',
      cancelled: 'Appointment cancelled.',
    };
    toast(messages[nextStatus] || 'Appointment updated', 'success');
  };

  const handleSwitchFaculty = async (f: FacultyMember) => {
    await loginAsFaculty(f.id);
    toast(`Switched profile to ${f.name} (Cabin ${f.cabinNumber})`, 'success');
    loadData();
  };

  const statusConfig: Record<FacultyStatus, { label: string; desc: string; bg: string; text: string; ring: string }> = {
    available: {
      label: 'Available in Cabin',
      desc: 'In cabin & open for student walk-ins',
      bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20',
      text: 'text-emerald-700',
      ring: 'ring-emerald-500',
    },
    in_lecture: {
      label: 'In Lecture / Lab',
      desc: 'Conducting class or lab session',
      bg: 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20',
      text: 'text-blue-700',
      ring: 'ring-blue-500',
    },
    meeting: {
      label: 'In Faculty Meeting',
      desc: 'Department / Council meeting',
      bg: 'bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20',
      text: 'text-amber-700',
      ring: 'ring-amber-500',
    },
    busy: {
      label: 'Busy / Do Not Disturb',
      desc: 'Research work or confidential grading',
      bg: 'bg-rose-500/10 text-rose-700 border-rose-200 hover:bg-rose-500/20',
      text: 'text-rose-700',
      ring: 'ring-rose-500',
    },
  };

  const currentStatus = faculty?.status || 'available';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Quick Faculty Switcher */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0071E3]">
                Faculty & Cabin Management Portal
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Verified Staff
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {faculty?.name || user?.name || 'Faculty Member'}
            </h1>
            <p className="text-xs text-slate-500">
              {faculty?.designation} · {faculty?.departmentName} · Cabin {faculty?.cabinNumber}
            </p>
          </div>
        </div>

        {/* Demo Faculty Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-slate-500">Demo Faculty:</span>
          {SEED_FACULTY.slice(0, 4).map((f) => (
            <button
              key={f.id}
              onClick={() => handleSwitchFaculty(f)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                faculty?.id === f.id
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.name.split(' ')[1] || f.name} ({f.cabinNumber})
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Status & Cabin Info (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Cabin Status Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h2 className="text-base font-bold text-slate-900">Real-Time Cabin Presence</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Broadcasts instantly to Campus Directory
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Select your current status so students looking up your cabin in the 3D twin or directory
              know if you are currently seated and welcoming walk-ins.
            </p>

            {/* 4 Status Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['available', 'in_lecture', 'meeting', 'busy'] as FacultyStatus[]).map((st) => {
                const conf = statusConfig[st];
                const isSelected = currentStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={isUpdatingStatus}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? `${conf.bg} border-current shadow-xs ring-2 ${conf.ring}`
                        : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs sm:text-sm">{conf.label}</span>
                      {isSelected && (
                        <CheckCircle2 className={`w-4 h-4 ${conf.text} shrink-0`} />
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 mt-1">{conf.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Message Bar */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Clock className="w-4 h-4 text-[#0071E3] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-500">Official Consultation Hours</div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {faculty?.consultationHours || 'By Appointment'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Hours</span>
              </button>
            </div>
          </div>

          {/* Cabin Details & Location Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0071E3]" />
                <h2 className="text-base font-bold text-slate-900">Assigned Cabin & Location Details</h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Cabin Number
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                  {faculty?.cabinNumber}
                </span>
                <span className="text-[11px] text-slate-500">{faculty?.floor}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Building / Wing
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                  {faculty?.buildingName}
                </span>
                <span className="text-[11px] text-slate-500">{faculty?.wing || 'Main Wing'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Direct Contact
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                  {faculty?.email}
                </span>
                <span className="text-[11px] text-slate-500">{faculty?.phone || 'Ext. 4514'}</span>
              </div>
            </div>

            {/* Directions Guide */}
            {faculty?.directionsGuide && (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Student Navigation Guide to Cabin</span>
                </span>
                <p className="text-xs text-blue-800 leading-relaxed">{faculty.directionsGuide}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Link
                to={`/navigation?to=${faculty?.buildingId || 'loc-ab-1'}`}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Navigate to Cabin on Campus Map</span>
              </Link>
              <Link
                to={`/faculty?q=${encodeURIComponent(faculty?.cabinNumber || '')}`}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Public Directory Listing</span>
              </Link>
            </div>
          </div>

          {/* Student Consultation Requests */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Student Consultation & Appointment Requests
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {appointments.filter((a) => a.status === 'pending').length} Pending
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Students can request cabin consultation slots during your published office hours. Accept or
              mark completed below.
            </p>

            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{apt.studentName}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {apt.regNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">· {apt.department}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-1">{apt.topic}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                          apt.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : apt.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-600">Student Note: </span>
                      {apt.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>{apt.slotTime}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {apt.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt.id, 'confirmed')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept & Confirm</span>
                        </button>
                      )}
                      {apt.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt.id, 'completed')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Mark Completed</span>
                        </button>
                      )}
                      {apt.status !== 'cancelled' && (
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt.id, 'cancelled')}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Faculty Announcements & Profile Sidebar */}
        <div className="space-y-6">
          {/* Faculty Announcements Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0071E3]" />
                <h2 className="text-base font-bold text-slate-900">Official Announcements</h2>
              </div>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Notice</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Notices posted by verified faculty are published instantly to the campus bulletin board
              without requiring administrative queue review.
            </p>

            {announcements.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-full bg-slate-200/60 mx-auto flex items-center justify-center text-slate-500">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="font-semibold text-xs text-slate-700">No active bulletins posted</div>
                <p className="text-[11px] text-slate-400">
                  Post office hour changes, quiz schedules, or seminar invites for your courses.
                </p>
                <button
                  onClick={() => setIsPostModalOpen(true)}
                  className="text-xs font-bold text-[#0071E3] hover:underline cursor-pointer"
                >
                  Post First Announcement →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{ann.title}</h4>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{ann.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Live</span>
                      </span>
                      <span className="text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subjects & Research Areas Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#0071E3]" />
                <span>Subjects Taught</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-[11px] font-semibold text-[#0071E3] hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(faculty?.subjects || []).map((sub, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  {sub}
                </span>
              ))}
            </div>

            {faculty?.researchArea && (
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Research Domain
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{faculty.researchArea}</p>
              </div>
            )}
          </div>

          {/* Campus Twin Explorer Shortcut */}
          <div className="bg-linear-to-br from-[#0071E3] to-[#005bb5] rounded-3xl p-6 text-white shadow-xs space-y-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Interactive 3D Campus Twin</h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Explore student pathways, locate lab facilities, or review campus event venues in real-time.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#0071E3] font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 transition-colors"
            >
              <span>Open Campus Explorer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Cabin & Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0071E3]" />
                <h3 className="font-bold text-base text-slate-900">Edit Cabin & Consultation Profile</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Official Consultation Hours</label>
                <input
                  type="text"
                  value={editForm.consultationHours}
                  onChange={(e) => setEditForm({ ...editForm, consultationHours: e.target.value })}
                  placeholder="e.g. Mon & Thu: 02:30 PM – 04:30 PM"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0071E3] focus:outline-none text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Cabin Phone / Campus Intercom</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +91 7560 254514 or Ext. 314"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0071E3] focus:outline-none text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Student Navigation Guide to Cabin</label>
                <textarea
                  rows={3}
                  value={editForm.directionsGuide}
                  onChange={(e) => setEditForm({ ...editForm, directionsGuide: e.target.value })}
                  placeholder="e.g. Enter AB-1 main foyer, take North elevator to 3rd Floor Wing B..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0071E3] focus:outline-none text-slate-900 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Subjects Taught (comma separated)</label>
                <input
                  type="text"
                  value={editForm.subjectsText}
                  onChange={(e) => setEditForm({ ...editForm, subjectsText: e.target.value })}
                  placeholder="e.g. Cloud Computing, Distributed Systems, Advanced Architecture"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0071E3] focus:outline-none text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Research Focus</label>
                <input
                  type="text"
                  value={editForm.researchArea}
                  onChange={(e) => setEditForm({ ...editForm, researchArea: e.target.value })}
                  placeholder="e.g. Cloud Orchestration, Fog Computing & Distributed Consensus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0071E3] focus:outline-none text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Faculty Announcement Modal */}
      <PostAnnouncementModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => loadData()}
        locations={locations}
      />
    </div>
  );
};
