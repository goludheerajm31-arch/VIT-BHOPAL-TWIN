import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, UserRoleRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storage, DATA_CHANGE_EVENT } from './storage';
import { realtimeClient } from './realtime';
import { normalizeEmail, isInstitutionalEmail } from '../lib/facultyAuthUtils';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';

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
  switchActiveRole?: (newRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Authoritative identity & capability resolution:
   * Maps a Supabase Auth identity (auth.users.id UUID + verified email)
   * to application profile and database-based authorization records (students, faculty, publishers, user_roles).
   * public.user_roles is the primary authority for multi-role permissions.
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

      // 4. Query public.user_roles directly from Supabase for this authenticated user
      let activeDbRoles: UserRoleRecord[] = [];
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .or(`user_id.eq.${authUserId},email.eq.${cleanEmail}`)
          .eq('status', 'ACTIVE');

        if (!rolesError && Array.isArray(rolesData)) {
          activeDbRoles = rolesData.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            email: r.email,
            role: r.role as UserRole,
            status: r.status,
            grantedBy: r.granted_by,
            grantedAt: r.granted_at,
            revokedAt: r.revoked_at,
            organization: r.organization,
            notes: r.notes,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        }
      } catch (err) {
        console.warn('[Auth] Supabase user_roles fetch warning:', err);
      }

      // Fallback/augment with in-memory sync if available
      const memoryRoleRecords = storage
        .getUserRoleRecords()
        .filter(
          (r) =>
            r.status === 'ACTIVE' &&
            (r.userId === authUserId || normalizeEmail(r.email) === cleanEmail)
        );

      const combinedRoles = [...activeDbRoles, ...memoryRoleRecords];

      // 5. Derive authorized roles strictly from database records
      const authorizedRoles = new Set<UserRole>();

      // Admin role strictly from active record in user_roles
      const hasAdminRole = combinedRoles.some((r) => r.role === 'ADMIN');
      if (hasAdminRole) {
        authorizedRoles.add('ADMIN');
      }

      // Faculty role from user_roles or non-disabled faculty directory record
      const hasFacultyRole = combinedRoles.some((r) => r.role === 'FACULTY') || (faculty && faculty.status !== 'DISABLED');
      if (hasFacultyRole) {
        authorizedRoles.add('FACULTY');
      }

      // Publisher role from user_roles or active publisher record
      const hasPubRole = combinedRoles.some((r) => r.role === 'PUBLISHER') || (hasPublisherRole && publisher?.status !== 'DISABLED');
      if (hasPubRole) {
        authorizedRoles.add('PUBLISHER');
      }

      // Student role from user_roles, student record, or default for institutional user
      const hasStudentRole = combinedRoles.some((r) => r.role === 'STUDENT') || student || (!hasAdminRole && !hasFacultyRole);
      if (hasStudentRole) {
        authorizedRoles.add('STUDENT');
      }

      const rolesList = Array.from(authorizedRoles);

      // Primary role designation
      const primaryRole: UserRole = hasAdminRole
        ? 'ADMIN'
        : hasFacultyRole
        ? 'FACULTY'
        : hasPubRole && !hasStudentRole
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
        (hasAdminRole ? 'Dean Office & IT Governance' : 'Student Body');

      const appUser: User = {
        id: authUserId, // Canonical Supabase Auth UUID
        name: userName,
        email: cleanEmail,
        role: primaryRole,
        roles: rolesList,
        isPublisher: rolesList.includes('PUBLISHER'),
        isMasterAdmin: hasAdminRole,
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
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[Supabase Auth] Session fetch error:', error.message);
      }
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

    // Connect Realtime public stream
    realtimeClient.connect();

    // 1. Initial getSession call
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('[Supabase Auth] Initial getSession error:', error.message);
        }
        if (session?.user) {
          try {
            const u = await resolveAuthoritativeUser(session.user);
            if (isMounted) {
              setCurrentUser(u);
              realtimeClient.syncAuth(u);
            }
          } catch (e) {
            console.error('[Supabase Auth] Failed resolving user on session load:', e);
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            realtimeClient.syncAuth(null);
          }
        }
        if (isMounted) setLoading(false);
      })
      .catch((err) => {
        console.warn('[Supabase Auth] Session fetch exception:', err);
        if (isMounted) setLoading(false);
      });

    // 2. Subscribe to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setCurrentUser(null);
          realtimeClient.syncAuth(null);
          setLoading(false);
        } else if (session?.user) {
          try {
            const u = await resolveAuthoritativeUser(session.user);
            if (isMounted) {
              setCurrentUser(u);
              realtimeClient.syncAuth(u);
              setLoading(false);
            }
          } catch (err) {
            console.error('[Supabase Auth] Auth state change resolution error:', err);
            if (isMounted) setLoading(false);
          }
        }
      }
    );

    // 3. Re-evaluate authorization on storage data updates
    const handleDataChange = async () => {
      if (!isMounted) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = await resolveAuthoritativeUser(session.user);
        if (isMounted && u) setCurrentUser(u);
      }
    };

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange);
    };
  }, [resolveAuthoritativeUser]);

  // Universal Sign-In with Email and Password strictly using Supabase Auth
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

  // Universal Sign-Out strictly through Supabase Auth
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase Auth] SignOut warning:', err);
    } finally {
      realtimeClient.syncAuth(null);
      setCurrentUser(null);
      sessionStorage.removeItem('vit_twin_auth_entry_point');
    }
  };

  // Switch UI active role strictly between legitimate roles assigned in user.roles
  const switchActiveRole = (newRole: UserRole): boolean => {
    if (!currentUser) return false;
    // CRITICAL SECURITY RULE: Only allow switching to roles actually assigned in user.roles
    if (!currentUser.roles?.includes(newRole)) {
      console.warn(`[Auth] Cannot switch to role "${newRole}" because it is not assigned to this user.`);
      return false;
    }

    setCurrentUser({
      ...currentUser,
      role: newRole,
    });
    return true;
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
        switchActiveRole,
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
