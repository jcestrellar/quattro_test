/**
 * $native.fs の API を一元管理する。
 */

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $event: any;

export class QuattroEvent {
  private static _instance: QuattroEvent;
  static get instance(): QuattroEvent {
    if (!QuattroEvent._instance) {
      QuattroEvent._instance = new QuattroEvent();
    }
    return QuattroEvent._instance;
  }

  private constructor() {}

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */

  /**
   * ネイティブからのイベント取得を開始する
   */
  start(): void {
    $event.start();
  }
}
