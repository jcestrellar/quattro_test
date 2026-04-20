import { MidiFilter } from '../types';
import { MidiFilterEngine } from '../midiFilterEngine';

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase();
}

function genNoteOn(channel: number, note: number, velocity: number): string {
  return (
    toHexByte(0x90 | ((channel - 1) & 0x0f)) +
    toHexByte(note) +
    toHexByte(velocity)
  );
}

function genNoteOff(channel: number, note: number, velocity: number): string {
  return (
    toHexByte(0x80 | ((channel - 1) & 0x0f)) +
    toHexByte(note) +
    toHexByte(velocity)
  );
}

function genControlChange(
  channel: number,
  controller: number,
  value: number
): string {
  return (
    toHexByte(0xb0 | ((channel - 1) & 0x0f)) +
    toHexByte(controller) +
    toHexByte(value)
  );
}

function genPolyphonicKeyPressure(
  channel: number,
  note: number,
  pressure: number
): string {
  return (
    toHexByte(0xa0 | ((channel - 1) & 0x0f)) +
    toHexByte(note) +
    toHexByte(pressure)
  );
}

function genProgramChange(channel: number, program: number): string {
  return toHexByte(0xc0 | ((channel - 1) & 0x0f)) + toHexByte(program);
}

function genChannelPressure(channel: number, pressure: number): string {
  return toHexByte(0xd0 | ((channel - 1) & 0x0f)) + toHexByte(pressure);
}

function genPitchBend(channel: number, value: number): string {
  const lsb = value & 0x7f;
  const msb = (value >> 7) & 0x7f;
  return (
    toHexByte(0xe0 | ((channel - 1) & 0x0f)) + toHexByte(lsb) + toHexByte(msb)
  );
}

function genSysMessage(status: number): string {
  return toHexByte(status);
}

function hexStringToBytes(hex: string): Uint8Array {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

type MidiFilterTestLog = {
  message: string;
  allowed: boolean;
};

/**
 * 指定した `MidiFilter` 設定に基づいて MIDI メッセージが録音対象かどうかを
 * テストする関数です。
 *
 * - Recorder クラスを使わずに `MidiFilterEngine` のみで判定を行います。
 * - 代表的な MIDI メッセージ（チャンネルボイスメッセージ、チャンネルモード、
 *   システム共通メッセージ、システムリアルタイムメッセージ）を網羅的にテストします。
 * - テスト結果は `logCallback` 関数に逐次送られ、未指定の場合はコンソールに出力されます。
 *
 * @param filter フィルター設定
 * @param logCallback ログ出力用コールバック関数（省略可能）
 */
export async function runTest(
  filter: MidiFilter,
  logCallback?: (line: string) => void
) {
  const engine = new MidiFilterEngine(filter);
  const logs: MidiFilterTestLog[] = [];

  function test(hex: string) {
    const data = hexStringToBytes(hex);
    const allowed = engine.shouldRecord(data);
    logs.push({ message: hex, allowed });
  }

  // === Channel Voice Message ===
  // NoteOff: ch1〜16
  for (let ch = 1; ch <= 16; ch++) {
    test(genNoteOff(ch, 60, 0));
  }

  // NoteOn: ch1〜16
  for (let ch = 1; ch <= 16; ch++) {
    test(genNoteOn(ch, 60, 127));
  }

  // Polyphonic Key Pressure: ch1〜16
  for (let ch = 1; ch <= 16; ch++) {
    test(genPolyphonicKeyPressure(ch, 60, 100));
  }

  // Control Change: ch1〜16, CC 0〜119
  for (let ch = 1; ch <= 16; ch++) {
    for (let cc = 0; cc <= 119; cc++) {
      test(genControlChange(ch, cc, 64));
    }
  }

  // Program Change: ch1〜16
  for (let ch = 1; ch <= 16; ch++) {
    test(genProgramChange(ch, 10));
  }

  // Channel Pressure: ch1〜16
  for (let ch = 1; ch <= 16; ch++) {
    test(genChannelPressure(ch, 80));
  }

  // Pitch Bend: ch1〜16
  for (let ch = 1; ch <= 16; ch++) {
    test(genPitchBend(ch, 8192)); // Center position
  }

  // === Channel Mode Message (CC 120〜127) ===
  for (let ch = 1; ch <= 16; ch++) {
    for (let cc = 120; cc <= 127; cc++) {
      test(genControlChange(ch, cc, 0));
    }
  }

  // === System Common Message ===
  [0xf0, 0xf1, 0xf2, 0xf3, 0xf6].forEach((status) => {
    test(genSysMessage(status));
  });

  // === System RealTime Message ===
  [0xf8, 0xfa, 0xfb, 0xfc, 0xfe, 0xff].forEach((status) => {
    test(genSysMessage(status));
  });

  //
  // 結果出力
  //
  for (const log of logs) {
    const line = `${log.allowed ? '✅' : '❌'} ${log.message}${log.allowed ? '' : ' (filtered out)'}`;
    if (logCallback) {
      logCallback(line);
    } else {
      console.log(line);
    }
  }
}
