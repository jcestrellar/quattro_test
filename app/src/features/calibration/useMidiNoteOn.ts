import { useEffect, useLayoutEffect, useRef } from 'react';
import { Quattro } from '../../functions/quattro/quattro';

export function useMidiNoteOn(
  onNote: (note: number, velocity: number) => void,
): void {
  const onNoteRef = useRef(onNote);
  useLayoutEffect(() => {
    onNoteRef.current = onNote;
  });

  useEffect(() => {
    const unsubscribe = Quattro.midi.onEventMessage((msg: string) => {
      const items = msg.match(/.{1,2}/g);
      if (!items || items.length < 3) return;

      const statusHi = items[0].charAt(0);
      if (statusHi !== '9') return;

      const note = parseInt(items[1], 16);
      const velocity = parseInt(items[2], 16) || 0;

      if (!Number.isFinite(note) || velocity === 0) return;

      onNoteRef.current(note, velocity);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);
}
