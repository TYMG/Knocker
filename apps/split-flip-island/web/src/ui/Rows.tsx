import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import type { SxProps, Theme } from '@mui/material/styles';

const rowSx = { display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, width: '100%', textAlign: 'left', '& + &': { borderTop: 1, borderColor: 'divider' } } as const;

/** A card holding a list of rows with thin lines between them. Put <Row> elements inside. */
export function RowCard({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return <Card sx={sx}>{children}</Card>;
}

/**
 * One line in a RowCard: things laid out left to right, centered vertically.
 * `to` makes the whole row a link. `mine` tints it (your own team). `dim` fades it (voided, absent).
 */
export function Row({ children, to, mine, dim, sx }: { children: ReactNode; to?: string; mine?: boolean; dim?: boolean; sx?: SxProps<Theme> }) {
  const style = [rowSx, mine ? { bgcolor: 'action.selected' } : null, dim ? { opacity: 0.55 } : null, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])] as SxProps<Theme>;
  if (to) {
    return (
      <ButtonBase component={RouterLink} to={to} sx={style}>
        {children}
      </ButtonBase>
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
