import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { resizeImage } from '../lib/photos';

export interface PickedPhoto {
  source: 'camera' | 'library';
  /** The photo, shrunk, as an image address. Undefined when the drawn stand-in is used. */
  photo?: string;
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * "Take a photo" and "Choose from library", with a preview. On a phone the first opens the camera.
 * The photo never leaves the browser. "Use a sample photo" skips the camera and shows `standIn`,
 * a drawn picture, so the flow can be tried on a computer.
 */
export default function PhotoPicker({
  value, onChange, standIn, hint, facing = 'environment'
}: {
  value: PickedPhoto | null;
  onChange: (value: PickedPhoto | null) => void;
  /** Image address shown when there is no real photo. */
  standIn: string;
  hint: string;
  facing?: 'environment' | 'user';
}) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function picked(file: File | undefined, source: 'camera' | 'library') {
    if (!file) return;
    setError(null);
    try {
      onChange({ source, photo: await toDataUrl(await resizeImage(file, 720, 0.7)) });
    } catch {
      setError("Couldn't read that photo. Try another one.");
    }
  }

  return (
    <Box>
      <input ref={camera} type="file" accept="image/*" capture={facing} hidden onChange={(e) => picked(e.target.files?.[0], 'camera')} />
      <input ref={library} type="file" accept="image/*" hidden onChange={(e) => picked(e.target.files?.[0], 'library')} />
      {value ? (
        <Box sx={{ position: 'relative' }}>
          <Box component="img" src={value.photo ?? standIn} alt="Your photo" sx={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 2, display: 'block', border: 1, borderColor: 'divider' }} />
          <Button size="small" variant="contained" color="inherit" onClick={() => onChange(null)} sx={{ position: 'absolute', right: 8, bottom: 8, color: 'common.black', bgcolor: 'common.white' }}>
            Change
          </Button>
        </Box>
      ) : (
        <Stack direction="row" spacing={1.5}>
          <Button fullWidth size="large" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => camera.current?.click()} sx={{ py: 2 }}>
            Take a photo
          </Button>
          <Button fullWidth size="large" variant="outlined" startIcon={<PhotoLibraryIcon />} onClick={() => library.current?.click()} sx={{ py: 2 }}>
            Choose from library
          </Button>
        </Stack>
      )}
      <Typography variant="body2" color={error ? 'secondary.main' : 'text.secondary'} sx={{ mt: 1 }}>
        {error ?? hint}{' '}
        {!value && (
          <Link component="button" type="button" onClick={() => onChange({ source: 'camera' })} sx={{ verticalAlign: 'baseline' }}>
            Use a sample photo
          </Link>
        )}
      </Typography>
    </Box>
  );
}
