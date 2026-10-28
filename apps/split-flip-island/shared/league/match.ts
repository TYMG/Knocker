// The solo matchmaker: five questions a solo player answers, who can see whom, and how well two
// solo players match. Used by the sign-up form, the solo player's partner page, the admin's
// Waitlist page and the server, so all of them agree.
import type { SWaitlistEntry } from './types.js';

export type Why = 'win' | 'both' | 'hang';
export type Energy = 'chill' | 'mid' | 'loud';
export type Experience = 'new' | 'some' | 'lots';
export type Style = 'solo' | 'cheer' | 'coach';
export interface SoloTraits { why: Why; energy: Energy; experience: Experience; style: Style }
/** Who a solo player wants to play with. Never shown to other players. */
export type Wants = 'anyone' | 'women' | 'men' | 'nonbinary';

interface Choice<T extends string> { value: T; label: string; short: string }
interface Question<K extends keyof SoloTraits> { key: K; label: string; choices: Choice<SoloTraits[K]>[] }

/** The four questions shown on cards, in order. Each answer is a step on a scale. */
export const QUESTIONS: [Question<'why'>, Question<'energy'>, Question<'experience'>, Question<'style'>] = [
  { key: 'why', label: 'What brings you to the league?', choices: [
    { value: 'win', label: "I'm here to win", short: 'Here to win' },
    { value: 'both', label: 'I want to play well and have fun', short: 'Play well, have fun' },
    { value: 'hang', label: "I'm here to hang out and meet people", short: 'Here to hang out' }
  ] },
  { key: 'energy', label: 'What are you like at the machine?', choices: [
    { value: 'chill', label: 'Chill and focused', short: 'Chill' },
    { value: 'mid', label: 'Somewhere in between', short: 'In between' },
    { value: 'loud', label: 'Loud, cheering every ball', short: 'Loud' }
  ] },
  { key: 'experience', label: 'How much pinball do you play?', choices: [
    { value: 'new', label: "I'm pretty new", short: 'New to pinball' },
    { value: 'some', label: 'I play now and then', short: 'Plays now and then' },
    { value: 'lots', label: 'I play all the time', short: 'Plays all the time' }
  ] },
  { key: 'style', label: 'During a game, what do you want from your partner?', choices: [
    { value: 'solo', label: "Let me play, I've got this", short: 'Let me play' },
    { value: 'cheer', label: 'Cheer me on', short: 'Cheer me on' },
    { value: 'coach', label: 'Call out shots and talk strategy', short: 'Talk strategy' }
  ] }
];

export const WANTS_CHOICES: { value: Wants; label: string }[] = [
  { value: 'anyone', label: 'Anyone' },
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'nonbinary', label: 'Nonbinary players' }
];

const isOneOf = <T extends string>(choices: { value: T }[], v: unknown): v is T => choices.some((c) => c.value === v);

/** The answers if every one is a real choice, else null. */
export function readTraits(v: unknown): SoloTraits | null {
  if (!v || typeof v !== 'object') return null;
  const t = v as Record<string, unknown>;
  const [why, energy, experience, style] = QUESTIONS;
  if (!isOneOf(why.choices, t.why) || !isOneOf(energy.choices, t.energy) || !isOneOf(experience.choices, t.experience) || !isOneOf(style.choices, t.style)) return null;
  return { why: t.why, energy: t.energy, experience: t.experience, style: t.style };
}
export const readWants = (v: unknown): Wants | null => (isOneOf(WANTS_CHOICES, v) ? v : null);

export const shortAnswer = <K extends keyof SoloTraits>(key: K, value: SoloTraits[K]) =>
  (QUESTIONS.find((q) => q.key === key)!.choices as Choice<string>[]).find((c) => c.value === value)?.short ?? '';
export const fullAnswer = <K extends keyof SoloTraits>(key: K, value: SoloTraits[K]) =>
  (QUESTIONS.find((q) => q.key === key)!.choices as Choice<string>[]).find((c) => c.value === value)?.label ?? '';

type Gender = 'woman' | 'man' | 'nonbinary';
/** Gender read from pronouns. Pronouns typed in by hand, "any pronouns" or none: unknown. */
export function genderOf(pronouns: string | undefined): Gender[] {
  switch ((pronouns ?? '').trim().toLowerCase()) {
    case 'she/her': return ['woman'];
    case 'he/him': return ['man'];
    case 'they/them': return ['nonbinary'];
    case 'she/they': return ['woman', 'nonbinary'];
    case 'he/they': return ['man', 'nonbinary'];
    default: return [];
  }
}
const WANTS_GENDER: Record<Exclude<Wants, 'anyone'>, Gender> = { women: 'woman', men: 'man', nonbinary: 'nonbinary' };
const accepts = (wants: Wants | undefined, pronouns: string | undefined) =>
  !wants || wants === 'anyone' || genderOf(pronouns).includes(WANTS_GENDER[wants]);

