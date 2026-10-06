// Works out the "What your team needs" box on the Finals page.
//
// It never guesses. It lists every way the game being played can still end (four teams, so at
// most 24 finishing orders), keeps the ones that agree with the scores already in, and only
// says what is true in all of them, or names the exact condition when it is true in some.
//
// It assumes each team plays the live game once and a score that is in does not change.

import { finalTable } from '../../sample/league';
import { ordinal } from '../../sample/time';
import type { SampleState, SFinal } from '../../sample/types';

export interface Needs {
  /** One or two plain sentences, written to the team ("you"). */
  sentences: string[];
  /** True when a sentence talks about a tie for first, so the page can add how a tie is settled. */
  mentionsTie: boolean;
}

/** Every order the given ids can be put in. */
function orders(ids: string[]): string[][] {
  if (ids.length <= 1) return [ids];
  return ids.flatMap((first) => orders(ids.filter((id) => id !== first)).map((rest) => [first, ...rest]));
}

const list = (parts: string[]) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

export function whatTeamNeeds(s: SampleState, final: SFinal, teamId: string): Needs | null {
  const live = final.live;
  const table = finalTable(s, final);
  const me = table.find((r) => r.team.teamId === teamId);
  if (!live || !me || !final.games[live.game]) return null;

  const gameNo = live.game + 1;
  const size = final.teamIds.length;
  // The same points the table uses: 4 for 1st down to 1 for 4th.
  const pointsFor = (place: number) => 5 - place;
  const totalNow = new Map(table.map((r) => [r.team.teamId, r.total]));
  const nameOf = new Map(table.map((r) => [r.team.teamId, r.team.teamName]));

  // Finishing orders for the live game that agree with the scores already in.
  const inIds = final.teamIds.filter((id) => live.scores[id] !== undefined);
  const possible = orders(final.teamIds).filter((order) =>
    inIds.every((a) => inIds.every((b) => live.scores[a]! <= live.scores[b]! || order.indexOf(a) < order.indexOf(b)))
  );
  const placeIn = (order: string[], id: string) => order.indexOf(id) + 1;
  const bestPlace = Math.min(...possible.map((o) => placeIn(o, teamId)));
  const myTotal = me.total + pointsFor(bestPlace);

  // Games still to come after the live one. With any left, one game's result decides nothing.
  const gamesAfter = final.games.filter((g, i) => i !== live.game && !g.places).length;
  const reach = gamesAfter > 0 ? 'you reach' : 'you finish on';
  const decided = inIds.length === size;

  let first: string;
  if (live.scores[teamId] === undefined) first = `Finish ${ordinal(bestPlace)} in game ${gameNo} and you reach ${myTotal} points.`;
  else if (decided) first = `Game ${gameNo} is in. You finished ${ordinal(bestPlace)} in it and ${gamesAfter > 0 ? 'have' : 'end on'} ${myTotal} points.`;
  else first = `If your game ${gameNo} score ${inIds.length === 1 ? 'stays 1st' : `holds ${ordinal(bestPlace)} place`}, ${reach} ${myTotal} points.`;

  if (gamesAfter > 0) {
    return { sentences: [first, `There ${gamesAfter === 1 ? 'is one more game' : `are ${gamesAfter} more games`} after this one, so nothing is settled yet.`], mentionsTie: false };
  }

  // This is the last game. Look only at the endings where the team gets its best place.
  const rivals = final.teamIds.filter((id) => id !== teamId);
  const endings = possible
    .filter((o) => placeIn(o, teamId) === bestPlace)
    .map((order) => {
      const top = Math.max(...rivals.map((id) => (totalNow.get(id) ?? 0) + pointsFor(placeIn(order, id))));
      return { order, result: myTotal > top ? 'win' : myTotal === top ? 'tie' : 'short' };
    });
  const allWin = endings.every((e) => e.result === 'win');
  const anyWin = endings.some((e) => e.result === 'win');
  const allTop = endings.every((e) => e.result !== 'short');
  const anyTop = endings.some((e) => e.result !== 'short');

  const whatever = decided ? '.' : ', whatever the other teams do.';
  if (allWin) return { sentences: [first, `That wins it outright${whatever}`], mentionsTie: false };
  if (allTop) return { sentences: [first, `That is ${anyWin ? 'at least ' : ''}a tie for first${whatever}`], mentionsTie: true };
  if (anyTop) {
    // Each rival must end on no more points than the team. Work out the place that holds a rival
    // to that, and mention only rivals who could still do better than it.
    const conditions: string[] = [];
    for (const id of rivals) {
      const needPlace = Math.max(1, 5 - (myTotal - (totalNow.get(id) ?? 0)));
      if (!endings.some((e) => placeIn(e.order, id) < needPlace)) continue;
      conditions.push(`${nameOf.get(id)} finish ${needPlace >= size ? ordinal(size) : `${ordinal(needPlace)} or lower`}`);
    }
    const second = anyWin
      ? `That is at least a tie for first if ${list(conditions)}.`
      : `At best that is a tie for first, and only if ${list(conditions)}.`;
    return { sentences: [first, second], mentionsTie: true };
  }

  // No ending puts the team first. Say the best overall place it can still reach.
  const bestOverall = Math.min(
    ...possible.map((order) => {
      const mine = me.total + pointsFor(placeIn(order, teamId));
      return 1 + rivals.filter((id) => (totalNow.get(id) ?? 0) + pointsFor(placeIn(order, id)) > mine).length;
    })
  );
  return { sentences: [first, decided ? `That puts you ${ordinal(bestOverall)}.` : `That is not enough to finish first, and the best you can still do is ${ordinal(bestOverall)}.`], mentionsTie: false };
}
