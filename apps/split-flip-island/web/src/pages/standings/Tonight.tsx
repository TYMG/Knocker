// Standings, "Tonight" tab (/standings). Anyone can open it. It shows the points for the open
// league night: the table of teams, then one board per machine picked tonight, with a photo of
// every best score. Once the night is closed the same page reads as that week's final result.

import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLeague, useMe } from '../../hooks';
import { lineCount, linesView, machine as machineOf, machineBoard, nightStatus, tonightRows, weekLabel, type BoardRow } from '../../sample/league';
import { clock } from '../../sample/time';
import type { SMachine } from '../../sample/types';
import EmptyNote from '../../ui/EmptyNote';
import MachineArt from '../../ui/MachineArt';
import ScoreDisplay from '../../ui/ScoreDisplay';
import ScorePhoto from '../../ui/ScorePhoto';
import Section from '../../ui/Section';
import StandingsTable, { type StandingsRow } from '../../ui/StandingsTable';
import Tag from '../../ui/Tag';
import TeamAvatar, { TeamLink } from '../../ui/TeamAvatar';

/** How many teams the table shows before "Show all". */
const TOP = 6;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The table as it was the last time this page was on screen, kept while the tab stays open.
// When you come back after something changed (you posted a score, an admin voided one), the
// table first shows this older order for a moment and then lets the rows slide to where they
// are now. With live data the rows slide by themselves as scores arrive; this is what makes the
// move visible when you were on another page while it happened.
let lastSeen: { week: number; rows: StandingsRow[] } | undefined;
const REPLAY_PAUSE_MS = 500;

const orderOf = (rows: StandingsRow[]) => rows.map((r) => r.team.teamId).join('|');

export default function Tonight() {
  const league = useLeague();
  const { myTeamId } = useMe();
  const night = nightStatus(league);
  const week = night.week;
  const [showAll, setShowAll] = useState(false);
  // Boards the reader opened or closed by hand. Anything not in here keeps its starting state.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const current: StandingsRow[] = tonightRows(league).map((r) => ({
    team: r.team, rank: r.rank, points: r.points, change: r.change,
    note: night.open && !r.here ? 'Not here tonight' : undefined
  }));

  // See lastSeen above. Only replays when the same teams are in a different order, and never for
  // someone who has asked their device for less motion.
  const [replay, setReplay] = useState<StandingsRow[] | null>(() => {
    if (!lastSeen || lastSeen.week !== week.week) return null;
    const sameTeams = [...lastSeen.rows.map((r) => r.team.teamId)].sort().join('|') === [...current.map((r) => r.team.teamId)].sort().join('|');
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return sameTeams && !still && orderOf(lastSeen.rows) !== orderOf(current) ? lastSeen.rows : null;
  });
  const currentKey = current.map((r) => `${r.team.teamId}:${r.points}`).join('|');
  useEffect(() => {
    if (!replay) {
      lastSeen = { week: week.week, rows: current };
      return;
    }
    const timer = window.setTimeout(() => setReplay(null), REPLAY_PAUSE_MS);
    return () => window.clearTimeout(timer);
    // `current` is rebuilt on every render; currentKey says when its contents really changed.
  }, [replay, currentKey, week.week]);

  const all = replay ?? current;
  // Collapsed: the top six, plus your own row if you are below them, so you never have to hunt
  // for yourself. The table itself is never swapped out, so rows can slide when the order changes.
  const rows = showAll ? all : all.filter((r, i) => i < TOP || r.team.teamId === myTeamId);

  // Machines whose scores count come first, then any that broke during the night.
  const lines = linesView(league);
  const boards = [...week.machineIds.filter((id) => !week.out[id]), ...week.machineIds.filter((id) => week.out[id])].map((id) => ({
    machine: machineOf(league, id),
    out: week.out[id],
    rows: machineBoard(league, week.week, id),
    inLine: lines.find((l) => l.machine.machineId === id)?.teams.length ?? 0
  }));
  const firstOpen = boards.find((b) => !b.out)?.machine.machineId;

  return (
    <Stack spacing={4}>
      <Section title={night.open ? "Tonight's points" : `${weekLabel(week.week)} points`}>
        {!night.open && (
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            The night is closed. These are the final points for {weekLabel(week.week).toLowerCase()}.
          </Typography>
        )}
        <StandingsTable rows={rows} myTeamId={myTeamId} since="in the last 20 minutes" />
        {all.length > TOP && (
          <Button variant="outlined" fullWidth onClick={() => setShowAll(!showAll)} aria-expanded={showAll} sx={{ mt: 1.5, minHeight: 44, maxWidth: { sm: 280 } }}>
            {showAll ? `Show top ${TOP}` : `Show all ${all.length} teams`}
          </Button>
        )}
      </Section>

      {boards.length === 0 ? (
        <EmptyNote>No machines are picked for {weekLabel(week.week).toLowerCase()} yet.</EmptyNote>
      ) : (
        // One column on phones and tablets, two side by side on a wide screen.
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
          {boards.map((b) => {
            const id = b.machine.machineId;
            const open = toggled[id] ?? id === firstOpen;
            const status = b.out
              ? night.open ? 'Out tonight, does not count' : 'Was out, did not count'
              : b.inLine > 0
                ? lineCount(b.inLine)
                : b.rows.length === 0
                  ? 'No scores yet'
                  : `${plural(b.rows.length, 'team has', 'teams have')} a score`;
            return (
              <MachineBoard
                key={id}
                machine={b.machine}
                rows={b.rows}
                status={status}
                open={open}
                onToggle={() => setToggled({ ...toggled, [id]: !open })}
                myTeamId={myTeamId}
                outNote={b.out ? `Out from ${clock(b.out.at)}: ${b.out.reason}. These scores do not count.` : undefined}
                emptyNote={night.open ? 'No scores yet tonight.' : 'No scores that night.'}
              />
            );
          })}
        </Box>
      )}
    </Stack>
  );
}

