import { Box } from '@mui/material';
import { NativeExtensionIndex } from '../../features/nativeExtension/nativeExtensionIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const NativeExtensionPage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <NativeExtensionIndex />
    </Box>
  );
};
