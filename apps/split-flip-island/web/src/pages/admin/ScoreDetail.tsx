// One score, for when it looks wrong. The admin sees the photo next to the number the team typed,
// where the photo came from and when it was taken, then marks it right, corrects it or voids it.
// A correction or a void needs a reason, which goes in the public league log. The page stays put
// after each action so the new status and the history line are visible straight away.

import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { useAppDispatch, useLeague } from '../../hooks';
import { formatScore, formatScoreInput } from '../../lib/format';
import { currentWeek, findScore, machine, team, weekLabel, weekOf } from '../../sample/league';
import { sample } from '../../sample/slice';
import { at, clock, shortDate } from '../../sample/time';
import type { SScore } from '../../sample/types';
import { showToast } from '../../store';
import Page from '../../ui/Page';
import PhotoViewer from '../../ui/PhotoViewer';
import ReasonDialog from '../../ui/ReasonDialog';
import ScoreDisplay from '../../ui/ScoreDisplay';
import { scorePhotoSrc } from '../../ui/ScorePhoto';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';
import { attention, scoreStatus } from './nightShared';

const BACK = { to: '/admin/scores', label: 'Check scores' } as const;

export default function ScoreDetail() {
  const league = useLeague();
  const { scoreId } = useParams();
  const score = findScore(league, scoreId);

  if (!score) {
    return (
      <Page title="Score not found" back={BACK}>
        <Typography color="textSecondary" sx={{ mb: 2 }}>
          There is no score at this address. The link may be old or typed wrong.
        </Typography>
        <Button component={RouterLink} to={BACK.to} variant="outlined" size="large">
          Back to Check scores
        </Button>
      </Page>
    );
  }
  // The key gives each score its own copy of the form, so a half-typed correction never
  // carries over when the address changes to a different score.
  return <Detail key={score.scoreId} score={score} />;
}

