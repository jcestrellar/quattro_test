import { MidiFilterEngine } from './midiFilterEngine/midiFilterEngine';
import { MidiMessage } from './types';

type ElapsedTimeChangeCallback = (elapsedMs: number) => void;
type RecordedMessageCallback = (data: MidiMessage) => void;

/**
 * MIDI 録音・SMF 出力機能を持つ Recorder クラス。
 *
 * - この Recorder は BPM=120, division=500 の前提で SMF を出力します。
 *   これにより、SMF 上の deltaTime（tick）は「おおよそ1ms」に相当します。
 *
 *   例：
 *   - 1000ms後のMIDIイベントは deltaTime=1000
 *   - プレイヤーで再生すれば、リアルタイム録音時のタイミングで再生されます。
 *   - Set Tempo は常に 0x07A120（500,000μs = 120BPM）で固定されます。
 *
 * - `MidiFilterEngine` を設定することで、特定のチャネルやイベント種別による
 *   メッセージのフィルタリングが可能です。
 *   フィルタに一致しないメッセージは録音対象から除外されます。
 */
export class MidiRecorder {
  /** 外部から渡されたMIDIイベントの発生時刻（ms単位、絶対時間） */
  private startMidiEventTimestamp: number = 0;
  private lastMidiEventTimestamp: number = 0;

  /** Recorder内部での最後のメッセージ処理時間 */
  private lastProcessingTimestamp: number = 0;

  private messages: MidiMessage[] = [];

  /** 録音中かどうかの状態を参照可能 */
  private _isRecording: boolean = false;
  get isRecording(): boolean {
    return this._isRecording;
  }

  /** 録音時間通知用のタイマーID */
  private timerId: number | null = null;

  /** 録音時間の通知間隔（ms） */
  private _elapsedTimeNotifyInterval: number = 100;
  set elapsedTimeNotifyInterval(ms: number) {
    this._elapsedTimeNotifyInterval = ms;
  }
  get elapsedTimeNotifyInterval(): number {
    return this._elapsedTimeNotifyInterval;
  }

  /** MIDI フィルターエンジン */
  private _filterEngine?: MidiFilterEngine;
  set filterEngine(engine: MidiFilterEngine | undefined) {
    this._filterEngine = engine;
  }
  get filterEngine(): MidiFilterEngine | undefined {
    return this._filterEngine;
  }

  /** 録音データが存在するかどうか */
  get hasRecordingData(): boolean {
    return this.messages.length > 0;
  }

  /**
   * 録音を開始する
   * @param startMidiEventTimestamp 録音開始時刻（ms）
   */
  start(startMidiEventTimestamp: number): void {
    this._isRecording = true;
    this.messages = [];
    this.startMidiEventTimestamp = startMidiEventTimestamp;
    this.lastMidiEventTimestamp = startMidiEventTimestamp;
    this.startElapsedTimer();
  }

  /** 録音を停止し、End of Track を自動的に挿入する */
  stop(): void {
    if (!this._isRecording) return;

    // deltaTime = 「録音停止時点」と「最後の記録メッセージ」との時間差
    const now = performance.now();
    const deltaTime = Math.max(0, now - this.lastProcessingTimestamp);

    // End of Track メッセージを挿入
    this.messages.push({
      deltaTime,
      data: new Uint8Array([0xff, 0x2f, 0x00]),
    });

    this._isRecording = false;
    this.stopElapsedTimer();
  }

  /** 録音データと状態を完全にリセットする */
  reset(): void {
    this.stop();
    this.messages = [];
    this._isRecording = false;
    this.startMidiEventTimestamp = 0;
    this.lastMidiEventTimestamp = 0;
    this.lastProcessingTimestamp = 0;

    this.notifyElapsedTime(0);
  }

