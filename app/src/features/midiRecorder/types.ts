// types.ts
export type MidiMessage = {
  deltaTime: number; // ネイティブ処理から受け取った値
  data: Uint8Array; // MIDI メッセージ本体
};
export enum MidiRecordingState {
  /** 録音停止中 */
  Stopped,

  /** 録音待機中 */
  Waiting,

  /** 録音中 */
  Recording,
}
