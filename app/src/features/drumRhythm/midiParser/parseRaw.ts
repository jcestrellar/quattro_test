import type { ChartParser, MidiNote } from '../chartTypes';

function readVLQ(view: DataView, offset: number): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;
  let byte: number;
  do {
    byte = view.getUint8(offset + bytesRead);
    value = (value << 7) | (byte & 0x7f);
    bytesRead++;
  } while (byte & 0x80);
  return { value, bytesRead };
}

interface TempoEvent {
  tick: number;
  microsPerBeat: number;
}

function ticksToSec(tick: number, tempoMap: TempoEvent[], ticksPerBeat: number): number {
  let sec = 0;
  let lastTick = 0;
  let lastTempo = 500000; // default 120 BPM

  for (const ev of tempoMap) {
    if (ev.tick >= tick) break;
    sec += ((Math.min(ev.tick, tick) - lastTick) / ticksPerBeat) * (lastTempo / 1_000_000);
    lastTick = ev.tick;
    lastTempo = ev.microsPerBeat;
  }
  sec += ((tick - lastTick) / ticksPerBeat) * (lastTempo / 1_000_000);
  return sec;
}

export const parseRaw: ChartParser = (buffer: ArrayBuffer): ReturnType<ChartParser> => {
  const view = new DataView(buffer);
  let pos = 0;

  const magic = String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(i)));
  if (magic !== 'MThd') throw new Error('Not a MIDI file');
  pos = 4;

  const headerLen = view.getUint32(pos); pos += 4;
  /* format = */ view.getUint16(pos); pos += 2;
  const nTracks = view.getUint16(pos); pos += 2;
  const division = view.getUint16(pos); pos += 2;
  pos = 8 + headerLen;

  if (division & 0x8000) throw new Error('SMPTE timecode not supported');
  const ticksPerBeat = division;

  const tempoMap: TempoEvent[] = [];
  const rawNotes: { tick: number; midi: number; velocity: number }[] = [];

  for (let t = 0; t < nTracks; t++) {
    const trackMagic = String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(pos + i)));
    if (trackMagic !== 'MTrk') { pos += 4 + view.getUint32(pos + 4); continue; }
    pos += 4;
    const trackLen = view.getUint32(pos); pos += 4;
    const trackEnd = pos + trackLen;

    let tick = 0;
    let runningStatus = 0;

    while (pos < trackEnd) {
      const { value: delta, bytesRead } = readVLQ(view, pos);
      pos += bytesRead;
      tick += delta;

      let statusByte = view.getUint8(pos);

      if (statusByte & 0x80) {
        runningStatus = statusByte;
        pos++;
      } else {
        statusByte = runningStatus;
      }

      const statusHi = (statusByte >> 4) & 0xf;

      if (statusByte === 0xff) {
        // Meta event
        const metaType = view.getUint8(pos); pos++;
        const { value: metaLen, bytesRead: lb } = readVLQ(view, pos);
        pos += lb;
        if (metaType === 0x51 && metaLen === 3) {
          const microsPerBeat =
            (view.getUint8(pos) << 16) | (view.getUint8(pos + 1) << 8) | view.getUint8(pos + 2);
          tempoMap.push({ tick, microsPerBeat });
        }
        pos += metaLen;
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        // SysEx
        const { value: sysLen, bytesRead: lb } = readVLQ(view, pos);
        pos += lb + sysLen;
      } else if (statusHi === 0x9) {
        // Note On
        const note = view.getUint8(pos); pos++;
        const velocity = view.getUint8(pos); pos++;
        if (velocity > 0) {
          rawNotes.push({ tick, midi: note, velocity });
        }
      } else if (statusHi === 0x8) {
        // Note Off
        pos += 2;
      } else if (statusHi === 0xa || statusHi === 0xb || statusHi === 0xe) {
        pos += 2;
      } else if (statusHi === 0xc || statusHi === 0xd) {
        pos += 1;
      } else {
        pos++;
      }
    }
    pos = trackEnd;
  }

  tempoMap.sort((a, b) => a.tick - b.tick);

  const notes: MidiNote[] = rawNotes.map((n) => ({
    timeSec: ticksToSec(n.tick, tempoMap, ticksPerBeat),
    midi: n.midi,
    velocity: n.velocity,
  }));

  notes.sort((a, b) => a.timeSec - b.timeSec);

  const durationSec =
    notes.length > 0 ? notes[notes.length - 1].timeSec + 0.5 : 0;

  return { notes, durationSec };
};
