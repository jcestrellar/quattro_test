/**
 * 自作したネイティブ処理を一元管理する。
 *  Quattro
 */

import { QuattroCalculateEventAlertCallback } from './quattroCalculateTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroCalculate {
  private static _instance: QuattroCalculate;
  static get instance(): QuattroCalculate {
    if (!QuattroCalculate._instance) {
      QuattroCalculate._instance = new QuattroCalculate();
    }
    return QuattroCalculate._instance;
  }

  private constructor() {
    // $native を拡張する
    $native.calc = {
      multiple: (a: number, b: number) => $native.call('$$calc_multiple', a, b),
      event: {
        alert: (message: string) => {
          this.eventAlertListeners.forEach((cb) => cb(message));
        },
      },
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */
  // $native.calc.event.alert
  private eventAlertListeners: QuattroCalculateEventAlertCallback[] = [];
  onEventAlert(callback: QuattroCalculateEventAlertCallback) {
    this.eventAlertListeners.push(callback);
    return () => {
      this.eventAlertListeners = this.eventAlertListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */
  multiple(a: number, b: number) {
    return $native.calc.multiple(a, b);
  }

  alert(message: string) {
    $native.app.control(message);
  }
}
