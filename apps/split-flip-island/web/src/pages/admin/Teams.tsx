// Admin: every team in the league. Three jobs, in the order an admin needs them:
//   1. Approve or remove new sign-ups. A sign-up nobody approves is deleted after 24 hours, so
//      these come first whenever there are any, soonest to run out at the top.
//   2. Find a team and open it.
//   3. The way to the solo players' waitlist (its own page, Waitlist.tsx).

import { useState } from 'react';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import { useLeague } from '../../hooks';
import { approvedTeams, currentWeek, nightStatus, pendingTeams, scoreCounts, FORFEIT_LIMIT, forfeitCounts, NO_SHOW_LIMIT, noShowCount, withdrawnTeams } from '../../sample/league';
import type { SampleState, STeam } from '../../sample/types';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import { Row, RowCard, RowText } from '../../ui/Rows';
import Section from '../../ui/Section';
import TeamAvatar from '../../ui/TeamAvatar';
import { ApprovalCard, count, focusRing } from './seasonParts';

/** The quiet notes under a team's name. `alert` marks the one that needs the admin to do something. */
function teamNotes(league: SampleState, team: STeam): { text: string; alert?: boolean }[] {
  const week = currentWeek(league);
  const notes: { text: string; alert?: boolean }[] = [];
  const toLookAt = scoreCounts(league, week.week, team.teamId).flagged;
  if (toLookAt > 0) notes.push({ text: `${toLookAt} to look at`, alert: true });
  if (team.eliminated) notes.push({ text: `Out of the running (week ${team.eliminated.week})`, alert: true });
  else if (noShowCount(league, team.teamId) > 0) notes.push({ text: `${noShowCount(league, team.teamId)} of ${NO_SHOW_LIMIT} no-shows` });
  const forfeits = forfeitCounts(league, team.teamId);
  if (forfeits.season >= FORFEIT_LIMIT) notes.push({ text: `${forfeits.season} forfeits: penalty to decide`, alert: true });
  else if (forfeits.season > 0) notes.push({ text: `${forfeits.season} ${forfeits.season === 1 ? 'forfeit' : 'forfeits'} this season` });
  if (team.firstWeek > week.week) notes.push({ text: team.firstWeek <= 8 ? `Starts in week ${team.firstWeek}` : 'Starts after this season' });
  // A team that has not started yet is not expected tonight, so it is never "not here".
  else if (nightStatus(league).open && !league.checkIns[team.teamId]) notes.push({ text: 'Not here tonight' });
  return notes;
}

export default function Teams() {
  const league = useLeague();
  const [find, setFind] = useState('');

  const approved = approvedTeams(league);
  // Soonest to be deleted first.
  const pending = [...pendingTeams(league)].sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  const waitlist = [...league.waitlist].sort((a, b) => a.at.localeCompare(b.at));

  const wanted = find.trim().toLowerCase();
  const shown = wanted ? approved.filter((t) => t.teamName.toLowerCase().includes(wanted)) : approved;

  const over = approved.length - league.teamCap;
  const summary = [
    over > 0 ? `${count(approved.length, 'team')}, ${over} over the limit of ${league.teamCap}.` : `${approved.length} of ${league.teamCap} spots filled.`,
    pending.length > 0 ? `${pending.length} waiting for approval.` : '',
    waitlist.length > 0 ? `${waitlist.length} on the waitlist.` : ''
  ].filter(Boolean).join(' ');

  return (
    <Page title="Teams" subtitle={summary} back={{ to: '/admin', label: 'Admin home' }}>
      <Stack spacing={4}>
        {pending.length > 0 && (
          <Section title="Waiting for approval" aside={pending.length}>
            <Typography color="textSecondary" sx={{ mb: 1.5 }}>
              Check the photo, then approve or remove. A sign-up nobody approves within 24 hours is deleted on its own.
            </Typography>
            <Stack spacing={1.5}>
              {pending.map((team) => (
                <ApprovalCard key={team.teamId} team={team} />
              ))}
            </Stack>
          </Section>
        )}

        <Section title="In the league" aside={count(approved.length, 'team')}>
          <TextField
            label="Find a team"
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            autoComplete="off"
            sx={{ mt: 0.5, mb: 1.5 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }
            }}
          />
          {approved.length === 0 ? (
            <EmptyNote>No teams yet.</EmptyNote>
          ) : shown.length === 0 ? (
            <EmptyNote>No team matches.</EmptyNote>
          ) : (
            <RowCard>
              {shown.map((team) => {
                const notes = teamNotes(league, team);
                return (
                  <Row key={team.teamId} to={`/admin/teams/${team.teamId}`} sx={{ minHeight: 60, ...focusRing }}>
                    <TeamAvatar team={team} size={40} />
                    <RowText
                      primary={team.teamName}
                      secondary={
                        notes.length > 0 &&
                        notes.map((note, i) => (
                          <Box key={note.text} component="span" sx={note.alert ? { color: 'secondary.main', fontWeight: 700 } : undefined}>
                            {i > 0 && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>{' · '}</Box>}
                            {note.text}
                          </Box>
                        ))
                      }
                    />
                    <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  </Row>
                );
              })}
            </RowCard>
          )}
        </Section>

        {withdrawnTeams(league).length > 0 && (
          <Section title="Withdrawn" aside={withdrawnTeams(league).length}>
            <RowCard>
              {withdrawnTeams(league).map((team) => (
                <Row key={team.teamId} to={`/admin/teams/${team.teamId}`} sx={{ minHeight: 60, ...focusRing }}>
                  <TeamAvatar team={team} size={40} />
                  <RowText primary={team.teamName} secondary={`Withdrawn in week ${team.withdrawn?.week ?? '?'}. Their scores no longer count.`} />
                </Row>
              ))}
            </RowCard>
          </Section>
        )}

        <Section title="Waitlist" aside={waitlist.length > 0 ? waitlist.length : undefined}>
          <RowCard>
            <Row to="/admin/waitlist" sx={{ minHeight: 60 }}>
              <RowText primary="Solo players" secondary={waitlist.length === 0 ? 'Nobody waiting' : `${waitlist.length} waiting for a partner. Suggested pairs, answers and Pair up.`} />
              <ChevronRightIcon sx={{ color: 'text.secondary' }} />
            </Row>
          </RowCard>
        </Section>
      </Stack>
    </Page>
  );
}
