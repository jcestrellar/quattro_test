import { useCallback, useEffect, useRef, useState } from 'react';

export function usePadFlash(durationMs = 120) {
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [litSet, setLitSet] = useState<Set<number>>(new Set());

  const flash = useCallback(
    (laneKey: number) => {
      const existing = timersRef.current.get(laneKey);
      if (existing) clearTimeout(existing);

      setLitSet((prev) => {
        const next = new Set(prev);
        next.add(laneKey);
        return next;
      });

      const timer = setTimeout(() => {
        setLitSet((prev) => {
          const next = new Set(prev);
          next.delete(laneKey);
          return next;
        });
        timersRef.current.delete(laneKey);
      }, durationMs);

      timersRef.current.set(laneKey, timer);
    },
    [durationMs],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return { litSet, flash };
}
