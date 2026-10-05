import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ScoreDisplay from '../components/ScoreDisplay';
import PhotoViewer from '../components/PhotoViewer';
import SeasonChart from '../components/SeasonChart';
import { errorMessage, useStandingsQuery } from '../api';
import { formatNight } from '../lib/format';
import type { LeaderboardRow, MachineBoard, StandingRow } from '../../../shared/types';
import { useAppSelector } from '../hooks';

function Thumb({ row, onOpen }: { row: LeaderboardRow; onOpen: (src: string) => void }) {
  if (!row.thumbUrl || !row.photoUrl) {
    return <Chip size="small" label="No photo" variant="outlined" />;
  }
  return (
    <ButtonBase onClick={() => onOpen(row.photoUrl!)} aria-label={`View ${row.team.teamName}'s score photo`} sx={{ borderRadius: 1, flexShrink: 0 }}>
      <Box component="img" src={row.thumbUrl} alt="" sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1, display: 'block' }} />
    </ButtonBase>
  );
}

function Board({ board, myTeamId, onOpen }: { board: MachineBoard; myTeamId?: string; onOpen: (src: string) => void }) {
  return (
    <Card>
      <Typography variant="h3" sx={{ px: 2, pt: 1.75, pb: 1 }}>
        {board.machine.name}
      </Typography>
      {board.rows.length === 0 && (
        <Typography color="text.secondary" sx={{ px: 2, pb: 2 }}>
          No scores yet tonight.
        </Typography>
      )}
      {board.rows.map((row, i) => (
        <Stack
          key={row.team.teamId}
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', px: 2, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: row.team.teamId === myTeamId ? 'action.selected' : undefined }}
        >
          <Typography sx={{ width: 22, fontWeight: 700, textAlign: 'right', color: 'text.secondary' }}>{i + 1}</Typography>
          <Avatar src={row.team.photoUrl ?? undefined} alt="" sx={{ width: 32, height: 32 }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {row.team.teamName}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
              <ScoreDisplay value={row.best} size="sm" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {row.points} pts, {row.attempts} {row.attempts === 1 ? 'game' : 'games'}
              </Typography>
            </Stack>
          </Box>
          <Thumb row={row} onOpen={onOpen} />
        </Stack>
      ))}
    </Card>
  );
}

function StandingsTable({ rows, unit, myTeamId }: { rows: StandingRow[]; unit: string; myTeamId?: string }) {
  if (rows.length === 0) return <Typography color="text.secondary">No teams yet.</Typography>;
  return (
    <Card>
      {rows.map((r) => (
        <Stack
          key={r.team.teamId}
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', px: 2, py: 1.25, '& + &': { borderTop: 1, borderColor: 'divider' }, bgcolor: r.team.teamId === myTeamId ? 'action.selected' : undefined }}
        >
          <Typography sx={{ width: 28, fontFamily: "'Bungee', sans-serif", textAlign: 'right', color: r.rank <= 4 ? 'primary.main' : 'text.secondary' }}>
            {r.rank}
          </Typography>
          <Avatar src={r.team.photoUrl ?? undefined} alt="" sx={{ width: 36, height: 36 }} />
          <Typography sx={{ flexGrow: 1, fontWeight: 700 }} noWrap>
            {r.team.teamName}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {r.points.toLocaleString('en-US')} <Typography component="span" variant="body2" color="text.secondary">{unit}</Typography>
          </Typography>
        </Stack>
      ))}
    </Card>
  );
}

export default function Standings() {
  const { data, error, isLoading } = useStandingsQuery(undefined, { pollingInterval: 15000 });
  const myTeamId = useAppSelector((s) => s.auth.team?.teamId);
  const [tab, setTab] = useState(0);
  const [option, setOption] = useState<'option1' | 'option2'>('option1');
  const [photo, setPhoto] = useState<string | null>(null);

  if (isLoading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;
  if (error || !data) return <Alert severity="error">{errorMessage(error)}</Alert>;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 0.5 }}>
        Standings
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {data.night ? `Week ${data.night.week}, ${formatNight(data.night.date)}. ` : ''}
        {data.teamCount} {data.teamCount === 1 ? 'team' : 'teams'}. Updates every 15 seconds.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Tonight" />
        <Tab label="Season" />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={4}>
          {!data.night && <Alert severity="info">No league night yet. Check back on league night.</Alert>}
          {data.night && (
            <>
              <Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  Tonight's machine points
                </Typography>
                <StandingsTable rows={data.tonight.machinePoints} unit="pts" myTeamId={myTeamId} />
              </Box>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' }}>
                {data.tonight.boards.map((b) => (
                  <Board key={b.machine.machineId} board={b} myTeamId={myTeamId} onOpen={setPhoto} />
                ))}
              </Box>
            </>
          )}
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2} sx={{ maxWidth: 680 }}>
          <ToggleButtonGroup exclusive value={option} onChange={(_, v) => v && setOption(v)} size="small" color="primary">
            <ToggleButton value="option1">Machine points add up</ToggleButton>
            <ToggleButton value="option2">Rank the night</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            The league is testing two scoring formats. {data.season.nightsPlayed}{' '}
            {data.season.nightsPlayed === 1 ? 'night' : 'nights'} counted so far. Top 4 make the championship.
          </Typography>
          <Card sx={{ p: 2 }}>
            <SeasonChart byNight={data.season.byNight} rows={data.season[option]} option={option} myTeamId={myTeamId} />
          </Card>
          <StandingsTable rows={data.season[option]} unit="pts" myTeamId={myTeamId} />
        </Stack>
      )}

      <PhotoViewer src={photo} onClose={() => setPhoto(null)} />
    </Box>
  );
}
