import {
  CampusLocation,
  CampusEvent,
  Announcement,
  Publisher,
  User,
  SavedEvent,
  SavedLocation,
  FacultyMember,
  FacultyStatus,
  FacultyAccountStatus,
  FacultyCabinStatus,
  CampusGuide,
  GuideCategory,
  GuideStatus,
  GuideAttachment,
  FacultyApplication,
  FacultyApplicationStatus,
  StudentRecord,
  PublisherRoleStatus,
  PublisherApplication,
  PublisherApplicationStatus,
  UserRoleRecord,
} from '../types';
import {
  SEED_LOCATIONS,
  SEED_EVENTS,
  SEED_ANNOUNCEMENTS,
  SEED_PUBLISHERS,
  SEED_USERS,
  SEED_FACULTY,
  SEED_CAMPUS_GUIDES,
  SEED_FACULTY_APPLICATIONS,
  SEED_STUDENTS,
  SEED_PUBLISHER_APPLICATIONS,
  SEED_USER_ROLES,
} from './data/seeds';
import {
  supabase,
  isSupabaseConfigured,
  mapDbToLocation,
  mapLocationToDb,
  mapDbToEvent,
  mapEventToDb,
  mapDbToFaculty,
  mapFacultyToDb,
  mapDbToAnnouncement,
  mapAnnouncementToDb,
  mapDbToPublisher,
  mapPublisherToDb,
  mapDbToPublisherApplication,
  mapPublisherApplicationToDb,
  mapDbToCampusGuide,
  mapCampusGuideToDb,
  mapDbToGuideAttachment,
  mapGuideAttachmentToDb,
  mapDbToFacultyApplication,
  mapFacultyApplicationToDb,
  mapDbToStudent,
  mapStudentToDb,
  mapDbToUserRole,
  deleteEventPosterFile,
  deleteCampusGuideFile,
} from '../lib/supabase';
import { isEventExpired, parseEventDateTimeToIST } from '../lib/dateUtils';
export { isEventExpired, parseEventDateTimeToIST } from '../lib/dateUtils';
import { normalizeEmail, isInstitutionalEmail } from '../lib/facultyAuthUtils';
export { normalizeEmail, isInstitutionalEmail, validateFacultyEmail, INSTITUTIONAL_DOMAIN } from '../lib/facultyAuthUtils';

export interface ClaimFacultyResult {
  claimed: boolean;
  status: 'CLAIMED' | 'ALREADY_LINKED' | 'NOT_PROVISIONED' | 'DISABLED' | 'SECURITY_CONFLICT';
  faculty?: FacultyMember;
  error?: string;
}

// Event dispatched across the app when data in Supabase updates
export const DATA_CHANGE_EVENT = 'vit-twin-data-changed';

function emitChange(detail?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, { detail }));
  }
}

// Client UI preference keys (stored locally as temporary user preferences, NOT authoritative database state)
const PREFERENCE_KEYS = {
  RECENT_SEARCHES: 'vit_digital_twin_recent_searches_pref',
};

