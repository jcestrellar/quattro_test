import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { CalibrationIndex } from '../../features/calibration/calibrationIndex';

export const CalibrationPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <CalibrationIndex />
    </Box>
  );
};