/** Two solo players see each other only when each fits who the other wants to play with. */
export const fits = (a: SWaitlistEntry, b: SWaitlistEntry) => accepts(a.wants, b.pronouns) && accepts(b.wants, a.pronouns);

const ORDER: { [K in keyof SoloTraits]: SoloTraits[K][] } = {
  why: ['win', 'both', 'hang'], energy: ['chill', 'mid', 'loud'], experience: ['new', 'some', 'lots'], style: ['solo', 'cheer', 'coach']
};
const steps = <K extends keyof SoloTraits>(k: K, a: SoloTraits, b: SoloTraits) => Math.abs(ORDER[k].indexOf(a[k]) - ORDER[k].indexOf(b[k]));

const WHY_SAME: Record<Why, string> = { win: "You're both here to win", both: 'You both want to play well and have fun', hang: "You're both here to hang out" };
const ENERGY_SAME: Record<Energy, string> = { chill: 'You both keep it chill', mid: "You're both somewhere between chill and loud", loud: "You're both loud at the machine" };
const STYLE_SAME: Record<Style, string> = { solo: 'You both like to be left to play', cheer: 'You both like a partner who cheers', coach: 'You both like to talk strategy' };
const EXPERIENCE_SAME: Record<Experience, string> = { new: "You're both new to pinball", some: 'You both play now and then', lots: 'You both play all the time' };

export interface Match { score: number; together: string[] }

/**
 * How well two solo players match, out of 10, and what they have in common. Only what they share
 * earns points, so there is never anything negative to show.
 *   Why you're here 4 (one step apart 2), energy 2 (1), partner style 2 (same only),
 *   experience 2 (1); a new player and a regular who both came to hang out still score 2.
 */
export function match(a: SoloTraits, b: SoloTraits): Match {
  const together: string[] = [];
  let score = 0;
  const why = steps('why', a, b);
  if (why === 0) { score += 4; together.push(WHY_SAME[a.why]); } else if (why === 1) score += 2;
  const energy = steps('energy', a, b);
  if (energy === 0) { score += 2; together.push(ENERGY_SAME[a.energy]); } else if (energy === 1) score += 1;
  if (a.style === b.style) { score += 2; together.push(STYLE_SAME[a.style]); }
  const exp = steps('experience', a, b);
  if (exp === 0) { score += 2; together.push(EXPERIENCE_SAME[a.experience]); } else if (exp === 1) score += 1;
  else if (a.why === 'hang' && b.why === 'hang') { score += 2; together.push('A regular and a newer player, both here to hang out'); }
  return { score, together };
}

/** A strong pairing: worth suggesting. */
export const SUGGEST_FROM = 6;

export type SoloCard = SWaitlistEntry & Match & { traits: SoloTraits };

/**
 * What one solo player sees. deck: players who fit them that they haven't swiped on yet, best
 * match first. matches: both swiped right (names shown). incoming: matches who asked them to pair.
 * On the server the list has already been cut to what this player may see: others come without
 * wants, likes or asks, with matched / askedMe set instead. In the sample league it's worked out here.
 */
export function soloView(waitlist: SWaitlistEntry[], meId: string | undefined) {
  const me = waitlist.find((w) => w.id === meId);
  const empty = { me, deck: [] as SoloCard[], matches: [] as SoloCard[], incoming: [] as SoloCard[], asked: undefined as SoloCard | undefined };
  if (!me?.traits) return empty;
  const cards = waitlist
    .filter((w): w is SWaitlistEntry & { traits: SoloTraits } => w.id !== me.id && !!w.traits && (w.wants === undefined || fits(me, w)))
    .map((w) => ({ ...w, ...match(me.traits!, w.traits) }))
    .sort((x, y) => y.score - x.score || x.at.localeCompare(y.at));
  const matched = (w: SWaitlistEntry) => w.matched ?? (!!me.likes?.includes(w.id) && !!w.likes?.includes(me.id));
  const askedMe = (w: SWaitlistEntry) => w.askedMe ?? w.asked === me.id;
  const swiped = (w: SWaitlistEntry) => !!me.likes?.includes(w.id) || !!me.passes?.includes(w.id);
  const matches = cards.filter(matched);
  return {
    me,
    deck: cards.filter((w) => !swiped(w) && !matched(w)),
    matches,
    incoming: matches.filter(askedMe),
    asked: matches.find((w) => w.id === me.asked)
  };
}

/** Every pair of waiting players that fit each other, best first (for the admin). */
export function bestPairs(waitlist: SWaitlistEntry[]): { a: SWaitlistEntry; b: SWaitlistEntry; score: number; together: string[] }[] {
  const out: { a: SWaitlistEntry; b: SWaitlistEntry; score: number; together: string[] }[] = [];
  for (let i = 0; i < waitlist.length; i++) {
    for (let j = i + 1; j < waitlist.length; j++) {
      const a = waitlist[i]!, b = waitlist[j]!;
      if (!a.traits || !b.traits || !fits(a, b)) continue;
      out.push({ a, b, ...match(a.traits, b.traits) });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}
