import { Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { SignOutIndex } from '../../features/signIn/signOutIndex';
import { SignInIndex } from '../../features/signIn/signinIndex';
import { useAppBarHeight } from '../../hooks/useAppBarHeight';
import { signedInSelector } from '../../stores/user/userSlice';

export const SigninPage = () => {
  const signedIn = useSelector(signedInSelector);
  const appBarHeight = useAppBarHeight();

  return (
    <Box width={'100%'} height={'100%'} pt={appBarHeight}>
      {signedIn ? <SignOutIndex /> : <SignInIndex />}
    </Box>
  );
};
