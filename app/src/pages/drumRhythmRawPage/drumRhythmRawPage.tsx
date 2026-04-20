import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythmIndex } from '../../features/drumRhythm/drumRhythmIndex';
import { parseRaw } from '../../features/drumRhythm/midiParser/parseRaw';

export const DrumRhythmRawPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <DrumRhythmIndex parser={parseRaw} />
    </Box>
  );
};
