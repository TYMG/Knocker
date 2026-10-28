// Team home, at "/" for a logged-in team. This is the page the phone sits on all night:
// where you stand, how long is left, your place in line, what is left to play, what you have
// played, and what just happened to you. Submit a score is the one big button.
//
// What a team sees depends on where it is in its life:
//   - waiting for approval: its photo, its name and the waiting notice, nothing else;
//   - approved but starting in a later week: when it starts;
//   - league night open: everything;
//   - league night closed: how the week ended, with the line and submit parts hidden.

import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { DrCheckUp, DrNotes, DrWrapped } from './DrParts';
import { CHALLENGE_CHAMPION_BONUS, challengeRace } from '../sample/league';
import DrPrescription from './DrPrescription';
import { playersLine } from '../ui/players';
import LoveDr from './LoveDr';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import { WaitingForApproval } from '../layout/guards';
import { checkInWindow, subProblem, subsUsed, challenges, lineCount, lineFor, linesView, nightStatus, placeInLine, seasonLine, teamSeason, teamTonight, weekLabel, weekOf } from '../sample/league';
import ChallengeChampionRace from '../ui/ChallengeChampionRace';
import { ago, clock, clockLabel, longDate, ordinal } from '../sample/time';
import type { STeam } from '../sample/types';
import ActionCard from '../ui/ActionCard';
import EmptyNote from '../ui/EmptyNote';
import MachineArt from '../ui/MachineArt';
import Page from '../ui/Page';
import RollingNumber from '../ui/RollingNumber';
import { Row, RowCard, RowText } from '../ui/Rows';
import ScoreDisplay from '../ui/ScoreDisplay';
import Section from '../ui/Section';
import Tag from '../ui/Tag';
import TeamAvatar from '../ui/TeamAvatar';

const pointsText = (points: number) => `${points} ${points === 1 ? 'point' : 'points'}`;
const gamesText = (games: number) => `${games} ${games === 1 ? 'game' : 'games'}`;

/** The top of the page: the team's photo with its coral ring, its name, and a few lines under it. */
function Header({ team, children }: { team: STeam; children?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <TeamAvatar team={team} size={88} mine />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h2" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          {team.teamName}
        </Typography>
        {playersLine(team, ' · ') && <Typography color="textSecondary" sx={{ fontWeight: 700 }}>{playersLine(team, ' · ')}</Typography>}
        {children}
      </Box>
    </Box>
  );
}

type HomeTab = 'tonight' | 'doc' | 'season';
const HOME_TABS: HomeTab[] = ['tonight', 'doc', 'season'];

/**
 * Team home is split into three tabs so nothing is buried at the bottom of a long page:
 *   Tonight  the night: status, your line, what is left to play, what you played, challenges
 *   Doc      the Love Dr.: tonight's prescription, what he noticed, the check-up, his card
 *   Season   Wrapped first, then where you stand, badges and the Challenge Champion race
 * The tab lives in the address (?tab=doc), so a link can open the right one. While a night is
 * open, home starts on Tonight; once it closes, home starts on Season.
 */
function useHomeTab(nightOpen: boolean): [HomeTab, (t: HomeTab) => void] {
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab') as HomeTab | null;
  const tab = asked && HOME_TABS.includes(asked) ? asked : nightOpen ? 'tonight' : 'season';
  const set = (t: HomeTab) =>
    setParams(
      (p) => {
        p.set('tab', t);
        return p;
      },
      { replace: true }
    );
  return [tab, set];
}

function HomeTabs({ tab, onChange, tonightLabel }: { tab: HomeTab; onChange: (t: HomeTab) => void; tonightLabel: string }) {
  return (
    <Tabs value={tab} onChange={(_, v: HomeTab) => onChange(v)} variant="fullWidth" aria-label="Team home sections" sx={{ borderBottom: 1, borderColor: 'divider', mt: '8px !important' }}>
      <Tab value="tonight" label={tonightLabel} sx={{ minHeight: 48 }} />
      <Tab value="doc" label="Doc" sx={{ minHeight: 48 }} />
      <Tab value="season" label="Season" sx={{ minHeight: 48 }} />
    </Tabs>
  );
}

