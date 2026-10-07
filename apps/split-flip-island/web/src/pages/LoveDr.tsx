// The Love Dr.: the league's coaching mascot. Lives on a team's own home page and nowhere else,
// so only that team sees it. They read the team's results machine by machine and say, with a
// straight face, which machine loves the team back and which one needs work.
//
// The thinking is in sample/loveDr.ts. This file is what the team sees: the chart, a relationship
// status for every machine, and the switch for the Dr.'s pop-ups.
//
// Coaching is for fun and for practice. Nothing here changes points or standings.

import { lazy, Suspense } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector, useLeague } from '../hooks';
import { currentWeek, teamForm, teamsIn } from '../sample/league';
import { closingOrders, doctorsOrders, lateOrders, machineHistory, machineStatuses } from '../sample/loveDr';
import { ordinal } from '../sample/time';
import { setDrPopups, setOrdersOpen } from '../store';
import { colors } from '../theme';
import Section from '../ui/Section';
import Tag from '../ui/Tag';

/** The mascot: a heart in round glasses with a stethoscope. Drawn here so there is no image file to lose. */
export function Mascot({ size = 72 }: { size?: number }) {
  return (
    <Box component="svg" viewBox="0 0 100 100" role="img" aria-label="The Love Dr., a heart wearing glasses and a stethoscope" sx={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M50 88 C18 64 8 46 8 32 C8 18 19 9 31 9 C39 9 46 13 50 20 C54 13 61 9 69 9 C81 9 92 18 92 32 C92 46 82 64 50 88 Z" fill={colors.coral} stroke={colors.black} strokeWidth="3" />
      {/* glasses */}
      <circle cx="36" cy="36" r="10" fill="#ffffff" stroke={colors.black} strokeWidth="3" />
      <circle cx="64" cy="36" r="10" fill="#ffffff" stroke={colors.black} strokeWidth="3" />
      <path d="M46 36 H54" stroke={colors.black} strokeWidth="3" />
      <circle cx="37" cy="37" r="3.5" fill={colors.black} />
      <circle cx="63" cy="37" r="3.5" fill={colors.black} />
      {/* smile */}
      <path d="M40 54 Q50 63 60 54" fill="none" stroke={colors.black} strokeWidth="3" strokeLinecap="round" />
      {/* stethoscope */}
      <path d="M30 60 Q28 78 44 80" fill="none" stroke={colors.lime} strokeWidth="4" strokeLinecap="round" />
      <circle cx="47" cy="80" r="5" fill={colors.lime} stroke={colors.black} strokeWidth="2" />
    </Box>
  );
}

// The chart is a big download, so it arrives after the page does.
const FormRadar = lazy(() => import('../ui/charts/FormRadar'));

const tagTone = { good: 'good', work: 'warn', plain: 'plain' } as const;

/** `full` is the analysis page: it adds the week-by-week record under every machine. */
export default function LoveDr({ teamId, full = false }: { teamId: string; full?: boolean }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const popups = useAppSelector((s) => s.ui.drPopups);
  const form = teamForm(league, teamId);
  const week = currentWeek(league);
  const top = teamsIn(league, week.week).length; // 1st place on a machine earns this many points
  const statuses = machineStatuses(league, teamId);
  const orders = closingOrders(league, teamId) ?? lateOrders(league, teamId) ?? doctorsOrders(league, teamId);
  const history = full ? machineHistory(league, teamId) : [];

  // A radar needs at least three machines to be a shape.
  const enough = form.length >= 3;

  return (
    // The id lets "See the analysis" in the Doctor's orders pop-up scroll here.
    <Box id="love-dr" sx={{ scrollMarginTop: '80px' }}>
      <Section title="The Love Dr." aside="Only your team sees this">
        <Card sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: enough ? 1 : 0 }}>
            <Mascot />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>The doctor is in.</Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {enough
                  ? 'There are many kinds of love, and I have checked your chart for every one of them.'
                  : 'Play three different machines and I will have a diagnosis for you.'}
              </Typography>
            </Box>
          </Stack>

          {enough && (
            <>
              <Suspense fallback={<Box sx={{ height: 260 }} />}>
                <FormRadar form={form.map((f) => ({ name: f.machine.name, average: f.average }))} max={top} />
              </Suspense>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                Your average points a night on each machine. The further out, the better. {top} is a win.
              </Typography>
            </>
          )}

          {statuses.length > 0 && (
            <>
              <Typography variant="overline" component="h4" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', mb: 0.5 }}>
                Relationship status
              </Typography>
              <Stack spacing={1.5} data-testid="relationship-status">
                {statuses.map((st) => (
                  <Box key={st.machine.machineId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25 }}>
                      <Link component={RouterLink} to={`/machines/${st.machine.machineId}`} color="inherit" sx={{ fontWeight: 700 }}>
                        {st.machine.name}
                      </Link>
                      <Tag tone={tagTone[st.tone]}>{st.phrase}</Tag>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {st.why} {st.advice}
                    </Typography>
                    {full && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                        {(history.find((h) => h.machine.machineId === st.machine.machineId)?.nights ?? [])
                          .map((n) => `Week ${n.week}: ${ordinal(n.rank)}`)
                          .join(' · ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {enough && <Typography sx={{ fontStyle: 'italic', mt: 2 }}>Doctor's orders: you only need one great love to win. Find yours.</Typography>}

          {!full && (
            <Button component={RouterLink} to="/love-dr" variant="text" sx={{ mt: 1, px: 0, minHeight: 44 }}>
              See the full analysis
            </Button>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {orders && (
              <Button variant="outlined" size="small" onClick={() => dispatch(setOrdersOpen(true))}>
                Tonight's Doctor's orders
              </Button>
            )}
            <FormControlLabel
              sx={{ ml: 'auto', mr: 0 }}
              control={<Switch checked={popups} onChange={(e) => dispatch(setDrPopups(e.target.checked))} />}
              label="Pop-ups from the Dr."
            />
          </Box>
        </Card>
      </Section>
    </Box>
  );
}
