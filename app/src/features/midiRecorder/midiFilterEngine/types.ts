/**
 * MIDIメッセージフィルター設定
 *
 * - undefined（省略）はフィルターしない（無視）
 * - boolean は許可 (true) / 拒否 (false)
 * - 配列は許可する要素のリストを指定
 *   - 空配列はすべて許可を意味する
 */
export type MidiFilter = {
  channel?: {
    channelVoice?: {
      /** Note Off メッセージ (0x80) */
      noteOff?: { channels?: number[] };
      /** Note On メッセージ (0x90) */
      noteOn?: { channels?: number[] };
      /** ポリフォニック・キー・プレッシャー (Polyphonic Key Pressure) メッセージ (0xA0) */
      polyphonicKeyPressure?: { channels?: number[] };
      /** コントロールチェンジ (Control Change) メッセージ (0xB0) */
      controlChange?: { channels?: number[]; controllers?: number[] };
      /** プログラムチェンジ (Program Change) メッセージ (0xC0) */
      programChange?: { channels?: number[] };
      /** チャンネルプレッシャー (Channel Pressure) メッセージ (0xD0) */
      channelPressure?: { channels?: number[] };
      /** ピッチベンド (Pitch Bend Change) メッセージ (0xE0) */
      pitchBend?: { channels?: number[] };
    };
    channelMode?: {
      /** All Sound Off (CC 120 / 0x78) */
      allSoundOff?: { channels?: number[] };
      /** Reset All Controllers (CC 121 / 0x79) */
      resetAllControllers?: { channels?: number[] };
      /** Local Control (CC 122 / 0x7A) */
      localControl?: { channels?: number[] };
      /** All Notes Off (CC 123 / 0x7B) */
      allNotesOff?: { channels?: number[] };
      /** Omni Off (CC 124 / 0x7C) */
      omniOff?: { channels?: number[] };
      /** Omni On (CC 125 / 0x7D) */
      omniOn?: { channels?: number[] };
      /** Mono Mode On (CC 126 / 0x7E) */
      monoMode?: { channels?: number[] };
      /** Poly Mode On (CC 127 / 0x7F) */
      polyMode?: { channels?: number[] };
    };
  };
  system?: {
    /** システムエクスクルーシブメッセージ (0xF0〜0xF7) */
    exclusive?: boolean;
    common?: {
      /** Time Code Quarter Frame (0xF1) */
      timeCodeQuarterFrame?: boolean;
      /** Song Position Pointer (0xF2) */
      songPositionPointer?: boolean;
      /** Song Select (0xF3) */
      songSelect?: boolean;
      /** Tune Request (0xF6) */
      tuneRequest?: boolean;
    };
    realTime?: {
      /** Timing Clock (0xF8) */
      timingClock?: boolean;
      /** Start (0xFA) */
      start?: boolean;
      /** Continue (0xFB) */
      continue?: boolean;
      /** Stop (0xFC) */
      stop?: boolean;
      /** Active Sensing (0xFE) */
      activeSensing?: boolean;
      /** System Reset (0xFF) */
      systemReset?: boolean;
    };
  };
};
