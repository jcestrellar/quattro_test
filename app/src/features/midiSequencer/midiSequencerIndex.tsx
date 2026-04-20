import { ErrorOutline } from '@mui/icons-material';
import { Box, Button, Slider, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { IncDecSimpleSlider } from '../../components/incDecSimpleSlider';
import { Quattro } from '../../functions/quattro/quattro';
import { OsType, SystemDevice } from '../../functions/systemDevice';
import { useIsLandscape } from '../../hooks/useIsLandecape';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { midiDeviceConnectedSelector } from '../../stores/midiDevice/midiDeviceSlice';
import { RootState } from '../../stores/store';

const TempoRange = {
  min: 10,
  max: 480,
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MidiSequencerIndex = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLandscape = useIsLandscape();
  const [isLoaded, setIsLoaded] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedBeats, setElapsedBeats] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);
  const [bpm, setBpm] = useState(Quattro.seq.tempo());
  const isConnected = useSelector<RootState, boolean>(
    midiDeviceConnectedSelector
  );
  const isSeekingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribeEventImportFilename = Quattro.app.onEventCommand(
      async (param1, param2) => {
        if (param1 === 'import') {
          const file = param2 as string;
          if (file !== '') {
            await loadFile(file);
          }
        }
      }
    );

    const unsubscribeEventOpenFilename = Quattro.fs.onEventOpenFilename(
      async (file: string) => {
        if (file !== '') {
          await loadFile(file);
        }
      }
    );

    const unsubscribeEventStop = Quattro.seq.onEventStop(() => {
      setIsPlaying(false);
      stopTimer();
    });

    return () => {
      unsubscribeEventImportFilename();
      unsubscribeEventOpenFilename();
      unsubscribeEventStop();
      stopTimer();
    };
  }, []);

  const loadFile = async (file: string) => {
    try {
      const data = await Quattro.fs.readData(file);
      const loaded = Quattro.seq.load(data);
      if (!loaded) {
        throw new Error('❌読み込みに失敗しました');
      }
      setFilename(file.split('/').pop() ?? file);
      setElapsedBeats(0);
      setTotalBeats(Quattro.seq.totalBeats());
      setIsLoaded(true);
    } catch (e) {
      if (e instanceof Error) {
        setFilename(e.message);
        setIsLoaded(false);
        console.error('読み込み失敗', e);
      }
    }
  };

  const handleImport = () => {
    if (!SystemDevice.isRunningOnQuattro) return;

    switch (SystemDevice.os) {
      case OsType.Android:
      case OsType.iOS:
        Quattro.app.importFile({
          uti: ['public.midi-audio'],
          mime: ['audio/midi'],
        });
        break;

      case OsType.Windows:
      case OsType.Mac:
        Quattro.fs.openFilename();
        break;

      default:
        break;
    }
  };

  const startTimer = () => {
    if (intervalRef.current != null) return;

    intervalRef.current = window.setInterval(() => {
      try {
        const position = Quattro.seq.position();
        if (typeof position === 'number') {
          if (!isSeekingRef.current) {
            setElapsedBeats(position); // seek中は無視
          }
        }
      } catch (e) {
        console.warn('position取得エラー', e);
      }
    }, 50);
  };

  const stopTimer = () => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePlay = async () => {
    try {
      Quattro.seq.play();
      setIsPlaying(true);
      startTimer();
    } catch (e) {
      console.error('再生失敗', e);
    }
  };

  const handleStop = () => {
    Quattro.seq.stop();
    setIsPlaying(false);
    stopTimer();
  };

  const handleTempoDecrement = () => {
    const newBpm = Math.max(TempoRange.min, bpm - 1);
    setBpm(newBpm);
    Quattro.seq.setTempo(newBpm);
  };

  const handleTempoIncrement = () => {
    const newBpm = Math.min(TempoRange.max, bpm + 1);
    setBpm(newBpm);
    Quattro.seq.setTempo(newBpm);
  };

  return (
    <Stack
      direction={isLandscape ? 'row' : 'column'}
      gap={12}
      sx={{
        height: '100%',
        width: '100%',
        pt: 16,
        pl: 16 + insets.left,
        pr: 16 + insets.right,
      }}
    >
      <Stack
        direction={'column'}
        gap={4}
        minWidth={isLandscape ? 280 : undefined}
        overflow={'auto'}
        pb={isLandscape ? 16 + insets.bottom : undefined}
      >
        {!SystemDevice.isRunningOnQuattro && (
          <Typography
            variant='body1'
            maxWidth={isLandscape ? 280 : undefined}
            sx={(theme) => ({
              color: theme.palette.error.main,
              fontWeight: 'bold',
              display: 'flex',
              gap: 4,
            })}
          >
            <ErrorOutline />
            {t('The MIDI sequencer feature is not supported in web browsers')}
          </Typography>
        )}
        {SystemDevice.isRunningOnQuattro && !isConnected && (
          <Typography
            variant='body1'
            maxWidth={isLandscape ? 280 : undefined}
            sx={(theme) => ({
              color: theme.palette.error.main,
              fontWeight: 'bold',
              display: 'flex',
              gap: 4,
            })}
          >
            <ErrorOutline />
            {t('No MIDI device connected. Please connect first')}
          </Typography>
        )}
        <Button
          onClick={handleImport}
          variant='outlined'
          disabled={!SystemDevice.isRunningOnQuattro}
        >
          {t('Import MIDI file')}
        </Button>
        <Box>
          <Typography variant='body2'>
            {`${t('Loaded File')}: ${filename ?? '（Not Loaded）'}`}
          </Typography>
        </Box>
        <Button
          fullWidth
          onClick={handlePlay}
          disabled={!isLoaded || isPlaying}
          variant='contained'
        >
          {t('Play')}
        </Button>
        <Button
          fullWidth
          onClick={handleStop}
          disabled={!isLoaded || !isPlaying}
          variant='contained'
          color='secondary'
        >
          {t('Stop')}
        </Button>
      </Stack>
      <Box flexGrow={1}>
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
        >
          <Typography id='playback-position-label' variant='body2'>
            {t('Playback Position（Beats）')}
          </Typography>
          <Typography variant='body2'>
            {`${elapsedBeats.toFixed(1)} / ${totalBeats > 0 ? totalBeats.toFixed(1) : '???'} （${formatTime((elapsedBeats * 60) / bpm)}）`}
          </Typography>
        </Stack>
        <Box px={12}>
          <Slider
            value={Math.floor(elapsedBeats)}
            min={0}
            max={totalBeats}
            step={1}
            disabled={!isLoaded}
            aria-labelledby='playback-position-label'
            onChange={(e, value) => {
              isSeekingRef.current = true;
              setElapsedBeats(value as number);
            }}
            onChangeCommitted={(e, value) => {
              isSeekingRef.current = false;
              Quattro.seq.setLocate(value as number);
              if (isPlaying) Quattro.seq.play(); // 再生中なら再開
            }}
          />
        </Box>
        <Stack
          direction={'row'}
          justifyContent={'space-between'}
          alignItems={'center'}
        >
          <Typography id='tempo-label' variant='body2'>
            {t('Tempo（BPM）')}
          </Typography>
          <Typography variant='body2'>{bpm}</Typography>
        </Stack>
        <IncDecSimpleSlider
          disabled={!isLoaded}
          onDecrement={handleTempoDecrement}
          onIncrement={handleTempoIncrement}
          slotProps={{
            slider: {
              min: TempoRange.min,
              max: TempoRange.max,
              step: 1,
              value: bpm,
              disabled: !isLoaded,
              'aria-labelledby': 'tempo-label',
              onChange: (_, value) => setBpm(value as number),
              onChangeCommitted: (
                e: Event | React.SyntheticEvent,
                value: number | number[]
              ) => {
                const newBpm = value as number;
                setBpm(newBpm);
                Quattro.seq.setTempo(newBpm);
              },
            },
          }}
        />
      </Box>
    </Stack>
  );
};
