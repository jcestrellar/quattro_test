import {
  call,
  fork,
  put,
  select,
  take,
  takeLatest,
  takeLeading,
} from 'redux-saga/effects';
import { Dt1Transport } from '../../functions/dt1Transport/dt1Transport';
import { Quattro } from '../../functions/quattro/quattro';
import {
  QuattroBleDevice,
  QuattroBleDeviceState,
  QuattroBleEndpoint,
} from '../../functions/quattro/quattroBle/quattroBleTypes';
import { RootState, store } from '../store';
import {
  connectBleDevice,
  ConnectBleDevicePayloadAction,
  StartScanBlePayloadAction,
  connectBleFailed,
  connectBleSucceeded,
  disconnectBleDevice,
  DisconnectBleDevicePayloadAction,
  disconnectBleSucceeded,
  setActiveBleDevice,
  setDiscoveredBleDevices,
  setEndpoints,
  startScanBleDevice,
  stopScanBleDevice,
} from './bleDeviceSlice';
import { bleManager } from './bleManager';
import { SystemDevice } from '../../functions/systemDevice';

function* startScanBleDeviceSaga(action: StartScanBlePayloadAction) {
  let unsubscribeEventUnauthorized: (() => void) | undefined;
  let unsubscribeEventFound: (() => void) | undefined;
  try {
    console.log('startScanBleDeviceSaga');
    const { serviceUuid, charUuid } = action.payload;
    unsubscribeEventUnauthorized = Quattro.ble.onEventUnauthorized(() => {
      console.error('BLE unauthorized: permission not granted');
      // スキャンを中止する
      store.dispatch(stopScanBleDevice());
    });

    // ble.event.found を監視する
    // scanstart() のコールバックを受信したら、結果を逐次 dispatch する
    unsubscribeEventFound = Quattro.ble.onEventFound(
      (id: string, name: string, rssi: string) => {
        store.dispatch(
          setDiscoveredBleDevices({
            id,
            name,
            rssi,
          })
        );

        if (!SystemDevice.isRunningOnQuattro) {
          // Web の場合は「Found = 選択された」なので、自ら接続シーケンスを開始するアクションを dispatch する
          store.dispatch(
            connectBleDevice({ deviceId: id, serviceUuid, charUuid })
          ); // 接続開始
        }
      }
    );

    Quattro.ble.scanStart([serviceUuid]);
    // scan 停止アクションを受け取るまで待機する
    yield take(stopScanBleDevice);
    Quattro.ble.scanStop();
    console.log('scanBleStop');
  } finally {
    unsubscribeEventUnauthorized?.();
    unsubscribeEventFound?.();
  }
}

function* connectGattServerSaga(deviceId: string) {
  let unsubscribeEventConnectFailed: (() => void) | undefined;
  let unsubscribeEventConnected: (() => void) | undefined;

  try {
    yield new Promise<void>((resolve, reject) => {
      unsubscribeEventConnectFailed = Quattro.ble.onEventConnectFailed(
        (id: string, name: string) => {
          reject(new Error(`GATT connect failed id:${id} name:${name}`));
        }
      );

      unsubscribeEventConnected = Quattro.ble.onEventConnected(
        (id: string, name: string) => {
          console.log(`GATT connect id:${id} name:${name}`);
          resolve();
        }
      );

      Quattro.ble.connect(deviceId);

      setTimeout(() => {
        reject(new Error('GATT connect timeout'));
      }, 10_000);
    });
  } finally {
    unsubscribeEventConnectFailed?.();
    unsubscribeEventConnected?.();
  }
}

function* discoverServiceSaga(
  id: string,
  serviceUuid: string,
  charUuid: string
) {
  let unsubscribeDiscoverFailed: (() => void) | undefined;
  let unsubscribeDiscovered: (() => void) | undefined;

  try {
    const endpoints: QuattroBleEndpoint = yield new Promise(
      (resolve, reject) => {
        unsubscribeDiscoverFailed = Quattro.ble.onEventDiscoverFailed(
          (id: string, reason: string) => {
            reject(
              new Error(`discover service failed id:${id} reason:${reason}`)
            );
          }
        );

        unsubscribeDiscovered = Quattro.ble.onEventDiscovered(
          (deviceId: string, service: string, characteristics: string[]) => {
            if (service?.toLowerCase() !== serviceUuid.toLowerCase()) {
              reject(new Error('service not found'));
            }
            if (
              !characteristics
                .map((c) => c.toLowerCase())
                .includes(charUuid.toLowerCase())
            ) {
              reject(new Error('characteristic not found'));
            }
            resolve([
              {
                BLEPeripheralKey: deviceId,
                BLEServiceKey: serviceUuid,
                BLECharacteristicKey: charUuid,
              },
            ]);
          }
        );

        Quattro.ble.discover(id, serviceUuid);

        setTimeout(() => {
          reject(new Error('discover service timeout'));
        }, 10_000);
      }
    );
    return endpoints;
  } finally {
    unsubscribeDiscoverFailed?.();
    unsubscribeDiscovered?.();
  }
}

