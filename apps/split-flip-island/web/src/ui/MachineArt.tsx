import Box from '@mui/material/Box';
import { machineArt } from '../sample/art';
import type { SMachine } from '../sample/types';

/** A square of drawn cabinet art standing in for a photo of the machine. */
export default function MachineArt({ machine, size = 44 }: { machine: SMachine; size?: number | string }) {
  return <Box component="img" src={machineArt(machine.machineId, machine.name)} alt="" sx={{ width: size, height: size, borderRadius: 1.5, display: 'block', flexShrink: 0 }} />;
}
