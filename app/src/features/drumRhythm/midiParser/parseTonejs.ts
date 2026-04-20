import { Midi } from '@tonejs/midi';
import type { ChartParser, MidiNote } from '../chartTypes';

export const parseTonejs: ChartParser = (buffer: ArrayBuffer): ReturnType<ChartParser> => {
  const midi = new Midi(buffer);
  const notes: MidiNote[] = [];

  for (const track of midi.tracks) {
    for (const n of track.notes) {
      notes.push({
        timeSec: n.time,
        midi: n.midi,
        velocity: Math.round(n.velocity * 127),
      });
    }
  }

  notes.sort((a, b) => a.timeSec - b.timeSec);

  return { notes, durationSec: midi.duration };
};
