/**
 * $native.fs の API を一元管理する。
 */

import { SystemDevice } from '../../systemDevice';
import {
  QuattroFsWhere,
  QuattroFsEventChooseFilenameCallback,
  QuattroFsEventOpenFilenameCallback,
  QuattroFsEventSaveFilenameCallback,
  QuattroFsPatialObject,
  QuattroFsVolumeObject,
  QuattroFsDirectoryInfoObject,
  QuattroFsFileInfoObject,
  QuattroFsEventUnmountedCallback,
  QuattroFsEventUnmountFailedCallback,
  QuattroFsEventWatchCallback,
} from './quattroFsTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroFs {
  private static _instance: QuattroFs;
  static get instance(): QuattroFs {
    if (!QuattroFs._instance) {
      QuattroFs._instance = new QuattroFs();
      QuattroFs._instance.init();
    }
    return QuattroFs._instance;
  }

  private constructor() {}

  init() {
    $native.fs.event.openfilename = (file: string) => {
      this.eventOpenFilenameListeners.forEach((cb) => cb(file));
    };

    $native.fs.event.savefilename = (file: string) => {
      this.eventSaveFilenameListeners.forEach((cb) => cb(file));
    };

    $native.fs.event.choosefilename = (file: string) => {
      this.eventChooseFilenameListeners.forEach((cb) => cb(file));
    };

    $native.fs.event.unmounted = (path: string) => {
      this.eventUnmountedListeners.forEach((cb) => cb(path));
    };

    $native.fs.event.unmountfailed = (path: string, reason: string) => {
      this.eventUnmountFailedListeners.forEach((cb) => cb(path, reason));
    };

    $native.fs.event.watch = (paths: string[]) => {
      this.eventWatchListeners.forEach((cb) => cb(paths));
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */
  // $native.fs.event.openfilename
  private eventOpenFilenameListeners: QuattroFsEventOpenFilenameCallback[] = [];
  /**
   * ユーザーが選択したファイル名を通知します。
   * キャンセルした場合は、''（空文字）が通知されます。
   * @param callback
   * @returns
   */
  onEventOpenFilename(callback: QuattroFsEventOpenFilenameCallback) {
    this.eventOpenFilenameListeners.push(callback);
    return () => {
      this.eventOpenFilenameListeners = this.eventOpenFilenameListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.fs.event.savefilename
  private eventSaveFilenameListeners: QuattroFsEventSaveFilenameCallback[] = [];
  /**
   * ユーザーが選択したファイル名を通知します。
   * キャンセルした場合は、''（空文字）が通知されます。
   * @param callback
   * @returns
   */
  onEventSaveFilename(callback: QuattroFsEventSaveFilenameCallback) {
    this.eventSaveFilenameListeners.push(callback);
    return () => {
      this.eventSaveFilenameListeners = this.eventSaveFilenameListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.fs.event.choosefilename
  private eventChooseFilenameListeners: QuattroFsEventChooseFilenameCallback[] =
    [];
  /**
   * ユーザーが選択したディレクトリパスを通知します。
   * キャンセルした場合は、''（空文字）が通知されます。
   * @param callback
   * @returns
   */
  onEventChooseFilename(callback: QuattroFsEventChooseFilenameCallback) {
    this.eventChooseFilenameListeners.push(callback);
    return () => {
      this.eventChooseFilenameListeners =
        this.eventChooseFilenameListeners.filter((cb) => cb !== callback);
    };
  }

  // $native.fs.event.unmounted
  private eventUnmountedListeners: QuattroFsEventUnmountedCallback[] = [];
  /**
   * path のアンマウントが成功した場合に通知されます。
   * @param callback
   * @returns
   */
  onEventUnmounted(callback: QuattroFsEventUnmountedCallback) {
    this.eventUnmountedListeners.push(callback);
    return () => {
      this.eventUnmountedListeners = this.eventUnmountedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  // $native.fs.event.unmountfailed
  private eventUnmountFailedListeners: QuattroFsEventUnmountFailedCallback[] =
    [];
  /**
   * path のアンマウントが失敗した場合に通知されます。
   * @param callback
   * @returns
   */
  onEventUnmountFailed(callback: QuattroFsEventUnmountFailedCallback) {
    this.eventUnmountFailedListeners.push(callback);
    return () => {
      this.eventUnmountFailedListeners =
        this.eventUnmountFailedListeners.filter((cb) => cb !== callback);
    };
  }

  // $native.fs.event.unmountfailed
  private eventWatchListeners: QuattroFsEventWatchCallback[] = [];
  /**
   * 監視対象のディレクトリ内容が変更された場合に通知されます。
   * @param callback
   * @returns
   */
  onEventWatch(callback: QuattroFsEventWatchCallback) {
    this.eventWatchListeners.push(callback);
    return () => {
      this.eventWatchListeners = this.eventWatchListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */

  /**
   * パス区切り文字を取得します。
   * @returns
   */
  separator(): string {
    return $native.fs.separator();
  }

  /**
   * directory で指定されたローカルパスを取得します。
   *
   * @param directory 取得するパスの指定
   * @returns ディレクトリパス
   */
  path(where: QuattroFsWhere): string {
    return $native.fs.path(where);
  }

  /**
   * マウントされているボリューム情報を取得します。
   * @returns ボリューム情報オブジェクトの配列
   */
  volumes(): QuattroFsVolumeObject[] {
    return $native.fs.volumes();
  }

  /**
   * path が示すディレクトリ情報を取得します。
   * @param path ディレクトリパス
   * @returns ディレクトリ情報オブジェクトの配列
   * @throws {Error}
   */
  contents(path: string): QuattroFsDirectoryInfoObject[] {
    return $native.fs.contents(path);
  }

  /**
   * path が示すファイル情報を取得します。
   * @param path  ファイルパス
   * @returns ファイル情報オブジェクト
   * @throws {Error}
   */
  stat(path: string): QuattroFsFileInfoObject {
    return $native.fs.stat(path);
  }

  /**
   * 指定したファイル、または URL を実行します。
   * @note http または https スキームを含む URL 指定すると、ネイティブの適切なビューアで開きます。
   */
  exec(path: string): void {
    if (SystemDevice.isRunningOnQuattro) {
      $native.fs.exec(path);
    } else {
      window.open(path, '_blank');
    }
  }

  /**
   * path で指定されたディレクトリを作成します。
   * @param path パス
   * @throws {Error}
   */
  mkdir(path: string): void {
    $native.fs.mkdir(path);
  }

  /**
   * path で指定されたファイルまたはディレクトリを削除します。
   * @param path パス
   * @throws {Error}
   */
  unlink(path: string): void {
    $native.fs.unlink(path);
  }

  /**
   * ファイルをコピーします。
   * @param from コピー元のファイルパス
   * @param to コピー先のファイルパス
   * @throws {Error}
   */
  copy(from: string, to: string): void {
    $native.fs.copy(from, to);
  }

  /**
   * ファイルをコピーします。
   * @param from コピー元のファイルパス
   * @param to コピー先のファイルパス
   * @throws {Error}
   */
  move(from: string, to: string): void {
    $native.fs.move(from, to);
  }

  /**
   * zipファイルを展開します。
   * @param zip zipファイルパス
   * @param folder 展開先のディレクトリパス
   * @throws {Error}
   */
  unzip(zip: string, folder: string): void {
    $native.fs.unzip(zip, folder);
  }

  /**
   * 指定されたパスのテキストファイルを読み込んで文字列として返す。
   *
   * @param path 読み込むファイルのパス
   * @returns ファイルの内容（文字列）を Promise で返す
   * @throws {Error}
   * @note
   *   Quattro 環境ではネイティブAPIを使って同期的に読み込む。
   *   Web 環境では fetch を使用して非同期に読み込む。
   */
  async readString(path: string): Promise<string> {
    if (SystemDevice.isRunningOnQuattro) {
      return $native.fs.readString(path);
    } else {
      const text = await fetch(path)
        .then((response) => response.text())
        .catch((error) => console.error('Error readString:', error));
      return text ?? '';
    }
  }

  /**
   * file をバイナリ形式（HEX 表記）で読み込みます。
   * partial を指定しない場合は、ファイル全体を読み込みます。
   *
   * @param path ファイルのパス
   * @param partial 部分読み込みオブジェクト
   * @returns バイナリデータ（base64 やプレーン文字列など）
   * @throws {Error}
   * @note
   *   Quattro 環境ではネイティブAPIを使って同期的に読み込む。
   *   Web 環境では fetch を使用して非同期に読み込む。
   * @atention 一度に読み込めるデータの最大サイズは、512K（0x80000）バイトです。
   */
  async readData(
    path: string,
    partial?: QuattroFsPatialObject
  ): Promise<string> {
    if (SystemDevice.isRunningOnQuattro) {
      return $native.fs.readData(path, partial);
    } else {
      try {
        const response = await fetch(path);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Latin1（ISO-8859-1）として文字列化（各バイトがそのまま文字コードになる）
        const binaryString = Array.from(bytes)
          .map((b) => String.fromCharCode(b))
          .join('');

        return binaryString;
      } catch (e) {
        console.error('Error readData:', e);
        return '';
      }
    }
  }

  /**
   * バイナリデータ（HEX 表記）を、バイナリデータとして file に書き込みます。
   *
   * @param path ファイルパス
   * @param data バイナリデータ（HEX 表記）
   * @returns
   * @throws {Error}
   */
  writeData(path: string, data: string): void {
    if (SystemDevice.isRunningOnQuattro) {
      $native.fs.writeData(path, data);
    } else {
      // const data = await fetch(path)
      //   .then((response) => response.text())
      //   .catch((error) => {
      //     console.error('Error readData:', error);
      //     return '';
      //   });
      // return data;
    }
  }

  /**
   * テキストデータを UTF-8 形式で file に追加書き込みします。
   * @param file ファイルパス
   * @param text テキストデータ
   * @throws {Error}
   */
  appendString(file: string, text: string): void {
    $native.fs.appendString(file, text);
  }

  /**
   * バイナリデータ（HEX 表記）を、バイナリデータとして file に追加書き込みします。
   * @param file ファイルパス
   * @param data バイナリデータ（HEX 表記）
   */
  appendData(file: string, data: string): void {
    $native.fs.appendData(file, data);
  }

  /**
   * 「ファイルを開く」ダイアログを表示します。
   * ユーザーが選択したファイル名は、fs.event.openfilename で通知されます。
   * @param filter 拡張子フィルタの配列
   * @param path ダイアログの初期ディレクトリパス
   * @note
   * filter は、配列オブジェクトで与えてください。
   * 例）[ 'wav', 'aiff', 'mp3', 'm4a', 'mp4' ]
   */
  openFilename(filter?: string[], path?: string): void {
    $native.fs.openfilename(filter, path);
  }

  /**
   * 「ファイルを保存する」ダイアログを表示します。
   * ユーザーが選択したファイル名は、fs.event.savefilename で通知されます。
   * @param name 保存するファイル名
   * @param ext 保存する拡張子
   */
  saveFilename(name?: string, ext?: string): void {
    $native.fs.savefilename(name, ext);
  }

  /**
   * 「フォルダの選択」ダイアログを表示します。
   * ユーザーが選択したディレクトリパスは、fs.event.choosefolder で通知されます。
   * @param path
   */
  chooseFolder(path?: string): void {
    $native.fs.choosefolder(path);
  }

  /**
   * path で指定されたボリュームをアンマウントします。
   * 結果は、fs.event.unmounted || unmountfailed で通知されます。
   * @param path マウントパス
   */
  unmount(path: string): void {
    $native.fs.unmount(path);
  }

  /**
   * path で指定されたディレクトリ階層内の変更を監視します。
   * ディレクトリ内容が変更された場合は、fs.event.watch で通知されます。
   * path に ''（空文字）を指定した場合は、監視をキャンセルします。
   * @param path 監視するディレクトリパス
   */
  watch(path: string): void {
    $native.fs.watch(path);
  }
}
