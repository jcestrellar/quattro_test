import { Box } from '@mui/material';
import { AboutIndex } from '../../features/about/about';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const AboutPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} p={16} pt={appBarHeight + 16}>
      <AboutIndex />
    </Box>
  );
};
