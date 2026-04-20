/**
 * 自作したネイティブ処理を一元管理する。
 *  Quattro
 */

import {
  BatteryState,
  QuattroBatteryEventLevelChangedCallback,
  QuattroBatteryEventStateChangedCallback,
} from './quattroBatteryTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroBattery {
  private static _instance: QuattroBattery;
  static get instance(): QuattroBattery {
    if (!QuattroBattery._instance) {
      QuattroBattery._instance = new QuattroBattery();
    }
    return QuattroBattery._instance;
  }

  private constructor() {
    // $native を拡張する
    $native.battery = {
      /**
       * デバイスのバッテリーレベルを取得します。
       * @return
       *   値が正常に取得できた場合は、0.0 〜 1.0 の値を取得します。
       *   値が正常に取得出来なかった場合は、-1.0 を取得します。
       */
      level: (): number => $native.call('$$battery_level'),

      /**
       * デバイスの充電状態を取得します。
       * @return BatteryState
       */
      state: (): BatteryState => $native.call('$$battery_state'),

      /**
       * デバイスのバッテリー状態の取得及び変更通知の受取を有効化するかの設定を行います。
       *
       * バッテリーに関する値を取得する場合には、はじめに有効にしてください。
       * @param enabeld
       */
      monitoring: (enabeld: boolean): void =>
        $native.call('$$battery_monitoring', enabeld),
      event: {
        /**
         * デバイスのバッテリーレベルの変更通知。
         *
         * @param
         *   値が正常に取得できた場合は、0.0 〜 1.0 の値を取得します。
         *   値が正常に取得出来なかった場合は、-1.0 を取得します。
         * */
        levelChanged: (level: string) => {
          console.log('levelChanged:', level, typeof level);
          let _level = Number(level);
          if (Number.isNaN(_level)) {
            _level = -1;
          }

          this.eventLevelChangedListeners.forEach((cb) => cb(_level));
        },

        /**
         * デバイスの充電状態の変更通知。
         * @param BatteryState
         */
        stateChanged: (state: string) => {
          console.log('stateChanged:', state, typeof state);
          let _state: BatteryState = Number(state);
          if (Number.isNaN(_state)) {
            _state = BatteryState.Unknown;
          }

          this.eventStateChangedListeners.forEach((cb) => cb(_state));
        },
      },
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */
  // $native.battery.event.levelChanged
  private eventLevelChangedListeners: QuattroBatteryEventLevelChangedCallback[] =
    [];
  onEventBatteryLevelChanged(
    callback: QuattroBatteryEventLevelChangedCallback
  ) {
    this.eventLevelChangedListeners.push(callback);
    return () => {
      this.eventLevelChangedListeners = this.eventLevelChangedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.battery.event.stateChanged
  private eventStateChangedListeners: QuattroBatteryEventStateChangedCallback[] =
    [];
  onEventBatteryStateChanged(
    callback: QuattroBatteryEventStateChangedCallback
  ) {
    this.eventStateChangedListeners.push(callback);
    return () => {
      this.eventStateChangedListeners = this.eventStateChangedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */
  value(): number {
    return $native.battery.level();
  }

  state(): BatteryState {
    return $native.battery.state();
  }

  setMonitoringEnabled(enabled: boolean): void {
    $native.battery.monitoring(enabled);
  }
}
