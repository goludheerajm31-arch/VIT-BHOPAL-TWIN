import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, logAudit } from './server/db/database.js';
import { hashPassword, verifyPassword, generateToken } from './server/auth/crypto.js';
import { authMiddleware, requireAuth, requireRole } from './server/auth/middleware.js';
import { realtimeHub } from './server/realtime/sse.js';
import {
  syncLocationToSupabase,
  deleteLocationFromSupabase,
  syncEventToSupabase,
  deleteEventFromSupabase,
  syncAnnouncementToSupabase,
  deleteAnnouncementFromSupabase,
  syncFacultyToSupabase,
  deleteFacultyFromSupabase,
  syncPublisherToSupabase,
  syncSavedItemToSupabase,
  deleteSavedItemFromSupabase,
} from './server/db/supabase.js';
import {
  SEED_LOCATIONS,
  SEED_EVENTS,
  SEED_ANNOUNCEMENTS,
  SEED_PUBLISHERS,
  SEED_USERS,
  SEED_FACULTY,
} from './src/services/data/seeds.js';

const PORT = 3000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(authMiddleware);

  // Initialize DB & run initial seeds
  initDatabase();

  // -------------------------------------------------------------
  // REALTIME SSE ENDPOINT
  // -------------------------------------------------------------
  app.get('/api/realtime/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    realtimeHub.addClient(res);

    // Heartbeat every 20s to keep proxies alive
    const timer = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(timer);
    });
  });

  // -------------------------------------------------------------
  // AUTHENTICATION ROUTES
  // -------------------------------------------------------------
  app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    let user = userStmt.get(cleanEmail) as any;

    // Support quick-login or registration for demo accounts
    if (!user) {
      const now = new Date().toISOString();
      const id = `user-${Date.now()}`;
      const name = cleanEmail.split('@')[0].toUpperCase();
      const assignedRole = role || (cleanEmail.includes('admin')
        ? 'ADMIN'
        : cleanEmail.includes('faculty') || cleanEmail.includes('prof') || cleanEmail.includes('dr.')
        ? 'FACULTY'
        : cleanEmail.includes('club')
        ? 'PUBLISHER'
        : 'STUDENT');
      const { hash, salt } = hashPassword(password || 'Campus@123');

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, salt, role, avatar, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, cleanEmail, hash, salt, assignedRole, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', now, now);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    } else if (password) {
      const valid = verifyPassword(password, user.password_hash, user.salt);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Create session token
    const token = generateToken();
    const expiresAt = Date.now() + SESSION_TTL_MS;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, expiresAt, now);

    logAudit(user.id, user.email, user.role, 'LOGIN', 'USER', user.id, { method: 'credentials' }, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        department: user.department,
        regNumber: user.reg_number,
      },
    });
  });

  app.post('/api/auth/quick-switch', (req, res) => {
    const { targetRole } = req.body;
    if (!['STUDENT', 'PUBLISHER', 'ADMIN', 'FACULTY'].includes(targetRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    let userEmail = 'student@vitbhopal.ac.in';
    if (targetRole === 'ADMIN') userEmail = 'admin@vitbhopal.ac.in';
    else if (targetRole === 'PUBLISHER') userEmail = 'aiclub@vitbhopal.ac.in';
    else if (targetRole === 'FACULTY') userEmail = 'faculty@vitbhopal.ac.in';

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateToken();
    const expiresAt = Date.now() + SESSION_TTL_MS;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, expiresAt, now);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        department: user.department,
        regNumber: user.reg_number,
      },
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) {
      return res.json({ user: null });
    }
    res.json({ user: req.user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // CAMPUS LOCATIONS API
  // -------------------------------------------------------------
  app.get('/api/locations', (req, res) => {
    const rows = db.prepare('SELECT * FROM locations ORDER BY name ASC').all() as any[];
    const locations = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      latitude: r.latitude,
      longitude: r.longitude,
      building: r.building || undefined,
      floor: r.floor || undefined,
      facilities: JSON.parse(r.facilities_json || '[]'),
      openingHours: r.opening_hours || undefined,
      accessibility: r.accessibility || undefined,
      image: r.image || undefined,
      zone: r.zone || undefined,
      contactPhone: r.contact_phone || undefined,
    }));
    res.json(locations);
  });

  app.get('/api/locations/:id', (req, res) => {
    const r = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id) as any;
    if (!r) return res.status(404).json({ error: 'Location not found' });
    res.json({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      latitude: r.latitude,
      longitude: r.longitude,
      building: r.building || undefined,
      floor: r.floor || undefined,
      facilities: JSON.parse(r.facilities_json || '[]'),
      openingHours: r.opening_hours || undefined,
      accessibility: r.accessibility || undefined,
      image: r.image || undefined,
      zone: r.zone || undefined,
      contactPhone: r.contact_phone || undefined,
    });
  });

  app.post('/api/locations', requireRole(['ADMIN']), (req, res) => {
    const l = req.body;
    if (!l.name || !l.category || l.latitude == null || l.longitude == null) {
      return res.status(400).json({ error: 'Missing required location fields' });
    }

    const id = l.id || `loc-${Date.now()}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM locations WHERE id = ?').get(id);
    if (existing) {
      db.prepare(`
        UPDATE locations SET
          name = ?, category = ?, description = ?, latitude = ?, longitude = ?,
          building = ?, floor = ?, facilities_json = ?, opening_hours = ?,
          accessibility = ?, image = ?, zone = ?, contact_phone = ?, updated_at = ?
        WHERE id = ?
      `).run(
        l.name,
        l.category,
        l.description || '',
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
        id
      );
    } else {
      db.prepare(`
        INSERT INTO locations (id, name, category, description, latitude, longitude, building, floor, facilities_json, opening_hours, accessibility, image, zone, contact_phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        l.name,
        l.category,
        l.description || '',
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

    logAudit(req.user!.id, req.user!.email, req.user!.role, 'SAVE_LOCATION', 'LOCATION', id, { name: l.name });
    syncLocationToSupabase({ ...l, id });
    realtimeHub.broadcast('LOCATION_CHANGED', { locationId: id });
    res.json({ success: true, id });
  });

  // -------------------------------------------------------------
  // EVENTS API (WITH REALTIME + CONCURRENCY DETECTION)
  // -------------------------------------------------------------
  app.get('/api/events', (req, res) => {
    const rows = db.prepare('SELECT * FROM events ORDER BY date ASC, start_time ASC').all() as any[];
    const events = rows.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || undefined,
      description: r.description,
      organizer: r.organizer,
      publisherId: r.publisher_id,
      locationId: r.location_id,
      locationName: r.location_name,
      venueDetail: r.venue_detail || undefined,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      category: r.category,
      verified: Boolean(r.verified),
      coverImage: r.cover_image || undefined,
      capacity: r.capacity || undefined,
      registrationUrl: r.registration_url || undefined,
      status: r.status,
      approvalStatus: r.approval_status,
      tags: JSON.parse(r.tags_json || '[]'),
      version: r.version,
    }));
    res.json(events);
  });

  app.get('/api/events/:id', (req, res) => {
    const r = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (!r) return res.status(404).json({ error: 'Event not found' });
    res.json({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || undefined,
      description: r.description,
      organizer: r.organizer,
      publisherId: r.publisher_id,
      locationId: r.location_id,
      locationName: r.location_name,
      venueDetail: r.venue_detail || undefined,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      category: r.category,
      verified: Boolean(r.verified),
      coverImage: r.cover_image || undefined,
      capacity: r.capacity || undefined,
      registrationUrl: r.registration_url || undefined,
      status: r.status,
      approvalStatus: r.approval_status,
      tags: JSON.parse(r.tags_json || '[]'),
      version: r.version,
    });
  });

  app.post('/api/events', requireRole(['ADMIN', 'PUBLISHER', 'STUDENT']), (req, res) => {
    const e = req.body;
    if (!e.title || !e.locationId || !e.date || !e.startTime || !e.endTime) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const id = e.id || `event-${Date.now()}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;

    if (existing) {
      // Role & ownership check
      if (req.user!.role !== 'ADMIN' && existing.created_by !== req.user!.id && existing.publisher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this event' });
      }

      // Optimistic concurrency check
      if (e.version != null && existing.version > e.version) {
        return res.status(409).json({
          error: 'Concurrency conflict: This event was modified by another user. Please reload.',
          currentVersion: existing.version,
        });
      }

      const nextVersion = (existing.version || 1) + 1;

      db.prepare(`
        UPDATE events SET
          title = ?, subtitle = ?, description = ?, organizer = ?,
          publisher_id = ?, location_id = ?, location_name = ?, venue_detail = ?,
          date = ?, start_time = ?, end_time = ?, category = ?, verified = ?,
          cover_image = ?, capacity = ?, registration_url = ?, status = ?,
          approval_status = ?, tags_json = ?, updated_at = ?, version = ?
        WHERE id = ?
      `).run(
        e.title,
        e.subtitle || null,
        e.description || '',
        e.organizer || req.user!.name,
        e.publisherId || existing.publisher_id,
        e.locationId,
        e.locationName || '',
        e.venueDetail || null,
        e.date,
        e.startTime,
        e.endTime,
        e.category,
        e.verified ? 1 : 0,
        e.coverImage || null,
        e.capacity || null,
        e.registrationUrl || null,
        e.status || 'upcoming',
        e.approvalStatus || existing.approval_status || 'approved',
        JSON.stringify(e.tags || []),
        now,
        nextVersion,
        id
      );

      logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_EVENT', 'EVENT', id, { title: e.title });
      syncEventToSupabase({ ...existing, ...e, id, version: nextVersion });
      realtimeHub.broadcast('EVENT_UPDATED', { id, title: e.title });
      return res.json({ success: true, id, version: nextVersion });
    } else {
      db.prepare(`
        INSERT INTO events (
          id, title, subtitle, description, organizer, publisher_id,
          location_id, location_name, venue_detail, date, start_time, end_time,
          category, verified, cover_image, capacity, registration_url,
          status, approval_status, tags_json, created_by, created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        e.title,
        e.subtitle || null,
        e.description || '',
        e.organizer || req.user!.name,
        e.publisherId || req.user!.id,
        e.locationId,
        e.locationName || '',
        e.venueDetail || null,
        e.date,
        e.startTime,
        e.endTime,
        e.category,
        req.user!.role === 'ADMIN' || e.verified ? 1 : 0,
        e.coverImage || null,
        e.capacity || null,
        e.registrationUrl || null,
        e.status || 'upcoming',
        'approved',
        JSON.stringify(e.tags || []),
        req.user!.id,
        now,
        now,
        1
      );

      logAudit(req.user!.id, req.user!.email, req.user!.role, 'CREATE_EVENT', 'EVENT', id, { title: e.title });
      syncEventToSupabase({ ...e, id, version: 1, created_by: req.user!.id, publisher_id: e.publisherId || req.user!.id });
      realtimeHub.broadcast('EVENT_CREATED', { id, title: e.title });
      return res.json({ success: true, id, version: 1 });
    }
  });

  app.delete('/api/events/:id', requireRole(['ADMIN', 'PUBLISHER']), (req, res) => {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (req.user!.role !== 'ADMIN' && existing.created_by !== req.user!.id && existing.publisher_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this event' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM saved_items WHERE item_type = "EVENT" AND item_id = ?').run(req.params.id);
    deleteEventFromSupabase(req.params.id);

    logAudit(req.user!.id, req.user!.email, req.user!.role, 'DELETE_EVENT', 'EVENT', req.params.id, { title: existing.title });
    realtimeHub.broadcast('EVENT_DELETED', { id: req.params.id, title: existing.title });
    res.json({ success: true });
  });

  app.patch('/api/events/:id/status', requireRole(['ADMIN']), (req, res) => {
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE events SET approval_status = ?, updated_at = ? WHERE id = ?').run(
      approvalStatus,
      now,
      req.params.id
    );
    const existingEvt = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (existingEvt) {
      syncEventToSupabase(existingEvt);
    }

    logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_EVENT_STATUS', 'EVENT', req.params.id, { approvalStatus });
    realtimeHub.broadcast('EVENT_UPDATED', { id: req.params.id });
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // ANNOUNCEMENTS API (STUDENT SUBMISSION + ADMIN VERIFICATION)
  // -------------------------------------------------------------
  app.get('/api/announcements', (req, res) => {
    let rows: any[];
    if (req.user && req.user.role === 'ADMIN') {
      // Admins see everything including pending review items
      rows = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all() as any[];
    } else if (req.user) {
      // Authenticated students/publishers see approved items + their own submissions (pending/rejected)
      rows = db.prepare(`
        SELECT * FROM announcements
        WHERE status = 'approved' OR author_id = ? OR publisher_id = ?
        ORDER BY created_at DESC
      `).all(req.user.id, req.user.id) as any[];
    } else {
      // Public & guests see only approved and verified bulletins
      rows = db.prepare(`
        SELECT * FROM announcements
        WHERE status = 'approved' AND verified = 1
        ORDER BY created_at DESC
      `).all() as any[];
    }

    const announcements = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      publisherId: r.publisher_id,
      publisherName: r.publisher_name,
      locationId: r.location_id || undefined,
      locationName: r.location_name || undefined,
      category: r.category,
      priority: r.priority,
      actionUrl: r.action_url || undefined,
      verified: Boolean(r.verified),
      status: r.status || (r.verified ? 'approved' : 'pending'),
      authorRole: r.author_role || undefined,
      authorId: r.author_id || undefined,
      authorEmail: r.author_email || undefined,
      authorRegNumber: r.author_reg_number || undefined,
      reviewedBy: r.reviewed_by || undefined,
      reviewedAt: r.reviewed_at || undefined,
      rejectionReason: r.rejection_reason || undefined,
      createdAt: r.created_at,
    }));
    res.json(announcements);
  });

  app.post('/api/announcements', requireRole(['ADMIN', 'PUBLISHER', 'STUDENT', 'FACULTY']), (req, res) => {
    const a = req.body;
    if (!a.title || !a.description) {
      return res.status(400).json({ error: 'Missing title or description' });
    }

    const id = a.id || `ann-${Date.now()}`;
    const now = new Date().toISOString();
    const userRole = req.user!.role;

    // Determination of verification and approval status:
    // Students always enter 'pending' review; Admins and Faculty are verified;
    // Publishers depend on whether publisher is already verified
    let status = 'pending';
    let verified = 0;
    let reviewedBy: string | null = null;
    let reviewedAt: string | null = null;

    if (userRole === 'ADMIN' || userRole === 'FACULTY') {
      status = 'approved';
      verified = 1;
      reviewedBy = req.user!.name;
      reviewedAt = now;
    } else if (userRole === 'PUBLISHER') {
      const pub = db.prepare('SELECT verified FROM publishers WHERE user_id = ? OR id = ?').get(req.user!.id, a.publisherId || req.user!.id) as any;
      if (pub && pub.verified) {
        status = 'approved';
        verified = 1;
      }
    } else if (userRole === 'STUDENT') {
      // Strictly enforce pending verification for students
      status = 'pending';
      verified = 0;
    }

    const authorRole = a.authorRole || userRole;
    const authorId = req.user!.id;
    const authorEmail = req.user!.email;
    const authorRegNumber = a.authorRegNumber || req.user!.regNumber || null;
    const publisherName = a.publisherName || req.user!.name;
    const publisherId = a.publisherId || req.user!.id;

    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
    if (existing) {
      // Permission check on edits
      if (userRole !== 'ADMIN' && existing.author_id !== req.user!.id && existing.publisher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this announcement' });
      }

      // If student edits after rejection or while pending, reset to pending
      const editStatus = userRole === 'ADMIN' ? (a.status || existing.status) : 'pending';
      const editVerified = userRole === 'ADMIN' ? (a.verified ? 1 : 0) : 0;

      db.prepare(`
        UPDATE announcements SET
          title = ?, description = ?, publisher_id = ?, publisher_name = ?,
          location_id = ?, location_name = ?, category = ?, priority = ?,
          action_url = ?, verified = ?, status = ?, author_role = ?,
          author_id = ?, author_email = ?, author_reg_number = ?,
          rejection_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(
        a.title,
        a.description,
        publisherId,
        publisherName,
        a.locationId || null,
        a.locationName || null,
        a.category || 'General',
        a.priority || 'medium',
        a.actionUrl || null,
        editVerified,
        editStatus,
        authorRole,
        existing.author_id || authorId,
        existing.author_email || authorEmail,
        authorRegNumber,
        userRole === 'STUDENT' ? null : (a.rejectionReason || null),
        now,
        id
      );

      logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_ANNOUNCEMENT', 'ANNOUNCEMENT', id, { title: a.title, status: editStatus });
      syncAnnouncementToSupabase({ ...existing, ...a, id, status: editStatus, verified: editVerified === 1 });
      realtimeHub.broadcast('ANNOUNCEMENT_CHANGED', { id, title: a.title, status: editStatus });
      return res.json({ success: true, id, status: editStatus, verified: editVerified === 1 });
    } else {
      db.prepare(`
        INSERT INTO announcements (
          id, title, description, publisher_id, publisher_name, location_id, location_name,
          category, priority, action_url, verified, status, author_role, author_id,
          author_email, author_reg_number, reviewed_by, reviewed_at, rejection_reason,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        a.title,
        a.description,
        publisherId,
        publisherName,
        a.locationId || null,
        a.locationName || null,
        a.category || (userRole === 'STUDENT' ? 'Student Initiative' : 'Campus Notice'),
        a.priority || 'medium',
        a.actionUrl || null,
        verified,
        status,
        authorRole,
        authorId,
        authorEmail,
        authorRegNumber,
        reviewedBy,
        reviewedAt,
        null,
        now,
        now
      );

      const actionName = userRole === 'STUDENT' ? 'SUBMIT_STUDENT_ANNOUNCEMENT' : 'CREATE_ANNOUNCEMENT';
      logAudit(req.user!.id, req.user!.email, req.user!.role, actionName, 'ANNOUNCEMENT', id, { title: a.title, status });
      syncAnnouncementToSupabase({
        ...a,
        id,
        status,
        verified: verified === 1,
        author_id: authorId,
        author_role: authorRole,
        author_email: authorEmail,
        author_reg_number: authorRegNumber,
      });
      realtimeHub.broadcast('ANNOUNCEMENT_CHANGED', { id, title: a.title, status, authorRole });
      return res.json({ success: true, id, status, verified: verified === 1 });
    }
  });

  app.patch('/api/announcements/:id/verify', requireRole(['ADMIN']), (req, res) => {
    const { approvalStatus, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status. Must be approved or rejected.' });
    }

    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const now = new Date().toISOString();
    const verified = approvalStatus === 'approved' ? 1 : 0;
    const finalReason = approvalStatus === 'rejected' ? (rejectionReason || 'Does not meet campus publication guidelines') : null;

    db.prepare(`
      UPDATE announcements SET
        status = ?, verified = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(
      approvalStatus,
      verified,
      req.user!.name,
      now,
      finalReason,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id) as any;
    syncAnnouncementToSupabase(updated);

    const auditAction = approvalStatus === 'approved' ? 'VERIFY_ANNOUNCEMENT' : 'REJECT_ANNOUNCEMENT';
    logAudit(req.user!.id, req.user!.email, req.user!.role, auditAction, 'ANNOUNCEMENT', req.params.id, {
      title: existing.title,
      status: approvalStatus,
      rejectionReason: finalReason,
    });

    realtimeHub.broadcast('ANNOUNCEMENT_CHANGED', {
      id: req.params.id,
      title: existing.title,
      status: approvalStatus,
      verified: Boolean(verified),
    });

    res.json({
      success: true,
      id: req.params.id,
      status: approvalStatus,
      verified: Boolean(verified),
      reviewedBy: req.user!.name,
      reviewedAt: now,
      rejectionReason: finalReason,
    });
  });

  app.delete('/api/announcements/:id', requireRole(['ADMIN', 'PUBLISHER', 'STUDENT']), (req, res) => {
    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (req.user!.role !== 'ADMIN' && existing.author_id !== req.user!.id && existing.publisher_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this announcement' });
    }

    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    deleteAnnouncementFromSupabase(req.params.id);
    logAudit(req.user!.id, req.user!.email, req.user!.role, 'DELETE_ANNOUNCEMENT', 'ANNOUNCEMENT', req.params.id, { title: existing.title });
    realtimeHub.broadcast('ANNOUNCEMENT_CHANGED', { id: req.params.id, deleted: true });
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // FACULTY DIRECTORY API
  // -------------------------------------------------------------
  app.get('/api/faculty', (req, res) => {
    const rows = db.prepare('SELECT * FROM faculty ORDER BY name ASC').all() as any[];
    const faculty = rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix || undefined,
      designation: r.designation,
      school: r.school,
      departmentName: r.department_name,
      cabinNumber: r.cabin_number,
      buildingId: r.building_id,
      buildingName: r.building_name,
      floor: r.floor,
      wing: r.wing || undefined,
      roomDetails: r.room_details || undefined,
      email: r.email,
      phone: r.phone || undefined,
      consultationHours: r.consultation_hours,
      subjects: JSON.parse(r.subjects_json || '[]'),
      researchArea: r.research_area || undefined,
      directionsGuide: r.directions_guide,
      status: r.status,
      avatarUrl: r.avatar_url || undefined,
    }));
    res.json(faculty);
  });

  app.post('/api/faculty', requireRole(['ADMIN', 'FACULTY']), (req, res) => {
    const f = req.body;
    if (!f.name || !f.cabinNumber || !f.buildingId) {
      return res.status(400).json({ error: 'Missing required faculty fields' });
    }

    const id = f.id || `fac-${Date.now()}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM faculty WHERE id = ?').get(id) as any;
    if (req.user!.role === 'FACULTY' && !existing) {
      return res.status(403).json({ error: 'Faculty cannot create new faculty records' });
    }
    if (existing) {
      db.prepare(`
        UPDATE faculty SET
          name = ?, prefix = ?, designation = ?, school = ?, department_name = ?,
          cabin_number = ?, building_id = ?, building_name = ?, floor = ?,
          wing = ?, room_details = ?, email = ?, phone = ?, consultation_hours = ?,
          subjects_json = ?, research_area = ?, directions_guide = ?, status = ?,
          avatar_url = ?, updated_at = ?
        WHERE id = ?
      `).run(
        f.name,
        f.prefix || null,
        f.designation || 'Faculty Member',
        f.school || 'SCSE',
        f.departmentName || '',
        f.cabinNumber,
        f.buildingId,
        f.buildingName || '',
        f.floor || '',
        f.wing || null,
        f.roomDetails || null,
        f.email || '',
        f.phone || null,
        f.consultationHours || 'By Appointment',
        JSON.stringify(f.subjects || []),
        f.researchArea || null,
        f.directionsGuide || '',
        f.status || 'available',
        f.avatarUrl || null,
        now,
        id
      );
    } else {
      db.prepare(`
        INSERT INTO faculty (
          id, name, prefix, designation, school, department_name, cabin_number,
          building_id, building_name, floor, wing, room_details, email, phone,
          consultation_hours, subjects_json, research_area, directions_guide,
          status, avatar_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        f.name,
        f.prefix || null,
        f.designation || 'Faculty Member',
        f.school || 'SCSE',
        f.departmentName || '',
        f.cabinNumber,
        f.buildingId,
        f.buildingName || '',
        f.floor || '',
        f.wing || null,
        f.roomDetails || null,
        f.email || '',
        f.phone || null,
        f.consultationHours || 'By Appointment',
        JSON.stringify(f.subjects || []),
        f.researchArea || null,
        f.directionsGuide || '',
        f.status || 'available',
        f.avatarUrl || null,
        now,
        now
      );
    }

    logAudit(req.user!.id, req.user!.email, req.user!.role, 'SAVE_FACULTY', 'FACULTY', id, { name: f.name, cabin: f.cabinNumber });
    syncFacultyToSupabase({ ...f, id });
    realtimeHub.broadcast('FACULTY_CHANGED', { id, name: f.name });
    res.json({ success: true, id });
  });

  app.delete('/api/faculty/:id', requireRole(['ADMIN']), (req, res) => {
    db.prepare('DELETE FROM faculty WHERE id = ?').run(req.params.id);
    deleteFacultyFromSupabase(req.params.id);
    logAudit(req.user!.id, req.user!.email, req.user!.role, 'DELETE_FACULTY', 'FACULTY', req.params.id, {});
    realtimeHub.broadcast('FACULTY_CHANGED', { id: req.params.id });
    res.json({ success: true });
  });

  app.patch('/api/faculty/:id/status', requireRole(['ADMIN', 'FACULTY']), (req, res) => {
    const { status } = req.body;
    const now = new Date().toISOString();
    db.prepare('UPDATE faculty SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
    const existingFac = db.prepare('SELECT * FROM faculty WHERE id = ?').get(req.params.id) as any;
    if (existingFac) {
      syncFacultyToSupabase(existingFac);
    }
    logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_FACULTY_STATUS', 'FACULTY', req.params.id, { status });
    realtimeHub.broadcast('FACULTY_CHANGED', { id: req.params.id, status });
    res.json({ success: true });
  });

  app.post('/api/faculty/reset', requireRole(['ADMIN']), (req, res) => {
    db.prepare('DELETE FROM faculty').run();
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
    logAudit(req.user!.id, req.user!.email, req.user!.role, 'RESET_FACULTY', 'FACULTY', null, {});
    realtimeHub.broadcast('FACULTY_CHANGED', { reset: true });
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // PUBLISHERS & CLUBS API
  // -------------------------------------------------------------
  app.get('/api/publishers', (req, res) => {
    const rows = db.prepare('SELECT * FROM publishers ORDER BY organization_name ASC').all() as any[];
    const publishers = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      organizationName: r.organization_name,
      category: r.category,
      description: r.description,
      logoUrl: r.logo_url || undefined,
      verified: Boolean(r.verified),
      contactEmail: r.contact_email,
      verifiedAt: r.verified_at || undefined,
    }));
    res.json(publishers);
  });

  app.patch('/api/publishers/:id/toggle-verify', requireRole(['ADMIN']), (req, res) => {
    const pub = db.prepare('SELECT * FROM publishers WHERE id = ?').get(req.params.id) as any;
    if (!pub) return res.status(404).json({ error: 'Publisher not found' });

    const newVerified = pub.verified ? 0 : 1;
    const verifiedAt = newVerified ? new Date().toISOString().split('T')[0] : null;
    const now = new Date().toISOString();

    db.prepare('UPDATE publishers SET verified = ?, verified_at = ?, updated_at = ? WHERE id = ?').run(
      newVerified,
      verifiedAt,
      now,
      req.params.id
    );
    syncPublisherToSupabase({ ...pub, verified: Boolean(newVerified), verified_at: verifiedAt });

    // Sync verification to events
    db.prepare('UPDATE events SET verified = ? WHERE publisher_id = ?').run(newVerified, req.params.id);
    db.prepare('UPDATE announcements SET verified = ? WHERE publisher_id = ?').run(newVerified, req.params.id);

    logAudit(req.user!.id, req.user!.email, req.user!.role, 'TOGGLE_PUBLISHER_VERIFY', 'PUBLISHER', req.params.id, { verified: Boolean(newVerified) });
    realtimeHub.broadcast('PUBLISHER_CHANGED', { id: req.params.id });
    realtimeHub.broadcast('EVENT_UPDATED', {});
    realtimeHub.broadcast('ANNOUNCEMENT_CHANGED', {});

    res.json({ success: true, verified: Boolean(newVerified) });
  });

  // -------------------------------------------------------------
  // SAVED ITEMS (BOOKMARKS) API
  // -------------------------------------------------------------
  app.get('/api/saved/events', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT item_id FROM saved_items WHERE user_id = ? AND item_type = "EVENT"').all(req.user!.id) as any[];
    res.json(rows.map((r) => r.item_id));
  });

  app.post('/api/saved/events/toggle', requireAuth, (req, res) => {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });

    const existing = db.prepare('SELECT id FROM saved_items WHERE user_id = ? AND item_type = "EVENT" AND item_id = ?').get(
      req.user!.id,
      eventId
    );

    if (existing) {
      db.prepare('DELETE FROM saved_items WHERE user_id = ? AND item_type = "EVENT" AND item_id = ?').run(
        req.user!.id,
        eventId
      );
      deleteSavedItemFromSupabase(req.user!.id, 'EVENT', eventId);
      res.json({ saved: false });
    } else {
      const id = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      db.prepare('INSERT INTO saved_items (id, user_id, item_type, item_id, saved_at) VALUES (?, ?, "EVENT", ?, ?)').run(
        id,
        req.user!.id,
        eventId,
        now
      );
      syncSavedItemToSupabase(req.user!.id, 'EVENT', eventId);
      res.json({ saved: true });
    }
  });

  app.get('/api/saved/locations', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT item_id FROM saved_items WHERE user_id = ? AND item_type = "LOCATION"').all(req.user!.id) as any[];
    res.json(rows.map((r) => r.item_id));
  });

  app.post('/api/saved/locations/toggle', requireAuth, (req, res) => {
    const { locationId } = req.body;
    if (!locationId) return res.status(400).json({ error: 'locationId required' });

    const existing = db.prepare('SELECT id FROM saved_items WHERE user_id = ? AND item_type = "LOCATION" AND item_id = ?').get(
      req.user!.id,
      locationId
    );

    if (existing) {
      db.prepare('DELETE FROM saved_items WHERE user_id = ? AND item_type = "LOCATION" AND item_id = ?').run(
        req.user!.id,
        locationId
      );
      deleteSavedItemFromSupabase(req.user!.id, 'LOCATION', locationId);
      res.json({ saved: false });
    } else {
      const id = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      db.prepare('INSERT INTO saved_items (id, user_id, item_type, item_id, saved_at) VALUES (?, ?, "LOCATION", ?, ?)').run(
        id,
        req.user!.id,
        locationId,
        now
      );
      syncSavedItemToSupabase(req.user!.id, 'LOCATION', locationId);
      res.json({ saved: true });
    }
  });

  // -------------------------------------------------------------
  // AUDIT LOGS (ADMIN ONLY)
  // -------------------------------------------------------------
  app.get('/api/admin/audit-logs', requireRole(['ADMIN']), (req, res) => {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all() as any[];
    res.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userEmail: r.user_email,
        userRole: r.user_role,
        action: r.action,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        details: r.details_json ? JSON.parse(r.details_json) : null,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      }))
    );
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE (Development) OR STATIC ASSETS (Production)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VIT-BHOPAL-TWIN] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal]', err);
  process.exit(1);
});