  private elapsedTimeChangeListeners: ElapsedTimeChangeCallback[] = [];
  /**
   * 録音時間の変化を通知するリスナーを登録
   * @param callback ミリ秒単位の経過時間
   * @returns 登録解除用の関数
   */
  onElapsedTimeChange(callback: ElapsedTimeChangeCallback) {
    this.elapsedTimeChangeListeners.push(callback);
    return () => {
      this.elapsedTimeChangeListeners = this.elapsedTimeChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /** 録音時間変更のリスナーに通知 */
  private notifyElapsedTime(elapsedMs: number) {
    this.elapsedTimeChangeListeners.forEach((cb) => cb(elapsedMs));
  }

  /** 録音時間通知用のタイマーを開始 */
  private startElapsedTimer() {
    this.stopElapsedTimer();
    const startTime = performance.now();
    this.timerId = window.setInterval(() => {
      if (!this._isRecording) return;
      const elapsed = performance.now() - startTime;
      this.notifyElapsedTime(elapsed);
    }, this._elapsedTimeNotifyInterval);
  }

  /** 録音時間通知用のタイマーを停止 */
  private stopElapsedTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private recordedMessageListeners: RecordedMessageCallback[] = [];
  /**
   * 録音された MIDI メッセージを通知するリスナーを登録
   * @param callback 録音されたメッセージ情報を受け取る
   * @returns 登録解除用の関数
   */
  onRecordedMessage(callback: RecordedMessageCallback) {
    this.recordedMessageListeners.push(callback);
    return () => {
      this.recordedMessageListeners = this.recordedMessageListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /** 録音された MIDI メッセージのリスナーに通知 */
  private notifyRecordedMessage(record: MidiMessage) {
    this.recordedMessageListeners.forEach((cb) => cb(record));
  }

  /**
   * 録音対象の MIDI メッセージを追加
   * @param message 16進文字列（例: "903C7F"）
   * @param timestamp イベント発生時刻（ms 単位）
   * @returns 有効メッセージで記録された場合 true
   */
  pushMessage(message: string | Uint8Array, timestamp: number): boolean {
    if (!this._isRecording) return false;

    let byteArray: Uint8Array;
    if (typeof message === 'string') {
      const sanitized = message.replace(/\s+/g, '');
      byteArray = this.hexStringToBytes(sanitized);
    } else {
      byteArray = message;
    }

    if (byteArray.length === 0) return false;

    const allowed = this.shouldRecordMessage(byteArray);
    if (!allowed) return false;

    /*
    deltaTime は MIDI の仕様上、負の値は許されないため 0 以上に丸める。
    また、外部から渡される timestamp が録音開始時刻より小さい場合や、
    受信順序のズレで負の差分が発生すること考慮し、それを防止する。

    注意：
      deltaTime は「最後に記録された（= フィルタを通過した）メッセージ」との差分であり、
      フィルタで無視されたメッセージは基準にならない。
     */
    const deltaTime =
      this.messages.length === 0
        ? Math.max(0, timestamp - this.startMidiEventTimestamp)
        : Math.max(0, timestamp - this.lastMidiEventTimestamp);

    const midiMessage: MidiMessage = {
      deltaTime,
      data: byteArray,
    };

    this.messages.push(midiMessage);
    this.lastMidiEventTimestamp = timestamp;
    this.lastProcessingTimestamp = performance.now();
    this.notifyRecordedMessage(midiMessage);

    return true;
  }

  /**
   * 指定したメッセージが録音対象かどうかを判定する。
   * @param data MIDIメッセージ（16進文字列 or Uint8Array）
   * @returns true: 記録対象 / false: 除外
   */
  public shouldRecordMessage(data: string | Uint8Array): boolean {
    let byteArray: Uint8Array;

    if (typeof data === 'string') {
      const sanitized = data.replace(/\s+/g, '');
      byteArray = this.hexStringToBytes(sanitized);
      if (byteArray.length === 0) return false;
    } else {
      byteArray = data;
      if (byteArray.length === 0) return false;
    }

    return this._filterEngine?.shouldRecord(byteArray) ?? true;
  }

  /**
   * SMF バイナリとして録音データを出力
   * @returns SMFフォーマットの Uint8Array
   */
  exportAsSmfBinary(): Uint8Array {
    const header = this.buildHeaderChunk();
    const track = this.buildTrackChunk();
    return this.concatChunks([header, track]);
  }

  /**
   * SMF の 16進数文字列として録音データを出力
   * @returns 16進数文字列（例: "4d546864..."）
   */
  exportAsSmfHexString(): string {
    const smfData = this.exportAsSmfBinary();
    return Array.from(smfData)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /** SMFヘッダチャンク（固定内容）を生成 */
  private buildHeaderChunk(): Uint8Array {
    return new Uint8Array([
      0x4d,
      0x54,
      0x68,
      0x64, // "MThd"
      0x00,
      0x00,
      0x00,
      0x06,
      0x00,
      0x00,
      0x00,
      0x01,
      0x01,
      0xf4, // division = 500
    ]);
  }

  /** 録音データからトラックチャンクを構築 */
  private buildTrackChunk(): Uint8Array {
    const body: number[] = [];

    // Tempo イベント（120 BPM 固定）
    body.push(0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20);

    for (const msg of this.messages) {
      body.push(...this.encodeVariableLength(msg.deltaTime));
      body.push(...msg.data);
    }

    const length = body.length;
    const chunk: number[] = [
      0x4d,
      0x54,
      0x72,
      0x6b, // "MTrk"
      (length >>> 24) & 0xff,
      (length >>> 16) & 0xff,
      (length >>> 8) & 0xff,
      length & 0xff,
      ...body,
    ];

    return new Uint8Array(chunk);
  }

  /**
   * 可変長（Variable Length Quantity）をエンコード
   *   例: 127 → [0x7F], 128 → [0x81, 0x00]
   */
  private encodeVariableLength(value: number): number[] {
    let buffer = value & 0x7f;
    const bytes: number[] = [];
    while ((value >>= 7)) {
      buffer <<= 8;
      buffer |= (value & 0x7f) | 0x80;
    }
    while (true) {
      bytes.push(buffer & 0xff);
      if (buffer & 0x80) {
        buffer >>= 8;
      } else {
        break;
      }
    }
    return bytes;
  }

  /** 16進文字列から Uint8Array に変換 */
  private hexStringToBytes(hex: string): Uint8Array {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return new Uint8Array(bytes);
  }

  /** Uint8Array チャンクを結合 */
  private concatChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
