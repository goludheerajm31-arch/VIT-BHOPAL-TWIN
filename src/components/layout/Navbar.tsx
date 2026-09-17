import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
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
  const { user, role, logout, quickSwitchUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { label: 'Explore', path: '/explore' },
    { label: 'Faculty & Cabins', path: '/faculty' },
    { label: 'Navigation', path: '/navigation' },
    { label: 'Events', path: '/events' },
  ];

  const handleRoleChange = (newRole: UserRole) => {
    quickSwitchUser(newRole);
    setIsRoleMenuOpen(false);
    if (newRole === 'ADMIN') navigate('/admin');
    else if (newRole === 'PUBLISHER') navigate('/publisher');
    else if (newRole === 'STUDENT') navigate('/dashboard');
    else navigate('/explore');
  };

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

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="px-2.5 py-1 bg-black/[0.04] hover:bg-black/[0.07] text-[#1D1D1F] rounded-full text-[11px] font-medium border border-black/[0.04] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="capitalize">{role.toLowerCase()}</span>
                <ChevronDown className="w-3 h-3 text-[#86868B]" />
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-black/[0.08] p-1.5 z-50 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">
                    Role
                  </div>
                  {(['STUDENT', 'PUBLISHER', 'ADMIN', 'GUEST'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                        role === r
                          ? 'bg-[#0071E3] text-white font-semibold'
                          : 'text-[#1D1D1F] hover:bg-black/[0.04]'
                      }`}
                    >
                      <span className="capitalize">{r.toLowerCase()}</span>
                      {role === r && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-7 h-7 rounded-full overflow-hidden border border-black/[0.08] hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-black/[0.08] p-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-black/[0.06]">
                      <div className="font-semibold text-[#1D1D1F] truncate">{user.name}</div>
                      <div className="text-[11px] text-[#86868B] truncate">{user.email}</div>
                    </div>

                    <div className="py-1">
                      {role === 'STUDENT' && (
                        <Link
                          to="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-3 py-1.5 rounded-xl hover:bg-black/[0.04] text-[#1D1D1F]"
                        >
                          Dashboard
                        </Link>
                      )}
                      {role === 'PUBLISHER' && (
                        <Link
                          to="/publisher"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-3 py-1.5 rounded-xl hover:bg-black/[0.04] text-[#1D1D1F]"
                        >
                          Publisher Studio
                        </Link>
                      )}
                      {role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-3 py-1.5 rounded-xl hover:bg-black/[0.04] text-[#1D1D1F]"
                        >
                          Admin Console
                        </Link>
                      )}
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
                          navigate('/');
                        }}
                        className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5"
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
