import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import type { SxProps, Theme } from '@mui/material/styles';
import { motion } from 'motion/react';
import { useCalm } from '../hooks';
import { glide } from './motion';

const rowSx = { display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, width: '100%', textAlign: 'left', '& + &': { borderTop: 1, borderColor: 'divider' } } as const;

/** A card holding a list of rows with thin lines between them. Put <Row> elements inside. */
export function RowCard({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return <Card sx={sx}>{children}</Card>;
}

/**
 * One line in a RowCard: things laid out left to right, centered vertically.
 * `to` makes the whole row a link. `mine` tints it (your own team). `dim` fades it (voided, absent).
 */
export function Row({ children, to, mine, dim, sx, arrive, order = 0 }: { children: ReactNode; to?: string; mine?: boolean; dim?: boolean; sx?: SxProps<Theme>; /** How the row first appears: sliding in, or flipping over. */ arrive?: 'slide' | 'flip'; /** Its place in the list, so rows arrive one after another. */ order?: number }) {
  const calm = useCalm();
  const style = [rowSx, mine ? { bgcolor: 'action.selected' } : null, dim ? { opacity: 0.55 } : null, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])] as SxProps<Theme>;
  if (to) {
    return (
      <ButtonBase component={RouterLink} to={to} sx={style}>
        {children}
      </ButtonBase>
    );
  }
  if (arrive && !calm) {
    const from = arrive === 'flip' ? { opacity: 0, rotateX: -90 } : { opacity: 0, y: -10 };
    return (
      <Box
        component={motion.div}
        layout="position"
        initial={from}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ ...(arrive === 'flip' ? { type: 'spring', stiffness: 160, damping: 14 } : glide), delay: Math.min(order, 8) * (arrive === 'flip' ? 0.14 : 0.03) }}
        style={{ transformPerspective: 700, transformOrigin: 'center top' }}
        sx={style}
      >
        {children}
      </Box>
    );
  }
  return <Box sx={style}>{children}</Box>;
}

/** The part of a row that takes the spare width: a bold first line and an optional quieter second line. */
export function RowText({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      <Box sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</Box>
      {secondary && <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{secondary}</Box>}
    </Box>
  );
}
