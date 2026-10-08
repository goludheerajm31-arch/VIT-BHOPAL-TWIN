import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const PORT = 3000;

// ============================================================================
// PERMANENT FIXED SERVER-SIDE DEMO ACCOUNTS (EXTERNAL TO SUPABASE AUTH)
// 1. Master Admin: admin@vitbhopal.ac.in (admin9211) -> [STUDENT, FACULTY, PUBLISHER, ADMIN, GUEST]
// 2. Demo Faculty: faculty.demo@vitbhopal.ac.in (faculty9211) -> [FACULTY]
// 3. Demo Student: student.demo@vitbhopal.ac.in (student9211) -> [STUDENT]
// 4. Demo Publisher: publisher.demo@vitbhopal.ac.in (publisher9211) -> [PUBLISHER]
// ============================================================================
const MASTER_PASSWORD_SALT = process.env.MASTER_AUTH_SALT || 'vit_bhopal_master_root_salt_v1_2026';
const MASTER_TOKEN_SECRET = process.env.MASTER_TOKEN_SECRET || 'vit_master_session_jwt_secret_root_2026';

interface FixedDemoAccountConfig {
  email: string;
  passwordHash: string;
  allowedRoles: string[];
  defaultRole: string;
  id: string;
  name: string;
  department: string;
  facultyId?: string;
  cabinNumber?: string;
  regNumber?: string;
  publisherId?: string;
  isPublisher?: boolean;
  isMasterAdmin?: boolean;
  avatar: string;
}

