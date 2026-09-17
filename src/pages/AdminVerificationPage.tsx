import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storage, DATA_CHANGE_EVENT } from '../services/storage';
import { Publisher } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { useToast } from '../components/layout/Toast';
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle, Search, Mail } from 'lucide-react';

export const AdminVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setPublishers(storage.getPublishers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(DATA_CHANGE_EVENT, loadData);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, loadData);
  }, []);

  const handleToggleVerification = (pubId: string, currentStatus: boolean, name: string) => {
    const updated = storage.togglePublisherVerification(pubId);
    if (updated) {
      toast(
        updated.verified ? `Verified publisher: ${name}` : `Revoked verification for ${name}`,
        updated.verified ? 'success' : 'info'
      );
    }
  };

  const filtered = publishers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.contactEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Console
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Publisher Verification Registry
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Official institutional trust protocol verifying student clubs, departmental councils, and administrative bodies.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter publishers..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Registry Table Card */}
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
              {filtered.map((pub) => (
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
    </div>
  );
};
