import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAppDispatch, useLeague } from '../hooks';
import { sample } from '../sample/slice';
import { GROUPS, TOUR, type TourPage } from '../sample/tour';
import { clock, longDate } from '../sample/time';
import { currentWeek, nightStatus } from '../sample/league';
import { showToast } from '../store';
import Page from '../ui/Page';
import Section from '../ui/Section';
import Tag from '../ui/Tag';

const VIEW_AS = { visitor: 'Anyone', team: 'A team', admin: 'An admin' } as const;

/** Every page in the app, grouped by who uses it and when. Tapping one opens it as the right person. */
export default function Tour() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const week = currentWeek(league);
  const night = nightStatus(league);

  const open = (page: TourPage) => {
    // The front door and team home share an address, so opening either one sets who you are.
    if (page.role !== 'visitor' || page.path === '/') dispatch(sample.setRole(page.role));
    navigate(page.example);
  };

  return (
    <Page title="All pages" subtitle="Every page in the app, by who uses it and when. Tap one to open it. The strip at the top of each page switches who you are viewing as, and About this page explains the page you are on.">
      <Stack spacing={4}>
        <Card sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            The sample league
          </Typography>
          <Typography color="text.secondary">
            It is always {clock(league.now)} on {longDate(week.date)}: week {week.week} of 8 at Lyman's
            {night.open ? `, with ${night.minutesLeft} minutes left` : ', and the night is closed'}. You are the team Left &amp; Right. Venom broke at 7:40 PM, two teams never showed up, and two scores are waiting for an
            admin to look at them. Everything is made up and stays in this browser tab.
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            sx={{ mt: 1.5 }}
            onClick={() => {
              dispatch(sample.resetSample());
              dispatch(showToast('The sample league is back to 8:12 PM, week 5.'));
            }}
          >
            Start the sample over
          </Button>
        </Card>

        {GROUPS.map(({ group, blurb }) => (
          <Section key={group} title={group}>
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              {blurb}
            </Typography>
            <Stack spacing={1}>
              {TOUR.filter((p) => p.group === group).map((page) => (
                <Card key={`${page.path}-${page.role}`}>
                  <CardActionArea onClick={() => open(page)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{page.title}</Typography>
                        <Tag tone={page.role === 'admin' ? 'warn' : page.role === 'team' ? 'good' : 'plain'}>{VIEW_AS[page.role]}</Tag>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {page.when}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {page.does[0]}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </Section>
        ))}
      </Stack>
    </Page>
  );
}
