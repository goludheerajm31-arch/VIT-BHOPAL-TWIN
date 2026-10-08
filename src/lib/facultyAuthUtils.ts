/**
 * Institutional Email & Faculty Provisioning Utilities
 * Canonical validation for VIT Bhopal University accounts
 */

export const INSTITUTIONAL_DOMAIN = '@vitbhopal.ac.in';

/**
 * Normalizes an email address to lowercase and trimmed string.
 * Canonical business identifier for faculty records.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Validates that an email belongs to the institutional domain @vitbhopal.ac.in
 */
export function isInstitutionalEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  // Must have a local part before the domain and exactly match the domain
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  return localPart.length > 0 && domain === 'vitbhopal.ac.in' && !localPart.includes(' ');
}

/**
 * Validates faculty email input for admin provisioning
 */
export function validateFacultyEmail(email: string | null | undefined): {
  isValid: boolean;
  error?: string;
  normalized: string;
} {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return {
      isValid: false,
      error: 'Institutional email address is required.',
      normalized: '',
    };
  }

  if (!isInstitutionalEmail(normalized)) {
    return {
      isValid: false,
      error: `Faculty email must be a valid institutional address ending with ${INSTITUTIONAL_DOMAIN}.`,
      normalized,
    };
  }

  return {
    isValid: true,
    normalized,
  };
}
