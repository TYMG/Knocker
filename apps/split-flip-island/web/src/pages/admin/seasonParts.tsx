// Pieces shared by the "Running the season" admin pages (Teams, TeamDetail, Weeks, WeekDetail,
// Machines). They live here, next to those pages, because no other page needs them.
//
// A note on quiet text: in this version of MUI, <Typography color="textSecondary"> is the spelling
// that works. color="text.secondary" is ignored without any warning. Inside sx, 'text.secondary' is right.

import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PhoneIcon from '@mui/icons-material/Phone';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAppDispatch, useLeague } from '../../hooks';
import { approvedTeams, checkLabel, currentWeek } from '../../sample/league';
import { sample } from '../../sample/slice';
import { ago, minutesBetween, until } from '../../sample/time';
import type { SScore, STeam } from '../../sample/types';
import { showToast } from '../../store';
import PhotoViewer from '../../ui/PhotoViewer';
import ReasonDialog from '../../ui/ReasonDialog';
import ScoreDisplay from '../../ui/ScoreDisplay';
import ScorePhoto from '../../ui/ScorePhoto';
import { formatScore } from '../../lib/format';

/** MUI's bare buttons and links draw no focus ring of their own, so keyboard users get this one. */
export const focusRing = { '&.Mui-focusVisible, &:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } } as const;

/** "3 teams", "1 team" */
export const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** "Venom", "Venom and Jaws", "Venom, Jaws and Godzilla" */
export const listOf = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// ---- Phone numbers ----

/** "(202) 555-0140" -> "tel:+12025550140", so tapping the number starts a call. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits.length === 10 ? `+1${digits}` : digits}`;
}

/** Both players' numbers, each a link that starts a call. Admins only: never put this on a public page. */
export function PhoneLinks({ team }: { team: STeam }) {
  const numbers = [
    { name: team.players[0], phone: team.phone1 },
    { name: team.players[1], phone: team.phone2 }
  ].filter((n) => n.phone);
  if (numbers.length === 0) return <Typography color="textSecondary">No phone numbers on file.</Typography>;
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 1, rowGap: 0.5 }}>
      {numbers.map((n) => (
        <Button key={n.phone} component="a" href={telHref(n.phone)} startIcon={<PhoneIcon />} aria-label={`Call ${n.name || 'player'} at ${n.phone}`} sx={{ minHeight: 44, px: 1, ml: -1, whiteSpace: 'nowrap' }}>
          {n.name ? `${n.name}: ` : ''}
          {n.phone}
        </Button>
      ))}
    </Stack>
  );
}

// ---- A score's status ----

type StatusKind = 'look' | 'checked' | 'voided' | 'unchecked';

export const statusKind = (x: SScore): StatusKind => (x.status === 'voided' ? 'voided' : x.check === 'flagged' ? 'look' : x.check === 'checked' ? 'checked' : 'unchecked');

/** checkLabel without the reason after the colon: "Needs a look", "Checked by Matt", "Not checked", "Voided". */
export const shortCheckLabel = (x: SScore) => checkLabel(x).split(':')[0]!;

/**
 * A score's status in words, colored by state: needs a look in coral, checked in lime, voided
 * dimmed. The words carry the meaning; the color only makes a long list quicker to scan.
 */
export function CheckStatus({ score, short }: { score: SScore; short?: boolean }) {
  const kind = statusKind(score);
  const color = { look: 'secondary.main', checked: 'primary.main', voided: 'text.secondary', unchecked: 'text.secondary' }[kind];
  return (
    <Typography component="span" variant="body2" sx={{ color, fontWeight: kind === 'look' ? 700 : 400, opacity: kind === 'voided' ? 0.8 : 1 }}>
      {short ? shortCheckLabel(score) : checkLabel(score)}
    </Typography>
  );
}

/** The amber score. A voided score gets a line through it and is dimmed. */
export function ScoreValue({ score }: { score: SScore }) {
  if (score.status !== 'voided') return <ScoreDisplay value={score.score} size="sm" />;
  return (
    // The amber display is a box, so a text strike-through would not reach it. This draws the line across the box.
    <Box sx={{ position: 'relative', display: 'inline-flex', opacity: 0.6, '&::after': { content: '""', position: 'absolute', left: 6, right: 6, top: '50%', borderTop: '2px solid', borderColor: 'text.primary' } }}>
      <ScoreDisplay value={score.score} size="sm" label={`Voided score ${formatScore(score.score)}`} />
    </Box>
  );
}

/**
 * One score in an admin list. The photo opens full size; the rest of the row opens the score's
 * page. They are two separate targets side by side, so neither is a button inside a link.
 */
