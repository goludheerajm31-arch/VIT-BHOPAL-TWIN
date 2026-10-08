/**
 * VIT Bhopal Digital Twin - India Timezone (Asia/Kolkata) & Event Expiration Utilities
 *
 * All campus events are scheduled in Indian Standard Time (IST, UTC+5:30).
 * Event expiration and time queries MUST evaluate against IST rather than naive local device time.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parses an event date ("YYYY-MM-DD") and optional time string ("4:00 PM", "16:00", "04:30 PM")
 * into a precise Unix epoch millisecond timestamp anchored to Asia/Kolkata (+05:30).
 */
export function parseEventDateTimeToIST(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;

  // Defaults to 23:59:59 IST if no end time is specified
  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (timeStr && timeStr.trim()) {
    const raw = timeStr.trim();
    // Check 12-hour AM/PM format (e.g., "4:00 PM", "04:30 pm")
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
      // Check 24-hour format (e.g., "16:00", "09:30")
      const h24Match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (h24Match) {
        hours = parseInt(h24Match[1], 10);
        minutes = parseInt(h24Match[2], 10);
        seconds = 0;
      }
    }
  }

  // Format parts: YYYY-MM-DDTHH:mm:ss+05:30
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  if (isNaN(y) || isNaN(mon) || isNaN(d)) return 0;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isoWithISTOffset = `${pad(y)}-${pad(mon)}-${pad(d)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}+05:30`;

  const parsed = Date.parse(isoWithISTOffset);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Returns current timestamp in UTC ms.
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Returns current date and time components in Asia/Kolkata.
 */
export function getCurrentISTParts(): {
  dateStr: string; // "YYYY-MM-DD"
  tomorrowStr: string;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  const hours = parseInt(get('hour'), 10);
  const minutes = parseInt(get('minute'), 10);
  const seconds = parseInt(get('second'), 10);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;

  // Tomorrow calculation in IST
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomParts = formatter.formatToParts(tomorrowDate);
  const tomYear = tomParts.find((p) => p.type === 'year')?.value;
  const tomMonth = tomParts.find((p) => p.type === 'month')?.value;
  const tomDay = tomParts.find((p) => p.type === 'day')?.value;
  const tomorrowStr = `${tomYear}-${tomMonth}-${tomDay}`;

  return { dateStr, tomorrowStr, year, month, day, hours, minutes, seconds };
}

/**
 * Determines whether an event has passed its end date/time in IST.
 * An event is expired only after its actual END time has elapsed.
 */
export function isEventExpired(event: {
  date: string;
  startTime?: string;
  endTime?: string;
}): boolean {
  if (!event || !event.date) return false;

  // Use endTime if present, else fallback to end of the day or startTime + 2 hours
  let endEpoch: number;
  if (event.endTime && event.endTime.trim()) {
    endEpoch = parseEventDateTimeToIST(event.date, event.endTime);
  } else if (event.startTime && event.startTime.trim()) {
    // Fallback: If only start time is provided, consider expired 3 hours after start
    const startEpoch = parseEventDateTimeToIST(event.date, event.startTime);
    endEpoch = startEpoch + 3 * 60 * 60 * 1000;
  } else {
    // End of the calendar day in IST
    endEpoch = parseEventDateTimeToIST(event.date, '11:59 PM');
  }

  const now = getCurrentTimestamp();
  return now > endEpoch;
}

/**
 * Returns formatted IST display string for date
 */
export function formatISTDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
