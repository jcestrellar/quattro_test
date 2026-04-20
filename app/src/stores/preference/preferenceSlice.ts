import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Quattro } from '../../functions/quattro/quattro';
import { StorageKey } from '../../functions/quattro/quattroApp/storageKey';

export enum AppLanguage {
  Jp = 'Jp',
  En = 'En',
}

export enum AppearanceMode {
  Light = 'Light',
  Dark = 'Dark',
  System = 'System',
}

export interface CounterState {
  language: AppLanguage;
  appearance: AppearanceMode;
  optin: boolean;
  webMidiEnabled: boolean;
  inputOffsetSec: number;
  audioOutputLatencySec: number;
  calibrationDone: boolean;
}

const initialState: CounterState = {
  language:
    (Quattro.app.storage2(StorageKey.AppLanguage) as AppLanguage) ??
    AppLanguage.En,
  appearance:
    (Quattro.app.storage2(StorageKey.AppearanceMode) as AppearanceMode) ??
    AppearanceMode.System,
  optin:
    (Quattro.app.storage2(StorageKey.Optin) as string) === 'false'
      ? false
      : true, // default
  webMidiEnabled:
    (Quattro.app.storage2(StorageKey.WebMidiEnabled) as string) === 'true'
      ? true
      : false, // default
  inputOffsetSec:
    parseFloat(Quattro.app.storage2(StorageKey.InputOffsetSec) ?? '0') || 0,
  audioOutputLatencySec:
    parseFloat(Quattro.app.storage2(StorageKey.AudioOutputLatencySec) ?? '0') ||
    0,
  calibrationDone:
    (Quattro.app.storage2(StorageKey.CalibrationDone) as string) === 'true',
};

export const preferenceSlice = createSlice({
  name: 'preference',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<AppLanguage>) => {
      state.language = action.payload;
    },
    setAppearanceMode: (state, action: PayloadAction<AppearanceMode>) => {
      state.appearance = action.payload;
    },
    setOptin: (state, action: PayloadAction<boolean>) => {
      state.optin = action.payload;
    },
    setWebMidiEnabled: (state, action: PayloadAction<boolean>) => {
      state.webMidiEnabled = action.payload;
    },
    setInputOffsetSec: (state, action: PayloadAction<number>) => {
      state.inputOffsetSec = action.payload;
    },
    setAudioOutputLatencySec: (state, action: PayloadAction<number>) => {
      state.audioOutputLatencySec = action.payload;
    },
    setCalibrationDone: (state, action: PayloadAction<boolean>) => {
      state.calibrationDone = action.payload;
    },
  },
});

export const {
  setAppearanceMode,
  setLanguage,
  setOptin,
  setWebMidiEnabled,
  setInputOffsetSec,
  setAudioOutputLatencySec,
  setCalibrationDone,
} = preferenceSlice.actions;
