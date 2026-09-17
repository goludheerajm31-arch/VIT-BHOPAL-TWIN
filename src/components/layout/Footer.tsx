import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F5F5F7] text-[#86868B] text-xs border-t border-black/[0.06] pb-20 md:pb-8 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1D1D1F]">VIT Bhopal University</span>
            <span>·</span>
            <span>Campus Digital Twin</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <Link to="/explore" className="hover:text-[#1D1D1F] transition-colors">
              Campus Map
            </Link>
            <Link to="/faculty" className="hover:text-[#1D1D1F] transition-colors">
              Faculty Cabins
            </Link>
            <Link to="/navigation" className="hover:text-[#1D1D1F] transition-colors">
              Wayfinding
            </Link>
            <Link to="/events" className="hover:text-[#1D1D1F] transition-colors">
              Events
            </Link>
            <Link to="/announcements" className="hover:text-[#1D1D1F] transition-colors">
              Notices
            </Link>
            <Link to="/about" className="hover:text-[#1D1D1F] transition-colors">
              About
            </Link>
          </div>
        </div>

        <div className="border-t border-black/[0.06] pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#86868B]">
          <div>© {new Date().getFullYear()} VIT Bhopal. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Systems Normal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
