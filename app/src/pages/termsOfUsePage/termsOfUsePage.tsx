import { Box } from '@mui/material';
import { TermsOfUseIndex } from '../../features/termsOfUse/termsOfUseIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const TermsOfUsePage = () => {
  const appBarHeight = useAppBarHeight();
  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      <TermsOfUseIndex />
    </Box>
  );
};
