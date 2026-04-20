/**
 * $native.midi の API を一元管理する。
 */

import {
  QuattroMidiBleDevice,
  QuattroMidiEndpoint,
  QuattroMidiEventBleCallback,
  QuattroMidiEventChangedCallback,
  QuattroMidiEventConnectFailedCallback,
  QuattroMidiEventErrorCallback,
  QuattroMidiEventMessageCallback,
} from './quattroMidiTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroMidi {
  private static _instance: QuattroMidi;
  static get instance(): QuattroMidi {
    if (!QuattroMidi._instance) {
      QuattroMidi._instance = new QuattroMidi();
      QuattroMidi._instance.init();
    }
    return QuattroMidi._instance;
  }

  private constructor() {}

  private init() {
    $native.midi.event.message = (msg: string, timestamp: number) => {
      this.eventMessageListeners.forEach((cb) => cb(msg, timestamp));
    };

    $native.midi.event.changed = () => {
      this.eventChangedListeners.forEach((cb) => cb());
    };

    $native.midi.event.connectfailed = (ep: QuattroMidiEndpoint) => {
      this.eventConnectFailedListeners.forEach((cb) => cb(ep));
    };

    $native.midi.event.error = (code: number) => {
      this.eventErrorListeners.forEach((cb) => cb(code));
    };

    $native.midi.event.ble = (devicesString: string) => {
      try {
        const devicesObjects: QuattroMidiBleDevice[] =
          JSON.parse(devicesString);
        if (Array.isArray(devicesObjects)) {
          this.eventBleListeners.forEach((cb) => cb(devicesObjects));
        }
      } catch (e) {
        console.error('MIDI BLE devices JSON parse error:', e);
      }
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */
  // $native.midi.event.message
  private eventMessageListeners: QuattroMidiEventMessageCallback[] = [];
  /**
   * MIDI メッセージを受信すると通知されます。
   * @param callback
   * @returns
   */
  onEventMessage(callback: QuattroMidiEventMessageCallback) {
    this.eventMessageListeners.push(callback);
    return () => {
      this.eventMessageListeners = this.eventMessageListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.midi.event.changed
  private eventChangedListeners: QuattroMidiEventChangedCallback[] = [];
  /**
   * MIDIデバイスがシステムに追加、削除されたときに通知されます。
   * @param callback
   * @returns
   */
  onEventChanged(callback: QuattroMidiEventChangedCallback) {
    this.eventChangedListeners.push(callback);
    return () => {
      this.eventChangedListeners = this.eventChangedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.midi.event.connectfailed
  private eventConnectFailedListeners: QuattroMidiEventConnectFailedCallback[] =
    [];
  /**
   * MIDIエンドポイントの接続に失敗したときに通知されます。
   * @param callback
   * @returns
   */
  onEventConnectFailed(callback: QuattroMidiEventConnectFailedCallback) {
    this.eventConnectFailedListeners.push(callback);
    return () => {
      this.eventConnectFailedListeners =
        this.eventConnectFailedListeners.filter((cb) => cb !== callback);
    };
  }

  // $native.midi.event.error
  private eventErrorListeners: QuattroMidiEventErrorCallback[] = [];
  /**
   * MIDI通信でエラーが発生した場合に通知されます。
   * @param callback
   * @returns
   */
  onEventError(callback: QuattroMidiEventErrorCallback) {
    this.eventErrorListeners.push(callback);
    return () => {
      this.eventErrorListeners = this.eventErrorListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.midi.event.ble
  private eventBleListeners: QuattroMidiEventBleCallback[] = [];
  onEventBle(callback: QuattroMidiEventBleCallback) {
    this.eventBleListeners.push(callback);
    return () => {
      this.eventBleListeners = this.eventBleListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */

  /**
   * MIDIパネルを表示します。
   * @note
   *   MIDIパネルは、プラットフォームによって以下が表示されます
   *   - Windows：設定 > Bluetooth とその他のデバイス
   *   - macOS：ユーティリティ > Audio MIDI 設定
   *   - iOS：Bluetooth MIDI Devices
   *   - Android：Bluetooth MIDI Devices
   */
  panel(): void {
    $native.midi.panel();
  }

  /**
   * MIDI入力エンドポイントの一覧を取得します。
   * @returns
   */
  inputEndpoints(): QuattroMidiEndpoint[] {
    const endpoints = $native.midi.input.endpoints();
    return Array.isArray(endpoints) ? endpoints : [];
  }

  /**
   * MIDI出力エンドポイントの一覧を取得します。
   * @returns
   */
  outputEndpoints(): QuattroMidiEndpoint[] {
    const endpoints = $native.midi.output.endpoints();
    return Array.isArray(endpoints) ? endpoints : [];
  }

  /**
   * MIDI入力エンドポイントと接続します。
   * ep を指定しない場合は、すべてのエンドポイントと接続します。
   * @param inputEndpoint
   */
  connectInputEndpoint(
    inputEndpoint: QuattroMidiEndpoint | undefined = undefined
  ): void {
    $native.midi.input.connect(inputEndpoint);
  }

  /**
   * MIDI出力エンドポイントと接続します。
   * ep を指定しない場合は、すべてのエンドポイントと接続します。
   * @param outputEndpoint
   */
  connectOutputEndpoint(
    outputEndpoint: QuattroMidiEndpoint | undefined = undefined
  ): void {
    $native.midi.output.connect(outputEndpoint);
  }

  /**
   * MIDI入力エンドポイントと切断します。
   * ep を指定しない場合は、すべてのエンドポイントと切断します。
   * @param inputEndpoint
   */
  disconnectInputEndpoints(
    inputEndpoint: QuattroMidiEndpoint | undefined = undefined
  ): void {
    $native.midi.input.disconnect(inputEndpoint);
  }

  /**
   * MIDI出力エンドポイントと切断します。ep を指定しない場合は、すべてのエンドポイントと切断します。
   * @param outputEndpoint
   */
  disconnectOutputEndpoints(
    outputEndpoint: QuattroMidiEndpoint | undefined = undefined
  ): void {
    $native.midi.output.disconnect(outputEndpoint);
  }

  connectBle(deviceId: string): void {
    $native.midi.ble.connect(deviceId);
  }

  disconnectBle(deviceId: string): void {
    $native.midi.ble.disconnect(deviceId);
  }

  /**
   * 接続しているMIDI出力エンドポイントへ、MIDIメッセージを送信します。
   * @param message 送信するMIDIメッセージ文字列（HEX 形式）
   * @note
   *   送信例）send('90607F');
   */
  send(message: string): void {
    $native.midi.send(message);
  }

  bleScanStart(): void {
    $native.midi.ble.scanstart();
  }

  bleScanStop(): void {
    $native.midi.ble.scanstop();
  }
}
