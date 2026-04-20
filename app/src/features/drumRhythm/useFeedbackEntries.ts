import { useCallback, useState } from 'react';
import type { Judgement } from './scoring';

export interface HitFeedbackEntry {
  id: number;
  judgement: Judgement;
  x: number;
  y: number;
  alpha: number;
  offsetY: number;
}

let nextFeedbackId = 0;

export function useFeedbackEntries() {
  const [entries, setEntries] = useState<HitFeedbackEntry[]>([]);

  const addFeedback = useCallback((judgement: Judgement, x: number, y: number) => {
    const id = nextFeedbackId++;
    setEntries((prev) => [...prev, { id, judgement, x, y, alpha: 1, offsetY: 0 }]);
  }, []);

  const removeFeedback = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, addFeedback, removeFeedback };
}
