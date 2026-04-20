import { Box } from '@mui/material';
import { LicenseIndex } from '../../features/license/licenseIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const LicensePage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <LicenseIndex />
    </Box>
  );
};
