// Machine lines, for the admin. Teams join and leave lines on their own phones; this page is for
// the two things only an admin does: send a team to the back when it is not at the machine for
// its turn, or take it off the line altogether.

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { linesView, nightStatus, type LineView } from '../../sample/league';
import { sample } from '../../sample/slice';
import { clock, ordinal } from '../../sample/time';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import MachineArt from '../../ui/MachineArt';
import Page from '../../ui/Page';
import Tag from '../../ui/Tag';
import TeamAvatar from '../../ui/TeamAvatar';
import { ADMIN_HOME, NightClosed } from './nightShared';

const TITLE = 'Machine lines';

/** PLAYING, NEXT, 3RD, 4TH... (the Tag makes it capitals) */
const place = (index: number) => (index === 0 ? 'Playing' : index === 1 ? 'Next' : ordinal(index + 1));

export default function AdminLines() {
  const league = useLeague();
  const night = nightStatus(league);
  const lines = linesView(league);

  if (!night.open) {
    return (
      <Page title={TITLE} back={ADMIN_HOME}>
        <NightClosed week={night.week.week}>Lines only run during league night. They were emptied when the night closed.</NightClosed>
      </Page>
    );
  }

  return (
    <Page title={TITLE} subtitle="Send a team to the back if they are not at the machine, or take them off the line." back={ADMIN_HOME}>
      {lines.length === 0 ? (
        <EmptyNote>No machines are picked for tonight.</EmptyNote>
      ) : (
        <Stack spacing={2}>
          {lines.map((line) => (
            <LineCard key={line.machine.machineId} line={line} />
          ))}
          <Typography variant="body2" color="textSecondary">
            A team leaves a line on its own when it submits a score on that machine.
          </Typography>
        </Stack>
      )}
    </Page>
  );
}

function LineCard({ line }: { line: LineView }) {
  const dispatch = useAppDispatch();
  const { machine, teams, out } = line;
  const machineId = machine.machineId;

  return (
    <Card component="section" aria-label={`${machine.name} line`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
        <MachineArt machine={machine} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h4" component="h3">
            {machine.name}
          </Typography>
          {!out && (
            <Typography variant="body2" color="textSecondary">
              {teams.length === 0 ? 'Nobody in line.' : `${teams.length} in line`}
            </Typography>
          )}
        </Box>
        {out && <Tag tone="bad">Out tonight</Tag>}
      </Box>

      {out && (
        <Typography variant="body2" color="textSecondary" sx={{ px: 2, pb: 1.5 }}>
          Out since {clock(out.at)}: {out.reason}. An out machine has no line.
        </Typography>
      )}

      {teams.map((t, i) => (
        // On a phone the two buttons get their own full-width row, so they are big and never
        // squeeze the team name. From tablet size up they sit at the end of the row.
        <Box key={t.teamId} sx={{ display: 'flex', flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'center', gap: 1.25, px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <TeamAvatar team={t} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Tag tone={i === 0 ? 'live' : i === 1 ? 'good' : 'plain'}>{place(i)}</Tag>
            <Typography sx={{ fontWeight: 700, mt: 0.25 }}>{t.teamName}</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
            {/* Sending the last team to the back would change nothing, so the button is left out. */}
            {i < teams.length - 1 && (
              <Button
                variant="outlined"
                aria-label={`Send ${t.teamName} to the back of the ${machine.name} line`}
                onClick={() => {
                  dispatch(sample.lineToBack({ machineId, teamId: t.teamId }));
                  dispatch(showToast(`Sent ${t.teamName} to the back of the ${machine.name} line`));
                }}
                sx={{ minHeight: 44, flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap' }}
              >
                To the back
              </Button>
            )}
            <Button
              variant="outlined"
              color="secondary"
              aria-label={`Remove ${t.teamName} from the ${machine.name} line`}
              onClick={() => {
                dispatch(sample.lineRemove({ machineId, teamId: t.teamId }));
                dispatch(showToast(`Took ${t.teamName} off the ${machine.name} line`));
              }}
              sx={{ minHeight: 44, flex: { xs: 1, sm: 'none' } }}
            >
              Remove
            </Button>
          </Stack>
        </Box>
      ))}
    </Card>
  );
}
