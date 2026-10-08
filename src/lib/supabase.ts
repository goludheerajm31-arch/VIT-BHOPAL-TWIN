import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CampusLocation,
  CampusEvent,
  Announcement,
  Publisher,
  FacultyMember,
  User,
  CampusGuide,
  GuideAttachment,
  FacultyApplication,
  PublisherApplication,
  StudentRecord,
} from '../types';
import { parseEventDateTimeToIST } from './dateUtils';

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

// Singleton Supabase Client (always non-null so auth listeners never throw null pointers)
const activeUrl = supabaseUrl || 'https://vitbhopal-digital-twin.supabase.co';
const activeKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_anon_key';

export const supabase: SupabaseClient = createClient(activeUrl, activeKey, {
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
});

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

  let posterMetadata = undefined;
  if (row.poster_metadata) {
    if (typeof row.poster_metadata === 'object') {
      posterMetadata = row.poster_metadata;
    } else {
      try {
        posterMetadata = JSON.parse(row.poster_metadata);
      } catch {
        posterMetadata = undefined;
      }
    }
  }

  // Derive public URL from storage path if coverImage is not explicitly set or needs refreshing
  let coverImage = row.cover_image || undefined;
  if (row.storage_path && isSupabaseConfigured() && supabase) {
    const { data: pubUrlData } = supabase.storage.from('event-posters').getPublicUrl(row.storage_path);
    if (pubUrlData?.publicUrl) {
      coverImage = pubUrlData.publicUrl;
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
    coverImage,
    storagePath: row.storage_path || undefined,
    posterMetadata,
    capacity: row.capacity ? Number(row.capacity) : undefined,
    registrationUrl: row.registration_url || undefined,
    status: row.status || 'upcoming',
    approvalStatus: row.approval_status || 'approved',
    tags,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export function mapEventToDb(ev: CampusEvent): any {
  const endEpoch = parseEventDateTimeToIST(ev.date, ev.endTime || ev.startTime);
  const eventEndAt = endEpoch > 0 ? new Date(endEpoch).toISOString() : null;

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
    event_end_at: eventEndAt,
    category: ev.category,
    verified: Boolean(ev.verified),
    cover_image: ev.coverImage || null,
    storage_path: ev.storagePath || null,
    poster_metadata: ev.posterMetadata || null,
    capacity: ev.capacity || null,
    registration_url: ev.registrationUrl || null,
    status: ev.status || 'upcoming',
    approval_status: ev.approvalStatus || 'approved',
    tags: ev.tags || [],
    updated_at: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Student Record Mappings
// ----------------------------------------------------------------------------
export function mapDbToStudent(row: any): StudentRecord {
  return {
    id: row.id,
    auth_user_id: row.auth_user_id || null,
    authUserId: row.auth_user_id || null,
    registration_number: row.registration_number,
    registrationNumber: row.registration_number,
    institutional_email: (row.institutional_email || '').trim().toLowerCase(),
    institutionalEmail: (row.institutional_email || '').trim().toLowerCase(),
    full_name: row.full_name || '',
    fullName: row.full_name || '',
    program: row.program || 'B.Tech',
    branch: row.branch || 'Computer Science & Engineering',
    department: row.department || null,
    semester: Number(row.semester || 4),
    status: row.status || 'ACTIVE',
    created_at: row.created_at || new Date().toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapStudentToDb(s: StudentRecord): any {
  return {
    id: s.id,
    auth_user_id: s.auth_user_id || s.authUserId || null,
    registration_number: (s.registration_number || s.registrationNumber).trim().toUpperCase(),
    institutional_email: (s.institutional_email || s.institutionalEmail).trim().toLowerCase(),
    full_name: (s.full_name || s.fullName).trim(),
    program: s.program || 'B.Tech',
    branch: s.branch || 'Computer Science & Engineering',
    department: s.department || 'School of Computing Science and Engineering',
    semester: s.semester || 4,
    status: s.status || 'ACTIVE',
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

  // Determine lifecycle status vs live cabin availability
  const rawStatus = (row.status || '').toUpperCase();
  const lifecycleStatus =
    rawStatus === 'PROVISIONED' || rawStatus === 'ACTIVE' || rawStatus === 'DISABLED'
      ? rawStatus
      : 'ACTIVE';

  const liveCabinStatus =
    row.live_status ||
    (['available', 'in_lecture', 'meeting', 'busy'].includes(row.status) ? row.status : 'available');

  const normalizedEmail = (row.email || '').trim().toLowerCase();
  const dept = row.department || row.department_name || '';

  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix || undefined,
    designation: row.designation,
    school: row.school || 'SCSE',
    department: dept,
    departmentName: dept,
    cabinNumber: row.cabin_number,
    buildingId: row.building_id,
    buildingName: row.building_name,
    floor: row.floor,
    wing: row.wing || undefined,
    roomDetails: row.room_details || undefined,
    email: normalizedEmail,
    phone: row.phone || undefined,
    consultationHours: row.consultation_hours || 'By Appointment',
    subjects,
    researchArea: row.research_area || undefined,
    directionsGuide: row.directions_guide || '',
    status: lifecycleStatus,
    accountStatus: lifecycleStatus,
    liveStatus: liveCabinStatus,
    cabinStatus: liveCabinStatus,
    auth_user_id: row.auth_user_id || null,
    authUserId: row.auth_user_id || null,
    created_by: row.created_by || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    avatarUrl: row.avatar_url || undefined,
  };
}

export function mapFacultyToDb(f: FacultyMember): any {
  const normEmail = (f.email || '').trim().toLowerCase();
  const dept = f.department || f.departmentName || '';

  return {
    id: f.id,
    name: f.name,
    prefix: f.prefix || null,
    designation: f.designation,
    school: f.school || 'SCSE',
    department: dept,
    department_name: dept,
    cabin_number: f.cabinNumber,
    building_id: f.buildingId,
    building_name: f.buildingName,
    floor: f.floor,
    wing: f.wing || null,
    room_details: f.roomDetails || null,
    email: normEmail,
    phone: f.phone || null,
    consultation_hours: f.consultationHours || 'By Appointment',
    subjects: f.subjects || [],
    research_area: f.researchArea || null,
    directions_guide: f.directionsGuide || '',
    status: f.status || 'PROVISIONED',
    live_status: f.liveStatus || f.cabinStatus || 'available',
    auth_user_id: f.auth_user_id || f.authUserId || null,
    created_by: f.created_by || f.createdBy || null,
    avatar_url: f.avatarUrl || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToFacultyApplication(row: any): FacultyApplication {
  return {
    id: row.id,
    auth_user_id: row.auth_user_id || null,
    authUserId: row.auth_user_id || null,
    email: (row.email || '').trim().toLowerCase(),
    name: row.name || '',
    department: row.department || '',
    designation: row.designation || '',
    employee_id: row.employee_id || null,
    employeeId: row.employee_id || null,
    additional_information: row.additional_information || null,
    additionalInformation: row.additional_information || null,
    supporting_document_url: row.supporting_document_url || null,
    supportingDocumentUrl: row.supporting_document_url || null,
    status: row.status || 'PENDING',
    reviewed_by: row.reviewed_by || null,
    reviewedBy: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || null,
    reviewedAt: row.reviewed_at || null,
    rejection_reason: row.rejection_reason || null,
    rejectionReason: row.rejection_reason || null,
    created_at: row.created_at || new Date().toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapFacultyApplicationToDb(app: FacultyApplication): any {
  return {
    id: app.id,
    auth_user_id: app.auth_user_id || app.authUserId || null,
    email: (app.email || '').trim().toLowerCase(),
    name: app.name,
    department: app.department,
    designation: app.designation,
    employee_id: app.employee_id || app.employeeId || null,
    additional_information: app.additional_information || app.additionalInformation || null,
    supporting_document_url: app.supporting_document_url || app.supportingDocumentUrl || null,
    status: app.status || 'PENDING',
    reviewed_by: app.reviewed_by || app.reviewedBy || null,
    reviewed_at: app.reviewed_at || app.reviewedAt || null,
    rejection_reason: app.rejection_reason || app.rejectionReason || null,
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
    auth_user_id: row.auth_user_id || row.user_id || undefined,
    organizationName: row.organization_name || row.name || 'Campus Organization',
    name: row.organization_name || row.name || 'Campus Organization',
    category: row.category || 'Club',
    description: row.description || '',
    logoUrl: row.logo_url || undefined,
    verified: Boolean(row.verified),
    contactEmail: row.contact_email || '',
    verifiedAt: row.verified_at || undefined,
    department: row.department || row.category || 'Student Club',
    status: row.status || 'ACTIVE',
    notes: row.notes || undefined,
    grantedBy: row.granted_by || undefined,
    grantedAt: row.granted_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapPublisherToDb(p: Publisher): any {
  return {
    id: p.id,
    user_id: p.userId || p.auth_user_id || null,
    organization_name: p.organizationName || p.name,
    name: p.organizationName || p.name,
    category: p.category,
    description: p.description,
    logo_url: p.logoUrl || null,
    verified: Boolean(p.verified),
    contact_email: p.contactEmail || '',
    verified_at: p.verifiedAt || (p.verified ? new Date().toISOString() : null),
    department: p.department || null,
    status: p.status || 'ACTIVE',
    notes: p.notes || null,
    granted_by: p.grantedBy || null,
    granted_at: p.grantedAt || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToPublisherApplication(row: any): PublisherApplication {
  return {
    id: row.id,
    auth_user_id: row.auth_user_id || null,
    authUserId: row.auth_user_id || null,
    email: (row.email || '').toLowerCase().trim(),
    name: row.name || '',
    organization: row.organization || null,
    reason: row.reason || '',
    additional_information: row.additional_information || null,
    additionalInformation: row.additional_information || null,
    status: row.status || 'PENDING',
    reviewed_by: row.reviewed_by || null,
    reviewedBy: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || null,
    reviewedAt: row.reviewed_at || null,
    rejection_reason: row.rejection_reason || null,
    rejectionReason: row.rejection_reason || null,
    created_at: row.created_at || new Date().toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapPublisherApplicationToDb(app: PublisherApplication): any {
  return {
    id: app.id,
    auth_user_id: app.auth_user_id || app.authUserId || null,
    email: app.email.toLowerCase().trim(),
    name: app.name.trim(),
    organization: app.organization?.trim() || null,
    reason: app.reason.trim(),
    additional_information: app.additional_information || app.additionalInformation || null,
    status: app.status,
    reviewed_by: app.reviewed_by || app.reviewedBy || null,
    reviewed_at: app.reviewed_at || app.reviewedAt || null,
    rejection_reason: app.rejection_reason || app.rejectionReason || null,
    updated_at: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Campus Guide & Attachment Mappings
// ----------------------------------------------------------------------------
export function mapDbToGuideAttachment(row: any): GuideAttachment {
  let publicUrl: string | undefined = undefined;
  if (isSupabaseConfigured() && supabase && row.storage_path) {
    const { data } = supabase.storage.from('campus-guides').getPublicUrl(row.storage_path);
    publicUrl = data?.publicUrl;
  }

  return {
    id: row.id,
    guideId: row.guide_id,
    fileName: row.file_name,
    fileType: row.file_type,
    storagePath: row.storage_path,
    fileSize: Number(row.file_size || 0),
    createdAt: row.created_at || new Date().toISOString(),
    url: publicUrl || row.url,
  };
}

export function mapGuideAttachmentToDb(att: GuideAttachment): any {
  return {
    id: att.id,
    guide_id: att.guideId,
    file_name: att.fileName,
    file_type: att.fileType,
    storage_path: att.storagePath,
    file_size: att.fileSize,
  };
}

export function mapDbToCampusGuide(row: any, attachments: GuideAttachment[] = []): CampusGuide {
  let steps: string[] = [];
  if (Array.isArray(row.steps)) {
    steps = row.steps;
  } else if (typeof row.steps === 'string') {
    try {
      steps = JSON.parse(row.steps);
    } catch {
      steps = [];
    }
  }

  let additionalInfo: any = undefined;
  if (row.additional_info && typeof row.additional_info === 'object') {
    additionalInfo = row.additional_info;
  } else if (typeof row.additional_info === 'string') {
    try {
      additionalInfo = JSON.parse(row.additional_info);
    } catch {
      additionalInfo = undefined;
    }
  }

  let externalLinks: any[] = [];
  if (Array.isArray(row.external_links)) {
    externalLinks = row.external_links;
  } else if (typeof row.external_links === 'string') {
    try {
      externalLinks = JSON.parse(row.external_links);
    } catch {
      externalLinks = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    shortDescription: row.short_description || '',
    content: row.content || '',
    steps,
    additionalInfo,
    externalLinks,
    attachments,
    status: row.status || 'DRAFT',
    displayOrder: Number(row.display_order || 0),
    createdBy: row.created_by || null,
    lastUpdatedBy: row.last_updated_by || null,
    publishedAt: row.published_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapCampusGuideToDb(g: CampusGuide): any {
  return {
    id: g.id,
    title: g.title,
    slug: g.slug,
    category: g.category,
    short_description: g.shortDescription,
    content: g.content,
    steps: g.steps,
    additional_info: g.additionalInfo || {},
    external_links: g.externalLinks || [],
    status: g.status,
    display_order: g.displayOrder,
    created_by: g.createdBy || null,
    last_updated_by: g.lastUpdatedBy || null,
    published_at: g.publishedAt || (g.status === 'PUBLISHED' ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Validates and uploads a file to Supabase Storage ('campus-guides' bucket).
 * Allowed: PDF, JPG, JPEG, PNG, WEBP.
 * Maximum file size: 15MB.
 */
export async function uploadGuideFileToStorage(
  file: File,
  guideId: string
): Promise<{ storagePath: string; publicUrl: string; fileType: string; fileSize: number; fileName: string }> {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    throw new Error('Unsupported file type. Only PDF documents and JPG/PNG/WEBP images are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 15MB.`);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const storagePath = `guides/${guideId}/${uniqueId}_${cleanFileName}`;

  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.storage.from('campus-guides').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

    if (error) {
      console.warn('[Supabase Storage] Upload error:', error.message);
      // If bucket does not exist or permissions fail, return a fallback object URL for development
    }

    const { data: publicUrlData } = supabase.storage.from('campus-guides').getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || URL.createObjectURL(file);

    return {
      storagePath,
      publicUrl,
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name,
    };
  }

  // Graceful offline/demo fallback
  const mockUrl = URL.createObjectURL(file);
  return {
    storagePath,
    publicUrl: mockUrl,
    fileType: file.type,
    fileSize: file.size,
    fileName: file.name,
  };
}

// ----------------------------------------------------------------------------
// Supabase Storage: Event Poster Upload & Deletion
// ----------------------------------------------------------------------------
export const EVENT_POSTER_BUCKET = 'event-posters';
export const MAX_POSTER_SIZE = 5 * 1024 * 1024; // 5MB max
export const ALLOWED_POSTER_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export async function uploadEventPosterFile(
  eventId: string,
  file: File,
  oldStoragePath?: string
): Promise<{
  storagePath: string;
  publicUrl: string;
  fileType: string;
  fileSize: number;
  fileName: string;
}> {
  const normType = file.type.toLowerCase();
  if (!ALLOWED_POSTER_MIME_TYPES.includes(normType)) {
    throw new Error('Unsupported image format. Only JPG, PNG, and WEBP posters are accepted.');
  }

  if (file.size > MAX_POSTER_SIZE) {
    throw new Error(
      `Poster file exceeds maximum allowed size of 5MB (${(file.size / (1024 * 1024)).toFixed(1)}MB provided).`
    );
  }

  // Convert File to base64 for secure server-side validation & upload
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read poster file'));
    reader.readAsDataURL(file);
  });

  try {
    const response = await fetch('/api/events/upload-poster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        fileName: file.name,
        fileType: normType,
        fileBase64,
        oldStoragePath,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        storagePath: data.storagePath,
        publicUrl: data.publicUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        fileName: data.fileName,
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      // If it's a validation error from server (400), propagate it directly
      if (response.status === 400 && errData.error) {
        throw new Error(`Server validation rejected file: ${errData.error}`);
      }
      console.warn('[Poster Upload] Server endpoint error, attempting client storage fallback:', errData.error);
    }
  } catch (err: any) {
    if (err.message?.includes('Server validation rejected file')) {
      throw err;
    }
    console.warn('[Poster Upload] Backend API request failed, falling back to direct client Supabase upload:', err?.message);
  }

  // Client-side direct Supabase Storage fallback
  let ext = 'jpg';
  if (normType.includes('png')) ext = 'png';
  else if (normType.includes('webp')) ext = 'webp';
  else if (normType.includes('jpeg')) ext = 'jpeg';

  const cleanEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueSuffix = Date.now();
  const storagePath = `events/${cleanEventId}/poster_${uniqueSuffix}.${ext}`;

  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.storage.from(EVENT_POSTER_BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: normType,
    });

    if (error) {
      console.warn('[Supabase Storage] Event poster upload error:', error.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(EVENT_POSTER_BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || URL.createObjectURL(file);

    return {
      storagePath,
      publicUrl,
      fileType: normType,
      fileSize: file.size,
      fileName: file.name,
    };
  }

  // Graceful offline/local development fallback
  const fallbackUrl = URL.createObjectURL(file);
  return {
    storagePath,
    publicUrl: fallbackUrl,
    fileType: normType,
    fileSize: file.size,
    fileName: file.name,
  };
}

export async function deleteEventPosterFile(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.storage.from(EVENT_POSTER_BUCKET).remove([storagePath]);
      if (error) {
        console.warn('[Supabase Storage] Could not remove old poster object:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[Supabase Storage] Error deleting poster:', err?.message);
      return false;
    }
  }

  return true;
}


