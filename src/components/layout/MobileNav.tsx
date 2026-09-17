import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { Compass, Search, Calendar, Navigation, GraduationCap, User as UserIcon } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { user, role } = useAuth();

  const isActive = (path: string) => {
    if (path === '/explore') return location.pathname === '/explore';
    return location.pathname.startsWith(path);
  };

  const getProfilePath = () => {
    if (!user) return '/login';
    if (role === 'ADMIN') return '/admin';
    if (role === 'PUBLISHER') return '/publisher';
    return '/dashboard';
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F5F5F7]/90 backdrop-blur-2xl border-t border-black/[0.06] px-3 py-1 flex items-center justify-around safe-area-bottom">
      <Link
        to="/explore"
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] transition-colors ${
          isActive('/explore') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span>Explore</span>
      </Link>

      <Link
        to="/faculty"
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] transition-colors ${
          isActive('/faculty') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <GraduationCap className="w-4 h-4" />
        <span>Cabins</span>
      </Link>

      <Link
        to="/navigation"
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] transition-colors ${
          isActive('/navigation') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <Navigation className="w-4 h-4" />
        <span>Route</span>
      </Link>

      <Link
        to="/events"
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] transition-colors ${
          isActive('/events') ? 'text-[#0071E3] font-semibold' : 'text-[#86868B]'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>Events</span>
      </Link>

      <Link
        to={getProfilePath()}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] transition-colors ${
          isActive('/dashboard') || isActive('/publisher') || isActive('/admin') || isActive('/login')
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
