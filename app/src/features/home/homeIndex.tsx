import { useNavigate } from 'react-router';

import {
  Article,
  Extension,
  FastForward,
  Gamepad,
  Gavel,
  Info,
  Login,
  Mic,
  MusicNote,
  Piano,
  Settings,
  SyncAlt,
  Timer,
  TouchApp,
  ViewList,
} from '@mui/icons-material';
import { Box, Button, Grid, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { RouteMap } from '../../routes';

export const HomeIndex = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const menuItems = [
    {
      title: t('MIDI Device'),
      icon: <Piano />,
      path: RouteMap.midiDevice.path,
    },
    {
      title: t('MIDI Communication'),
      icon: <SyncAlt />,
      path: RouteMap.midiCommunication.path,
    },
    {
      title: t('MIDI Recorder'),
      icon: <Mic />,
      path: RouteMap.midiRecorder.path,
    },
    {
      title: t('MIDI Sequencer'),
      icon: <FastForward />,
      path: RouteMap.midiSequencer.path,
    },
    {
      title: t('Tap Tempo'),
      icon: <TouchApp />,
      path: RouteMap.tapTempo.path,
    },
    {
      title: t('Calibration'),
      icon: <Timer />,
      path: RouteMap.calibration.path,
    },
    {
      title: t('Calibration PixiJS'),
      icon: <Timer />,
      path: RouteMap.calibrationPixi.path,
    },
    {
      title: t('SIGN IN'),
      icon: <Login />,
      path: RouteMap.signin.path,
    },
    {
      title: t('PREFERENCE'),
      icon: <Settings />,
      path: RouteMap.preference.path,
    },
    {
      title: t('License'),
      icon: <Gavel />,
      path: RouteMap.license.path,
    },
    {
      title: 'About',
      icon: <Info />,
      path: RouteMap.about.path,
    },
    {
      title: t('Virtual Scroll'),
      icon: <ViewList />,
      path: RouteMap.virtualScroll.path,
    },
    {
      title: t('Native Extension'),
      icon: <Extension />,
      path: RouteMap.nativeExtension.path,
    },
    {
      title: t('Terms of use'),
      icon: <Article />,
      path: RouteMap.termsOfUse.path,
    },
    {
      title: t('Friend Jam Demo'),
      icon: <Gamepad />,
      path: RouteMap.smartDrumsMoc.path,
    },
    {
      title: t('Drum Rhythm'),
      icon: <MusicNote />,
      path: RouteMap.drumRhythm.path,
    },
    {
      title: t('Drum Rhythm (Raw)'),
      icon: <MusicNote />,
      path: RouteMap.drumRhythmRaw.path,
    },
    {
      title: t('Drum Rhythm Calibration'),
      icon: <Settings />,
      path: RouteMap.drumRhythmCalibration.path,
    },
    {
      title: 'Drum Rhythm 3D · Three.js',
      icon: <MusicNote />,
      path: RouteMap.drumRhythm3D.path,
    },
    {
      title: 'Drum Rhythm 3D · Babylon.js',
      icon: <MusicNote />,
      path: RouteMap.drumRhythm3DBabylon.path,
    },
    {
      title: 'Drum Rhythm 3D · Concierto (Babylon.js)',
      icon: <MusicNote />,
      path: RouteMap.drumRhythm3DBabylonConcert.path,
    },
    {
      title: 'Drum Rhythm 3D · Concierto show (Babylon.js)',
      icon: <MusicNote />,
      path: RouteMap.drumRhythm3DBabylonConcertShow.path,
    },
  ];

  return (
    <Box
      width={1}
      sx={{
        p: 2,
      }}
    >
      <Grid
        container
        spacing={{ xs: 2, md: 3 }}
        columns={{ xs: 4, sm: 8, md: 12 }}
      >
        {menuItems.map((item, index) => {
          return (
            <Grid key={index} size={{ xs: 2, sm: 4, md: 4 }}>
              <Button
                centerRipple
                color='primary'
                variant='text'
                sx={{
                  width: 1,
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  borderBottom: 1,
                  borderRight: 1,
                }}
                onClick={() => navigate(`/${RouteMap.root.path}/${item.path}`)}
              >
                {item.icon}
                <Typography variant='body1' fontWeight='bold'>
                  {item.title}
                </Typography>
              </Button>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
