/**
 * quattro の RCPLog オブジェクトを管理する。
 */

import { RcpLogBody, RcpLogEventName } from './rcpLogTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const RCPLog: any;

export class QuattroRcpLog {
  private static _instance: QuattroRcpLog;
  static get instance(): QuattroRcpLog {
    if (!QuattroRcpLog._instance) {
      QuattroRcpLog._instance = new QuattroRcpLog();
    }
    return QuattroRcpLog._instance;
  }

  // Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  private rcplog: any = undefined;

  private constructor() {}

  /**
   * RCPLog を初期化します。
   * 最初に一度だけ呼び出してください。
   * @param url https://{stage-}rcpsvc.roland.com/log/{serviceName}
   * @param tracking user() API を利用する場合は true を指定する。
   */
  initialize(url: string, tracking: boolean) {
    this.rcplog = new RCPLog(url, tracking);
    // #hoishi
    console.log('RCPLog Initialized.', url, tracking);
  }

  /**
   * ログの送信を有効にします。
   * @param eventCommon 共通イベントオブジェクト
   * @note
   *   共通イベント用のオブジェクトを eventCommon へ指定する。
   *   eventCommon オブジェクトが引数として指定された場合、RCP_log のデフォルト送信イベント（※ app_user を除く）および RCPLog.post({ ... }) によって送信されるアプリイベントに対して、eventCommon オブジェクトの すべてのメンバーを付加して送信する。
   *   eventCommon オブジェクトのメンバーを付加する際、同一キーが既に設定されている場合は、既存の値を優先し、eventCommon 側の値で上書きは行わない。
   */
  optin(eventCommon?: Record<string, unknown>) {
    this.rcplog.optin(eventCommon);

    // #hoishi
    console.log('RCPLog optin:', eventCommon);
  }

  /**
   * ログの送信を無効にします。
   */
  optout() {
    this.rcplog.optout();

    // #hoishi
    console.log('RCPLog optout');
  }

  /**
   * ログを送信します。
   * @param eventName イベント名
   * @param body ログ本文
   */
  post(eventName: RcpLogEventName, body: RcpLogBody) {
    this.rcplog.post(eventName, body);

    // #hoishi
    console.log('RCPLog post:', eventName, body);
  }

  /**
   * ユーザー ID を紐付けます。
   * コンストラクタで tracking : true 時に有効です。
   * @param idToken
   */
  user(idToken: string) {
    this.rcplog.user(idToken);

    // #hoishi
    console.log('RCPLog link:', idToken);
  }

  /**
   * ユーザー ID の紐付けを解除します。
   * @param idToken
   * @returns Promise<number>
   *   成功時は Promise が解決され、値は返されません。
   *   失敗時は Promise が拒否され、HTTP ステータスコード（エラーステータス）または -1（ネットワークエラー）が返されます。
   */
  remove(idToken: string): Promise<number> {
    const response: Promise<number> = this.rcplog.remove(idToken);

    // #hoishi
    console.log('RCPLog unlink:', idToken);

    response.catch((code: number) => {
      if (code === 404) {
        console.log('RCPLog unlink: No logs');
      } else {
        console.error(`RCPLog unlinkUserId error: code=${code}`);
      }
    });

    return response;
  }
}
