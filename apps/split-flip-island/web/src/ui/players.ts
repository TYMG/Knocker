// Player names with their pronouns, for anywhere a team's players are listed.
import type { STeam } from '../sample/types';

/** "Riley (she/her)", or just "Riley" when no pronouns were given. */
export const playerLabel = (name: string, pronouns?: string) => (pronouns ? `${name} (${pronouns})` : name);

/** "Riley (she/her) and Sam (they/them)". */
export function playersLine(team: STeam, joiner = ' and '): string {
  return team.players
    .map((name, i) => (name ? playerLabel(name, team.pronouns?.[i]) : ''))
    .filter(Boolean)
    .join(joiner);
}

/** Whether either player gets the reminder text, and how many phones do. */
export const anyTexts = (t: STeam) => !!t.texts?.some(Boolean);
export const textPhones = (t: STeam) => (t.texts ?? []).filter(Boolean).length;

/** The players who get texts, by name: "Riley and Sam". */
export const textedNames = (t: STeam) => ([0, 1] as const).filter((i) => t.texts?.[i]).map((i) => t.players[i] || `Player ${i + 1}`).join(' and ');
