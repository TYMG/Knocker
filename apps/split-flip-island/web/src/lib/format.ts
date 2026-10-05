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

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
