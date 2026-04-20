import { Box } from '@mui/material';
import { PreferenceIndex } from '../../features/preference/preferenceIndex';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';

export const PreferencePage = () => {
  const insets = useSafeAreaInsets();
  const appBarHeight = useAppBarHeight();

  return (
    <>
      <Box
        width={'100%'}
        height={'100%'}
        pt={appBarHeight}
        pl={insets.left + 16}
        pr={insets.right + 16}
      >
        <PreferenceIndex />
      </Box>
    </>
  );
};
