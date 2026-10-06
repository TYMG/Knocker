import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * Asks an admin to confirm something and say why. The reason goes in the public league log, so
 * the confirm button stays off until one is typed (unless `optional`).
 */
export default function ReasonDialog({
  open, title, body, confirmLabel, label = 'Reason, shown in the public log', optional, onConfirm, onClose
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  label?: string;
  optional?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {body && <Typography sx={{ mb: 2 }}>{body}</Typography>}
        <TextField autoFocus label={label} value={reason} onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="secondary" disabled={!optional && reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
