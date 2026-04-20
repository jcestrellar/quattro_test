export enum DrumLane {
  Kick = -1,
  Red = 0,
  Yellow = 1,
  Blue = 2,
  Green = 3,
}

export const LANE_COLORS: Record<DrumLane, number> = {
  [DrumLane.Kick]: 0xff6600,
  [DrumLane.Red]: 0xff2222,
  [DrumLane.Yellow]: 0xffdd00,
  [DrumLane.Blue]: 0x2288ff,
  [DrumLane.Green]: 0x22cc44,
};

export const LANE_LABELS: Record<DrumLane, string> = {
  [DrumLane.Kick]: 'KICK',
  [DrumLane.Red]: 'SNR',
  [DrumLane.Yellow]: 'H/H',
  [DrumLane.Blue]: 'TOM',
  [DrumLane.Green]: 'CRASH',
};

// Dev keyboard map: key → lane
export const KEY_LANE_MAP: Record<string, DrumLane> = {
  d: DrumLane.Red,
  f: DrumLane.Yellow,
  j: DrumLane.Blue,
  k: DrumLane.Green,
  ' ': DrumLane.Kick,
};

// MIDI note → lane
export const MIDI_TO_LANE: Record<number, DrumLane> = {
  // Kick
  35: DrumLane.Kick,
  36: DrumLane.Kick,
  // Snare → Red
  38: DrumLane.Red,
  40: DrumLane.Red,
  // HiHat + pedal → Yellow
  42: DrumLane.Yellow,
  44: DrumLane.Yellow,
  46: DrumLane.Yellow,
  // Tom1 + Tom2 + Ride → Blue
  48: DrumLane.Blue,
  50: DrumLane.Blue,
  45: DrumLane.Blue,
  47: DrumLane.Blue,
  51: DrumLane.Blue,
  59: DrumLane.Blue,
  // Tom3 + Crash → Green
  43: DrumLane.Green,
  41: DrumLane.Green,
  49: DrumLane.Green,
  57: DrumLane.Green,
};

export const LANE_ORDER = [DrumLane.Red, DrumLane.Yellow, DrumLane.Blue, DrumLane.Green] as const;
