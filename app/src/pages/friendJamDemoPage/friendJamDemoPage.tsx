import { Box } from '@mui/material';
import { FriendJamDemoIndex } from '../../features/friendJamDemo';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const FriendJamDemoPage = () => {
  const appBarHeight = useAppBarHeight();

  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <FriendJamDemoIndex />
    </Box>
  );
};
