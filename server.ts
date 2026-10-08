import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const PORT = parseInt(process.env.PORT || '3000', 10);

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

// Privileged scheduled cleanup worker (strictly requires SUPABASE_SERVICE_ROLE_KEY)
async function runServerEventCleanup(): Promise<typeof lastCleanupStats> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const nowIso = new Date().toISOString();

  // FAIL CLOSED: Privileged server operations must NEVER fall back to publishable or anonymous keys.
  if (!supabaseUrl || !serviceRoleKey || !isRealSupabaseConfigured(supabaseUrl, serviceRoleKey)) {
    lastCleanupStats = {
      lastRun: nowIso,
      scanned: 0,
      expiredCount: 0,
      cleanedIds: [],
      errors: ['Skipped: Privileged cleanup worker requires SUPABASE_SERVICE_ROLE_KEY.'],
    };
    return lastCleanupStats;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
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
      console.warn('[Event-Cleanup] Notice querying events:', error.message);
      errors.push(error.message);
    } else if (events && events.length > 0) {
      scanned = events.length;
      for (const ev of events) {
        const isExpired = isEventConcludedServer(ev.date, ev.end_time, ev.start_time);
        if (isExpired) {
          console.log(`[Event-Cleanup] Event "${ev.title}" (ID: ${ev.id}) expired. Processing...`);

          // 2. Remove associated poster storage file if present
          if (ev.storage_path) {
            try {
              const { error: storageErr } = await supabase.storage
                .from('event-posters')
                .remove([ev.storage_path]);
              if (storageErr) {
                console.warn(`[Event-Cleanup] Notice on poster removal for ${ev.id}:`, storageErr.message);
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
    console.warn('[Event-Cleanup] Error during cleanup execution:', err?.message || err);
    errors.push(err?.message || 'Unknown error');
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

  // Basic payload limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Production Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://unpkg.com; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://unpkg.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';"
    );
    next();
  });

  // Safe Restricted CORS (Same-origin by default, allows configured production origin)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigin = process.env.ALLOWED_ORIGIN;

    if (origin) {
      const isAllowed =
        (allowedOrigin && origin === allowedOrigin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // Health and Readiness Check Endpoints
  const handleHealth = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'VIT Bhopal Digital Twin',
      architecture: 'React Vite SPA + Supabase (Auth, PostgreSQL, Storage, Realtime)',
      authoritativeBackend: 'Supabase PostgreSQL',
      timezone: 'Asia/Kolkata (IST, UTC+5:30)',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', handleHealth);
  app.get('/api/health', handleHealth);

  // Scheduled / On-demand Event Cleanup Endpoints
  app.get('/api/events/cleanup-status', (req, res) => {
    res.json({
      status: 'ok',
      cleanupJob: lastCleanupStats,
      intervalMinutes: 10,
      timezone: 'Asia/Kolkata (IST)',
    });
  });

  app.post('/api/events/cleanup', async (req, res) => {
    // Authenticate external cron calls if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        res.status(401).json({ error: 'Unauthorized: Invalid cron authorization token' });
        return;
      }
    }

    try {
      const result = await runServerEventCleanup();
      res.json({
        success: true,
        message: 'Authoritative event cleanup executed successfully',
        result,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Cleanup execution failure' });
    }
  });

  // Scheduled background cleanup interval (every 10 minutes)
  const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(runServerEventCleanup, CLEANUP_INTERVAL_MS);
  // Initial run after brief delay
  setTimeout(runServerEventCleanup, 5000);

  // Vite development middleware or static production file serving
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

  // Safe global error handler (never leaks stack traces to clients)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err?.message || 'Unknown server error');
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VIT-BHOPAL-TWIN] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[VIT-BHOPAL-TWIN] Authoritative Backend: Supabase (Auth + PostgreSQL + Storage + Realtime)`);
    console.log(`[VIT-BHOPAL-TWIN] Event Expiration Worker: Active (Interval: 10m)`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal]', err?.message || err);
  process.exit(1);
});