function getCharacteristicSaga(ep: QuattroBleEndpoint) {
  try {
    const props = Quattro.ble.properties(ep);
    return props;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(message ?? 'invalid characteristic');
  }
}

function* startNotificationsSaga(
  ep: QuattroBleEndpoint,
  dt1Transport: Dt1Transport
) {
  let unsubscribeEventChanged: (() => void) | undefined;
  let unsubscribeEventWrite: (() => void) | undefined;
  try {
    unsubscribeEventChanged = Quattro.ble.onEventChanged(
      (endpoint, value, error) => {
        if (error) {
          console.error('Changed error:', error);
          return;
        }
        dt1Transport.receive(value);
      }
    );
    unsubscribeEventWrite = Quattro.ble.onEventWrite((ep, error) => {
      if (error) {
        console.error(`Write error:${error} on ${ep}`);
      }
    });
    bleManager.unsubscribeEventChanged = unsubscribeEventChanged;
    bleManager.unsubscribeEventWrite = unsubscribeEventWrite;

    yield call([Quattro.ble, Quattro.ble.notify], ep, true);
  } catch (e: unknown) {
    unsubscribeEventChanged?.();
    unsubscribeEventWrite?.();
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(message ?? 'Failed notification');
  }
}

function* connectBleFlowSaga(action: ConnectBleDevicePayloadAction): Generator {
  const { deviceId, serviceUuid, charUuid } = action.payload;
  const discoveredDevices: QuattroBleDevice[] = yield select(
    (state: RootState) => state.bleDevice.discoveredBleDevices
  );
  const targetDevice = discoveredDevices.find(
    (device) => device.id === deviceId
  );
  try {
    if (targetDevice) {
      yield put(stopScanBleDevice());
      yield put(
        setActiveBleDevice({
          id: targetDevice.id,
          name: targetDevice.name,
          state: QuattroBleDeviceState.Connecting,
          endpoints: [],
        })
      );

      yield fork(watchDisconnectedBleDevice, deviceId);

      // 1. GATT 接続
      yield call(connectGattServerSaga, deviceId);

      // 2. Service / Characteristic 探索（検証含む）
      const endpoints: QuattroBleEndpoint[] = yield call(
        discoverServiceSaga,
        deviceId,
        serviceUuid,
        charUuid
      );
      yield put(setEndpoints({ id: targetDevice.id, ep: endpoints }));

      // 3. Characteristic properties 確認
      yield call(getCharacteristicSaga, endpoints[0]);
      const dt1Transport = new Dt1Transport(endpoints[0]);
      bleManager.dt1Transport = dt1Transport;

      // 4. Notification 開始
      yield call(startNotificationsSaga, endpoints[0], dt1Transport);

      // 5. 接続完了を確定
      yield put(connectBleSucceeded({ id: targetDevice.id }));
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const reason = message ?? 'unknown';
    console.error(reason);
    yield call(handleBleError, deviceId, reason);
  }
}

export function* watchDisconnectedBleDevice(deviceId: string): Generator {
  const unsubscribeDisconnected = Quattro.ble.onEventDisconnected(
    (id: string) => {
      if (id === deviceId) {
        console.warn(`disconnectedId:${id}`);
        store.dispatch(disconnectBleSucceeded({ id: deviceId }));
      }
    }
  );
  try {
    yield take(disconnectBleSucceeded.type);
  } finally {
    unsubscribeDisconnected();
    bleManager.clearAll();
    yield put(setActiveBleDevice(undefined));
  }
}

function* disconnectBleDeviceSaga(action: DisconnectBleDevicePayloadAction) {
  const payloadId = action.payload;
  const activeId: string | undefined = yield select(
    (store: RootState) => store.bleDevice.activeBleDevice?.id
  );
  const deviceId = payloadId ?? activeId;

  if (!deviceId) {
    console.warn('disconnectBleDeviceSaga: no device id (no activeBleDevice)');
    return;
  }

  Quattro.ble.disconnect(deviceId);
}

function* handleBleError(deviceId: string, reason: string) {
  yield put(connectBleFailed({ id: deviceId, reason }));
  yield put(disconnectBleDevice(deviceId));
  yield put(setActiveBleDevice(undefined));
}

export function* watchBleDevice() {
  yield takeLatest(startScanBleDevice.type, startScanBleDeviceSaga);
  yield takeLeading(connectBleDevice.type, connectBleFlowSaga);
  yield takeLeading(disconnectBleDevice.type, disconnectBleDeviceSaga);
}
