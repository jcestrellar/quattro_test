import { OpenInNew, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingOverlay } from '../../components/loadingOverlay';
import { Quattro } from '../../functions/quattro/quattro';
import { SystemDevice } from '../../functions/systemDevice';
import { useIsLandscape } from '../../hooks/useIsLandecape';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { AppDispatch, RootState } from '../../stores/store';
import { clearErrorMessage, signin } from '../../stores/user/userSlice';

export const SignInIndex = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const signinProcessing = useSelector(
    (state: RootState) => state.user.processing
  );
  const errorMessage = useSelector(
    (state: RootState) => state.user.errorMessage
  );
  const isLandscape = useIsLandscape();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      dispatch(clearErrorMessage());
    };
  }, [dispatch]);

  return (
    <>
      <LoadingOverlay open={signinProcessing} />
      <Stack
        pt={24}
        pl={16 + insets.left}
        pr={16 + insets.right}
        gap={16}
        direction={isLandscape ? 'row' : 'column'}
      >
        <Stack gap={16}>
          <img src={'./assets/roland_logo.png'} width={160} alt='' />
          <Typography variant='h6'>
            {t('Signin with your Roland account')}
          </Typography>
        </Stack>
        <Stack gap={16} flexGrow={1}>
          <TextField
            fullWidth
            size='small'
            label='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            fullWidth
            size='small'
            label='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      aria-label={
                        showPassword ? t('Hide password') : t('Show password')
                      }
                      sx={{ color: 'Gray' }}
                      onMouseDown={(e) => e.preventDefault()} // フォーカスを外さない
                      onClick={() => {
                        setShowPassword(!showPassword);
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {errorMessage === '' ? null : (
            <Typography color='error' variant='body2' role='alert'>
              {errorMessage}
            </Typography>
          )}
          <Button
            fullWidth
            variant='contained'
            onClick={() => {
              console.log(SystemDevice.os);
              console.log(SystemDevice.isRunningOnQuattro);
              dispatch(signin({ email: email, password: password }));
            }}
          >
            {t('Signin')}
          </Button>
          <Button
            aria-label={`${t('Reset your password')}(${t('External link')})`}
            fullWidth
            onClick={() => Quattro.fs.exec('https://forget-password')}
          >
            {t('Reset your password')}
            <OpenInNew fontSize='small' sx={{ p: 2 }} />
          </Button>
          <Button
            aria-label={`${t('Create new account')}(${t('External link')})`}
            fullWidth
            variant='contained'
            sx={{
              bgcolor: 'lightgray',
              color: 'black',
            }}
            onClick={() => Quattro.fs.exec('https://create-account')}
          >
            {t('Create new account')}
            <OpenInNew fontSize='small' sx={{ p: 2 }} />
          </Button>
        </Stack>
      </Stack>
    </>
  );
};
