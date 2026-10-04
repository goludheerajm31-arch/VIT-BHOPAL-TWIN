import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { Publisher, Announcement } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { RejectAnnouncementModal } from '../components/announcements/RejectAnnouncementModal';
import { useToast } from '../components/layout/Toast';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Mail,
  Bell,
  Clock,
  Check,
  X,
  Trash2,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const AdminVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'announcements' | 'publishers'>('announcements');
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingAnnouncement, setRejectingAnnouncement] = useState<Announcement | null>(null);

  const loadData = () => {
    setPublishers(storage.getPublishers());
    setAnnouncements(storage.getAnnouncements());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const handleToggleVerification = async (pubId: string, currentStatus: boolean, name: string) => {
    const updated = await storage.togglePublisherVerification(pubId);
    if (updated) {
      toast(
        updated.verified ? `Verified publisher: ${name}` : `Revoked verification for ${name}`,
        updated.verified ? 'success' : 'info'
      );
      loadData();
    }
  };

  const handleVerifyAnnouncement = async (annId: string, title: string) => {
    const updated = await storage.verifyAnnouncement(annId, 'approved');
    if (updated) {
      toast(`Verified & posted "${title}" live to the campus board!`, 'success');
      loadData();
    }
  };

  const handleRejectAnnouncementConfirm = async (reason: string) => {
    if (!rejectingAnnouncement) return;
    const annId = rejectingAnnouncement.id;
    const title = rejectingAnnouncement.title;

    await storage.verifyAnnouncement(annId, 'rejected', reason);
    toast(`Declined "${title}". Feedback recorded for student author.`, 'info');
    setRejectingAnnouncement(null);
    loadData();
  };

  const handleDeleteAnnouncement = async (annId: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}"?`)) {
      await storage.deleteAnnouncement(annId);
      toast(`Deleted announcement "${title}"`, 'info');
      loadData();
    }
  };

  const pendingAnnouncements = announcements.filter((a) => a.status === 'pending');

  const filteredPublishers = publishers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const pubName = p.organizationName || p.name || '';
    const pubDept = p.department || p.category || '';
    return (
      pubName.toLowerCase().includes(q) ||
      pubDept.toLowerCase().includes(q) ||
      p.contactEmail.toLowerCase().includes(q)
    );
  });

  const filteredAnnouncements = announcements.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.publisherName.toLowerCase().includes(q) ||
      (a.authorRegNumber && a.authorRegNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Console
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Institutional Verification Center
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Governance Protocol
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify student announcements and authenticate publisher organizations before public broadcasting.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registry..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-fit text-xs font-medium">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'announcements'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-blue-600" />
          <span>Student Announcements</span>
          {pendingAnnouncements.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
              {pendingAnnouncements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('publishers')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'publishers'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Publisher Clubs & Orgs ({publishers.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Student Announcements Queue */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {filteredAnnouncements.length} announcement{filteredAnnouncements.length === 1 ? '' : 's'} (
              <strong className="text-amber-600">{pendingAnnouncements.length} awaiting verification</strong>)
            </div>
            <Link to="/announcements" className="text-blue-600 hover:underline font-semibold">
              View Public Feed →
            </Link>
          </div>

          <div className="space-y-3">
            {filteredAnnouncements.map((ann) => {
              const isPending = ann.status === 'pending';
              const isApproved = ann.status === 'approved' || (ann.verified && ann.status !== 'rejected');
              const isRejected = ann.status === 'rejected';

              return (
                <div
                  key={ann.id}
                  className={`p-5 rounded-2xl bg-white border transition-all shadow-xs space-y-3 ${
                    isPending
                      ? 'border-amber-300 bg-amber-50/20'
                      : isRejected
                      ? 'border-rose-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {ann.category}
                      </span>

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                          <Clock className="w-3 h-3 animate-pulse text-amber-600" />
                          <span>Pending Admin Verification</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified & Live</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Declined</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Submitted: {new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{ann.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                      {ann.description}
                    </p>
                  </div>

                  {isRejected && ann.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                      <span className="font-semibold">Rejection reason given: </span>
                      <span>{ann.rejectionReason}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Student Author: {ann.publisherName}</span>
                        {ann.authorRegNumber && (
                          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {ann.authorRegNumber}
                          </span>
                        )}
                      </span>

                      {ann.locationName && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{ann.locationName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {ann.actionUrl && (
                        <a
                          href={ann.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-medium"
                        >
                          <span>Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleVerifyAnnouncement(ann.id, ann.title)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Post</span>
                          </button>
                          <button
                            onClick={() => setRejectingAnnouncement(ann)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleVerifyAnnouncement(ann.id, ann.title)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          {isApproved ? 'Re-Verify' : 'Approve & Post'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="font-bold text-sm text-slate-700">No announcements match search</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Publisher Clubs & Orgs */}
      {activeTab === 'publishers' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Publisher Organization</th>
                  <th className="px-5 py-3.5">Department / Faculty</th>
                  <th className="px-5 py-3.5">Contact Point</th>
                  <th className="px-5 py-3.5">Trust Status</th>
                  <th className="px-5 py-3.5 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPublishers.map((pub) => (
                  <tr key={pub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-sm">{pub.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {pub.id}</div>
                    </td>
                    <td className="px-5 py-4 font-medium">{pub.department}</td>
                    <td className="px-5 py-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {pub.contactEmail}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {pub.verified ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified Publisher</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending / Unverified</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleToggleVerification(pub.id, pub.verified, pub.name)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer ${
                          pub.verified
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {pub.verified ? 'Revoke Badge' : 'Grant Verified Badge'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <RejectAnnouncementModal
        isOpen={Boolean(rejectingAnnouncement)}
        onClose={() => setRejectingAnnouncement(null)}
        onConfirm={handleRejectAnnouncementConfirm}
        announcementTitle={rejectingAnnouncement?.title || ''}
      />
    </div>
  );
};
