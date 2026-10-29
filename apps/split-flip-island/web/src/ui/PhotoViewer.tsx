import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export default function PhotoViewer({ src, onClose, alt = 'Score photo', onReport }: { src: string | null; onClose: () => void; alt?: string; onReport?: () => void }) {
  return (
    <Dialog open={!!src} onClose={onClose} maxWidth="md" fullWidth>
      <IconButton aria-label="Close photo" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper' }}>
        <CloseIcon />
      </IconButton>
      {src && <Box component="img" src={src} alt={alt} sx={{ width: '100%', display: 'block' }} />}
      {src && onReport && (
        <Box sx={{ p: 1, textAlign: 'right' }}>
          <Button size="small" color="inherit" onClick={onReport} sx={{ color: 'text.secondary' }}>Report this photo</Button>
        </Box>
      )}
    </Dialog>
  );
}
