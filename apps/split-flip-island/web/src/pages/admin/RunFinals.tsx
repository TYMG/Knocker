// Run the finals (/admin/finals): championship night, run by one admin from one phone.
//
// 1. Lock in the four teams from the season standings.
// 2. Game 1: the 1st seed picks the machine and everyone plays in seed order.
//    Games 2 and 3: in seed order, each team picks either the machine or a spot in the play order.
//    One machine pick per game; the last team gets what is left. No machine is played twice.
// 3. Each team plays its own game (3 balls, 1 extra ball at most) and the admin enters the score.
//    All four in: 4-3-2-1 points. After game 3 the most points wins; a tie at the top goes to a
//    one-ball playoff. The public Finals tab follows along.
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { finalsPool, finalsPreview, finalsStep, finalsUsed, finalTable, machine, team, type Bracket, type SeasonOption } from '../../sample/league';
import { sample } from '../../sample/slice';
import { ordinal } from '../../sample/time';
import type { SFinal } from '../../sample/types';
import { showToast } from '../../store';
import { formatScore, formatScoreInput } from '../../lib/format';
import { celebrateOnce } from '../../ui/celebrate';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';
import TeamAvatar from '../../ui/TeamAvatar';
import Switcher from '../standings/Switcher';
import { ADMIN_HOME } from './nightShared';

const BRACKETS: { value: Bracket; label: string }[] = [
  { value: 'championship', label: 'Championship' },
  { value: 'secondChance', label: 'Second chance' }
];

export default function RunFinals() {
  const [bracket, setBracket] = useState<Bracket>('championship');
  const league = useLeague();
  const final = league.finals[bracket];

  return (
    <Page title="Run the finals" subtitle="One admin runs the night: the picks, every score, and the champion. The public Finals tab follows along." back={ADMIN_HOME}>
      <Stack spacing={3}>
        <Switcher value={bracket} onChange={setBracket} options={BRACKETS} label="Which final" />
        {final.locked ? <Running bracket={bracket} final={final} /> : <LockIn bracket={bracket} />}
        <Card sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>The finals rules</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', display: 'grid', gap: 0.5 }}>
            <li>3 games. Each team plays its own game on each machine: 3 balls, 1 extra ball at most.</li>
            <li>Game 1: the 1st seed picks the machine, and play goes in seed order.</li>
            <li>Games 2 and 3: in seed order, each team picks the machine or a spot in the play order. The last team gets what is left.</li>
            <li>No machine is played twice in a final. The pool is every machine played this season.</li>
            <li>Each game: 1st gets 4 points, 2nd 3, 3rd 2, 4th 1. Most points after 3 games wins. A tie at the top: one-ball playoff.</li>
          </Box>
        </Card>
      </Stack>
    </Page>
  );
}

/** Before the night: the four teams from the season standings, and the button that locks them in. */
function LockIn({ bracket }: { bracket: Bracket }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  // The season scoring option is still being decided, so the admin says which one seeds the finals.
  const [option, setOption] = useState<SeasonOption>('option1');
  const preview = finalsPreview(league, option);
  const rows = bracket === 'championship' ? preview.championship : preview.secondChance;
  const first = bracket === 'championship' ? 1 : 5;

  return (
    <Section title={bracket === 'championship' ? 'Lock in the top 4' : 'Lock in 5th to 8th'}>
      <Switcher
        value={option}
        onChange={setOption}
        options={[{ value: 'option1', label: 'Machine points add up' }, { value: 'option2', label: 'Rank the night' }]}
        label="Seed by"
      />
      <Card sx={{ mt: 1.5 }}>
        {rows.map((r, i) => (
          <Box key={r.team.teamId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 700, width: 42 }}>{ordinal(first + i)}</Typography>
            <TeamAvatar team={r.team} size={36} />
            <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>{r.team.teamName}</Typography>
            <Typography color="textSecondary">{r.points} pts</Typography>
          </Box>
        ))}
      </Card>
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={rows.length < 4}
        sx={{ mt: 1.5, minHeight: 48 }}
        onClick={() => {
          dispatch(sample.finalsLock({ bracket, option }));
          dispatch(showToast('Teams locked in. Game 1: the 1st seed picks the machine.'));
        }}
      >
        Lock in these four teams
      </Button>
      {rows.length < 4 && <Typography color="textSecondary" sx={{ mt: 1 }}>Not enough teams in the standings for this final.</Typography>}
    </Section>
  );
}

