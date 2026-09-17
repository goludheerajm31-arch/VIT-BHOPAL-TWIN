import {
  CampusLocation,
  CampusEvent,
  Announcement,
  Publisher,
  FacultyMember,
  FacultyStatus,
  User,
} from '../types';

const TOKEN_KEY = 'vit_digital_twin_jwt_token_v1';
const AUTH_USER_KEY = 'vit_digital_twin_auth_user_v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role || null;
  } catch (_) {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const currentRole = getCurrentUserRole();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (currentRole) {
    headers['X-Campus-Role'] = currentRole;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password?: string, role?: string) {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    setAuthToken(data.token);
    return data;
  },

  async quickSwitch(targetRole: string) {
    const data = await request<{ token: string; user: User }>('/api/auth/quick-switch', {
      method: 'POST',
      body: JSON.stringify({ targetRole }),
    });
    setAuthToken(data.token);
    return data;
  },

  async getMe() {
    return request<{ user: User | null }>('/api/auth/me');
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  // Locations
  async getLocations(): Promise<CampusLocation[]> {
    return request<CampusLocation[]>('/api/locations');
  },

  async getLocationById(id: string): Promise<CampusLocation> {
    return request<CampusLocation>(`/api/locations/${id}`);
  },

  async saveLocation(loc: CampusLocation): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>('/api/locations', {
      method: 'POST',
      body: JSON.stringify(loc),
    });
  },

  // Events
  async getEvents(): Promise<CampusEvent[]> {
    return request<CampusEvent[]>('/api/events');
  },

  async getEventById(id: string): Promise<CampusEvent> {
    return request<CampusEvent>(`/api/events/${id}`);
  },

  async saveEvent(event: CampusEvent): Promise<{ success: boolean; id: string; version: number }> {
    return request<{ success: boolean; id: string; version: number }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  async deleteEvent(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },

  async updateEventStatus(id: string, approvalStatus: 'approved' | 'rejected' | 'pending'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ approvalStatus }),
    });
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return request<Announcement[]>('/api/announcements');
  },

  async saveAnnouncement(announcement: Announcement): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  // Faculty Directory
  async getFaculty(): Promise<FacultyMember[]> {
    return request<FacultyMember[]>('/api/faculty');
  },

  async saveFaculty(fac: FacultyMember): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>('/api/faculty', {
      method: 'POST',
      body: JSON.stringify(fac),
    });
  },

  async deleteFaculty(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/faculty/${id}`, {
      method: 'DELETE',
    });
  },

  async updateFacultyStatus(id: string, status: FacultyStatus): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/faculty/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async resetFaculty(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/faculty/reset', {
      method: 'POST',
    });
  },

  // Publishers
  async getPublishers(): Promise<Publisher[]> {
    return request<Publisher[]>('/api/publishers');
  },

  async togglePublisherVerification(id: string): Promise<{ success: boolean; verified: boolean }> {
    return request<{ success: boolean; verified: boolean }>(`/api/publishers/${id}/toggle-verify`, {
      method: 'PATCH',
    });
  },

  // Saved Bookmarks
  async getSavedEvents(): Promise<string[]> {
    return request<string[]>('/api/saved/events');
  },

  async toggleSaveEvent(eventId: string): Promise<{ saved: boolean }> {
    return request<{ saved: boolean }>('/api/saved/events/toggle', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  },

  async getSavedLocations(): Promise<string[]> {
    return request<string[]>('/api/saved/locations');
  },

  async toggleSaveLocation(locationId: string): Promise<{ saved: boolean }> {
    return request<{ saved: boolean }>('/api/saved/locations/toggle', {
      method: 'POST',
      body: JSON.stringify({ locationId }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<any[]> {
    return request<any[]>('/api/admin/audit-logs');
  },
};
