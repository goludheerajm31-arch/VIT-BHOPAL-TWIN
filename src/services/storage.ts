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
} from '../types';
import {
  SEED_LOCATIONS,
  SEED_EVENTS,
  SEED_ANNOUNCEMENTS,
  SEED_PUBLISHERS,
  SEED_USERS,
  SEED_FACULTY,
} from './data/seeds';
import { api } from './api';
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
} from '../lib/supabase';

const STORAGE_KEYS = {
  LOCATIONS: 'vit_digital_twin_locations_v4',
  EVENTS: 'vit_digital_twin_events_v4',
  ANNOUNCEMENTS: 'vit_digital_twin_announcements_v2',
  PUBLISHERS: 'vit_digital_twin_publishers_v1',
  USERS: 'vit_digital_twin_users_v1',
  SAVED_EVENTS: 'vit_digital_twin_saved_events_v1',
  SAVED_LOCATIONS: 'vit_digital_twin_saved_locations_v1',
  RECENT_SEARCHES: 'vit_digital_twin_recent_searches_v1',
  FACULTY: 'vit_digital_twin_faculty_v4',
  AUDIT_LOGS: 'vit_digital_twin_audit_logs_v1',
};

// Event dispatched across the app when persistent data is updated
export const DATA_CHANGE_EVENT = 'vit-twin-data-changed';

function emitChange(detail?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, { detail }));
  }
}

