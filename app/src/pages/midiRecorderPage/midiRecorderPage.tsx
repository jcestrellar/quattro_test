import { Box } from '@mui/material';
import { MidiRecorderIndex } from '../../features/midiRecorder/midiRecorderIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const MidiRecorderPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <MidiRecorderIndex />
    </Box>
  );
};
