import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythm3DBabylonIndex } from '../../features/drumRhythm3DBabylon/drumRhythm3DBabylonIndex';

export const DrumRhythm3DBabylonPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width="100%" height="100%" pt={appBarHeight}>
      <DrumRhythm3DBabylonIndex />
    </Box>
  );
};
