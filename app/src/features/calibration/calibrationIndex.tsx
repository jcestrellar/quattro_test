import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../stores/store';
import {
  setAudioOutputLatencySec,
  setCalibrationDone,
  setInputOffsetSec,
} from '../../stores/preference/preferenceSlice';
import { Quattro } from '../../functions/quattro/quattro';
import { StorageKey } from '../../functions/quattro/quattroApp/storageKey';
import { RouteMap } from '../../routes';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import type { CalibrationResult } from './calibrationMath';
import { calculateCalibrationResult, secPerBeat } from './calibrationMath';
import { useMidiNoteOn } from './useMidiNoteOn';

const BPM = 80;
const COUNT_IN_BEATS = 4;
// Visible range of the scatter plot in ms (±)
const PLOT_RANGE_MS = 100;

enum Phase {
  WaitToStart,
  CountIn,
  Measuring,
  ResultFail,
  ResultSuccess,
}

// ── Scatter plot ─────────────────────────────────────────────────────────────

const DeviationPlot = ({ deviationsMs }: { deviationsMs: number[] }) => {
  const W = 280;
  const H = 48;
  const mid = W / 2;

  const clamp = (v: number) =>
    Math.max(-PLOT_RANGE_MS, Math.min(PLOT_RANGE_MS, v));
  const toX = (ms: number) => mid + (clamp(ms) / PLOT_RANGE_MS) * mid;

  return (
    <Box sx={{ width: W, userSelect: 'none' }}>
      <svg width={W} height={H}>
        {/* axis */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke='#555' strokeWidth={1} />
        {/* zero tick */}
        <line x1={mid} y1={H / 2 - 8} x2={mid} y2={H / 2 + 8} stroke='#888' strokeWidth={1} />
        {/* hit dots */}
        {deviationsMs.map((ms, i) => (
          <circle
            key={i}
            cx={toX(ms)}
            cy={H / 2}
            r={5}
            fill={ms > 0 ? '#f97316' : '#38bdf8'}
            opacity={0.8}
          />
        ))}
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant='caption' color='info.main'>
          ← early
        </Typography>
        <Typography variant='caption' color='text.disabled'>
          0
        </Typography>
        <Typography variant='caption' color='warning.main'>
          late →
        </Typography>
      </Box>
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const CalibrationIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const activeMidiDevice = useSelector(
    (s: RootState) => s.midiDevice.activeMidiDevice,
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<Phase>(Phase.WaitToStart);
  const hitTimesRef = useRef<number[]>([]);
  const musicStartMsRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>(Phase.WaitToStart);
  const [countBeat, setCountBeat] = useState<number>(0);
  const [feedbackAlpha, setFeedbackAlpha] = useState<number>(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [audioError, setAudioError] = useState<boolean>(false);

  const spb = secPerBeat(BPM);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const startSession = () => {
    if (audioError) return;
    hitTimesRef.current = [];
    setCountBeat(0);
    setFeedbackAlpha(0);
    setResult(null);

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;

    musicStartMsRef.current = performance.now();
    audio.play().catch(console.error);
    setPhaseSync(Phase.CountIn);
  };

  const finishSession = () => {
    const hits = hitTimesRef.current;

    let audioOutputLatency = 0;
    try {
      const ac = new AudioContext();
      audioOutputLatency = ac.outputLatency ?? ac.baseLatency ?? 0;
      ac.close();
      // eslint-disable-next-line no-empty
    } catch {}

    const r = calculateCalibrationResult(hits, BPM, audioOutputLatency);

    if (r === null) {
      setPhaseSync(Phase.ResultFail);
      return;
    }

    setResult(r);
    // For rhythm-game compensation: store the SIGNED total end-to-end offset.
    // Do NOT subtract audio output — the player hears the beat with that delay,
    // so the game engine must compensate for the whole chain.
    const totalSec = r.signedTotalMs / 1000;
    const audioOutSec = r.audioOutputLatencyMs / 1000;
    dispatch(setInputOffsetSec(totalSec));
    dispatch(setAudioOutputLatencySec(audioOutSec));
    dispatch(setCalibrationDone(true));
    Quattro.app.setStorage2(StorageKey.InputOffsetSec, String(totalSec));
    Quattro.app.setStorage2(
      StorageKey.AudioOutputLatencySec,
      String(audioOutSec),
    );
    Quattro.app.setStorage2(StorageKey.CalibrationDone, 'true');
    setPhaseSync(Phase.ResultSuccess);
  };

  const handleNoteOn = (_note: number, _velocity: number) => {
    switch (phaseRef.current) {
      case Phase.WaitToStart:
        startSession();
        break;

      case Phase.Measuring: {
        const hitSec = (performance.now() - musicStartMsRef.current) / 1000;
        hitTimesRef.current.push(hitSec);
        setFeedbackAlpha(1);
        break;
      }

      case Phase.ResultFail:
        setPhaseSync(Phase.WaitToStart);
        break;

      case Phase.ResultSuccess:
        navigate(`/${RouteMap.root.path}/${RouteMap.preference.path}`);
        break;

      default:
        break;
    }
  };

  useMidiNoteOn(handleNoteOn);

  // RAF loop: count-in beat sync + "Detected" fade-out
  useEffect(() => {
    const loop = (ts: number) => {
      const dt = prevTimeRef.current ? (ts - prevTimeRef.current) / 1000 : 0;
      prevTimeRef.current = ts;

      const audio = audioRef.current;
      const currentPhase = phaseRef.current;

      if (currentPhase === Phase.CountIn && audio) {
        const beat = Math.floor(audio.currentTime / spb);
        setCountBeat(Math.min(beat + 1, COUNT_IN_BEATS));

        if (audio.currentTime >= spb * COUNT_IN_BEATS) {
          setPhaseSync(Phase.Measuring);
        }
      }

      if (currentPhase === Phase.Measuring) {
        setFeedbackAlpha((a) => Math.max(0, a - dt * 3));
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [spb]);

  // Audio ended event
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (phaseRef.current === Phase.Measuring) {
        finishSession();
      }
    };

    const onError = () => setAudioError(true);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Device disconnection: cancel session and go home
  useEffect(() => {
    const p = phaseRef.current;
    if (
      activeMidiDevice === undefined &&
      (p === Phase.CountIn || p === Phase.Measuring)
    ) {
      audioRef.current?.pause();
      navigate(`/${RouteMap.root.path}/${RouteMap.home.path}`);
    }
  }, [activeMidiDevice, navigate]);

  // Keyboard debug (dev only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') handleNoteOn(38, 100);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── UI ────────────────────────────────────────────────────────────────────

  const lagLabel = () => {
    if (!result) return '';
    const { signedTotalMs } = result;
    if (signedTotalMs > 0)
      return t('{{ms}}ms late', { ms: signedTotalMs });
    if (signedTotalMs < 0)
      return t('{{ms}}ms early', { ms: Math.abs(signedTotalMs) });
    return t('Perfect timing');
  };

  const mainText = () => {
    if (audioError) return t('Audio file not found');
    switch (phase) {
      case Phase.WaitToStart:
        return t('Hit any pad on each tick you hear.');
      case Phase.CountIn:
        return countBeat > 0 ? String(countBeat) : '';
      case Phase.Measuring:
        return '';
      case Phase.ResultFail:
        return t("There isn't enough data to get an accurate result.");
      case Phase.ResultSuccess:
        return lagLabel();
    }
  };

  const subtitleText = () => {
    switch (phase) {
      case Phase.WaitToStart:
        return audioError ? '' : t('Hit any pad when you are ready.');
      case Phase.ResultFail:
        return t('Hit any pad to try again');
      case Phase.ResultSuccess:
        return t('Hit any pad to continue');
      default:
        return '';
    }
  };

  const mainColor = () => {
    if (phase === Phase.ResultFail) return 'error.main';
    if (phase === Phase.ResultSuccess) {
      if (!result) return 'text.primary';
      return result.signedTotalMs > 0 ? 'warning.main' : 'info.main';
    }
    return 'text.primary';
  };

  const signedMs = (ms: number) => `${ms > 0 ? '+' : ''}${ms}ms`;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pl: 16 + insets.left,
        pr: 16 + insets.right,
        pb: 16 + insets.bottom,
        gap: 3,
        backgroundColor: 'background.default',
      }}
    >
      <audio ref={audioRef} src='assets/calibration.ogg' preload='auto' />

      <Typography
        variant='h4'
        textAlign='center'
        color={mainColor()}
        sx={{ fontWeight: 'bold' }}
      >
        {mainText()}
      </Typography>

      {phase === Phase.ResultSuccess && result && (
        <>
          <DeviationPlot deviationsMs={result.deviationsMs} />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minWidth: 300,
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2' color='text.primary'>
                {t('Total end-to-end (for compensation)')}
              </Typography>
              <Typography variant='body2' color='text.primary' fontWeight='bold'>
                {signedMs(result.signedTotalMs)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2' color='text.secondary'>
                {t('Audio output (browser-reported)')}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {result.audioOutputLatencyMs}ms
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2' color='text.secondary'>
                {t('Input lag + reaction noise')}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {signedMs(result.inputPlusReactionMs)}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mt: 1,
                pt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant='caption' color='text.disabled'>
                {t('Spread (±1σ)')}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                ±{result.stdDevMs}ms · {result.hitCount} {t('hits')}
              </Typography>
            </Box>
          </Box>

          <Typography
            variant='caption'
            color='text.disabled'
            textAlign='center'
            sx={{ maxWidth: 340, px: 2 }}
          >
            {t(
              'Input lag + reaction is what remains after audio output. For a trained player on many hits, reaction noise averages near 0, so the rest is MIDI input lag.',
            )}
          </Typography>
        </>
      )}

      <Typography variant='body1' textAlign='center' color='text.secondary'>
        {subtitleText()}
      </Typography>

      <Typography
        variant='h5'
        textAlign='center'
        sx={{ opacity: feedbackAlpha, color: 'success.main' }}
      >
        {t('Detected')}
      </Typography>
    </Box>
  );
};
