export const formatScore = (n: number) => n.toLocaleString('en-US');

/** Keeps digits only and adds commas as the player types. */
export function formatScoreInput(raw: string): { display: string; value: number | null } {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15);
  if (!digits) return { display: '', value: null };
  const value = Number(digits);
  return { display: formatScore(value), value };
}

export function formatNight(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** How long until a moment in the future: "in 21 hr", "in 40 min", "any minute now". */
export function timeUntil(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins < 2) return 'any minute now';
  if (mins < 90) return `in ${mins} min`;
  return `in ${Math.round(mins / 60)} hr`;
}

/** 2025550142 -> (202) 555-0142 */
export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
