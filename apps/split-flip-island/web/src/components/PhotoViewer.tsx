import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export default function PhotoViewer({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!src} onClose={onClose} maxWidth="md" fullWidth>
      <IconButton aria-label="Close photo" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper' }}>
        <CloseIcon />
      </IconButton>
      {src && <Box component="img" src={src} alt="Score photo" sx={{ width: '100%', display: 'block' }} />}
    </Dialog>
  );
}
