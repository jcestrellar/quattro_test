import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { CalibrationPixiIndex } from '../../features/calibrationPixi/calibrationPixiIndex';

export const CalibrationPixiPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <CalibrationPixiIndex />
    </Box>
  );
};
