// Admin: one week, machine by machine. Used to review a whole night: each machine shows its
// three best scores, and can open up to every game played on it. The chips at the top narrow the
// page to scores nobody has checked, or to the ones the app flagged for a look.
// A machine that broke that night stays on the page, folded shut, because its scores do not count.

import { useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLeague } from '../../hooks';
import { countedMachines, machine, machineBoard, scoreCounts, scoreList, team, weekLabel, weekOf } from '../../sample/league';
import { clock, longDate } from '../../sample/time';
import type { SampleState, SMachine, SScore, SWeek } from '../../sample/types';
import ActionCard from '../../ui/ActionCard';
import EmptyNote from '../../ui/EmptyNote';
import MachineArt from '../../ui/MachineArt';
import Page from '../../ui/Page';
import { Row, RowCard, RowText } from '../../ui/Rows';
import Section from '../../ui/Section';
import { count, focusRing, listOf, ScoreRow } from './seasonParts';

const BACK = { to: '/admin/weeks', label: 'Weeks' };

type Show = 'all' | 'unchecked' | 'flagged';
const TOP = 3;

/** "8 teams, 10 games, 5 not checked, 1 needs a look" */
function machineLine(league: SampleState, week: SWeek, machineId: string): string {
  const all = scoreList(league, { week: week.week, machineId });
  if (all.length === 0) return 'No scores yet';
  const active = all.filter((x) => x.status === 'active');
  const unchecked = active.filter((x) => x.check === 'unchecked').length;
  const flagged = active.filter((x) => x.check === 'flagged').length;
  return [
    count(new Set(all.map((x) => x.teamId)).size, 'team'),
    count(all.length, 'game'),
    unchecked > 0 ? `${unchecked} not checked` : '',
    flagged > 0 ? `${flagged} ${flagged === 1 ? 'needs' : 'need'} a look` : ''
  ].filter(Boolean).join(', ');
}

/** Every game in a list, newest first, with the time it was posted. */
function GameRows({ league, scores, machineName, fullStatus }: { league: SampleState; scores: SScore[]; machineName: string; fullStatus?: boolean }) {
  return scores.map((x) => {
    const name = team(league, x.teamId).teamName;
    return <ScoreRow key={x.scoreId} score={x} machineName={machineName} teamName={name} primary={name} meta={clock(x.at)} shortStatus={!fullStatus} />;
  });
}

