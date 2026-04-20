import { Quattro } from '../../functions/quattro/quattro';
import { QuattroBleEndpoint } from '../quattro/quattroBle/quattroBleTypes';
import { bytesToHex, hexTo8x1 } from '../binaryTransform/binaryTransform';
type SysexParsed = { addr: number; data: number[] };
type SysexCallback = (parsed: SysexParsed) => void;

/**
 * Roland DT1 SysEx Transport over BLE
 *
 * BLE 経由で Roland 形式の DT1 SysEx メッセージを送受信するためのクラス。
 *
 * - 送信時:
 *   - DT1 header を付与
 *   - address を 7bit に分解
 *   - check sum 計算
 *   - maxDataLen ごとに分割して BLE 書き込み
 *
 * - 受信時:
 *   - STX (0xF0) – EOX (0xF7) をバッファリング
 *   - 1 message 単位でパース
 *   - 登録済みリスナーへ通知
 */
export class Dt1Transport {
  private STX = 0xf0; // System Exclusive
  private ROLANDID = 0x41; // ID
  private DEVICEID = 0x10; //Device ID
  private MODELID = [0x00, 0x00, 0x00, 0x00, 0x01]; //Model ID
  private DT1 = 0x12; //Command ID
  private EOX = 0xf7; //End of Exclusive

  /** SysExヘッダー（STX からcommand ID まで） */
  private HEADER = [
    this.STX,
    this.ROLANDID,
    this.DEVICEID,
    ...this.MODELID,
    this.DT1,
  ];
  private headerLen = this.HEADER.length;
  private addrLen = 4;
  private checksumLen = 1;
  private footerLen = this.checksumLen + [this.EOX].length;
  private maxDataLen = 20;

  private sysexBuf: number[] = [];
  private receiving = false;
  private sysexListeners: SysexCallback[] = [];

  constructor(private endpoint: QuattroBleEndpoint) {}

  /**
   * DT1 SysEx メッセージを送信
   *
   * @param address 32bit の送信先
   * @param data 7bit の送信するデータ
   *
   * 処理内容:
   * - address を 4byte (7bit mask) に分解
   * - checksum を計算
   * - HEADER + addr + data + checksum + EOX を構築
   * - maxDataLen ごとに分割して BLE 書き込み
   */
  async send(address: number, data: number[]) {
    const addr = [
      (address >> 24) & 0x7f,
      (address >> 16) & 0x7f,
      (address >> 8) & 0x7f,
      (address >> 0) & 0x7f,
    ];

    const checksum = this.checksum([...addr, ...data]);

    const msg = [...this.HEADER, ...addr, ...data, checksum, this.EOX];
    for (let i = 0; i < msg.length; i += this.maxDataLen) {
      const chunk = msg.slice(i, i + this.maxDataLen);
      const hex = bytesToHex(chunk);
      await Quattro.ble.write(this.endpoint, hex);
    }
  }

  /**
   * Checksum 計算
   *
   * @param bytes チェックサム対象バイト列
   * @returns 7bit チェックサム値
   *
   * (128 - (sum(bytes) % 128)) & 0x7f
   */
  private checksum(bytes: number[]): number {
    let sum = 0;
    bytes.forEach((b) => (sum += b));
    return (128 - (sum % 128)) & 0x7f;
  }

  /**
   * SysEx 受信リスナー登録
   *
   * @param callback 受信時に呼ばれるコールバック
   * @returns リスナー解除用の関数 (Unsubscribe)
   */
  onSysex(callback: SysexCallback) {
    this.sysexListeners.push(callback);
    return () => {
      this.sysexListeners = this.sysexListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * BLE から受信した HEX 文字列をバイト列へ変換し、1byte ずつパース処理へ渡す
   *
   * @param hex HEX 文字列
   */
  receive(hex: string) {
    for (const byte of hexTo8x1(hex)) {
      if (byte >= 0x80 && byte <= 0xef) {
        continue;
      }
      this.parse(byte);
    }
  }

  /**
   * 1byte ずつ SysEx をパースする (バッファリング)
   *
   * - STX (0xF0) で受信開始
   * - EOX (0xF7) で受信終了
   * - 完成したメッセージを handleSysex へ渡す
   */
  private parse(byte: number): void {
    // System Exclusive start
    if (byte === this.STX) {
      this.receiving = true;
      this.sysexBuf = [0xf0];
      return;
    }

    if (!this.receiving) return;

    this.sysexBuf.push(byte);
    // End of Exclusive
    if (byte === this.EOX && this.receiving) {
      this.receiving = false;
      const parsed = this.handleSysex(this.sysexBuf);
      if (parsed) this.sysexListeners.forEach((cb) => cb(parsed));
      this.sysexBuf = [];
    }
  }

  /**
   * SysEx メッセージを解析して address と data を抽出する
   *
   * @param msg 受信した SysEx バイト列
   * @returns パース結果 or null (不正フォーマット)
   */
  private handleSysex(msg: number[]): SysexParsed | null {
    if (msg.length < this.headerLen + this.addrLen + this.footerLen)
      return null;

    const body = msg.slice(this.headerLen, msg.length - this.footerLen);
    const addrBytes = body.slice(0, this.addrLen);
    const data = body.slice(this.addrLen);

    const addr =
      (addrBytes[0] << 24) |
      (addrBytes[1] << 16) |
      (addrBytes[2] << 8) |
      addrBytes[3];

    return { addr, data };
  }
}
