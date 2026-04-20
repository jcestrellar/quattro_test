import { call, delay, put, takeLeading } from 'redux-saga/effects';
import {
  initializeApp,
  InitializeState,
  setInitializeState,
} from './appSystemSlice';

function* processA() {
  yield delay(1000);
}

function* processB() {
  yield delay(500);
}

function* processC() {
  yield delay(1500);

  // 何かしらの処理に失敗し、エラーとして扱いたい場合は例外を投げる
  // throw new Error("初期化処理に失敗しました。")
}

function* initializeAppSaga() {
  try {
    yield put(setInitializeState(InitializeState.ProcessA));
    yield call(processA);
    yield put(setInitializeState(InitializeState.ProcessB));
    yield call(processB);
    yield put(setInitializeState(InitializeState.ProcessC));
    yield call(processC);
    yield put(setInitializeState(InitializeState.Completed));
  } catch {
    yield put(setInitializeState(InitializeState.Error));
  }
}

export function* watchAppSystem() {
  yield takeLeading(initializeApp.type, initializeAppSaga);
}
