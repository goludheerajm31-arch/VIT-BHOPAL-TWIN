export type UserRole = 'GUEST' | 'STUDENT' | 'FACULTY' | 'PUBLISHER' | 'ADMIN';

export type PublisherRoleStatus = 'PROVISIONED' | 'ACTIVE' | 'DISABLED';

export interface StudentRecord {
  id: string; // UUID primary key
  auth_user_id?: string | null;
  authUserId?: string | null;
  registration_number: string; // e.g. "24BCE10482"
  registrationNumber: string;
  institutional_email: string; // Normalized lowercase @vitbhopal.ac.in
  institutionalEmail: string;
  full_name: string;
  fullName: string;
  program: string; // e.g. "B.Tech"
  branch: string; // e.g. "Computer Science & Engineering"
  department?: string | null;
  semester?: number | null;
  status: 'ACTIVE' | 'PROVISIONED' | 'GRADUATED' | 'SUSPENDED';
  created_at?: string;
  createdAt: string;
  updated_at?: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  regNumber?: string;
  facultyId?: string;
  cabinNumber?: string;
  isPublisher?: boolean;
  isMasterAdmin?: boolean;
  isDemoAccount?: boolean;
  auth_user_id?: string | null;
  publisherId?: string;
  publisherStatus?: PublisherRoleStatus;
  roles?: UserRole[];
}

