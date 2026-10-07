// Standings, "Season" tab (/standings/season). Anyone can open it. It shows the season race:
// a switch between the two ways of scoring the league is testing, two charts of the weeks so
// far, and the full table with the lines that mark who would play in each final.

import { useState } from 'react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLeague, useMe } from '../../hooks';
import { nightStatus, season, type SeasonOption } from '../../sample/league';
import SeasonChart from '../../ui/SeasonChart';
import Section from '../../ui/Section';
import SeasonHighBonusList from '../../ui/SeasonHighBonusList';
import StandingsTable from '../../ui/StandingsTable';
import Switcher from './Switcher';

const OPTIONS: { value: SeasonOption; label: string; explain: string }[] = [
  { value: 'option1', label: 'Machine points add up', explain: "Every machine's points go straight into the season total." },
  {
    value: 'option2', label: 'Rank the night',
    explain: 'Each night is ranked by its machine points, and that place earns league points, so one huge night counts no more than a narrow win.'
  }
];

/** The lines drawn across the table, after 4th and 8th place. */
const CUTS = { 4: 'Top 4 play the championship', 8: '5th to 8th play the second-chance final' };

export default function Season() {
  const league = useLeague();
  const { myTeamId } = useMe();
  const [option, setOption] = useState<SeasonOption>('option1');
  const data = season(league);
  const rows = data[option];
  const chosen = OPTIONS.find((o) => o.value === option)!;
  const nights = `${data.nightsPlayed} ${data.nightsPlayed === 1 ? 'night' : 'nights'} counted`;

  // The lines are drawn after 4th and 8th in the list. When the teams either side of a line have
  // the same points, say so: the league has no rule yet for who gets the last place in a final.
  const tiedAtLine = [4, 8]
    .filter((place) => rows[place] && rows[place - 1]!.points === rows[place]!.points)
    .map((place) => `${rows[place - 1]!.team.teamName} and ${rows[place]!.team.teamName} are level on points at the line after ${place === 4 ? '4th' : '8th'}. How a tie there is broken has not been decided.`);

  return (
    <Stack spacing={3}>
      <div>
        <Switcher value={option} onChange={setOption} options={OPTIONS} label="How the season is scored" />
        <Typography color="textSecondary" sx={{ mt: 1.5, maxWidth: 640 }}>
          {chosen.explain} The league is testing both ways this season and has not picked one yet.
        </Typography>
      </div>

      <Card sx={{ p: 2 }}>
        <SeasonChart byNight={data.byNight} rows={rows} option={option} myTeamId={myTeamId} />
      </Card>

      <Section title="Season points">
        <StandingsTable rows={rows} myTeamId={myTeamId} cuts={CUTS} />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
          {data.nightsPlayed === 0
            ? 'No league nights have been played yet.'
            : `${nights}${nightStatus(league).open ? '. Tonight is included so far, so this can still change before the night closes.' : '.'}`}
          {rows.some((r) => r.change !== undefined) ? ' Arrows show places moved since last week.' : ''}
        </Typography>
        {tiedAtLine.map((text) => (
          <Typography key={text} variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {text}
          </Typography>
        ))}
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Season totals include points won and lost in challenges.
        </Typography>
      </Section>

      <SeasonHighBonusList myTeamId={myTeamId} />
    </Stack>
  );
}