const FIXED_DEMO_ACCOUNTS: Record<string, FixedDemoAccountConfig> = {
  'admin@vitbhopal.ac.in': {
    email: 'admin@vitbhopal.ac.in',
    passwordHash: 'fbfe472a98b805e3e0af328a73e14cb555966158a27afb3ba4d2da8e724e3d38', // admin9211
    allowedRoles: ['STUDENT', 'FACULTY', 'PUBLISHER', 'ADMIN', 'GUEST'],
    defaultRole: 'ADMIN',
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Master Campus Administrator',
    department: 'Dean Office & IT Governance',
    regNumber: 'MST-ROOT-001',
    facultyId: 'fac-master-01',
    cabinNumber: 'AB1-401',
    isPublisher: true,
    isMasterAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  },
  'faculty.demo@vitbhopal.ac.in': {
    email: 'faculty.demo@vitbhopal.ac.in',
    passwordHash: 'a7d9ab846931a1795f2861fb4645e8b3384d19696a9e0f64db7c89ff20c7ba36', // faculty9211
    allowedRoles: ['FACULTY'],
    defaultRole: 'FACULTY',
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Dr. Ramesh Kumar (Demo Faculty)',
    department: 'School of Computing Science & Engineering',
    facultyId: 'fac-scse-01',
    cabinNumber: 'AB1-314',
    regNumber: 'FAC-SCSE-314',
    isPublisher: false,
    isMasterAdmin: false,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  'student.demo@vitbhopal.ac.in': {
    email: 'student.demo@vitbhopal.ac.in',
    passwordHash: '321ceac196764bb5e42ff162d4aadf50e6783078a7d14a5efacd1dbddc1a1312', // student9211
    allowedRoles: ['STUDENT'],
    defaultRole: 'STUDENT',
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Aarav Patel (Demo Student)',
    department: 'Computer Science & Engineering',
    regNumber: '24BCE10482',
    isPublisher: false,
    isMasterAdmin: false,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  'publisher.demo@vitbhopal.ac.in': {
    email: 'publisher.demo@vitbhopal.ac.in',
    passwordHash: '20073e8b9d2b9f69f323b212b81b7adc138bd6b73ad72abefe9fd177cd7a515e', // publisher9211
    allowedRoles: ['PUBLISHER'],
    defaultRole: 'PUBLISHER',
    id: '77777777-7777-4777-8777-777777777777',
    name: 'AI & ML Club Lead (Demo Publisher)',
    department: 'Authorized Student Organization',
    publisherId: 'pub-ai-club',
    isPublisher: true,
    isMasterAdmin: false,
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
  },
};

interface DemoTokenPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  activeRole: string;
  auth_user_id: null;
  iat: number;
  exp: number;
}

function verifyDemoPassword(account: FixedDemoAccountConfig, password: string): boolean {
  if (typeof password !== 'string' || !password) return false;
  const hash = crypto
    .createHmac('sha256', MASTER_PASSWORD_SALT)
    .update(password)
    .digest('hex');
  const expectedBuf = Buffer.from(account.passwordHash, 'utf8');
  const actualBuf = Buffer.from(hash, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function signDemoToken(account: FixedDemoAccountConfig, activeRole: string): string {
  const payload: DemoTokenPayload = {
    sub: `demo-${account.id}`,
    email: account.email,
    name: account.name,
    roles: [...account.allowedRoles],
    activeRole,
    auth_user_id: null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
  };

  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', MASTER_TOKEN_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyDemoToken(token: string): DemoTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', MASTER_TOKEN_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  const expectedBuf = Buffer.from(expectedSig);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  try {
    const payload: DemoTokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    if (!FIXED_DEMO_ACCOUNTS[payload.email]) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildDemoUser(account: FixedDemoAccountConfig, activeRole: string) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: activeRole,
    roles: [...account.allowedRoles],
    isPublisher: Boolean(account.isPublisher),
    isMasterAdmin: Boolean(account.isMasterAdmin),
    isDemoAccount: true,
    auth_user_id: null,
    department: account.department,
    regNumber: account.regNumber,
    facultyId: account.facultyId,
    cabinNumber: account.cabinNumber,
    publisherId: account.publisherId,
    avatar: account.avatar,
  };
}

// Asia/Kolkata (IST, UTC+5:30) helper for authoritative server-side evaluation
function parseISTDateTime(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (timeStr && timeStr.trim()) {
    const raw = timeStr.trim();
    const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = parseInt(ampmMatch[2], 10);
      const mer = ampmMatch[3]?.toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      hours = h;
      minutes = m;
      seconds = 0;
    } else {
      const h24Match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (h24Match) {
        hours = parseInt(h24Match[1], 10);
        minutes = parseInt(h24Match[2], 10);
        seconds = 0;
      }
    }
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const isoWithIST = `${pad(y)}-${pad(m)}-${pad(d)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}+05:30`;
  const parsed = Date.parse(isoWithIST);
  return isNaN(parsed) ? 0 : parsed;
}

function isEventConcludedServer(dateStr: string, endTimeStr?: string, startTimeStr?: string): boolean {
  if (!dateStr) return false;
  let endEpoch: number;
  if (endTimeStr && endTimeStr.trim()) {
    endEpoch = parseISTDateTime(dateStr, endTimeStr);
  } else if (startTimeStr && startTimeStr.trim()) {
    // Fallback: 3 hours after start time if end time wasn't specified
    const startEpoch = parseISTDateTime(dateStr, startTimeStr);
    endEpoch = startEpoch + 3 * 60 * 60 * 1000;
  } else {
    endEpoch = parseISTDateTime(dateStr, '11:59 PM');
  }
  return Date.now() > endEpoch;
}

let lastCleanupStats = {
  lastRun: null as string | null,
  scanned: 0,
  expiredCount: 0,
  cleanedIds: [] as string[],
  errors: [] as string[],
};

// Check whether Supabase environment variables are real active credentials or placeholder/offline defaults
function isRealSupabaseConfigured(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  const cleanUrl = url.trim().toLowerCase();
  if (
    cleanUrl.includes('your-project') ||
    cleanUrl.includes('placeholder') ||
    cleanUrl.includes('example.com') ||
    cleanUrl.includes('dummy') ||
    cleanUrl.length < 15
  ) {
    return false;
  }
  const cleanKey = key.trim();
  if (cleanKey.length < 20 || cleanKey.includes('placeholder')) {
    return false;
  }
  return true;
}

// Authoritative scheduled cleanup job
async function runServerEventCleanup(): Promise<typeof lastCleanupStats> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const nowIso = new Date().toISOString();

  if (!isRealSupabaseConfigured(supabaseUrl, supabaseKey)) {
    lastCleanupStats = {
      lastRun: nowIso,
      scanned: 0,
      expiredCount: 0,
      cleanedIds: [],
      errors: [],
    };
    return lastCleanupStats;
  }

  const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false },
  });

  const cleanedIds: string[] = [];
  const errors: string[] = [];
  let scanned = 0;

  try {
    // 1. Query active events from PostgreSQL
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, date, start_time, end_time, storage_path, status, event_end_at')
      .not('status', 'in', '("expired","cancelled","EXPIRED","CANCELLED")');

    if (error) {
      const isNetworkIssue =
        error.message?.includes('fetch failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED');

      if (!isNetworkIssue) {
        console.warn('[Event-Cleanup] Notice fetching events:', error.message);
        errors.push(error.message);
      }
    } else if (events && events.length > 0) {
      scanned = events.length;
      for (const ev of events) {
        const isExpired = isEventConcludedServer(ev.date, ev.end_time, ev.start_time);
        if (isExpired) {
          console.log(`[Event-Cleanup] Event "${ev.title}" (ID: ${ev.id}) expired. Cleaning up...`);

          // 2. Remove associated poster storage file if present
          if (ev.storage_path) {
            try {
              const { error: storageErr } = await supabase.storage
                .from('event-posters')
                .remove([ev.storage_path]);
              if (storageErr) {
                console.warn(`[Event-Cleanup] Notice on removing poster for ${ev.id}:`, storageErr.message);
              } else {
                console.log(`[Event-Cleanup] Removed poster storage object: ${ev.storage_path}`);
              }
            } catch (err: any) {
              console.warn(`[Event-Cleanup] Poster removal exception for ${ev.id}:`, err?.message);
            }
          }

          // 3. Mark event as expired in database
          const { error: updateErr } = await supabase
            .from('events')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', ev.id);

          if (updateErr) {
            console.error(`[Event-Cleanup] Failed to update status for ${ev.id}:`, updateErr.message);
            errors.push(`Failed to update ${ev.id}: ${updateErr.message}`);
          } else {
            cleanedIds.push(ev.id);
          }
        }
      }
    }
  } catch (err: any) {
    const isNetworkIssue =
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('network') ||
      err?.message?.includes('ENOTFOUND') ||
      err?.message?.includes('ECONNREFUSED');

    if (!isNetworkIssue) {
      console.warn('[Event-Cleanup] Unexpected error during cleanup check:', err?.message || err);
      errors.push(err?.message || 'Unknown error');
    }
  }

  lastCleanupStats = {
    lastRun: nowIso,
    scanned,
    expiredCount: cleanedIds.length,
    cleanedIds,
    errors,
  };

  return lastCleanupStats;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Status check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VIT Bhopal Digital Twin',
      architecture: 'React + Supabase Auth + Supabase PostgreSQL + Supabase Realtime',
      authoritativeBackend: 'Supabase PostgreSQL',
      timezone: 'Asia/Kolkata (IST, UTC+5:30)',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // PERMANENT FIXED DEMO ACCOUNTS AUTHENTICATION ENDPOINTS
  // ============================================================================

  // 1. Demo Login: Validates demo credentials server-side and enforces allowed vs forbidden roles
  const handleDemoLogin = (req: express.Request, res: express.Response) => {
    try {
      const { email, password, entryPoint } = req.body || {};
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

      const account = FIXED_DEMO_ACCOUNTS[cleanEmail];
      if (!account) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Account is not eligible for demo backend authentication.',
        });
        return;
      }

      // Secure server-side credential verification (constant-time comparison)
      if (!verifyDemoPassword(account, password)) {
        res.status(401).json({
          success: false,
          error: 'Invalid demo credentials.',
        });
        return;
      }

      // Enforce valid entryPoint against account.allowedRoles
      const targetRole = typeof entryPoint === 'string' && entryPoint.trim()
        ? entryPoint.trim().toUpperCase()
        : account.defaultRole;

      if (!account.allowedRoles.includes(targetRole)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: The account "${cleanEmail}" does not possess permissions for the role "${targetRole}". Allowed roles: [${account.allowedRoles.join(', ')}].`,
        });
        return;
      }

      const token = signDemoToken(account, targetRole);
      const user = buildDemoUser(account, targetRole);

      res.json({
        success: true,
        token,
        user,
        message: `Demo account "${account.name}" authenticated successfully with role "${targetRole}".`,
      });
    } catch (err: any) {
      console.error('[Demo Auth Error]', err);
      res.status(500).json({ success: false, error: 'Internal server authentication error' });
    }
  };

  app.post('/api/auth/demo-login', handleDemoLogin);
  app.post('/api/auth/master-login', handleDemoLogin);

  // 2. Demo Session Verification: Validates Bearer token cryptographically on the server
  const handleDemoSession = (req: express.Request, res: express.Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Missing session authorization token' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = verifyDemoToken(token);

      if (!payload) {
        res.status(401).json({ success: false, error: 'Invalid or expired demo session token' });
        return;
      }

      const account = FIXED_DEMO_ACCOUNTS[payload.email];
      if (!account) {
        res.status(401).json({ success: false, error: 'Unknown demo account' });
        return;
      }

      const user = buildDemoUser(account, payload.activeRole);
      res.json({
        success: true,
        user,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Session verification error' });
    }
  };

  app.get('/api/auth/demo-session', handleDemoSession);
  app.get('/api/auth/master-session', handleDemoSession);

  // 3. Demo Role Switch: Server-authorized role shift with fresh signed token
  const handleDemoSwitchRole = (req: express.Request, res: express.Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Missing session authorization token' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = verifyDemoToken(token);

      if (!payload) {
        res.status(401).json({ success: false, error: 'Invalid or expired demo session token' });
        return;
      }

      const account = FIXED_DEMO_ACCOUNTS[payload.email];
      if (!account) {
        res.status(401).json({ success: false, error: 'Unknown demo account' });
        return;
      }

      const { role } = req.body || {};
      const targetRole = typeof role === 'string' ? role.trim().toUpperCase() : '';

      // Validate targetRole against allowedRoles server-side!
      if (!account.allowedRoles.includes(targetRole)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Role "${targetRole}" is not permitted for account "${account.email}". Allowed roles: [${account.allowedRoles.join(', ')}].`,
        });
        return;
      }

      const newToken = signDemoToken(account, targetRole);
      const user = buildDemoUser(account, targetRole);

      res.json({
        success: true,
        token: newToken,
        user,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Role switch error' });
    }
  };

  app.post('/api/auth/demo-switch-role', handleDemoSwitchRole);
  app.post('/api/auth/master-switch-role', handleDemoSwitchRole);

  // 4. Demo Logout
  const handleDemoLogout = (req: express.Request, res: express.Response) => {
    res.json({ success: true, message: 'Demo administrator session closed' });
  };

  app.post('/api/auth/demo-logout', handleDemoLogout);
  app.post('/api/auth/master-logout', handleDemoLogout);

  // Scheduled / on-demand event cleanup endpoints
  app.get('/api/events/cleanup-status', (req, res) => {
    res.json({
      status: 'ok',
      cleanupJob: lastCleanupStats,
      intervalMinutes: 10,
      timezone: 'Asia/Kolkata (IST)',
    });
  });

  app.post('/api/events/cleanup', async (req, res) => {
    try {
      const result = await runServerEventCleanup();
      res.json({
        success: true,
        message: 'Authoritative event cleanup executed successfully',
        result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Cleanup error',
      });
    }
  });

  // Secure Server-Side Event Poster Upload & Validation Endpoint
  // Validates MIME type, extension, magic numbers, file size (max 5MB), and uploads to Supabase Storage
  app.post('/api/events/upload-poster', async (req, res) => {
    try {
      const { eventId, fileName, fileType, fileBase64, oldStoragePath } = req.body || {};

      if (!eventId || typeof eventId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid eventId' });
        return;
      }

      if (!fileName || typeof fileName !== 'string') {
        res.status(400).json({ error: 'Missing or invalid fileName' });
        return;
      }

      if (!fileType || typeof fileType !== 'string') {
        res.status(400).json({ error: 'Missing or invalid fileType' });
        return;
      }

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        res.status(400).json({ error: 'Missing or invalid fileBase64 data' });
        return;
      }

      // 1. Validate file extension (Strictly JPG/JPEG, PNG, WEBP. Reject executable and arbitrary extensions)
      const lowerName = fileName.toLowerCase();
      const extMatch = lowerName.match(/\.(jpg|jpeg|png|webp)$/);
      if (!extMatch) {
        res.status(400).json({
          error: 'Unsupported file extension. Only .jpg, .jpeg, .png, and .webp posters are allowed.',
        });
        return;
      }
      const ext = extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1];

      // 2. Validate MIME type
      const normMime = fileType.toLowerCase().trim();
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(normMime)) {
        res.status(400).json({
          error: `Unsupported MIME type "${fileType}". Only image/jpeg, image/png, and image/webp are permitted.`,
        });
        return;
      }

      // 3. Decode base64 buffer and validate size (Max 5MB)
      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB

      if (buffer.length === 0) {
        res.status(400).json({ error: 'Empty file uploaded' });
        return;
      }

      if (buffer.length > MAX_SIZE) {
        res.status(400).json({
          error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the 5MB maximum limit.`,
        });
        return;
      }

      // 4. Validate image binary magic bytes to reject disguised executables or corrupt files
      let isValidHeader = false;
      if (normMime === 'image/jpeg') {
        isValidHeader =
          buffer.length >= 3 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff;
      } else if (normMime === 'image/png') {
        isValidHeader =
          buffer.length >= 8 &&
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47;
      } else if (normMime === 'image/webp') {
        isValidHeader =
          buffer.length >= 12 &&
          buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP';
      }

      if (!isValidHeader) {
        res.status(400).json({
          error: 'File content signature does not match a valid image format. Executables and non-image files are rejected.',
        });
        return;
      }

      // 5. Structure storage path: events/{event_id}/poster_{timestamp}.{ext}
      const cleanEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const storagePath = `events/${cleanEventId}/poster_${Date.now()}.${ext}`;

      // 6. Upload to Supabase Storage via server client
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY;

      if (!isRealSupabaseConfigured(supabaseUrl, supabaseKey)) {
        // Fallback for offline dev or unconfigured remote credentials
        console.warn('[Server Upload] Supabase credentials not found. Using local data URL fallback.');
        const fallbackUrl = `data:${normMime};base64,${base64Data}`;
        res.json({
          success: true,
          storagePath,
          publicUrl: fallbackUrl,
          fileName,
          fileType: normMime,
          fileSize: buffer.length,
          uploadedAt: new Date().toISOString(),
        });
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { error: uploadError } = await supabase.storage
        .from('event-posters')
        .upload(storagePath, buffer, {
          contentType: normMime,
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[Server Upload] Supabase storage upload error:', uploadError.message);
        // If remote storage is unreachable in dev/sandbox, provide graceful preview fallback
        if (
          uploadError.message?.includes('fetch failed') ||
          uploadError.message?.includes('Failed to fetch') ||
          uploadError.message?.includes('network')
        ) {
          console.warn('[Server Upload] Remote storage unreachable, returning dev data URL fallback.');
          const fallbackUrl = `data:${normMime};base64,${base64Data}`;
          res.json({
            success: true,
            storagePath,
            publicUrl: fallbackUrl,
            fileName,
            fileType: normMime,
            fileSize: buffer.length,
            uploadedAt: new Date().toISOString(),
          });
          return;
        }
        res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('event-posters')
        .getPublicUrl(storagePath);
      const publicUrl = publicUrlData?.publicUrl || '';

      // If replacing an existing poster: delete old poster ONLY after new upload succeeds
      if (oldStoragePath && typeof oldStoragePath === 'string' && oldStoragePath !== storagePath) {
        try {
          await supabase.storage.from('event-posters').remove([oldStoragePath]);
          console.log(`[Server Upload] Replaced old poster cleaned up: ${oldStoragePath}`);
        } catch (cleanupErr: any) {
          console.warn('[Server Upload] Warning cleaning up old poster:', cleanupErr?.message);
        }
      }

      res.json({
        success: true,
        storagePath,
        publicUrl,
        fileName,
        fileType: normMime,
        fileSize: buffer.length,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Server Upload] Unexpected error during poster upload:', err);
      res.status(500).json({ error: err?.message || 'Internal server error during upload' });
    }
  });

  // Schedule server-side background cleanup interval (every 10 minutes)
  const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(runServerEventCleanup, CLEANUP_INTERVAL_MS);
  // Run first check 5 seconds after startup
  setTimeout(runServerEventCleanup, 5000);

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
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
    console.log(`[VIT-BHOPAL-TWIN] Authoritative Backend: Supabase (Auth + PostgreSQL + Realtime)`);
    console.log(`[VIT-BHOPAL-TWIN] Scheduled Event Expiration Worker: Active (Interval: 10m)`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal]', err);
  process.exit(1);
});

