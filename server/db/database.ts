import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from '../auth/crypto.js';
import {
  SEED_LOCATIONS,
  SEED_EVENTS,
  SEED_ANNOUNCEMENTS,
  SEED_PUBLISHERS,
  SEED_USERS,
  SEED_FACULTY,
} from '../../src/services/data/seeds.js';

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'campus_twin.db');

export const db = new DatabaseSync(DB_PATH);

// Enable Foreign Keys and WAL Mode for performance & concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('STUDENT', 'PUBLISHER', 'ADMIN', 'GUEST')),
      avatar TEXT,
      department TEXT,
      reg_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Auth Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Campus Locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      building TEXT,
      floor TEXT,
      facilities_json TEXT NOT NULL DEFAULT '[]',
      opening_hours TEXT,
      accessibility TEXT,
      image TEXT,
      zone TEXT,
      contact_phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Publishers / Clubs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS publishers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      organization_name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      logo_url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      contact_email TEXT NOT NULL,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 5. Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT NOT NULL,
      organizer TEXT NOT NULL,
      publisher_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      location_name TEXT NOT NULL,
      venue_detail TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      category TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      cover_image TEXT,
      capacity INTEGER,
      registration_url TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming',
      approval_status TEXT NOT NULL DEFAULT 'approved',
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  // 6. Announcements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      publisher_id TEXT NOT NULL,
      publisher_name TEXT NOT NULL,
      location_id TEXT,
      location_name TEXT,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      action_url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 7. Faculty Directory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS faculty (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prefix TEXT,
      designation TEXT NOT NULL,
      school TEXT NOT NULL,
      department_name TEXT NOT NULL,
      cabin_number TEXT NOT NULL,
      building_id TEXT NOT NULL,
      building_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      wing TEXT,
      room_details TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      consultation_hours TEXT NOT NULL,
      subjects_json TEXT NOT NULL DEFAULT '[]',
      research_area TEXT,
      directions_guide TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 8. Saved Items table (Bookmarks)
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('EVENT', 'LOCATION')),
      item_id TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      UNIQUE(user_id, item_type, item_id)
    );
  `);

  // 9. Audit Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default data if database is empty
  seedIfEmpty();
}

function seedIfEmpty() {
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = Number(userCountStmt.get().count);

  if (userCount === 0) {
    console.log('[DB] Seeding users with secure scrypt password hashes...');
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, salt, role, avatar, department, reg_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Standard demo passwords:
    // admin@vitbhopal.ac.in -> Admin@123
    // student@vitbhopal.ac.in -> Student@123
    // aiclub@vitbhopal.ac.in -> Publisher@123
    const passwords: Record<string, string> = {
      'admin@vitbhopal.ac.in': 'Admin@123',
      'student@vitbhopal.ac.in': 'Student@123',
      'aiclub@vitbhopal.ac.in': 'Publisher@123',
    };

    const now = new Date().toISOString();
    for (const u of SEED_USERS) {
      const pwd = passwords[u.email] || 'Campus@123';
      const { hash, salt } = hashPassword(pwd);
      insertUser.run(
        u.id,
        u.name,
        u.email,
        hash,
        salt,
        u.role,
        u.avatar || null,
        u.department || null,
        u.regNumber || null,
        now,
        now
      );
    }
  }

  // Seed Locations
  const locCountStmt = db.prepare('SELECT COUNT(*) as count FROM locations');
  const locCount = Number(locCountStmt.get().count);
  if (locCount === 0) {
    console.log('[DB] Seeding campus locations...');
    const insertLoc = db.prepare(`
      INSERT INTO locations (id, name, category, description, latitude, longitude, building, floor, facilities_json, opening_hours, accessibility, image, zone, contact_phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const l of SEED_LOCATIONS) {
      insertLoc.run(
        l.id,
        l.name,
        l.category,
        l.description,
        l.latitude,
        l.longitude,
        l.building || null,
        l.floor || null,
        JSON.stringify(l.facilities || []),
        l.openingHours || null,
        l.accessibility || null,
        l.image || null,
        l.zone || null,
        l.contactPhone || null,
        now,
        now
      );
    }
  }

  // Seed Publishers
  const pubCountStmt = db.prepare('SELECT COUNT(*) as count FROM publishers');
  const pubCount = Number(pubCountStmt.get().count);
  if (pubCount === 0) {
    console.log('[DB] Seeding publishers and student clubs...');
    const insertPub = db.prepare(`
      INSERT INTO publishers (id, user_id, organization_name, category, description, logo_url, verified, contact_email, verified_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const p of SEED_PUBLISHERS) {
      insertPub.run(
        p.id,
        p.userId || null,
        p.organizationName,
        p.category,
        p.description,
        p.logoUrl || null,
        p.verified ? 1 : 0,
        p.contactEmail,
        p.verifiedAt || null,
        now,
        now
      );
    }
  }

  // Seed Events
  const eventCountStmt = db.prepare('SELECT COUNT(*) as count FROM events');
  const eventCount = Number(eventCountStmt.get().count);
  if (eventCount === 0) {
    console.log('[DB] Seeding campus events...');
    const insertEvent = db.prepare(`
      INSERT INTO events (id, title, subtitle, description, organizer, publisher_id, location_id, location_name, venue_detail, date, start_time, end_time, category, verified, cover_image, capacity, registration_url, status, approval_status, tags_json, created_by, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const e of SEED_EVENTS) {
      insertEvent.run(
        e.id,
        e.title,
        e.subtitle || null,
        e.description,
        e.organizer,
        e.publisherId,
        e.locationId,
        e.locationName,
        e.venueDetail || null,
        e.date,
        e.startTime,
        e.endTime,
        e.category,
        e.verified ? 1 : 0,
        e.coverImage || null,
        e.capacity || null,
        e.registrationUrl || null,
        e.status,
        e.approvalStatus || 'approved',
        JSON.stringify(e.tags || []),
        'user-admin',
        now,
        now,
        1
      );
    }
  }

  // Seed Announcements
  const annCountStmt = db.prepare('SELECT COUNT(*) as count FROM announcements');
  const annCount = Number(annCountStmt.get().count);
  if (annCount === 0) {
    console.log('[DB] Seeding campus announcements...');
    const insertAnn = db.prepare(`
      INSERT INTO announcements (id, title, description, publisher_id, publisher_name, location_id, location_name, category, priority, action_url, verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const a of SEED_ANNOUNCEMENTS) {
      insertAnn.run(
        a.id,
        a.title,
        a.description,
        a.publisherId,
        a.publisherName,
        a.locationId || null,
        a.locationName || null,
        a.category,
        a.priority,
        a.actionUrl || null,
        a.verified ? 1 : 0,
        a.createdAt || now,
        now
      );
    }
  }

  // Seed Faculty
  const facCountStmt = db.prepare('SELECT COUNT(*) as count FROM faculty');
  const facCount = Number(facCountStmt.get().count);
  if (facCount === 0) {
    console.log('[DB] Seeding faculty cabin directory...');
    const insertFac = db.prepare(`
      INSERT INTO faculty (id, name, prefix, designation, school, department_name, cabin_number, building_id, building_name, floor, wing, room_details, email, phone, consultation_hours, subjects_json, research_area, directions_guide, status, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const f of SEED_FACULTY) {
      insertFac.run(
        f.id,
        f.name,
        f.prefix || null,
        f.designation,
        f.school,
        f.departmentName,
        f.cabinNumber,
        f.buildingId,
        f.buildingName,
        f.floor,
        f.wing || null,
        f.roomDetails || null,
        f.email,
        f.phone || null,
        f.consultationHours,
        JSON.stringify(f.subjects || []),
        f.researchArea || null,
        f.directionsGuide,
        f.status || 'available',
        f.avatarUrl || null,
        now,
        now
      );
    }
  }
}

export function logAudit(
  userId: string | null,
  userEmail: string | null,
  userRole: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: any,
  ipAddress?: string
) {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, user_role, action, resource_type, resource_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId || null,
      userEmail || null,
      userRole || null,
      action,
      resourceType,
      resourceId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
      now
    );
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}
