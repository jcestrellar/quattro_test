import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { DrumRhythmCalibration } from '../../features/drumRhythm/drumRhythmCalibration';

export const DrumRhythmCalibrationPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width="100%" height={`calc(100dvh - ${appBarHeight}px)`}>
      <DrumRhythmCalibration />
    </Box>
  );
};
