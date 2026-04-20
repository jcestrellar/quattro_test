import { Box, Button, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IncDecSimpleSlider } from '../../components/incDecSimpleSlider';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { usePressHandlers } from '../midi/midiSend/usePressHandlers';
import { TapTempoEstimator } from './tapTempoEstimator';

const SampleSizeRange = {
  min: 2,
  max: 20,
} as const;

export const TapTempoIndex = () => {
  const tapTempoEstimator = useRef(new TapTempoEstimator());
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tempo, setTempo] = useState(0);
  const [sampleSize, setSampleSize] = useState(
    // TODO:
    // eslint-disable-next-line react-hooks/refs
    () => tapTempoEstimator.current.sampleSize
  );
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const tapTempoPressHandlers = usePressHandlers({
    onPressStart: () => handleTapTempo(),
  });

  useEffect(() => {
    const unsubscribeTempoChange = tapTempoEstimator.current.onTempoChange(
      (tempo: number) => {
        setTempo(Math.ceil(tempo));
      }
    );

    const unsubscribeTimestampsChange =
      tapTempoEstimator.current.onTimestampsChange((timestamps: number[]) => {
        setTimestamps(timestamps);
      });

    return () => {
      unsubscribeTempoChange();
      unsubscribeTimestampsChange();
    };
  }, []);

  const handleTapTempo = () => {
    tapTempoEstimator.current.addTap();
  };

  const handleReset = () => {
    tapTempoEstimator.current.reset();
  };

  const handleSampleSizeChange = (_: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setSampleSize(value);
    tapTempoEstimator.current.reset();
    tapTempoEstimator.current.sampleSize = value;
  };

  const handleSampleSizeIncrement = () => {
    const newSampleSize = sampleSize + 1;
    if (newSampleSize > SampleSizeRange.max) return;

    setSampleSize(newSampleSize);
    tapTempoEstimator.current.reset();
    tapTempoEstimator.current.sampleSize = newSampleSize;
  };

  const handleSampleSizeDecrement = () => {
    const newSampleSize = sampleSize - 1;
    if (newSampleSize < SampleSizeRange.min) return;

    setSampleSize(newSampleSize);
    tapTempoEstimator.current.reset();
    tapTempoEstimator.current.sampleSize = newSampleSize;
  };

  return (
    <Box
      sx={{
        pt: 16,
        pl: 16 + insets.left,
        pr: 16 + insets.right,
        pb: 16 + insets.bottom,
      }}
      display={'flex'}
      flexDirection={'column'}
      gap={12}
    >
      <Typography variant='h5'>
        {`${t('Tempo')}: ${tempo > 0 ? `${tempo} BPM` : '---'}`}
      </Typography>
      <Box display='flex' gap={1} justifyContent='center'>
        {Array.from({ length: sampleSize }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor:
                i < timestamps.length ? 'primary.main' : 'grey.400',
            }}
          />
        ))}
      </Box>
      <Button
        disableRipple
        disableElevation
        {...tapTempoPressHandlers}
        variant='contained'
        fullWidth
        sx={{
          height: 120,
          borderRadius: 2,
          fontSize: '1.5rem',
          backgroundColor: 'primary.main',
          '&:active': {
            filter: 'brightness(70%)',
          },
        }}
      >
        {t('TAP')}
      </Button>
      <Box sx={{ p: 4 }}>
        <Typography id='samplesize-label'>
          {`${t('Sample Size')}: ${sampleSize}`}
        </Typography>
        <IncDecSimpleSlider
          slotProps={{
            slider: {
              value: sampleSize,
              min: SampleSizeRange.min,
              max: SampleSizeRange.max,
              'aria-labelledby': 'samplesize-label',
              onChange: handleSampleSizeChange,
            },
          }}
          onIncrement={handleSampleSizeIncrement}
          onDecrement={handleSampleSizeDecrement}
        />
      </Box>
      <Button variant='outlined' onClick={handleReset}>
        {t('Reset tempo')}
      </Button>
    </Box>
  );
};
