import { Box } from '@mui/material';
import { HomeIndex } from '../../features/home/homeIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';

export const HomePage = () => {
  const insets = useSafeAreaInsets();
  const appBarHeight = useAppBarHeight();

  return (
    <Box
      width={'100%'}
      height={'100%'}
      pt={appBarHeight}
      pl={insets.left}
      pb={insets.bottom}
      pr={insets.right}
    >
      <HomeIndex />
    </Box>
  );
};
