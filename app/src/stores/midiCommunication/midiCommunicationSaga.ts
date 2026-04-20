import { eventChannel } from 'redux-saga';
import {
  call,
  put,
  race,
  select,
  take,
  takeLatest,
  takeLeading,
} from 'redux-saga/effects';
import { Quattro } from '../../functions/quattro/quattro';
import {
  connectSucceeded,
  disconnectSucceeded,
  midiDeviceConnectedSelector,
} from '../midiDevice/midiDeviceSlice';
import {
  addLog,
  ChannelNumberRange,
  MidiLogType,
  NoteNumberRange,
  noteOff,
  noteOn,
  NoteOnOffPayloadAction,
  VelocityRange,
} from './midiCommunicationSlice';

interface EventMessage {
  message: string;
  timestamp: number;
}

function createEventMessageChannel() {
  return eventChannel<EventMessage>((emitter) => {
    const unsubscribe = Quattro.midi.onEventMessage(
      (message: string, timestamp: number) => {
        emitter({ message, timestamp });
      }
    );
    return () => {
      unsubscribe?.();
    };
  });
}

interface EventError {
  error: number;
}

function createEventErrorChannel() {
  return eventChannel<EventError>((emitter) => {
    const unsubscribe = Quattro.midi.onEventError((code: number) => {
      emitter({ error: code });
    });
    return () => {
      unsubscribe?.();
    };
  });
}

function* connectSucceededSaga(): Generator {
  let unsubscribeEventMessage: (() => void) | undefined;
  let unsubscribeEventError: (() => void) | undefined;
  try {
    const messageChannel = yield call(createEventMessageChannel);
    const errorChannel = yield call(createEventErrorChannel);

    // メッセージ受信ループ
    while (true) {
      const { message, error } = yield race({
        message: take(messageChannel),
        error: take(errorChannel),
        disconnect: take(disconnectSucceeded),
      });

      if (message) {
        yield put(
          addLog({
            type: MidiLogType.Receive,
            message: message.message,
            timestamp: message.timestamp,
          })
        );
      } else if (error) {
        const code = error.error;
        const message = `MIDI Error. Error Code is ${code}`;
        yield put(
          addLog({ type: MidiLogType.Error, message: message, timestamp: 0 })
        );
      } else {
        // disconnectSucceeded を受信した場合
        break;
      }
    }
  } finally {
    unsubscribeEventMessage?.();
    unsubscribeEventError?.();
  }
}

function* send(message: string): Generator {
  Quattro.midi.send(message);
  yield put(addLog({ type: MidiLogType.Send, message: message, timestamp: 0 }));
}

function* sendNote(action: NoteOnOffPayloadAction, noteOn: boolean) {
  let { channel, note, velocity } = action.payload;

  if (channel < ChannelNumberRange.min || channel > ChannelNumberRange.max)
    channel = 0x00;
  if (note < NoteNumberRange.min || note > NoteNumberRange.max) note = 0x3c;
  if (velocity < VelocityRange.min || velocity > VelocityRange.max)
    velocity = 0x7f;

  const statusByte = ((noteOn ? 0x90 : 0x80) + channel)
    .toString(16)
    .toUpperCase(); // ノートON + チャンネル
  const noteNoHex = note.toString(16).toUpperCase().padStart(2, '0'); // ノート番号
  const velocityHex = velocity.toString(16).toUpperCase().padStart(2, '0'); // ベロシティ
  const message = `${statusByte}${noteNoHex}${velocityHex}`;
  yield call(send, message);
}

function* noteOnSaga(action: NoteOnOffPayloadAction): Generator {
  // デバイスとの接続が未完了であれば、何もしない
  const connected: ReturnType<typeof midiDeviceConnectedSelector> =
    yield select(midiDeviceConnectedSelector);
  if (!connected) {
    return;
  }

  yield call(sendNote, action, true);
}

function* noteOffSaga(action: NoteOnOffPayloadAction): Generator {
  // デバイスとの接続が未完了であれば、何もしない
  const connected: ReturnType<typeof midiDeviceConnectedSelector> =
    yield select(midiDeviceConnectedSelector);
  if (!connected) {
    return;
  }

  yield call(sendNote, action, false);
}

export function* watchMidiCommunication() {
  yield takeLeading(connectSucceeded.type, connectSucceededSaga);
  yield takeLatest(noteOn.type, noteOnSaga);
  yield takeLatest(noteOff.type, noteOffSaga);
}
