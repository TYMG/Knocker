import type { ReactNode } from 'react';
import Typography from '@mui/material/Typography';

/** What a list says when it has nothing in it. */
export default function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <Typography color="text.secondary" sx={{ py: 1 }}>
      {children}
    </Typography>
  );
}
