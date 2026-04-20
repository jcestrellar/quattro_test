import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Quattro } from '../../functions/quattro/quattro';
import { QuattroFsWhere } from '../../functions/quattro/quattroFs/quattroFsTypes';
import { OsType, SystemDevice } from '../../functions/systemDevice';
import { midiDeviceConnectedSelector } from '../../stores/midiDevice/midiDeviceSlice';
import { RootState } from '../../stores/store';
import { MidiFilterEngine } from './midiFilterEngine/midiFilterEngine';
import { MidiFilter } from './midiFilterEngine/types';
import { MidiRecorder } from './midiRecorder';
import { MidiRecordingTimeDisplay } from './midiRecordingTimeDisplay';
import { MidiMessage, MidiRecordingState } from './types';

import { ErrorOutline } from '@mui/icons-material';
import { useIsLandscape } from '../../hooks/useIsLandecape';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import filterAll from './midiFilterEngine/filterSample/midiFilter.allow.all.json';
import filterNoteOn from './midiFilterEngine/filterSample/midiFilter.allow.noteonly.json';
import filterVDrumSample from './midiFilterEngine/filterSample/midiFilter.allow.vdrum.json';

type FilterPresetKey = keyof typeof FilterPresets;
const FilterPresets: Record<string, MidiFilter | undefined> = {
  None: undefined,
  All: filterAll,
  'Note Only': filterNoteOn,
  'VDrum Sample': filterVDrumSample,
} as const;

function formatMidiLog(log: MidiMessage): string {
  const deltaTimeStr = `[+${log.deltaTime.toString().padStart(7, ' ')}ms]`;
  // uint8arrayを16進文字列に変換
  const hexStr = Array.from(log.data)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');
  return `${deltaTimeStr} ${hexStr}`;
}

