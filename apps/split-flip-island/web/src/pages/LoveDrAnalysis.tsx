// The Love Dr.'s full analysis: everything the Dr. knows about one team, on one page. Only that
// team can open it. "See the analysis" in the Doctor's orders pop-up lands here.

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMe } from '../hooks';
import Page from '../ui/Page';
import Section from '../ui/Section';
import { DrCheckUp, DrCouple, DrNotes } from './DrParts';
import DrPrescription from './DrPrescription';
import LoveDr from './LoveDr';

const HOW = [
  'I only look at scores everyone in the league can already see.',
  'A status needs a pattern over at least two weeks. One good night is not a soulmate.',
  'Tonight\'s prescription is the machine where a score you have already proven you can get would move you up the most. A machine you have not played tonight always counts, because it is worth nothing until you do.',
  'A long line counts against a machine. In the last 20 minutes, anything you have not played goes to the top.',
  'Nothing I say changes your points or the standings.'
];

export default function LoveDrAnalysis() {
  const me = useMe();
  const teamId = me.team.teamId;
  return (
    <Page title="The Love Dr." subtitle={`The full analysis for ${me.team.teamName}. Only your team sees this.`} back={{ to: '/', label: 'Team home' }}>
      <Stack spacing={4}>
        <Card sx={{ p: 2 }}>
          <DrCouple teamId={teamId} withAdvice />
        </Card>
        <DrPrescription teamId={teamId} />
        <DrNotes teamId={teamId} />
        <LoveDr teamId={teamId} full />
        <DrCheckUp teamId={teamId} />
        <Section title="How the Dr. decides">
          <Card sx={{ p: 2 }}>
            <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5 }}>
              {HOW.map((line) => (
                <Typography component="li" key={line}>
                  {line}
                </Typography>
              ))}
            </Stack>
          </Card>
        </Section>
      </Stack>
    </Page>
  );
}