/** One machine that counts this week: its best scores, opening up to every game. */
function MachineSection({ league, week, m, show }: { league: SampleState; week: SWeek; m: SMachine; show: Show }) {
  const [open, setOpen] = useState(false);
  const all = scoreList(league, { week: week.week, machineId: m.machineId });
  const matching = show === 'all' ? all : scoreList(league, { week: week.week, machineId: m.machineId, check: show });
  // With a filter on, a machine with nothing to show is left off the page.
  if (show !== 'all' && matching.length === 0) return null;

  // Each team's best score, best first. Voided scores never appear here; they are in the full list.
  const best = [...machineBoard(league, week.week, m.machineId)].sort((a, b) => a.rank - b.rank).slice(0, TOP);
  const title = (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <MachineArt machine={m} size={36} />
      <span>{m.name}</span>
    </Box>
  );

  return (
    <Section title={title}>
      <Typography color="textSecondary" sx={{ mb: 1 }}>
        {machineLine(league, week, m.machineId)}
      </Typography>
      {all.length === 0 ? null : show !== 'all' ? (
        <Card>
          {/* When looking only at flagged scores, say why each one was flagged. */}
          <GameRows league={league} scores={matching} machineName={m.name} fullStatus={show === 'flagged'} />
        </Card>
      ) : (
        <>
          <Card id={`games-${m.machineId}`}>
            {open ? (
              <GameRows league={league} scores={all} machineName={m.name} />
            ) : (
              best.map((row) => <ScoreRow key={row.best.scoreId} score={row.best} machineName={m.name} teamName={row.team.teamName} primary={row.team.teamName} shortStatus />)
            )}
          </Card>
          {/* Nothing more to show when the best scores already are every game. */}
          {(open || all.length > best.length) && (
            <Button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`games-${m.machineId}`} endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ mt: 0.5, minHeight: 44 }}>
              {open ? `Show the top ${TOP} only` : `Show all ${count(all.length, 'game')}`}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}

/** A machine that broke that night: one folded row that opens to its scores, which stay on record. */
function OutMachine({ league, week, m, show }: { league: SampleState; week: SWeek; m: SMachine; show: Show }) {
  const [open, setOpen] = useState(false);
  const all = scoreList(league, { week: week.week, machineId: m.machineId });
  const matching = show === 'all' ? all : scoreList(league, { week: week.week, machineId: m.machineId, check: show });
  if (show !== 'all' && matching.length === 0) return null;
  const out = week.out[m.machineId];

  return (
    <Card>
      <ButtonBase onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`games-${m.machineId}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', textAlign: 'left', px: 2, py: 1.25, minHeight: 64, ...focusRing }}>
        <Box sx={{ opacity: 0.6, display: 'flex' }}>
          <MachineArt machine={m} size={36} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {m.name}: <Box component="span" sx={{ color: 'secondary.main' }}>Out, scores do not count</Box>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {machineLine(league, week, m.machineId)}
          </Typography>
        </Box>
        {open ? <ExpandLessIcon sx={{ color: 'text.secondary', flexShrink: 0 }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />}
      </ButtonBase>
      <Box id={`games-${m.machineId}`} sx={{ borderTop: open ? 1 : 0, borderColor: 'divider' }}>
        {open && out && (
          <Typography variant="body2" color="textSecondary" sx={{ px: 2, py: 1.25, borderBottom: matching.length > 0 ? 1 : 0, borderColor: 'divider' }}>
            Out since {clock(out.at)}: {out.reason}. These scores stay on record and earn no points.
          </Typography>
        )}
        {open && <GameRows league={league} scores={matching} machineName={m.name} fullStatus={show === 'flagged'} />}
      </Box>
    </Card>
  );
}

export default function WeekDetail() {
  const league = useLeague();
  const { week: weekParam } = useParams();
  // The chosen filter is kept in the address, so coming back from a score keeps it.
  const [search, setSearch] = useSearchParams();

  const week = /^\d+$/.test(weekParam ?? '') ? weekOf(league, Number(weekParam)) : undefined;
  if (!week) {
    return (
      <Page title="Week not found" back={BACK}>
        <EmptyNote>There is no week at this address. The season has weeks 1 to 8 and finals.</EmptyNote>
        <Button component={RouterLink} to={BACK.to} variant="outlined" size="large" sx={{ mt: 1 }}>
          Back to weeks
        </Button>
      </Page>
    );
  }

  const title = weekLabel(week.week);
  const date = longDate(week.date);

  // Finals night has its own format (two brackets of four), which the sample does not score yet.
  if (week.week >= 9) {
    return (
      <Page title={title} subtitle={`${date}. Top 4 and second-chance final.`} back={BACK}>
        <Stack spacing={2}>
          <Typography>Finals scoring is not built in the sample yet, so there are no scores to review here. The public Finals page shows what the night will look like.</Typography>
          <ActionCard to="/standings/finals" title="See the public Finals page" note="Championship and second-chance final" />
        </Stack>
      </Page>
    );
  }

  const counts = scoreCounts(league, week.week);
  const inPlay = countedMachines(league, week).map((id) => machine(league, id));
  const out = week.machineIds.filter((id) => week.out[id]).map((id) => machine(league, id));
  const outNames = out.map((m) => m.name);
  const asked = search.get('show');
  const show: Show = asked === 'unchecked' || asked === 'flagged' ? asked : 'all';

  if (week.state === 'upcoming') {
    return (
      <Page title={title} subtitle={`${date}. Not played yet.`} back={BACK}>
        <Stack spacing={3}>
          <ActionCard to="/admin/lineup" title="Machines this week" note={inPlay.length > 0 ? `${inPlay.length} picked` : 'None picked yet'} />
          <Section title="Machines picked">
            {inPlay.length === 0 ? (
              <EmptyNote>No machines picked yet.</EmptyNote>
            ) : (
              <RowCard>
                {inPlay.map((m) => (
                  <Row key={m.machineId}>
                    <MachineArt machine={m} size={40} />
                    <RowText primary={m.name} />
                  </Row>
                ))}
              </RowCard>
            )}
          </Section>
          <Section title="Scores">
            <EmptyNote>No scores yet.</EmptyNote>
          </Section>
        </Stack>
      </Page>
    );
  }

  const open = week.state === 'open';
  const outNote = outNames.length > 0 ? `, ${listOf(outNames)} ${outNames.length === 1 ? 'is' : 'are'} out` : '';
  const chips: { value: Show; label: string; n: number }[] = [
    { value: 'all', label: 'All', n: counts.all },
    { value: 'unchecked', label: 'Not checked', n: counts.unchecked },
    { value: 'flagged', label: 'Needs a look', n: counts.flagged }
  ];
  const nothing = show === 'unchecked' ? counts.unchecked === 0 : show === 'flagged' ? counts.flagged === 0 : false;

  return (
    <Page title={title} subtitle={`${date}. ${open ? 'Open now' : 'Final'}. ${count(counts.all, 'score')} from ${count(counts.teams, 'team')}.`} back={BACK}>
      <Stack spacing={3}>
        {open ? (
          <ActionCard to="/admin/lineup" title="Machines this week" note={`${inPlay.length} in${outNote}`} />
        ) : (
          // A finished week's machines can no longer be changed, so this is a plain line, not a link to the picker.
          <Typography color="textSecondary">
            Machines that week: {listOf(inPlay.map((m) => m.name)) || 'none'}.{outNames.length > 0 ? ` ${listOf(outNames)} ${outNames.length === 1 ? 'was' : 'were'} out.` : ''}
          </Typography>
        )}

        {counts.all > 0 && (
          <Stack direction="row" role="group" aria-label="Which scores to show" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            {chips.map((chip) => {
              const selected = show === chip.value;
              return (
                <Chip
                  key={chip.value}
                  clickable
                  aria-pressed={selected}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setSearch(chip.value === 'all' ? {} : { show: chip.value }, { replace: true })}
                  label={
                    <>
                      {chip.label} <b>{chip.n}</b>
                    </>
                  }
                  sx={{ height: 44, borderRadius: 22, fontSize: '0.875rem', fontWeight: selected ? 700 : 400, '& .MuiChip-label': { px: 1.25 } }}
                />
              );
            })}
          </Stack>
        )}

        {nothing && <EmptyNote>{show === 'flagged' ? 'No scores need a look.' : 'Nothing is waiting to be checked.'}</EmptyNote>}

        {/* Keyed by week so an opened machine folds shut again when moving to another week. */}
        {inPlay.map((m) => (
          <MachineSection key={`${week.week}-${m.machineId}`} league={league} week={week} m={m} show={show} />
        ))}
        {out.map((m) => (
          <OutMachine key={`${week.week}-${m.machineId}`} league={league} week={week} m={m} show={show} />
        ))}
        {week.machineIds.length === 0 && <EmptyNote>No machines were picked for this week.</EmptyNote>}
      </Stack>
    </Page>
  );
}
