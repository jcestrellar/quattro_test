import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythm3DIndex } from '../../features/drumRhythm3D/drumRhythm3DIndex';

export const DrumRhythm3DPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width="100%" height="100%" pt={appBarHeight}>
      <DrumRhythm3DIndex />
    </Box>
  );
};
