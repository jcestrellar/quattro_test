export type QuattroFsEventOpenFilenameCallback = (file: string) => void;
export type QuattroFsEventSaveFilenameCallback = (file: string) => void;
export type QuattroFsEventChooseFilenameCallback = (path: string) => void;
export type QuattroFsEventUnmountedCallback = (path: string) => void;
export type QuattroFsEventUnmountFailedCallback = (
  path: string,
  reason: string
) => void;
export type QuattroFsEventWatchCallback = (paths: string[]) => void;

/**
 * Quattro ファイルシステムにおける標準ディレクトリの列挙型。
 * 各値は、プラットフォームに応じた特定のパスを表します。
 */
export enum QuattroFsWhere {
  /** ユーザーの 'ホーム' ディレクトリ */
  Home = 'Home',

  /** ユーザーの 'ドキュメント' ディレクトリ */
  Documents = 'Documents',

  /** ユーザーの 'ミュージック' ディレクトリ */
  Music = 'Music',

  /** ユーザーの 'ビデオ' ディレクトリ */
  Movies = 'Movies',

  /** ユーザーの 'ピクチャ' ディレクトリ */
  Pictures = 'Pictures',

  /** ユーザーの 'ダウンロード' ディレクトリ */
  Downloads = 'Downloads',

  /** アプリケーションの 'ライブラリ' ディレクトリ */
  Library = 'Library',

  /** アプリケーションの 'テンポラリ' ディレクトリ */
  Temporary = 'Temporary',

  /** アプリケーションのバンドルパス（Android は res/raw ディレクトリ） */
  Bundle = 'Bundle',
}

export type QuattroFsVolumeObject = {
  /** ボリューム名 */
  volume: string;

  /** マウントパス */
  mount: string;
};

export type QuattroFsDirectoryInfoObject = {
  /** ファイル名 */
  name: string;

  /** ファイルサイズ */
  size: string;

  /** ディレクトリフラグ */
  directory: boolean;

  /** 読み込み可能フラグ */
  readable: boolean;

  /** 書き込み可能フラグ */
  writable: boolean;

  /** 削除可能フラグ */
  deletable: boolean;
};

export type QuattroFsFileInfoObject = {
  /** ファイル名 */
  name: string;

  /** ファイルサイズ */
  size: string;

  /** ディレクトリフラグ */
  directory: boolean;

  /** 読み込み可能フラグ */
  readable: boolean;

  /** 書き込み可能フラグ */
  writable: boolean;

  /** 削除可能フラグ */
  deletable: boolean;
};

export type QuattroFsPatialObject = {
  /** 読み込み開始位置 */
  offset: number;

  /** 読み込むデータのサイズ */
  length: number;
};
