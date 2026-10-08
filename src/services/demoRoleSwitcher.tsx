import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { useAuth } from './auth';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Isolated Temporary Professor Demonstration Layer
 *
 * CRITICAL SECURITY & ARCHITECTURE GUARANTEE:
 * - This switcher is strictly a transient client-side UI simulation layer for professor demonstrations.
 * - It DOES NOT modify the user's actual Supabase Auth identity or token.
 * - It DOES NOT alter database roles in PostgreSQL.
 * - It DOES NOT write to the user's profile table or user_roles table.
 * - It DOES NOT bypass Row Level Security (RLS) or backend authorization.
 * - After the demonstration, this entire module can be disabled via VITE_DEMO_MODE=false
 *   or removed without modifying real authentication or database logic.
 */

// Controlled by explicit environment variable (defaults to true in dev for presentation)
export const isDemoModeEnabled = (): boolean => {
  const envVal = (import.meta as any).env?.VITE_DEMO_MODE;
  if (envVal === 'false' || envVal === '0') return false;
  return true;
};

interface DemoRoleContextType {
  activeRole: UserRole;
  realRole: UserRole;
  isSimulated: boolean;
  setDemoRole: (role: UserRole) => void;
  resetDemoRole: () => void;
  isDemoActive: boolean;
}

const DemoRoleContext = createContext<DemoRoleContextType | undefined>(undefined);

export const DemoRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role: realAuthRole, user, switchMasterRole } = useAuth();
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const demoActive = isDemoModeEnabled();

  // Reset simulated override when real user changes or signs out
  useEffect(() => {
    setSimulatedRole(null);
  }, [realAuthRole]);

  const activeRole: UserRole = user?.isMasterAdmin
    ? realAuthRole
    : demoActive && simulatedRole !== null
    ? simulatedRole
    : realAuthRole;

  const isSimulated = !user?.isMasterAdmin && demoActive && simulatedRole !== null && simulatedRole !== realAuthRole;

  const setDemoRole = async (newRole: UserRole) => {
    // If master administrator, execute backend-authorized role switch
    if (user?.isMasterAdmin && switchMasterRole) {
      await switchMasterRole(newRole);
      return;
    }

    if (!demoActive) return;
    setSimulatedRole(newRole);
    console.info(`[DemoRoleSwitcher] UI simulated perspective shifted to: ${newRole}. Database & RLS remain authoritative.`);
  };

  const resetDemoRole = () => {
    setSimulatedRole(null);
  };

  return (
    <DemoRoleContext.Provider
      value={{
        activeRole,
        realRole: realAuthRole,
        isSimulated,
        setDemoRole,
        resetDemoRole,
        isDemoActive: demoActive,
      }}
    >
      {children}
    </DemoRoleContext.Provider>
  );
};

export const useDemoRole = () => {
  const context = useContext(DemoRoleContext);
  if (!context) {
    // Graceful fallback if provider not mounted
    return {
      activeRole: 'GUEST' as UserRole,
      realRole: 'GUEST' as UserRole,
      isSimulated: false,
      setDemoRole: () => {},
      resetDemoRole: () => {},
      isDemoActive: false,
    };
  }
  return context;
};

const ROLES_LIST: { id: UserRole; label: string }[] = [
  { id: 'STUDENT', label: 'Student' },
  { id: 'FACULTY', label: 'Faculty' },
  { id: 'PUBLISHER', label: 'Publisher' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'GUEST', label: 'Guest' },
];

/**
 * Visual Role Switcher Dropdown
 * Exactly matches the professor demonstration specification:
 * - Current role pill: "Admin ˅"
 * - Compact floating panel with "ROLE" title
 * - White/translucent surface, rounded-2xl, soft shadow, generous spacing
 * - Selected role gets blue rounded background with white checkmark
 */
export const DemoRoleSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { activeRole, setDemoRole, isDemoActive, isSimulated } = useDemoRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isDemoActive) {
    // If demo mode is disabled, render nothing or static read-only label
    return null;
  }

  // Find human-readable label
  const currentLabel = ROLES_LIST.find((r) => r.id === activeRole)?.label || activeRole;

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Current Role Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isSimulated ? `Simulated: ${currentLabel} (Demo Mode)` : `Role: ${currentLabel}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] hover:bg-black/[0.07] text-[#1D1D1F] border border-black/[0.06] transition-all cursor-pointer shadow-2xs"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#86868B] transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#1D1D1F]' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Demo role selector"
          className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-black/[0.08] p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
            ROLE
          </div>

          {/* Role Items */}
          <div className="space-y-0.5">
            {ROLES_LIST.map((r) => {
              const isSelected = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDemoRole(r.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071E3] text-white shadow-2xs font-semibold'
                      : 'text-[#1D1D1F] hover:bg-black/[0.04] font-medium'
                  }`}
                >
                  <span>{r.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