export interface UserRoleRecord {
  id: string; // UUID primary key
  userId?: string | null; // Auth User ID UUID if claimed/linked
  email: string; // Normalized institutional email
  role: UserRole;
  status: PublisherRoleStatus;
  grantedBy?: string | null;
  grantedAt?: string | null;
  revokedAt?: string | null;
  organization?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Publisher {
  id: string;
  userId?: string | null;
  auth_user_id?: string | null;
  organizationName: string;
  name?: string;
  category: 'Club' | 'Department' | 'Administrative' | 'Sports' | 'Cultural' | string;
  description: string;
  logoUrl?: string;
  verified: boolean;
  contactEmail: string;
  verifiedAt?: string;
  department?: string;
  status?: PublisherRoleStatus;
  notes?: string;
  grantedBy?: string | null;
  grantedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type LocationCategory =
  | 'Academic'
  | 'Labs'
  | 'Library'
  | 'Hostel'
  | 'Food'
  | 'Sports'
  | 'Medical'
  | 'Administration'
  | 'Innovation'
  | 'Utility';

export interface Location {
  id: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  building?: string;
  floor?: string;
  facilities?: string[];
  openingHours?: string;
  accessibility?: string;
  image?: string;
  zone?: string;
  contactPhone?: string;
}

export type CampusLocation = Location;

export type EventCategory =
  | 'Technical'
  | 'Workshops'
  | 'Clubs'
  | 'Cultural'
  | 'Sports'
  | 'Academics'
  | 'Orientation'
  | 'Competition'
  | 'Seminar'
  | 'Other';

export interface EventPosterMetadata {
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  organizer: string;
  publisherId: string;
  locationId: string;
  locationName: string;
  venueDetail?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "4:00 PM"
  endTime: string; // e.g. "6:00 PM"
  category: EventCategory;
  verified: boolean;
  coverImage?: string; // Public display URL for poster/cover
  posterMetadata?: EventPosterMetadata;
  storagePath?: string; // Supabase Storage relative path (e.g., events/{id}/poster.webp)
  capacity?: number;
  registrationUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'expired';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AnnouncementStatus = 'pending' | 'approved' | 'rejected';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  publisherId: string;
  publisherName: string;
  locationId?: string;
  locationName?: string;
  category: string;
  priority: AnnouncementPriority;
  createdAt: string;
  verified: boolean;
  actionUrl?: string;
  status?: AnnouncementStatus;
  authorRole?: string;
  authorId?: string;
  authorEmail?: string;
  authorRegNumber?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface SavedEvent {
  userId: string;
  eventId: string;
  savedAt: string;
}

export interface SavedLocation {
  userId: string;
  locationId: string;
  savedAt: string;
}

export interface RouteWaypoint {
  name: string;
  lat: number;
  lng: number;
  instruction?: string;
}

export type RoutingMode = 'walking' | 'vehicle';
export type PathType = 'white' | 'red_dotted';

export interface NavigationPath {
  fromLocationId: string;
  toLocationId: string;
  fromName: string;
  toName: string;
  distanceMeters: number;
  walkingMinutes: number;
  coordinates: [number, number][];
  steps: string[];
  from?: { id: string; name: string };
  to?: { id: string; name: string };
  estimatedWalkingMinutes?: number;
  mode?: RoutingMode;
  pathTypes?: PathType[];
  durationMinutes?: number;
  vehicleMinutes?: number;
}

// Account lifecycle status for admin-provisioned faculty
export type FacultyAccountStatus = 'PROVISIONED' | 'ACTIVE' | 'DISABLED';

// Live physical presence / cabin status in campus digital twin
export type FacultyCabinStatus = 'available' | 'in_lecture' | 'meeting' | 'busy';

// Backwards-compatible alias for existing cabin components
export type FacultyStatus = FacultyCabinStatus;

export interface FacultyMember {
  id: string; // UUID primary key
  name: string;
  email: string; // Canonical normalized institutional email (lowercase)
  department: string; // Department
  designation: string; // Academic designation
  auth_user_id?: string | null; // Linked authenticated identity UUID (NULL when PROVISIONED)
  authUserId?: string | null; // CamelCase alias
  status: FacultyAccountStatus; // Lifecycle: PROVISIONED | ACTIVE | DISABLED
  accountStatus?: FacultyAccountStatus;
  liveStatus?: FacultyCabinStatus; // Cabin presence: available | in_lecture | meeting | busy
  cabinStatus?: FacultyCabinStatus;
  created_by?: string | null; // Admin UUID who provisioned
  createdBy?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;

  // Digital Twin Physical Location & Academic Directory Mapping
  prefix?: string;
  school: string; // e.g. "SCSE", "SEEE", "SMEC", "SASL", "VSB", "CIR"
  departmentName: string;
  cabinNumber: string; // e.g. "AB1-314"
  buildingId: string; // e.g. "loc-ab-1"
  buildingName: string;
  floor: string; // e.g. "3rd Floor"
  wing?: string; // e.g. "Wing B"
  roomDetails?: string;
  phone?: string;
  consultationHours: string;
  subjects: string[];
  researchArea?: string;
  directionsGuide: string;
  avatarUrl?: string;
}

// ----------------------------------------------------------------------------
// Faculty Access Applications (Unprovisioned institutional applicants)
// ----------------------------------------------------------------------------
export type FacultyApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface FacultyApplication {
  id: string; // UUID primary key
  auth_user_id?: string | null; // Linked authenticated identity UUID if available
  authUserId?: string | null;
  email: string; // Canonical normalized institutional email (lowercase)
  name: string;
  department: string;
  designation: string;
  employee_id?: string | null;
  employeeId?: string | null;
  additional_information?: string | null;
  additionalInformation?: string | null;
  supporting_document_url?: string | null;
  supportingDocumentUrl?: string | null;
  status: FacultyApplicationStatus;
  reviewed_by?: string | null;
  reviewedBy?: string | null;
  reviewed_at?: string | null;
  reviewedAt?: string | null;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  created_at?: string;
  createdAt: string;
  updated_at?: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Publisher Access Applications (Student & Community Publisher Requests)
// ----------------------------------------------------------------------------
export type PublisherApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PublisherApplication {
  id: string; // UUID primary key
  auth_user_id?: string | null;
  authUserId?: string | null;
  email: string; // Canonical normalized institutional email (lowercase)
  name: string; // Full Name
  organization?: string | null; // Organization / Club / Department
  reason: string; // Reason for requesting Publisher access
  additional_information?: string | null;
  additionalInformation?: string | null;
  status: PublisherApplicationStatus;
  reviewed_by?: string | null;
  reviewedBy?: string | null;
  reviewed_at?: string | null;
  reviewedAt?: string | null;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  created_at?: string;
  createdAt: string;
  updated_at?: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Campus Hub & Guide Types
// ----------------------------------------------------------------------------
export type GuideCategory =
  | 'ACADEMICS'
  | 'HOSTEL'
  | 'STUDENT_SERVICES'
  | 'ADMINISTRATION'
  | 'FINANCE'
  | 'COMPLAINTS'
  | 'PLACEMENTS'
  | 'GENERAL';

export type GuideStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface GuideExternalLink {
  label: string;
  url: string;
}

export interface GuideAttachment {
  id: string; // UUID
  guideId: string; // UUID
  fileName: string;
  fileType: string; // e.g. "application/pdf", "image/jpeg", "image/png"
  storagePath: string;
  fileSize: number; // in bytes
  createdAt: string;
  url?: string;
}

export interface CampusGuide {
  id: string; // UUID primary key
  title: string;
  slug: string;
  category: GuideCategory;
  shortDescription: string;
  content: string;
  steps: string[];
  additionalInfo?: {
    whoCanUse?: string;
    requiredInformation?: string[];
    importantNotes?: string;
  };
  externalLinks: GuideExternalLink[];
  attachments: GuideAttachment[];
  status: GuideStatus;
  displayOrder: number;
  createdBy?: string | null;
  lastUpdatedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
