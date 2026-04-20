export type QuattroAppEventCommandCallbackParam1 =
  | 'exit'
  | 'open'
  | 'download'
  | 'import'
  | 'export'
  | 'url'
  | 'barcode';

export type QuattroAppFilterObject = {
  /**
   * UTI 文字列の配列（iOS用）
   * 例：['public.audio']
   */
  uti: string[];

  /**
   * MIME 文字列の配列（Android用）
   * 例：['audio/*']
   */
  mime: string[];
};

export type QuattroAppEventCommandCallback = (
  /** コマンドパラメータ1（実装依存） */
  param1: QuattroAppEventCommandCallbackParam1,

  /** コマンドパラメータ2（実装依存） */
  param2: string | string[]
) => void;

export interface QuattroAppDevice {
  /** 端末の機種 */
  model: string;

  /** 端末の OS 情報（OS 名、バージョン） */
  os: number;

  /** 端末の固有 ID（UUIDv4 形式） */
  id: string;
}

export interface QuattroAppVersion {
  /** バージョン文字列 */
  name: string;

  /** ビルド番号 */
  code: number;

  /** アプリケーションのインストール日時（ISO 8601 形式） */
  ctime: string;

  /** アプリケーションの更新日時（ISO 8601 形式） */
  mtime: number;
}