/** One of the three numbers on the Season tab. */
function SeasonTile({ label, value, under }: { label: string; value: string; under?: string }) {
  return (
    <Card sx={{ px: 1, py: 1.5, textAlign: 'center', minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ fontFamily: "'Bungee', sans-serif", fontSize: '1.6rem', lineHeight: 1.2, color: 'primary.main' }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: '1.43em' }}>{under}</Typography>
    </Card>
  );
}

/** The Season tab: Wrapped up top, then the season in numbers, badges and the challenge race. */
function SeasonTab({ team }: { team: STeam }) {
  const league = useLeague();
  const stats = teamSeason(league, team.teamId);
  return (
    <Stack spacing={3}>
      <DrWrapped teamId={team.teamId} />
      <Section title="Your season">
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{seasonLine(league, team.teamId)}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
          <SeasonTile label="Games" value={String(stats.games)} />
          <SeasonTile label="Best night" value={stats.bestNight ? ordinal(stats.bestNight.rank) : 'None'} under={stats.bestNight ? `week ${stats.bestNight.week}` : 'yet'} />
          <SeasonTile label="Machine wins" value={String(stats.machineWins)} />
        </Box>
        {stats.badges.length > 0 && (
          <Box component="ul" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, m: 0, mt: 1.5, p: 0, listStyle: 'none' }}>
            {stats.badges.map((badge) => (
              <Box component="li" key={badge} sx={{ maxWidth: '100%', '& > span': { whiteSpace: 'normal' } }}>
                <Tag tone="good">{badge}</Tag>
              </Box>
            ))}
          </Box>
        )}
        <Button component={RouterLink} to={`/teams/${team.teamId}`} sx={{ mt: 1, minHeight: 44 }}>
          Your full team page
        </Button>
      </Section>
      <Section title="Challenge Champion race">
        <ChallengeChampionRace myTeamId={team.teamId} limit={5} />
      </Section>
    </Stack>
  );
}

/**
 * Checking in: the team taps "I'm here" when it arrives, and the request waits on the admin's
 * Check In page until an admin confirms. The admin can still check a team in by hand.
 */
function CheckInCard({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const asked = league.checkInRequests?.[teamId];
  const t = league.teams.find((x) => x.teamId === teamId)!;
  const used = subsUsed(league, teamId);
  // Which partner is out tonight (at most one), and the sub's name.
  const [out, setOut] = useState<0 | 1 | null>(null);
  const [subName, setSubName] = useState('');
  const [tried, setTried] = useState(false);
  const problem = out === null ? undefined : subProblem(league, subName);

  if (asked) {
    const pending = league.pendingSubs?.[teamId]?.[0];
    return (
      <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, border: 2, borderColor: 'primary.main' }}>
        <TimerOutlinedIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>Waiting for the league admin</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            You tapped "I'm here" at {clock(asked)}{pending ? `, with ${pending.subName} in for ${t.players[pending.outPlayer]}` : ''}. Lines and scores open as soon as they confirm you.
          </Typography>
        </Box>
        <Button onClick={() => dispatch(sample.cancelCheckInRequest(teamId))} sx={{ flexShrink: 0, minHeight: 44 }}>
          Cancel
        </Button>
      </Card>
    );
  }

  const send = () => {
    setTried(true);
    if (out !== null && problem) return;
    dispatch(sample.requestCheckIn({ teamId, subs: out === null ? [] : [{ outPlayer: out, subName }] }));
    dispatch(showToast(out === null ? "Sent. The league admin will confirm you're here." : `Sent, with ${subName.trim()} subbing for ${t.players[out]}. The league admin will confirm.`));
  };

  return (
    <Card sx={{ p: 2, border: 2, borderColor: 'secondary.main' }}>
      <Typography sx={{ fontWeight: 700 }}>Just got here? Check in</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        You need to check in before you can join a line or submit a score. Is each of you here tonight?
      </Typography>
      <Stack spacing={1.25}>
        {([0, 1] as const).map((i) => {
          const name = t.players[i] || `Player ${i + 1}`;
          const subbed = out === i;
          const usedSub = used[i];
          return (
            <Box key={i}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>{name}</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={subbed ? 'sub' : 'here'}
                  onChange={(_, v) => { if (!v) return; setOut(v === 'sub' ? i : out === i ? null : out); setTried(false); }}
                  aria-label={`Is ${name} here?`}
                >
                  <ToggleButton value="here" sx={{ px: 1.5 }}>Here</ToggleButton>
                  <ToggleButton value="sub" disabled={!!usedSub || (out !== null && out !== i)} sx={{ px: 1.5 }}>Sub</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              {usedSub && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {name} used their sub in week {usedSub.week} ({usedSub.subName}). If {name} can't make it tonight, it counts as a no-show.
                </Typography>
              )}
              {subbed && (
                <TextField
                  fullWidth
                  size="small"
                  label={`Sub's name, in for ${name}`}
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  error={tried && !!problem}
                  helperText={tried && problem ? problem : `Someone not in the league. This is ${name}'s one sub this season.`}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          );
        })}
      </Stack>
      <Button variant="contained" color="secondary" size="large" fullWidth onClick={send} sx={{ mt: 1.75, minHeight: 48 }}>
        I'm here
      </Button>
    </Card>
  );
}

