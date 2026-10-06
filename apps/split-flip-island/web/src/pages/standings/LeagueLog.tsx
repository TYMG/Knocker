// Standings, "Log" tab (/standings/log). Anyone can open it. It is the league's public record:
// every score, every admin change (with its reason) and every league event, newest first. It is
// where a player looks when they ask "why did that score change?". It can only be read.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { useLeague } from '../../hooks';
import { currentWeek } from '../../sample/league';
import { ago, clock, longDate } from '../../sample/time';
import type { SLogEntry } from '../../sample/types';
import EmptyNote from '../../ui/EmptyNote';
import { Row, RowCard } from '../../ui/Rows';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';

type Filter = 'all' | 'score' | 'admin';

const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: 'all', label: 'All', empty: 'Nothing has happened yet.' },
  { value: 'score', label: 'Scores', empty: 'No scores have been submitted yet.' },
  { value: 'admin', label: 'Admin changes', empty: 'No admin changes yet.' }
];

/** How many entries each "Show more" adds. */
const STEP = 30;

/** The bar's calendar day for a moment in time, as 2026-11-11. sample/time.ts has no helper for this. */
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export default function LeagueLog() {
  const league = useLeague();
  const [filter, setFilter] = useState<Filter>('all');
  const [count, setCount] = useState(STEP);

  // 'league' entries (night opened, call-outs) only show under All.
  const matching = filter === 'all' ? league.log : league.log.filter((e) => e.kind === filter);
  const shown = matching.slice(0, count);
  const today = dayOf(league.now);
  const leagueNightToday = currentWeek(league).date === today;

  // The log is already newest first, so entries from the same day sit together.
  const days: { day: string; entries: SLogEntry[] }[] = [];
  for (const entry of shown) {
    const day = dayOf(entry.at);
    const last = days[days.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }

  return (
    <Section title="League log">
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Everything that happens, newest first. Admin changes always give a reason.
      </Typography>

      <Stack direction="row" spacing={1} role="group" aria-label="Show" sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}>
        {FILTERS.map((f) => {
          const on = f.value === filter;
          return (
            <Chip
              key={f.value}
              label={f.label}
              // The tick marks the chip that is on, so it is not shown by color alone.
              icon={on ? <CheckIcon /> : undefined}
              color={on ? 'primary' : 'default'}
              variant={on ? 'filled' : 'outlined'}
              aria-pressed={on}
              onClick={() => {
                setFilter(f.value);
                setCount(STEP);
              }}
              sx={{ height: 44, borderRadius: 22, px: 0.75, fontSize: '0.95rem', fontWeight: 700 }}
            />
          );
        })}
      </Stack>

      {matching.length === 0 ? (
        <EmptyNote>{FILTERS.find((f) => f.value === filter)!.empty}</EmptyNote>
      ) : (
        <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
          {days.map(({ day, entries }) => (
            <Box key={day} component="section">
              <Typography variant="overline" component="h4" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6 }}>
                {day === today ? `${leagueNightToday ? 'Tonight' : 'Today'}, ${longDate(day)}` : longDate(day)}
              </Typography>
              <RowCard>
                {entries.map((e) => (
                  <Row key={e.id} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ overflowWrap: 'anywhere' }}>{e.action}</Typography>
                      {e.reason && (
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          Reason: {e.reason}
                        </Typography>
                      )}
                    </Box>
                    {/* Today reads "3 min ago". Under an older day's heading the time of day says more than the date again. */}
                    <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, pt: 0.25 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {day === today ? ago(e.at, league.now) : clock(e.at)}
                      </Typography>
                      {/* The quiet grey tag, not the coral one: coral outline on white is too faint in the light theme. */}
                      {e.kind === 'admin' && <Tag>Admin</Tag>}
                    </Box>
                  </Row>
                ))}
              </RowCard>
            </Box>
          ))}

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Showing {shown.length} of {matching.length}.
            </Typography>
            {shown.length < matching.length && (
              <Button variant="outlined" onClick={() => setCount(count + STEP)} sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>
                Show more
              </Button>
            )}
          </Box>
        </Stack>
      )}
    </Section>
  );
}