export function ScoreRow({ score, machineName, teamName, primary, meta, shortStatus }: { score: SScore; machineName: string; teamName: string; primary: ReactNode; meta?: ReactNode; shortStatus?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'stretch', '& + &': { borderTop: 1, borderColor: 'divider' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', pl: 2, py: 1.25, opacity: score.status === 'voided' ? 0.6 : 1 }}>
        <ScorePhoto score={score} machineName={machineName} teamName={teamName} />
      </Box>
      <ButtonBase
        component={RouterLink}
        to={`/admin/scores/${score.scoreId}`}
        sx={{ flexGrow: 1, minWidth: 0, minHeight: 68, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: 1.25, rowGap: 0.25, alignItems: 'center', textAlign: 'left', pl: 1.5, pr: 2, py: 1.25, ...focusRing }}
      >
        <Typography component="span" sx={{ minWidth: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>
          {primary}
        </Typography>
        <ScoreValue score={score} />
        {/* The second line runs under the score too, so a long reason has the full width. */}
        <Box sx={{ gridColumn: '1 / -1', minWidth: 0, lineHeight: 1.35 }}>
          {meta && (
            <Typography component="span" variant="body2" color="textSecondary" sx={{ whiteSpace: 'nowrap', mr: 1 }}>
              {meta}
            </Typography>
          )}
          <CheckStatus score={score} short={shortStatus} />
        </Box>
      </ButtonBase>
    </Box>
  );
}

// ---- A sign-up waiting for approval ----

/**
 * A new team waiting for an admin. Approving is a judgement call about the photo and the two
 * phone numbers, so both are shown large. A sign-up nobody approves is deleted after 24 hours;
 * the card says how long is left and turns coral in the last hour.
 */
export function ApprovalCard({ team, onRemoved }: { team: STeam; onRemoved?: () => void }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const minutesLeft = team.expiresAt ? minutesBetween(league.now, team.expiresAt) : undefined;
  const urgent = minutesLeft !== undefined && minutesLeft < 60;
  const teamsAfter = approvedTeams(league).length + 1;
  const over = teamsAfter - league.teamCap;
  // The same rule the approve action uses: a new team starts the week after the current one.
  const firstWeek = currentWeek(league).week + 1;

  const approve = () => {
    dispatch(sample.approveTeam(team.teamId));
    const starts = firstWeek <= 8 ? `They start next week, week ${firstWeek}.` : 'They start next week.';
    dispatch(showToast(`Approved ${team.teamName}. ${starts}${over > 0 ? ` The league is now ${over} over its limit of ${league.teamCap}.` : ''}`));
  };

  return (
    <Card sx={{ p: 2, ...(urgent && { borderColor: 'secondary.main', borderLeftWidth: 5 }) }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <ButtonBase onClick={() => setPhotoOpen(true)} aria-label={`View ${team.teamName}'s team photo full size`} sx={{ borderRadius: 2, flexShrink: 0, ...focusRing }}>
          <Box component="img" src={team.photo} alt="" sx={{ width: { xs: 112, sm: 144 }, height: { xs: 112, sm: 144 }, objectFit: 'cover', borderRadius: 2, display: 'block', border: 1, borderColor: 'divider' }} />
        </ButtonBase>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h4" component="h4" sx={{ overflowWrap: 'anywhere' }}>
            {team.teamName}
          </Typography>
          <Typography color="textSecondary">{listOf(team.players.filter(Boolean))}</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Signed up
          </Typography>
          <Typography sx={{ fontWeight: 700 }}>{ago(team.createdAt, league.now)}</Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 1 }}>
        <PhoneLinks team={team} />
      </Box>

      {team.expiresAt && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: urgent ? 'secondary.main' : 'text.primary' }}>
          {urgent && <WarningAmberIcon fontSize="small" />}
          <Typography sx={{ fontWeight: urgent ? 700 : 400 }}>
            Deleted if not approved <b>{until(team.expiresAt, league.now)}</b>
          </Typography>
        </Box>
      )}

      {over > 0 && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          The league holds {league.teamCap} teams. Approving this one makes {teamsAfter}, which is {over} over the limit. You can still approve it.
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="contained" color="secondary" size="large" onClick={approve} aria-label={`Approve ${team.teamName}`} sx={{ flex: 2 }}>
          Approve
        </Button>
        <Button variant="outlined" size="large" onClick={() => setRemoving(true)} aria-label={`Remove ${team.teamName}`} sx={{ flex: 1 }}>
          Remove
        </Button>
      </Stack>

      <PhotoViewer src={photoOpen ? team.photo : null} onClose={() => setPhotoOpen(false)} alt={`${team.teamName} team photo`} />
      <ReasonDialog
        open={removing}
        title="Remove this sign-up?"
        body={`This deletes the sign-up for ${team.teamName}. They can sign up again.`}
        confirmLabel="Remove"
        onClose={() => setRemoving(false)}
        onConfirm={(reason) => {
          setRemoving(false);
          dispatch(sample.removeSignUp({ teamId: team.teamId, reason }));
          dispatch(showToast(`Removed the sign-up for ${team.teamName}.`));
          onRemoved?.();
        }}
      />
    </Card>
  );
}
