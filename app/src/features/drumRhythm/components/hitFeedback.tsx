import { useCallback, useRef, useState } from 'react';
import { useTick } from '@pixi/react';
import type { Judgement } from '../scoring';
import { JUDGEMENT_COLORS } from '../scoring';
import type { HitFeedbackEntry } from '../useFeedbackEntries';

export type { HitFeedbackEntry };

const JUDGEMENT_LABELS: Record<Judgement, string> = {
  perfect: 'PERFECT',
  good: 'GOOD',
  ok: 'OK',
  miss: 'MISS',
};

const FeedbackText = ({
  entry,
  onExpired,
}: {
  entry: HitFeedbackEntry;
  onExpired: (id: number) => void;
}) => {
  const alphaRef = useRef(entry.alpha);
  const offsetRef = useRef(entry.offsetY);
  const [alpha, setAlpha] = useState(entry.alpha);
  const [offsetY, setOffsetY] = useState(entry.offsetY);
  const expired = useRef(false);

  useTick((ticker) => {
    if (expired.current) return;
    alphaRef.current -= ticker.deltaMS / 700;
    offsetRef.current -= ticker.deltaMS * 0.05;
    setAlpha(Math.max(0, alphaRef.current));
    setOffsetY(offsetRef.current);
    if (alphaRef.current <= 0) {
      expired.current = true;
      onExpired(entry.id);
    }
  });

  const color = JUDGEMENT_COLORS[entry.judgement];
  const label = JUDGEMENT_LABELS[entry.judgement];

  const drawLabel = useCallback(
    (t: import('pixi.js').Text | null) => {
      if (!t) return;
      t.x = entry.x;
      t.y = entry.y + offsetY;
      t.anchor.set(0.5, 0.5);
      t.alpha = alpha;
      t.style = {
        fill: color,
        fontSize: entry.judgement === 'perfect' ? 22 : 18,
        fontWeight: 'bold',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowDistance: 2,
      } as import('pixi.js').TextStyleOptions;
      t.text = label;
    },
    [entry.x, entry.y, entry.judgement, offsetY, alpha, color, label],
  );

  return <pixiText ref={drawLabel} />;
};

interface HitFeedbackLayerProps {
  entries: HitFeedbackEntry[];
  onExpired: (id: number) => void;
}

export const HitFeedbackLayer = ({ entries, onExpired }: HitFeedbackLayerProps) => {
  return (
    <>
      {entries.map((e) => (
        <FeedbackText key={e.id} entry={e} onExpired={onExpired} />
      ))}
    </>
  );
};