export default function TeamHome() {
  const league = useLeague();
  const { team } = useMe();
  const night = nightStatus(league);
  const week = night.week;
  const weekLine = `${weekLabel(week.week)}, ${longDate(week.date)}`;
  // Tonight is the first tab while the night is open, and while check-in is open before it.
  const [tab, setTab] = useHomeTab(night.open || checkInWindow(league).open);

  // Paired from the waitlist: the two finish setting up first (name, photo, PIN).
  const pinPrompt = team.needsSetup ? (
    <Alert severity="warning" action={<Button component={RouterLink} to="/team/setup" color="inherit" size="small">Set up</Button>}>
      <Typography sx={{ fontWeight: 700 }}>Finish setting up your team.</Typography>
      Pick your team name, photo and PIN together.
    </Alert>
  ) : null;

  // 1. A new team that no admin has approved yet.
  if (team.status === 'pending') {
    return (
      <Page>
        <Stack spacing={2.5}>
          <Header team={team} />
          <WaitingForApproval />
        </Stack>
      </Page>
    );
  }

  // 2. Approved part-way through the season: the team counts from a later week.
  if (team.firstWeek > week.week) {
    const first = weekOf(league, team.firstWeek);
    // Week 9 is finals night, which a brand new team does not play in.
    const starts = first && first.week <= 8;
    return (
      <Page>
        <Stack spacing={2.5}>
          <Header team={team}>
            <Typography sx={{ color: 'text.secondary' }}>{starts ? `Starts in week ${first.week}` : 'Approved'}</Typography>
          </Header>
          {pinPrompt}
          <Alert severity="info">
            <Typography sx={{ fontWeight: 700 }}>You are in.</Typography>
            {starts
              ? `Your first league night is week ${first.week}, ${longDate(first.date)}. Scores open at ${clockLabel(league.night.opensAt)}. Until then you can follow the standings.`
              : 'This season has no league nights left for a new team. Ask the league admin about the next one.'}
          </Alert>
          <Button component={RouterLink} to="/standings" variant="outlined" size="large">
            See the standings
          </Button>
        </Stack>
      </Page>
    );
  }

  const tonight = teamTonight(league, team.teamId, week.week);
  const row = tonight.row;
  const place = row ? `${ordinal(row.rank)} of ${tonight.teamCount}` : undefined;
  const waitingOnMe = challenges(league, team.teamId).waitingOnMe.length;
  // Newest first. Dates in the sample are all written the same way, so comparing the text is enough.
  const feed = league.feed.filter((f) => f.teamId === team.teamId).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const myLine = lineFor(league, team.teamId);
  const lines = linesView(league);

  const played = (
    <Section title={night.open ? 'Played tonight' : `Played in week ${week.week}`}>
      {tonight.played.length === 0 ? (
        <EmptyNote>{night.open ? 'No scores yet tonight.' : 'No scores that week.'}</EmptyNote>
      ) : (
        <RowCard>
          {tonight.played.map((p) => (
            <Row key={p.machine.machineId} to={`/machines/${p.machine.machineId}`} sx={{ alignItems: 'flex-start' }}>
              <MachineArt machine={p.machine} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                  <Typography noWrap sx={{ fontWeight: 700 }}>
                    {p.machine.name}
                  </Typography>
                  <ScoreDisplay size="sm" value={p.best.score} label={`Best score ${p.best.score.toLocaleString('en-US')}`} />
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {gamesText(p.games)}
                  {p.best.check === 'checked' ? ', checked by the league' : ''}
                </Typography>
                <Typography sx={{ color: 'text.secondary' }} variant="body2">
                  {ordinal(p.rank)} on this machine, {pointsText(p.points)}
                </Typography>
              </Box>
            </Row>
          ))}
        </RowCard>
      )}
    </Section>
  );

  const justHappened = (
    <Section title="Just happened">
      {feed.length === 0 ? (
        <EmptyNote>{night.open ? 'Nothing yet tonight.' : 'Nothing to report.'}</EmptyNote>
      ) : (
        <RowCard>
          {feed.map((item, i) => (
            // An item with somewhere to go is one big link, so the whole row is the tap target.
            // The line between rows is drawn here: Row only draws it between two rows of the same
            // kind, and this list mixes rows that are links with rows that are not.
            <Row key={item.id} to={item.to} sx={i > 0 ? { borderTop: 1, borderColor: 'divider' } : undefined}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{item.text}</Typography>
                <Typography sx={{ color: 'text.secondary' }} variant="body2">
                  {ago(item.at, league.now)}
                  {item.to && (
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'underline', ml: 1 }}>
                      {item.linkLabel ?? 'Open'}
                    </Box>
                  )}
                </Typography>
              </Box>
              {item.to && <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />}
            </Row>
          ))}
        </RowCard>
      )}
    </Section>
  );

  const record = challengeRace(league).find((r) => r.team.teamId === team.teamId);
  // Challenges sit high on the page, right under how the night is going.
  const challengesRow = (
    <ActionCard
      to="/challenges"
      icon={<SportsMmaIcon />}
      title="Challenges"
      alert={waitingOnMe > 0}
      note={waitingOnMe > 0 ? `${waitingOnMe} waiting on you` : `${record ? `Your record: ${record.wins} won, ${record.losses} lost. ` : ''}Most wins this season takes ${CHALLENGE_CHAMPION_BONUS} bonus points.`}
    />
  );

  // 4. League night is closed: how the week ended. No lines, no submitting.
  if (!night.open) {
    const next = weekOf(league, week.week + 1);
    const posted = (row?.games ?? 0) > 0;
    return (
      <Page>
        <Stack spacing={3}>
          <Header team={team}>
            <Typography sx={{ color: 'text.secondary' }}>{weekLine}</Typography>
          </Header>
          {pinPrompt}
          <HomeTabs tab={tab} onChange={setTab} tonightLabel={weekLabel(week.week)} />
          {tab === 'tonight' && (
          <>
          {/* Check-in opens a little before the night does. */}
          {checkInWindow(league).open && !league.checkIns[team.teamId] && <CheckInCard teamId={team.teamId} />}
          <Card sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {weekLabel(week.week)} is closed. Scores open at {clockLabel(league.night.opensAt)} on league night.
            </Typography>
            <Typography sx={{ mt: 1 }}>
              {row && posted ? (
                <>
                  You finished{' '}
                  <Box component="strong" sx={{ color: 'primary.main' }}>
                    {place}
                  </Box>{' '}
                  with {pointsText(row.points)}.
                </>
              ) : (
                'You did not post a score that week.'
              )}
            </Typography>
            {next && (
              <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
                Next up: {next.week >= 9 ? 'finals night' : `week ${next.week}`}, {longDate(next.date)}.
              </Typography>
            )}
            <Button component={RouterLink} to="/standings" variant="contained" color="secondary" size="large" fullWidth sx={{ mt: 2 }}>
              See the standings
            </Button>
          </Card>
          {challengesRow}
          {played}
          {justHappened}
          </>
          )}
          {tab === 'doc' && (
            <>
              <DrCheckUp teamId={team.teamId} week={week.week} />
              <LoveDr teamId={team.teamId} />
            </>
          )}
          {tab === 'season' && <SeasonTab team={team} />}
        </Stack>
      </Page>
    );
  }

  // 3. League night is open.
  const minutes = night.minutesLeft;
  const lineTitle = !myLine
    ? 'You are not in a line'
    : myLine.position === 1
      ? `You are up on ${myLine.machine.name}`
      : myLine.position === 2
        ? `You are next for ${myLine.machine.name}`
        : `You are ${placeInLine(myLine.position)} for ${myLine.machine.name}`;

  return (
    <Page>
      <Stack spacing={3}>
        <Header team={team}>
          <Typography sx={{ color: 'text.secondary' }}>{weekLine}</Typography>
          <Typography
            variant="body2"
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5, fontWeight: 700, color: tonight.checkedInAt ? 'primary.main' : 'secondary.main', '& svg': { fontSize: '1.1rem', mt: '1px', flexShrink: 0 } }}
          >
            {tonight.checkedInAt ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
            {tonight.checkedInAt ? `Checked in at ${clock(tonight.checkedInAt)}` : 'Not checked in yet'}
          </Typography>
        </Header>
        {pinPrompt}
        {!tonight.checkedInAt && <CheckInCard teamId={team.teamId} />}
        <HomeTabs tab={tab} onChange={setTab} tonightLabel="Tonight" />

        {tab === 'tonight' && (
        <>
        <Card sx={{ p: 2 }}>
          <Typography component="p" sx={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>
            Tonight so far:{' '}
            <Box component="span" sx={{ color: 'primary.main', whiteSpace: 'nowrap' }}>
              {row ? `${place}, ${pointsText(row.points)}` : 'no points yet'}
            </Box>
          </Typography>
          <Typography sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            <TimerOutlinedIcon fontSize="small" />
            {minutes > 0 ? (
              <span aria-label={`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`}>
                <RollingNumber value={minutes} /> {minutes === 1 ? 'minute' : 'minutes'} left
              </span>
            ) : (
              'Time is up. The league admin will close the night.'
            )}
          </Typography>
        </Card>

        {challengesRow}

        <ActionCard
          to="/lines"
          icon={<GroupsIcon />}
          title={lineTitle}
          // Coral when it is your turn: someone is waiting behind you.
          alert={myLine?.position === 1}
          note={myLine ? 'See every line or switch machines' : 'Sign up for a machine'}
        />

        <Button component={RouterLink} to="/submit" variant="contained" color="secondary" size="large" startIcon={<AddAPhotoIcon />} sx={{ minHeight: 60, fontSize: '1.15rem' }}>
          Submit a score
        </Button>

        <Section title={`Still to play tonight (${tonight.toPlay.length})`}>
          {tonight.toPlay.length === 0 ? (
            <EmptyNote>Every machine played. Go again to beat your best.</EmptyNote>
          ) : (
            <RowCard>
              {tonight.toPlay.map((m) => {
                const line = lines.find((l) => l.machine.machineId === m.machineId);
                const inThisLine = myLine?.machine.machineId === m.machineId;
                return (
                  // Two things to tap in one row: the machine (opens its page) and the line link.
                  // A link cannot sit inside another link, so the row itself is not one.
                  <Row key={m.machineId} sx={{ px: 0, py: 0, gap: 0 }}>
                    <ButtonBase component={RouterLink} to={`/machines/${m.machineId}`} sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, pl: 2, pr: 1, py: 1.25, minHeight: 64 }}>
                      <MachineArt machine={m} />
                      <RowText primary={m.name} secondary={lineCount(line?.teams.length ?? 0)} />
                    </ButtonBase>
                    <Box sx={{ pr: 1.5, flexShrink: 0 }}>
                      {inThisLine && myLine ? (
                        <Tag tone="good">{placeInLine(myLine.position)}</Tag>
                      ) : (
                        <Button component={RouterLink} to={`/lines/join/${m.machineId}`} variant="outlined" sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>
                          {myLine ? 'Switch line' : 'Sign up'}
                        </Button>
                      )}
                    </Box>
                  </Row>
                );
              })}
            </RowCard>
          )}
        </Section>

        {played}
        {justHappened}
        </>
        )}

        {tab === 'doc' && (
          <>
            <DrPrescription teamId={team.teamId} />
            <DrNotes teamId={team.teamId} />
            <LoveDr teamId={team.teamId} />
          </>
        )}

        {tab === 'season' && <SeasonTab team={team} />}
      </Stack>
    </Page>
  );
}
