import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const ChannelNumberRange = {
  min: 0x00,
  max: 0x0f,
} as const;

export const NoteNumberRange = {
  min: 0x00,
  max: 0x7f,
} as const;

export const VelocityRange = {
  min: 0x01,
  max: 0x7f,
} as const;

export enum MidiLogType {
  Send,
  Receive,
  Error,
}

export type MidiLog = {
  message: string;
  timestamp: number;
  type: MidiLogType;
};

export interface MidiCommunicationState {
  channelNumber: number;
  noteNumber: number;
  velocity: number;

  /**
   * MIDI 通信のログ
   */
  logs: MidiLog[];
}

const initialState: MidiCommunicationState = {
  channelNumber: 0x00,
  noteNumber: 0x3c,
  velocity: 0x7f,
  logs: [],
};

export type NoteOnOffPayloadAction = PayloadAction<{
  channel: number;
  note: number;
  velocity: number;
}>;

export const midiCommunicationSlice = createSlice({
  name: 'midiCommunication',
  initialState,
  reducers: {
    setChannelNumber: (state, action: PayloadAction<number>) => {
      const channel = action.payload;
      if (
        channel < ChannelNumberRange.min ||
        channel > ChannelNumberRange.max
      ) {
        return;
      }

      state.channelNumber = channel;
    },
    setNoteNumber: (state, action: PayloadAction<number>) => {
      const note = action.payload;
      if (note < NoteNumberRange.min || note > NoteNumberRange.max) {
        return;
      }

      state.noteNumber = note;
    },
    setVelocity: (state, action: PayloadAction<number>) => {
      const velocity = action.payload;
      if (velocity < VelocityRange.min || velocity > VelocityRange.max) {
        return;
      }

      state.velocity = velocity;
    },
    noteOn: (_state, _action: NoteOnOffPayloadAction) => {},
    noteOff: (_state, _action: NoteOnOffPayloadAction) => {},
    addLog: (
      state,
      action: PayloadAction<{
        type: MidiLogType;
        message: string;
        timestamp: number;
      }>
    ) => {
      state.logs.push({
        message: action.payload.message,
        timestamp: action.payload.timestamp ?? 0,
        type: action.payload.type,
      });

      if (state.logs.length > 100) {
        state.logs.shift(); // 古いものを削除
      }
    },
    clearLogs: (state) => {
      state.logs = [];
    },
  },
});

export const {
  setChannelNumber,
  setNoteNumber,
  setVelocity,
  noteOn,
  noteOff,
  addLog,
  clearLogs,
} = midiCommunicationSlice.actions;
