import { Box } from '@mui/material';
import { MidiSequencerIndex } from '../../features/midiSequencer/midiSequencerIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const MidiSequencerPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <MidiSequencerIndex />
    </Box>
  );
};
