import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

/**
 * The frame every page sits in: an optional back link, the page title, an optional line under
 * it, then the page's content. Phone pages use the default width; tables for big screens use "wide".
 */
export default function Page({
  title, subtitle, back, width = 'phone', action, children
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  width?: 'phone' | 'wide';
  /** A small control shown to the right of the title. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ maxWidth: width === 'wide' ? 1100 : 560, mx: 'auto' }}>
      {back && (
        <Link component={RouterLink} to={back.to} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', ml: -0.75, mb: 1.5, fontWeight: 700 }}>
          <ChevronLeftIcon fontSize="small" />
          {back.label}
        </Link>
      )}
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: subtitle ? 0.5 : 2.5 }}>
          <Typography variant="h2" sx={{ flexGrow: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
          {action}
        </Box>
      )}
      {subtitle && (
        <Typography color="textSecondary" sx={{ mb: 2.5 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}
