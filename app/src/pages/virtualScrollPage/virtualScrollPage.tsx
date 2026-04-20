import { Box } from '@mui/material';
import { VirtualScrollIndex } from '../../features/virtualScroll/virtualScrollIndex';

export const VirtualScrollPage = () => {
  return (
    <Box width={'100%'} height={'100%'}>
      <VirtualScrollIndex />
    </Box>
  );
};
