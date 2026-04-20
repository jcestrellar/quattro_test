import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum InitializeState {
  Idle,
  ProcessA,
  ProcessB,
  ProcessC,
  Completed,
  Error,
}

export interface AppSystemState {
  initializeState: InitializeState;
}

const initialState: AppSystemState = {
  initializeState: InitializeState.Idle,
};

export const appSystemSlice = createSlice({
  name: 'appSystem',
  initialState,
  reducers: {
    initializeApp: (_state) => {},
    setInitializeState: (state, action: PayloadAction<InitializeState>) => {
      state.initializeState = action.payload;
    },
  },
});

export const { initializeApp, setInitializeState } = appSystemSlice.actions;
