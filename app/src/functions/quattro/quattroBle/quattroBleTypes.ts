export type QuattroBleEventUnauthorizedCallback = () => void;
export type QuattroBleEventFoundCallback = (
  /** ペリフェラル識別子 */
  id: string,

  /** ペリフェラル名 */
  name: string,

  /** ペリフェラル名 */
  rssi: string
) => void;

export type QuattroBleEventConnectedCallback = (
  /** ペリフェラル識別子 */
  id: string,

  /** ペリフェラル名 */
  name: string
) => void;

export type QuattroBleEventConnectFailedCallback = (
  /** ペリフェラル識別子 */
  id: string,

  /** ペリフェラル名 */
  name: string
) => void;

export type QuattroBleEventDisconnectedCallback = (
  /** ペリフェラル識別子 */
  id: string,

  /** ペリフェラル名 */
  name: string
) => void;

export type QuattroBleEventDiscoveredCallback = (
  /** ペリフェラル識別子 */
  id: string,

  /** 探索したサービス UUID */
  service: string,

  /** 探索したサービス内のエンドポイント UUID の配列 */
  characteristics: string[]
) => void;

export type QuattroBleEventDiscoverFailedCallback = (
  /** ペリフェラル識別子 */
  id: string,

  /** エラー原因 */
  reason: string
) => void;

export type QuattroBleEventWriteCallback = (
  /** BLE エンドポイントオブジェクト */
  ep: QuattroBleEndpoint,

  /** エラー内容 */
  error: string
) => void;

export type QuattroBleEventChangedCallback = (
  /** BLE エンドポイントオブジェクト */
  ep: QuattroBleEndpoint,

  /** バイトデータ（HEX 形式） */
  value: string,

  /** エラー内容 */
  error: string
) => void;

export enum QuattroBleDeviceState {
  Disconnected = 0,
  Connecting,
  Connected,
  ConnectFailed,
  Disconnecting,
}

export interface QuattroBleDevice {
  /** ペリフェラル識別子 */
  id: string;

  /** ペリフェラル名 */
  name: string;

  /** RSSI（dBm）*/
  rssi: string;
}

export interface QuattroBleEndpoint {
  /** ペリフェラル識別子 */
  BLEPeripheralKey: string;

  /** サービス UUID */
  BLEServiceKey: string;

  /** キャラクタリスティック UUID */
  BLECharacteristicKey: string;
}

export interface QuattroBleEndpointProperty {
  /** ブロードキャスト可能か */
  broadcast: boolean;

  /** 読み取り可能か */
  read: boolean;

  /** レスポンスなしの書き込み可能か */
  writeWithoutResponse: boolean;

  /** 書き込み可能か */
  write: boolean;

  /** 通知（Notify）可能か */
  notify: boolean;

  /** インジケーション（Indicate）可能か */
  indicate: boolean;
}
