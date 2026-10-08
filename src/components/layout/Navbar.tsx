import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { DemoRoleSwitcher, useDemoRole } from '../../services/demoRoleSwitcher';
import { UserRole } from '../../types';
import {
  Compass,
  Search,
  Calendar,
  Navigation,
  Bookmark,
  ChevronDown,
  LogOut,
  GraduationCap,
  Sparkles,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { activeRole, isDemoActive, isSimulated } = useDemoRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/hub') {
      return location.pathname.startsWith('/hub') || location.pathname.startsWith('/campus-hub') || location.pathname.startsWith('/announcements');
    }
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { label: 'Explore', path: '/explore' },
    { label: 'Faculty & Cabins', path: '/faculty' },
    { label: 'Navigation', path: '/navigation' },
    { label: 'Events', path: '/events' },
    { label: 'Campus Hub', path: '/hub' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#F5F5F7]/85 backdrop-blur-2xl border-b border-black/[0.06] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo & Name (Minimal Apple aesthetic) */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#0071E3] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(0,113,227,0.3)] transition-transform group-hover:scale-105">
              <Compass className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-[#1D1D1F]">
                VIT Bhopal
              </span>
              <span className="text-[11px] font-medium text-[#86868B]">
                Campus
              </span>
            </div>
          </Link>

          {/* Center Navigation: Apple Segmented Pill Container */}
          <nav className="hidden md:flex items-center bg-black/[0.04] p-1 rounded-full border border-black/[0.04]">
            {navLinks.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
                    active
                      ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2">
            {/* Spotlight Search Capsule */}
            <Link
              to="/search"
              className="flex items-center gap-2 px-3 py-1.5 bg-black/[0.04] hover:bg-black/[0.07] rounded-full text-xs text-[#86868B] border border-black/[0.04] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#86868B]" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.2 bg-white rounded border border-black/[0.08] text-[10px] font-mono text-[#86868B] shadow-2xs">
                ⌘K
              </kbd>
            </Link>

            {/* Saved Items */}
            {user && (
              <Link
                to="/saved"
                title="Saved"
                className={`p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors ${
                  isActive('/saved') ? 'text-[#0071E3] bg-[#0071E3]/10' : ''
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </Link>
            )}

            {/* Quick Demo Role Switcher for professor presentation */}
            {isDemoActive ? (
              <DemoRoleSwitcher />
            ) : user ? (
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/[0.04] text-[#1D1D1F] border border-black/[0.06]">
                {role}
              </span>
            ) : null}

            {/* User Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-7 h-7 rounded-full overflow-hidden border border-black/[0.08] hover:opacity-85 transition-opacity cursor-pointer flex items-center justify-center bg-blue-600 text-white font-bold text-xs"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-black/[0.08] p-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-black/[0.06]">
                      <div className="font-semibold text-[#1D1D1F] truncate">{user.name}</div>
                      <div className="text-[11px] text-[#86868B] truncate">{user.email}</div>
                      <div className="text-[10px] font-semibold text-blue-600 mt-0.5 uppercase tracking-wider flex items-center justify-between">
                        <span>Role: {role}</span>
                        {isSimulated && (
                          <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-medium">
                            Demo: {activeRole}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-1.5 rounded-xl hover:bg-black/[0.04] text-[#1D1D1F]"
                      >
                        Student Profile & Dashboard
                      </Link>

                      {(activeRole === 'PUBLISHER' || user?.isPublisher || user?.roles?.includes('PUBLISHER')) && (
                        <Link
                          to="/publisher"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-3 py-1.5 rounded-xl hover:bg-indigo-50 text-indigo-700 font-medium flex items-center justify-between"
                        >
                          <span>Publisher Studio</span>
                          <span className="text-[10px] font-bold bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700">Active</span>
                        </Link>
                      )}

                      {(activeRole === 'FACULTY' || user?.roles?.includes('FACULTY')) && (
                        <Link
                          to="/faculty/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-3 py-1.5 rounded-xl hover:bg-blue-50 text-blue-700 font-medium"
                        >
                          Faculty Portal
                        </Link>
                      )}

                      {(activeRole === 'ADMIN' || user?.roles?.includes('ADMIN')) && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-3 py-1.5 rounded-xl hover:bg-purple-50 text-purple-700 font-medium"
                        >
                          Admin Console
                        </Link>
                      )}

                      <Link
                        to="/announcements"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-1.5 rounded-xl hover:bg-black/[0.04] text-[#1D1D1F]"
                      >
                        Campus Announcements
                      </Link>
                      <Link
                        to="/saved"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-1.5 rounded-xl hover:bg-black/[0.04] text-[#1D1D1F]"
                      >
                        Saved Places & Events
                      </Link>
                    </div>

                    <div className="border-t border-black/[0.06] pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                          navigate('/login');
                        }}
                        className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1 text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-full transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
