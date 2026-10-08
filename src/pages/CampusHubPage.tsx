import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { Announcement, CampusGuide, GuideCategory } from '../types';
import { useAuth } from '../services/auth';
import { useDemoRole } from '../services/demoRoleSwitcher';
import { useToast } from '../components/layout/Toast';
import { CampusGuideModal } from '../components/guides/CampusGuideModal';
import { PostAnnouncementModal } from '../components/announcements/PostAnnouncementModal';
import { AddEditGuideModal } from '../components/admin/AddEditGuideModal';
import {
  Search,
  Bell,
  BookOpen,
  ChevronRight,
  Plus,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Layers,
  GraduationCap,
  Building,
  HelpCircle,
  CreditCard,
  LifeBuoy,
  Briefcase,
  ExternalLink,
} from 'lucide-react';

type HubTab = 'ALL' | 'ANNOUNCEMENTS' | 'GUIDES';

const CATEGORY_ITEMS: { id: GuideCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'All Guides', icon: Layers },
  { id: 'ACADEMICS', label: 'Academics', icon: GraduationCap },
  { id: 'HOSTEL', label: 'Hostel', icon: Building },
  { id: 'STUDENT_SERVICES', label: 'Student Services', icon: HelpCircle },
  { id: 'ADMINISTRATION', label: 'Administration', icon: Building },
  { id: 'FINANCE', label: 'Finance', icon: CreditCard },
  { id: 'COMPLAINTS', label: 'Complaints', icon: LifeBuoy },
  { id: 'PLACEMENTS', label: 'Placements', icon: Briefcase },
  { id: 'GENERAL', label: 'General', icon: Layers },
];

