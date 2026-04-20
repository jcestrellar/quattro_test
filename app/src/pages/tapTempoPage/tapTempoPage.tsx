import { Box } from '@mui/material';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { TapTempoIndex } from '../../features/tapTempo/tapTempoIndex';

export const TapTempoPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <TapTempoIndex />
    </Box>
  );
};
