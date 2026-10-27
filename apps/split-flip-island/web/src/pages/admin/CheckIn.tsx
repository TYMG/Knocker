// Check in teams: used at the door as teams arrive. One tap per team. Teams that have not shown
// up are listed first because they are the ones the admin is looking for; checked-in teams sit
// below with the time and an Undo for a tap on the wrong row.

import Button from '@mui/material/Button';
import { playersLine } from '../../ui/players';
import Stack from '@mui/material/Stack';
import { useAppDispatch, useLeague } from '../../hooks';
import { nightStatus, teamsIn } from '../../sample/league';
import { sample } from '../../sample/slice';
import { clock } from '../../sample/time';
import type { STeam } from '../../sample/types';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import { Row, RowCard, RowText } from '../../ui/Rows';
import Section from '../../ui/Section';
import TeamAvatar from '../../ui/TeamAvatar';
import { ADMIN_HOME, NightClosed } from './nightShared';
import { checkInWindow } from '../../sample/league';

/** First names help the admin match a face to a team at the door. */
const players = (team: STeam) => playersLine(team);

export default function CheckIn() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const night = nightStatus(league);
  // Only teams that count this week. A team approved tonight starts next week.
  const teams = teamsIn(league, night.week.week);
  const here = teams.filter((t) => league.checkIns[t.teamId]).sort((a, b) => (league.checkIns[a.teamId]! < league.checkIns[b.teamId]! ? 1 : -1)); // newest first
  const requests = league.checkInRequests ?? {};
  // Teams that tapped "I'm here" in the app, oldest first: they have been waiting longest.
  const waiting = teams.filter((t) => !league.checkIns[t.teamId] && requests[t.teamId]).sort((a, b) => (requests[a.teamId]! < requests[b.teamId]! ? -1 : 1));
  const missing = teams.filter((t) => !league.checkIns[t.teamId] && !requests[t.teamId]).sort((a, b) => a.teamName.localeCompare(b.teamName));

  const win = checkInWindow(league);
  if (!night.open && !win.open) {
    return (
      <Page title="Check in teams" back={ADMIN_HOME}>
        <NightClosed week={night.week.week}>Teams are checked in only while a league night is open.</NightClosed>
      </Page>
    );
  }

  const tonightSubs = (league.subs ?? []).filter((x) => x.week === night.week.week);
  const summary = !night.open ? `The night opens in ${win.minutesToOpen} minutes. Teams can check in now.` : teams.length === 0 ? 'No teams are in the league this week.' : missing.length === 0 ? `All ${teams.length} teams are here` : `${here.length} of ${teams.length} teams are here`;

  return (
    <Page title="Check in teams" subtitle={summary} back={ADMIN_HOME}>
      <Stack spacing={3}>
        {waiting.length > 0 && (
          <Section small title="Says they're here" aside={waiting.length}>
            <RowCard>
              {waiting.map((t) => (
                <Row key={t.teamId} sx={{ py: 1.5 }}>
                  <TeamAvatar team={t} size={44} />
                  <RowText
                    primary={t.teamName}
                    secondary={(() => {
                      const sub = league.pendingSubs?.[t.teamId]?.[0];
                      const base = `${players(t)}. Tapped "I'm here" at ${clock(requests[t.teamId]!)}`;
                      return sub ? `${base}. Sub: ${sub.subName} in for ${t.players[sub.outPlayer]} (their one sub this season)` : base;
                    })()}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <Button
                      aria-label={`${t.teamName} is not here`}
                      onClick={() => {
                        dispatch(sample.declineCheckIn(t.teamId));
                        dispatch(showToast(`${t.teamName} can tap "I'm here" again when they arrive`));
                      }}
                      sx={{ minHeight: 44 }}
                    >
                      Not here
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      aria-label={`Confirm ${t.teamName} is here`}
                      onClick={() => {
                        dispatch(sample.checkIn(t.teamId));
                        dispatch(showToast(`Checked in ${t.teamName}`));
                      }}
                      sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
                    >
                      Confirm
                    </Button>
                  </Stack>
                </Row>
              ))}
            </RowCard>
          </Section>
        )}

        <Section small title="Not here yet" aside={missing.length || undefined}>
          {missing.length === 0 ? (
            <EmptyNote>{teams.length === 0 ? 'Nobody to check in.' : waiting.length ? 'Everyone else is here or waiting above.' : 'Everyone is here.'}</EmptyNote>
          ) : (
            <RowCard>
              {missing.map((t) => (
                <Row key={t.teamId} sx={{ py: 1.5 }}>
                  <TeamAvatar team={t} size={44} />
                  <RowText primary={t.teamName} secondary={players(t)} />
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    aria-label={`Check in ${t.teamName}`}
                    onClick={() => {
                      dispatch(sample.checkIn(t.teamId));
                      dispatch(showToast(`Checked in ${t.teamName}`));
                    }}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    Check in
                  </Button>
                </Row>
              ))}
            </RowCard>
          )}
        </Section>

        <Section small title="Checked in" aside={here.length || undefined}>
          {here.length === 0 ? (
            <EmptyNote>Nobody is checked in yet.</EmptyNote>
          ) : (
            <RowCard>
              {here.map((t) => (
                <Row key={t.teamId}>
                  <TeamAvatar team={t} />
                  <RowText
                    primary={t.teamName}
                    secondary={(() => {
                      const sub = tonightSubs.find((x) => x.teamId === t.teamId);
                      return `Checked in at ${clock(league.checkIns[t.teamId]!)}${sub ? `. Sub: ${sub.subName} in for ${t.players[sub.outPlayer]}` : ''}`;
                    })()}
                  />
                  <Button
                    aria-label={`Undo check-in for ${t.teamName}`}
                    onClick={() => {
                      dispatch(sample.undoCheckIn(t.teamId));
                      dispatch(showToast(`${t.teamName} is no longer checked in`));
                    }}
                    sx={{ flexShrink: 0, minHeight: 44 }}
                  >
                    Undo
                  </Button>
                </Row>
              ))}
            </RowCard>
          )}
        </Section>
      </Stack>
    </Page>
  );
}
