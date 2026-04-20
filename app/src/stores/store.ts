import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';
import { watchAppSystem } from './appSystem/appSystemSaga';
import { appSystemSlice } from './appSystem/appSystemSlice';
import { watchBleDevice } from './bleDevice/bleDeviceSaga';
import { bleDeviceSlice } from './bleDevice/bleDeviceSlice';
import { watchMidiCommunication } from './midiCommunication/midiCommunicationSaga';
import { midiCommunicationSlice } from './midiCommunication/midiCommunicationSlice';
import { watchMidiDevice } from './midiDevice/midiDeviceSaga';
import { midiDeviceSlice } from './midiDevice/midiDeviceSlice';
import { preferenceSlice } from './preference/preferenceSlice';
import { userSlice } from './user/userSlice';

const sagaMiddleware = createSagaMiddleware(); // Saga Middleware を作成

export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
    preference: preferenceSlice.reducer,
    bleDevice: bleDeviceSlice.reducer,
    midiDevice: midiDeviceSlice.reducer,
    midiCommunication: midiCommunicationSlice.reducer,
    appSystem: appSystemSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware), // Thunkを無効化せず Saga を追加
});

function* rootSaga() {
  yield all([
    watchBleDevice(),
    watchMidiDevice(),
    watchMidiCommunication(),
    watchAppSystem(),
  ]);
}
sagaMiddleware.run(rootSaga); // Sagaを起動

// `RootState` と `AppDispatch` の型をストア自体から推論する
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
