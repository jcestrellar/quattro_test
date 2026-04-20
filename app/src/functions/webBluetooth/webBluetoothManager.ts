import {
  QuattroBleEndpoint,
  QuattroBleEndpointProperty,
} from '../quattro/quattroBle/quattroBleTypes';
import { hexTo8x1 } from '../binaryTransform/binaryTransform';

/** 接続中の BLE 端末のセッション情報を保持する型 */
export type BleEndpoint = {
  /** Web Bluetooth デバイスオブジェクト */
  device: BluetoothDevice;
  /** GATT サーバー（接続中のみ存在） */
  server?: BluetoothRemoteGATTServer;
  /** 探索済みのサービスマップ (UUID -> Service) */
  services: Map<string, BluetoothRemoteGATTService>;
  /** 探索済みのキャラクタリスティックマップ (serviceUUID/charUUID -> Characteristic) */
  characteristics: Map<string, BluetoothRemoteGATTCharacteristic>;
};

type FoundCallback = (
  id: string,
  name: string | undefined,
  rssi?: number
) => void;
type ConnectedCallback = (id: string, name?: string) => void;
type ConnectFailedCallback = (
  id: string,
  name?: string,
  reason?: unknown
) => void;
type DisconnectedCallback = (id: string, name?: string) => void;
type DiscoveredCallback = (
  id: string,
  service: string,
  characteristics: string[]
) => void;
type DiscoverFailedCallback = (id: string, reason?: unknown) => void;
type ChangedCallback = (
  ep: QuattroBleEndpoint,
  valueHex: string,
  error?: string
) => void;
type WriteCallback = (ep: QuattroBleEndpoint, error?: string) => void;
type UnauthorizedCallback = () => void;

/**
 * アプリケーション全体で Web Bluetooth API を通じた BLE デバイスの管理を行うシングルトンクラス。
 * React に依存しないため、任意のレイヤーや環境から利用可能。
 */
export class WebBleManager {
  private static _instance: WebBleManager;

  private bleEndpoints = new Map<string, BleEndpoint>();

  private onUnauthorizedListeners: UnauthorizedCallback[] = [];
  private onFoundListeners: FoundCallback[] = [];
  private onConnectedListeners: ConnectedCallback[] = [];
  private onConnectFailedListeners: ConnectFailedCallback[] = [];
  private onDisconnectedListeners: DisconnectedCallback[] = [];
  private onDiscoveredListeners: DiscoveredCallback[] = [];
  private onDiscoverFailedListeners: DiscoverFailedCallback[] = [];
  private onChangedListeners: ChangedCallback[] = [];
  private onWriteListeners: WriteCallback[] = [];

  /** 書き込み処理を順序正しく実行するための Promise チェーン */
  private writeChain: Promise<void> = Promise.resolve();

  private constructor() {}

  static get instance() {
    if (!WebBleManager._instance) {
      WebBleManager._instance = new WebBleManager();
    }
    return WebBleManager._instance;
  }

