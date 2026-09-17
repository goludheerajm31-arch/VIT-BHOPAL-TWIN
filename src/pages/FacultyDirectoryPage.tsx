import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { FacultyMember } from '../types';
import { FacultyCabinCard } from '../components/faculty/FacultyCabinCard';
import { AddFacultyModal } from '../components/faculty/AddFacultyModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../components/layout/Toast';
import { useAuth } from '../services/auth';
import { Search, X, Plus, RotateCcw } from 'lucide-react';

export const FacultyDirectoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [selectedSchool, setSelectedSchool] = useState<string>(searchParams.get('school') || 'all');
  const [selectedFloor, setSelectedFloor] = useState<string>(searchParams.get('floor') || 'all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(searchParams.get('available') === 'true');
  const [sortBy, setSortBy] = useState<'cabin' | 'name'>('cabin');

  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setFacultyList(storage.getFaculty());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const schools = useMemo(() => {
    const set = new Set(facultyList.map((f) => f.school));
    return Array.from(set);
  }, [facultyList]);

  const floors = useMemo(() => {
    const set = new Set(facultyList.map((f) => f.floor));
    return Array.from(set);
  }, [facultyList]);

  const filteredFaculty = useMemo(() => {
    return facultyList
      .filter((faculty) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = faculty.name.toLowerCase().includes(q);
          const matchesCabin =
            faculty.cabinNumber.toLowerCase().includes(q) ||
            faculty.cabinNumber.toLowerCase().replace(/[-_ ]/g, '').includes(q.replace(/[-_ ]/g, ''));
          const matchesSchool = faculty.school.toLowerCase().includes(q);
          const matchesDept = faculty.departmentName.toLowerCase().includes(q);
          const matchesSubjects = faculty.subjects.some((sub) => sub.toLowerCase().includes(q));

          if (!matchesName && !matchesCabin && !matchesSchool && !matchesDept && !matchesSubjects) {
            return false;
          }
        }

        if (selectedSchool !== 'all' && faculty.school !== selectedSchool) {
          return false;
        }

        if (selectedFloor !== 'all' && faculty.floor !== selectedFloor) {
          return false;
        }

        if (onlyAvailable && faculty.status !== 'available') {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cabin') {
          return a.cabinNumber.localeCompare(b.cabinNumber);
        }
        return a.name.localeCompare(b.name);
      });
  }, [facultyList, searchQuery, selectedSchool, selectedFloor, onlyAvailable, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSchool('all');
    setSelectedFloor('all');
    setOnlyAvailable(false);
    setSearchParams({});
  };

  const handleOpenAddModal = (facultyToEdit?: FacultyMember) => {
    if (!isAdmin) {
      toast('Only administrators can add or modify faculty cabin records', 'error');
      return;
    }
    setEditingFaculty(facultyToEdit || null);
    setIsModalOpen(true);
  };

  const handleDeleteFaculty = (faculty: FacultyMember) => {
    if (!isAdmin) {
      toast('Only administrators can remove faculty members', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Faculty Cabin',
      message: `Are you sure you want to remove Cabin ${faculty.cabinNumber} (${faculty.name})? This will delete this cabin from campus navigation and directory listings.`,
      confirmLabel: 'Delete Cabin',
      isDestructive: true,
      onConfirm: () => {
        storage.deleteFaculty(faculty.id);
        toast(`Removed Cabin ${faculty.cabinNumber}`, 'info');
      },
    });
  };

  const handleResetDefaultCabins = () => {
    if (!isAdmin) {
      toast('Only administrators can reset faculty directory records', 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Reset Faculty Directory',
      message: 'Are you sure you want to restore the faculty directory to verified default cabins? Any custom cabins added will be reset.',
      confirmLabel: 'Reset Directory',
      isDestructive: true,
      onConfirm: () => {
        storage.resetFaculty();
        toast('Reset to default faculty list', 'success');
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24 pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Apple Style Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                Faculty & Cabins
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black/[0.05] text-[#86868B]">
                {filteredFaculty.length}
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-1">
              Search cabin numbers, professors, and indoor directions
            </p>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDefaultCabins}
                title="Reset defaults"
                className="p-2 rounded-full hover:bg-black/[0.05] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenAddModal()}
                className="px-3.5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Faculty</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-black/[0.03] rounded-full border border-black/[0.04] text-[11px] text-[#86868B]">
              <span>Verified Directory</span>
            </div>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3">
          {/* Spotlight Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cabin (e.g. AB1-314), professor, or department..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-black/[0.06] rounded-2xl text-xs text-[#1D1D1F] placeholder:text-[#86868B] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Apple Segmented Bar for Schools & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* School Segmented Pills */}
            <div className="bg-black/[0.04] p-1 rounded-full border border-black/[0.04] inline-flex items-center gap-0.5 overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedSchool('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedSchool === 'all'
                    ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                All
              </button>
              {schools.map((school) => (
                <button
                  key={school}
                  onClick={() => setSelectedSchool(school)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedSchool === school
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {school}
                </button>
              ))}
            </div>

            {/* Quick Secondary Filters */}
            <div className="flex items-center gap-2">
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="bg-white text-xs font-medium text-[#1D1D1F] border border-black/[0.06] rounded-full py-1.5 px-3 outline-none shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <option value="all">All Floors</option>
                {floors.map((fl) => (
                  <option key={fl} value={fl}>
                    {fl}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  onlyAvailable
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-black/[0.06] text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${onlyAvailable ? 'bg-emerald-500' : 'bg-[#86868B]'}`}
                />
                <span>Available</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white text-xs font-medium text-[#1D1D1F] border border-black/[0.06] rounded-full py-1.5 px-3 outline-none shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <option value="cabin">By Cabin</option>
                <option value="name">By Name</option>
              </select>

              {(searchQuery || selectedSchool !== 'all' || selectedFloor !== 'all' || onlyAvailable) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#0071E3] hover:text-[#0077ED] font-medium px-2"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Faculty Cards Grid */}
        {filteredFaculty.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFaculty.map((faculty) => (
              <FacultyCabinCard
                key={faculty.id}
                faculty={faculty}
                onEdit={isAdmin ? handleOpenAddModal : undefined}
                onDelete={isAdmin ? handleDeleteFaculty : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[#1D1D1F]">
              No faculty or cabins found
            </h3>
            <p className="text-xs text-[#86868B] max-w-sm mx-auto">
              {isAdmin
                ? 'Try adjusting your search query or add a new faculty member.'
                : 'Try adjusting your search query or department filters.'}
            </p>
            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 bg-[#0071E3] text-white rounded-full text-xs font-medium hover:bg-[#0077ED] transition-colors cursor-pointer"
                >
                  Add Faculty Member
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Faculty Modal */}
      <AddFacultyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
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
