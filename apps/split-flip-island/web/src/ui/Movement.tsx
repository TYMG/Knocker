import Typography from '@mui/material/Typography';

/** Places moved: an up arrow, a down arrow, or a dash for no change. `since` finishes the spoken label. */
export default function Movement({ change, since = 'since last week' }: { change: number | undefined; since?: string }) {
  const places = Math.abs(change ?? 0);
  const label = !change ? `No change ${since}` : `${change > 0 ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'} ${since}`;
  return (
    <Typography
      component="span"
      role="img"
      aria-label={label}
      title={label}
      sx={{
        width: 30, flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        color: !change ? 'text.secondary' : change > 0 ? 'primary.main' : 'secondary.main'
      }}
    >
      {!change ? '–' : `${change > 0 ? '▲' : '▼'}${places}`}
    </Typography>
  );
}
