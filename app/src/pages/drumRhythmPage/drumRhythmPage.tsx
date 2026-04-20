import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythmIndex } from '../../features/drumRhythm/drumRhythmIndex';
import { parseTonejs } from '../../features/drumRhythm/midiParser/parseTonejs';

export const DrumRhythmPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <DrumRhythmIndex parser={parseTonejs} />
    </Box>
  );
};
