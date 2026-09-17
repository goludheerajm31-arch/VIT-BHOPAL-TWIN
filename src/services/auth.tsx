import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { SEED_USERS } from './data/seeds';
import { api, setAuthToken, getAuthToken } from './api';
import { realtimeClient } from './realtime';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  logout: () => void;
  quickSwitchUser: (role: UserRole) => void;
  quickLoginAs: (role: UserRole) => void;
  register: (name: string, email: string, role: UserRole) => { success: boolean };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'vit_digital_twin_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return SEED_USERS[1]; // Aarav Patel (Student) default
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

  // Connect realtime SSE when app mounts
  useEffect(() => {
    realtimeClient.connect();
    return () => {
      realtimeClient.disconnect();
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
      }).catch(() => {
        // If token expired, fall back gracefully
      });
    }
  }, []);

  const login = (email: string, password?: string, requestedRole?: UserRole): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // Check known demo accounts for quick match
    if (cleanEmail === 'admin@vitbhopal.ac.in') {
      if (password && password !== 'Admin@123') {
        return { success: false, error: 'Invalid password. Hint: Admin@123' };
      }
      setUser(SEED_USERS[0]);
      api.login(cleanEmail, password || 'Admin@123', 'ADMIN').catch(() => {});
      return { success: true };
    }

    if (cleanEmail === 'student@vitbhopal.ac.in') {
      if (password && password !== 'Student@123') {
        return { success: false, error: 'Invalid password. Hint: Student@123' };
      }
      setUser(SEED_USERS[1]);
      api.login(cleanEmail, password || 'Student@123', 'STUDENT').catch(() => {});
      return { success: true };
    }

    if (cleanEmail === 'aiclub@vitbhopal.ac.in') {
      if (password && password !== 'Publisher@123') {
        return { success: false, error: 'Invalid password. Hint: Publisher@123' };
      }
      setUser(SEED_USERS[2]);
      api.login(cleanEmail, password || 'Publisher@123', 'PUBLISHER').catch(() => {});
      return { success: true };
    }

    // Generic registration/login fallback
    const targetRole = requestedRole || (cleanEmail.includes('admin')
      ? 'ADMIN'
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

  const logout = () => {
    api.logout().catch(() => {});
    setUser(null);
  };

  const quickSwitchUser = (targetRole: UserRole) => {
    if (targetRole === 'ADMIN') {
      setUser(SEED_USERS[0]);
      api.quickSwitch('ADMIN').catch(() => {});
    } else if (targetRole === 'STUDENT') {
      setUser(SEED_USERS[1]);
      api.quickSwitch('STUDENT').catch(() => {});
    } else if (targetRole === 'PUBLISHER') {
      setUser(SEED_USERS[2]);
      api.quickSwitch('PUBLISHER').catch(() => {});
    } else {
      setUser(null); // GUEST
      setAuthToken(null);
    }
  };

  const quickLoginAs = (demoRole: UserRole) => {
    quickSwitchUser(demoRole);
  };

  const register = (name: string, email: string, role: UserRole) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email: email.toLowerCase().trim(),
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
