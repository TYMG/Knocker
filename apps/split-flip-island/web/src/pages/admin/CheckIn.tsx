// Check in teams: used at the door as teams arrive. One tap per team. Teams that have not shown
// up are listed first because they are the ones the admin is looking for; checked-in teams sit
// below with the time and an Undo for a tap on the wrong row.

import Button from '@mui/material/Button';
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

/** First names help the admin match a face to a team at the door. */
const players = (team: STeam) => team.players.filter(Boolean).join(' and ');

export default function CheckIn() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const night = nightStatus(league);
  // Only teams that count this week. A team approved tonight starts next week.
  const teams = teamsIn(league, night.week.week);
  const here = teams.filter((t) => league.checkIns[t.teamId]).sort((a, b) => (league.checkIns[a.teamId]! < league.checkIns[b.teamId]! ? 1 : -1)); // newest first
  const missing = teams.filter((t) => !league.checkIns[t.teamId]).sort((a, b) => a.teamName.localeCompare(b.teamName));

  if (!night.open) {
    return (
      <Page title="Check in teams" back={ADMIN_HOME}>
        <NightClosed week={night.week.week}>Teams are checked in only while a league night is open.</NightClosed>
      </Page>
    );
  }

  const summary = teams.length === 0 ? 'No teams are in the league this week.' : missing.length === 0 ? `All ${teams.length} teams are here` : `${here.length} of ${teams.length} teams are here`;

  return (
    <Page title="Check in teams" subtitle={summary} back={ADMIN_HOME}>
      <Stack spacing={3}>
        <Section small title="Not here yet" aside={missing.length || undefined}>
          {missing.length === 0 ? (
            <EmptyNote>{teams.length === 0 ? 'Nobody to check in.' : 'Everyone is here.'}</EmptyNote>
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
                  <RowText primary={t.teamName} secondary={`Checked in at ${clock(league.checkIns[t.teamId]!)}`} />
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
