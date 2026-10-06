import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PhotoCapture from '../components/PhotoCapture';
import ScoreDisplay from '../components/ScoreDisplay';
import { errorMessage, useCreateUploadMutation, useMeQuery, useSubmitScoreMutation } from '../api';
import { formatScoreInput } from '../lib/format';
import { resizeImage, uploadPhoto } from '../lib/photos';

export default function Submit() {
  const { data, isLoading, error: loadError } = useMeQuery();
  const [machineId, setMachineId] = useState('');
  const [scoreText, setScoreText] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [createUpload] = useCreateUploadMutation();
  const [submitScore] = useSubmitScoreMutation();

  if (isLoading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;
  if (loadError || !data) return <Alert severity="error">{errorMessage(loadError)}</Alert>;
  if (data.team.status === 'pending') return <Alert severity="info">Your team is waiting for the league to approve it. You can submit scores once it is approved.</Alert>;
  if (!data.night?.open) return <Alert severity="info">Scores can only be submitted during league night.</Alert>;

  const toPlay = data.machines.filter((m) => m.attempts === 0);
  const played = data.machines.filter((m) => m.attempts > 0);
  const machine = data.machines.find((m) => m.machine.machineId === machineId)?.machine;
  const ready = !!machine && !!score && !!photo;

  async function send() {
    if (!machine || !score || !photo) return;
    setBusy(true);
    setError(null);
    try {
      const upload = await createUpload({ purpose: 'score' }).unwrap();
      const [full, thumb] = await Promise.all([resizeImage(photo, 1600), resizeImage(photo, 360, 0.7)]);
      await Promise.all([uploadPhoto(upload.photo, full), uploadPhoto(upload.thumb!, thumb)]);
      await submitScore({ machineId: machine.machineId, score, photoKey: upload.photo.key, thumbKey: upload.thumb!.key }).unwrap();
      setSaved(`Score saved on ${machine.name}`);
      setReviewing(false);
      setMachineId('');
      setScoreText('');
      setScore(null);
      setPhoto(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Submit a score
      </Typography>
      <Stack spacing={2.5}>
        <TextField select label="Machine" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
          {toPlay.length > 0 && <ListSubheader>Still to play</ListSubheader>}
          {toPlay.map((m) => (
            <MenuItem key={m.machine.machineId} value={m.machine.machineId}>
              {m.machine.name}
            </MenuItem>
          ))}
          {played.length > 0 && <ListSubheader>Played tonight</ListSubheader>}
          {played.map((m) => (
            <MenuItem key={m.machine.machineId} value={m.machine.machineId}>
              {m.machine.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Score"
          value={scoreText}
          onChange={(e) => {
            const { display, value } = formatScoreInput(e.target.value);
            setScoreText(display);
            setScore(value);
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
          helperText="Type it exactly as the display shows it."
        />
        <PhotoCapture file={photo} onChange={setPhoto} label="Take a photo of the score" hint="Get the whole score display in the frame. Every score needs one." />
        <Button variant="contained" color="secondary" size="large" disabled={!ready} onClick={() => setReviewing(true)}>
          Review score
        </Button>
      </Stack>

      <Dialog open={reviewing} onClose={() => !busy && setReviewing(false)} fullWidth maxWidth="xs">
        <DialogTitle>Is this right?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{machine?.name}</Typography>
          <ScoreDisplay value={score} size="lg" />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReviewing(false)} disabled={busy}>
            Fix it
          </Button>
          <Button variant="contained" onClick={send} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit score'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!saved} autoHideDuration={4000} onClose={() => setSaved(null)} message={saved} />
    </Box>
  );
}