/** One machine's board: a header that opens and closes it, then every team's best score. */
function MachineBoard({
  machine, rows, status, open, onToggle, myTeamId, outNote, emptyNote
}: {
  machine: SMachine;
  rows: BoardRow[];
  status: string;
  open: boolean;
  onToggle: () => void;
  myTeamId?: string;
  /** Set for a machine that is out: why, and that its scores do not count. */
  outNote?: string;
  emptyNote: string;
}) {
  const bodyId = `board-${machine.machineId}`;
  return (
    // The card is a "container" so each row can lay itself out by the width of the board, not of
    // the screen. That keeps rows right both full width on a phone and two-up on a desktop.
    <Card sx={{ containerType: 'inline-size' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, pr: 1, py: 1.25 }}>
        <MachineArt machine={machine} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h4" component="h3" noWrap>
            <Link component={RouterLink} to={`/machines/${machine.machineId}`} underline="hover" color="inherit">
              {machine.name}
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {status}
          </Typography>
        </Box>
        <Button
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`${open ? 'Hide' : 'Show'} the ${machine.name} board`}
          endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ minHeight: 44, flexShrink: 0 }}
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </Box>
      <Collapse in={open} id={bodyId}>
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          {outNote && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1, borderBottom: rows.length ? 1 : 0, borderColor: 'divider' }}>
              {outNote}
            </Typography>
          )}
          {rows.length === 0 ? (
            <Box sx={{ px: 2 }}>
              <EmptyNote>{emptyNote}</EmptyNote>
            </Box>
          ) : (
            rows.map((r) => <BoardLine key={r.team.teamId} row={r} machineName={machine.name} mine={r.team.teamId === myTeamId} counts={!outNote} />)
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

/**
 * One team on a board. On a narrow board the score sits under the name; from 460 px of board
 * width it moves to the right, next to the photo.
 */
function BoardLine({ row, machineName, mine, counts }: { row: BoardRow; machineName: string; mine: boolean; counts: boolean }) {
  const games = plural(row.games, 'game', 'games');
  return (
    <Box
      sx={{
        display: 'grid',
        alignItems: 'center',
        columnGap: 1.25,
        rowGap: 0.5,
        px: 2,
        py: 1.1,
        bgcolor: mine ? 'action.selected' : undefined,
        '& + &': { borderTop: 1, borderColor: 'divider' },
        gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
        gridTemplateAreas: '"place face name photo" "place face score photo" "place face meta photo"',
        '@container (min-width: 460px)': {
          gridTemplateColumns: 'auto auto minmax(0, 1fr) auto auto',
          gridTemplateAreas: '"place face name score photo" "place face meta score photo"',
          rowGap: 0
        }
      }}
    >
      <Typography sx={{ gridArea: 'place', width: 22, textAlign: 'right', fontFamily: "'Bungee', sans-serif", color: row.rank <= 3 ? 'primary.main' : 'text.secondary' }}>{row.rank}</Typography>
      <Box sx={{ gridArea: 'face' }}>
        <TeamAvatar team={row.team} mine={mine} />
      </Box>
      <Box sx={{ gridArea: 'name', minWidth: 0, display: 'flex' }}>
        <TeamLink team={row.team} />
      </Box>
      <Box sx={{ gridArea: 'score', display: 'flex' }}>
        <ScoreDisplay value={row.best.score} size="sm" />
      </Box>
      <Box sx={{ gridArea: 'meta', display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25 }}>
        <Typography variant="body2" color="text.secondary">
          {counts ? `${plural(row.points, 'pt', 'pts')}, ${games}` : `Does not count, ${games}`}
        </Typography>
        {row.best.check === 'checked' && <Tag tone="good">Checked</Tag>}
      </Box>
      <Box sx={{ gridArea: 'photo', display: 'flex' }}>
        <ScorePhoto score={row.best} machineName={machineName} teamName={row.team.teamName} size={44} />
      </Box>
    </Box>
  );
}