class StorageService {
  private initialSyncCompleted = false;
  private memoryLocations: CampusLocation[] = [...SEED_LOCATIONS];
  private memoryEvents: CampusEvent[] = [...SEED_EVENTS];
  private memoryFaculty: FacultyMember[] = [...SEED_FACULTY];
  private memoryFacultyApplications: FacultyApplication[] = [...SEED_FACULTY_APPLICATIONS];
  private memoryPublisherApplications: PublisherApplication[] = [...SEED_PUBLISHER_APPLICATIONS];
  private memoryUserRoles: UserRoleRecord[] = [...SEED_USER_ROLES];
  private memoryAnnouncements: Announcement[] = [...SEED_ANNOUNCEMENTS];
  private memoryPublishers: Publisher[] = [...SEED_PUBLISHERS];
  private memoryCampusGuides: CampusGuide[] = [...SEED_CAMPUS_GUIDES];
  private memoryStudents: StudentRecord[] = [...SEED_STUDENTS];
  private memorySavedEvents: Map<string, Set<string>> = new Map();
  private memorySavedLocations: Map<string, Set<string>> = new Map();
  private memoryAuditLogs: any[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Supabase PostgreSQL is the single authoritative persistent database.
      this.syncFromSupabase();

      // Listen for remote real-time events triggered by Supabase Realtime channel
      window.addEventListener(DATA_CHANGE_EVENT, (e: any) => {
        if (e?.detail) {
          this.handleRealtimeEvent(e.detail);
        }
      });
    }
  }

  /**
   * Authoritative query against Supabase PostgreSQL.
   * Populates in-memory state from the single source of truth.
   */
  async syncFromSupabase() {
    if (!isSupabaseConfigured() || !supabase) {
      console.info('[Supabase Store] Operating with seeded schema. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to Supabase PostgreSQL.');
      return;
    }

    try {
      const [
        locsRes,
        evtsRes,
        facRes,
        fappRes,
        pappRes,
        annRes,
        pubRes,
        guidesRes,
        savedRes,
        auditRes,
        studentsRes,
        userRolesRes,
      ] = await Promise.all([
        supabase.from('locations').select('*').order('name', { ascending: true }),
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('faculty').select('*').order('name', { ascending: true }),
        supabase.from('faculty_applications').select('*').order('created_at', { ascending: false }).then(
          (res) => res,
          () => ({ data: [], error: null } as any)
        ),
        supabase.from('publisher_applications').select('*').order('created_at', { ascending: false }).then(
          (res) => res,
          () => ({ data: [], error: null } as any)
        ),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('publishers').select('*').order('organization_name', { ascending: true }),
        supabase.from('campus_guides').select('*, campus_guide_attachments(*)').order('display_order', { ascending: true }).then(
          (res) => res,
          () => ({ data: [], error: null } as any)
        ),
        supabase.from('saved_items').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50).then(
          (res) => res,
          () => ({ data: [], error: null } as any)
        ),
        supabase.from('students').select('*').order('registration_number', { ascending: true }).then(
          (res) => res,
          () => ({ data: [], error: null } as any)
        ),
        supabase.from('user_roles').select('*').then(
          (res) => res,
          () => ({ data: [], error: null } as any)
        ),
      ]);

      let hasUpdates = false;

      if (!userRolesRes.error && userRolesRes.data && userRolesRes.data.length > 0) {
        this.memoryUserRoles = userRolesRes.data.map(mapDbToUserRole);
        hasUpdates = true;
      }

      if (!studentsRes.error && studentsRes.data && studentsRes.data.length > 0) {
        this.memoryStudents = studentsRes.data.map(mapDbToStudent);
        hasUpdates = true;
      }

      if (!locsRes.error && locsRes.data && locsRes.data.length > 0) {
        this.memoryLocations = locsRes.data.map(mapDbToLocation);
        hasUpdates = true;
      }

      if (!evtsRes.error && evtsRes.data && evtsRes.data.length > 0) {
        this.memoryEvents = evtsRes.data.map(mapDbToEvent);
        hasUpdates = true;
      }

      if (!facRes.error && facRes.data && facRes.data.length > 0) {
        this.memoryFaculty = facRes.data.map(mapDbToFaculty);
        hasUpdates = true;
      }

      if (!fappRes.error && fappRes.data && fappRes.data.length > 0) {
        this.memoryFacultyApplications = fappRes.data.map(mapDbToFacultyApplication);
        hasUpdates = true;
      }

      if (!pappRes.error && pappRes.data && pappRes.data.length > 0) {
        this.memoryPublisherApplications = pappRes.data.map(mapDbToPublisherApplication);
        hasUpdates = true;
      }

      if (!annRes.error && annRes.data && annRes.data.length > 0) {
        this.memoryAnnouncements = annRes.data.map(mapDbToAnnouncement);
        hasUpdates = true;
      }

      if (!pubRes.error && pubRes.data && pubRes.data.length > 0) {
        this.memoryPublishers = pubRes.data.map(mapDbToPublisher);
        hasUpdates = true;
      }

      if (!guidesRes.error && guidesRes.data && guidesRes.data.length > 0) {
        this.memoryCampusGuides = guidesRes.data.map((row: any) => {
          const rawAttachments = row.campus_guide_attachments || [];
          const attachments = Array.isArray(rawAttachments)
            ? rawAttachments.map(mapDbToGuideAttachment)
            : [];
          return mapDbToCampusGuide(row, attachments);
        });
        hasUpdates = true;
      }

      if (!savedRes.error && savedRes.data) {
        this.memorySavedEvents.clear();
        this.memorySavedLocations.clear();
        for (const item of savedRes.data) {
          if (item.item_type === 'EVENT') {
            if (!this.memorySavedEvents.has(item.user_id)) {
              this.memorySavedEvents.set(item.user_id, new Set());
            }
            this.memorySavedEvents.get(item.user_id)!.add(item.item_id);
          } else if (item.item_type === 'LOCATION') {
            if (!this.memorySavedLocations.has(item.user_id)) {
              this.memorySavedLocations.set(item.user_id, new Set());
            }
            this.memorySavedLocations.get(item.user_id)!.add(item.item_id);
          }
        }
        hasUpdates = true;
      }

      if (!auditRes.error && auditRes.data) {
        this.memoryAuditLogs = auditRes.data;
        hasUpdates = true;
      }

      this.initialSyncCompleted = true;

      if (hasUpdates) {
        emitChange({ source: 'supabase-authoritative-sync' });
      }
    } catch (err) {
      console.warn('[Supabase Store] Authoritative sync error:', err);
    }
  }

  /**
   * Process incoming Supabase Realtime postgres_changes mutations
   */
  handleRealtimeEvent(detail: any) {
    if (!detail || !detail.table) return;

    const { table, eventType, new: newRecord, old: oldRecord } = detail;
    let hasChanges = false;

    if (table === 'events') {
      if (eventType === 'INSERT' && newRecord) {
        const mapped = mapDbToEvent(newRecord);
        this.memoryEvents = [mapped, ...this.memoryEvents.filter((e) => e.id !== mapped.id)];
        hasChanges = true;
      } else if (eventType === 'UPDATE' && newRecord) {
        const mapped = mapDbToEvent(newRecord);
        this.memoryEvents = this.memoryEvents.map((e) => (e.id === mapped.id ? mapped : e));
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryEvents = this.memoryEvents.filter((e) => e.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'announcements') {
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const mapped = mapDbToAnnouncement(newRecord);
        const index = this.memoryAnnouncements.findIndex((a) => a.id === mapped.id);
        if (index >= 0) {
          this.memoryAnnouncements[index] = mapped;
        } else {
          this.memoryAnnouncements = [mapped, ...this.memoryAnnouncements];
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryAnnouncements = this.memoryAnnouncements.filter((a) => a.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'faculty') {
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const mapped = mapDbToFaculty(newRecord);
        const index = this.memoryFaculty.findIndex((f) => f.id === mapped.id);
        if (index >= 0) {
          this.memoryFaculty[index] = mapped;
        } else {
          this.memoryFaculty = [mapped, ...this.memoryFaculty];
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryFaculty = this.memoryFaculty.filter((f) => f.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'campus_guides') {
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const existingAttachments = this.memoryCampusGuides.find((g) => g.id === newRecord.id)?.attachments || [];
        const mapped = mapDbToCampusGuide(newRecord, existingAttachments);
        const index = this.memoryCampusGuides.findIndex((g) => g.id === mapped.id);
        if (index >= 0) {
          this.memoryCampusGuides[index] = mapped;
        } else {
          this.memoryCampusGuides = [mapped, ...this.memoryCampusGuides];
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryCampusGuides = this.memoryCampusGuides.filter((g) => g.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'locations') {
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const mapped = mapDbToLocation(newRecord);
        const index = this.memoryLocations.findIndex((l) => l.id === mapped.id);
        if (index >= 0) {
          this.memoryLocations[index] = mapped;
        } else {
          this.memoryLocations = [mapped, ...this.memoryLocations];
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryLocations = this.memoryLocations.filter((l) => l.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'publishers') {
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const mapped = mapDbToPublisher(newRecord);
        const index = this.memoryPublishers.findIndex((p) => p.id === mapped.id);
        if (index >= 0) {
          this.memoryPublishers[index] = mapped;
        } else {
          this.memoryPublishers = [mapped, ...this.memoryPublishers];
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryPublishers = this.memoryPublishers.filter((p) => p.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'saved_items') {
      if (eventType === 'INSERT' && newRecord) {
        if (newRecord.item_type === 'EVENT') {
          if (!this.memorySavedEvents.has(newRecord.user_id)) {
            this.memorySavedEvents.set(newRecord.user_id, new Set());
          }
          this.memorySavedEvents.get(newRecord.user_id)!.add(newRecord.item_id);
        } else if (newRecord.item_type === 'LOCATION') {
          if (!this.memorySavedLocations.has(newRecord.user_id)) {
            this.memorySavedLocations.set(newRecord.user_id, new Set());
          }
          this.memorySavedLocations.get(newRecord.user_id)!.add(newRecord.item_id);
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        if (oldRecord.item_type === 'EVENT' && this.memorySavedEvents.has(oldRecord.user_id)) {
          this.memorySavedEvents.get(oldRecord.user_id)!.delete(oldRecord.item_id);
        } else if (oldRecord.item_type === 'LOCATION' && this.memorySavedLocations.has(oldRecord.user_id)) {
          this.memorySavedLocations.get(oldRecord.user_id)!.delete(oldRecord.item_id);
        }
        hasChanges = true;
      }
    } else if (table === 'faculty_applications') {
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const mapped = mapDbToFacultyApplication(newRecord);
        const index = this.memoryFacultyApplications.findIndex((a) => a.id === mapped.id);
        if (index >= 0) {
          this.memoryFacultyApplications[index] = mapped;
        } else {
          this.memoryFacultyApplications = [mapped, ...this.memoryFacultyApplications];
        }
        hasChanges = true;
      } else if (eventType === 'DELETE' && oldRecord) {
        this.memoryFacultyApplications = this.memoryFacultyApplications.filter((a) => a.id !== oldRecord.id);
        hasChanges = true;
      }
    } else if (table === 'audit_logs') {
      if (eventType === 'INSERT' && newRecord) {
        this.memoryAuditLogs = [newRecord, ...this.memoryAuditLogs].slice(0, 50);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      emitChange({ source: 'realtime', table, eventType });
    }
  }

  // --------------------------------------------------------------------------
  // LOCATIONS (Authoritative in Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  getLocations(): CampusLocation[] {
    return this.memoryLocations;
  }

  getLocationById(id: string): CampusLocation | undefined {
    const list = this.getLocations();
    const exact = list.find((loc) => loc.id === id);
    if (exact) return exact;

    // Fallback alias resolution
    const lower = (id || '').toLowerCase();
    if (
      lower.includes('ab-1') ||
      lower.includes('academic-block') ||
      lower.includes('seminar') ||
      lower.includes('auditorium') ||
      lower.includes('computer-lab')
    ) {
      return list.find((l) => l.id === 'loc-ab-1') || list[0];
    }
    if (lower.includes('ab-2') || lower.includes('engineering-lab') || lower.includes('innovation')) {
      return list.find((l) => l.id === 'loc-ab-2');
    }
    if (lower.includes('mph') || lower.includes('sports') || lower.includes('sac') || lower.includes('complex')) {
      return list.find((l) => l.id === 'loc-mph');
    }
    if (lower.includes('morep') || lower.includes('health') || lower.includes('medical')) {
      return list.find((l) => l.id === 'loc-dr-morepen');
    }
    if (lower.includes('girls') && lower.includes('2')) {
      return list.find((l) => l.id === 'loc-girls-hostel-2');
    }
    if (lower.includes('girls') || lower.includes('gh-1')) {
      return list.find((l) => l.id === 'loc-girls-hostel-1');
    }
    if (lower.includes('boys') && lower.includes('2')) {
      return list.find((l) => l.id === 'loc-boys-hostel-2');
    }
    if (lower.includes('boys') && lower.includes('3')) {
      return list.find((l) => l.id === 'loc-boys-hostel-3');
    }
    if (lower.includes('boys') && lower.includes('4')) {
      return list.find((l) => l.id === 'loc-boys-hostel-4');
    }
    if (lower.includes('boys') && lower.includes('5')) {
      return list.find((l) => l.id === 'loc-boys-hostel-5');
    }
    if (lower.includes('boys') && lower.includes('6')) {
      return list.find((l) => l.id === 'loc-boys-hostel-6');
    }
    if (lower.includes('boys') && lower.includes('7')) {
      return list.find((l) => l.id === 'loc-boys-hostel-7');
    }
    if (lower.includes('boys') && lower.includes('8')) {
      return list.find((l) => l.id === 'loc-boys-hostel-8');
    }
    if (lower.includes('boys') || lower.includes('bh-1')) {
      return list.find((l) => l.id === 'loc-boys-hostel-1');
    }

    return list[0];
  }

  async saveLocation(location: CampusLocation): Promise<CampusLocation> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('locations').upsert(mapLocationToDb(location));
      if (error) {
        console.error('[Supabase Store] Error saving location:', error.message);
        throw new Error(`Database error saving location: ${error.message}`);
      }
    }

    const list = [...this.memoryLocations];
    const index = list.findIndex((l) => l.id === location.id);
    if (index >= 0) {
      list[index] = location;
    } else {
      list.unshift(location);
    }
    this.memoryLocations = list;
    emitChange();

    this.logAudit('SAVE', 'LOCATION', location.id, { name: location.name });
    return location;
  }

  async deleteLocation(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error deleting location:', error.message);
        throw new Error(`Database error deleting location: ${error.message}`);
      }
    }

    this.memoryLocations = this.memoryLocations.filter((l) => l.id !== id);
    emitChange();

    this.logAudit('DELETE', 'LOCATION', id, {});
    return true;
  }

  // --------------------------------------------------------------------------
  // EVENTS (Authoritative in Supabase PostgreSQL & IST Expiration Aware)
  // --------------------------------------------------------------------------
  getEvents(includeExpired: boolean = false): CampusEvent[] {
    if (includeExpired) {
      return this.memoryEvents;
    }
    return this.getActiveEvents();
  }

  getAllEvents(): CampusEvent[] {
    return this.memoryEvents;
  }

  /**
   * Returns only active (non-expired and non-cancelled) campus events.
   * Excludes events whose END date and time in Asia/Kolkata has elapsed.
   * Sorted naturally: soonest upcoming event first.
   */
  getActiveEvents(): CampusEvent[] {
    return this.memoryEvents
      .filter((ev) => {
        // Exclude cancelled or manually expired
        if (ev.status === 'cancelled' || ev.status === 'expired') return false;
        // Verify time expiration in Asia/Kolkata
        if (isEventExpired(ev)) return false;
        return true;
      })
      .sort((a, b) => {
        const timeA = parseEventDateTimeToIST(a.date, a.startTime);
        const timeB = parseEventDateTimeToIST(b.date, b.startTime);
        return timeA - timeB;
      });
  }

  getEventById(id: string): CampusEvent | undefined {
    return this.memoryEvents.find((ev) => ev.id === id);
  }

  getEventsByLocationId(locationId: string): CampusEvent[] {
    return this.getActiveEvents().filter((ev) => ev.locationId === locationId);
  }

  getEventsByPublisherId(publisherId: string): CampusEvent[] {
    return this.memoryEvents.filter((ev) => ev.publisherId === publisherId);
  }

  async saveEvent(event: CampusEvent, adminOrPublisherId?: string): Promise<CampusEvent> {
    const list = [...this.memoryEvents];
    const index = list.findIndex((e) => e.id === event.id);
    const existing = index >= 0 ? list[index] : undefined;

    const now = new Date().toISOString();
    const eventToSave: CampusEvent = {
      ...event,
      createdAt: existing?.createdAt || event.createdAt || now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('events').upsert(mapEventToDb(eventToSave));
      if (error) {
        console.error('[Supabase Store] Error saving event:', error.message);
        throw new Error(`Database error saving event: ${error.message}`);
      }

      // Step 3: Delete the old poster only after the new upload/reference succeeds in the database
      if (existing?.storagePath && (!event.storagePath || existing.storagePath !== event.storagePath)) {
        deleteEventPosterFile(existing.storagePath).catch((err) =>
          console.warn('[Storage] Clean up previous poster error:', err)
        );
      }
    }

    if (index >= 0) {
      list[index] = eventToSave;
    } else {
      list.unshift(eventToSave);
    }
    this.memoryEvents = list;
    emitChange({ source: 'event-saved', eventId: eventToSave.id });

    this.logAudit('SAVE', 'EVENT', eventToSave.id, {
      title: eventToSave.title,
      date: eventToSave.date,
      publisherId: eventToSave.publisherId,
      adminOrPublisherId,
    });
    return eventToSave;
  }

  async deleteEvent(id: string, adminOrPublisherId?: string): Promise<boolean> {
    const target = this.memoryEvents.find((e) => e.id === id);
    if (!target) return false;

    // 1. Delete the database record first to ensure transactional integrity
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error deleting event from database:', error.message);
        throw new Error(`Database error deleting event: ${error.message}`);
      }
    }

    // 2. Clean up associated poster object in Supabase Storage only after DB deletion succeeds
    if (target.storagePath) {
      try {
        await deleteEventPosterFile(target.storagePath);
      } catch (err: any) {
        console.warn('[Storage] Warning deleting event poster during event deletion:', err?.message);
      }
    }

    this.memoryEvents = this.memoryEvents.filter((e) => e.id !== id);
    emitChange({ source: 'event-deleted', eventId: id });

    this.logAudit('DELETE', 'EVENT', id, {
      title: target.title,
      publisherId: target.publisherId,
      adminOrPublisherId,
    });
    return true;
  }

  /**
   * Idempotent scheduled or on-demand cleanup of expired events.
   * Identifies all events whose end date/time in Asia/Kolkata has elapsed,
   * cleans up their storage posters, and marks them expired or permanently cleans them up.
   */
  async cleanupExpiredEvents(): Promise<{ expiredCount: number; cleanedIds: string[] }> {
    const expiredEvents = this.memoryEvents.filter((ev) => isEventExpired(ev));
    const cleanedIds: string[] = [];

    for (const ev of expiredEvents) {
      try {
        // Mark as expired in DB or memory
        if (ev.status !== 'completed' && ev.status !== 'expired') {
          ev.status = 'expired';
          if (isSupabaseConfigured() && supabase) {
            await supabase.from('events').update({ status: 'expired' }).eq('id', ev.id);
          }
          cleanedIds.push(ev.id);
        }
      } catch (err: any) {
        console.warn(`[Cleanup] Error processing expired event ${ev.id}:`, err?.message);
      }
    }

    if (cleanedIds.length > 0) {
      emitChange({ source: 'expired-events-cleaned', count: cleanedIds.length });
    }

    return { expiredCount: cleanedIds.length, cleanedIds };
  }

  // --------------------------------------------------------------------------
  // ANNOUNCEMENTS (Authoritative in Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  getAnnouncements(): Announcement[] {
    return this.memoryAnnouncements;
  }

  getAnnouncementById(id: string): Announcement | undefined {
    return this.getAnnouncements().find((a) => a.id === id);
  }

  getPendingAnnouncements(): Announcement[] {
    return this.getAnnouncements().filter((a) => a.status === 'pending');
  }

  getStudentAnnouncements(studentId: string): Announcement[] {
    return this.getAnnouncements().filter(
      (a) => a.authorId === studentId || a.publisherId === studentId
    );
  }

  async saveAnnouncement(announcement: Announcement): Promise<Announcement> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('announcements').upsert(mapAnnouncementToDb(announcement));
      if (error) {
        console.error('[Supabase Store] Error saving announcement:', error.message);
        throw new Error(`Database error saving announcement: ${error.message}`);
      }
    }

    const list = [...this.memoryAnnouncements];
    const index = list.findIndex((a) => a.id === announcement.id);
    if (index >= 0) {
      list[index] = announcement;
    } else {
      list.unshift(announcement);
    }
    this.memoryAnnouncements = list;
    emitChange();

    this.logAudit('SAVE', 'ANNOUNCEMENT', announcement.id, { title: announcement.title, status: announcement.status });
    return announcement;
  }

  async verifyAnnouncement(
    id: string,
    approvalStatus: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<Announcement | undefined> {
    const list = [...this.memoryAnnouncements];
    const item = list.find((a) => a.id === id);
    if (!item) return undefined;

    const reviewedAt = new Date().toISOString();
    const finalReason = approvalStatus === 'rejected' ? (rejectionReason || 'Declined by administration') : undefined;

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('announcements')
        .update({
          status: approvalStatus,
          verified: approvalStatus === 'approved',
          reviewed_at: reviewedAt,
          rejection_reason: finalReason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error verifying announcement:', error.message);
        throw new Error(`Database error verifying announcement: ${error.message}`);
      }
    }

    item.status = approvalStatus;
    item.verified = approvalStatus === 'approved';
    item.reviewedAt = reviewedAt;
    item.rejectionReason = finalReason;

    this.memoryAnnouncements = list;
    emitChange();

    this.logAudit(
      approvalStatus === 'approved' ? 'VERIFY' : 'REJECT',
      'ANNOUNCEMENT',
      id,
      { title: item.title, status: approvalStatus, rejectionReason: finalReason }
    );
    return item;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error deleting announcement:', error.message);
        throw new Error(`Database error deleting announcement: ${error.message}`);
      }
    }

    this.memoryAnnouncements = this.memoryAnnouncements.filter((a) => a.id !== id);
    emitChange();

    this.logAudit('DELETE', 'ANNOUNCEMENT', id, {});
    return true;
  }

  // --------------------------------------------------------------------------
  // PUBLISHERS & AUTHORIZATION (Authoritative multi-role capability)
  // --------------------------------------------------------------------------
  getPublishers(): Publisher[] {
    return this.memoryPublishers;
  }

  getPublisherById(id: string): Publisher | undefined {
    return this.getPublishers().find((p) => p.id === id);
  }

  getPublisherByEmail(email: string): Publisher | undefined {
    const clean = normalizeEmail(email);
    if (!clean) return undefined;
    return this.getPublishers().find((p) => normalizeEmail(p.contactEmail) === clean);
  }

  getPublisherByUserId(userId: string): Publisher | undefined {
    if (!userId) return undefined;
    return this.getPublishers().find((p) => p.userId === userId || p.auth_user_id === userId);
  }

  hasPublisherAccess(emailOrUserId: string): boolean {
    if (!emailOrUserId) return false;
    const clean = normalizeEmail(emailOrUserId);

    // 1. Check publishers entity store
    const pub = this.memoryPublishers.find((p) => {
      const matchEmail = clean && normalizeEmail(p.contactEmail) === clean;
      const matchUser = p.userId === emailOrUserId || p.auth_user_id === emailOrUserId;
      return (
        (matchEmail || matchUser) &&
        (p.status === 'ACTIVE' || (!p.status && p.verified)) &&
        p.status !== 'DISABLED'
      );
    });
    if (pub) return true;

    // 2. Check user roles record store
    const roleRecord = this.memoryUserRoles.find((r) => {
      const matchEmail = clean && normalizeEmail(r.email) === clean;
      const matchUser = r.userId === emailOrUserId;
      return (matchEmail || matchUser) && r.role === 'PUBLISHER' && r.status === 'ACTIVE';
    });
    return Boolean(roleRecord);
  }

  getUserRoleRecords(): UserRoleRecord[] {
    return this.memoryUserRoles;
  }

  async savePublisher(publisher: Publisher, adminUserId?: string): Promise<Publisher> {
    const publishers = [...this.memoryPublishers];
    const index = publishers.findIndex((p) => p.id === publisher.id);
    const now = new Date().toISOString();
    const updatedPub = { ...publisher, updatedAt: now };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapPublisherToDb(updatedPub);
      const { error } = await supabase.from('publishers').upsert([dbPayload]);
      if (error) {
        console.error('[Supabase Store] Error saving publisher:', error.message);
        throw new Error(`Database error saving publisher: ${error.message}`);
      }
    }

    if (index >= 0) {
      publishers[index] = updatedPub;
    } else {
      publishers.unshift(updatedPub);
    }
    this.memoryPublishers = publishers;
    emitChange();

    this.logAudit('SAVE', 'PUBLISHER', updatedPub.id, {
      name: updatedPub.name || updatedPub.organizationName,
      status: updatedPub.status,
      adminUserId,
    });
    return updatedPub;
  }

  async togglePublisherVerification(id: string): Promise<Publisher | undefined> {
    const publishers = [...this.memoryPublishers];
    const publisher = publishers.find((p) => p.id === id);
    if (!publisher) return undefined;

    const nextVerified = !publisher.verified;
    const nextVerifiedAt = nextVerified ? new Date().toISOString().split('T')[0] : null;

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('publishers')
        .update({
          verified: nextVerified,
          verified_at: nextVerifiedAt ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error toggling publisher verification:', error.message);
        throw new Error(`Database error updating publisher verification: ${error.message}`);
      }
    }

    publisher.verified = nextVerified;
    publisher.verifiedAt = nextVerifiedAt || undefined;
    this.memoryPublishers = publishers;
    emitChange();

    this.logAudit('VERIFY', 'PUBLISHER', id, { verified: publisher.verified });
    return publisher;
  }

  async addManualPublisher(data: {
    email: string;
    name?: string;
    organization?: string;
    notes?: string;
    adminUserId?: string;
  }): Promise<{ publisher: Publisher; roleRecord: UserRoleRecord; isExistingUser: boolean }> {
    const normEmail = normalizeEmail(data.email);
    if (!normEmail) {
      throw new Error('Institutional email address is required.');
    }
    if (!isInstitutionalEmail(normEmail)) {
      throw new Error('Only valid @vitbhopal.ac.in institutional emails are eligible for Publisher authorization.');
    }

    // 1. Search for existing authenticated user/profile by normalized email
    const student = this.getStudentByEmail(normEmail);
    const faculty = this.getFacultyByEmail(normEmail);
    const existingUser = student || faculty;
    const isExistingUser = Boolean(existingUser);
    const resolvedAuthUserId = student
      ? (student.auth_user_id || student.id)
      : faculty
      ? (faculty.auth_user_id || faculty.id)
      : null;

    const existingPublisher = this.getPublisherByEmail(normEmail);
    if (existingPublisher && existingPublisher.status === 'ACTIVE') {
      throw new Error(`Publisher authorization for "${normEmail}" is already active.`);
    }

    const now = new Date().toISOString();
    const displayName = data.name?.trim() || student?.fullName || faculty?.name || normEmail.split('@')[0];
    const orgName = data.organization?.trim() || `${displayName} (Campus Publisher)`;

    // 2. Prepare Publisher record
    const publisherId = existingPublisher ? existingPublisher.id : `pub-${crypto.randomUUID().slice(0, 8)}`;
    const newPublisher: Publisher = {
      id: publisherId,
      userId: isExistingUser ? resolvedAuthUserId : null,
      auth_user_id: isExistingUser ? resolvedAuthUserId : null,
      organizationName: orgName,
      name: displayName,
      category: 'Club',
      description: data.notes?.trim() || 'Officially authorized campus publisher.',
      verified: true,
      contactEmail: normEmail,
      verifiedAt: now.split('T')[0],
      department: data.organization?.trim() || student?.department || faculty?.departmentName || 'Student Chapter',
      status: isExistingUser ? 'ACTIVE' : 'PROVISIONED',
      notes: data.notes?.trim() || (isExistingUser ? 'Granted directly to existing user.' : 'Pre-provisioned. Awaiting initial institutional sign-in.'),
      grantedBy: data.adminUserId || 'Admin Console',
      grantedAt: now,
      createdAt: existingPublisher?.createdAt || now,
      updatedAt: now,
    };

    // 3. Prepare UserRoleRecord
    const roleId = `urole-${crypto.randomUUID().slice(0, 8)}`;
    const newRoleRecord: UserRoleRecord = {
      id: roleId,
      userId: isExistingUser ? resolvedAuthUserId : null,
      email: normEmail,
      role: 'PUBLISHER',
      status: isExistingUser ? 'ACTIVE' : 'PROVISIONED',
      grantedBy: data.adminUserId || 'Admin Console',
      grantedAt: now,
      organization: orgName,
      notes: data.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    // Save publisher
    await this.savePublisher(newPublisher, data.adminUserId);

    // Save role record
    this.memoryUserRoles = [
      newRoleRecord,
      ...this.memoryUserRoles.filter((r) => normalizeEmail(r.email) !== normEmail),
    ];

    // Check if there was any pending application for this email, auto-approve it
    const pendingApp = this.memoryPublisherApplications.find(
      (a) => normalizeEmail(a.email) === normEmail && a.status === 'PENDING'
    );
    if (pendingApp) {
      pendingApp.status = 'APPROVED';
      pendingApp.reviewed_by = data.adminUserId || 'Admin Console';
      pendingApp.reviewedBy = data.adminUserId || 'Admin Console';
      pendingApp.reviewed_at = now;
      pendingApp.reviewedAt = now;
      pendingApp.updated_at = now;
      pendingApp.updatedAt = now;
      if (isSupabaseConfigured() && supabase) {
        supabase
          .from('publisher_applications')
          .update(mapPublisherApplicationToDb(pendingApp))
          .eq('id', pendingApp.id)
          .then();
      }
    }

    emitChange();

    this.logAudit(
      isExistingUser ? 'GRANT_PUBLISHER_AUTHORIZATION' : 'PROVISION_PUBLISHER_AUTHORIZATION',
      'PUBLISHER',
      newPublisher.id,
      {
        email: normEmail,
        isExistingUser,
        status: newPublisher.status,
        organization: orgName,
      }
    );

    return { publisher: newPublisher, roleRecord: newRoleRecord, isExistingUser };
  }

  async claimPublisherAccess(authUserId: string, email: string): Promise<Publisher | undefined> {
    const normEmail = normalizeEmail(email);
    if (!normEmail || !authUserId) return undefined;

    const publisher = this.getPublisherByEmail(normEmail);
    if (!publisher) return undefined;

    // If publisher was PROVISIONED or unlinked, link it to the authenticated user!
    if (publisher.status === 'PROVISIONED' || !publisher.userId) {
      publisher.userId = authUserId;
      publisher.auth_user_id = authUserId;
      publisher.status = 'ACTIVE';
      publisher.updatedAt = new Date().toISOString();

      await this.savePublisher(publisher);

      // Update role record
      const roleRecord = this.memoryUserRoles.find(
        (r) => normalizeEmail(r.email) === normEmail && r.role === 'PUBLISHER'
      );
      if (roleRecord) {
        roleRecord.userId = authUserId;
        roleRecord.status = 'ACTIVE';
        roleRecord.updatedAt = new Date().toISOString();
      }

      this.logAudit('CLAIM_PUBLISHER_AUTHORIZATION', 'PUBLISHER', publisher.id, {
        email: normEmail,
        authUserId,
      });

      emitChange();
      return publisher;
    }

    return publisher;
  }

  async togglePublisherStatus(id: string, adminUserId?: string): Promise<Publisher | undefined> {
    const publisher = this.getPublisherById(id);
    if (!publisher) return undefined;

    const nextStatus: PublisherRoleStatus = publisher.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    const nextVerified = nextStatus === 'ACTIVE';

    publisher.status = nextStatus;
    publisher.verified = nextVerified;
    publisher.updatedAt = new Date().toISOString();

    await this.savePublisher(publisher, adminUserId);

    // Update user_roles if exists
    const cleanEmail = normalizeEmail(publisher.contactEmail);
    const roleRecord = this.memoryUserRoles.find(
      (r) => normalizeEmail(r.email) === cleanEmail && r.role === 'PUBLISHER'
    );
    if (roleRecord) {
      roleRecord.status = nextStatus;
      if (nextStatus === 'DISABLED') {
        roleRecord.revokedAt = new Date().toISOString();
      }
      roleRecord.updatedAt = new Date().toISOString();
    }

    emitChange();
    this.logAudit('UPDATE_PUBLISHER_STATUS', 'PUBLISHER', id, {
      status: nextStatus,
      adminUserId,
    });
    return publisher;
  }

  async revokePublisherAccess(publisherId: string, adminUserId?: string): Promise<boolean> {
    const publisher = this.getPublisherById(publisherId);
    if (!publisher) return false;

    publisher.status = 'DISABLED';
    publisher.verified = false;
    publisher.updatedAt = new Date().toISOString();

    await this.savePublisher(publisher, adminUserId);

    const cleanEmail = normalizeEmail(publisher.contactEmail);
    const roleRecord = this.memoryUserRoles.find(
      (r) => normalizeEmail(r.email) === cleanEmail && r.role === 'PUBLISHER'
    );
    if (roleRecord) {
      roleRecord.status = 'DISABLED';
      roleRecord.revokedAt = new Date().toISOString();
      roleRecord.updatedAt = new Date().toISOString();
    }

    emitChange();
    this.logAudit('REVOKE_PUBLISHER_AUTHORIZATION', 'PUBLISHER', publisherId, {
      adminUserId,
      email: publisher.contactEmail,
    });
    return true;
  }

  // --------------------------------------------------------------------------
  // PUBLISHER ACCESS APPLICATIONS (Authoritative in Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  getPublisherApplications(statusFilter?: PublisherApplicationStatus | 'all'): PublisherApplication[] {
    return this.memoryPublisherApplications
      .filter((app) => {
        if (statusFilter && statusFilter !== 'all' && app.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPublisherApplicationById(id: string): PublisherApplication | undefined {
    return this.memoryPublisherApplications.find((app) => app.id === id);
  }

  getPublisherApplicationByEmail(email: string): PublisherApplication | undefined {
    const norm = normalizeEmail(email);
    if (!norm) return undefined;
    return this.memoryPublisherApplications.find((app) => normalizeEmail(app.email) === norm);
  }

  getPublisherApplicationsByUserId(userId: string): PublisherApplication[] {
    if (!userId) return [];
    return this.memoryPublisherApplications.filter(
      (app) => app.auth_user_id === userId || app.authUserId === userId
    );
  }

  async submitPublisherApplication(data: {
    name: string;
    email: string;
    reason: string;
    organization?: string;
    additionalInformation?: string;
    authUserId?: string;
  }): Promise<PublisherApplication> {
    const normEmail = normalizeEmail(data.email);
    if (!normEmail) {
      throw new Error('Institutional email address is required.');
    }
    if (!isInstitutionalEmail(normEmail)) {
      throw new Error('Only valid @vitbhopal.ac.in institutional emails are accepted for Publisher access.');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Full Name is required.');
    }
    if (!data.reason || !data.reason.trim()) {
      throw new Error('Reason for requesting Publisher access is required.');
    }

    // 1. Check if user already has active Publisher authorization
    if (this.hasPublisherAccess(normEmail)) {
      throw new Error(`Your institutional account "${normEmail}" already has active Publisher authorization!`);
    }

    // 2. Prevent race conditions / duplicate pending applications
    const existingPending = this.memoryPublisherApplications.find(
      (app) => normalizeEmail(app.email) === normEmail && app.status === 'PENDING'
    );
    if (existingPending) {
      return existingPending;
    }

    const now = new Date().toISOString();
    const newApp: PublisherApplication = {
      id: crypto.randomUUID(),
      auth_user_id: data.authUserId || null,
      authUserId: data.authUserId || null,
      email: normEmail,
      name: data.name.trim(),
      organization: data.organization?.trim() || null,
      reason: data.reason.trim(),
      additional_information: data.additionalInformation?.trim() || null,
      additionalInformation: data.additionalInformation?.trim() || null,
      status: 'PENDING',
      created_at: now,
      createdAt: now,
      updated_at: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapPublisherApplicationToDb(newApp);
      const { error } = await supabase.from('publisher_applications').insert([dbPayload]);
      if (error) {
        console.error('[Supabase Store] Error submitting publisher application:', error.message);
        throw new Error(`Database error submitting application: ${error.message}`);
      }
    }

    this.memoryPublisherApplications = [
      newApp,
      ...this.memoryPublisherApplications.filter((a) => a.id !== newApp.id),
    ];
    emitChange();

    this.logAudit('SUBMIT_PUBLISHER_APPLICATION', 'PUBLISHER_APPLICATION', newApp.id, {
      email: normEmail,
      name: newApp.name,
      organization: newApp.organization,
    });

    return newApp;
  }

  async reviewPublisherApplication(
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminUserId?: string,
    rejectionReason?: string
  ): Promise<{ application: PublisherApplication; publisher?: Publisher }> {
    const target = this.memoryPublisherApplications.find((app) => app.id === applicationId);
    if (!target) {
      throw new Error(`Publisher application with ID ${applicationId} not found.`);
    }

    const now = new Date().toISOString();
    const normEmail = normalizeEmail(target.email);

    if (decision === 'APPROVED') {
      // Find existing student or user identity
      const student = this.getStudentByEmail(normEmail);
      const resolvedUserId = target.auth_user_id || (student ? (student.auth_user_id || student.id) : null);

      let activePublisher: Publisher;
      const existingPub = this.getPublisherByEmail(normEmail);

      if (existingPub) {
        activePublisher = {
          ...existingPub,
          verified: true,
          status: 'ACTIVE',
          userId: resolvedUserId || existingPub.userId,
          auth_user_id: resolvedUserId || existingPub.auth_user_id,
          organizationName: target.organization || existingPub.organizationName,
          name: target.name || existingPub.name,
          description: target.reason || existingPub.description,
          grantedBy: adminUserId || 'Admin Console',
          grantedAt: now,
          updatedAt: now,
        };
        await this.savePublisher(activePublisher, adminUserId);
      } else {
        activePublisher = {
          id: `pub-${crypto.randomUUID().slice(0, 8)}`,
          userId: resolvedUserId,
          auth_user_id: resolvedUserId,
          organizationName: target.organization || `${target.name} (Student Publisher)`,
          name: target.name,
          category: 'Club',
          description: target.reason,
          verified: true,
          contactEmail: normEmail,
          verifiedAt: now.split('T')[0],
          department: target.organization || student?.department || 'Student Chapter',
          status: 'ACTIVE',
          grantedBy: adminUserId || 'Admin Console',
          grantedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await this.savePublisher(activePublisher, adminUserId);
      }

      // Update user roles
      const roleId = `urole-${crypto.randomUUID().slice(0, 8)}`;
      const roleRecord: UserRoleRecord = {
        id: roleId,
        userId: resolvedUserId,
        email: normEmail,
        role: 'PUBLISHER',
        status: 'ACTIVE',
        grantedBy: adminUserId || 'Admin Console',
        grantedAt: now,
        organization: target.organization || undefined,
        createdAt: now,
        updatedAt: now,
      };
      this.memoryUserRoles = [
        roleRecord,
        ...this.memoryUserRoles.filter((r) => normalizeEmail(r.email) !== normEmail),
      ];

      // Update application
      target.status = 'APPROVED';
      target.reviewed_by = adminUserId || null;
      target.reviewedBy = adminUserId || null;
      target.reviewed_at = now;
      target.reviewedAt = now;
      target.updated_at = now;
      target.updatedAt = now;

      if (isSupabaseConfigured() && supabase) {
        const dbPayload = mapPublisherApplicationToDb(target);
        await supabase.from('publisher_applications').update(dbPayload).eq('id', target.id);
      }

      emitChange();
      this.logAudit('APPROVE_PUBLISHER_APPLICATION', 'PUBLISHER_APPLICATION', target.id, {
        email: normEmail,
        adminUserId,
      });

      return { application: target, publisher: activePublisher };
    } else {
      target.status = 'REJECTED';
      target.rejection_reason = rejectionReason?.trim() || 'Application was not approved by administration.';
      target.rejectionReason = rejectionReason?.trim() || 'Application was not approved by administration.';
      target.reviewed_by = adminUserId || null;
      target.reviewedBy = adminUserId || null;
      target.reviewed_at = now;
      target.reviewedAt = now;
      target.updated_at = now;
      target.updatedAt = now;

      if (isSupabaseConfigured() && supabase) {
        const dbPayload = mapPublisherApplicationToDb(target);
        await supabase.from('publisher_applications').update(dbPayload).eq('id', target.id);
      }

      emitChange();
      this.logAudit('REJECT_PUBLISHER_APPLICATION', 'PUBLISHER_APPLICATION', target.id, {
        email: normEmail,
        reason: target.rejection_reason,
        adminUserId,
      });

      return { application: target };
    }
  }

  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  getUsers(): User[] {
    return SEED_USERS;
  }

  // --------------------------------------------------------------------------
  // SAVED ITEMS (Bookmarks authoritative in Supabase PostgreSQL saved_items)
  // --------------------------------------------------------------------------
  getSavedEvents(userId: string): string[] {
    const set = this.memorySavedEvents.get(userId);
    return set ? Array.from(set) : [];
  }

  toggleSaveEvent(userId: string, eventId: string): boolean {
    if (!this.memorySavedEvents.has(userId)) {
      this.memorySavedEvents.set(userId, new Set());
    }
    const set = this.memorySavedEvents.get(userId)!;
    const isSaved = set.has(eventId);

    if (isSaved) {
      set.delete(eventId);
    } else {
      set.add(eventId);
    }
    const newSaved = !isSaved;
    emitChange();

    if (isSupabaseConfigured() && supabase) {
      if (newSaved) {
        supabase
          .from('saved_items')
          .upsert({
            id: `saved_${userId}_EVENT_${eventId}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            user_id: userId,
            item_type: 'EVENT',
            item_id: eventId,
            saved_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error('[Supabase Store] Error saving event item in PostgreSQL:', error.message);
          });
      } else {
        supabase
          .from('saved_items')
          .delete()
          .eq('user_id', userId)
          .eq('item_type', 'EVENT')
          .eq('item_id', eventId)
          .then(({ error }) => {
            if (error) console.error('[Supabase Store] Error deleting saved event item in PostgreSQL:', error.message);
          });
      }
    }

    return newSaved;
  }

  isEventSaved(userId: string, eventId: string): boolean {
    const set = this.memorySavedEvents.get(userId);
    return set ? set.has(eventId) : false;
  }

  getSavedLocations(userId: string): string[] {
    const set = this.memorySavedLocations.get(userId);
    return set ? Array.from(set) : [];
  }

  toggleSaveLocation(userId: string, locationId: string): boolean {
    if (!this.memorySavedLocations.has(userId)) {
      this.memorySavedLocations.set(userId, new Set());
    }
    const set = this.memorySavedLocations.get(userId)!;
    const isSaved = set.has(locationId);

    if (isSaved) {
      set.delete(locationId);
    } else {
      set.add(locationId);
    }
    const newSaved = !isSaved;
    emitChange();

    if (isSupabaseConfigured() && supabase) {
      if (newSaved) {
        supabase
          .from('saved_items')
          .upsert({
            id: `saved_${userId}_LOCATION_${locationId}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            user_id: userId,
            item_type: 'LOCATION',
            item_id: locationId,
            saved_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error('[Supabase Store] Error saving location item in PostgreSQL:', error.message);
          });
      } else {
        supabase
          .from('saved_items')
          .delete()
          .eq('user_id', userId)
          .eq('item_type', 'LOCATION')
          .eq('item_id', locationId)
          .then(({ error }) => {
            if (error) console.error('[Supabase Store] Error deleting saved location item in PostgreSQL:', error.message);
          });
      }
    }

    return newSaved;
  }

  isLocationSaved(userId: string, locationId: string): boolean {
    const set = this.memorySavedLocations.get(userId);
    return set ? set.has(locationId) : false;
  }

  // --------------------------------------------------------------------------
  // RECENT SEARCHES (Client UI Preference only)
  // --------------------------------------------------------------------------
  getRecentSearches(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PREFERENCE_KEYS.RECENT_SEARCHES);
      return raw ? JSON.parse(raw) : ['AI Club Workshop', 'Central Library', 'Seminar Hall', 'Food Court'];
    } catch {
      return ['AI Club Workshop', 'Central Library', 'Seminar Hall', 'Food Court'];
    }
  }

  addRecentSearch(term: string): void {
    const clean = term.trim();
    if (!clean || typeof window === 'undefined') return;
    let list = this.getRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    if (list.length > 8) list = list.slice(0, 8);
    try {
      localStorage.setItem(PREFERENCE_KEYS.RECENT_SEARCHES, JSON.stringify(list));
    } catch {}
  }

  clearRecentSearches(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(PREFERENCE_KEYS.RECENT_SEARCHES);
    } catch {}
  }

  // --------------------------------------------------------------------------
  // FACULTY & CABINS (Authoritative in Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  getFaculty(): FacultyMember[] {
    return this.memoryFaculty;
  }

  getFacultyById(id: string): FacultyMember | undefined {
    return this.getFaculty().find((f) => f.id === id);
  }

  getFacultyByAuthUserId(authUserId: string): FacultyMember | undefined {
    if (!authUserId) return undefined;
    return this.getFaculty().find(
      (f) => f.auth_user_id === authUserId || f.authUserId === authUserId
    );
  }

  getFacultyByEmail(email: string): FacultyMember | undefined {
    const norm = normalizeEmail(email);
    if (!norm) return undefined;
    return this.getFaculty().find((f) => normalizeEmail(f.email) === norm);
  }

  getFacultyByCabin(cabinNumber: string): FacultyMember | undefined {
    const clean = cabinNumber.trim().toLowerCase();
    return this.getFaculty().find(
      (f) =>
        f.cabinNumber.toLowerCase() === clean ||
        f.cabinNumber.toLowerCase().replace(/[-_ ]/g, '') === clean.replace(/[-_ ]/g, '')
    );
  }

  getFacultyByBuilding(buildingId: string): FacultyMember[] {
    return this.getFaculty().filter((f) => f.buildingId === buildingId);
  }

  async saveFaculty(faculty: FacultyMember, currentAdminUserId?: string): Promise<FacultyMember> {
    const normEmail = normalizeEmail(faculty.email);
    if (!normEmail) {
      throw new Error('Faculty email is required.');
    }
    if (!isInstitutionalEmail(normEmail)) {
      throw new Error('Faculty email must be a valid institutional address ending with @vitbhopal.ac.in.');
    }

    // Database & in-memory duplicate check on canonical normalized email
    const existingByEmail = this.memoryFaculty.find(
      (f) => normalizeEmail(f.email) === normEmail && f.id !== faculty.id
    );
    if (existingByEmail) {
      throw new Error(
        `Duplicate faculty record: Institutional email "${normEmail}" is already registered (Status: ${existingByEmail.status}). Multiple profiles for the same email are prohibited.`
      );
    }

    // Preserve immutable security fields (auth_user_id, id, created_by) if updating existing
    const existingRecord = this.memoryFaculty.find((f) => f.id === faculty.id);
    const isNew = !existingRecord;

    const normalizedFaculty: FacultyMember = {
      ...faculty,
      id: faculty.id || crypto.randomUUID(),
      email: normEmail,
      department: faculty.department || faculty.departmentName || 'General Academics',
      departmentName: faculty.departmentName || faculty.department || 'General Academics',
      status: isNew ? (faculty.status || 'PROVISIONED') : (faculty.status || existingRecord.status || 'PROVISIONED'),
      liveStatus: faculty.liveStatus || faculty.cabinStatus || existingRecord?.liveStatus || 'available',
      auth_user_id: isNew ? (faculty.auth_user_id || null) : (existingRecord?.auth_user_id ?? faculty.auth_user_id ?? null),
      authUserId: isNew ? (faculty.auth_user_id || null) : (existingRecord?.auth_user_id ?? faculty.auth_user_id ?? null),
      created_by: isNew ? (currentAdminUserId || faculty.created_by || null) : (existingRecord?.created_by ?? null),
      createdBy: isNew ? (currentAdminUserId || faculty.created_by || null) : (existingRecord?.created_by ?? null),
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapFacultyToDb(normalizedFaculty);

      const { data, error, status, statusText } = await supabase.from('faculty').upsert(dbPayload).select();
      if (error) {
        console.error('[Supabase Store] Error saving faculty in PostgreSQL:', {
          status,
          statusText,
          message: error.message,
          code: error.code,
        });
        if (
          error.code === '23505' ||
          error.message.toLowerCase().includes('unique') ||
          error.message.toLowerCase().includes('duplicate')
        ) {
          throw new Error(`Database error: A faculty member with email "${normEmail}" already exists in the database.`);
        }
        throw new Error(`Database error saving faculty: ${error.message}`);
      }
    }

    const list = [...this.memoryFaculty];
    const index = list.findIndex((f) => f.id === normalizedFaculty.id);
    if (index >= 0) {
      list[index] = normalizedFaculty;
    } else {
      list.unshift(normalizedFaculty);
    }
    this.memoryFaculty = list;
    emitChange();

    this.logAudit(isNew ? 'PROVISION_FACULTY' : 'UPDATE_FACULTY', 'FACULTY', normalizedFaculty.id, {
      name: normalizedFaculty.name,
      email: normalizedFaculty.email,
      status: normalizedFaculty.status,
    });
    return normalizedFaculty;
  }

  /**
   * Admin-Provisioned Faculty Flow
   * Pre-registers a faculty member's institutional email before they sign in.
   * Required: Name, Institutional email, Department, Designation
   * Result: Exactly one faculty record with status = PROVISIONED and auth_user_id = NULL
   */
  async provisionFaculty(params: {
    name: string;
    email: string;
    department: string;
    designation: string;
    school?: string;
    cabinNumber?: string;
    buildingId?: string;
    buildingName?: string;
    floor?: string;
    wing?: string;
    roomDetails?: string;
    phone?: string;
    consultationHours?: string;
    subjects?: string[];
    researchArea?: string;
    directionsGuide?: string;
    avatarUrl?: string;
  }, adminUserId?: string): Promise<FacultyMember> {
    const normEmail = normalizeEmail(params.email);
    if (!normEmail) {
      throw new Error('Institutional email address is required.');
    }
    if (!isInstitutionalEmail(normEmail)) {
      throw new Error('Faculty email must be a valid institutional address ending with @vitbhopal.ac.in.');
    }

    // Check duplicate
    const existing = this.getFacultyByEmail(normEmail);
    if (existing) {
      throw new Error(
        `A faculty member with institutional email "${normEmail}" is already registered (Status: ${existing.status}). Duplicate profiles are prohibited.`
      );
    }

    const school = params.school || 'SCSE';
    const buildingId = params.buildingId || 'loc-ab-1';
    const buildingName = params.buildingName || 'VITB Academic Block 1';
    const cabin = (params.cabinNumber || 'AB1-TBD').trim().toUpperCase();
    const floor = params.floor || 'Ground Floor';

    const newFaculty: FacultyMember = {
      id: crypto.randomUUID(),
      name: params.name.trim(),
      email: normEmail,
      department: params.department.trim(),
      departmentName: params.department.trim(),
      designation: params.designation.trim(),
      school,
      cabinNumber: cabin,
      buildingId,
      buildingName,
      floor,
      wing: params.wing?.trim(),
      roomDetails: params.roomDetails?.trim(),
      phone: params.phone?.trim() || undefined,
      consultationHours: params.consultationHours?.trim() || 'By Appointment',
      subjects: params.subjects && params.subjects.length > 0 ? params.subjects : ['General Academics'],
      researchArea: params.researchArea?.trim() || undefined,
      directionsGuide:
        params.directionsGuide?.trim() ||
        `Enter ${buildingName}, proceed to ${floor}${params.wing ? ` (${params.wing})` : ''}, and locate Cabin ${cabin}.`,
      status: 'PROVISIONED',
      accountStatus: 'PROVISIONED',
      liveStatus: 'available',
      cabinStatus: 'available',
      auth_user_id: null,
      authUserId: null,
      created_by: adminUserId || null,
      createdBy: adminUserId || null,
      avatarUrl: params.avatarUrl?.trim() || undefined,
    };

    return this.saveFaculty(newFaculty, adminUserId);
  }

  /**
   * Future Google/Supabase Auth Claim Flow
   * Called when an authenticated user signs in with their institutional email.
   * Matches pre-provisioned record, links auth_user_id, and transitions PROVISIONED -> ACTIVE.
   */
  async claimFacultyProfile(
    authenticatedUserId: string,
    authenticatedEmail: string
  ): Promise<ClaimFacultyResult> {
    const normEmail = normalizeEmail(authenticatedEmail);
    if (!normEmail || !authenticatedUserId) {
      return {
        claimed: false,
        status: 'NOT_PROVISIONED',
        error: 'Missing authenticated identity credentials.',
      };
    }

    // 1. Look up existing faculty record by normalized email
    const target = this.memoryFaculty.find((f) => normalizeEmail(f.email) === normEmail);

    // Case 1: No existing record found -> DO NOT create duplicate, DO NOT grant privileges
    if (!target) {
      return {
        claimed: false,
        status: 'NOT_PROVISIONED',
        error: `No pre-provisioned faculty profile found for institutional email "${normEmail}". Contact university administration.`,
      };
    }

    // Case 2: Faculty profile disabled by admin -> DO NOT claim, block access
    if (target.status === 'DISABLED') {
      return {
        claimed: false,
        status: 'DISABLED',
        faculty: target,
        error: 'This faculty profile has been disabled by an administrator.',
      };
    }

    // Case 3: Already claimed and linked to this exact authenticated identity
    if (target.auth_user_id === authenticatedUserId) {
      return {
        claimed: true,
        status: 'ALREADY_LINKED',
        faculty: target,
      };
    }

    // Case 4: Security conflict -> record is already linked to another authenticated account
    if (target.auth_user_id && target.auth_user_id !== authenticatedUserId) {
      console.error(
        `[Security Conflict] Faculty "${normEmail}" belongs to auth user "${target.auth_user_id}" but attempted claim by "${authenticatedUserId}"`
      );
      return {
        claimed: false,
        status: 'SECURITY_CONFLICT',
        faculty: target,
        error:
          'Security Conflict: This faculty record is already claimed by another authenticated account. Contact administrator to resolve.',
      };
    }

    // Case 5: Provisioned record ready to be claimed (auth_user_id is NULL)
    const updatedFaculty: FacultyMember = {
      ...target,
      auth_user_id: authenticatedUserId,
      authUserId: authenticatedUserId,
      status: 'ACTIVE',
      accountStatus: 'ACTIVE',
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('faculty')
        .update({
          auth_user_id: authenticatedUserId,
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', target.id);

      if (error) {
        console.error('[Supabase Store] Error claiming faculty profile:', error.message);
        throw new Error(`Database error linking faculty account: ${error.message}`);
      }
    }

    // Update in-memory state
    this.memoryFaculty = this.memoryFaculty.map((f) => (f.id === target.id ? updatedFaculty : f));
    emitChange();

    this.logAudit('CLAIM_FACULTY_ACCOUNT', 'FACULTY', target.id, {
      email: normEmail,
      authUserId: authenticatedUserId,
      transition: 'PROVISIONED -> ACTIVE',
    });

    return {
      claimed: true,
      status: 'CLAIMED',
      faculty: updatedFaculty,
    };
  }

  async updateFacultyAccountStatus(id: string, newStatus: FacultyAccountStatus): Promise<FacultyMember> {
    const list = [...this.memoryFaculty];
    const target = list.find((f) => f.id === id);
    if (!target) {
      throw new Error(`Faculty with ID ${id} not found.`);
    }

    const updated: FacultyMember = {
      ...target,
      status: newStatus,
      accountStatus: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('faculty')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error updating faculty account status:', error.message);
        throw new Error(`Database error updating status: ${error.message}`);
      }
    }

    this.memoryFaculty = list.map((f) => (f.id === id ? updated : f));
    emitChange();

    this.logAudit('UPDATE_ACCOUNT_STATUS', 'FACULTY', id, { previous: target.status, current: newStatus });
    return updated;
  }

  async updateFacultyCabinStatus(id: string, liveStatus: FacultyCabinStatus): Promise<void> {
    const list = [...this.memoryFaculty];
    const target = list.find((f) => f.id === id);
    if (target) {
      target.liveStatus = liveStatus;
      target.cabinStatus = liveStatus;
      this.memoryFaculty = list;
      emitChange();

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('faculty')
          .update({ live_status: liveStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) {
          console.error('[Supabase Store] Error updating faculty cabin status:', error.message);
        }
      }

      this.logAudit('UPDATE_CABIN_STATUS', 'FACULTY', id, { liveStatus });
    }
  }

  async updateFacultyStatus(id: string, status: any): Promise<void> {
    if (status === 'PROVISIONED' || status === 'ACTIVE' || status === 'DISABLED') {
      await this.updateFacultyAccountStatus(id, status as FacultyAccountStatus);
    } else {
      await this.updateFacultyCabinStatus(id, status as FacultyCabinStatus);
    }
  }

  async deleteFaculty(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('faculty').delete().eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error deleting faculty:', error.message);
        throw new Error(`Database error deleting faculty: ${error.message}`);
      }
    }

    this.memoryFaculty = this.memoryFaculty.filter((f) => f.id !== id);
    emitChange();

    this.logAudit('DELETE', 'FACULTY', id, {});
    return true;
  }

  async resetFaculty(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      for (const f of SEED_FACULTY) {
        const { error } = await supabase.from('faculty').upsert(mapFacultyToDb(f));
        if (error) {
          throw new Error(`Database error resetting faculty: ${error.message}`);
        }
      }
    }

    this.memoryFaculty = [...SEED_FACULTY];
    emitChange();
  }

  // --------------------------------------------------------------------------
  // FACULTY ACCESS APPLICATIONS (Authoritative in Supabase PostgreSQL faculty_applications)
  // --------------------------------------------------------------------------
  getFacultyApplications(statusFilter?: FacultyApplicationStatus | 'all'): FacultyApplication[] {
    return this.memoryFacultyApplications
      .filter((app) => {
        if (statusFilter && statusFilter !== 'all' && app.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getFacultyApplicationById(id: string): FacultyApplication | undefined {
    return this.memoryFacultyApplications.find((app) => app.id === id);
  }

  getFacultyApplicationByEmail(email: string): FacultyApplication | undefined {
    const norm = normalizeEmail(email);
    if (!norm) return undefined;
    return this.memoryFacultyApplications.find((app) => normalizeEmail(app.email) === norm);
  }

  async submitFacultyApplication(data: {
    name: string;
    email: string;
    department: string;
    designation: string;
    employeeId?: string;
    additionalInformation?: string;
    supportingDocumentUrl?: string;
    authUserId?: string;
  }): Promise<FacultyApplication> {
    const normEmail = normalizeEmail(data.email);
    if (!normEmail) {
      throw new Error('Institutional email address is required.');
    }
    if (!isInstitutionalEmail(normEmail)) {
      throw new Error('Only valid @vitbhopal.ac.in institutional emails are accepted.');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Full Name is required.');
    }
    if (!data.department || !data.department.trim()) {
      throw new Error('Academic department is required.');
    }
    if (!data.designation || !data.designation.trim()) {
      throw new Error('Designation is required.');
    }

    // 1. Check if a faculty profile already exists
    const existingFaculty = this.getFacultyByEmail(normEmail);
    if (existingFaculty) {
      if (existingFaculty.status === 'ACTIVE') {
        throw new Error(
          `A faculty profile for "${normEmail}" is already active in the university directory. Please use Faculty Login.`
        );
      } else if (existingFaculty.status === 'PROVISIONED') {
        throw new Error(
          `Your faculty profile for "${normEmail}" is already pre-provisioned by administration! Please use Faculty Login to claim your profile directly.`
        );
      } else if (existingFaculty.status === 'DISABLED') {
        throw new Error(
          `The faculty profile for "${normEmail}" has been disabled by an administrator. Please contact IT governance.`
        );
      }
    }

    // 2. Prevent duplicate pending applications
    const existingApp = this.memoryFacultyApplications.find(
      (app) => normalizeEmail(app.email) === normEmail && app.status === 'PENDING'
    );
    if (existingApp) {
      return existingApp;
    }

    const now = new Date().toISOString();
    const newApp: FacultyApplication = {
      id: crypto.randomUUID(),
      auth_user_id: data.authUserId || null,
      authUserId: data.authUserId || null,
      email: normEmail,
      name: data.name.trim(),
      department: data.department.trim(),
      designation: data.designation.trim(),
      employee_id: data.employeeId?.trim() || null,
      employeeId: data.employeeId?.trim() || null,
      additional_information: data.additionalInformation?.trim() || null,
      additionalInformation: data.additionalInformation?.trim() || null,
      supporting_document_url: data.supportingDocumentUrl || null,
      supportingDocumentUrl: data.supportingDocumentUrl || null,
      status: 'PENDING',
      created_at: now,
      createdAt: now,
      updated_at: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapFacultyApplicationToDb(newApp);
      const { error } = await supabase.from('faculty_applications').insert([dbPayload]);
      if (error) {
        console.error('[Supabase Store] Error submitting faculty application:', error.message);
        throw new Error(`Database error submitting application: ${error.message}`);
      }
    }

    this.memoryFacultyApplications = [newApp, ...this.memoryFacultyApplications.filter((a) => a.id !== newApp.id)];
    emitChange();

    this.logAudit('SUBMIT_FACULTY_APPLICATION', 'FACULTY_APPLICATION', newApp.id, {
      email: normEmail,
      name: newApp.name,
      department: newApp.department,
    });

    return newApp;
  }

  async reviewFacultyApplication(
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminUserId?: string,
    rejectionReason?: string
  ): Promise<{ application: FacultyApplication; faculty?: FacultyMember }> {
    const target = this.memoryFacultyApplications.find((app) => app.id === applicationId);
    if (!target) {
      throw new Error(`Faculty application with ID ${applicationId} not found.`);
    }

    const now = new Date().toISOString();
    const normEmail = normalizeEmail(target.email);

    if (decision === 'APPROVED') {
      let activeFaculty: FacultyMember;
      const existingFaculty = this.getFacultyByEmail(normEmail);

      if (existingFaculty) {
        // Reuse and activate existing record (CRITICAL: Do NOT create duplicate)
        activeFaculty = {
          ...existingFaculty,
          status: 'ACTIVE',
          accountStatus: 'ACTIVE',
          auth_user_id: target.auth_user_id || existingFaculty.auth_user_id || null,
          authUserId: target.auth_user_id || existingFaculty.auth_user_id || null,
          department: target.department || existingFaculty.department,
          departmentName: target.department || existingFaculty.departmentName,
          designation: target.designation || existingFaculty.designation,
          updated_at: now,
          updatedAt: now,
        };
        await this.saveFaculty(activeFaculty, adminUserId);
      } else {
        // Derive school from department
        const deptLower = target.department.toLowerCase();
        let school = 'SCSE';
        if (deptLower.includes('mech') || deptLower.includes('smec')) school = 'SMEC';
        else if (deptLower.includes('elect') || deptLower.includes('seee')) school = 'SEEE';
        else if (deptLower.includes('bio') || deptLower.includes('sasl') || deptLower.includes('math') || deptLower.includes('phys')) school = 'SASL';
        else if (deptLower.includes('business') || deptLower.includes('mgmt') || deptLower.includes('vsb')) school = 'VSB';
        else if (deptLower.includes('relat') || deptLower.includes('cir')) school = 'CIR';

        activeFaculty = {
          id: crypto.randomUUID(),
          name: target.name,
          email: normEmail,
          department: target.department,
          departmentName: target.department,
          designation: target.designation,
          school,
          cabinNumber: 'AB1-TBD',
          buildingId: 'loc-ab-1',
          buildingName: 'VITB Academic Block 1',
          floor: 'Ground Floor',
          consultationHours: 'By Appointment',
          subjects: ['General Academics'],
          directionsGuide: `Enter VITB Academic Block 1 to locate cabin.`,
          status: 'ACTIVE',
          accountStatus: 'ACTIVE',
          liveStatus: 'available',
          cabinStatus: 'available',
          auth_user_id: target.auth_user_id || null,
          authUserId: target.auth_user_id || null,
          created_by: adminUserId || null,
          createdBy: adminUserId || null,
          created_at: now,
          createdAt: now,
          updated_at: now,
          updatedAt: now,
        };
        await this.saveFaculty(activeFaculty, adminUserId);
      }

      const updatedApp: FacultyApplication = {
        ...target,
        status: 'APPROVED',
        reviewed_by: adminUserId || null,
        reviewedBy: adminUserId || null,
        reviewed_at: now,
        reviewedAt: now,
        updated_at: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from('faculty_applications')
          .update({
            status: 'APPROVED',
            reviewed_by: adminUserId || null,
            reviewed_at: now,
            updated_at: now,
          })
          .eq('id', applicationId);
      }

      this.memoryFacultyApplications = this.memoryFacultyApplications.map((app) =>
        app.id === applicationId ? updatedApp : app
      );
      emitChange();

      this.logAudit('APPROVE_FACULTY_APPLICATION', 'FACULTY_APPLICATION', applicationId, {
        email: normEmail,
        facultyId: activeFaculty.id,
      });

      return { application: updatedApp, faculty: activeFaculty };
    } else {
      // REJECTED
      const updatedApp: FacultyApplication = {
        ...target,
        status: 'REJECTED',
        rejection_reason: rejectionReason?.trim() || 'Application was not approved by administration.',
        rejectionReason: rejectionReason?.trim() || 'Application was not approved by administration.',
        reviewed_by: adminUserId || null,
        reviewedBy: adminUserId || null,
        reviewed_at: now,
        reviewedAt: now,
        updated_at: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from('faculty_applications')
          .update({
            status: 'REJECTED',
            rejection_reason: updatedApp.rejection_reason,
            reviewed_by: adminUserId || null,
            reviewed_at: now,
            updated_at: now,
          })
          .eq('id', applicationId);
      }

      this.memoryFacultyApplications = this.memoryFacultyApplications.map((app) =>
        app.id === applicationId ? updatedApp : app
      );
      emitChange();

      this.logAudit('REJECT_FACULTY_APPLICATION', 'FACULTY_APPLICATION', applicationId, {
        email: normEmail,
        reason: updatedApp.rejection_reason,
      });

      return { application: updatedApp };
    }
  }

  async cancelFacultyApplication(applicationId: string): Promise<FacultyApplication> {
    const target = this.memoryFacultyApplications.find((app) => app.id === applicationId);
    if (!target) {
      throw new Error(`Faculty application with ID ${applicationId} not found.`);
    }

    const now = new Date().toISOString();
    const updatedApp: FacultyApplication = {
      ...target,
      status: 'CANCELLED',
      updated_at: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('faculty_applications')
        .update({ status: 'CANCELLED', updated_at: now })
        .eq('id', applicationId);
    }

    this.memoryFacultyApplications = this.memoryFacultyApplications.map((app) =>
      app.id === applicationId ? updatedApp : app
    );
    emitChange();

    return updatedApp;
  }

  // --------------------------------------------------------------------------
  // AUTHORITATIVE STUDENT RECORDS (Supabase PostgreSQL students table)
  // --------------------------------------------------------------------------
  getStudents(): StudentRecord[] {
    return this.memoryStudents;
  }

  getStudentById(id: string): StudentRecord | undefined {
    return this.memoryStudents.find((s) => s.id === id);
  }

  getStudentByEmail(email: string): StudentRecord | undefined {
    const clean = normalizeEmail(email);
    if (!clean) return undefined;
    return this.memoryStudents.find(
      (s) => normalizeEmail(s.institutional_email || s.institutionalEmail) === clean
    );
  }

  getStudentByRegistrationNumber(regNumber: string): StudentRecord | undefined {
    const clean = regNumber.trim().toUpperCase();
    if (!clean) return undefined;
    return this.memoryStudents.find(
      (s) => (s.registration_number || s.registrationNumber).trim().toUpperCase() === clean
    );
  }

  getStudentByAuthUserId(authUserId: string): StudentRecord | undefined {
    if (!authUserId) return undefined;
    return this.memoryStudents.find(
      (s) => s.auth_user_id === authUserId || s.authUserId === authUserId
    );
  }

  async saveStudentRecord(
    data: Partial<StudentRecord> & { registrationNumber: string; institutionalEmail: string; fullName: string }
  ): Promise<StudentRecord> {
    const cleanEmail = normalizeEmail(data.institutionalEmail);
    const cleanReg = data.registrationNumber.trim().toUpperCase();
    const cleanName = data.fullName.trim();

    if (!cleanEmail) throw new Error('Institutional email is required');
    if (!cleanReg) throw new Error('Registration number is required');
    if (!cleanName) throw new Error('Full name is required');

    const now = new Date().toISOString();
    const existing = this.getStudentByEmail(cleanEmail) || this.getStudentByRegistrationNumber(cleanReg);
    const id = existing?.id || data.id || crypto.randomUUID();

    const record: StudentRecord = {
      id,
      auth_user_id: data.authUserId || data.auth_user_id || existing?.auth_user_id || null,
      authUserId: data.authUserId || data.auth_user_id || existing?.auth_user_id || null,
      registration_number: cleanReg,
      registrationNumber: cleanReg,
      institutional_email: cleanEmail,
      institutionalEmail: cleanEmail,
      full_name: cleanName,
      fullName: cleanName,
      program: data.program || existing?.program || 'B.Tech',
      branch: data.branch || existing?.branch || 'Computer Science & Engineering',
      department: data.department || existing?.department || null,
      semester: typeof data.semester === 'number' ? data.semester : (existing?.semester ?? 4),
      status: data.status || existing?.status || 'ACTIVE',
      created_at: existing?.created_at || now,
      createdAt: existing?.createdAt || now,
      updated_at: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapStudentToDb(record);
      const { error } = await supabase.from('students').upsert(dbPayload);
      if (error) {
        console.warn('[Supabase Store] Error upserting student:', error.message);
      }
    }

    const index = this.memoryStudents.findIndex((s) => s.id === id);
    if (index >= 0) {
      this.memoryStudents[index] = record;
    } else {
      this.memoryStudents.unshift(record);
    }

    emitChange();
    return record;
  }

  async claimStudentProfile(
    authUserId: string,
    email: string
  ): Promise<{ claimed: boolean; status: 'CLAIMED' | 'ALREADY_ACTIVE' | 'NOT_FOUND' | 'SECURITY_CONFLICT'; student?: StudentRecord; error?: string }> {
    const clean = normalizeEmail(email);
    if (!clean) return { claimed: false, status: 'NOT_FOUND', error: 'Invalid email address.' };

    const student = this.getStudentByEmail(clean);
    if (!student) {
      return { claimed: false, status: 'NOT_FOUND', error: `No student directory record found for "${clean}".` };
    }

    // Security check: If already linked to another auth user id
    if (student.auth_user_id && student.auth_user_id !== authUserId) {
      return {
        claimed: false,
        status: 'SECURITY_CONFLICT',
        error: 'This student record is already bound to another authenticated Google identity.',
      };
    }

    const updated = await this.saveStudentRecord({
      ...student,
      authUserId,
      auth_user_id: authUserId,
      status: 'ACTIVE',
    });

    return {
      claimed: true,
      status: 'CLAIMED',
      student: updated,
    };
  }

  // --------------------------------------------------------------------------
  // CAMPUS HUB: CAMPUS GUIDES (Authoritative in Supabase PostgreSQL campus_guides)
  // --------------------------------------------------------------------------
  getCampusGuides(
    statusFilter?: GuideStatus | 'all',
    categoryFilter?: GuideCategory | 'all'
  ): CampusGuide[] {
    return this.memoryCampusGuides
      .filter((g) => {
        if (statusFilter && statusFilter !== 'all' && g.status !== statusFilter) return false;
        if (categoryFilter && categoryFilter !== 'all' && g.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  getCampusGuideById(id: string): CampusGuide | undefined {
    return this.memoryCampusGuides.find((g) => g.id === id);
  }

  getCampusGuideBySlug(slug: string): CampusGuide | undefined {
    const clean = slug.trim().toLowerCase();
    return this.memoryCampusGuides.find((g) => g.slug.toLowerCase() === clean);
  }

  async saveCampusGuide(
    data: Partial<CampusGuide> & { title: string; category: GuideCategory },
    adminUserId?: string
  ): Promise<CampusGuide> {
    const isNew = !data.id || !this.memoryCampusGuides.some((g) => g.id === data.id);
    const id = data.id || crypto.randomUUID();
    const cleanTitle = data.title.trim();
    if (!cleanTitle) {
      throw new Error('Guide title is required.');
    }

    // Auto-generate clean slug if not explicitly provided
    let slug = data.slug?.trim().toLowerCase();
    if (!slug) {
      slug = cleanTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const now = new Date().toISOString();
    const existing = this.memoryCampusGuides.find((g) => g.id === id);

    const guideToSave: CampusGuide = {
      id,
      title: cleanTitle,
      slug: slug || `guide-${id.slice(0, 8)}`,
      category: data.category,
      shortDescription: (data.shortDescription || '').trim(),
      content: (data.content || '').trim(),
      steps: data.steps && Array.isArray(data.steps) ? data.steps.filter(Boolean) : (existing?.steps || []),
      additionalInfo: data.additionalInfo || existing?.additionalInfo || undefined,
      externalLinks: data.externalLinks || existing?.externalLinks || [],
      attachments: data.attachments || existing?.attachments || [],
      status: data.status || existing?.status || 'DRAFT',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : (existing?.displayOrder ?? this.memoryCampusGuides.length + 1),
      createdBy: isNew ? (adminUserId || data.createdBy || null) : (existing?.createdBy ?? null),
      lastUpdatedBy: adminUserId || data.lastUpdatedBy || null,
      publishedAt: data.status === 'PUBLISHED' ? (existing?.publishedAt || now) : (existing?.publishedAt || null),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapCampusGuideToDb(guideToSave);
      const { error } = await supabase.from('campus_guides').upsert(dbPayload);
      if (error) {
        console.error('[Supabase Store] Error saving campus guide:', error.message);
        throw new Error(`Database error saving guide: ${error.message}`);
      }

      // Sync and persist attachments in database
      if (guideToSave.attachments && guideToSave.attachments.length > 0) {
        for (const att of guideToSave.attachments) {
          const attDbPayload = mapGuideAttachmentToDb(att);
          const { error: attErr } = await supabase.from('campus_guide_attachments').upsert(attDbPayload);
          if (attErr) {
            console.warn('[Supabase Store] Error saving guide attachment:', attErr.message);
          }
        }
      }

      // Clean up any removed attachments (both from database and Supabase Storage)
      if (existing?.attachments && existing.attachments.length > 0) {
        const currentIds = new Set((guideToSave.attachments || []).map((a) => a.id));
        const removed = existing.attachments.filter((a) => !currentIds.has(a.id));
        for (const rem of removed) {
          await supabase.from('campus_guide_attachments').delete().eq('id', rem.id);
          if (rem.storagePath) {
            deleteCampusGuideFile(rem.storagePath).catch((err) =>
              console.warn('[Storage] Clean up previous attachment error:', err)
            );
          }
        }
      }
    }

    const list = [...this.memoryCampusGuides];
    const index = list.findIndex((g) => g.id === guideToSave.id);
    if (index >= 0) {
      list[index] = guideToSave;
    } else {
      list.unshift(guideToSave);
    }
    this.memoryCampusGuides = list;
    emitChange();

    this.logAudit(isNew ? 'CREATE_CAMPUS_GUIDE' : 'UPDATE_CAMPUS_GUIDE', 'CAMPUS_GUIDE', guideToSave.id, {
      title: guideToSave.title,
      category: guideToSave.category,
      status: guideToSave.status,
    });

    return guideToSave;
  }

  async updateCampusGuideStatus(
    id: string,
    newStatus: GuideStatus,
    adminUserId?: string
  ): Promise<CampusGuide> {
    const existing = this.memoryCampusGuides.find((g) => g.id === id);
    if (!existing) {
      throw new Error(`Campus guide with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updated: CampusGuide = {
      ...existing,
      status: newStatus,
      publishedAt: newStatus === 'PUBLISHED' ? (existing.publishedAt || now) : existing.publishedAt,
      lastUpdatedBy: adminUserId || existing.lastUpdatedBy,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('campus_guides')
        .update({
          status: newStatus,
          published_at: updated.publishedAt,
          last_updated_by: updated.lastUpdatedBy,
          updated_at: now,
        })
        .eq('id', id);

      if (error) {
        console.error('[Supabase Store] Error updating guide status:', error.message);
        throw new Error(`Database error updating status: ${error.message}`);
      }
    }

    this.memoryCampusGuides = this.memoryCampusGuides.map((g) => (g.id === id ? updated : g));
    emitChange();

    this.logAudit('UPDATE_GUIDE_STATUS', 'CAMPUS_GUIDE', id, { previous: existing.status, current: newStatus });
    return updated;
  }

  async deleteCampusGuide(id: string): Promise<boolean> {
    const target = this.memoryCampusGuides.find((g) => g.id === id);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('campus_guides').delete().eq('id', id);
      if (error) {
        console.error('[Supabase Store] Error deleting campus guide:', error.message);
        throw new Error(`Database error deleting guide: ${error.message}`);
      }
    }

    // Clean up attachment files from Supabase Storage
    if (target?.attachments && target.attachments.length > 0) {
      for (const att of target.attachments) {
        if (att.storagePath) {
          try {
            await deleteCampusGuideFile(att.storagePath);
          } catch (err: any) {
            console.warn('[Supabase Storage] Warning deleting attachment during guide deletion:', err?.message);
          }
        }
      }
    }

    this.memoryCampusGuides = this.memoryCampusGuides.filter((g) => g.id !== id);
    emitChange();

    this.logAudit('DELETE_CAMPUS_GUIDE', 'CAMPUS_GUIDE', id, {});
    return true;
  }

  async addGuideAttachment(attachment: GuideAttachment): Promise<GuideAttachment> {
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapGuideAttachmentToDb(attachment);
      const { error } = await supabase.from('campus_guide_attachments').upsert(dbPayload);
      if (error) {
        console.error('[Supabase Store] Error saving guide attachment:', error.message);
        throw new Error(`Database error saving attachment: ${error.message}`);
      }
    }

    this.memoryCampusGuides = this.memoryCampusGuides.map((g) => {
      if (g.id === attachment.guideId) {
        const nextAtts = [...(g.attachments || []).filter((a) => a.id !== attachment.id), attachment];
        return { ...g, attachments: nextAtts, updatedAt: new Date().toISOString() };
      }
      return g;
    });
    emitChange();

    return attachment;
  }

  async deleteGuideAttachment(attachmentId: string, guideId?: string): Promise<boolean> {
    let attachmentStoragePath: string | undefined;
    for (const g of this.memoryCampusGuides) {
      const found = g.attachments?.find((a) => a.id === attachmentId);
      if (found) {
        attachmentStoragePath = found.storagePath;
        break;
      }
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('campus_guide_attachments').delete().eq('id', attachmentId);
      if (error) {
        console.error('[Supabase Store] Error deleting guide attachment:', error.message);
      }
    }

    if (attachmentStoragePath) {
      try {
        await deleteCampusGuideFile(attachmentStoragePath);
      } catch (err: any) {
        console.warn('[Supabase Storage] Warning deleting attachment file:', err?.message);
      }
    }

    this.memoryCampusGuides = this.memoryCampusGuides.map((g) => {
      if (!guideId || g.id === guideId) {
        const filtered = (g.attachments || []).filter((a) => a.id !== attachmentId);
        return { ...g, attachments: filtered, updatedAt: new Date().toISOString() };
      }
      return g;
    });
    emitChange();

    return true;
  }

  /**
   * Universal Campus Hub Search across BOTH:
   * 1. Announcements (Time-sensitive notices)
   * 2. Campus Guides (Permanent procedures, steps, categories, and content)
   */
  searchCampusHub(
    query: string,
    includeUnpublished = false
  ): { announcements: Announcement[]; guides: CampusGuide[] } {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        announcements: this.memoryAnnouncements.filter((a) => a.status === 'approved' || a.verified),
        guides: this.memoryCampusGuides.filter((g) => includeUnpublished || g.status === 'PUBLISHED'),
      };
    }

    const words = q.split(/\s+/).filter(Boolean);

    // Search Announcements (time-sensitive bulletins)
    const matchedAnnouncements = this.memoryAnnouncements.filter((a) => {
      if (!includeUnpublished && a.status !== 'approved' && !a.verified) return false;
      const combined = [
        a.title,
        a.description,
        a.category,
        a.publisherName,
        a.locationName || '',
      ].join(' ').toLowerCase();

      return combined.includes(q) || (words.length > 1 && words.every((w) => combined.includes(w)));
    });

    // Search Campus Guides (permanent procedural repository)
    const matchedGuides = this.memoryCampusGuides.filter((g) => {
      if (!includeUnpublished && g.status !== 'PUBLISHED') return false;
      const combined = [
        g.title,
        g.slug,
        g.category,
        g.category.replace(/_/g, ' '),
        g.shortDescription,
        g.content,
        ...g.steps,
        g.additionalInfo?.whoCanUse || '',
        g.additionalInfo?.importantNotes || '',
        ...(g.additionalInfo?.requiredInformation || []),
        ...g.externalLinks.map((l) => `${l.label} ${l.url}`),
      ].join(' ').toLowerCase();

      return combined.includes(q) || (words.length > 1 && words.every((w) => combined.includes(w)));
    });

    return {
      announcements: matchedAnnouncements,
      guides: matchedGuides,
    };
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS (Authoritative in Supabase PostgreSQL audit_logs)
  // --------------------------------------------------------------------------
  getAuditLogs(): any[] {
    return this.memoryAuditLogs;
  }

  async logAudit(action: string, resourceType: string, resourceId: string, details: any) {
    const auditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      created_at: new Date().toISOString(),
    };

    this.memoryAuditLogs = [auditRecord, ...this.memoryAuditLogs].slice(0, 50);

    if (isSupabaseConfigured() && supabase) {
      supabase.from('audit_logs').insert([auditRecord]).then(({ error }) => {
        if (error) console.warn('[Supabase Store] Audit log notice:', error.message);
      });
    }
  }

  // --------------------------------------------------------------------------
  // RESET ALL
  // --------------------------------------------------------------------------
  async resetAll(): Promise<void> {
    this.memoryLocations = [...SEED_LOCATIONS];
    this.memoryEvents = [...SEED_EVENTS];
    this.memoryFaculty = [...SEED_FACULTY];
    this.memoryFacultyApplications = [...SEED_FACULTY_APPLICATIONS];
    this.memoryAnnouncements = [...SEED_ANNOUNCEMENTS];
    this.memoryPublishers = [...SEED_PUBLISHERS];
    this.memoryCampusGuides = [...SEED_CAMPUS_GUIDES];
    this.memoryAuditLogs = [];
    this.memorySavedEvents.clear();
    this.memorySavedLocations.clear();
    emitChange();
  }
}

export const storage = new StorageService();
