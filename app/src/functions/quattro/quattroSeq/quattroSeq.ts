/**
 * $native.seq の API を一元管理する。
 */

import {
  QuattroSeqEventStopCallback,
  QuattroSeqEventTempoCallback,
  QuattroSeqOutput,
} from './quattroSeqTypes';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

export class QuattroSeq {
  private static _instance: QuattroSeq;
  static get instance(): QuattroSeq {
    if (!QuattroSeq._instance) {
      QuattroSeq._instance = new QuattroSeq();
      QuattroSeq._instance.init();
    }
    return QuattroSeq._instance;
  }

  private constructor() {}

  private init() {
    this.setOutput(QuattroSeqOutput.ExternalMIDI);

    $native.seq.event.stop = () => {
      this.eventStopListeners.forEach((cb) => cb());
    };

    $native.seq.event.tempo = (bpm: string) => {
      this.eventTempoListeners.forEach((cb) => cb(bpm));
    };
  }

  /**
   * event コールバックを複数のオブジェクトヘ通知する
   */
  // $native.seq.event.stop
  private eventStopListeners: QuattroSeqEventStopCallback[] = [];
  /**
   * シーケンサーの再生が停止したときに通知されます。
   * @param callback
   * @returns
   */
  onEventStop(callback: QuattroSeqEventStopCallback) {
    this.eventStopListeners.push(callback);
    return () => {
      this.eventStopListeners = this.eventStopListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private eventTempoListeners: QuattroSeqEventTempoCallback[] = [];
  /**
   * シーケンサーにより、テンポが変更されたときに通知されます。
   * @param callback
   * @returns
   */
  onEventTempo(callback: QuattroSeqEventTempoCallback) {
    this.eventTempoListeners.push(callback);
    return () => {
      this.eventTempoListeners = this.eventTempoListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Quattro APIをラップし、アプリケーションでの利用を簡素化する。
   */

  /**
   * シーケンサーに SMF データをロードします。
   * @param data SMF データ（HEX 表記）
   * @returns  ロードに成功した場合は true を、失敗した場合は false を返します。
   */
  load(data: string): boolean {
    return $native.seq.load(data);
  }

  /**
   * シーケンサーのデータを、再生します。引数に loop を指定しない場合は、通常再生（トラック終端で停止）を行います。
   * @param loop ループ再生（true）／通常再生（false）
   */
  play(loop: boolean = false): void {
    $native.seq.play(loop);
  }

  /**
   * シーケンサーの再生を、一時停止します。
   */
  pause() {
    $native.seq.pause();
  }

  /**
   * シーケンサーの再生を、停止します。
   */
  stop() {
    $native.seq.stop();
  }

  /**
   * シーケンサーの再生位置を拍単位で変更します。
   * @param beats 変更する位置（拍数）
   */
  setLocate(beats: number) {
    $native.seq.locate(beats);
  }

  /**
   * シーケンサーの再生範囲を拍単位で指定します。
   * @param beatsA 開始位置（拍数）
   * @param beatsB 終了位置（拍数）
   */
  setRange(beatsA: number, beatsB: number) {
    $native.seq.range(beatsA, beatsB);
  }

  /**
   * シーケンサーのテンポ（BPM）を設定、取得します。
   * bpm の範囲は 10 ～ 480 です。
   * 引数に bpm を指定しない場合は、取得のみを行います。
   * @returns
   */
  tempo(): number {
    return $native.seq.tempo();
  }
  setTempo(bpm: number): void {
    $native.seq.tempo(bpm);
  }

  /**
   * ミュートするチャンネル情報を設定、取得します。
   * 引数に channels を指定しない場合は、取得のみを行います。
   * @param channels ミュートするチャンネル情報（ビット列、LSB:CH1）
   */
  mute(): number[] {
    return $native.seq.mute();
  }
  setMute(channels: number[]): void {
    $native.seq.mute(channels);
  }

  /**
   * 音程のシフト値（半音単位）を設定、取得します。引数に shift を指定しない場合は、取得のみを行います。
   * @param 設定するシフト値
   * @returns 現在のシフト値
   */
  transpose(): number {
    return $native.seq.transpose();
  }
  setTranspose(shift: number): void {
    $native.seq.transpose(shift);
  }

  /**
   * メトロノームのオン／オフを設定、取得します。引数に on を指定しない場合は、取得のみを行います。
   * @param on オン（true）／オフ（false）
   * @returns 現在のオン／オフ
   */
  metro() {
    return $native.metro();
  }
  setMetro(on: boolean): void {
    $native.seq.metro(on);
  }

  /**
   * メトロノームの拍ごとのノート情報を設定します。
   * @param notes ノート情報の配列
   * @note
   * 例）metroset(['99227F', '99217F'])
   * 配列の要素がメトロノームの拍数より少ない場合は、配列の最後の要素を利用します。
   * 17 ～ 32 ch を指定する場合は、先頭に 'F5 + {後続のバイト数}' を追加してください。
   * 例）metroset(['F503' + '90227F', 'F503' + '90217F'])
   */
  setMetroset(notes: number) {
    $native.seq.metroset(notes);
  }

  /**
   * 現在の再生位置を拍単位で返します。
   * @returns 現在位置（拍数）
   */
  position(): number {
    return $native.seq.position();
  }

  /**
   * SMF データのトータルの拍数を返します。
   * @returns トータルの拍数
   */
  totalBeats(): number {
    return $native.seq.totalbeats();
  }

  /**
   * シーケンサーの出力先を設定します。初期設定は、音源 (0) です。
   * @param type
   */
  setOutput(type: QuattroSeqOutput): void {
    $native.seq.output(type);
  }
}
