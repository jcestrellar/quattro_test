import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  QuattroMidiBleDevice,
  QuattroMidiBleDeviceState,
  QuattroMidiEndpoint,
} from '../../functions/quattro/quattroMidi/quattroMidiTypes';

export interface MidiDevice {
  id: string;
  name: string;

  // Disconnected: 接続処理開始前
  // Connectiong: 接続処理が開始され、エンドポイントの接続が完了していない
  // Connected: エンドポイントの接続が完了している
  state: QuattroMidiBleDeviceState; // = QuattroMidiBleDeviceState.Disconnected;
  inputEndpoints: QuattroMidiEndpoint[]; // = [];
  outputEndpoints: QuattroMidiEndpoint[]; // = [];
}

export interface MidiDeviceState {
  /**
   * $native.midi.ble.scanstart() を実行後に $native.midi.event.ble で受信した値。
   */
  discoveredBleMidiDevices: QuattroMidiBleDevice[];

  /**
   * アクティブ(接続中または接続済み)デバイス情報。
   * アクティブなデバイスが存在しない場合は undefined。
   */
  activeMidiDevice: MidiDevice | undefined;

  scanning: boolean;
}

const initialState: MidiDeviceState = {
  discoveredBleMidiDevices: [],
  activeMidiDevice: undefined,
  scanning: false,
};

export type ConnectBleMidiDevicePayloadAction = PayloadAction<string>;
export type DisconnectBleMidiDevicePayloadAction = PayloadAction<string>;
export type ConnectMidiEndpointsPayloadAction = PayloadAction<
  { input: QuattroMidiEndpoint[]; output: QuattroMidiEndpoint[] } | undefined
>;
export type DisconnectEndpointsPayloadAction = PayloadAction<
  { input: QuattroMidiEndpoint[]; output: QuattroMidiEndpoint[] } | undefined
>;

export const midiDeviceSlice = createSlice({
  name: 'midiDevice',
  initialState,
  reducers: {
    /**
     * 発見した BLE MIDI デバイス一覧を更新する。
     * 主にスキャン結果を受け取ったときに呼ばれる。
     */
    setDiscoveredDevices: (
      state,
      action: PayloadAction<QuattroMidiBleDevice[]>
    ) => {
      state.discoveredBleMidiDevices = action.payload;
    },

    /**
     * アクティブな MIDI デバイス（接続中または接続済み）を設定する。
     */
    setActiveMidiDevice: (
      state,
      action: PayloadAction<MidiDevice | undefined>
    ) => {
      state.activeMidiDevice = action.payload;
    },

    /**
     * BLE MIDI デバイスのスキャンを開始する。
     * iOS, Android のみ対応。
     */
    startScanBleMidiDevice: (state) => {
      state.scanning = true;
    },

    /**
     * BLE MIDI デバイスのスキャンを停止する。
     * iOS, Android のみ対応。
     */
    stopScanBleMidiDevice: (state) => {
      state.scanning = false;
    },

    /**
     * BLE MIDI デバイスの接続を開始するアクション。
     * BLE MIDI デバイスおよびエンドポイントへの接続を一連の処理として実行する。
     * iOS, Android のみ対応。
     */
    connectBleMidiDevice: (
      _state,
      _action: ConnectBleMidiDevicePayloadAction
    ) => {},

    /**
     * BLE MIDI デバイスの切断を開始するアクション。
     * iOS, Android のみ対応。
     */
    disconnectBleMidiDevice: (
      _state,
      _action: DisconnectBleMidiDevicePayloadAction
    ) => {},

    /**
     * MIDI の入力・出力エンドポイントの接続処理を行う.
     * OS が既にデバイスを認識（USB接続など完了）していることを前提として使用する.
     */
    connectMidiEndpoints: (
      _state,
      _action: ConnectMidiEndpointsPayloadAction
    ) => {},

    /**
     * MIDI の入力・出力エンドポイントの切断処理を行う。
     * OS が既にデバイスを認識（USB接続など完了）していることを前提として使用する。
     */
    disconnectMidiEndpoints: (
      _state,
      _action: DisconnectEndpointsPayloadAction
    ) => {},

    /**
     * 接続処理が成功したことを示すアクション。
     */
    connectSucceeded: (_state) => {},

    /**
     * 接続処理が失敗したことを示すアクション。
     */
    connectFailed: (_state) => {},

    /**
     * 切断処理が成功したことを示すアクション。
     */
    disconnectSucceeded: (_state) => {},
  },
  selectors: {
    /**
     * MIDIデバイスの接続状態を判定するセレクター。
     * アクティブなデバイスが存在し、その状態が「Connected」の場合に true を返す。
     * それ以外は false を返す。
     */
    midiDeviceConnectedSelector: (state) =>
      state.activeMidiDevice?.state === QuattroMidiBleDeviceState.Connected
        ? true
        : false,
  },
});

export const {
  setDiscoveredDevices,
  startScanBleMidiDevice,
  stopScanBleMidiDevice,
  connectBleMidiDevice,
  disconnectBleMidiDevice,
  connectMidiEndpoints,
  disconnectMidiEndpoints,
  setActiveMidiDevice,
  connectSucceeded,
  connectFailed,
  disconnectSucceeded,
} = midiDeviceSlice.actions;

export const { midiDeviceConnectedSelector } = midiDeviceSlice.selectors;
