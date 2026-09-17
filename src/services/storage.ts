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
};

// Event dispatched when persistent data is updated
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
    console.error(`Error reading ${key} from storage:`, err);
    return defaultVal;
  }
}

function setItem<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
    emitChange();
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

class StorageService {
  private initialSyncStarted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Background initial sync from server DB on load
      this.syncAllFromServer();

      // Listen for remote real-time SSE broadcasts to re-sync
      window.addEventListener(DATA_CHANGE_EVENT, (e: any) => {
        if (e?.detail?.type) {
          // Re-sync relevant domain
          this.handleRealtimeEvent(e.detail.type);
        }
      });
    }
  }

  async syncAllFromServer() {
    if (this.initialSyncStarted) return;
    this.initialSyncStarted = true;

    try {
      const [locations, events, announcements, faculty, publishers] = await Promise.all([
        api.getLocations().catch(() => null),
        api.getEvents().catch(() => null),
        api.getAnnouncements().catch(() => null),
        api.getFaculty().catch(() => null),
        api.getPublishers().catch(() => null),
      ]);

      let changed = false;
      if (locations) {
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
        changed = true;
      }
      if (events) {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        changed = true;
      }
      if (announcements) {
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
        changed = true;
      }
      if (faculty) {
        localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(faculty));
        changed = true;
      }
      if (publishers) {
        localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(publishers));
        changed = true;
      }

      if (changed) {
        emitChange({ source: 'server-initial-sync' });
      }
    } catch (err) {
      console.warn('[Storage] Server sync fallback to local cache:', err);
    }
  }

  private async handleRealtimeEvent(type: string) {
    try {
      if (type.startsWith('EVENT')) {
        const events = await api.getEvents();
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        emitChange({ source: 'realtime-event-sync' });
      } else if (type.startsWith('ANNOUNCEMENT')) {
        const announcements = await api.getAnnouncements();
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
        emitChange({ source: 'realtime-announcement-sync' });
      } else if (type.startsWith('FACULTY')) {
        const faculty = await api.getFaculty();
        localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(faculty));
        emitChange({ source: 'realtime-faculty-sync' });
      } else if (type.startsWith('PUBLISHER')) {
        const publishers = await api.getPublishers();
        localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(publishers));
        emitChange({ source: 'realtime-publisher-sync' });
      } else if (type.startsWith('LOCATION')) {
        const locations = await api.getLocations();
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
        emitChange({ source: 'realtime-location-sync' });
      }
    } catch (err) {
      console.warn('[Storage] Realtime refresh error:', err);
    }
  }

  // LOCATIONS
  getLocations(): CampusLocation[] {
    return getItem<CampusLocation[]>(STORAGE_KEYS.LOCATIONS, SEED_LOCATIONS);
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

  saveLocation(location: CampusLocation): void {
    const list = this.getLocations();
    const index = list.findIndex((l) => l.id === location.id);
    if (index >= 0) {
      list[index] = location;
    } else {
      list.unshift(location);
    }
    setItem(STORAGE_KEYS.LOCATIONS, list);

    // Sync to server asynchronously
    api.saveLocation(location).catch((err) => {
      console.warn('[Storage] Remote location save error:', err);
    });
  }

  deleteLocation(id: string): void {
    const list = this.getLocations().filter((l) => l.id !== id);
    setItem(STORAGE_KEYS.LOCATIONS, list);
  }

  // EVENTS
  getEvents(): CampusEvent[] {
    return getItem<CampusEvent[]>(STORAGE_KEYS.EVENTS, SEED_EVENTS);
  }

  getEventById(id: string): CampusEvent | undefined {
    return this.getEvents().find((ev) => ev.id === id);
  }

  getEventsByLocationId(locationId: string): CampusEvent[] {
    return this.getEvents().filter((ev) => ev.locationId === locationId);
  }

  saveEvent(event: CampusEvent): void {
    const list = this.getEvents();
    const index = list.findIndex((e) => e.id === event.id);
    if (index >= 0) {
      list[index] = event;
    } else {
      list.unshift(event);
    }
    setItem(STORAGE_KEYS.EVENTS, list);

    // Sync to server asynchronously
    api.saveEvent(event).catch((err) => {
      console.warn('[Storage] Remote event save error:', err);
    });
  }

  deleteEvent(id: string): void {
    const list = this.getEvents().filter((e) => e.id !== id);
    setItem(STORAGE_KEYS.EVENTS, list);

    // Sync to server asynchronously
    api.deleteEvent(id).catch((err) => {
      console.warn('[Storage] Remote event delete error:', err);
    });
  }

  updateEventStatus(id: string, status: 'approved' | 'rejected' | 'pending'): void {
    const list = this.getEvents();
    const item = list.find((e) => e.id === id);
    if (item) {
      item.approvalStatus = status;
      setItem(STORAGE_KEYS.EVENTS, list);
    }

    // Sync to server asynchronously
    api.updateEventStatus(id, status).catch((err) => {
      console.warn('[Storage] Remote event status error:', err);
    });
  }

  // ANNOUNCEMENTS
  getAnnouncements(): Announcement[] {
    return getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
  }

  getAnnouncementById(id: string): Announcement | undefined {
    return this.getAnnouncements().find((a) => a.id === id);
  }

  saveAnnouncement(announcement: Announcement): void {
    const list = this.getAnnouncements();
    const index = list.findIndex((a) => a.id === announcement.id);
    if (index >= 0) {
      list[index] = announcement;
    } else {
      list.unshift(announcement);
    }
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);

    // Sync to server asynchronously
    api.saveAnnouncement(announcement).catch((err) => {
      console.warn('[Storage] Remote announcement save error:', err);
    });
  }

  deleteAnnouncement(id: string): void {
    const list = this.getAnnouncements().filter((a) => a.id !== id);
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);

    // Sync to server asynchronously
    api.deleteAnnouncement(id).catch((err) => {
      console.warn('[Storage] Remote announcement delete error:', err);
    });
  }

  // PUBLISHERS & VERIFICATION
  getPublishers(): Publisher[] {
    return getItem<Publisher[]>(STORAGE_KEYS.PUBLISHERS, SEED_PUBLISHERS);
  }

  getPublisherById(id: string): Publisher | undefined {
    return this.getPublishers().find((p) => p.id === id);
  }

  togglePublisherVerification(id: string): Publisher | undefined {
    const publishers = this.getPublishers();
    const publisher = publishers.find((p) => p.id === id);
    if (publisher) {
      publisher.verified = !publisher.verified;
      publisher.verifiedAt = publisher.verified ? new Date().toISOString().split('T')[0] : undefined;
      setItem(STORAGE_KEYS.PUBLISHERS, publishers);

      // Sync verification to publisher's events and announcements
      const events = this.getEvents().map((e) =>
        e.publisherId === id ? { ...e, verified: publisher.verified } : e
      );
      setItem(STORAGE_KEYS.EVENTS, events);

      const announcements = this.getAnnouncements().map((a) =>
        a.publisherId === id ? { ...a, verified: publisher.verified } : a
      );
      setItem(STORAGE_KEYS.ANNOUNCEMENTS, announcements);

      // Sync to server asynchronously
      api.togglePublisherVerification(id).catch((err) => {
        console.warn('[Storage] Remote publisher verify error:', err);
      });
    }
    return publisher;
  }

  // USERS
  getUsers(): User[] {
    return getItem<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
  }

  // SAVED ITEMS
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

  // RECENT SEARCHES
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

  // FACULTY & CABINS
  getFaculty(): FacultyMember[] {
    return getItem<FacultyMember[]>(STORAGE_KEYS.FACULTY, SEED_FACULTY);
  }

  getFacultyById(id: string): FacultyMember | undefined {
    return this.getFaculty().find((f) => f.id === id);
  }

  getFacultyByCabin(cabinNumber: string): FacultyMember | undefined {
    const clean = cabinNumber.trim().toLowerCase();
    return this.getFaculty().find(
      (f) => f.cabinNumber.toLowerCase() === clean || f.cabinNumber.toLowerCase().replace(/[-_ ]/g, '') === clean.replace(/[-_ ]/g, '')
    );
  }

  getFacultyByBuilding(buildingId: string): FacultyMember[] {
    return this.getFaculty().filter((f) => f.buildingId === buildingId);
  }

  saveFaculty(faculty: FacultyMember): void {
    const list = this.getFaculty();
    const index = list.findIndex((f) => f.id === faculty.id);
    if (index >= 0) {
      list[index] = faculty;
    } else {
      list.unshift(faculty);
    }
    setItem(STORAGE_KEYS.FACULTY, list);

    api.saveFaculty(faculty).catch((err) => {
      console.warn('[Storage] Remote faculty save error:', err);
    });
  }

  deleteFaculty(id: string): boolean {
    const list = this.getFaculty();
    const filtered = list.filter((f) => f.id !== id);
    if (filtered.length !== list.length) {
      setItem(STORAGE_KEYS.FACULTY, filtered);
      api.deleteFaculty(id).catch((err) => {
        console.warn('[Storage] Remote faculty delete error:', err);
      });
      return true;
    }
    return false;
  }

  resetFaculty(): void {
    setItem(STORAGE_KEYS.FACULTY, SEED_FACULTY);
    api.resetFaculty().catch((err) => {
      console.warn('[Storage] Remote faculty reset error:', err);
    });
  }

  updateFacultyStatus(id: string, status: FacultyStatus): void {
    const list = this.getFaculty();
    const target = list.find((f) => f.id === id);
    if (target) {
      target.status = status;
      setItem(STORAGE_KEYS.FACULTY, list);
      api.updateFacultyStatus(id, status).catch((err) => {
        console.warn('[Storage] Remote faculty status error:', err);
      });
    }
  }

  // RESET DEMO DATA
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
    emitChange();
  }
}

export const storage = new StorageService();