  /**
   * デバイス選択ダイアログを表示し、ユーザーが選択したデバイスをスキャン結果として通知する。
   * このメソッドはユーザーのジェスチャー（クリック等）から直接呼び出す必要がある。
   * @param serviceUUIDs フィルタリングするサービス UUID の配列
   * @returns 選択された BluetoothDevice オブジェクト。
   */
  async scanStart(serviceUUIDs: string[] = []) {
    try {
      const options: RequestDeviceOptions =
        serviceUUIDs.length > 0
          ? {
              // サービス指定あり：そのサービスを持つデバイスだけを探す
              filters: serviceUUIDs.map((s) => ({ services: [s] })),
              optionalServices: serviceUUIDs,
            }
          : {
              // サービス指定なし：すべてのデバイスを探す
              acceptAllDevices: true,
            };

      const device = await navigator.bluetooth.requestDevice(options);
      const newEndpoint: BleEndpoint = {
        device,
        services: new Map(),
        characteristics: new Map(),
      };
      this.bleEndpoints.set(device.id, newEndpoint);

      // RSSI は取れないので undefined
      this.onFoundListeners.forEach((cb) =>
        cb(device.id, device.name ?? undefined, undefined)
      );
      return device;
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === 'NotFoundError') {
          // Web Bluetooth ではキャンセル時に NotFoundError が発生するが、
          // Quattro にキャンセルを通知するイベントが存在しない。
          // そのため、onUnauthorizedListeners を無理やり叩いて通知させている。
          this.onUnauthorizedListeners.forEach((cb) => cb());
          throw e;
        }
        if (e.name === 'SecurityError' || e.name === 'NotAllowedError') {
          this.onUnauthorizedListeners.forEach((cb) => cb());
        }
      }
      throw e;
    }
  }

  /** スキャン（デバイス選択）の中止処理（Web Bluetooth では実質的なログ出力のみ） */
  scanStop(): void {
    console.log('WebBleManager: scanStop requested.');
  }

  /**
   * 指定された ID のデバイスに対して GATT 接続を試行する。
   * @param id デバイスの ID（device.id）
   */
  async connect(id: string) {
    const ep = this.bleEndpoints.get(id);
    if (!ep) throw new Error(`Endpoint not found: ${id}`);
    try {
      const onDisconnected = () => {
        ep.device.removeEventListener('gattserverdisconnected', onDisconnected);

        this.bleEndpoints.delete(id);

        this.onDisconnectedListeners.forEach((cb) =>
          cb(id, ep.device.name ?? undefined)
        );
      };
      ep.device.addEventListener('gattserverdisconnected', onDisconnected);

      ep.server = await ep.device.gatt?.connect();
      this.onConnectedListeners.forEach((cb) =>
        cb(id, ep.device.name ?? undefined)
      );
    } catch (e: unknown) {
      this.onConnectFailedListeners.forEach((cb) =>
        cb(id, ep.device.name ?? undefined, e)
      );
      throw e;
    }
  }

  /**
   * 指定した ID または全てのデバイスの接続を解除する。
   * * @param id 切断対象のデバイス ID。省略した場合は全てのデバイスを切断。
   */
  disconnect(id?: string): void {
    if (id) {
      // 特定のデバイスを切断
      const ep = this.bleEndpoints.get(id);
      if (ep) {
        if (ep.device.gatt?.connected) {
          ep.device.gatt.disconnect();
        }
        this.handleDisconnection(id, ep.device.name ?? undefined);
      }
    } else {
      // id 指定なし：接続中のすべてのデバイスを切断
      const deviceIds = Array.from(this.bleEndpoints.keys());
      deviceIds.forEach((id) => {
        const ep = this.bleEndpoints.get(id);
        if (ep) {
          if (ep.device.gatt?.connected) {
            ep.device.gatt.disconnect();
          }
          this.handleDisconnection(id, ep.device.name ?? undefined);
        }
      });
    }
  }

  /**
   * 切断時の共通クリーンアップ処理
   * @private
   */
  private handleDisconnection(id: string, name?: string) {
    if (!this.bleEndpoints.has(id)) return;

    this.onDisconnectedListeners.forEach((cb) => cb(id, name));
    this.bleEndpoints.delete(id);
  }

  /**
   * 指定したサービス内のキャラクタリスティックを探索し、内部キャッシュに保存する。
   * * @param id デバイスの ID
   * @param serviceUUID 探索対象のサービス UUID
   * @returns 発見されたキャラクタリスティック UUID の配列
   */
  async discover(id: string, serviceUUID: string) {
    const ep = this.bleEndpoints.get(id);
    if (!ep || !ep.server) throw new Error(`Device not connected: ${id}`);
    try {
      const service = await ep.server.getPrimaryService(serviceUUID);
      ep.services.set(serviceUUID, service);

      const chars = await service.getCharacteristics();
      chars.forEach((c) => {
        ep.characteristics.set(`${serviceUUID}/${c.uuid}`, c);
      });

      const charUUIDs = chars.map((c) => c.uuid);
      this.onDiscoveredListeners.forEach((cb) =>
        cb(id, serviceUUID, charUUIDs)
      );
      return charUUIDs;
    } catch (e) {
      this.onDiscoverFailedListeners.forEach((cb) => cb(id, e));
      throw e;
    }
  }

  /**
   * 指定されたエンドポイントの読み書き、通知等の情報を取得する。
   * * @param ep 対象の QuattroBleEndpoint
   * @returns BLE プロパティ（read/write/notify等）の状況を保持するオブジェクト
   */
  properties(ep: QuattroBleEndpoint): QuattroBleEndpointProperty {
    try {
      const char = this.getLiveCharacteristic(ep);
      return char.properties;
    } catch {
      return {
        broadcast: false,
        read: false,
        writeWithoutResponse: false,
        write: false,
        notify: false,
        indicate: false,
      };
    }
  }
  /**
   * 通知の開始または停止を行う。
   * * @param ep 対象の QuattroBleEndpoint
   * @param enabled true で通知開始、false で停止
   */
  async notify(ep: QuattroBleEndpoint, enabled: boolean) {
    try {
      const char = this.getLiveCharacteristic(ep);

      if (enabled) {
        await char.startNotifications();

        // 受信時のイベントリスナー
        char.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          const value = target.value;
          if (!value) return;
          const data = new Uint8Array(value.buffer);
          const hex = Array.from(data)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
          this.onChangedListeners.forEach((cb) => cb(ep, hex, ''));
        });
      } else {
        await char.stopNotifications();
      }
    } catch (e: unknown) {
      console.error(
        `Failed to toggle notify for ${ep.BLECharacteristicKey}`,
        e
      );
    }
  }

  /**
   * キャラクタリスティックから現在の値を読み込む。
   * 結果は onChanged リスナーを通じて通知される。
   * * @param ep 対象の QuattroBleEndpoint
   */
  async read(ep: QuattroBleEndpoint) {
    try {
      const char = this.getLiveCharacteristic(ep);

      const value = await char.readValue();
      const data = new Uint8Array(value.buffer);

      const hex = Array.from(data)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

      this.onChangedListeners.forEach((cb) => cb(ep, hex, ''));
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.onChangedListeners.forEach((cb) => cb(ep, '', errMsg));
    }
  }

  /**
   * レスポンスありの書き込み（Write Request）を実行する。
   * * @param ep 対象の QuattroBleEndpoint
   * @param hex 送信する 16進文字列
   */
  async write(ep: QuattroBleEndpoint, hex: string) {
    await this._doWrite(ep, hex, false);
  }

  /**
   * レスポンスなしの書き込み（Write Without Response / Write Command）を実行する。
   * * @param ep 対象の QuattroBleEndpoint
   * @param hex 送信する 16進文字列
   */
  async writeWithoutResponse(ep: QuattroBleEndpoint, hex: string) {
    await this._doWrite(ep, hex, true);
  }

  private async _doWrite(
    ep: QuattroBleEndpoint,
    hex: string,
    withoutResponse: boolean
  ) {
    this.writeChain = this.writeChain.then(async () => {
      try {
        const char = this.getLiveCharacteristic(ep);
        const chunk = hexTo8x1(hex);
        const packet = new Uint8Array([...chunk]);
        if (withoutResponse && char.properties.writeWithoutResponse) {
          await char.writeValueWithoutResponse(packet);
        } else {
          await char.writeValue(packet);
        }

        this.onWriteListeners.forEach((cb) => cb(ep, ''));
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        this.onWriteListeners.forEach((cb) => cb(ep, errMsg));
      }
    });
    return this.writeChain;
  }

  /**
   * 権限エラー時のリスナーを登録する。
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onUnauthorized(callback: UnauthorizedCallback) {
    this.onUnauthorizedListeners.push(callback);
    return () => {
      this.onUnauthorizedListeners = this.onUnauthorizedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * デバイスが発見（ユーザーにより選択）された時のリスナーを登録する。
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onFound(callback: FoundCallback) {
    this.onFoundListeners.push(callback);
    return () => {
      this.onFoundListeners = this.onFoundListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * デバイスへの接続が成功した時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onConnected(callback: ConnectedCallback) {
    this.onConnectedListeners.push(callback);
    return () => {
      this.onConnectedListeners = this.onConnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * デバイスへの接続が失敗した時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onConnectFailed(callback: ConnectFailedCallback) {
    this.onConnectFailedListeners.push(callback);
    return () => {
      this.onConnectFailedListeners = this.onConnectFailedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * デバイスとの接続が切断された時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onDisconnected(callback: DisconnectedCallback) {
    this.onDisconnectedListeners.push(callback);
    return () => {
      this.onDisconnectedListeners = this.onDisconnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * サービスおよびキャラクタリスティックの探索が完了した時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onDiscovered(callback: DiscoveredCallback) {
    this.onDiscoveredListeners.push(callback);
    return () => {
      this.onDiscoveredListeners = this.onDiscoveredListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * サービス探索が失敗した時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onDiscoverFailed(callback: DiscoverFailedCallback) {
    this.onDiscoverFailedListeners.push(callback);
    return () => {
      this.onDiscoverFailedListeners = this.onDiscoverFailedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 値の読み込みや通知によってデータを受信した時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onChanged(callback: ChangedCallback) {
    this.onChangedListeners.push(callback);
    return () => {
      this.onChangedListeners = this.onChangedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * デバイスへのデータ書き込みが完了（またはエラー終了）した時のリスナーを登録する
   * @param callback 実行されるコールバック関数
   * @returns 登録解除関数
   */
  onWrite(callback: WriteCallback) {
    this.onWriteListeners.push(callback);
    return () => {
      this.onWriteListeners = this.onWriteListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 内部管理しているデバイス情報から、現在有効な Web Bluetooth キャラクタリスティックを取得する
   * 接続されていない、または探索されていない場合はエラー
   * @param ep 対象の QuattroBleEndpoint
   * @returns Web Bluetooth のキャラクタリスティックオブジェクト
   * @private
   */
  private getLiveCharacteristic(
    ep: QuattroBleEndpoint
  ): BluetoothRemoteGATTCharacteristic {
    const session = this.bleEndpoints.get(ep.BLEPeripheralKey);
    if (!session) {
      throw new Error(`Device not connected: ${ep.BLEPeripheralKey}`);
    }

    const key = `${ep.BLEServiceKey.toLowerCase()}/${ep.BLECharacteristicKey.toLowerCase()}`;
    const char = session.characteristics.get(key);

    if (!char) {
      throw new Error(`Characteristic not found in cache: ${key}`);
    }

    return char;
  }
}
