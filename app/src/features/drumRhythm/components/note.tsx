import { useCallback } from 'react';

interface NoteProps {
  x: number;
  y: number;
  width: number;
  color: number;
  alpha?: number;
}

export const DrumNote = ({ x, y, width, color, alpha = 1 }: NoteProps) => {
  const NOTE_H = 14;
  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear();
      g.roundRect(x + 2, y - NOTE_H / 2, width - 4, NOTE_H, 4);
      g.fill({ color, alpha });
    },
    [x, y, width, color, alpha],
  );

  return <pixiGraphics draw={draw} />;
};
