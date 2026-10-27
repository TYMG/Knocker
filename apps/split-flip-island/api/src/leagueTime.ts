// League time. League nights are set in the league's own time zone (Eastern), while the server
// runs in UTC, so dates and start times are converted here. No setup needed: Node ships the zones.

export const LEAGUE_TZ = 'America/New_York';

/** The calendar date (YYYY-MM-DD) at that moment in the league's time zone. */
export function localDate(at: Date, tz = LEAGUE_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** How far the zone is ahead of UTC at that moment, in minutes (Eastern: -300 or -240). */
function offsetMinutes(at: Date, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** "2026-11-05" + "19:00" in league time -> the exact moment, as an ISO string in UTC. */
export function zonedIso(date: string, time: string, tz = LEAGUE_TZ): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let at = wall - offsetMinutes(new Date(wall), tz) * 60_000;
  // Near a daylight-saving switch the first guess can be an hour off; one more pass settles it.
  at = wall - offsetMinutes(new Date(at), tz) * 60_000;
  return new Date(at).toISOString();
}

/** "19:00" -> true. 24-hour times only. */
export const isClockTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
