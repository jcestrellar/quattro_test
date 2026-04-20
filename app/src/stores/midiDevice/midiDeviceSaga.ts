import {
  ActionPattern,
  call,
  fork,
  put,
  select,
  take,
  takeLatest,
  takeLeading,
} from 'redux-saga/effects';
import { Quattro } from '../../functions/quattro/quattro';
import {
  QuattroMidiBleDevice,
  QuattroMidiBleDeviceState,
  QuattroMidiEndpoint,
} from '../../functions/quattro/quattroMidi/quattroMidiTypes';
import { RootState, store } from '../store';
import {
  connectBleMidiDevice,
  ConnectBleMidiDevicePayloadAction,
  connectFailed,
  connectMidiEndpoints,
  ConnectMidiEndpointsPayloadAction,
  connectSucceeded,
  disconnectBleMidiDevice,
  DisconnectBleMidiDevicePayloadAction,
  disconnectMidiEndpoints,
  disconnectSucceeded,
  setActiveMidiDevice,
  setDiscoveredDevices,
  startScanBleMidiDevice,
  stopScanBleMidiDevice,
} from './midiDeviceSlice';

function* startScanBleMidiDeviceSaga() {
  let unsubscribeEventBleMidi: (() => void) | undefined;
  try {
    // midi.event.ble を監視する
    // scanstart() のコールバックを受信したら、結果を逐次 dispatch する
    unsubscribeEventBleMidi = Quattro.midi.onEventBle(
      (devices: QuattroMidiBleDevice[]) => {
        store.dispatch(setDiscoveredDevices(devices));
      }
    );
    Quattro.midi.bleScanStart();

    // scan 停止アクションを受け取るまで待機する
    yield take(stopScanBleMidiDevice);
    Quattro.midi.bleScanStop();
  } finally {
    unsubscribeEventBleMidi?.();
  }
}

/**
 * 対象デバイスへ BLE 接続を試みる
 * @param deviceId 接続対象
 * @returns
 */
function* establishBleMidiDeviceConnection(deviceId: string): Generator {
  let unsubscribeEventBleMidi: (() => void) | undefined;

  try {
    // Promiseを使って、device が接続済みの状態となるまで待機
    yield new Promise<void>((resolve, reject) => {
      // midi.event.ble を監視する
      unsubscribeEventBleMidi = Quattro.midi.onEventBle(
        (devices: QuattroMidiBleDevice[]) => {
          const device = devices.find(
            (device) => device.state === QuattroMidiBleDeviceState.Connected
          );
          if (device) {
            resolve();
          }
        }
      );

      // BLE接続を試みる
      Quattro.midi.connectBle(deviceId);

      // タイムアウト
      setTimeout(() => reject(), 10000);
    }).catch(() => {
      throw new Error('タイムアウトしたため、接続に失敗しました。');
    });
  } finally {
    // クリーンアップ処理: イベントを解除
    unsubscribeEventBleMidi?.();
  }
}

/**
 * 接続済みデバイスの MIDI Endpoint と接続を試みる
 * @returns
 */
function* establishMidiEndpointConnection(
  input: QuattroMidiEndpoint[] | undefined = undefined,
  output: QuattroMidiEndpoint[] | undefined = undefined
): Generator {
  let unsubscribeEventChanged: (() => void) | undefined;
  try {
    // Promiseを使って、Endpoint と接続完了するまで待機
    const endpoints = yield new Promise<QuattroMidiEndpoint[][]>(
      (resolve, reject) => {
        const refreshEndpoints = () => {
          const inputEndpoints: QuattroMidiEndpoint[] =
            input ?? Quattro.midi.inputEndpoints();
          const outputEndpoints: QuattroMidiEndpoint[] =
            output ?? Quattro.midi.outputEndpoints();

          if (inputEndpoints.length == 0 || outputEndpoints.length == 0) {
            return;
          }

          // Endpoint と接続する.
          inputEndpoints.forEach((ep) => Quattro.midi.connectInputEndpoint(ep));
          outputEndpoints.forEach((ep) =>
            Quattro.midi.connectOutputEndpoint(ep)
          );

          resolve([inputEndpoints, outputEndpoints]);
        };

        unsubscribeEventChanged = Quattro.midi.onEventChanged(() => {
          refreshEndpoints();
        });

        refreshEndpoints();

        // タイムアウト
        setTimeout(() => reject(), 10000);
      }
    ).catch(() => {
      throw new Error('タイムアウトしたため、接続に失敗しました。');
    });

    return [endpoints[0], endpoints[1]];
  } finally {
    unsubscribeEventChanged?.();
  }
}

function* watchConnectionFailed(
  cancelAction: ActionPattern,
  onFailed: () => void
): Generator {
  let unsubscribeConnectFailed: (() => void) | undefined;
  try {
    unsubscribeConnectFailed = Quattro.midi.onEventConnectFailed(() => {
      // Endpoint の接続に失敗
      onFailed();
    });

    // 対象のアクションが実行されるまで待機
    yield take(cancelAction);
  } finally {
    unsubscribeConnectFailed?.();
  }
}

function* watchChanged(
  cancelAction: ActionPattern,
  onChanged: () => void
): Generator {
  let unsubscribeEventChange: (() => void) | undefined;
  try {
    unsubscribeEventChange = Quattro.midi.onEventChanged(() => {
      onChanged();
    });

    // 対象のアクションが実行されるまで待機
    yield take(cancelAction);
  } finally {
    unsubscribeEventChange?.();
  }
}

