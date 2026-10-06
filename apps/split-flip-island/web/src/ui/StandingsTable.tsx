import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import type { STeam } from '../sample/types';
import EmptyNote from './EmptyNote';
import MovingList from './MovingList';
import Movement from './Movement';
import TeamAvatar, { TeamLink } from './TeamAvatar';

export interface StandingsRow {
  team: STeam;
  rank: number;
  points: number;
  change?: number;
  /** A short quiet note under the name, e.g. "Not here tonight". */
  note?: string;
}

/**
 * A ranked table of teams: place, arrows, photo, name, points. Rows slide when the order changes.
 * `cuts` draws a labelled line after a place, e.g. { 4: 'Top 4 play the championship' }.
 */
export default function StandingsTable({
  rows, myTeamId, unit = 'pts', showChange = true, since, cuts, limit
}: {
  rows: StandingsRow[];
  myTeamId?: string;
  unit?: string;
  showChange?: boolean;
  /** Finishes the arrow's spoken label: "since last week", "in the last 20 minutes". */
  since?: string;
  cuts?: Record<number, string>;
  /** Show only the first rows. */
  limit?: number;
}) {
  if (rows.length === 0) return <EmptyNote>No teams yet.</EmptyNote>;
  const shown = limit ? rows.slice(0, limit) : rows;
  const arrows = showChange && rows.some((r) => r.change !== undefined);
  return (
    <Card>
      <MovingList items={shown} keyOf={(r) => r.team.teamId}>
        {(r, i) => (
          <Fragment>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.1, bgcolor: r.team.teamId === myTeamId ? 'action.selected' : 'background.paper' }}>
              <Typography sx={{ width: 26, fontFamily: "'Bungee', sans-serif", textAlign: 'right', flexShrink: 0, color: r.rank <= 4 ? 'primary.main' : 'text.secondary' }}>{r.rank}</Typography>
              {arrows && <Movement change={r.change} since={since} />}
              <TeamAvatar team={r.team} mine={r.team.teamId === myTeamId} />
              <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <TeamLink team={r.team} />
                {r.note && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {r.note}
                  </Typography>
                )}
              </Box>
              <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {r.points.toLocaleString('en-US')}{' '}
                <Typography component="span" variant="body2" color="text.secondary">
                  {unit}
                </Typography>
              </Typography>
            </Box>
            {cuts?.[i + 1] && (
              <Typography variant="overline" sx={{ display: 'block', px: 2, py: 0.25, bgcolor: 'divider', color: 'text.primary', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.8 }}>
                {cuts[i + 1]}
              </Typography>
            )}
          </Fragment>
        )}
      </MovingList>
    </Card>
  );
}
