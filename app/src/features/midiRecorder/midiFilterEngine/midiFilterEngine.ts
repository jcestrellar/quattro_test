import { MidiFilter } from './types';

/**
 * `MidiFilterEngine` は、MIDI メッセージが録音対象かどうかをフィルタ設定に基づいて判定するクラスです。
 *
 * - MIDI メッセージのステータスバイトに応じて、チャンネルごとのフィルタやシステム系イベントのフィルタを適用します。
 * - フィルタ条件は `MidiFilter` 型で指定され、各イベントタイプ・チャンネル・コントローラ番号ごとに細かく制御できます。
 */
export class MidiFilterEngine {
  private filter: MidiFilter;

  constructor(filter: MidiFilter) {
    this.filter = filter;
  }

  /**
   * 指定された MIDI メッセージが録音対象かどうかを判定します。
   * @param data MIDI メッセージ
   * @returns true: 録音対象 / false: 除外
   */
  shouldRecord(data: Uint8Array): boolean {
    const status = data[0];
    const statusType = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    const f = this.filter;

    // === システム系メッセージ (0xF0〜0xFF) ===
    if (status >= 0xf0) {
      switch (status) {
        case 0xf0:
          return f.system?.exclusive ?? false;
        case 0xf1:
          return f.system?.common?.timeCodeQuarterFrame ?? false;
        case 0xf2:
          return f.system?.common?.songPositionPointer ?? false;
        case 0xf3:
          return f.system?.common?.songSelect ?? false;
        case 0xf6:
          return f.system?.common?.tuneRequest ?? false;
        case 0xf8:
          return f.system?.realTime?.timingClock ?? false;
        case 0xfa:
          return f.system?.realTime?.start ?? false;
        case 0xfb:
          return f.system?.realTime?.continue ?? false;
        case 0xfc:
          return f.system?.realTime?.stop ?? false;
        case 0xfe:
          return f.system?.realTime?.activeSensing ?? false;
        case 0xff:
          return f.system?.realTime?.systemReset ?? false;
        default:
          return false;
      }
    }

    // === チャンネル系メッセージ (0x80〜0xEF) ===
    switch (statusType) {
      case 0x80: // Note Off
        return this.match(f.channel?.channelVoice?.noteOff?.channels, channel);
      case 0x90: // Note On
        return this.match(f.channel?.channelVoice?.noteOn?.channels, channel);
      case 0xa0: // Polyphonic Key Pressure
        return this.match(
          f.channel?.channelVoice?.polyphonicKeyPressure?.channels,
          channel
        );
      case 0xb0: {
        // Control Change / Channel Mode
        const controller = data[1];
        if (controller < 120) {
          return (
            this.match(
              f.channel?.channelVoice?.controlChange?.channels,
              channel
            ) &&
            this.match(
              f.channel?.channelVoice?.controlChange?.controllers,
              controller
            )
          );
        } else {
          // Channel Mode Message
          const cm = f.channel?.channelMode;
          switch (controller) {
            case 120:
              return this.match(cm?.allSoundOff?.channels, channel);
            case 121:
              return this.match(cm?.resetAllControllers?.channels, channel);
            case 122:
              return this.match(cm?.localControl?.channels, channel);
            case 123:
              return this.match(cm?.allNotesOff?.channels, channel);
            case 124:
              return this.match(cm?.omniOff?.channels, channel);
            case 125:
              return this.match(cm?.omniOn?.channels, channel);
            case 126:
              return this.match(cm?.monoMode?.channels, channel);
            case 127:
              return this.match(cm?.polyMode?.channels, channel);
            default:
              return false;
          }
        }
      }
      case 0xc0: // Program Change
        return this.match(
          f.channel?.channelVoice?.programChange?.channels,
          channel
        );
      case 0xd0: // Channel Pressure (Aftertouch)
        return this.match(
          f.channel?.channelVoice?.channelPressure?.channels,
          channel
        );
      case 0xe0: // Pitch Bend
        return this.match(
          f.channel?.channelVoice?.pitchBend?.channels,
          channel
        );
      default:
        return false;
    }
  }

  /**
   * 数値の一致フィルタ。
   * - 配列が `undefined` の場合は `false`。
   * - 配列が空の場合（`[]`）は全通過（= true）。
   * - 値が含まれている場合は `true`。
   * @param arr 判定対象の配列
   * @param value 判定する値
   */
  private match(arr: number[] | undefined, value: number): boolean {
    if (arr === undefined) return false;
    if (arr.length === 0) return true;
    return arr.includes(value);
  }
}
