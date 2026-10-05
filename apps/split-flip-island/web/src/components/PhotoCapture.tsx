import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

/** Opens the phone camera directly and shows a preview of the shot. */
export default function PhotoCapture({
  file, onChange, label, hint, facing = 'environment'
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label: string;
  hint: string;
  facing?: 'environment' | 'user';
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Box>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture={facing}
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <Box sx={{ position: 'relative' }}>
          <Box component="img" src={preview} alt="" sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 2, display: 'block' }} />
          <Button size="small" variant="contained" color="inherit" onClick={() => input.current?.click()} sx={{ position: 'absolute', right: 8, bottom: 8 }}>
            Retake
          </Button>
        </Box>
      ) : (
        <Button
          fullWidth
          size="large"
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          onClick={() => input.current?.click()}
          sx={{ py: 3, borderStyle: 'dashed', borderWidth: 2, '&:hover': { borderWidth: 2, borderStyle: 'dashed' } }}
        >
          {label}
        </Button>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {hint}
      </Typography>
    </Box>
  );
}