function Running({ bracket, final }: { bracket: Bracket; final: SFinal }) {
  const league = useLeague();
  const step = finalsStep(final);
  const winner = final.winnerId ? team(league, final.winnerId) : undefined;
  useEffect(() => {
    if (winner && bracket === 'championship') celebrateOnce(`finals-admin:${winner.teamId}`, 'champion');
  }, [winner, bracket]);

  return (
    <>
      <PointsTable final={final} />
      {step.kind === 'choose' && <Choose bracket={bracket} final={final} step={step} />}
      {step.kind === 'scores' && <Scores bracket={bracket} final={final} />}
      {step.kind === 'playoff' && <Playoff bracket={bracket} tied={step.tied} />}
      {winner && (
        <Card sx={{ p: 2.5, textAlign: 'center', borderWidth: 2, borderColor: 'primary.main' }}>
          <Typography sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' }}>
            {bracket === 'championship' ? 'League Champion' : 'Second-chance final winner'}
          </Typography>
          <TeamAvatar team={winner} size={64} />
          <Typography variant="h2" component="p" sx={{ mt: 1 }}>{winner.teamName}</Typography>
          <Link component={RouterLink} to="/standings/finals" sx={{ display: 'inline-block', mt: 1, fontWeight: 700 }}>See the public Finals page</Link>
        </Card>
      )}
      <StartOver bracket={bracket} />
    </>
  );
}

/** Seeds down, games across, points and total. */
function PointsTable({ final }: { final: SFinal }) {
  const league = useLeague();
  const rows = finalTable(league, final);
  return (
    <Card>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 52px) 56px', alignItems: 'center', px: 2, py: 1, gap: 0.5, fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}>
        <span>Seed and team</span>
        {[0, 1, 2].map((i) => (
          <Box key={i} component="span" sx={{ textAlign: 'center', lineHeight: 1.15 }}>
            G{i + 1}
            <Box component="span" sx={{ display: 'block', fontWeight: 400, fontSize: '0.68rem' }}>{final.games[i]?.machineId ? machine(league, final.games[i]!.machineId).name : '–'}</Box>
          </Box>
        ))}
        <Box component="span" sx={{ textAlign: 'right' }}>Total</Box>
      </Box>
      {rows.map((r) => (
        <Box key={r.team.teamId} sx={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 52px) 56px', alignItems: 'center', px: 2, py: 1.1, gap: 0.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700, minWidth: 0 }} noWrap>{r.seed}. {r.team.teamName}</Typography>
          {[0, 1, 2].map((i) => <Typography key={i} sx={{ textAlign: 'center' }}>{r.games[i] ?? '–'}</Typography>)}
          <Typography sx={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>{r.total}</Typography>
        </Box>
      ))}
    </Card>
  );
}

type ChooseStep = Extract<ReturnType<typeof finalsStep>, { kind: 'choose' }>;

