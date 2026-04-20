import { ArrowBack, Piano, PianoOff } from '@mui/icons-material';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { useSafeAreaInsets } from '../hooks/useSafeAreaInsets';
import { RouteMap } from '../routes';
import { midiDeviceConnectedSelector } from '../stores/midiDevice/midiDeviceSlice';

/**
 * アプリケーションの上部に表示されるカスタムアプリバーコンポーネント
 *
 * Appleデバイスのセーフエリアインセットを考慮して、`AppBar` の位置やパディングを調整する。
 * また、`appBarHidden` ステートに基づいてアプリバーを表示または非表示にする。
 */
export const MyAppBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const insets = useSafeAreaInsets();

  function canBack(): boolean {
    return RouteMap.home.path !== location.pathname.split('/').pop();
  }

  function currentRouteTitle(): string {
    const currentRoute = Object.values(RouteMap).find(
      (route) => route.path === location.pathname.split('/').pop()
    );
    return t(currentRoute?.title ?? '');
  }

  const titleRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    titleRef?.current?.focus();
  }, [location]);

  return (
    <AppBar
      position='fixed'
      sx={{
        pt: insets.top,
        pl: insets.left,
        pr: insets.right + 16,
      }}
    >
      <Toolbar variant='dense'>
        <IconButton
          aria-label={t('back')}
          size='large'
          color='inherit'
          sx={{ visibility: canBack() ? 'visible' : 'hidden' }}
          onClick={() => navigate(-1)}
        >
          <ArrowBack />
        </IconButton>
        <Typography
          ref={titleRef}
          tabIndex={-1}
          variant='h6'
          sx={{ flexGrow: 1 }}
        >
          {currentRouteTitle()}
        </Typography>
        <BleConnectionIndicator />
      </Toolbar>
    </AppBar>
  );
};

const BleConnectionIndicator = () => {
  const { t } = useTranslation();
  const connected = useSelector(midiDeviceConnectedSelector);

  return (
    <Box
      display='flex'
      alignItems='center'
      role='img'
      aria-label={connected ? t('Connected') : t('Not Connected')}
    >
      {connected ? <Piano /> : <PianoOff />}
    </Box>
  );
};
