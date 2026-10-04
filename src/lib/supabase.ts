import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CampusLocation,
  CampusEvent,
  Announcement,
  Publisher,
  FacultyMember,
  User,
} from '../types';

// Environment variable retrieval
const rawSupabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Clean the project URL (strip /rest/v1 or trailing slashes if user copied REST endpoint instead of Project URL)
const cleanSupabaseUrl = (url: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
};

const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = rawSupabaseAnonKey.trim();

export const isSupabaseConfigured = (): boolean => {
  const isKeyValid =
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.startsWith('http') &&
    supabaseAnonKey !== supabaseUrl;

  const isUrlValid =
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder');

  return isUrlValid && isKeyValid;
};

// Singleton Supabase Client
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Data Mapping Helpers (Database Snake_case <-> Application CamelCase)
 */

export function mapDbToLocation(row: any): CampusLocation {
  let facilities: string[] = [];
  if (Array.isArray(row.facilities)) {
    facilities = row.facilities;
  } else if (typeof row.facilities === 'string') {
    try {
      facilities = JSON.parse(row.facilities);
    } catch {
      facilities = [];
    }
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    building: row.building || undefined,
    floor: row.floor || undefined,
    facilities,
    openingHours: row.opening_hours || undefined,
    accessibility: row.accessibility || undefined,
    image: row.image || undefined,
    zone: row.zone || undefined,
    contactPhone: row.contact_phone || undefined,
  };
}

export function mapLocationToDb(loc: CampusLocation): any {
  return {
    id: loc.id,
    name: loc.name,
    category: loc.category,
    description: loc.description,
    latitude: loc.latitude,
    longitude: loc.longitude,
    building: loc.building || null,
    floor: loc.floor || null,
    facilities: loc.facilities || [],
    opening_hours: loc.openingHours || null,
    accessibility: loc.accessibility || null,
    image: loc.image || null,
    zone: loc.zone || null,
    contact_phone: loc.contactPhone || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToEvent(row: any): CampusEvent {
  let tags: string[] = [];
  if (Array.isArray(row.tags)) {
    tags = row.tags;
  } else if (typeof row.tags === 'string') {
    try {
      tags = JSON.parse(row.tags);
    } catch {
      tags = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || undefined,
    description: row.description || '',
    organizer: row.organizer || 'VIT Bhopal',
    publisherId: row.publisher_id || 'pub-campus',
    locationId: row.location_id || '',
    locationName: row.location_name || '',
    venueDetail: row.venue_detail || undefined,
    date: row.date,
    startTime: row.start_time || '09:00 AM',
    endTime: row.end_time || '05:00 PM',
    category: row.category || 'Technical',
    verified: Boolean(row.verified),
    coverImage: row.cover_image || undefined,
    capacity: row.capacity ? Number(row.capacity) : undefined,
    registrationUrl: row.registration_url || undefined,
    status: row.status || 'upcoming',
    approvalStatus: row.approval_status || 'approved',
    tags,
  };
}

export function mapEventToDb(ev: CampusEvent): any {
  return {
    id: ev.id,
    title: ev.title,
    subtitle: ev.subtitle || null,
    description: ev.description,
    organizer: ev.organizer,
    publisher_id: ev.publisherId,
    location_id: ev.locationId,
    location_name: ev.locationName,
    venue_detail: ev.venueDetail || null,
    date: ev.date,
    start_time: ev.startTime,
    end_time: ev.endTime,
    category: ev.category,
    verified: Boolean(ev.verified),
    cover_image: ev.coverImage || null,
    capacity: ev.capacity || null,
    registration_url: ev.registrationUrl || null,
    status: ev.status || 'upcoming',
    approval_status: ev.approvalStatus || 'approved',
    tags: ev.tags || [],
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToFaculty(row: any): FacultyMember {
  let subjects: string[] = [];
  if (Array.isArray(row.subjects)) {
    subjects = row.subjects;
  } else if (typeof row.subjects === 'string') {
    try {
      subjects = JSON.parse(row.subjects);
    } catch {
      subjects = [];
    }
  }

  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix || undefined,
    designation: row.designation,
    school: row.school,
    departmentName: row.department_name || '',
    cabinNumber: row.cabin_number,
    buildingId: row.building_id,
    buildingName: row.building_name,
    floor: row.floor,
    wing: row.wing || undefined,
    roomDetails: row.room_details || undefined,
    email: row.email,
    phone: row.phone || undefined,
    consultationHours: row.consultation_hours || 'By Appointment',
    subjects,
    researchArea: row.research_area || undefined,
    directionsGuide: row.directions_guide || '',
    status: row.status || 'available',
    avatarUrl: row.avatar_url || undefined,
  };
}

export function mapFacultyToDb(f: FacultyMember): any {
  return {
    id: f.id,
    name: f.name,
    prefix: f.prefix || null,
    designation: f.designation,
    school: f.school,
    department_name: f.departmentName,
    cabin_number: f.cabinNumber,
    building_id: f.buildingId,
    building_name: f.buildingName,
    floor: f.floor,
    wing: f.wing || null,
    room_details: f.roomDetails || null,
    email: f.email,
    phone: f.phone || null,
    consultation_hours: f.consultationHours,
    subjects: f.subjects || [],
    research_area: f.researchArea || null,
    directions_guide: f.directionsGuide,
    status: f.status || 'available',
    avatar_url: f.avatarUrl || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    publisherId: row.publisher_id,
    publisherName: row.publisher_name,
    locationId: row.location_id || undefined,
    locationName: row.location_name || undefined,
    category: row.category,
    priority: row.priority || 'medium',
    actionUrl: row.action_url || undefined,
    verified: Boolean(row.verified),
    status: row.status || (row.verified ? 'approved' : 'pending'),
    authorRole: row.author_role || undefined,
    authorId: row.author_id || undefined,
    authorEmail: row.author_email || undefined,
    authorRegNumber: row.author_reg_number || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapAnnouncementToDb(a: Announcement): any {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    publisher_id: a.publisherId,
    publisher_name: a.publisherName,
    location_id: a.locationId || null,
    location_name: a.locationName || null,
    category: a.category,
    priority: a.priority,
    action_url: a.actionUrl || null,
    verified: Boolean(a.verified),
    status: a.status || (a.verified ? 'approved' : 'pending'),
    author_role: a.authorRole || null,
    author_id: a.authorId || null,
    author_email: a.authorEmail || null,
    author_reg_number: a.authorRegNumber || null,
    reviewed_by: a.reviewedBy || null,
    reviewed_at: a.reviewedAt || null,
    rejection_reason: a.rejectionReason || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToPublisher(row: any): Publisher {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    organizationName: row.organization_name || row.name || 'Campus Organization',
    name: row.organization_name || row.name || 'Campus Organization',
    category: row.category || 'Club',
    description: row.description || '',
    logoUrl: row.logo_url || undefined,
    verified: Boolean(row.verified),
    contactEmail: row.contact_email || '',
    verifiedAt: row.verified_at || undefined,
    department: row.department || row.category || 'Student Club',
  };
}

export function mapPublisherToDb(p: Publisher): any {
  return {
    id: p.id,
    user_id: p.userId || null,
    organization_name: p.organizationName || p.name,
    name: p.organizationName || p.name,
    category: p.category,
    description: p.description,
    logo_url: p.logoUrl || null,
    verified: Boolean(p.verified),
    contact_email: p.contactEmail || '',
    verified_at: p.verifiedAt || (p.verified ? new Date().toISOString() : null),
    department: p.department || null,
    updated_at: new Date().toISOString(),
  };
}
