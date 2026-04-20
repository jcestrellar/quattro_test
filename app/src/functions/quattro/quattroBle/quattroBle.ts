/**
 * $native.ble の API を一元管理する。
 * */

import {
  QuattroBleEndpoint,
  QuattroBleEndpointProperty,
  QuattroBleEventChangedCallback,
  QuattroBleEventConnectedCallback,
  QuattroBleEventConnectFailedCallback,
  QuattroBleEventDisconnectedCallback,
  QuattroBleEventDiscoveredCallback,
  QuattroBleEventDiscoverFailedCallback,
  QuattroBleEventFoundCallback,
  QuattroBleEventUnauthorizedCallback,
  QuattroBleEventWriteCallback,
} from './quattroBleTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroBle {
  private static _instance: QuattroBle;
  static get instance(): QuattroBle {
    if (!QuattroBle._instance) {
      QuattroBle._instance = new QuattroBle();
      QuattroBle._instance.init();
    }
    return QuattroBle._instance;
  }

  private constructor() {}

  private init() {
    $native.ble.event.unauthorized = () => {
      this.eventUnauthorizedListeners.forEach((cb) => cb());
    };
    $native.ble.event.found = (id: string, name: string, rssi: string) => {
      this.eventFoundListeners.forEach((cb) => cb(id, name, rssi));
    };
    $native.ble.event.connected = (id: string, name: string) => {
      this.eventConnectedListeners.forEach((cb) => cb(id, name));
    };
    $native.ble.event.connectfailed = (id: string, name: string) => {
      this.eventConnectFailedListeners.forEach((cb) => cb(id, name));
    };
    $native.ble.event.disconnected = (id: string, name: string) => {
      this.eventDisconnectedListeners.forEach((cb) => cb(id, name));
    };
    $native.ble.event.discovered = (
      id: string,
      name: string,
      characteristicsString: string
    ) => {
      try {
        const characteristicsObjects: string[] = JSON.parse(
          characteristicsString
        );
        if (Array.isArray(characteristicsObjects)) {
          this.eventDiscoveredListeners.forEach((cb) =>
            cb(id, name, characteristicsObjects)
          );
        }
      } catch (e) {
        console.error('BLE characteristics JSON parse error:', e);
      }
    };
    $native.ble.event.discoverfailed = (id: string, reason: string) => {
      this.eventDiscoverFailedListeners.forEach((cb) => cb(id, reason));
    };
    $native.ble.event.write = (ep: string, error: string) => {
      try {
        const epObject: QuattroBleEndpoint = JSON.parse(ep);
        this.eventWriteListeners.forEach((cb) => cb(epObject, error));
      } catch (e) {
        console.error('BLE endpoint JSON parse error:', e);
      }
    };
    $native.ble.event.changed = (ep: string, value: string, error: string) => {
      try {
        const epObject: QuattroBleEndpoint = JSON.parse(ep);
        this.eventChangedListeners.forEach((cb) => cb(epObject, value, error));
      } catch (e) {
        console.error('BLE endpoint JSON parse error:', e);
      }
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */

  // $native.ble.event.unauthorized
  private eventUnauthorizedListeners: QuattroBleEventUnauthorizedCallback[] =
    [];
  /**
   * スキャン開始時、BLE の利用が許可されていない場合に通知されます。
   *
   * 以下の API を呼び出して BLE の利用を開始する際、ネイティブ側で BLE のパーミッションが確認される。
   *   - $native.midi.panel()
   *   - $native.midi.ble.scanstart()
   *   - $native.ble.scan.start()
   * パーミッションが許可されていない場合、$native.ble.event.unauthorized() イベントが発生する。
   *
   * @param callback
   * @returns
   */
  onEventUnauthorized(callback: QuattroBleEventUnauthorizedCallback) {
    this.eventUnauthorizedListeners.push(callback);
    return () => {
      this.eventUnauthorizedListeners = this.eventUnauthorizedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventFoundListeners: QuattroBleEventFoundCallback[] = [];
  /**
   * スキャン結果を通知します。
   * @param callback
   * @returns
   */
  onEventFound(callback: QuattroBleEventFoundCallback) {
    this.eventFoundListeners.push(callback);
    return () => {
      this.eventFoundListeners = this.eventFoundListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventConnectedListeners: QuattroBleEventConnectedCallback[] = [];
  /**
   * ペリフェラルとの接続が完了すると通知されます。
   * @param callback
   * @returns
   */
  onEventConnected(callback: QuattroBleEventConnectedCallback) {
    this.eventConnectedListeners.push(callback);
    return () => {
      this.eventConnectedListeners = this.eventConnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventConnectFailedListeners: QuattroBleEventConnectFailedCallback[] =
    [];
  /**
   * ペリフェラルとの接続に失敗した場合に通知されます。
   * @param callback
   * @returns
   */
  onEventConnectFailed(callback: QuattroBleEventConnectFailedCallback) {
    this.eventConnectFailedListeners.push(callback);
    return () => {
      this.eventConnectFailedListeners =
        this.eventConnectFailedListeners.filter((cb) => cb !== callback);
    };
  }

  private eventDisconnectedListeners: QuattroBleEventDisconnectedCallback[] =
    [];
  /**
   * ペリフェラルとの接続が切断された場合に通知されます。
   * @param callback
   * @returns
   */
  onEventDisconnected(callback: QuattroBleEventDisconnectedCallback) {
    this.eventDisconnectedListeners.push(callback);
    return () => {
      this.eventDisconnectedListeners = this.eventDisconnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventDiscoveredListeners: QuattroBleEventDiscoveredCallback[] = [];
  /**
   * ペリフェラル内のサービス探索が正常終了した場合に通知されます。
   * @param callback
   * @returns
   */
  onEventDiscovered(callback: QuattroBleEventDiscoveredCallback) {
    this.eventDiscoveredListeners.push(callback);
    return () => {
      this.eventDiscoveredListeners = this.eventDiscoveredListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventDiscoverFailedListeners: QuattroBleEventDiscoverFailedCallback[] =
    [];
  /**
   * ペリフェラル内のサービス探索に失敗した場合に通知されます。
   * @param callback
   * @returns
   */
  onEventDiscoverFailed(callback: QuattroBleEventDiscoverFailedCallback) {
    this.eventDiscoverFailedListeners.push(callback);
    return () => {
      this.eventDiscoverFailedListeners =
        this.eventDiscoverFailedListeners.filter((cb) => cb !== callback);
    };
  }

  private eventWriteListeners: QuattroBleEventWriteCallback[] = [];
  /**
   * BLE エンドポイントへの書き込み結果通知します。error が ''（空文字）の場合は書き込み成功です。
   * @param callback
   * @returns
   */
  onEventWrite(callback: QuattroBleEventWriteCallback) {
    this.eventWriteListeners.push(callback);
    return () => {
      this.eventWriteListeners = this.eventWriteListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventChangedListeners: QuattroBleEventChangedCallback[] = [];
  /**
   * BLE エンドポイントの値が更新された場合に通知されます。error が ''（空文字）の場合は更新成功です。
   * @param callback
   * @returns
   */
  onEventChanged(callback: QuattroBleEventChangedCallback) {
    this.eventChangedListeners.push(callback);
    return () => {
      this.eventChangedListeners = this.eventChangedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */

  /**
   * 指定されたサービスを持つペリフェラルをスキャンします。ペリフェラル見つかると、ble.event.found でペリフェラル識別子などが通知されます。
   * @param services スキャンするサービス UUID の配列
   */
  scanStart(services: string[]): void {
    $native.ble.scan.start(services);
  }

  /**
   * ペリフェラルのスキャンを停止します。
   */
  scanStop(): void {
    $native.ble.scan.stop();
  }

  /**
   * ペリフェラルとの接続処理を開始します。
   * @param id ペリフェラル識別子
   */
  connect(id: string): void {
    $native.ble.connect(id);
  }

  /**
   * ペリフェラルと切断します。id を指定しない場合は、接続中のすべてのペリフェラルと切断します。
   * @param option id ペリフェラル識別子
   */
  disconnect(id?: string): void {
    $native.ble.disconnect(id);
  }

  /**
   * 指定されたサービス内のキャラクタリスティックを探索します。探索結果は ble.event.discovered で通知されます。
   * @param id ペリフェラル識別子
   * @param service 探索するサービス UUID
   */
  discover(id: string, service: string) {
    $native.ble.discover(id, service);
  }

  /**
   * BLE エンドポイントのプロパティを取得します。   *
   * @param ep BLE エンドポイント
   * @return プロパティ情報（broadcast, read, writeWithoutResponse, write, notify, indicate）
   */
  properties(ep: QuattroBleEndpoint): QuattroBleEndpointProperty {
    return $native.ble.properties(ep);
  }

  /**
   * BLE エンドポイントの NOTIFICATION の有効／無効を切り替えます。
   * @param ep BLE エンドポイント
   * @param enabled 有効（true）／無効（false）
   */
  notify(ep: QuattroBleEndpoint, enabled: boolean): void {
    $native.ble.notify(ep, enabled);
  }

  /**
   * BLE エンドポイントから値を読み込みます。読み取り結果は ble.event.changed で通知されます。
   * @param ep BLE エンドポイント
   */
  read(ep: QuattroBleEndpoint): void {
    $native.ble.read(ep);
  }

  /**
   * BLE エンドポイントへ値を書き込みます。書き込み結果は ble.event.write で通知されます。
   * @param ep BLE エンドポイント
   * @param value バイトデータ（HEX 形式）
   */
  write(ep: QuattroBleEndpoint, value: string) {
    $native.ble.write(ep, value);
  }

  /**
   * BLE エンドポイントへ値を書き込みます（レスポンスなし）。
   * @param ep BLE エンドポイント
   * @param value バイトデータ（HEX 形式）
   */
  writeWithoutResponse(ep: QuattroBleEndpoint, value: string) {
    $native.ble.writewithoutresponse(ep, value);
  }
}
