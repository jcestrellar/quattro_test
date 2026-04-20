import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { IncDecSimpleSlider } from '../../../components/incDecSimpleSlider';
import {
  addLog,
  ChannelNumberRange,
  clearLogs,
  MidiLogType,
  NoteNumberRange,
  noteOff,
  noteOn,
  setChannelNumber,
  setNoteNumber,
  setVelocity,
  VelocityRange,
} from '../../../stores/midiCommunication/midiCommunicationSlice';
import { AppDispatch, RootState, store } from '../../../stores/store';
import { usePressHandlers } from './usePressHandlers';

const ChannelNumberSliderContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const channelNumber = useSelector<RootState, number>(
    (state) => state.midiCommunication.channelNumber
  );

  return (
    <Stack>
      <Typography id='channel-number-label'>
        {`${t('Channel No')}: ${channelNumber} (0x${channelNumber.toString(16).padStart(2, '0').toUpperCase()})`}
      </Typography>
      <IncDecSimpleSlider
        slotProps={{
          slider: {
            value: channelNumber,
            min: ChannelNumberRange.min,
            max: ChannelNumberRange.max,
            'aria-labelledby': 'channel-number-label',
            onChange: (_, value) => {
              if (typeof value === 'number') dispatch(setChannelNumber(value));
            },
          },
        }}
        onDecrement={() => dispatch(setChannelNumber(channelNumber - 1))}
        onIncrement={() => dispatch(setChannelNumber(channelNumber + 1))}
      />
    </Stack>
  );
};

const NoteNumberSliderContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const noteNumber = useSelector<RootState, number>(
    (state) => state.midiCommunication.noteNumber
  );

  return (
    <Stack>
      <Typography id='note-number-label'>
        {`${t('Note No')}: ${noteNumber} (0x${noteNumber.toString(16).padStart(2, '0').toUpperCase()})`}
      </Typography>
      <IncDecSimpleSlider
        slotProps={{
          slider: {
            value: noteNumber,
            min: NoteNumberRange.min,
            max: NoteNumberRange.max,
            'aria-labelledby': 'note-number-label',
            onChange: (_, value) => {
              if (typeof value === 'number') dispatch(setNoteNumber(value));
            },
          },
        }}
        onDecrement={() => dispatch(setNoteNumber(noteNumber - 1))}
        onIncrement={() => dispatch(setNoteNumber(noteNumber + 1))}
      />
    </Stack>
  );
};

const VelocitySliderContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const velocity = useSelector<RootState, number>(
    (state) => state.midiCommunication.velocity
  );

  return (
    <Stack>
      <Typography id='velocity-label'>
        {`${t('Velocity')}: ${velocity} (0x${velocity.toString(16).padStart(2, '0').toUpperCase()})`}
      </Typography>
      <IncDecSimpleSlider
        slotProps={{
          slider: {
            value: velocity,
            min: VelocityRange.min,
            max: VelocityRange.max,
            'aria-labelledby': 'velocity-label',
            onChange: (_, value) => {
              if (typeof value === 'number') dispatch(setVelocity(value));
            },
          },
        }}
        onDecrement={() => dispatch(setVelocity(velocity - 1))}
        onIncrement={() => dispatch(setVelocity(velocity + 1))}
      />
    </Stack>
  );
};

export const MidiSendIndex = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const pressHandlers = usePressHandlers({
    onPressStart: () => sendNoteOn(),
    onPressEnd: () => sendNoteOff(),
  });

  function sendNoteOn() {
    const { channelNumber, noteNumber, velocity } =
      store.getState().midiCommunication;
    dispatch(
      noteOn({
        channel: channelNumber,
        note: noteNumber,
        velocity: velocity,
      })
    );
  }

  function sendNoteOff() {
    const { channelNumber, noteNumber, velocity } =
      store.getState().midiCommunication;
    dispatch(
      noteOff({
        channel: channelNumber,
        note: noteNumber,
        velocity: velocity,
      })
    );
  }

  function handleAddReceivedDemoLog() {
    dispatch(
      addLog({
        type: MidiLogType.Receive,
        message: Math.random().toString(),
        timestamp: 0,
      })
    );
  }

  function handleAddErrorDemoLog() {
    dispatch(
      addLog({
        type: MidiLogType.Error,
        message: Math.random().toString(),
        timestamp: 0,
      })
    );
  }

  function handleClearLog() {
    dispatch(clearLogs());
  }

  return (
    <Stack width={'100%'} gap={8} pl={16} pr={16}>
      <ChannelNumberSliderContent />
      <NoteNumberSliderContent />
      <VelocitySliderContent />
      <Button {...pressHandlers} variant='contained'>
        {t('Play Note (Hold)')}
      </Button>
      <Stack direction={'row'}>
        <Button onClick={handleAddReceivedDemoLog}>{t('RECEIVE DEMO')}</Button>
        <Button onClick={handleAddErrorDemoLog}>{t('ERROR DEMO')}</Button>
        <Button onClick={handleClearLog}>{t('CLEAR')}</Button>
      </Stack>
    </Stack>
  );
};
