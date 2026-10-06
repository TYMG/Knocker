import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PhotoViewer from '../../components/PhotoViewer';
import { errorMessage, isSignedOut, useAdminTeamsQuery, useApproveTeamMutation, useRemoveTeamMutation } from '../../api';
import { useAppDispatch } from '../../hooks';
import { formatPhone, timeAgo, timeUntil } from '../../lib/format';
import { adminLoggedOut } from '../../store';
import type { AdminTeam } from '../../../../shared/types';

function Phones({ team }: { team: AdminTeam }) {
  return (
    <Typography variant="body2">
      {[team.phone1, team.phone2].filter(Boolean).map((phone, i) => (
        <Box component="span" key={phone} sx={{ display: 'block' }}>
          Player {i + 1}:{' '}
          <Link href={`sms:${phone}`} sx={{ display: 'inline-block', py: 0.5 }}>
            {formatPhone(phone)}
          </Link>
        </Box>
      ))}
    </Typography>
  );
}

export default function AdminTeams() {
  const { data, error, isLoading } = useAdminTeamsQuery(undefined, { pollingInterval: 30000 });
  const [approve] = useApproveTeamMutation();
  const [remove] = useRemoveTeamMutation();
  // Teams with an approve or remove in flight. A set, so finishing one never re-enables another.
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AdminTeam | null>(null);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const signedOut = isSignedOut(error);

  useEffect(() => {
    if (signedOut) dispatch(adminLoggedOut());
  }, [signedOut, dispatch]);

  async function run(teamId: string, action: () => Promise<unknown>) {
    if (busy.has(teamId)) return false;
    setBusy((ids) => new Set(ids).add(teamId));
    setActionError(null);
    try {
      await action();
      return true;
    } catch (err) {
      if (isSignedOut(err)) dispatch(adminLoggedOut());
      else setActionError(errorMessage(err));
      return false;
    } finally {
      setBusy((ids) => {
        const next = new Set(ids);
        next.delete(teamId);
        return next;
      });
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    const done = await run(removing.teamId, () => remove({ teamId: removing.teamId, reason }).unwrap());
    if (done) {
      setRemoving(null);
      setReason('');
    }
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Button component={RouterLink} to="/admin" startIcon={<ChevronLeftIcon />} sx={{ ml: -1, mb: 1 }}>
        Admin
      </Button>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Approve teams
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        New teams wait here until an admin approves them. A sign-up nobody approves within {data?.pendingHours ?? 24} hours is
        deleted.
      </Typography>

      {isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />}
      {error && !signedOut && <Alert severity="error">{errorMessage(error)}</Alert>}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {data && (
        <Stack spacing={4}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Waiting for approval ({data.pending.length})
            </Typography>
            {data.pending.length === 0 ? (
              <Typography color="text.secondary">Nobody is waiting. New sign-ups show up here on their own.</Typography>
            ) : (
              <Stack spacing={2}>
                {data.pending.map((team) => (
                  <Card key={team.teamId} sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <Avatar
                        component="button"
                        type="button"
                        aria-label={`Enlarge ${team.teamName}'s team photo`}
                        onClick={() => team.photoUrl && setPhoto(team.photoUrl)}
                        src={team.photoUrl ?? undefined}
                        sx={{ width: 72, height: 72, p: 0, border: 2, borderColor: 'divider', cursor: team.photoUrl ? 'zoom-in' : 'default' }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', overflowWrap: 'anywhere' }}>{team.teamName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Signed up {timeAgo(team.createdAt)}
                          {team.expiresAt ? `. Deleted ${timeUntil(team.expiresAt)} if not approved.` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                    <Phones team={team} />
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        sx={{ flex: 1 }}
                        disabled={busy.has(team.teamId)}
                        onClick={() => run(team.teamId, () => approve(team.teamId).unwrap())}
                      >
                        Approve
                      </Button>
                      <Button variant="outlined" size="large" sx={{ flex: 1 }} disabled={busy.has(team.teamId)} onClick={() => setRemoving(team)}>
                        Remove
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Approved teams ({data.approved.length})
            </Typography>
            {data.approved.length === 0 ? (
              <Typography color="text.secondary">No teams approved yet.</Typography>
            ) : (
              <Card>
                {data.approved.map((team) => (
                  <Stack key={team.teamId} direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 1.25, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
                    <Avatar src={team.photoUrl ?? undefined} alt="" sx={{ width: 40, height: 40 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{team.teamName}</Typography>
                      <Phones team={team} />
                    </Box>
                  </Stack>
                ))}
              </Card>
            )}
          </Box>
        </Stack>
      )}

      <Dialog open={!!removing} onClose={() => setRemoving(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remove {removing?.teamName}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>This deletes the sign-up and its photo. The team can sign up again.</Typography>
          <TextField
            label="Why?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText="Everyone can read this in the league log."
            slotProps={{ htmlInput: { maxLength: 200 } }}
            autoFocus
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoving(null)}>Keep it</Button>
          <Button variant="contained" color="secondary" disabled={reason.trim().length < 3 || (!!removing && busy.has(removing.teamId))} onClick={confirmRemove}>
            Remove sign-up
          </Button>
        </DialogActions>
      </Dialog>

      <PhotoViewer src={photo} onClose={() => setPhoto(null)} alt="Team photo" />
    </Box>
  );
}