function* connectBleMidiDeviceSaga(
  action: ConnectBleMidiDevicePayloadAction
): Generator {
  // アクティブなデバイスが存在する場合、何もしない
  const hasActiveDevice: boolean = yield select(
    (state: RootState) => state.midiDevice.activeMidiDevice !== undefined
  );
  if (hasActiveDevice) {
    return;
  }

  // 接続を試みるデバイスが発見済みかチェックする
  const deviceId = action.payload;
  const discoveredDevices: QuattroMidiBleDevice[] = yield select(
    (state: RootState) => state.midiDevice.discoveredBleMidiDevices
  );

  const targetDevice = discoveredDevices.find(
    (device) => device.id === deviceId
  );

  try {
    if (targetDevice) {
      // 接続失敗コールバックを監視
      yield fork(watchConnectionFailed, disconnectBleMidiDevice, () => {
        const activeDevice = store.getState().midiDevice.activeMidiDevice;
        if (activeDevice) {
          store.dispatch(disconnectBleMidiDevice(activeDevice.id));
        }
      });

      // Changed コールバックを監視
      yield fork(watchChanged, disconnectBleMidiDevice, () => {
        const activeDevice = store.getState().midiDevice.activeMidiDevice;
        const inputEndpoints = Quattro.midi.inputEndpoints();
        const exitsActiveEndpoints = activeDevice?.inputEndpoints.every(
          (activeEp) =>
            inputEndpoints.some(
              (ep) => activeEp.MIDIEndpointIndexKey === ep.MIDIEndpointIndexKey
            )
        );
        if (activeDevice) {
          if (!exitsActiveEndpoints) {
            store.dispatch(disconnectBleMidiDevice(activeDevice?.id));
          }
        }
      });

      // actice device 情報を接続中へ更新
      yield put(
        setActiveMidiDevice({
          id: targetDevice.id,
          name: targetDevice.name,
          state: QuattroMidiBleDeviceState.Connecting,
          inputEndpoints: [],
          outputEndpoints: [],
        })
      );

      yield call(establishBleMidiDeviceConnection, deviceId);
      const [inputEndtpoints, outputEndpoints] = yield call(
        establishMidiEndpointConnection
      );

      // actice device 情報を接続済みへ更新
      yield put(
        setActiveMidiDevice({
          id: targetDevice.id,
          name: targetDevice.name,
          state: QuattroMidiBleDeviceState.Connected,
          inputEndpoints: inputEndtpoints,
          outputEndpoints: outputEndpoints,
        })
      );
    }
    yield put(connectSucceeded());
  } catch (e) {
    console.error(e);
    yield put(connectFailed());
    yield put(disconnectBleMidiDevice(deviceId));
  }
}

function* disconnectBleMidiDeviceSaga(
  action: DisconnectBleMidiDevicePayloadAction
): Generator {
  try {
    const deviceId = action.payload;
    Quattro.midi.disconnectBle(deviceId);
    yield put(setActiveMidiDevice());
  } catch (e) {
    console.error(e);
  } finally {
    yield put(disconnectSucceeded());
  }
}

function* connectMidiEndpointsSaga(
  action: ConnectMidiEndpointsPayloadAction
): Generator {
  try {
    // 接続失敗コールバックを監視
    yield fork(watchConnectionFailed, disconnectMidiEndpoints, () => {
      const activeDevice = store.getState().midiDevice.activeMidiDevice;
      if (activeDevice) {
        store.dispatch(disconnectMidiEndpoints());
      }
    });

    // Changed コールバックを監視
    yield fork(watchChanged, disconnectMidiEndpoints, () => {
      const activeDevice = store.getState().midiDevice.activeMidiDevice;
      const inputEndpoints = Quattro.midi.inputEndpoints();
      const exitsActiveEndpoints = activeDevice?.inputEndpoints.every(
        (activeEp) =>
          inputEndpoints.some(
            (ep) => activeEp.MIDIEndpointIndexKey === ep.MIDIEndpointIndexKey
          )
      );

      if (activeDevice) {
        if (!exitsActiveEndpoints) {
          store.dispatch(disconnectMidiEndpoints());
        }
      }
    });

    const { input, output } = action.payload ?? {};
    yield call(establishMidiEndpointConnection, input, output);
    yield put(connectSucceeded());

    // actice device 情報を接続済みへ更新
    yield put(
      setActiveMidiDevice({
        id: '',
        name: '',
        state: QuattroMidiBleDeviceState.Connected,
        inputEndpoints: input ?? [],
        outputEndpoints: output ?? [],
      })
    );
  } catch (e) {
    console.error(e);
  }
}

function* disconnectMidiEndpointsSaga(
  action: ConnectMidiEndpointsPayloadAction
): Generator {
  try {
    const { input, output } = action.payload ?? {};
    (input ?? [undefined]).forEach((ep) => {
      Quattro.midi.disconnectInputEndpoints(ep);
    });
    (output ?? [undefined]).forEach((ep) => {
      Quattro.midi.disconnectOutputEndpoints(ep);
    });

    yield put(setActiveMidiDevice());
  } catch (e) {
    console.error(e);
  } finally {
    yield put(disconnectSucceeded());
  }
}

export function* watchMidiDevice() {
  yield takeLatest(startScanBleMidiDevice.type, startScanBleMidiDeviceSaga);
  yield takeLeading(connectBleMidiDevice.type, connectBleMidiDeviceSaga);
  yield takeLeading(disconnectBleMidiDevice.type, disconnectBleMidiDeviceSaga);

  yield takeLatest(connectMidiEndpoints.type, connectMidiEndpointsSaga);
  yield takeLatest(disconnectMidiEndpoints.type, disconnectMidiEndpointsSaga);
}