export const CampusHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { activeRole } = useDemoRole();
  const { toast } = useToast();
  const isAdmin = role === 'ADMIN' || activeRole === 'ADMIN';

  // Active view tab: ALL, ANNOUNCEMENTS, GUIDES
  const [activeTab, setActiveTab] = useState<HubTab>('ALL');

  // Data state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [guides, setGuides] = useState<CampusGuide[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | 'all'>(
    (searchParams.get('category') as GuideCategory) || 'all'
  );
  const [announcementPriorityFilter, setAnnouncementPriorityFilter] = useState<'all' | 'urgent' | 'high'>('all');

  // Active Guide Modal
  const [activeGuide, setActiveGuide] = useState<CampusGuide | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Modals
  const [isPostAnnouncementOpen, setIsPostAnnouncementOpen] = useState(false);
  const [isAddGuideModalOpen, setIsAddGuideModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<CampusGuide | null>(null);

  const loadData = () => {
    // Only published announcements
    const allAnn = storage.getAnnouncements();
    const approvedAnn = allAnn.filter((a) => a.status === 'approved' || (a.verified && a.status !== 'rejected'));
    setAnnouncements(approvedAnn);

    // Published guides for student view, plus drafts if admin
    setGuides(storage.getCampusGuides(isAdmin ? 'all' : 'PUBLISHED'));
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, [isAdmin]);

  // Deep link opening if slug or id in URL
  useEffect(() => {
    const guideSlug = searchParams.get('guide');
    if (guideSlug && guides.length > 0) {
      const found = guides.find((g) => g.slug === guideSlug || g.id === guideSlug);
      if (found) {
        setActiveGuide(found);
        setIsGuideModalOpen(true);
      }
    }
  }, [searchParams, guides]);

  // Universal Campus Hub Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return storage.searchCampusHub(searchQuery, isAdmin);
  }, [searchQuery, isAdmin, announcements, guides]);

  // Filtered standard announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter((a) => {
        if (announcementPriorityFilter === 'urgent' && a.priority !== 'urgent') return false;
        if (announcementPriorityFilter === 'high' && a.priority !== 'high' && a.priority !== 'urgent') return false;
        return true;
      })
      .slice(0, activeTab === 'ANNOUNCEMENTS' ? 20 : 6);
  }, [announcements, announcementPriorityFilter, activeTab]);

  // Filtered standard guides
  const filteredGuides = useMemo(() => {
    return guides.filter((g) => {
      if (selectedCategory !== 'all' && g.category !== selectedCategory) return false;
      return true;
    });
  }, [guides, selectedCategory]);

  const handleOpenGuide = (guide: CampusGuide) => {
    setActiveGuide(guide);
    setIsGuideModalOpen(true);
  };

  const handleOpenEditFromModal = (guideToEdit: CampusGuide) => {
    setIsGuideModalOpen(false);
    setEditingGuide(guideToEdit);
    setIsAddGuideModalOpen(true);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
              VIT Bhopal University
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
              Campus Hub
            </h1>
            <p className="text-xs sm:text-sm text-[#86868B] max-w-xl leading-relaxed">
              University announcements for what is happening now, and official guides for how to get things done.
            </p>
          </div>

          {/* Segmented View Switcher */}
          <div className="bg-black/[0.04] p-1 rounded-full flex items-center self-start md:self-auto border border-black/[0.04]">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              All Hub
            </button>
            <button
              onClick={() => setActiveTab('ANNOUNCEMENTS')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'ANNOUNCEMENTS'
                  ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Announcements ({announcements.length})
            </button>
            <button
              onClick={() => setActiveTab('GUIDES')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'GUIDES'
                  ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Campus Guides ({guides.length})
            </button>
          </div>
        </div>

        {/* Global Hub Search */}
        <div className="relative max-w-2xl">
          <Search className="w-4 h-4 text-[#86868B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search procedures or bulletins (e.g. "hostel leave", "wifi", "grade cards", "wifi password")...'
            className="w-full pl-11 pr-10 py-2.5 bg-white border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl text-xs sm:text-sm text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#0071E3] transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SEARCH MODE: Display Unified Matched Results */}
      {searchResults !== null ? (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <h2 className="text-sm font-semibold text-[#1D1D1F]">
              Search Results for <span className="text-[#0071E3]">"{searchQuery}"</span>
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#0071E3] hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          </div>

          {/* Matched Guides */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0071E3]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
                Campus Procedures & Guides ({searchResults.guides.length})
              </h3>
            </div>

            {searchResults.guides.length === 0 ? (
              <p className="text-xs text-[#86868B] italic">No matching procedures or guides found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.guides.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleOpenGuide(g)}
                    className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:border-black/[0.12] transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-[#86868B]">
                        <span className="font-semibold text-[#1D1D1F]">
                          {g.category.replace(/_/g, ' ')}
                        </span>
                        <span>Updated {formatDate(g.updatedAt)}</span>
                      </div>

                      <h4 className="text-sm font-bold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors line-clamp-2">
                        {g.title}
                      </h4>

                      <p className="text-xs text-[#86868B] line-clamp-2 leading-relaxed">
                        {g.shortDescription || g.content}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-black/[0.04] flex items-center justify-between text-xs text-[#0071E3] font-medium">
                      <span>{g.steps.length > 0 ? `${g.steps.length} Steps` : 'View Procedure'}</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matched Announcements */}
          <div className="space-y-3 pt-4 border-t border-black/[0.06]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
                Current Announcements ({searchResults.announcements.length})
              </h3>
            </div>

            {searchResults.announcements.length === 0 ? (
              <p className="text-xs text-[#86868B] italic">No matching current announcements found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {searchResults.announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#86868B]">
                      <span className="font-semibold text-[#1D1D1F]">{ann.publisherName}</span>
                      <span>{formatDate(ann.createdAt)}</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[#1D1D1F]">{ann.title}</h4>
                    <p className="text-xs text-[#86868B] leading-relaxed">{ann.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STANDARD DUAL SECTION VIEW */
        <div className="space-y-12">
          {/* ================================================================ */}
          {/* SECTION 1: 📢 Announcements ("What is happening now?")         */}
          {/* ================================================================ */}
          {(activeTab === 'ALL' || activeTab === 'ANNOUNCEMENTS') && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F] tracking-tight">
                      Announcements & Circulars
                    </h2>
                    <p className="text-xs text-[#86868B]">What is happening now across campus</p>
                  </div>
                </div>

                {/* Priority Filters & Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-black/[0.04] p-0.5 rounded-full text-xs">
                    <button
                      onClick={() => setAnnouncementPriorityFilter('all')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        announcementPriorityFilter === 'all'
                          ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                          : 'text-[#86868B]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAnnouncementPriorityFilter('high')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        announcementPriorityFilter === 'high'
                          ? 'bg-white text-[#1D1D1F] font-semibold shadow-2xs'
                          : 'text-[#86868B]'
                      }`}
                    >
                      High Priority
                    </button>
                    <button
                      onClick={() => setAnnouncementPriorityFilter('urgent')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        announcementPriorityFilter === 'urgent'
                          ? 'bg-white text-rose-700 font-semibold shadow-2xs'
                          : 'text-[#86868B]'
                      }`}
                    >
                      Urgent
                    </button>
                  </div>

                  {(role === 'ADMIN' || role === 'PUBLISHER' || role === 'FACULTY') && (
                    <button
                      onClick={() => setIsPostAnnouncementOpen(true)}
                      className="px-3 py-1 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Notice</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredAnnouncements.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-black/[0.06] text-xs text-[#86868B]">
                  No active announcements matching the filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-black/[0.1] transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#86868B]">
                          <span className="font-semibold text-[#1D1D1F]">{ann.publisherName}</span>
                          <span>{formatDate(ann.createdAt)}</span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-[#1D1D1F] line-clamp-2">
                          {ann.title}
                        </h3>

                        <p className="text-xs text-[#86868B] line-clamp-3 leading-relaxed">
                          {ann.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-black/[0.04] flex items-center justify-between text-[11px] text-[#86868B]">
                        <span>{ann.category}</span>
                        {ann.actionUrl && (
                          <a
                            href={ann.actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0071E3] font-medium hover:underline inline-flex items-center gap-0.5 ml-2"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ================================================================ */}
          {/* SECTION 2: 📖 Campus Guide ("How do I do something?")          */}
          {/* ================================================================ */}
          {(activeTab === 'ALL' || activeTab === 'GUIDES') && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F] tracking-tight">
                      Campus Guide & Procedures
                    </h2>
                    <p className="text-xs text-[#86868B]">
                      Official instructions, checklists, and regulations
                    </p>
                  </div>
                </div>

                {/* Admin CMS Button */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingGuide(null);
                      setIsAddGuideModalOpen(true);
                    }}
                    className="self-start sm:self-auto px-3.5 py-1.5 bg-[#1D1D1F] hover:bg-black text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Guide (CMS)</span>
                  </button>
                )}
              </div>

              {/* Controlled Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs no-scrollbar">
                {CATEGORY_ITEMS.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0 ${
                        isSelected
                          ? 'bg-[#1D1D1F] text-white shadow-2xs font-semibold'
                          : 'bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Guides Grid */}
              {filteredGuides.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-black/[0.06] text-xs text-[#86868B]">
                  No guides in this category yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGuides.map((g) => {
                    const pdfCount = g.attachments?.filter((a) => a.fileType.includes('pdf')).length || 0;
                    const imgCount = g.attachments?.filter((a) => a.fileType.startsWith('image/')).length || 0;

                    return (
                      <div
                        key={g.id}
                        onClick={() => handleOpenGuide(g)}
                        className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:border-black/[0.12] transition-all cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-[#86868B]">
                            <span className="font-semibold text-[#1D1D1F]">
                              {g.category.replace(/_/g, ' ')}
                            </span>
                            <span>Updated {formatDate(g.updatedAt)}</span>
                          </div>

                          <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight group-hover:text-[#0071E3] transition-colors leading-snug">
                            {g.title}
                          </h3>

                          <p className="text-xs text-[#86868B] line-clamp-3 leading-relaxed">
                            {g.shortDescription || g.content}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-black/[0.04] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-[#86868B] text-[11px]">
                            {g.steps.length > 0 && (
                              <span className="flex items-center gap-1 text-[#1D1D1F] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#0071E3]" />
                                {g.steps.length} Steps
                              </span>
                            )}
                            {pdfCount > 0 && (
                              <span className="flex items-center gap-1 text-[#86868B]">
                                <FileText className="w-3 h-3 text-rose-500" />
                                PDF
                              </span>
                            )}
                            {imgCount > 0 && (
                              <span className="flex items-center gap-1 text-[#86868B]">
                                <ImageIcon className="w-3 h-3 text-blue-500" />
                                Image
                              </span>
                            )}
                          </div>

                          <span className="text-[#0071E3] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-xs">
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Guide Detail Modal */}
      <CampusGuideModal
        guide={activeGuide}
        isOpen={isGuideModalOpen}
        onClose={() => {
          setIsGuideModalOpen(false);
          setActiveGuide(null);
        }}
        onEdit={handleOpenEditFromModal}
        isAdmin={isAdmin}
      />

      {/* Admin Guide Editor Modal (CMS) */}
      <AddEditGuideModal
        isOpen={isAddGuideModalOpen}
        onClose={() => {
          setIsAddGuideModalOpen(false);
          setEditingGuide(null);
        }}
        initialGuide={editingGuide}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Post Announcement Modal */}
      <PostAnnouncementModal
        isOpen={isPostAnnouncementOpen}
        onClose={() => setIsPostAnnouncementOpen(false)}
        onSuccess={() => {
          loadData();
          toast('Announcement posted successfully!', 'success');
        }}
      />
    </div>
  );
};
