import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { scorePhoto } from '../sample/art';
import type { SScore } from '../sample/types';
import PhotoViewer from './PhotoViewer';
import Tag from './Tag';
import { useAppDispatch, useMe } from '../hooks';
import { sample } from '../sample/slice';
import { showToast } from '../store';

/** The address of a score's photo: the one taken in this browser, or a drawn stand-in. Undefined when there is none. */
export function scorePhotoSrc(score: SScore, machineName: string, size: 'thumb' | 'full', o: { evenTakenDown?: boolean } = {}): string | undefined {
  if (score.photoSource === 'none') return undefined;
  // An admin took it down: gone for everyone (admins' own pages ask for it anyway).
  if (score.photoHidden && !o.evenTakenDown) return undefined;
  return score.photo ?? scorePhoto(score.score, machineName, size);
}

/** The thumbnail next to a score. Tap it to see the photo full size. Shows "No photo" when there is none. */
export default function ScorePhoto({ score, machineName, teamName, size = 48 }: { score: SScore; machineName: string; teamName?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const dispatch = useAppDispatch();
  // Another team's photo can be reported: it goes on the admin's needs-a-look list.
  const canReport = me.isTeam && me.team.teamId !== score.teamId && !!score.photo;
  const report = () => {
    dispatch(sample.reportScorePhoto(score.scoreId));
    dispatch(showToast('Reported. An admin will take a look. Thanks.'));
    setOpen(false);
  };
  const thumb = scorePhotoSrc(score, machineName, 'thumb');
  if (!thumb) return <Tag>No photo</Tag>;
  return (
    <>
      <ButtonBase
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`View ${teamName ? `${teamName}'s ` : ''}score photo`}
        sx={{ borderRadius: 1, flexShrink: 0 }}
      >
        <Box component="img" src={thumb} alt="" sx={{ width: size, height: size, objectFit: 'cover', borderRadius: 1, display: 'block' }} />
      </ButtonBase>
      <PhotoViewer src={open ? (scorePhotoSrc(score, machineName, 'full') ?? null) : null} onClose={() => setOpen(false)} onReport={canReport ? report : undefined} />
    </>
  );
}
