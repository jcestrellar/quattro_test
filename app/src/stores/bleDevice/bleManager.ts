import { Dt1Transport } from '../../functions/dt1Transport/dt1Transport';

/**
 * BLE 通信における DT1 プロトコルのトランスポート層と、
 * 登録されたイベントリスナーの解除を管理するマネージャークラス
 */
class BleManager {
  public dt1Transport: Dt1Transport | null = null;
  public unsubscribeEventChanged: (() => void) | null = null;
  public unsubscribeEventWrite: (() => void) | null = null;
  public unsubscribeSysEx: (() => void) | null = null;

  /**
   * 登録されているすべてのイベントリスナーを解除し、インスタンスの状態を初期化
   * デバイスの切断時やアプリケーションのクリーンアップ時に呼び出す
   */
  public clearAll() {
    this.unsubscribeEventChanged?.();
    this.unsubscribeEventWrite?.();
    this.unsubscribeSysEx?.();

    this.unsubscribeEventChanged = null;
    this.unsubscribeEventWrite = null;
    this.unsubscribeSysEx = null;
    this.dt1Transport = null;
  }
}

export const bleManager = new BleManager();
