// Message everyone: one short message that shows at the top of every phone and on the bar TV.
// Used when a machine breaks, for last call, or anything the whole room should know. There is
// only ever one message: posting a new one replaces the one showing.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { adminSummary, nightStatus } from '../../sample/league';
import { sample } from '../../sample/slice';
import { addMinutes, clock } from '../../sample/time';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import { ADMIN_HOME } from './nightShared';

const LIMIT = 120;

export default function Message() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const night = nightStatus(league);
  const showing = league.message;

  // One-tap starters. The times and machine names come from tonight's data, so they are never stale.
  const starters = [
    ...(night.open && night.minutesLeft > 15 ? [`Last scores at ${clock(addMinutes(night.closesAt, -15))}.`] : []),
    ...(night.open ? adminSummary(league).machinesOut.map((m) => `${m.name} is down for the night.`) : []),
    'Finals start in 10 minutes.'
  ];

  const post = () => {
    if (!text.trim()) return;
    dispatch(sample.postMessage(text));
    dispatch(showToast(showing ? 'Posted. It replaced the message that was showing.' : 'Posted. It is showing on every phone and the bar TV.'));
    setText('');
  };

  return (
    <Page title="Message everyone" subtitle="Shows at the top of every phone and on the bar TV." back={ADMIN_HOME}>
      <Stack spacing={4}>
        <Stack spacing={1.5}>
          <TextField
            label="New message"
            multiline
            minRows={2}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, LIMIT))}
            slotProps={{ htmlInput: { maxLength: LIMIT } }}
            helperText={
              <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <span>{showing ? 'Posting replaces the message showing now.' : 'Keep it short. One message shows at a time.'}</span>
                <Box component="span" aria-live="polite" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {text.length} of {LIMIT}
                </Box>
              </Box>
            }
          />
          <Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 0.75 }}>
              Or start from one of these:
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {starters.map((s) => (
                <Chip key={s} label={s} variant="outlined" onClick={() => setText(s)} sx={{ height: 44, borderRadius: 999, fontSize: '0.9rem', maxWidth: '100%' }} />
              ))}
            </Stack>
          </Box>
          <Button variant="contained" color="secondary" size="large" disabled={!text.trim()} onClick={post}>
            Post it
          </Button>
        </Stack>

        <Section title="Showing now">
          {showing ? (
            <Card sx={{ p: 2 }}>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{showing.text}</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Posted at {clock(showing.postedAt)} by {showing.by}
              </Typography>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => {
                  dispatch(sample.takeDownMessage());
                  dispatch(showToast('Took the message down'));
                }}
              >
                Take it down
              </Button>
            </Card>
          ) : (
            <EmptyNote>Nothing is showing.</EmptyNote>
          )}
        </Section>
      </Stack>
    </Page>
  );
}
