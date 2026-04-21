import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythm3DBabylonConcertShowIndex } from '../../features/drumRhythm3DBabylonConcertShow/drumRhythm3DBabylonConcertShowIndex';

export const DrumRhythm3DBabylonConcertShowPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width="100%" height="100%" pt={appBarHeight}>
      <DrumRhythm3DBabylonConcertShowIndex />
    </Box>
  );
};
