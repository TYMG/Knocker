// The sample league's clock. It is frozen at 8:12 PM on league night, week 5, so every page
// tells the same story each time it is opened. All times are shown as Eastern, the bar's time.

export const SAMPLE_NOW = '2026-11-12T01:12:00.000Z'; // Wednesday, November 11, 2026, 8:12 PM Eastern

const TZ = 'America/New_York';

/** Builds a time on a league date from a bar-clock time, e.g. at('2026-11-11', '19:04'). November is UTC-5. */
export function at(date: string, clock: string): string {
  const [h, m] = clock.split(':').map(Number);
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCHours(h + (isDaylightTime(date) ? 4 : 5), m, 0, 0);
  return d.toISOString();
}

// Daylight time ends November 1 in 2026; the season starts in October.
const isDaylightTime = (date: string) => date < '2026-11-01';

/** 8:05 PM */
export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

/** Wednesday, November 11 */
export function longDate(date: string): string {
  return new Date(`${date}T17:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ });
}

/** Nov 11 */
export function shortDate(date: string): string {
  return new Date(`${date}T17:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
}

/** "2 min ago", "1 hr ago", or the clock time for older things today, or the date. */
export function ago(iso: string, now: string): string {
  const mins = Math.round((new Date(now).getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 6) return clock(iso);
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
}

/** "in 21 hr", "in 40 min", "any minute now" */
export function until(iso: string, now: string): string {
  const mins = Math.round((new Date(iso).getTime() - new Date(now).getTime()) / 60000);
  if (mins < 2) return 'any minute now';
  if (mins < 90) return `in ${mins} min`;
  return `in ${Math.round(mins / 60)} hr`;
}

export function minutesBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

/** 1st, 2nd, 3rd, 4th */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** "19:00" -> "7:00 PM" */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
