export const formatScore = (n: number) => n.toLocaleString('en-US');

/** Keeps digits only and adds commas as the player types. */
export function formatScoreInput(raw: string): { display: string; value: number | null } {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15);
  if (!digits) return { display: '', value: null };
  const value = Number(digits);
  return { display: formatScore(value), value };
}

/** 2025550142 -> (202) 555-0142 */
export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}

/** Formats a phone number as it is typed: 2025550142 -> (202) 555-0142 */
export function formatPhoneInput(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
