export type QuattroMidiEventMessageCallback = (
  /** 受信した MIDI メッセージ（HEX形式） */
  msg: string,

  /** 受信時のタイムスタンプ(ミリ秒) */
  timestamp: number
) => void;
export type QuattroMidiEventChangedCallback = () => void;
export type QuattroMidiEventConnectFailedCallback = (
  /** 接続に失敗したMIDIエンドポイントオブジェクト（JSON形式）*/
  ep: QuattroMidiEndpoint
) => void;
export type QuattroMidiEventErrorCallback = (
  /** システムのエラー番号 */
  code: number
) => void;
export type QuattroMidiEventBleCallback = (
  devices: QuattroMidiBleDevice[]
) => void;

export enum QuattroMidiBleDeviceState {
  Disconnected = 0,
  Connecting,
  Connected,
  Disconnecting,
}

export interface QuattroMidiBleDevice {
  id: string;
  name: string;
  state: QuattroMidiBleDeviceState;
}

export interface QuattroMidiEndpoint {
  /** デバイス名 */
  MIDIDeviceNameKey: string;

  /** エンティティ名 */
  MIDIEntityNameKey: string;

  /** UID */
  MIDIEndpointUIDKey: number;

  /** インデックス番号 */
  MIDIEndpointIndexKey: number;
}
