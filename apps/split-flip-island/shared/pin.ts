// Team PINs: 4 digits, picked at sign-up, shared by both partners. Obvious ones are refused,
// because a PIN anyone could guess lets them post scores as that team.

export const PIN_LENGTH = 4;

const COMMON = new Set(['1212', '2580', '1004', '6969', '1122', '2001', '2000', '1313', '4545', '7777']);

/** Too easy to guess: one digit repeated, a straight run up or down, or a well-known one. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return false;
  const d = [...pin].map(Number);
  const same = d.every((x) => x === d[0]);
  const up = d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10);
  const down = d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10);
  return same || up || down || COMMON.has(pin);
}

/** The message for a PIN that won't do, or '' when it's fine. */
export function pinProblem(pin: string): string {
  if (!/^\d{4}$/.test(pin)) return 'A PIN is 4 digits.';
  if (isWeakPin(pin)) return 'That PIN is too easy to guess. Pick another one.';
  return '';
}

export interface ChangePinRequest { currentPin: string; newPin: string }
/** The temporary PIN is shown to the admin once, here, and never stored in readable form. */
export interface ResetPinResponse { pin: string }
