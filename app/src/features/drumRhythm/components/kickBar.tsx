import { useCallback } from 'react';

interface KickBarProps {
  x: number;
  y: number;
  totalWidth: number;
  color: number;
  alpha?: number;
}

export const KickBarNote = ({ x, y, totalWidth, color, alpha = 1 }: KickBarProps) => {
  const NOTE_H = 10;
  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear();
      g.rect(x, y - NOTE_H / 2, totalWidth, NOTE_H);
      g.fill({ color, alpha });
    },
    [x, y, totalWidth, color, alpha],
  );

  return <pixiGraphics draw={draw} />;
};

interface KickPadProps {
  x: number;
  y: number;
  totalWidth: number;
  padHeight: number;
  color: number;
  lit: boolean;
}

export const KickPad = ({ x, y, totalWidth, padHeight, color, lit }: KickPadProps) => {
  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear();
      g.rect(x, y, totalWidth, padHeight);
      g.fill({ color: lit ? color : 0x222222, alpha: lit ? 1 : 0.5 });
      g.rect(x, y, totalWidth, padHeight);
      g.stroke({ color: color, width: 2, alpha: 0.8 });
    },
    [x, y, totalWidth, padHeight, color, lit],
  );

  return <pixiGraphics draw={draw} />;
};
