import { useCallback } from 'react';
import { LANE_COLORS, LANE_LABELS, LANE_ORDER, type DrumLane } from '../drumPadMap';

const PAD_H = 60;
const PAD_RADIUS = 8;

interface SinglePadProps {
  lane: DrumLane;
  x: number;
  y: number;
  width: number;
  lit: boolean;
}

const SinglePad = ({ lane, x, y, width, lit }: SinglePadProps) => {
  const color = LANE_COLORS[lane];
  const label = LANE_LABELS[lane];

  const draw = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear();
      g.roundRect(x + 2, y, width - 4, PAD_H, PAD_RADIUS);
      g.fill({ color: lit ? color : 0x1a1a2e, alpha: lit ? 1 : 0.6 });
      g.roundRect(x + 2, y, width - 4, PAD_H, PAD_RADIUS);
      g.stroke({ color, width: lit ? 3 : 1.5, alpha: lit ? 1 : 0.5 });
    },
    [x, y, width, color, lit],
  );

  const drawLabel = useCallback(
    (t: import('pixi.js').Text) => {
      t.x = x + width / 2;
      t.y = y + PAD_H / 2;
      t.anchor.set(0.5, 0.5);
      t.style = {
        fill: lit ? '#ffffff' : '#888888',
        fontSize: 12,
        fontWeight: 'bold',
      } as import('pixi.js').TextStyleOptions;
      t.text = label;
    },
    [x, y, width, label, lit],
  );

  return (
    <>
      <pixiGraphics draw={draw} />
      <pixiText ref={drawLabel} />
    </>
  );
};

interface DrumPadsProps {
  areaX: number;
  areaY: number;
  totalWidth: number;
  litLanes: Set<DrumLane>;
  kickLit: boolean;
}

export const PAD_AREA_HEIGHT = PAD_H + 50; // pads + kick bar space

export const DrumPads = ({ areaX, areaY, totalWidth, litLanes, kickLit }: DrumPadsProps) => {
  const laneCount = LANE_ORDER.length;
  const laneW = totalWidth / laneCount;

  const kickBarY = areaY + PAD_H + 8;
  const kickBarH = 30;

  const drawKick = useCallback(
    (g: import('pixi.js').Graphics) => {
      const color = LANE_COLORS[-1 as DrumLane];
      g.clear();
      g.roundRect(areaX + 2, kickBarY, totalWidth - 4, kickBarH, 6);
      g.fill({ color: kickLit ? color : 0x1a1a2e, alpha: kickLit ? 1 : 0.6 });
      g.roundRect(areaX + 2, kickBarY, totalWidth - 4, kickBarH, 6);
      g.stroke({ color, width: kickLit ? 3 : 1.5, alpha: kickLit ? 1 : 0.5 });
    },
    [areaX, kickBarY, totalWidth, kickLit],
  );

  const drawKickLabel = useCallback(
    (t: import('pixi.js').Text) => {
      t.x = areaX + totalWidth / 2;
      t.y = kickBarY + kickBarH / 2;
      t.anchor.set(0.5, 0.5);
      t.style = {
        fill: kickLit ? '#ffffff' : '#888888',
        fontSize: 12,
        fontWeight: 'bold',
      } as import('pixi.js').TextStyleOptions;
      t.text = 'KICK';
    },
    [areaX, kickBarY, totalWidth, kickLit],
  );

  return (
    <>
      {LANE_ORDER.map((lane, i) => (
        <SinglePad
          key={lane}
          lane={lane}
          x={areaX + i * laneW}
          y={areaY}
          width={laneW}
          lit={litLanes.has(lane)}
        />
      ))}
      <pixiGraphics draw={drawKick} />
      <pixiText ref={drawKickLabel} />
    </>
  );
};
