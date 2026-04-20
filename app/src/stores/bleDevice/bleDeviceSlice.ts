import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  QuattroBleDevice,
  QuattroBleDeviceState,
  QuattroBleEndpoint,
} from '../../functions/quattro/quattroBle/quattroBleTypes';
export interface BleDevice {
  id: string;
  name: string;

  // Disconnected: 接続処理開始前
  // Connectiong: 接続処理が開始され、エンドポイントの接続が完了していない
  // Connected: エンドポイントの接続が完了している
  state: QuattroBleDeviceState; // = QuattroBleDeviceState.Disconnected;
  endpoints: QuattroBleEndpoint[]; // = [];
}

export interface BleDeviceState {
  /**
   * Quattro.ble.scanStart() を実行後に Quattro.ble.onEventFound で受信した値。
   */
  discoveredBleDevices: QuattroBleDevice[];

  /**
   * アクティブ(接続中または接続済み)デバイス情報。
   * アクティブなデバイスが存在しない場合は undefined。
   */
  activeBleDevice: BleDevice | undefined;
  scanStatus: 'idle' | 'scanning' | 'finished';
}

const initialState: BleDeviceState = {
  discoveredBleDevices: [],
  activeBleDevice: undefined,
  scanStatus: 'idle',
};

export type StartScanBlePayloadAction = PayloadAction<{
  serviceUuid: string;
  charUuid: string;
}>;

export type ConnectBleDevicePayloadAction = PayloadAction<{
  deviceId: string;
  serviceUuid: string;
  charUuid: string;
}>;

export type DisconnectBleDevicePayloadAction = PayloadAction<
  string | undefined
>;

export const bleDeviceSlice = createSlice({
  name: 'bleDevice',
  initialState,
  reducers: {
    /**
     * 発見した BLE デバイス一覧を更新する。
     * 主にスキャン結果を受け取ったときに呼ばれる。
     */
    setDiscoveredBleDevices: (
      state,
      action: PayloadAction<QuattroBleDevice>
    ) => {
      const incoming = action.payload;
      const idx = state.discoveredBleDevices.findIndex(
        (d) => d.id === incoming.id
      );
      if (idx >= 0) {
        state.discoveredBleDevices[idx] = {
          ...state.discoveredBleDevices[idx],
          ...incoming,
        };
      } else {
        state.discoveredBleDevices.push(incoming);
      }
    },

    /**
     * アクティブな MIDI デバイス（接続中または接続済み）を設定する。
     */
    setActiveBleDevice: (
      state,
      action: PayloadAction<BleDevice | undefined>
    ) => {
      state.activeBleDevice = action.payload;
    },

    setEndpoints: (
      state,
      action: PayloadAction<{ id: string; ep: QuattroBleEndpoint[] }>
    ) => {
      if (state.activeBleDevice?.id === action.payload.id) {
        state.activeBleDevice.endpoints = action.payload.ep;
      }
    },

    /**
     * BLE デバイスのスキャンを開始する。
     */
    startScanBleDevice: (state, _action: StartScanBlePayloadAction) => {
      state.scanStatus = 'scanning';
      state.discoveredBleDevices = [];
    },

    /**
     * BLE デバイスのスキャンを停止する。
     */
    stopScanBleDevice: (state) => {
      state.scanStatus = 'finished';
    },

    /**
     *BLE デバイスの状態を初期状態にリセット
     */
    resetBleState: () => {
      return initialState;
    },

    /**
     * BLE デバイスの接続を開始するアクション。
     * BLE デバイスへの接続を一連の処理として実行する。
     */
    connectBleDevice: (_state, _action: ConnectBleDevicePayloadAction) => {},

    /**
     * BLE デバイスの切断を開始するアクション。
     */
    disconnectBleDevice: (
      _state,
      _action: DisconnectBleDevicePayloadAction
    ) => {},

    /**
     * 接続処理が成功したことを示すアクション。
     */
    connectBleSucceeded: (state, action: PayloadAction<{ id: string }>) => {
      if (state.activeBleDevice?.id === action.payload.id) {
        state.activeBleDevice.state = QuattroBleDeviceState.Connected;
      }
    },

    /**
     * 接続処理が失敗したことを示すアクション。
     */
    connectBleFailed: (
      state,
      action: PayloadAction<{ id: string; reason: string }>
    ) => {
      if (state.activeBleDevice?.id === action.payload.id) {
        state.activeBleDevice.state = QuattroBleDeviceState.ConnectFailed;
      }
    },

    /**
     * 切断処理が成功したことを示すアクション。
     */

    disconnectBleSucceeded: (state, action: PayloadAction<{ id: string }>) => {
      if (state.activeBleDevice?.id === action.payload.id) {
        state.activeBleDevice.state = QuattroBleDeviceState.Disconnected;
      }
    },
  },
});

export const {
  setDiscoveredBleDevices,
  startScanBleDevice,
  stopScanBleDevice,
  resetBleState,
  connectBleDevice,
  disconnectBleDevice,
  setActiveBleDevice,
  connectBleSucceeded,
  connectBleFailed,
  disconnectBleSucceeded,
  setEndpoints,
} = bleDeviceSlice.actions;
