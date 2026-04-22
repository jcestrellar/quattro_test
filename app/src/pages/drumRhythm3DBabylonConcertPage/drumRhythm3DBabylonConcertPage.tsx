import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythm3DBabylonConcertIndex } from '../../features/drumRhythm3DBabylonConcert/drumRhythm3DBabylonConcertIndex';

export const DrumRhythm3DBabylonConcertPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width="100%" height="100%" pt={appBarHeight}>
      <DrumRhythm3DBabylonConcertIndex />
    </Box>
  );
};
