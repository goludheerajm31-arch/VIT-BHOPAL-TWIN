import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storage, DATA_CHANGE_EVENT } from './storage';
import { normalizeEmail, isInstitutionalEmail } from '../lib/facultyAuthUtils';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';

const FIXED_DEMO_EMAILS = new Set([
  'admin@vitbhopal.ac.in',
  'faculty.demo@vitbhopal.ac.in',
  'student.demo@vitbhopal.ac.in',
  'publisher.demo@vitbhopal.ac.in',
]);

export interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  role: UserRole;
  roles: UserRole[];
  isAuthenticated: boolean;
  loading: boolean;
  getCurrentUser: () => User | null;
  getRole: () => UserRole;
  signIn: (
    email: string,
    password: string,
    entryPoint?: UserRole
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  login: (
    email: string,
    password: string,
    entryPoint?: UserRole
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  signInWithGoogle: (entryPoint?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchMasterRole?: (newRole: UserRole) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Authoritative identity & capability resolution:
   * Maps a Supabase Auth identity (auth.users.id UUID + verified email)
   * to application profile and database-based authorization records (students, faculty, publishers, user_roles).
   */
  const resolveAuthoritativeUser = useCallback(
    async (supabaseUser: SupabaseAuthUser): Promise<User | null> => {
      const authUserId = supabaseUser.id; // Canonical UUID identity
      const cleanEmail = normalizeEmail(supabaseUser.email || '');

      if (!cleanEmail) {
        return null;
      }

      // Check for institutional domain
      const isInstitutional = isInstitutionalEmail(cleanEmail);

      // 1. Authoritative Student record matching
      let student =
        storage.getStudentByAuthUserId(authUserId) ||
        storage.getStudentByEmail(cleanEmail);

      // Claim student record if matched by email and not yet bound
      if (student && (!student.auth_user_id || student.auth_user_id !== authUserId)) {
        try {
          const claimRes = await storage.claimStudentProfile(authUserId, cleanEmail);
          if (claimRes.claimed && claimRes.student) {
            student = claimRes.student;
          }
        } catch (e) {
          console.warn('[Auth] Notice claiming student record:', e);
        }
      }

      // 2. Authoritative Faculty record matching (only valid if institutional domain)
      let faculty =
        storage.getFacultyByAuthUserId(authUserId) ||
        (isInstitutional ? storage.getFacultyByEmail(cleanEmail) : undefined);

      if (faculty && faculty.status !== 'DISABLED') {
        if (!faculty.auth_user_id || faculty.auth_user_id !== authUserId) {
          try {
            await storage.claimFacultyProfile(authUserId, cleanEmail);
            faculty = storage.getFacultyByEmail(cleanEmail);
          } catch (e) {
            console.warn('[Auth] Notice claiming faculty profile:', e);
          }
        }
      }

      // 3. Authoritative Publisher authorization
      let publisher =
        storage.getPublisherByUserId(authUserId) ||
        storage.getPublisherByEmail(cleanEmail);

      const hasPublisherRole = storage.hasPublisherAccess(cleanEmail) || storage.hasPublisherAccess(authUserId);

      if (hasPublisherRole && (!publisher?.userId || publisher.userId !== authUserId)) {
        try {
          await storage.claimPublisherAccess(authUserId, cleanEmail);
          publisher = storage.getPublisherByEmail(cleanEmail);
        } catch (e) {
          console.warn('[Auth] Notice claiming publisher authorization:', e);
        }
      }

      // 4. Centralized User Roles table lookup (ADMIN, PUBLISHER, etc.)
      const activeRoleRecords = storage
        .getUserRoleRecords()
        .filter(
          (r) =>
            r.status === 'ACTIVE' &&
            (r.userId === authUserId || normalizeEmail(r.email) === cleanEmail)
        );

      // 5. Derive authorized roles strictly from database records
      const authorizedRoles = new Set<UserRole>();

      // Admin access: explicitly provisioned in user_roles or system administrator email
      const isAdminAccount =
        activeRoleRecords.some((r) => r.role === 'ADMIN') ||
        cleanEmail === 'admin@vitbhopal.ac.in';

      if (isAdminAccount) {
        authorizedRoles.add('ADMIN');
      }

      // Faculty access: verified non-disabled faculty directory record
      if (faculty && faculty.status !== 'DISABLED') {
        authorizedRoles.add('FACULTY');
      }

      // Publisher access: active publisher record or granted publisher role
      if (hasPublisherRole && publisher?.status !== 'DISABLED') {
        authorizedRoles.add('PUBLISHER');
      }

      // Student access: student record or standard institutional student identity
      if (student || (!isAdminAccount && !faculty)) {
        authorizedRoles.add('STUDENT');
      }

      const rolesList = Array.from(authorizedRoles);

      // Primary role designation
      const primaryRole: UserRole = isAdminAccount
        ? 'ADMIN'
        : faculty && faculty.status !== 'DISABLED'
        ? 'FACULTY'
        : rolesList.includes('PUBLISHER') && !rolesList.includes('STUDENT')
        ? 'PUBLISHER'
        : 'STUDENT';

      const userName =
        faculty?.name ||
        student?.fullName ||
        publisher?.organizationName ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        cleanEmail.split('@')[0];

      const userDepartment =
        faculty?.departmentName ||
        student?.department ||
        student?.branch ||
        (isAdminAccount ? 'Dean Office & IT Governance' : 'Student Body');

      const appUser: User = {
        id: authUserId, // Canonical Supabase Auth UUID
        name: userName,
        email: cleanEmail,
        role: primaryRole,
        roles: rolesList,
        isPublisher: rolesList.includes('PUBLISHER'),
        publisherId: publisher?.id,
        publisherStatus: publisher?.status,
        facultyId: faculty?.id,
        cabinNumber: faculty?.cabinNumber,
        department: userDepartment,
        regNumber: student?.registrationNumber,
        avatar:
          faculty?.avatarUrl ||
          supabaseUser.user_metadata?.avatar_url ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      };

      return appUser;
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const masterToken = sessionStorage.getItem('vit_master_token');
    if (masterToken) {
      try {
        const res = await fetch('/api/auth/demo-session', {
          headers: { Authorization: `Bearer ${masterToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
            return;
          }
        }
      } catch (err) {
        console.warn('[Demo Auth] Session refresh notice:', err);
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = await resolveAuthoritativeUser(session.user);
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.warn('[Auth] Error refreshing user session:', err);
    }
  }, [resolveAuthoritativeUser]);

  // Initial session restoration and Supabase Auth state change subscription
  useEffect(() => {
    let isMounted = true;

    const checkSupabaseSession = () => {
      supabase.auth
        .getSession()
        .then(({ data: { session }, error }) => {
          if (!isMounted) return;
          if (error) {
            console.warn('[Supabase Auth] Get session notice:', error.message);
          }
          if (session?.user) {
            resolveAuthoritativeUser(session.user).then((u) => {
              if (isMounted) {
                setCurrentUser(u);
                setLoading(false);
              }
            });
          } else {
            setLoading(false);
          }
        })
        .catch((err) => {
          console.warn('[Supabase Auth] Session fetch error:', err);
          if (isMounted) setLoading(false);
        });
    };

    // 1. Check for dedicated master / demo administrator session token
    const masterToken = sessionStorage.getItem('vit_master_token');
    if (masterToken) {
      fetch('/api/auth/demo-session', {
        headers: { Authorization: `Bearer ${masterToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted) return;
          if (data && data.success && data.user) {
            setCurrentUser(data.user);
            setLoading(false);
          } else {
            sessionStorage.removeItem('vit_master_token');
            checkSupabaseSession();
          }
        })
        .catch(() => {
          if (!isMounted) return;
          sessionStorage.removeItem('vit_master_token');
          checkSupabaseSession();
        });
    } else {
      checkSupabaseSession();
    }

    // 2. Subscribe to Supabase auth state changes for normal users
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        // Don't overwrite if master admin session is active
        if (sessionStorage.getItem('vit_master_token')) return;

        if (event === 'SIGNED_OUT' || !session) {
          setCurrentUser(null);
          setLoading(false);
        } else if (session?.user) {
          const u = await resolveAuthoritativeUser(session.user);
          if (isMounted) {
            setCurrentUser(u);
            setLoading(false);
          }
        }
      }
    );

    // 3. Re-evaluate authorization on database changes (e.g., publisher approval)
    const handleDataChange = async () => {
      if (!isMounted) return;
      if (sessionStorage.getItem('vit_master_token')) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = await resolveAuthoritativeUser(session.user);
        if (isMounted) setCurrentUser(u);
      }
    };

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange);
    };
  }, [resolveAuthoritativeUser]);

  // Universal Sign-In with Email and Password
  const signInWithPassword = async (
    email: string,
    password: string,
    entryPoint?: UserRole
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      return { success: false, error: 'Institutional email address is required.' };
    }
    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    // =========================================================================
    // DEDICATED BACKEND PATH FOR FIXED DEMO ACCOUNTS (EXTERNAL TO SUPABASE AUTH)
    // 1. Master Admin (admin@vitbhopal.ac.in)
    // 2. Demo Faculty (faculty.demo@vitbhopal.ac.in)
    // 3. Demo Student (student.demo@vitbhopal.ac.in)
    // 4. Demo Publisher (publisher.demo@vitbhopal.ac.in)
    // =========================================================================
    if (FIXED_DEMO_EMAILS.has(cleanEmail)) {
      try {
        const response = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            entryPoint,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          return {
            success: false,
            error: data.error || 'Demo authentication failed.',
          };
        }

        if (data.token) {
          sessionStorage.setItem('vit_master_token', data.token);
        }
        setCurrentUser(data.user);
        return { success: true, user: data.user };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'Server error contacting demo authentication service.',
        };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Authentication failed. No user identity returned.' };
      }

      const resolved = await resolveAuthoritativeUser(data.user);
      if (!resolved) {
        return { success: false, error: 'Could not load application profile.' };
      }

      // Check requested entry point against authoritative database authorization
      if (entryPoint === 'ADMIN' && !resolved.roles?.includes('ADMIN')) {
        return {
          success: false,
          error: `Unauthorized: Your account (${cleanEmail}) does not possess institutional administrative credentials.`,
          user: resolved,
        };
      }

      if (entryPoint === 'FACULTY' && !resolved.roles?.includes('FACULTY')) {
        return {
          success: false,
          error: `Faculty profile not found for "${cleanEmail}". Please apply for faculty access or sign in via the Student portal.`,
          user: resolved,
        };
      }

      if (entryPoint === 'PUBLISHER' && !resolved.roles?.includes('PUBLISHER')) {
        return {
          success: false,
          error: `Publisher access is not active for this account. Please sign in as a Student and apply for Publisher Access in your profile.`,
          user: resolved,
        };
      }

      setCurrentUser(resolved);
      return { success: true, user: resolved };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Authentication error occurred.' };
    }
  };

  // Universal Sign-In with Google OAuth
  const signInWithGoogle = async (
    entryPoint?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (entryPoint) {
        sessionStorage.setItem('vit_twin_auth_entry_point', entryPoint);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            hd: 'vitbhopal.ac.in',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google OAuth failed to initialize.' };
    }
  };

  // Universal Sign-Up with Email and Password
  const signUpWithPassword = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      return { success: false, error: 'Institutional email is required.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName || cleanEmail.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const resolved = await resolveAuthoritativeUser(data.user);
        if (resolved) setCurrentUser(resolved);
        return { success: true, message: 'Account created and signed in successfully!' };
      }

      return {
        success: true,
        message: 'Account created! Please check your institutional email if verification is required.',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Signup error occurred.' };
    }
  };

  // Universal Password Reset via Supabase Auth
  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = normalizeEmail(email);
    try {
      if (cleanEmail) {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      }
      // Generic response that does not expose whether an email has an account
      return {
        success: true,
        message:
          'If an account exists for this institutional email address, password reset instructions have been dispatched to your inbox.',
      };
    } catch {
      return {
        success: true,
        message:
          'If an account exists for this institutional email address, password reset instructions have been dispatched to your inbox.',
      };
    }
  };

  // Universal Sign-Out
  const signOut = async () => {
    const masterToken = sessionStorage.getItem('vit_master_token');
    if (masterToken) {
      try {
        await fetch('/api/auth/demo-logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${masterToken}` },
        });
      } catch (e) {
        // Ignore network errors on logout
      }
      sessionStorage.removeItem('vit_master_token');
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase Auth] SignOut warning:', err);
    } finally {
      setCurrentUser(null);
      sessionStorage.removeItem('vit_twin_auth_entry_point');
    }
  };

  // Master / Demo Account backend-authorized role switch
  const switchMasterRole = async (newRole: UserRole): Promise<boolean> => {
    const masterToken = sessionStorage.getItem('vit_master_token');
    if (!masterToken) return false;

    try {
      const res = await fetch('/api/auth/demo-switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${masterToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          if (data.token) {
            sessionStorage.setItem('vit_master_token', data.token);
          }
          setCurrentUser(data.user);
          return true;
        }
      }
    } catch (err) {
      console.warn('[Demo Auth] Role switch failed:', err);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        currentUser,
        role: currentUser ? currentUser.role : 'GUEST',
        roles: currentUser?.roles || (currentUser ? [currentUser.role] : []),
        isAuthenticated: !!currentUser,
        loading,
        getCurrentUser: () => currentUser,
        getRole: () => (currentUser ? currentUser.role : 'GUEST'),
        signIn: signInWithPassword,
        login: signInWithPassword,
        signInWithGoogle,
        signUpWithPassword,
        resetPassword,
        signOut,
        logout: signOut,
        refreshUser,
        switchMasterRole,
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