/** One team at a time, in seed order: the machine, or a spot in the play order. */
function Choose({ bracket, final, step }: { bracket: Bracket; final: SFinal; step: ChooseStep }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const chooser = team(league, step.teamId);
  const used = finalsUsed(final);
  const pool = finalsPool(league).filter((m) => !used.includes(m.machineId));
  const g = final.games[step.game];
  const picks = g?.picks ?? [];
  const machinePicked = !!g?.machineId;
  const seed = final.teamIds.indexOf(step.teamId) + 1;

  return (
    <Section title={`Game ${step.game + 1}: picks`} aside={<Tag tone="live">Now</Tag>}>
      {picks.length > 0 && (
        <Card sx={{ mb: 1.5 }}>
          {picks.map((p, i) => (
            <Box key={p.teamId} sx={{ display: 'flex', gap: 1, px: 2, py: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, flex: 1 }}>{team(league, p.teamId).teamName}</Typography>
              <Typography color="textSecondary">{p.pick === 'machine' ? `picked ${machine(league, g!.machineId).name}` : `plays ${ordinal(p.pick)}`}</Typography>
            </Box>
          ))}
        </Card>
      )}
      <Card sx={{ p: 2, borderWidth: 2, borderColor: 'primary.main' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TeamAvatar team={chooser} size={44} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{chooser.teamName}</Typography>
            <Typography color="textSecondary" variant="body2">
              {step.game === 0
                ? '1st seed: picks the machine, and plays first.'
                : step.mustMachine
                  ? `${ordinal(seed)} seed, last to choose: nobody has picked the machine, so they pick it and take the spot left.`
                  : machinePicked
                    ? `${ordinal(seed)} seed: the machine is set, so they pick a spot.`
                    : `${ordinal(seed)} seed: pick the machine, or a spot in the play order.`}
            </Typography>
          </Box>
        </Stack>

        {!machinePicked && (
          <>
            <Typography sx={{ fontWeight: 700, mt: 2, mb: 1 }}>Pick the machine</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {pool.map((m) => (
                <Button key={m.machineId} variant="outlined" sx={{ minHeight: 44 }} onClick={() => dispatch(sample.finalsChoose({ bracket, machineId: m.machineId }))}>
                  {m.name}
                </Button>
              ))}
            </Box>
            {used.length > 0 && <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Already played in this final: {used.map((id) => machine(league, id).name).join(', ')}.</Typography>}
          </>
        )}

        {step.canSpot && !step.mustMachine && (
          <>
            <Typography sx={{ fontWeight: 700, mt: 2, mb: 1 }}>{machinePicked ? 'Pick a spot' : 'Or pick a spot in the play order'}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {step.spotsLeft.map((n) => (
                <Button key={n} variant="outlined" color="secondary" sx={{ minHeight: 44, minWidth: 72 }} onClick={() => dispatch(sample.finalsChoose({ bracket, spot: n }))}>
                  Play {ordinal(n)}
                </Button>
              ))}
            </Box>
          </>
        )}
      </Card>
    </Section>
  );
}

/** The game is set: everyone plays in order and the admin enters each score. */
function Scores({ bracket, final }: { bracket: Bracket; final: SFinal }) {
  const league = useLeague();
  const g = final.games[final.games.length - 1]!;
  const scores = g.scores ?? {};
  const playing = g.order!.find((id) => scores[id] === undefined);
  return (
    <Section title={`Game ${final.games.length} on ${machine(league, g.machineId).name}`} aside={<Tag tone="live">Live</Tag>}>
      <Typography color="textSecondary" sx={{ mb: 1.5 }}>Each team plays its own game, in this order. 3 balls, 1 extra ball at most. Enter each score when the game ends.</Typography>
      <Card>
        {g.order!.map((id, i) => (
          <ScoreRow key={id} bracket={bracket} teamId={id} spot={i + 1} score={scores[id]} playing={id === playing} />
        ))}
      </Card>
    </Section>
  );
}

function ScoreRow({ bracket, teamId, spot, score, playing }: { bracket: Bracket; teamId: string; spot: number; score?: number; playing: boolean }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const t = team(league, teamId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const parsed = formatScoreInput(text).value;
  const save = () => {
    if (!parsed) return;
    dispatch(sample.finalsScore({ bracket, teamId, score: parsed }));
    dispatch(showToast(`${formatScore(parsed)} for ${t.teamName}`));
    setEditing(false);
    setText('');
  };
  const open = score === undefined || editing;

  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: spot > 1 ? 1 : 0, borderColor: 'divider', ...(playing && { bgcolor: 'action.selected' }) }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, width: 36 }}>{ordinal(spot)}</Typography>
        <TeamAvatar team={t} size={36} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>{t.teamName}</Typography>
          {playing && <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>Playing now</Typography>}
        </Box>
        {score !== undefined && !editing && (
          <>
            <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatScore(score)}</Typography>
            <Button size="small" onClick={() => { setEditing(true); setText(formatScore(score)); }}>Fix</Button>
          </>
        )}
      </Stack>
      {open && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            label={`${t.teamName}'s score`}
            value={text}
            onChange={(e) => setText(formatScoreInput(e.target.value).display)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 700 } } }}
          />
          <Button variant="contained" disabled={!parsed} onClick={save} sx={{ flexShrink: 0 }}>Save</Button>
          {editing && <Button onClick={() => setEditing(false)}>Cancel</Button>}
        </Stack>
      )}
    </Box>
  );
}

function Playoff({ bracket, tied }: { bracket: Bracket; tied: string[] }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  return (
    <Section title="Tied at the top" aside={<Tag tone="warn">Playoff</Tag>}>
      <Typography sx={{ mb: 1.5 }}>
        {tied.map((id) => team(league, id).teamName).join(' and ')} are level on points. They play a one-ball playoff. Tap the winner.
      </Typography>
      <Stack spacing={1}>
        {tied.map((id) => (
          <Button key={id} variant="outlined" size="large" sx={{ minHeight: 48 }} onClick={() => dispatch(sample.finalsPlayoff({ bracket, winnerId: id }))}>
            {team(league, id).teamName} won the playoff
          </Button>
        ))}
      </Stack>
    </Section>
  );
}

function StartOver({ bracket }: { bracket: Bracket }) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="secondary" onClick={() => setOpen(true)} sx={{ alignSelf: 'flex-start' }}>Start this final over</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Start this final over?</DialogTitle>
        <DialogContent>Every pick and score in this final is cleared, and the teams are unlocked. The league log keeps a note.</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Keep it</Button>
          <Button color="secondary" onClick={() => { dispatch(sample.finalsReset(bracket)); setOpen(false); }}>Start over</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
