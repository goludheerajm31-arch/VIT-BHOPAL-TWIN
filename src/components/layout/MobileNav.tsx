import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { useDemoRole } from '../../services/demoRoleSwitcher';
import { Compass, Search, Calendar, Navigation, GraduationCap, User as UserIcon, BookOpen } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { user, role } = useAuth();
  const { activeRole } = useDemoRole();

  const isActive = (path: string) => {
    if (path === '/explore') return location.pathname === '/explore';
    if (path === '/hub') {
      return location.pathname.startsWith('/hub') || location.pathname.startsWith('/campus-hub') || location.pathname.startsWith('/announcements');
    }
    return location.pathname.startsWith(path);
  };

  const getProfilePath = () => {
    if (activeRole === 'ADMIN' || role === 'ADMIN') return '/admin';
    if (activeRole === 'PUBLISHER' || role === 'PUBLISHER') return '/publisher';
    if (activeRole === 'FACULTY' || role === 'FACULTY') return '/faculty/dashboard';
    if (!user) return '/login';
    return '/dashboard';
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F5F5F7]/90 backdrop-blur-2xl border-t border-black/[0.06] px-2 py-1 flex items-center justify-around safe-area-bottom">
      <Link
        to="/explore"
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] transition-colors ${
          isActive('/explore') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span>Explore</span>
      </Link>

      <Link
        to="/faculty"
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] transition-colors ${
          isActive('/faculty') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <GraduationCap className="w-4 h-4" />
        <span>Cabins</span>
      </Link>

      <Link
        to="/events"
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] transition-colors ${
          isActive('/events') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>Events</span>
      </Link>

      <Link
        to="/hub"
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] transition-colors ${
          isActive('/hub') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>Hub</span>
      </Link>

      <Link
        to={getProfilePath()}
        className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[10px] transition-colors ${
          isActive('/dashboard') || isActive('/publisher') || isActive('/admin') || isActive('/faculty/dashboard') || isActive('/login')
            ? 'text-[#0071E3] font-semibold'
            : 'text-[#86868B]'
        }`}
      >
        <UserIcon className="w-4 h-4" />
        <span>{user ? 'Profile' : 'Sign In'}</span>
      </Link>
    </nav>
  );
};
