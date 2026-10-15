// The smaller things the Love Dr. shows around the app. The thinking is in sample/loveDr.ts.
//
//   DrNotes          on team home: what the Dr. noticed tonight
//   DrCheckUp        on team home once the night has closed, and on the analysis page
//   DrCouple         what kind of couple a team is
//   DrStandingsNote  at the top of the standings: one note for the room, one for your own team
//   DrWrapped        on team home: opens Season Wrapped ("Wrapped so far" until week 8 closes)

import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLeague, useMe } from '../hooks';
import { checkUp, coupleType, drNotes, leagueNotes, privateNote } from '../sample/loveDr';
import { seasonOver } from '../sample/league';
import { wrapped } from '../sample/wrapped';
import Section from '../ui/Section';
import Tag from '../ui/Tag';
import { Mascot } from './LoveDr';

const tagTone = { good: 'good', work: 'warn', plain: 'plain' } as const;

/** Heartbreak, near misses, sparks and how your challenges stand. Nothing shows when there is nothing to say. */
export function DrNotes({ teamId }: { teamId: string }) {
  const league = useLeague();
  const notes = drNotes(league, teamId);
  if (notes.length === 0) return null;
  return (
    <Section title="The Dr. noticed" aside="Only your team sees this">
      <Card data-testid="dr-notes">
        {notes.map((n, i) => (
          <Box key={n.phrase + n.text} sx={{ px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Tag tone={tagTone[n.tone]}>{n.phrase}</Tag>
            <Typography sx={{ mt: 0.5 }}>
              {n.text}{' '}
              {n.to && (
                <Link component={RouterLink} to={n.to} sx={{ whiteSpace: 'nowrap' }}>
                  Take a look
                </Link>
              )}
            </Typography>
          </Box>
        ))}
      </Card>
    </Section>
  );
}

/** The recap of one finished night. `week` defaults to the last one the team played. */
export function DrCheckUp({ teamId, week }: { teamId: string; week?: number }) {
  const league = useLeague();
  const c = checkUp(league, teamId, week);
  if (!c) return null;
  return (
    <Section title={`The check-up: week ${c.week}`} aside="From the Love Dr.">
      <Card sx={{ p: 2 }} data-testid="check-up">
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Mascot size={48} />
          <Typography sx={{ fontWeight: 700, minWidth: 0 }}>{c.headline}</Typography>
        </Stack>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {c.best && (
            <Typography>
              <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>Best moment: </Box>
              {c.best}
            </Typography>
          )}
          {c.worst && (
            <Typography>
              <Box component="span" sx={{ fontWeight: 700, color: 'secondary.main' }}>Tough moment: </Box>
              {c.worst}
            </Typography>
          )}
          {c.earned.map((e) => (
            <Typography key={e.phrase + e.text}>
              <Tag tone="good">{e.phrase}</Tag> {e.text}
            </Typography>
          ))}
          <Typography sx={{ fontStyle: 'italic' }}>Doctor's orders: {c.next}</Typography>
        </Stack>
      </Card>
    </Section>
  );
}

/** The team's type as a tag and one line. `withAdvice` adds what the Dr. says about it (own team only). */
export function DrCouple({ teamId, withAdvice = false }: { teamId: string; withAdvice?: boolean }) {
  const league = useLeague();
  const c = coupleType(league, teamId);
  if (!c) return null;
  return (
    <Box data-testid="couple-type">
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25 }}>
        <Typography component="span" sx={{ color: 'text.secondary' }}>What kind of couple:</Typography>
        <Tag tone="good">{c.label}</Tag>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
        {c.why}
        {withAdvice ? ` ${c.says}` : ''}
      </Typography>
    </Box>
  );
}

/**
 * Doctor's orders in the standings. Everyone sees the league note, so the Dr. is a character the
 * whole room knows. A logged-in team also sees a note about itself that nobody else does.
 */
export function DrStandingsNote({ view }: { view: 'tonight' | 'season' }) {
  const league = useLeague();
  const me = useMe();
  const notes = leagueNotes(league, view);
  const mine = me.isTeam && me.team.status === 'approved' ? privateNote(league, me.team.teamId, view) : undefined;
  if (notes.length === 0 && !mine) return null;
  return (
    <Card sx={{ p: 2 }} data-testid="dr-standings-note">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Mascot size={44} />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="overline" component="h3" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6 }}>
            Doctor's orders
          </Typography>
          <Stack spacing={0.75}>
            {notes.map((n) => (
              <Typography key={n.phrase + n.text}>
                <Tag>{n.phrase}</Tag> {n.text}
              </Typography>
            ))}
          </Stack>
          {mine && (
            <Box sx={{ mt: notes.length ? 1.25 : 0, pt: notes.length ? 1.25 : 0, borderTop: notes.length ? 1 : 0, borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                Just for {me.team.teamName}. Nobody else sees this.
              </Typography>
              <Typography>{mine}</Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

/**
 * The way into Season Wrapped (phase 7). Before week 8 closes it is "Wrapped so far", a preview
 * from the weeks played; once the season is over it becomes the real thing.
 */
export function DrWrapped({ teamId }: { teamId: string }) {
  const league = useLeague();
  const data = wrapped(league, teamId);
  if (!data) return null;
  const final = seasonOver(league);
  return (
    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: final ? 'secondary.main' : undefined, color: final ? 'secondary.contrastText' : undefined }}>
      <Mascot size={52} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{final ? 'Your Season Wrapped is here' : 'Wrapped so far'}</Typography>
        <Typography variant="body2" sx={{ color: final ? 'inherit' : 'text.secondary' }}>
          {final ? 'The Dr. looks back on your whole season.' : `Your season through week ${data.throughWeek}, told by the Dr.`}
        </Typography>
      </Box>
      <Button component={RouterLink} to="/wrapped" variant={final ? 'contained' : 'outlined'} color={final ? 'inherit' : 'primary'} sx={{ flexShrink: 0, minHeight: 44 }}>
        Play it
      </Button>
    </Card>
  );
}
