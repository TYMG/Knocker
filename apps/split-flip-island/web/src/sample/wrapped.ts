// Season Wrapped (Build Plan phase 7): each team's season as a run of cards, told by the
// Love Dr. Everything is worked out from the scores, with the Dr.'s existing reads on a team
// (machine history, relationship statuses, couple type). Nothing here is stored.
//
// Before week 8 closes it is "Wrapped so far": the same cards, with "so far" wording, so the
// demo can show it with the sample weeks. The Dr. never gets gloomy: a weak spot is pitched as
// the next thing to work on.

import { playedWeeks, seasonOver, shortScore, teamSeason } from './league';
import { coupleType, machineHistory, machineStatuses } from './loveDr';
import { ordinal } from './time';
import type { SampleState } from './types';

export interface WrappedCard {
  /** Short id, also used for the card's color. */
  key: 'intro' | 'games' | 'best-night' | 'favorite' | 'got-away' | 'statuses' | 'couple' | 'finish';
  /** Small line above the big one. */
  kicker: string;
  /** The one big thing on the card: a number, a name, a place. */
  big: string;
  /** What the big thing means, in a few words. */
  label?: string;
  /** The Dr.'s line. */
  says: string;
  /** Extra short items, e.g. the phrases earned. */
  chips?: string[];
}

export interface Wrapped {
  final: boolean;
  /** "Week 5" before the season ends. */
  throughWeek: number;
  cards: WrappedCard[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function wrapped(s: SampleState, teamId: string): Wrapped | undefined {
  const season = teamSeason(s, teamId);
  if (season.games === 0) return undefined;
  const final = seasonOver(s);
  const played = playedWeeks(s);
  const throughWeek = played.length ? played[played.length - 1]!.week : 0;
  const soFar = final ? '' : ' so far';
  const history = machineHistory(s, teamId).filter((h) => h.nights.length > 0);
  const gamesOn = (h: (typeof history)[number]) => h.nights.reduce((a, n) => a + n.scores.length, 0);
  const statuses = machineStatuses(s, teamId);

  const cards: WrappedCard[] = [];

  cards.push({
    key: 'intro',
    kicker: final ? 'Season Wrapped' : `Wrapped so far, through week ${throughWeek}`,
    big: season.team.teamName,
    says: "Pull up a chair. Let's talk about your love life. With pinball."
  });

  // How much they played, against the league's average team.
  const teamsWithGames = new Set(s.scores.filter((x) => x.status === 'active').map((x) => x.teamId)).size || 1;
  const leagueAverage = s.scores.filter((x) => x.status === 'active').length / teamsWithGames;
  cards.push({
    key: 'games',
    kicker: `Games played${soFar}`,
    big: String(season.games),
    label: `across ${plural(season.weeks.filter((w) => w.played).length, 'night')}`,
    says: season.games >= leagueAverage ? 'You two showed up and put in the work. Love takes work.' : 'Quality over quantity. I respect a couple that knows what it wants.'
  });

  if (season.bestNight) {
    const first = season.bestNight.rank === 1;
    cards.push({
      key: 'best-night',
      kicker: 'Your best night',
      big: ordinal(season.bestNight.rank),
      label: `in week ${season.bestNight.week}`,
      says: first ? 'Power couple energy. Everybody in the bar noticed.' : 'That is the version of you two I like to see. Bring them back.'
    });
  }

  if (history.length) {
    const favorite = [...history].sort((a, b) => gamesOn(b) - gamesOn(a))[0]!;
    const status = statuses.find((x) => x.machine.machineId === favorite.machine.machineId);
    cards.push({
      key: 'favorite',
      kicker: 'Your favorite machine',
      big: favorite.machine.name,
      label: `${plural(gamesOn(favorite), 'game')}, best ${shortScore(favorite.bestEver)}`,
      says: status?.tone === 'good' ? `You can't stay away from ${favorite.machine.name}. ${status.phrase}.` : `You keep going back to ${favorite.machine.name}. That is commitment.`
    });

    // The machine that got away: lowest points a night. Pitched as the next date, not a breakup.
    const others = history.filter((h) => h !== favorite);
    const pool = others.length ? others : history;
    const gotAway = [...pool].sort((a, b) => a.averagePoints - b.averagePoints)[0]!;
    cards.push({
      key: 'got-away',
      kicker: 'The one that got away',
      big: gotAway.machine.name,
      label: `${gotAway.averagePoints} points a night`,
      says: `Every love story has one that got away. ${final ? 'Next season' : 'Next week'}, take ${gotAway.machine.name} out to dinner first.`
    });
  }

  const earned = statuses.filter((x) => x.tone === 'good').map((x) => `${x.machine.name}: ${x.phrase}`);
  if (earned.length) {
    cards.push({
      key: 'statuses',
      kicker: `Relationship statuses${soFar}`,
      big: String(earned.length),
      label: earned.length === 1 ? 'machine going well' : 'machines going well',
      says: 'Look at you two, collecting relationships.',
      chips: earned.slice(0, 4)
    });
  }

  const couple = coupleType(s, teamId);
  if (couple) {
    cards.push({ key: 'couple', kicker: 'What kind of couple you are', big: couple.label, label: couple.why, says: couple.says });
  }

  if (season.row) {
    const finals = season.row.rank <= 4;
    cards.push({
      key: 'finish',
      kicker: final ? 'Where you finished' : `Where you stand${soFar}`,
      big: ordinal(season.row.rank),
      label: `${plural(season.row.points, 'point')}${season.machineWins ? `, ${plural(season.machineWins, 'machine win')}` : ''}`,
      says: finals
        ? final ? 'Finals material. Doctor says: act like it.' : 'Top four. Keep this up and I will see you on championship night.'
        : final ? 'The season is over but the love is not. See you next season.' : 'The season is long and so is love. Keep showing up and climb.'
    });
  }

  return { final, throughWeek, cards };
}
