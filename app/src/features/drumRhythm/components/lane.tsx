import { useCallback } from 'react';
import type { MidiNote } from '../chartTypes';
import { LANE_COLORS, type DrumLane } from '../drumPadMap';
import { DrumNote } from './note';

const HIT_LINE_ALPHA = 0.5;

interface LaneProps {
  lane: DrumLane;
  x: number;
  width: number;
  highwayTop: number;
  hitLineY: number;
  notes: (MidiNote & { id: string })[]; // notes in visible window
  currentTime: number;
  pixelsPerSecond: number;
}

export const Lane = ({
  lane,
  x,
  width,
  highwayTop,
  hitLineY,
  notes,
  currentTime,
  pixelsPerSecond,
}: LaneProps) => {
  const color = LANE_COLORS[lane];

  const drawBg = useCallback(
    (g: import('pixi.js').Graphics) => {
      g.clear();
      // lane background
      g.rect(x, highwayTop, width, hitLineY - highwayTop);
      g.fill({ color: 0x111111, alpha: 0.4 });
      // lane border
      g.moveTo(x, highwayTop);
      g.lineTo(x, hitLineY);
      g.stroke({ color: 0x333355, width: 1, alpha: 0.6 });
      // hit line segment
      g.moveTo(x, hitLineY);
      g.lineTo(x + width, hitLineY);
      g.stroke({ color, width: 3, alpha: HIT_LINE_ALPHA });
    },
    [x, width, highwayTop, hitLineY, color],
  );

  return (
    <>
      <pixiGraphics draw={drawBg} />
      {notes.map((note) => {
        const noteY = hitLineY - (note.timeSec - currentTime) * pixelsPerSecond;
        return (
          <DrumNote
            key={note.id}
            x={x}
            y={noteY}
            width={width}
            color={color}
          />
        );
      })}
    </>
  );
};