export const MidiRecorderIndex = () => {
  const midiRecorderRef = useRef(new MidiRecorder());
  const [recordingState, setRecordingState] = useState<MidiRecordingState>(
    MidiRecordingState.Stopped
  );
  const recordingStateRef = useRef(recordingState);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLandscape = useIsLandscape();
  const [hasRecordingData, setHasRecordingData] = useState(false);
  const [midiLogs, setMidiLogs] = useState<MidiMessage[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FilterPresetKey>('None');
  const isConnected = useSelector<RootState, boolean>(
    midiDeviceConnectedSelector
  );

  useEffect(() => {
    const unsubscribeLog = midiRecorderRef.current.onRecordedMessage(
      ({ deltaTime, data }) => {
        setMidiLogs((logs) => [{ deltaTime, data }, ...logs]);
      }
    );

    const unsubscribeSaveFilename = Quattro.fs.onEventSaveFilename(
      (file: string) => {
        const smfData = midiRecorderRef.current.exportAsSmfHexString();
        Quattro.fs.writeData(file, smfData);
      }
    );

    const unsubscribeEventMessage = Quattro.midi.onEventMessage(
      (msg, timestamp) => {
        const currentState = recordingStateRef.current;

        if (currentState === MidiRecordingState.Waiting) {
          // 録音対象外の MIDI メッセージは無視する
          if (!midiRecorderRef.current.shouldRecordMessage(msg)) return;

          const firstTimeStamp = timestamp;
          midiRecorderRef.current.start(firstTimeStamp);
          const added = midiRecorderRef.current.pushMessage(msg, timestamp);
          if (added) {
            setHasRecordingData(true);
            setRecordingState(MidiRecordingState.Recording);
            recordingStateRef.current = MidiRecordingState.Recording;
          }
        } else if (currentState === MidiRecordingState.Recording) {
          midiRecorderRef.current.pushMessage(msg, timestamp);
        }
      }
    );

    return () => {
      unsubscribeLog();
      unsubscribeSaveFilename();
      unsubscribeEventMessage();
    };
  }, []);

  const handleStart = () => {
    midiRecorderRef.current.reset();
    setHasRecordingData(false);
    setRecordingState(MidiRecordingState.Waiting);
    recordingStateRef.current = MidiRecordingState.Waiting;
  };

  const handleStop = () => {
    midiRecorderRef.current.stop();
    setRecordingState(MidiRecordingState.Stopped);
    recordingStateRef.current = MidiRecordingState.Stopped;
  };

  const handleExport = () => {
    if (SystemDevice.isRunningOnQuattro) {
      switch (SystemDevice.os) {
        case OsType.Android:
        case OsType.iOS: {
          const smfData = midiRecorderRef.current.exportAsSmfHexString();

          // ファイル名生成
          const path = Quattro.fs.path(QuattroFsWhere.Temporary);
          const name = 'rec';
          const prefix = (() => {
            const now = new Date();
            const yyyy = now.getFullYear().toString();
            const MM = (now.getMonth() + 1).toString().padStart(2, '0');
            const dd = now.getDate().toString().padStart(2, '0');
            const hh = now.getHours().toString().padStart(2, '0');
            const mm = now.getMinutes().toString().padStart(2, '0');
            const ss = now.getSeconds().toString().padStart(2, '0');
            return `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
          })();
          const file = `${path}${name}_${prefix}.mid`;
          try {
            // 一時ファイルを作成し、エクスポートする
            Quattro.fs.writeData(file, smfData);
            Quattro.app.exportFile(file);
          } catch (e) {
            // 一時ファイルを削除
            try {
              Quattro.fs.unlink(file);
            } catch {
              // ファイル未存在の可能性もあるので無視
            }
            console.log(e);
          }
          break;
        }

        case OsType.Windows:
        case OsType.Mac: {
          Quattro.fs.saveFilename('recmidi.mid', 'mid');
          break;
        }

        default:
          break;
      }
    } else {
      // Web ブラウザ環境では Blob でダウンロードリンク生成
      const smfData = midiRecorderRef.current.exportAsSmfBinary();
      const pure = new Uint8Array(smfData); // Blobに渡すために Uint8Array<ArrayBuffer> に変換
      const blob = new Blob([pure], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recording.mid';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const recordingStateLabel = {
    [MidiRecordingState.Stopped]: t('Stopped'),
    [MidiRecordingState.Waiting]: t('Waiting'),
    [MidiRecordingState.Recording]: t('Recording'),
  };

  const handleDelete = () => {
    midiRecorderRef.current.reset();
    setHasRecordingData(false);
    setRecordingState(MidiRecordingState.Stopped);
    recordingStateRef.current = MidiRecordingState.Stopped;
  };

  const handleClearLogs = () => {
    setMidiLogs([]);
  };

  const handleSelectPreset = (key: FilterPresetKey) => {
    setSelectedPreset(key);
    const filter = FilterPresets[key];
    if (filter) {
      midiRecorderRef.current.filterEngine = new MidiFilterEngine(filter);
    } else {
      midiRecorderRef.current.filterEngine = undefined;
    }
  };

  return (
    <Stack
      direction={isLandscape ? 'row' : 'column'}
      gap={isLandscape ? 12 : 4}
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
        overflow={isLandscape ? 'auto' : undefined}
        pb={isLandscape ? 16 + insets.bottom : undefined}
      >
        {!isConnected && (
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
        <Typography variant='h6' role='status'>
          {`${t('Recording Status')}: `}
          <Typography
            variant='h6'
            component='span'
            sx={(theme) => ({
              color:
                recordingState === MidiRecordingState.Recording
                  ? theme.palette.success.main
                  : recordingState === MidiRecordingState.Waiting
                    ? theme.palette.warning.main
                    : theme.palette.text.secondary,
            })}
          >
            {recordingStateLabel[recordingState]}
          </Typography>
        </Typography>
        <Typography variant='body1'>
          {`${t('Recording Time')}: `}
          {/* TODO: */}
          {/* eslint-disable-next-line react-hooks/refs */}
          <MidiRecordingTimeDisplay recorder={midiRecorderRef.current} />
        </Typography>
        <FormControl
          fullWidth
          disabled={
            recordingState !== MidiRecordingState.Stopped || !isConnected
          }
          sx={{ mt: 8 }}
        >
          <InputLabel>{t('Select Recording Filter')}</InputLabel>
          <Select
            size='small'
            value={selectedPreset ?? ''}
            onChange={(e) => handleSelectPreset(e.target.value)}
            label={t('Select Recording Filter')}
          >
            {Object.keys(FilterPresets).map((key) => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant='contained'
          onClick={handleStart}
          disabled={
            recordingState !== MidiRecordingState.Stopped || !isConnected
          }
        >
          {`${t('Start Recording')}`}
        </Button>
        <Button
          variant='contained'
          color='secondary'
          onClick={handleStop}
          disabled={
            recordingState === MidiRecordingState.Stopped || !isConnected
          }
        >
          {`${t('Stop Recording')}`}
        </Button>
        <Button
          variant='outlined'
          onClick={handleExport}
          disabled={
            recordingState !== MidiRecordingState.Stopped ||
            !hasRecordingData ||
            !isConnected
          }
        >
          {`${t('Save Recorded Data')}`}
        </Button>
        <Button
          variant='outlined'
          onClick={handleDelete}
          disabled={
            recordingState !== MidiRecordingState.Stopped || !hasRecordingData
          }
        >
          {`${t('Discard Recorded Data')}`}
        </Button>
        <Button
          variant='outlined'
          onClick={handleClearLogs}
          disabled={!isConnected}
        >
          {`${t('Clear Log')}`}
        </Button>
      </Stack>
      {/* ログ表示部分 */}
      <Box
        mb={16 + insets.bottom}
        sx={(theme) => ({
          flexGrow: 1,
          overflow: 'auto',
          backgroundColor: theme.palette.background.default,
          border: 1,
          borderColor: 'lightgray',
          borderRadius: 1,
          p: 1,
        })}
      >
        {midiLogs.length === 0 ? (
          <Typography variant='body2' color='textSecondary'>
            {`${t('No MIDI logs available')}`}
          </Typography>
        ) : (
          midiLogs.map((log, idx) => (
            <Typography
              key={idx}
              variant='body1'
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre',
              }}
            >
              {formatMidiLog(log)}
            </Typography>
          ))
        )}
      </Box>
    </Stack>
  );
};
