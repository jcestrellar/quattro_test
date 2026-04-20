import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../stores/store';
import { setInputOffsetSec } from '../../../stores/preference/preferenceSlice';
import type { ScoreState } from '../scoring';
import type { ChartMeta } from '../chartTypes';
import { JUDGEMENT_COLORS, type Judgement } from '../scoring';
import { RouteMap } from '../../../routes';

interface ScoreHudProps {
  score: ScoreState;
  phase: 'idle' | 'playing' | 'result';
  meta: ChartMeta | null;
  calibrationDone: boolean;
  inputOffsetSec: number;
  onCalibrate: () => void;
  judgementFlash?: { j: Judgement; k: number } | null;
}

export const ScoreHud = ({ score, phase, meta, calibrationDone, inputOffsetSec, onCalibrate, judgementFlash }: ScoreHudProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Local string state so the user can type freely; commit on blur/enter
  const [offsetStr, setOffsetStr] = useState(() => String(Math.round(inputOffsetSec * 1000)));

  const commitOffset = () => {
    const ms = parseInt(offsetStr, 10);
    if (!isNaN(ms)) {
      dispatch(setInputOffsetSec(ms / 1000));
    } else {
      setOffsetStr(String(Math.round(inputOffsetSec * 1000)));
    }
  };

  if (phase === 'result') {
    const accuracy =
      score.totalNotes > 0 ? Math.round((score.hitNotes / score.totalNotes) * 100) : 0;
    return (
      <Box
        display='flex'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        bgcolor='rgba(0,0,0,0.82)'
        gap={2}
        sx={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
      >
        {meta && (
          <Typography variant='h6' color='white' fontWeight='bold'>
            {meta.name}
          </Typography>
        )}
        <Typography variant='h3' color='#ffd700' fontWeight='bold'>
          {Math.round(score.score).toLocaleString()}
        </Typography>
        <Box display='flex' gap={4}>
          <Box textAlign='center'>
            <Typography color='#aaa' variant='caption'>{t('Max combo')}</Typography>
            <Typography color='white' variant='h5' fontWeight='bold'>×{score.maxCombo}</Typography>
          </Box>
          <Box textAlign='center'>
            <Typography color='#aaa' variant='caption'>{t('Accuracy')}</Typography>
            <Typography color='white' variant='h5' fontWeight='bold'>{accuracy}%</Typography>
          </Box>
        </Box>
        <Box display='flex' gap={2} mt={2}>
          <Button variant='contained' onClick={() => window.location.reload()}>
            {t('Play again')}
          </Button>
          <Button
            variant='outlined'
            sx={{ color: 'white', borderColor: 'white' }}
            onClick={() => navigate(`/${RouteMap.root.path}/${RouteMap.home.path}`)}
          >
            Home
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      {!calibrationDone && (
        <Box position='absolute' top={8} left={0} right={0} px={2} sx={{ pointerEvents: 'auto' }}>
          <Alert
            severity='info'
            action={
              <Button color='inherit' size='small' onClick={onCalibrate}>
                {t('Calibrate now')}
              </Button>
            }
          >
            {t('Calibration recommended')}
          </Alert>
        </Box>
      )}

      <Box
        position='absolute'
        top={calibrationDone ? 8 : 60}
        right={12}
        display='flex'
        flexDirection='column'
        alignItems='flex-end'
        sx={{ pointerEvents: 'none' }}
      >
        <Typography variant='caption' color='#aaa'>{t('Score')}</Typography>
        <Typography variant='h5' color='white' fontWeight='bold' lineHeight={1}>
          {Math.round(score.score).toLocaleString()}
        </Typography>
        {score.combo > 2 && (
          <Typography variant='body2' color='#ffd700' fontWeight='bold'>
            ×{score.combo} {t('Combo')}
          </Typography>
        )}
      </Box>

      {/* Animated judgement popup — keyed so the animation re-fires on every hit */}
      {judgementFlash && (
        <Box
          key={judgementFlash.k}
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: '28%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            '@keyframes judgementPop': {
              '0%':   { opacity: 1,   transform: 'translateX(-50%) scale(0.55) translateY(0px)' },
              '18%':  { opacity: 1,   transform: 'translateX(-50%) scale(1.15) translateY(-8px)' },
              '42%':  { opacity: 1,   transform: 'translateX(-50%) scale(0.98) translateY(-14px)' },
              '100%': { opacity: 0,   transform: 'translateX(-50%) scale(0.85) translateY(-38px)' },
            },
            animation: 'judgementPop 0.72s cubic-bezier(0.22,1,0.36,1) forwards',
          }}
        >
          <Typography
            variant='h4'
            fontWeight='black'
            sx={{
              color: JUDGEMENT_COLORS[judgementFlash.j],
              textShadow: `0 0 18px ${JUDGEMENT_COLORS[judgementFlash.j]}, 0 2px 8px rgba(0,0,0,0.9)`,
              letterSpacing: 2,
              userSelect: 'none',
            }}
          >
            {judgementFlash.j.toUpperCase()}
          </Typography>
        </Box>
      )}

      {/* Manual offset control — always visible in bottom-left */}
      <Box
        position='absolute'
        bottom={8}
        left={8}
        display='flex'
        alignItems='center'
        gap={1}
        sx={{ pointerEvents: 'auto' }}
      >
        <TextField
          size='small'
          value={offsetStr}
          onChange={(e) => setOffsetStr(e.target.value)}
          onBlur={commitOffset}
          onKeyDown={(e) => { if (e.key === 'Enter') commitOffset(); }}
          inputProps={{ inputMode: 'numeric', style: { width: 56, color: 'white', textAlign: 'right', fontSize: 13 } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
            },
          }}
        />
        <Typography variant='caption' color='#aaa'>ms offset</Typography>
      </Box>

      {phase === 'idle' && (
        <Box
          display='flex'
          alignItems='center'
          justifyContent='center'
          sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <Typography variant='h5' color='white' fontWeight='bold' textAlign='center'>
            {t('Press any pad to start')}
            {meta && (
              <>
                <br />
                <Typography component='span' variant='body2' color='#aaa'>
                  {meta.name} — {meta.artist}
                </Typography>
              </>
            )}
          </Typography>
        </Box>
      )}
    </>
  );
};
