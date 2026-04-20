import { TaskAlt } from '@mui/icons-material';
import { Stack, Typography, Button } from '@mui/material';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../stores/store';
import { signOut } from '../../stores/user/userSlice';
import { useTranslation } from 'react-i18next';

export const SignOutIndex = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  return (
    <>
      <Stack
        width={'100%'}
        height={'100%'}
        justifyContent={'center'}
        alignItems={'center'}
      >
        <Stack spacing={8}>
          <Stack direction={'row'} spacing={8}>
            <TaskAlt color='success' />
            <Typography variant='body1'>{t('Signed In')}</Typography>
          </Stack>
          <Button variant='contained' onClick={() => dispatch(signOut())}>
            {t('Signout')}
          </Button>
        </Stack>
      </Stack>
    </>
  );
};
