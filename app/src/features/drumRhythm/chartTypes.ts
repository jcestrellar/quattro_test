export interface MidiNote {
  timeSec: number;
  midi: number;
  velocity: number;
}

export interface ChartMeta {
  name: string;
  artist: string;
  songLengthMs: number;
  previewStartMs: number;
}

export interface MidiChart {
  notes: MidiNote[];
  durationSec: number;
}

export type ChartParser = (buffer: ArrayBuffer) => MidiChart;