function getItem<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from cache:`, err);
    return defaultVal;
  }
}

function setItem<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
    emitChange();
  } catch (err) {
    console.error(`Error writing ${key} to cache:`, err);
  }
}

class StorageService {
  private initialSyncStarted = false;
  private memoryLocations: CampusLocation[] = SEED_LOCATIONS;
  private memoryEvents: CampusEvent[] = SEED_EVENTS;
  private memoryFaculty: FacultyMember[] = SEED_FACULTY;
  private memoryAnnouncements: Announcement[] = SEED_ANNOUNCEMENTS;
  private memoryPublishers: Publisher[] = SEED_PUBLISHERS;
  private memoryAuditLogs: any[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize in-memory state from cached items if available
      this.memoryLocations = getItem<CampusLocation[]>(STORAGE_KEYS.LOCATIONS, SEED_LOCATIONS);
      this.memoryEvents = getItem<CampusEvent[]>(STORAGE_KEYS.EVENTS, SEED_EVENTS);
      this.memoryFaculty = getItem<FacultyMember[]>(STORAGE_KEYS.FACULTY, SEED_FACULTY);
      this.memoryAnnouncements = getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
      this.memoryPublishers = getItem<Publisher[]>(STORAGE_KEYS.PUBLISHERS, SEED_PUBLISHERS);
      this.memoryAuditLogs = getItem<any[]>(STORAGE_KEYS.AUDIT_LOGS, []);

      // Trigger initial server/supabase sync
      this.syncAllFromServer();

      // Listen for remote real-time events to update in-memory state
      window.addEventListener(DATA_CHANGE_EVENT, (e: any) => {
        if (e?.detail) {
          this.handleRealtimeEvent(e.detail);
        }
      });
    }
  }

  async syncAllFromServer() {
    if (this.initialSyncStarted) return;
    this.initialSyncStarted = true;

    // 1. Direct Supabase Query when configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const [
          locsRes,
          evtsRes,
          facRes,
          annRes,
          pubRes,
          auditRes,
        ] = await Promise.all([
          supabase.from('locations').select('*').order('name', { ascending: true }),
          supabase.from('events').select('*').order('date', { ascending: true }),
          supabase.from('faculty').select('*').order('name', { ascending: true }),
          supabase.from('announcements').select('*').order('created_at', { ascending: false }),
          supabase.from('publishers').select('*').then(res => res.error ? supabase.from('clubs').select('*') : res),
          supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(40).then((res) => res, () => ({ error: null, data: [] } as any)),
        ]);

        let hasUpdates = false;

        if (!locsRes.error && locsRes.data && locsRes.data.length > 0) {
          this.memoryLocations = locsRes.data.map(mapDbToLocation);
          localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(this.memoryLocations));
          hasUpdates = true;
        }

        if (!evtsRes.error && evtsRes.data && evtsRes.data.length > 0) {
          this.memoryEvents = evtsRes.data.map(mapDbToEvent);
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.memoryEvents));
          hasUpdates = true;
        }

        if (!facRes.error && facRes.data && facRes.data.length > 0) {
          this.memoryFaculty = facRes.data.map(mapDbToFaculty);
          localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(this.memoryFaculty));
          hasUpdates = true;
        }

        if (!annRes.error && annRes.data && annRes.data.length > 0) {
          this.memoryAnnouncements = annRes.data.map(mapDbToAnnouncement);
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(this.memoryAnnouncements));
          hasUpdates = true;
        }

        if (!pubRes.error && pubRes.data && pubRes.data.length > 0) {
          this.memoryPublishers = pubRes.data.map(mapDbToPublisher);
          localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(this.memoryPublishers));
          hasUpdates = true;
        }

        if (!auditRes.error && auditRes.data) {
          this.memoryAuditLogs = auditRes.data;
          localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.memoryAuditLogs));
          hasUpdates = true;
        }

        if (hasUpdates) {
          emitChange({ source: 'supabase-initial-sync' });
        }
        return;
      } catch (err) {
        console.warn('[Storage] Supabase sync fallback to local backend:', err);
      }
    }

    // 2. Fallback to existing server API
    try {
      const [locations, events, announcements, faculty, publishers] = await Promise.all([
        api.getLocations().catch(() => null),
        api.getEvents().catch(() => null),
        api.getAnnouncements().catch(() => null),
        api.getFaculty().catch(() => null),
        api.getPublishers().catch(() => null),
      ]);

      let changed = false;
      if (locations && locations.length > 0) {
        this.memoryLocations = locations;
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
        changed = true;
      }
      if (events && events.length > 0) {
        this.memoryEvents = events;
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        changed = true;
      }
      if (announcements && announcements.length > 0) {
        this.memoryAnnouncements = announcements;
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
        changed = true;
      }
      if (faculty && faculty.length > 0) {
        this.memoryFaculty = faculty;
        localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(faculty));
        changed = true;
      }
      if (publishers && publishers.length > 0) {
        this.memoryPublishers = publishers;
        localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(publishers));
        changed = true;
      }

      if (changed) {
        emitChange({ source: 'server-initial-sync' });
      }
    } catch (err) {
      console.warn('[Storage] Initial sync error:', err);
    }
  }

  private handleRealtimeEvent(detail: any) {
    if (!detail) return;

    // Handle Supabase Realtime table mutations
    if (detail.table) {
      const { table, eventType, new: newRecord, old: oldRecord } = detail;

      if (table === 'events') {
        if (eventType === 'INSERT' && newRecord) {
          const mapped = mapDbToEvent(newRecord);
          this.memoryEvents = [mapped, ...this.memoryEvents.filter((e) => e.id !== mapped.id)];
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.memoryEvents));
        } else if (eventType === 'UPDATE' && newRecord) {
          const mapped = mapDbToEvent(newRecord);
          this.memoryEvents = this.memoryEvents.map((e) => (e.id === mapped.id ? mapped : e));
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.memoryEvents));
        } else if (eventType === 'DELETE' && oldRecord) {
          this.memoryEvents = this.memoryEvents.filter((e) => e.id !== oldRecord.id);
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.memoryEvents));
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
          localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(this.memoryLocations));
        } else if (eventType === 'DELETE' && oldRecord) {
          this.memoryLocations = this.memoryLocations.filter((l) => l.id !== oldRecord.id);
          localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(this.memoryLocations));
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
          localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(this.memoryFaculty));
        } else if (eventType === 'DELETE' && oldRecord) {
          this.memoryFaculty = this.memoryFaculty.filter((f) => f.id !== oldRecord.id);
          localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(this.memoryFaculty));
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
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(this.memoryAnnouncements));
        } else if (eventType === 'DELETE' && oldRecord) {
          this.memoryAnnouncements = this.memoryAnnouncements.filter((a) => a.id !== oldRecord.id);
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(this.memoryAnnouncements));
        }
      } else if (table === 'publishers' || table === 'clubs') {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
          const mapped = mapDbToPublisher(newRecord);
          const index = this.memoryPublishers.findIndex((p) => p.id === mapped.id);
          if (index >= 0) {
            this.memoryPublishers[index] = mapped;
          } else {
            this.memoryPublishers = [mapped, ...this.memoryPublishers];
          }
          localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(this.memoryPublishers));
        } else if (eventType === 'DELETE' && oldRecord) {
          this.memoryPublishers = this.memoryPublishers.filter((p) => p.id !== oldRecord.id);
          localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(this.memoryPublishers));
        }
      } else if (table === 'audit_logs') {
        if (eventType === 'INSERT' && newRecord) {
          this.memoryAuditLogs = [newRecord, ...this.memoryAuditLogs].slice(0, 50);
          localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.memoryAuditLogs));
        }
      }
      return;
    }

    // Fallback SSE event type matching
    if (detail.type) {
      const type: string = detail.type;
      if (type.startsWith('EVENT')) {
        api.getEvents().then((ev) => {
          if (ev) {
            this.memoryEvents = ev;
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(ev));
          }
        }).catch(() => {});
      } else if (type.startsWith('LOCATION')) {
        api.getLocations().then((locs) => {
          if (locs) {
            this.memoryLocations = locs;
            localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locs));
          }
        }).catch(() => {});
      } else if (type.startsWith('FACULTY')) {
        api.getFaculty().then((fac) => {
          if (fac) {
            this.memoryFaculty = fac;
            localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(fac));
          }
        }).catch(() => {});
      } else if (type.startsWith('ANNOUNCEMENT')) {
        api.getAnnouncements().then((anns) => {
          if (anns) {
            this.memoryAnnouncements = anns;
            localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(anns));
          }
        }).catch(() => {});
      }
    }
  }

  // --------------------------------------------------------------------------
  // LOCATIONS
  // --------------------------------------------------------------------------
  getLocations(): CampusLocation[] {
    return this.memoryLocations;
  }

  getLocationById(id: string): CampusLocation | undefined {
    const list = this.getLocations();
    const exact = list.find((loc) => loc.id === id);
    if (exact) return exact;

    // Fallback alias resolution for previous IDs and quick query handles
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
    const list = [...this.memoryLocations];
    const index = list.findIndex((l) => l.id === location.id);
    if (index >= 0) {
      list[index] = location;
    } else {
      list.unshift(location);
    }
    this.memoryLocations = list;
    setItem(STORAGE_KEYS.LOCATIONS, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('locations').upsert(mapLocationToDb(location));
        if (error) {
          console.warn('[Storage] Supabase saveLocation notice (ensure supabase/schema.sql is executed):', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase saveLocation network exception:', err);
      }
    } else {
      await api.saveLocation(location).catch((err) => {
        console.warn('[Storage] Remote location save error:', err);
      });
    }

    this.logAudit('SAVE', 'LOCATION', location.id, { name: location.name });
    return location;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const list = this.memoryLocations.filter((l) => l.id !== id);
    this.memoryLocations = list;
    setItem(STORAGE_KEYS.LOCATIONS, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) {
          console.warn('[Storage] Supabase deleteLocation notice:', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase deleteLocation exception:', err);
      }
    }

    this.logAudit('DELETE', 'LOCATION', id, {});
    return true;
  }

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------
  getEvents(): CampusEvent[] {
    return this.memoryEvents;
  }

  getEventById(id: string): CampusEvent | undefined {
    return this.getEvents().find((ev) => ev.id === id);
  }

  getEventsByLocationId(locationId: string): CampusEvent[] {
    return this.getEvents().filter((ev) => ev.locationId === locationId);
  }

  async saveEvent(event: CampusEvent): Promise<CampusEvent> {
    const list = [...this.memoryEvents];
    const index = list.findIndex((e) => e.id === event.id);
    if (index >= 0) {
      list[index] = event;
    } else {
      list.unshift(event);
    }
    this.memoryEvents = list;
    setItem(STORAGE_KEYS.EVENTS, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('events').upsert(mapEventToDb(event));
        if (error) {
          console.warn('[Storage] Supabase saveEvent notice (ensure supabase/schema.sql is executed):', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase saveEvent exception:', err);
      }
    } else {
      await api.saveEvent(event).catch((err) => {
        console.warn('[Storage] Remote event save error:', err);
      });
    }

    this.logAudit('SAVE', 'EVENT', event.id, { title: event.title, date: event.date });
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const list = this.memoryEvents.filter((e) => e.id !== id);
    this.memoryEvents = list;
    setItem(STORAGE_KEYS.EVENTS, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) {
          console.warn('[Storage] Supabase deleteEvent notice:', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase deleteEvent exception:', err);
      }
    } else {
      await api.deleteEvent(id).catch((err) => {
        console.warn('[Storage] Remote event delete error:', err);
      });
    }

    this.logAudit('DELETE', 'EVENT', id, {});
    return true;
  }

  // --------------------------------------------------------------------------
  // ANNOUNCEMENTS
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
    const list = [...this.memoryAnnouncements];
    const index = list.findIndex((a) => a.id === announcement.id);
    if (index >= 0) {
      list[index] = announcement;
    } else {
      list.unshift(announcement);
    }
    this.memoryAnnouncements = list;
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('announcements').upsert(mapAnnouncementToDb(announcement));
      if (error) {
        console.error('[Storage] Supabase saveAnnouncement error:', error);
      }
    } else {
      await api.saveAnnouncement(announcement).then((res) => {
        if (res && res.status) {
          announcement.status = res.status as any;
          announcement.verified = Boolean(res.verified);
        }
      }).catch((err) => {
        console.warn('[Storage] Remote announcement save error:', err);
      });
    }

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

    item.status = approvalStatus;
    item.verified = approvalStatus === 'approved';
    item.reviewedAt = new Date().toISOString();
    item.rejectionReason = approvalStatus === 'rejected' ? (rejectionReason || 'Declined by administration') : undefined;

    this.memoryAnnouncements = list;
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);

    try {
      await api.verifyAnnouncement(id, approvalStatus, rejectionReason);
    } catch (err) {
      console.warn('[Storage] Remote verifyAnnouncement error:', err);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('announcements').upsert(mapAnnouncementToDb(item));
      } catch (err) {
        console.warn('[Storage] Supabase announcement verify error:', err);
      }
    }

    this.logAudit(
      approvalStatus === 'approved' ? 'VERIFY' : 'REJECT',
      'ANNOUNCEMENT',
      id,
      { title: item.title, status: approvalStatus, rejectionReason }
    );
    return item;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const list = this.memoryAnnouncements.filter((a) => a.id !== id);
    this.memoryAnnouncements = list;
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) {
          console.warn('[Storage] Supabase deleteAnnouncement notice:', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase deleteAnnouncement exception:', err);
      }
    } else {
      await api.deleteAnnouncement(id).catch((err) => {
        console.warn('[Storage] Remote announcement delete error:', err);
      });
    }

    this.logAudit('DELETE', 'ANNOUNCEMENT', id, {});
    return true;
  }

  // --------------------------------------------------------------------------
  // PUBLISHERS & CLUBS
  // --------------------------------------------------------------------------
  getPublishers(): Publisher[] {
    return this.memoryPublishers;
  }

  getPublisherById(id: string): Publisher | undefined {
    return this.getPublishers().find((p) => p.id === id);
  }

  async togglePublisherVerification(id: string): Promise<Publisher | undefined> {
    const publishers = [...this.memoryPublishers];
    const publisher = publishers.find((p) => p.id === id);
    if (publisher) {
      publisher.verified = !publisher.verified;
      publisher.verifiedAt = publisher.verified ? new Date().toISOString().split('T')[0] : undefined;
      this.memoryPublishers = publishers;
      setItem(STORAGE_KEYS.PUBLISHERS, publishers);

      // Sync to Supabase
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('clubs')
          .update({
            verified: publisher.verified,
            verified_at: publisher.verifiedAt ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) {
          console.error('[Storage] Supabase update publisher error:', error);
        }
      } else {
        api.togglePublisherVerification(id).catch((err) => {
          console.warn('[Storage] Remote publisher verify error:', err);
        });
      }

      this.logAudit('VERIFY', 'PUBLISHER', id, { verified: publisher.verified });
    }
    return publisher;
  }

  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  getUsers(): User[] {
    return getItem<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
  }

  // --------------------------------------------------------------------------
  // SAVED ITEMS
  // --------------------------------------------------------------------------
  getSavedEvents(userId: string): string[] {
    const all = getItem<SavedEvent[]>(STORAGE_KEYS.SAVED_EVENTS, []);
    return all.filter((s) => s.userId === userId).map((s) => s.eventId);
  }

  toggleSaveEvent(userId: string, eventId: string): boolean {
    let all = getItem<SavedEvent[]>(STORAGE_KEYS.SAVED_EVENTS, []);
    const exists = all.some((s) => s.userId === userId && s.eventId === eventId);
    if (exists) {
      all = all.filter((s) => !(s.userId === userId && s.eventId === eventId));
      setItem(STORAGE_KEYS.SAVED_EVENTS, all);
      api.toggleSaveEvent(eventId).catch(() => {});
      return false;
    } else {
      all.push({ userId, eventId, savedAt: new Date().toISOString() });
      setItem(STORAGE_KEYS.SAVED_EVENTS, all);
      api.toggleSaveEvent(eventId).catch(() => {});
      return true;
    }
  }

  isEventSaved(userId: string, eventId: string): boolean {
    const all = getItem<SavedEvent[]>(STORAGE_KEYS.SAVED_EVENTS, []);
    return all.some((s) => s.userId === userId && s.eventId === eventId);
  }

  getSavedLocations(userId: string): string[] {
    const all = getItem<SavedLocation[]>(STORAGE_KEYS.SAVED_LOCATIONS, []);
    return all.filter((s) => s.userId === userId).map((s) => s.locationId);
  }

  toggleSaveLocation(userId: string, locationId: string): boolean {
    let all = getItem<SavedLocation[]>(STORAGE_KEYS.SAVED_LOCATIONS, []);
    const exists = all.some((s) => s.userId === userId && s.locationId === locationId);
    if (exists) {
      all = all.filter((s) => !(s.userId === userId && s.locationId === locationId));
      setItem(STORAGE_KEYS.SAVED_LOCATIONS, all);
      api.toggleSaveLocation(locationId).catch(() => {});
      return false;
    } else {
      all.push({ userId, locationId, savedAt: new Date().toISOString() });
      setItem(STORAGE_KEYS.SAVED_LOCATIONS, all);
      api.toggleSaveLocation(locationId).catch(() => {});
      return true;
    }
  }

  isLocationSaved(userId: string, locationId: string): boolean {
    const all = getItem<SavedLocation[]>(STORAGE_KEYS.SAVED_LOCATIONS, []);
    return all.some((s) => s.userId === userId && s.locationId === locationId);
  }

  // --------------------------------------------------------------------------
  // RECENT SEARCHES
  // --------------------------------------------------------------------------
  getRecentSearches(): string[] {
    return getItem<string[]>(STORAGE_KEYS.RECENT_SEARCHES, [
      'AI Club Workshop',
      'Central Library',
      'Seminar Hall',
      'Food Court',
    ]);
  }

  addRecentSearch(term: string): void {
    const clean = term.trim();
    if (!clean) return;
    let list = this.getRecentSearches().filter((t) => t.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    if (list.length > 8) list = list.slice(0, 8);
    setItem(STORAGE_KEYS.RECENT_SEARCHES, list);
  }

  clearRecentSearches(): void {
    setItem(STORAGE_KEYS.RECENT_SEARCHES, []);
  }

  // --------------------------------------------------------------------------
  // FACULTY & CABINS
  // --------------------------------------------------------------------------
  getFaculty(): FacultyMember[] {
    return this.memoryFaculty;
  }

  getFacultyById(id: string): FacultyMember | undefined {
    return this.getFaculty().find((f) => f.id === id);
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

  async saveFaculty(faculty: FacultyMember): Promise<FacultyMember> {
    const list = [...this.memoryFaculty];
    const index = list.findIndex((f) => f.id === faculty.id);
    if (index >= 0) {
      list[index] = faculty;
    } else {
      list.unshift(faculty);
    }
    this.memoryFaculty = list;
    setItem(STORAGE_KEYS.FACULTY, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('faculty').upsert(mapFacultyToDb(faculty));
        if (error) {
          console.warn('[Storage] Supabase saveFaculty notice (ensure supabase/schema.sql is executed):', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase saveFaculty exception:', err);
      }
    } else {
      await api.saveFaculty(faculty).catch((err) => {
        console.warn('[Storage] Remote faculty save error:', err);
      });
    }

    this.logAudit('SAVE', 'FACULTY', faculty.id, { name: faculty.name, cabin: faculty.cabinNumber });
    return faculty;
  }

  async deleteFaculty(id: string): Promise<boolean> {
    const list = this.memoryFaculty.filter((f) => f.id !== id);
    this.memoryFaculty = list;
    setItem(STORAGE_KEYS.FACULTY, list);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('faculty').delete().eq('id', id);
        if (error) {
          console.warn('[Storage] Supabase deleteFaculty notice:', error.message);
        }
      } catch (err) {
        console.warn('[Storage] Supabase deleteFaculty exception:', err);
      }
    } else {
      await api.deleteFaculty(id).catch((err) => {
        console.warn('[Storage] Remote faculty delete error:', err);
      });
    }

    this.logAudit('DELETE', 'FACULTY', id, {});
    return true;
  }

  async resetFaculty(): Promise<void> {
    this.memoryFaculty = SEED_FACULTY;
    setItem(STORAGE_KEYS.FACULTY, SEED_FACULTY);

    if (isSupabaseConfigured() && supabase) {
      for (const f of SEED_FACULTY) {
        await supabase.from('faculty').upsert(mapFacultyToDb(f));
      }
    } else {
      await api.resetFaculty().catch((err) => {
        console.warn('[Storage] Remote faculty reset error:', err);
      });
    }
  }

  async updateFacultyStatus(id: string, status: FacultyStatus): Promise<void> {
    const list = [...this.memoryFaculty];
    const target = list.find((f) => f.id === id);
    if (target) {
      target.status = status;
      this.memoryFaculty = list;
      setItem(STORAGE_KEYS.FACULTY, list);

      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase
            .from('faculty')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) {
            console.warn('[Storage] Supabase update faculty status notice:', error.message);
          }
        } catch (err) {
          console.warn('[Storage] Supabase update faculty status exception:', err);
        }
      } else {
        await api.updateFacultyStatus(id, status).catch((err) => {
          console.warn('[Storage] Remote faculty status error:', err);
        });
      }

      this.logAudit('UPDATE_STATUS', 'FACULTY', id, { status });
    }
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS
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
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.memoryAuditLogs));

    if (isSupabaseConfigured() && supabase) {
      supabase.from('audit_logs').insert([auditRecord]).then(() => {});
    }
  }

  // --------------------------------------------------------------------------
  // RESET ALL
  // --------------------------------------------------------------------------
  resetAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(STORAGE_KEYS.PUBLISHERS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SAVED_EVENTS);
    localStorage.removeItem(STORAGE_KEYS.SAVED_LOCATIONS);
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    localStorage.removeItem(STORAGE_KEYS.FACULTY);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    this.memoryLocations = SEED_LOCATIONS;
    this.memoryEvents = SEED_EVENTS;
    this.memoryFaculty = SEED_FACULTY;
    this.memoryAnnouncements = SEED_ANNOUNCEMENTS;
    this.memoryPublishers = SEED_PUBLISHERS;
    this.memoryAuditLogs = [];
    emitChange();
  }
}

export const storage = new StorageService();
