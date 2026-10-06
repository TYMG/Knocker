// Check scores: the review queue for the current week. The admin compares each photo with the
// typed score and taps "Looks right", or opens the score to fix or void it. It starts on the
// scores the app flagged on its own, because those are the ones most likely to be wrong.

import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { checkLabel, currentWeek, machine, scoreCounts, scoreList, team } from '../../sample/league';
import { sample } from '../../sample/slice';
import { clock } from '../../sample/time';
import type { SScore } from '../../sample/types';
import { showToast } from '../../store';
import { colors } from '../../theme';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import ScoreDisplay from '../../ui/ScoreDisplay';
import ScorePhoto from '../../ui/ScorePhoto';
import Tag from '../../ui/Tag';
import { ADMIN_HOME, attention, choiceSx, scoreStatus } from './nightShared';

type Filter = 'flagged' | 'unchecked' | 'all';

const EMPTY: Record<Filter, string> = {
  flagged: 'Nothing needs a look.',
  unchecked: 'Every score has been checked.',
  all: 'No scores this week yet.'
};

const PHOTO = 72;

export default function Scores() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const week = currentWeek(league);
  const counts = scoreCounts(league, week.week);
  // Decided once, when the page opens. It does not jump to another list when the last flagged
  // score is dealt with: the admin sees "Nothing needs a look." and moves on when ready.
  const [filter, setFilter] = useState<Filter>(() => (counts.flagged > 0 ? 'flagged' : 'unchecked'));

  const list = filter === 'all' ? scoreList(league, { week: week.week }) : scoreList(league, { week: week.week, check: filter });
  const chips: [Filter, string, number][] = [
    ['flagged', 'Needs a look', counts.flagged],
    ['unchecked', 'Not checked', counts.unchecked],
    ['all', 'All', counts.all]
  ];

  return (
    <Page title="Check scores" subtitle={`Week ${week.week}. Compare each photo with the score the team typed.`} back={ADMIN_HOME}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={filter}
        onChange={(_, next: Filter | null) => next && setFilter(next)}
        aria-label="Which scores to show"
        // Widths follow the words, so "Not checked 15" stays on one line on a phone and "All" takes less room.
        sx={[choiceSx, { mb: 2, '& .MuiToggleButton-root': { fontSize: '0.9rem', flex: '1 1 auto', width: 'auto', whiteSpace: 'nowrap' } }]}
      >
        {chips.map(([value, label, n]) => (
          <ToggleButton key={value} value={value}>
            {/* One span, so the button (a flex box) keeps the space between the words and the count. */}
            <span>
              {label}{' '}
              <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
                {n}
              </Box>
            </span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {list.length === 0 ? (
        <EmptyNote>{EMPTY[filter]}</EmptyNote>
      ) : (
        <Stack spacing={1.5}>
          {list.map((x) => (
            <ScoreCard
              key={x.scoreId}
              score={x}
              teamName={team(league, x.teamId).teamName}
              machineName={machine(league, x.machineId).name}
              machineOut={!!week.out[x.machineId]}
              nightOpen={week.state === 'open'}
              onChecked={() => {
                dispatch(sample.markChecked(x.scoreId));
                dispatch(showToast(`Checked ${team(league, x.teamId).teamName}'s ${machine(league, x.machineId).name} score`));
              }}
            />
          ))}
        </Stack>
      )}
    </Page>
  );
}

function ScoreCard({
  score, teamName, machineName, machineOut, nightOpen, onChecked
}: {
  score: SScore;
  teamName: string;
  machineName: string;
  /** The machine broke that night, so the score is on record but earns nothing. */
  machineOut: boolean;
  nightOpen: boolean;
  onChecked: () => void;
}) {
  const voided = score.status === 'voided';
  const status = scoreStatus(score);
  const done = voided || score.check === 'checked';

  return (
    <Card component="article" aria-label={`${teamName} on ${machineName}`} sx={{ p: 2, ...(score.check === 'flagged' && !voided && { borderColor: 'secondary.main' }) }}>
      {/* Voided scores are dimmed as a block, but the buttons below stay at full strength. */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', opacity: voided ? 0.55 : 1 }}>
        {score.photoSource === 'none' ? (
          <Box
            sx={{
              width: PHOTO, height: PHOTO, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 1, color: 'text.secondary', fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2
            }}
          >
            No photo
          </Box>
        ) : (
          <ScorePhoto score={score} machineName={machineName} teamName={teamName} size={PHOTO} />
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.75 }}>
            {teamName} on {machineName}
          </Typography>
          {/* ScoreDisplay is its own box, so a text strike-through would not reach it: draw the line over it. */}
          <Box
            sx={{
              position: 'relative', display: 'inline-block', maxWidth: '100%', verticalAlign: 'top',
              ...(voided && { '&::after': { content: '""', position: 'absolute', left: 6, right: 6, top: '50%', borderTop: `2px solid ${colors.dmdAmber}` } })
            }}
          >
            <ScoreDisplay value={score.score} size="md" label={voided ? `Voided score ${score.score.toLocaleString('en-US')}` : undefined} />
          </Box>
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.5, mt: 0.75 }}>
            <Typography variant="body2" color="textSecondary">
              {clock(score.at)}
            </Typography>
            <Tag tone={status.tone}>{status.label}</Tag>
          </Stack>
        </Box>
      </Box>

      {score.check === 'flagged' && !voided && score.flag && (
        <Typography sx={attention({ mt: 1.25 })}>
          {score.flag}
        </Typography>
      )}
      {voided && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1.25 }}>
          {checkLabel(score)}. It does not count.
        </Typography>
      )}
      {machineOut && !voided && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1.25 }}>
          {machineName} {nightOpen ? 'is out tonight' : 'went out that night'}, so this score does not count.
        </Typography>
      )}

      <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
        <Button component={RouterLink} to={`/admin/scores/${score.scoreId}`} variant="outlined" fullWidth aria-label={`${voided ? 'Open' : 'Fix or void'} ${teamName}'s ${machineName} score`} sx={{ minHeight: 48 }}>
          {voided ? 'Open' : 'Fix or void'}
        </Button>
        {!done && (
          <Button variant="contained" color="secondary" fullWidth onClick={onChecked} aria-label={`Looks right: ${teamName} on ${machineName}`} sx={{ minHeight: 48 }}>
            Looks right
          </Button>
        )}
      </Stack>
    </Card>
  );
}
