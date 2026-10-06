// Standings, "Finals" tab (/standings/finals). Anyone can open it.
//
// Before finals it answers "who would play if the season ended today?". On championship night
// it follows the two finals game by game: the points table, the game being played, and, for a
// team that is in the final, what it needs.
//
// In the sample league finals are still weeks away, so a switch at the top previews the
// "on the night" page with made-up results. The real app will pick the mode from the date.

import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useLeague, useMe } from '../../hooks';
import { finalTable, finalsPreview, machine as machineOf, season, team as teamOf, weekOf, type SeasonRow } from '../../sample/league';
import { at, longDate, minutesBetween } from '../../sample/time';
import type { SampleState, SFinal } from '../../sample/types';
import EmptyNote from '../../ui/EmptyNote';
import { Row, RowCard, RowText } from '../../ui/Rows';
import ScoreDisplay from '../../ui/ScoreDisplay';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';
import TeamAvatar, { TeamLink } from '../../ui/TeamAvatar';
import { whatTeamNeeds } from './finalsNeeds';
import Switcher from './Switcher';

type Mode = 'before' | 'night';
type Bracket = 'championship' | 'secondChance';

const points = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'pt' : 'pts'}`;

/** "4 weeks away", "5 days away", "tomorrow", "today". Undefined once the date has passed. */
function howFarAway(league: SampleState, date: string): string | undefined {
  const days = Math.ceil(minutesBetween(league.now, at(date, league.night.opensAt)) / (60 * 24));
  if (days < 0) return undefined;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return days < 14 ? `${days} days away` : `${Math.round(days / 7)} weeks away`;
}

export default function Finals() {
  const league = useLeague();
  const me = useMe();
  const finalsWeek = weekOf(league, 9);
  const away = finalsWeek?.state === 'upcoming' ? howFarAway(league, finalsWeek.date) : undefined;
  // Finals night itself (or after it) opens straight on the night view.
  const [mode, setMode] = useState<Mode>(finalsWeek && finalsWeek.state !== 'upcoming' ? 'night' : 'before');
  const [bracket, setBracket] = useState<Bracket>('championship');

  return (
    <Stack spacing={3}>
      <Section title="Championship night">
        <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
          {finalsWeek ? `${longDate(finalsWeek.date)}. ` : ''}Three games. 4 points for 1st, 3 for 2nd, 2 for 3rd, 1 for 4th. A tie for first is settled with one more game.
        </Typography>
      </Section>

      <div>
        <Switcher
          value={mode}
          onChange={setMode}
          label="Which version of this page to show"
          options={[
            { value: 'before', label: 'Before finals' },
            { value: 'night', label: 'On the night' }
          ]}
        />
        {away && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
            Finals are {away}. "On the night" is a preview of how this page will look then, using made-up results.
          </Typography>
        )}
      </div>

      {mode === 'before' ? (
        <BeforeFinals myTeamId={me.myTeamId} />
      ) : (
        <OnTheNight bracket={bracket} onBracket={setBracket} preview={!!away} />
      )}
    </Stack>
  );
}

// ---- Before finals ----

function BeforeFinals({ myTeamId }: { myTeamId?: string }) {
  const league = useLeague();
  const preview = finalsPreview(league);
  // finalsPreview hands back the top eight. The 9th team, just outside the second-chance final,
  // comes from the same season table (machine points added up).
  const ninth = season(league).option1[8];

  return (
    <Section title="If the season ended today">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
        <SeedCard title="Championship: top 4" rows={preview.championship} firstSeed={1} myTeamId={myTeamId} outside={preview.secondChance[0]} />
        <SeedCard title="Second-chance final: 5th to 8th" rows={preview.secondChance} firstSeed={5} myTeamId={myTeamId} outside={ninth} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 640 }}>
        Seeds come from the season table with machine points added up. The league is also testing a second way to score the season, which can change this order.{' '}
        <Link component={RouterLink} to="/standings/season">
          See both on the Season tab
        </Link>
        .
      </Typography>
    </Section>
  );
}

function SeedCard({ title, rows, firstSeed, myTeamId, outside }: { title: string; rows: SeasonRow[]; firstSeed: number; myTeamId?: string; outside?: SeasonRow }) {
  const last = rows[rows.length - 1];
  // How far the first team outside this final is from the last team in it.
  let outsideLine: string | undefined;
  if (outside && last && rows.length === 4) {
    const gap = last.points - outside.points;
    outsideLine = gap === 0
      ? `Just outside: ${outside.team.teamName}, level on points with ${last.team.teamName}.`
      : `Just outside: ${outside.team.teamName}, ${gap} ${gap === 1 ? 'point' : 'points'} behind ${last.team.teamName}.`;
  }
  return (
    <RowCard>
      <Typography variant="h4" component="h4" sx={{ px: 2, pt: 1.5, pb: 1 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Box sx={{ px: 2, pb: 1 }}>
          <EmptyNote>Not enough teams yet.</EmptyNote>
        </Box>
      ) : (
        rows.map((r, i) => (
          <Row key={r.team.teamId} mine={r.team.teamId === myTeamId} sx={{ borderTop: 1, borderColor: 'divider' }}>
            <Typography sx={{ width: 22, textAlign: 'right', flexShrink: 0, fontFamily: "'Bungee', sans-serif", color: 'primary.main' }}>
              <Box component="span" sx={visuallyHidden}>Seed </Box>
              {firstSeed + i}
            </Typography>
            <TeamAvatar team={r.team} mine={r.team.teamId === myTeamId} />
            <RowText primary={<TeamLink team={r.team} />} />
            <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>{points(r.points)}</Typography>
          </Row>
        ))
      )}
      {outsideLine && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
          {outsideLine}
        </Typography>
      )}
    </RowCard>
  );
}

// ---- On the night ----

function OnTheNight({ bracket, onBracket, preview }: { bracket: Bracket; onBracket: (b: Bracket) => void; preview: boolean }) {
  const league = useLeague();
  const me = useMe();
  const final = league.finals[bracket];
  const rows = finalTable(league, final);
  const inFinal = me.isTeam && final.teamIds.includes(me.team.teamId);
  const needs = inFinal ? whatTeamNeeds(league, final, me.team.teamId) : null;
  const allPlayed = final.games.length > 0 && final.games.every((g) => g.places);

  return (
    // Kept to a readable width on a desktop: a four-row table stretched across 1100 px is hard to follow.
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <div>
        <Switcher
          value={bracket}
          onChange={onBracket}
          label="Which final to show"
          options={[
            { value: 'championship', label: league.finals.championship.title },
            { value: 'secondChance', label: league.finals.secondChance.title }
          ]}
        />
      </div>

      <Section title={final.title} aside={preview ? <Tag>Preview</Tag> : undefined}>
        {rows.length === 0 ? (
          <EmptyNote>The teams for this final are not set yet.</EmptyNote>
        ) : (
          <FinalPointsTable final={final} myTeamId={me.myTeamId} />
        )}
      </Section>

      {final.live && final.games[final.live.game] ? (
        <LiveGame final={final} myTeamId={me.myTeamId} />
      ) : rows.length > 0 ? (
        <Typography color="text.secondary">{allPlayed ? resultLine(league, final) : 'The next game has not started yet.'}</Typography>
      ) : null}

      {needs && (
        <Card sx={{ p: 2, borderColor: 'secondary.main', borderLeftWidth: 5 }}>
          <Typography variant="h4" component="h3" sx={{ mb: 0.5 }}>
            What {me.team.teamName} needs
          </Typography>
          <Typography>{needs.sentences.join(' ')}</Typography>
          {needs.mentionsTie && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              A tie for first is settled with one more game.
            </Typography>
          )}
        </Card>
      )}
    </Stack>
  );
}

/** What to say once all three games are played. */
function resultLine(league: SampleState, final: SFinal): string {
  const rows = finalTable(league, final);
  const top = Math.max(...rows.map((r) => r.total));
  const leaders = rows.filter((r) => r.total === top);
  if (leaders.length === 1) return `All games are played. ${leaders[0]!.team.teamName} win with ${top} points.`;
  return `All games are played and ${leaders.map((r) => r.team.teamName).join(' and ')} are tied on ${top} points. One more game settles it.`;
}

/**
 * Seed and team, one narrow column per game, and the total. It has to fit a 390 px phone with
 * no sideways scrolling, so the columns have fixed widths, the machine names wrap under
 * "Game 1", and the team photo only appears when there is room.
 */
function FinalPointsTable({ final, myTeamId }: { final: SFinal; myTeamId?: string }) {
  const league = useLeague();
  const rows = finalTable(league, final);
  const cell = { px: { xs: 0.5, sm: 1.5 }, py: 1 };
  return (
    <Card>
      <Table sx={{ tableLayout: 'fixed', '& td, & th': { borderBottomColor: 'divider' }, '& tbody tr:last-of-type td, & tbody tr:last-of-type th': { borderBottom: 0 } }}>
        <TableHead>
          <TableRow sx={{ verticalAlign: 'top', '& th': { fontSize: '0.8rem' } }}>
            <TableCell sx={{ ...cell, pl: 2, fontWeight: 700, lineHeight: 1.2 }}>Seed and team</TableCell>
            {final.games.map((g, i) => (
              <TableCell key={i} align="center" sx={{ ...cell, px: { xs: 0.25, sm: 1.5 }, width: { xs: 58, sm: 110 }, fontWeight: 700, lineHeight: 1.2 }}>
                <Box component="span" sx={{ whiteSpace: 'nowrap' }}>Game {i + 1}</Box>
                <Box component="span" sx={{ display: 'block', fontWeight: 400, fontSize: '0.72rem', color: 'text.secondary' }}>{machineOf(league, g.machineId).name}</Box>
              </TableCell>
            ))}
            <TableCell align="right" sx={{ ...cell, pr: 2, width: { xs: 54, sm: 90 }, fontWeight: 700, lineHeight: 1.2 }}>
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const mine = r.team.teamId === myTeamId;
            return (
              // Your own row: tinted, with a coral edge and a spoken "your team".
              <TableRow key={r.team.teamId} sx={mine ? { bgcolor: 'action.selected' } : undefined}>
                <TableCell component="th" scope="row" sx={{ ...cell, pl: 1.5, borderLeft: 4, borderLeftColor: mine ? 'secondary.main' : 'transparent' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography component="span" sx={{ width: 14, flexShrink: 0, fontFamily: "'Bungee', sans-serif", color: 'primary.main' }}>
                      <Box component="span" sx={visuallyHidden}>Seed </Box>
                      {r.seed}
                    </Typography>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <TeamAvatar team={r.team} mine={mine} size={32} />
                    </Box>
                    <TeamLink team={r.team} noWrap={false} />
                    {mine && <Box component="span" sx={visuallyHidden}>(your team)</Box>}
                  </Box>
                </TableCell>
                {r.games.map((g, i) => (
                  <TableCell key={i} align="center" sx={{ ...cell, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                    {g === undefined ? (
                      <Box component="span" role="img" aria-label="Not played yet" sx={{ color: 'text.secondary' }}>
                        –
                      </Box>
                    ) : (
                      g
                    )}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ ...cell, pr: 2, fontSize: '1.15rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {r.total}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/** The game being played: who has a score in, who is at the machine, who is next. */
function LiveGame({ final, myTeamId }: { final: SFinal; myTeamId?: string }) {
  const league = useLeague();
  const live = final.live!;
  const game = final.games[live.game]!;
  const scored = final.teamIds.filter((id) => live.scores[id] !== undefined).sort((a, b) => live.scores[b]! - live.scores[a]!);
  const order = (id: string) => (scored.includes(id) ? scored.indexOf(id) : id === live.playing ? 10 : id === live.next ? 11 : 12);
  // Scores in first (best on top), then the team playing, the team up next, then anyone waiting.
  const teamIds = [...final.teamIds].sort((a, b) => order(a) - order(b));

  return (
    <Section title={`Game ${live.game + 1} is on: ${machineOf(league, game.machineId).name}`} aside={<Tag tone="live">Live</Tag>}>
      <RowCard>
        {teamIds.map((id) => {
          const t = teamOf(league, id);
          const score = live.scores[id];
          const state = score !== undefined ? 'Score in' : id === live.playing ? 'Playing now' : id === live.next ? 'Up next' : 'Waiting';
          return (
            <Row key={id} mine={id === myTeamId}>
              <TeamAvatar team={t} mine={id === myTeamId} />
              <RowText primary={<TeamLink team={t} />} secondary={<Box component="span" sx={id === live.playing ? { color: 'primary.main', fontWeight: 700 } : undefined}>{state}</Box>} />
              {score !== undefined && <ScoreDisplay value={score} size="sm" />}
            </Row>
          );
        })}
      </RowCard>
    </Section>
  );
}
