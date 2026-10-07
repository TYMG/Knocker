// The Love Dr.: the league's coaching mascot. Lives on a team's own home page and nowhere else,
// so only that team sees it. They read the team's results machine by machine and say, with a
// straight face, which machine loves the team back and which one needs work.
//
// Coaching is for fun and for practice. Nothing here changes points or standings.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { RadarChart } from '@mui/x-charts/RadarChart';
import { useLeague } from '../hooks';
import { currentWeek, teamForm, teamsIn, teamTonight } from '../sample/league';
import { colors } from '../theme';
import Section from '../ui/Section';

/** The mascot: a heart in round glasses with a stethoscope. Drawn here so there is no image file to lose. */
function Mascot({ size = 72 }: { size?: number }) {
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

const pts = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;

export default function LoveDr({ teamId }: { teamId: string }) {
  const league = useLeague();
  const form = teamForm(league, teamId);
  const week = currentWeek(league);
  const top = teamsIn(league, week.week).length; // 1st place on a machine earns this many points
  const waiting = week.state === 'open' ? teamTonight(league, teamId).toPlay : [];

  // A radar needs at least three machines to be a shape.
  const enough = form.length >= 3;
  const best = [...form].sort((a, b) => b.average - a.average)[0];
  const worst = [...form].sort((a, b) => a.average - b.average)[0];

  const lines: { kind: string; text: string }[] = [];
  if (enough && best && worst && best.machine.machineId !== worst.machine.machineId) {
    lines.push({ kind: 'True love', text: `${best.machine.name}. ${pts(best.average)} a night. Whatever you two have, keep it going.` });
    lines.push({ kind: 'Tough love', text: `${worst.machine.name}. Only ${pts(worst.average)} a night. It is not you, it is the outlanes. Give it two extra games this week.` });
  }
  if (waiting.length > 0) lines.push({ kind: 'Playing hard to get', text: `${waiting.map((m) => m.name).join(' and ')} ${waiting.length === 1 ? 'is' : 'are'} still waiting to hear from you tonight.` });

  return (
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
            <RadarChart
              height={260}
              hideLegend
              margin={{ top: 24, bottom: 24, left: 40, right: 40 }}
              series={[{ id: 'form', label: 'Points a night', data: form.map((f) => f.average), color: colors.coral, fillArea: true }]}
              radar={{ max: top, metrics: form.map((f) => f.machine.name) }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Your average points a night on each machine. The further out, the better. {top} is a win.
            </Typography>
          </>
        )}

        <Stack spacing={1.25}>
          {lines.map((l) => (
            <Box key={l.kind}>
              <Typography component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {l.kind}:{' '}
              </Typography>
              <Typography component="span">{l.text}</Typography>
            </Box>
          ))}
          {enough && <Typography sx={{ fontStyle: 'italic' }}>Doctor's orders: you only need one great love to win. Find yours.</Typography>}
        </Stack>
      </Card>
    </Section>
  );
}