function Detail({ score }: { score: SScore }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const who = team(league, score.teamId).teamName;
  const what = machine(league, score.machineId).name;
  const week = weekOf(league, score.week);
  const voided = score.status === 'voided';
  const status = scoreStatus(score);

  const [viewing, setViewing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // The correction starts as the current number: most fixes are one wrong or missing digit.
  const [draft, setDraft] = useState(() => formatScore(score.score));
  const [reason, setReason] = useState('');

  // Times from an earlier week also say the date, so "7:40 PM" is never mistaken for tonight.
  const older = score.week !== currentWeek(league).week;
  const when = (iso: string) => (older && week ? `${shortDate(week.date)}, ${clock(iso)}` : clock(iso));

  const photo = scorePhotoSrc(score, what, 'full');
  const opensAt = week ? at(week.date, league.night.opensAt) : undefined;
  const out = week?.out[score.machineId];

  // The seed and the actions do not record the first number separately, so a correction is
  // recognised by its history line. It only changes the label next to the number.
  const corrected = score.history.some((h) => h.text.startsWith('Changed by'));

  const facts: [string, string][] = [
    ['Photo came from', score.photoSource === 'camera' ? "The phone's camera" : score.photoSource === 'library' ? "The phone's library" : 'No photo, entered by an admin'],
    [
      'Photo was taken',
      score.photoSource === 'none'
        ? 'No photo'
        : score.photoTakenAt
          ? `${when(score.photoTakenAt)}${opensAt && score.photoTakenAt < opensAt ? ', before the night' : ''}`
          : 'Not recorded'
    ],
    [corrected ? 'Corrected to' : score.enteredBy === 'admin' ? 'The admin typed' : 'The team typed', formatScore(score.score)],
    ['Entered by', score.enteredBy === 'admin' ? 'An admin' : 'The team']
  ];

  const next = formatScoreInput(draft).value;
  const reasonOk = reason.trim().length >= 3;
  const canSave = next !== null && next !== score.score && reasonOk;
  const saveHint = next === null ? 'Type the correct score.' : next === score.score ? 'Type a score that is different from the current one.' : !reasonOk ? 'Give a reason to save the correction.' : null;

  return (
    <Page title={`${who} on ${what}`} subtitle={`${weekLabel(score.week)}, submitted at ${when(score.at)}`} back={BACK}>
      <Stack spacing={3}>
        {/* Status first, with the reason the app flagged it. The reason is not repeated in the facts below. */}
        <Box>
          <Tag tone={status.tone}>{status.label}</Tag>
          {score.check === 'flagged' && score.flag && !voided && (
            <Typography sx={attention({ mt: 1 })}>
              {score.flag}
            </Typography>
          )}
          {out && !voided && (
            <Typography color="textSecondary" sx={{ mt: 1 }}>
              {what} went out at {when(out.at)}, so this score does not count.
            </Typography>
          )}
        </Box>

        {/* The photo and the typed number sit together: comparing them is the whole job. */}
        <Box>
          {photo ? (
            <ButtonBase onClick={() => setViewing(true)} aria-label="Open the score photo full size" sx={{ display: 'block', width: '100%', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', position: 'relative' }}>
              <Box component="img" src={photo} alt={`Photo of the ${what} score display`} sx={{ width: '100%', display: 'block' }} />
              <Box sx={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1, bgcolor: 'background.paper', color: 'text.primary', fontSize: '0.8rem', fontWeight: 700 }}>
                <ZoomInIcon fontSize="small" />
                Tap to zoom
              </Box>
            </ButtonBase>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center', border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2, color: 'text.secondary', fontWeight: 700 }}>No photo</Box>
          )}
          <Box sx={{ mt: 1.5 }}>
            <ScoreDisplay value={score.score} size="lg" />
          </Box>
        </Box>

        <Card component="dl" sx={{ m: 0 }}>
          {facts.map(([label, value]) => (
            <Box key={label} sx={{ display: 'grid', gridTemplateColumns: 'minmax(112px, 38%) 1fr', columnGap: 1.5, px: 2, py: 1.25, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
              <Typography component="dt" variant="body2" color="textSecondary" sx={{ pt: '1px' }}>
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Card>

        {voided ? (
          <Alert severity="info">
            <Typography sx={{ fontWeight: 700 }}>This score is voided and does not count.</Typography>
            Reason: {score.reason ?? 'no reason given'}. It stays in the history. Nothing is ever deleted.
          </Alert>
        ) : (
          <>
            {score.check !== 'checked' && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => {
                  dispatch(sample.markChecked(score.scoreId));
                  dispatch(showToast(`Checked ${who}'s ${what} score`));
                }}
              >
                Looks right
              </Button>
            )}

            <Section title="Correct score">
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                <TextField
                  label="What the score should be"
                  value={draft}
                  onChange={(e) => setDraft(formatScoreInput(e.target.value).display)}
                  slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1.2rem' } } }}
                />
                <TextField label="Reason, shown in the public log" value={reason} onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
                <Button variant="outlined" size="large" disabled={!canSave} onClick={() => setConfirming(true)}>
                  Save correction
                </Button>
                {saveHint && (
                  <Typography variant="body2" color="textSecondary">
                    {saveHint}
                  </Typography>
                )}
              </Stack>
            </Section>

            <Box>
              <Button variant="outlined" color="secondary" size="large" fullWidth onClick={() => setVoiding(true)}>
                Void this score
              </Button>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                A voided score stays in the history and stops counting. Nothing is ever deleted.
              </Typography>
            </Box>
          </>
        )}

        <Section title="History of this score">
          <Card component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {score.history.map((h, i) => (
              <Box component="li" key={i} sx={{ px: 2, py: 1.25, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
                <Typography sx={{ overflowWrap: 'anywhere' }}>{h.text}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {when(h.at)}
                </Typography>
              </Box>
            ))}
          </Card>
        </Section>

        <Link component={RouterLink} to={`/admin/teams/${score.teamId}`} underline="hover" sx={{ alignSelf: 'flex-start', py: 1, fontWeight: 700 }}>
          See all of {who}'s scores
        </Link>
      </Stack>

      <PhotoViewer src={viewing && photo ? photo : null} onClose={() => setViewing(false)} alt={`Photo of the ${what} score display`} />

      <ReasonDialog
        open={voiding}
        title={`Void ${who}'s ${what} score?`}
        body={`${formatScore(score.score)} stops counting and the standings change right away. It stays in the history.`}
        confirmLabel="Void it"
        // Worded differently from the correction field on the page, so the two are never confused.
        label="Why void it? Shown in the public log"
        onClose={() => setVoiding(false)}
        onConfirm={(why) => {
          dispatch(sample.voidScore({ scoreId: score.scoreId, reason: why }));
          dispatch(showToast(`Voided ${who}'s ${what} score. It no longer counts.`));
          setVoiding(false);
        }}
      />

      {/* A correction moves the standings, so the admin sees both numbers side by side once more before it is saved. */}
      <Dialog open={confirming} onClose={() => setConfirming(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change this score?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                From
              </Typography>
              <ScoreDisplay value={score.score} size="sm" />
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                To
              </Typography>
              <ScoreDisplay value={next} size="md" />
            </Box>
            <Typography>The standings change right away. The public log will say: "{reason.trim()}"</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              if (next === null) return;
              dispatch(sample.correctScore({ scoreId: score.scoreId, score: next, reason: reason.trim() }));
              dispatch(showToast(`Changed ${who}'s ${what} score to ${formatScore(next)}`));
              setDraft(formatScore(next));
              setReason('');
              setConfirming(false);
            }}
          >
            Change the score
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
