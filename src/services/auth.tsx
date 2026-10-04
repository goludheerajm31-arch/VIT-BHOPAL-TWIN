import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { SEED_USERS, SEED_FACULTY } from './data/seeds';
import { api, setAuthToken, getAuthToken } from './api';
import { realtimeClient } from './realtime';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  quickSwitchUser: (role: UserRole) => Promise<void>;
  quickLoginAs: (role: UserRole) => Promise<void>;
  loginAsFaculty: (facultyIdOrEmail: string) => Promise<void>;
  register: (name: string, email: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'vit_digital_twin_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return SEED_USERS[1];
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return SEED_USERS[1]; // Default to Aarav (Student) so user immediately enjoys logged-in features
  });

  // Connect realtime (Supabase Realtime or fallback SSE) when app mounts
  useEffect(() => {
    realtimeClient.connect();
    return () => {
      realtimeClient.disconnect();
    };
  }, []);

  // Sync Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const authUser: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role as UserRole,
            avatar: profile.avatar || undefined,
            department: profile.department || undefined,
            regNumber: profile.reg_number || undefined,
          };
          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const authUser: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role as UserRole,
            avatar: profile.avatar || undefined,
            department: profile.department || undefined,
            regNumber: profile.reg_number || undefined,
          };
          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        }
      } else {
        // Only clear if we were explicitly authenticated with Supabase session
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync current user state to local cache & server auth check
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  // Check server session if token exists
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe().then((res) => {
        if (res?.user) {
          setUser(res.user);
        }
      }).catch(() => {});
    }
  }, []);

  const login = async (
    email: string,
    password?: string,
    requestedRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured() && supabase && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const authUser: User = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || cleanEmail.split('@')[0].toUpperCase(),
            email: cleanEmail,
            role: (profile?.role as UserRole) || (data.user.user_metadata?.role as UserRole) || 'STUDENT',
            avatar: profile?.avatar || data.user.user_metadata?.avatar,
          };
          setUser(authUser);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('[Auth] Supabase login error:', err);
      }
    }

    // 2. Faculty demo / directory account matching
    const matchedFacultyUser = SEED_USERS.find(
      (u) => u.role === 'FACULTY' && (u.email === cleanEmail || cleanEmail.includes(u.email.split('@')[0]))
    );
    const matchedFacultySeed = SEED_FACULTY.find(
      (f) => f.email.toLowerCase() === cleanEmail || (cleanEmail.includes('faculty') && f.id === 'fac-scse-01')
    );

    if (matchedFacultyUser || matchedFacultySeed || cleanEmail.includes('faculty') || cleanEmail.includes('prof') || cleanEmail.includes('dr.')) {
      if (password && password !== 'Faculty@123' && password !== 'Campus@123') {
        return { success: false, error: 'Invalid password. Hint: Faculty@123' };
      }
      const facObj: User = matchedFacultyUser || {
        id: matchedFacultySeed ? `user-${matchedFacultySeed.id}` : 'user-faculty',
        name: matchedFacultySeed ? matchedFacultySeed.name : 'Dr. Ramesh Kumar',
        email: cleanEmail,
        role: 'FACULTY' as UserRole,
        avatar: matchedFacultySeed?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        department: matchedFacultySeed?.departmentName || 'School of Computing Science & Engineering',
        regNumber: `FAC-${matchedFacultySeed?.school || 'SCSE'}-${matchedFacultySeed?.cabinNumber.replace(/[^0-9]/g, '') || '314'}`,
        facultyId: matchedFacultySeed?.id || 'fac-scse-01',
        cabinNumber: matchedFacultySeed?.cabinNumber || 'AB1-314',
      };
      setUser(facObj);
      api.login(cleanEmail, password || 'Faculty@123', 'FACULTY').catch(() => {});
      return { success: true };
    }

    // 3. Demo role account matching
    const adminUser = SEED_USERS.find((u) => u.role === 'ADMIN') || SEED_USERS[0];
    const studentUser = SEED_USERS.find((u) => u.role === 'STUDENT') || SEED_USERS[1];
    const publisherUser = SEED_USERS.find((u) => u.role === 'PUBLISHER') || SEED_USERS[2];

    if (cleanEmail === 'admin@vitbhopal.ac.in') {
      if (password && password !== 'Admin@123') {
        return { success: false, error: 'Invalid password. Hint: Admin@123' };
      }
      setUser(adminUser);
      api.login(cleanEmail, password || 'Admin@123', 'ADMIN').catch(() => {});
      return { success: true };
    }

    if (cleanEmail === 'student@vitbhopal.ac.in') {
      if (password && password !== 'Student@123') {
        return { success: false, error: 'Invalid password. Hint: Student@123' };
      }
      setUser(studentUser);
      api.login(cleanEmail, password || 'Student@123', 'STUDENT').catch(() => {});
      return { success: true };
    }

    if (cleanEmail === 'aiclub@vitbhopal.ac.in') {
      if (password && password !== 'Publisher@123') {
        return { success: false, error: 'Invalid password. Hint: Publisher@123' };
      }
      setUser(publisherUser);
      api.login(cleanEmail, password || 'Publisher@123', 'PUBLISHER').catch(() => {});
      return { success: true };
    }

    // Generic registration/login fallback
    const targetRole = requestedRole || (cleanEmail.includes('admin')
      ? 'ADMIN'
      : cleanEmail.includes('faculty') || cleanEmail.includes('prof') || cleanEmail.includes('dr.')
      ? 'FACULTY'
      : cleanEmail.includes('club') || cleanEmail.includes('pub')
      ? 'PUBLISHER'
      : 'STUDENT');

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0].toUpperCase(),
      email: cleanEmail,
      role: targetRole,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    };
    setUser(newUser);
    api.login(cleanEmail, password || 'Campus@123', targetRole).catch(() => {});
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    api.logout().catch(() => {});
    setUser(null);
  };

  const quickSwitchUser = async (targetRole: UserRole) => {
    const adminUser = SEED_USERS.find((u) => u.role === 'ADMIN') || SEED_USERS[0];
    const facultyUser = SEED_USERS.find((u) => u.role === 'FACULTY') || {
      id: 'user-faculty',
      name: 'Dr. Ramesh Kumar',
      email: 'faculty@vitbhopal.ac.in',
      role: 'FACULTY' as UserRole,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      department: 'School of Computing Science & Engineering',
      regNumber: 'FAC-SCSE-314',
      cabinNumber: 'AB1-314',
    };
    const studentUser = SEED_USERS.find((u) => u.role === 'STUDENT') || SEED_USERS[1];
    const publisherUser = SEED_USERS.find((u) => u.role === 'PUBLISHER') || SEED_USERS[2];

    if (targetRole === 'ADMIN') {
      setUser(adminUser);
      api.quickSwitch('ADMIN').catch(() => {});
    } else if (targetRole === 'FACULTY') {
      setUser(facultyUser);
      api.quickSwitch('FACULTY').catch(() => {});
    } else if (targetRole === 'STUDENT') {
      setUser(studentUser);
      api.quickSwitch('STUDENT').catch(() => {});
    } else if (targetRole === 'PUBLISHER') {
      setUser(publisherUser);
      api.quickSwitch('PUBLISHER').catch(() => {});
    } else {
      setUser(null); // GUEST
      setAuthToken(null);
    }
  };

  const quickLoginAs = async (demoRole: UserRole) => {
    await quickSwitchUser(demoRole);
  };

  const loginAsFaculty = async (facultyIdOrEmail: string) => {
    const fSeed = SEED_FACULTY.find(
      (f) => f.id === facultyIdOrEmail || f.email.toLowerCase() === facultyIdOrEmail.toLowerCase()
    ) || SEED_FACULTY[0];

    const matchedUser = SEED_USERS.find(
      (u) => u.facultyId === fSeed.id || u.email.toLowerCase() === fSeed.email.toLowerCase()
    );

    const targetUser: User = matchedUser || {
      id: `user-${fSeed.id}`,
      name: fSeed.name,
      email: fSeed.email,
      role: 'FACULTY',
      avatar: fSeed.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      department: fSeed.departmentName,
      regNumber: `FAC-${fSeed.school}-${fSeed.cabinNumber.replace(/[^0-9]/g, '')}`,
      facultyId: fSeed.id,
      cabinNumber: fSeed.cabinNumber,
    };

    setUser(targetUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
    await api.login(targetUser.email, 'Faculty@123', 'FACULTY').catch(() => {});
  };

  const register = async (name: string, email: string, role: UserRole) => {
    const cleanEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: 'Campus@123',
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name,
            email: cleanEmail,
            role,
          });
        } catch (e) {
          console.warn('[Auth] Profile creation notice:', e);
        }
      }
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email: cleanEmail,
      role,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    };
    setUser(newUser);
    api.login(email, 'Campus@123', role).catch(() => {});
    return { success: true };
  };

  const role: UserRole = user ? user.role : 'GUEST';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        login,
        logout,
        quickSwitchUser,
        quickLoginAs,
        loginAsFaculty,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
