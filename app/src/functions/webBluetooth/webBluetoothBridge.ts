import { QuattroBleEndpoint } from '../quattro/quattroBle/quattroBleTypes';
import { WebBleManager } from './webBluetoothManager';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

/**
 * $native.ble に定義されている元の API メソッドを一時的に上書きし、
 * Web Bluetooth API を使用して BLE デバイスの制御を可能にします。
 * これにより、Web ブラウザ上で BLE 通信のデバッグが可能になります。
 *
 * Web Bluetooth の仕様上、スキャン（デバイス選択）にはユーザーのジェスチャー（クリック等）が必要です。
 * ネイティブ実装と Web 実装では、ペアリングや再接続の挙動が異なる場合があります。
 */
export class WebBleBridge {
  private static _instance: WebBleBridge;
  static get instance() {
    if (!WebBleBridge._instance) WebBleBridge._instance = new WebBleBridge();
    return WebBleBridge._instance;
  }

  private isSetup = false;
  // キャッシュ変数
  private scanStartMethod?: (services: string[]) => void;
  private scanStopMethod?: () => void;
  private connectMethod?: (id: string) => void;
  private disconnectMethod?: (id?: string) => void;
  private discoverMethod?: (id: string, serviceUUID: string) => void;
  private readMethod?: (ep: QuattroBleEndpoint) => void;
  private writeMethod?: (ep: QuattroBleEndpoint, hex: string) => void;
  private notifyMethod?: (ep: QuattroBleEndpoint, enabled: boolean) => void;

  // イベントリスナー解除用関数
  private unsubscribeEventUnauthorized?: () => void;
  private unsubscribeEventFound?: () => void;
  private unsubscribeEventConnected?: () => void;
  private unsubscribeEventConnectFailed?: () => void;
  private unsubscribeDiscovered?: () => void;
  private unsubscribeDiscoverFailed?: () => void;
  private unsubscribeEventDisconnected?: () => void;
  private unsubscribeEventChanged?: () => void;
  private unsubscribeEventWrite?: () => void;
  private constructor() {
    // 元のメソッドをキャッシュ
    // 安全チェック: $native.ble が存在する場合のみキャッシュ
    if (typeof $native !== 'undefined' && $native.ble) {
      this.scanStartMethod = $native.ble.scanStart;
      this.scanStopMethod = $native.ble.scanStop;
      this.connectMethod = $native.ble.connect;
      this.disconnectMethod = $native.ble.disconnect;
      this.discoverMethod = $native.ble.discover;
      this.readMethod = $native.ble.read;
      this.writeMethod = $native.ble.write;
      this.notifyMethod = $native.ble.notify;
    }
  }

  /**
   * $native.ble API の各メソッドを WebBleManager 連携版へ差し替える。
   * これにより、アプリケーションからの BLE 操作が Web Bluetooth 経由で行われる。
   */
  setup() {
    if (this.isSetup) return;
    this.unsubscribeEventUnauthorized = WebBleManager.instance.onUnauthorized(
      () => {
        $native.ble.event.unauthorized();
      }
    );

    this.unsubscribeEventFound = WebBleManager.instance.onFound(
      (id, name, rssi) => {
        $native.ble.event.found(id, name, rssi);
      }
    );

    this.unsubscribeEventConnected = WebBleManager.instance.onConnected(
      (id, name) => {
        $native.ble.event.connected(id, name);
      }
    );

    this.unsubscribeEventConnectFailed = WebBleManager.instance.onConnectFailed(
      (id, name) => {
        $native.ble.event.connectFailed(id, name);
      }
    );

    this.unsubscribeEventDisconnected = WebBleManager.instance.onDisconnected(
      (id, name) => {
        $native.ble.event.disconnected(id, name);
      }
    );

    this.unsubscribeDiscovered = WebBleManager.instance.onDiscovered(
      (id, svc, chars) => {
        $native.ble.event.discovered(id, svc, JSON.stringify(chars));
      }
    );

    this.unsubscribeDiscoverFailed = WebBleManager.instance.onDiscoverFailed(
      (id, reason) => {
        $native.ble.event.discoverfailed(id, reason);
      }
    );

    this.unsubscribeEventWrite = WebBleManager.instance.onWrite((ep, error) => {
      // QuattroBle は第1引数(ep)を JSON.parse するので文字列化
      $native.ble.event.write(JSON.stringify(ep), error ?? '');
    });

    this.unsubscribeEventChanged = WebBleManager.instance.onChanged(
      (ep, value, error) => {
        // QuattroBle は第1引数(ep)を JSON.parse するので文字列化
        $native.ble.event.changed(JSON.stringify(ep), value, error ?? '');
      }
    );

    $native.ble.scan = {
      start: (services: string[]) => WebBleManager.instance.scanStart(services),
      stop: () => WebBleManager.instance.scanStop(),
    };

    $native.ble.connect = (id: string) => {
      WebBleManager.instance.connect(id);
    };

    $native.ble.disconnect = (id?: string) => {
      WebBleManager.instance.disconnect(id);
    };

    $native.ble.discover = (id: string, serviceUUID: string) => {
      WebBleManager.instance.discover(id, serviceUUID);
    };

    $native.ble.properties = (ep: QuattroBleEndpoint) => {
      return WebBleManager.instance.properties(ep);
    };

    $native.ble.notify = (ep: QuattroBleEndpoint, enabled: boolean) => {
      WebBleManager.instance.notify(ep, enabled);
    };

    $native.ble.read = (ep: QuattroBleEndpoint) => {
      WebBleManager.instance.read(ep);
    };

    $native.ble.write = (ep: QuattroBleEndpoint, value: string) => {
      WebBleManager.instance.write(ep, value);
    };

    $native.ble.writewithoutresponse = (
      ep: QuattroBleEndpoint,
      value: string
    ) => {
      WebBleManager.instance.writeWithoutResponse(ep, value);
    };

    this.isSetup = true;
  }

  /**
   * $native.ble のAPIメソッドを元の実装に戻す
   * WebBleManagerとの連携を解除する際に呼び出す
   */
  dispose() {
    if (!this.isSetup) return;

    // 元のメソッドに戻す
    if (this.scanStartMethod) $native.ble.scanStart = this.scanStartMethod;
    if (this.scanStopMethod) $native.ble.scanStop = this.scanStopMethod;
    if (this.connectMethod) $native.ble.connect = this.connectMethod;
    if (this.disconnectMethod) $native.ble.disconnect = this.disconnectMethod;
    if (this.discoverMethod) $native.ble.discover = this.discoverMethod;
    if (this.readMethod) $native.ble.read = this.readMethod;
    if (this.writeMethod) $native.ble.write = this.writeMethod;
    if (this.notifyMethod) $native.ble.notify = this.notifyMethod;

    // 登録したイベントリスナーを解除
    if (this.unsubscribeEventUnauthorized) this.unsubscribeEventUnauthorized();
    if (this.unsubscribeEventFound) this.unsubscribeEventFound();
    if (this.unsubscribeEventConnectFailed)
      this.unsubscribeEventConnectFailed();
    if (this.unsubscribeEventConnected) this.unsubscribeEventConnected();
    if (this.unsubscribeDiscoverFailed) this.unsubscribeDiscoverFailed();
    if (this.unsubscribeDiscovered) this.unsubscribeDiscovered();
    if (this.unsubscribeEventDisconnected) this.unsubscribeEventDisconnected();
    if (this.unsubscribeEventChanged) this.unsubscribeEventChanged();
    if (this.unsubscribeEventWrite) this.unsubscribeEventWrite();

    this.isSetup = false;
  }
}
