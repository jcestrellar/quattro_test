/**
 * $native.app の API を一元管理する。
 */

import { SystemDevice } from '../../systemDevice';
import {
  QuattroAppDevice,
  QuattroAppEventCommandCallback,
  QuattroAppEventCommandCallbackParam1,
  QuattroAppFilterObject,
  QuattroAppVersion,
} from './quattroAppTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroApp {
  private static _instance: QuattroApp;
  static get instance(): QuattroApp {
    if (!QuattroApp._instance) {
      QuattroApp._instance = new QuattroApp();
      QuattroApp._instance.init();
    }
    return QuattroApp._instance;
  }

  private constructor() {}

  init() {
    $native.app.event.command = (
      param1: QuattroAppEventCommandCallbackParam1,
      param2: string
    ) => {
      this.eventCommandListeners.forEach((cb) => cb(param1, param2));
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */
  // $native.app.event.command
  private eventCommandListeners: QuattroAppEventCommandCallback[] = [];
  /**
   * ネイティブで発生したコマンドを通知します。
   * @note
   *   以下のコマンドがシステムで使用されています。
   *   - app.event.command('exit') ... アプリケーションの終了通知（#define ENABLE_APP_EXIT が必要）
   *   - app.event.command('open', file) ... オープンするファイルの通知
   *   - app.event.command('download', url) ... ダウンロードする url の通知
   *   - app.event.command('import', file) ... インポートしたファイルの通知（複数選択可の場合は、file はパスの配列）
   *   - app.event.command('export', url) ... エクスポート先の url の通知（キャンセルした場合は、url は ''（空文字））
   *   - app.event.command('url', url) ... Universal Links/AppLinks や カスタム URL スキーム による通知
   *   - app.event.command('barcode', text) ... QR コードの読み取り通知（キャンセルした場合は、text は ''（空文字））
   */
  onEventCommand(callback: QuattroAppEventCommandCallback) {
    this.eventCommandListeners.push(callback);
    return () => {
      this.eventCommandListeners = this.eventCommandListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */

  /**
   * 端末情報を取得します。
   * @returns 端末情報オブジェクト
   */
  device(): QuattroAppDevice | undefined {
    const device = $native.app.device();
    return device === 0 ? undefined : device;
  }

  /**
   * ネイティブ側で設定されたバージョン情報を取得します。
   * @returns バージョン情報オブジェクト
   */
  version(): QuattroAppVersion | undefined {
    const verison = $native.app.version();
    return verison === 0 ? undefined : verison;
  }

  /**
   * システムのロケール情報を取得します。
   * @returns 現在のロケール情報（"en-US" や "ja-JP" 等）
   */
  locale(): string {
    return $native.app.locale();
  }

  /**
   * キーを指定して、ローカル環境にデータを永続的に保存します。また、保存したデータの取得を行います。
   * @note Quattro 未使用時（開発サーバーなど）は localStorage 使用。
   * @atention 'pref' と先頭が '__' で始まる文字列は、予約語のためキーには使用できません。
   */
  // 取得した値が空('') の場合は undefined を返す
  storage2(key: string): string | undefined {
    let value: string | undefined = '';
    if (SystemDevice.isRunningOnQuattro) {
      value = $native.app.storage2(key);
    } else {
      value = localStorage.getItem(key) ?? '';
    }

    if (value === '') {
      value = undefined;
    }

    return value;
  }

  setStorage2(key: string, value: string | boolean): void {
    let storageValue: string;
    if (typeof value === 'boolean') {
      storageValue = value ? 'true' : 'false';
    } else {
      storageValue = value;
    }

    if (SystemDevice.isRunningOnQuattro) {
      $native.app.storage2(key, storageValue);
    } else {
      localStorage.setItem(key, storageValue);
    }
  }

  /**
   * iCloudDrive や GoogleDrive などの外部ストレージからファイルをインポートします。
   * インポートされたファイルのパスは、app.event.command('import', file) で通知されます。
   * @param filter フィルタオブジェクト
   * @param multiple 複数選択可（true）／不可（false）
   * @atention iOS/Android のみ対応です。
   * インポートされたファイルのパスは 60 秒程度で無効になります。
   */
  importFile(filter?: QuattroAppFilterObject, multiple?: boolean) {
    $native.app.importfile(filter, multiple);
  }

  /**
   * iCloudDrive や GoogleDrive などの外部ストレージへ、ファイルをエクスポートします。
   * エクスポートされたファイルのパスは、app.event.command('export', file) で通知されます。
   * @param file エクスポートするファイルのパス
   * @atention iOS/Android のみ対応です。
   * @note
   * file をパスの配列（JSON形式）にすると、外部ストレージのフォルダ内へ、複数ファイルを一括コピーします。
   * フォルダ内に同名のファイルが存在する場合は、上書きコピーされます。
   */
  exportFile(file: string) {
    $native.app.exportfile(file);
  }

  /**
   * リクエスト文字列をネイティブ側に送り、独自実装された処理を行います。
   * @param request リクエスト文字列
   * @note
   * ネイティブ側では、以下の関数でリクエスト文字列を受け取ることができます。
   *   - win10：AppWebViewController.cpp ... void control(CStringW req)
   *   - macOS/iOS：AppWebViewController.m ... - (void)nativeControl:(NSString *)request
   *   - android：AppMainActivity.java ... public void control(final String request)
   */
  control(request: string) {
    $native.app.control(request);
  }

  /**
   *
   * @param url OAuth 認証用 URL
   * @param scheme 認証コード取得用のカスタム URL スキーム
   * @note
   * 認証コードは、Universal Links/AppLinks や カスタム URL スキーム を利用して、app.event.command('url', url) で取得します。
   */
  webAuth(url: string, scheme: string | undefined = undefined) {
    $native.app.webauth(url, scheme);
  }

  /**
   * カメラを起動し、QR コードの読み取りを開始します。読み取ったデータは、app.event.command('barcode', text) で通知されます。
   * @atention iOS/Android のみ対応です。
   */
  barcode() {
    $native.app.barcode();
  }
}
