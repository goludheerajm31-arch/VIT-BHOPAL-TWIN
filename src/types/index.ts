export type UserRole = 'GUEST' | 'STUDENT' | 'PUBLISHER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  regNumber?: string;
}

export interface Publisher {
  id: string;
  userId: string;
  organizationName: string;
  category: 'Club' | 'Department' | 'Administrative' | 'Sports' | 'Cultural';
  description: string;
  logoUrl?: string;
  verified: boolean;
  contactEmail: string;
  verifiedAt?: string;
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
  | 'Orientation';

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
  coverImage?: string;
  capacity?: number;
  registrationUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  tags?: string[];
}

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';

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

export type FacultyStatus = 'available' | 'in_lecture' | 'meeting' | 'busy';

export interface FacultyMember {
  id: string;
  name: string;
  prefix?: string;
  designation: string;
  school: string; // e.g. "SCSE", "SEEE", "SMEC", "SASL", "VSB", "CIR"
  departmentName: string;
  cabinNumber: string; // e.g. "AB1-314"
  buildingId: string; // e.g. "loc-ab-1"
  buildingName: string;
  floor: string; // e.g. "3rd Floor"
  wing?: string; // e.g. "Wing B"
  roomDetails?: string;
  email: string;
  phone?: string;
  consultationHours: string;
  subjects: string[];
  researchArea?: string;
  directionsGuide: string;
  status?: FacultyStatus;
  avatarUrl?: string;
}
