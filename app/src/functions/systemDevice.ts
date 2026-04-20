import { Quattro } from './quattro/quattro';
import { QuattroFsWhere } from './quattro/quattroFs/quattroFsTypes';

export enum OsType {
  iOS,
  Android,
  Windows,
  Mac,
  Other,
}

export class SystemDevice {
  private static userAgent = navigator.userAgent;

  /**
   * アプリが Quattro フレームワーク上で動作しているかを判定。
   *
   * Vite の開発サーバーを使用してデバッグしている等か否かで処理を分けたい場合などに使用する。
   * @returns {boolean} quattro 上で動作していれば `true`、それ以外は `false`
   */
  static get isRunningOnQuattro(): boolean {
    return this.userAgent.includes('quattro');
  }

  /**
   * アプリ実行環境の OS 種別
   *
   * navigator.userAgent 情報を基に `OsType` を判定して返す。
   * Chrome の DevTools でモバイル表示をしている場合は、
   * Android や iPhone など選択中のエミュレートデバイスの UA に従って判定される。
   *
   * @returns {OsType} iOS / Android / Mac / Windows / Other のいずれか
   */
  static get os(): OsType {
    if (this.userAgent.includes('roland.quattro(iOS)')) {
      return OsType.iOS;
    } else if (this.userAgent.includes('roland.quattro(Android)')) {
      return OsType.Android;
    } else if (this.userAgent.includes('roland.quattro(Mac)')) {
      return OsType.Mac;
    } else if (this.userAgent.includes('roland.quattro(Win)')) {
      return OsType.Windows;
    } else {
      return OsType.Other;
    }
  }

  /**
   * アプリ実行環境 OS がモバイル（iOS または Android）かどうかを判定する。
   */
  static get isMobile(): boolean {
    return this.os === OsType.iOS || this.os === OsType.Android;
  }

  /**
   * アプリ実行環境 OS がデスクトップ（Windows または Mac）かどうかを判定する。
   */
  static get isDesktop(): boolean {
    return this.os === OsType.Windows || this.os === OsType.Mac;
  }

  /**
   * 現在のプラットフォームに応じた Web アセットのルートパス（index.html がある場所）を返す。
   *
   * - Android: `window.location.href` をもとに `file://` を除去し、"html" ディレクトリまでのパスを構築。
   * - Windows:
   *   - development モード（Debug ビルド）では、相対パス `../html` を返す。
   *   - production モード（Release ビルド）では、Quattro の `Bundle` パスに `html` を追加して返す。
   * - iOS / macOS: Quattro の `Bundle` パスに `html` を追加して返す。
   * - その他: 相対パス `"."` を返す（通常は開発時のローカル環境を想定）。
   *
   * このパスは、Quattro.fs の `readString` や `readData` に渡すことで、
   * 埋め込みリソース（例：テキストファイル、バイナリファイルなど）を読み込む際に使用できる。
   *
   * @returns HTML アセットのルートとなるベースパス（文字列）
   */
  static get currentIndexPath(): string {
    let basePath = '';
    switch (this.os) {
      case OsType.Android: {
        const currentPath = window.location.href;
        basePath = currentPath.replace('file://', '').split('html')[0] + 'html';
        break;
      }

      case OsType.Windows: {
        // Windows だけ build モードで分岐
        const mode = import.meta.env.MODE;
        if (mode === 'development') {
          // Debug 時（html フォルダにそのままアクセス）
          basePath = '../html';
        } else {
          // Release 時（unzip 済みバンドル）
          const path = Quattro.fs.path(QuattroFsWhere.Bundle);
          basePath = `${path}html`;
        }
        break;
      }

      case OsType.iOS:
      case OsType.Mac: {
        const path = Quattro.fs.path(QuattroFsWhere.Bundle);
        basePath = `${path}html`;
        break;
      }

      case OsType.Other:
      default:
        basePath = '.';
        break;
    }

    return basePath;
  }
}
