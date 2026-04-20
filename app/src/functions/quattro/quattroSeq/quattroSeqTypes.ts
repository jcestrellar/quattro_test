export type QuattroSeqEventStopCallback = () => void;
export type QuattroSeqEventTempoCallback = (
  /** 現在のテンポ（BPM） */
  bpm: string
) => void;
export enum QuattroSeqOutput {
  /** 音源 */
  BuiltinSound = 0,

  /** MIDI出力 */
  ExternalMIDI = 1,
}
