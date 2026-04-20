import { useApplication, useTick } from '@pixi/react';
import { Graphics, Text } from 'pixi.js';
import { useEffect, useRef } from 'react';
import type { MidiNote } from '../chartTypes';
import { DrumLane, LANE_COLORS, LANE_ORDER, MIDI_TO_LANE } from '../drumPadMap';
import type { Judgement } from '../scoring';
import { isMissWindow, judge, WINDOWS_SEC } from '../scoring';
import type { AudioEngine } from '../audioEngine';

const LOOK_AHEAD_SEC = 1.5;
const BG = 0x0a0a1a;
const HIT_LINE_RATIO = 0.62;
const NOTE_R = 13;
const KICK_NOTE_H = 10;
const FEEDBACK_DURATION_MS = 650;

const darken = (hex: number, t: number): number => {
  const r = ((hex >> 16) & 0xff) * (1 - t);
  const gr = ((hex >> 8) & 0xff) * (1 - t);
  const b = (hex & 0xff) * (1 - t);
  return (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
};
const lighten = (hex: number, t: number): number => {
  const r = Math.min(255, ((hex >> 16) & 0xff) + 255 * t);
  const gr = Math.min(255, ((hex >> 8) & 0xff) + 255 * t);
  const b = Math.min(255, (hex & 0xff) + 255 * t);
  return (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
};

const JUDGEMENT_LABELS: Record<Judgement, string> = {
  perfect: 'PERFECT',
  good: 'GOOD',
  ok: 'OK',
  miss: 'MISS',
};
const JUDGEMENT_HEX: Record<Judgement, number> = {
  perfect: 0xffd700,
  good: 0x4ade80,
  ok: 0x60a5fa,
  miss: 0xf87171,
};

interface ActiveNote extends MidiNote {
  id: number;
  lane: DrumLane;
  missed: boolean;
}

interface FeedbackEntry {
  text: Text;
  birthMs: number;
  x: number;
  baseY: number;
}

let noteSeq = 0;

interface HighwayProps {
  chart: MidiNote[];
  audioEngine: AudioEngine;
  inputOffsetSec: number;
  onJudgement: (j: Judgement) => void;
  registerHitHandler: (fn: (midi: number) => void) => void;
}

export const Highway = ({
  chart,
  audioEngine,
  inputOffsetSec,
  onJudgement,
  registerHitHandler,
}: HighwayProps) => {
  const { app } = useApplication();

  // Layout constants — computed lazily inside tick/effects once app.renderer is ready
  const LANE_COUNT = LANE_ORDER.length;

  // ── Imperative Pixi objects ───────────────────────────────────────────────
  const gRef = useRef<Graphics | null>(null);
  const feedbacksRef = useRef<FeedbackEntry[]>([]);

  useEffect(() => {
    const g = new Graphics();
    gRef.current = g;
    app.stage.addChildAt(g, 0);

    return () => {
      for (const fb of feedbacksRef.current) {
        fb.text.destroy();
        app.stage.removeChild(fb.text);
      }
      feedbacksRef.current = [];
      app.stage.removeChild(g);
      g.destroy();
      gRef.current = null;
    };
  }, [app]);

  // ── Note pool (mutated, no React state) ──────────────────────────────────
  const poolRef = useRef<ActiveNote[]>(
    chart
      .filter((n) => MIDI_TO_LANE[n.midi] !== undefined)
      .map((n) => ({
        ...n,
        id: noteSeq++,
        lane: MIDI_TO_LANE[n.midi],
        missed: false,
      })),
  );
  const nextIdxRef = useRef(0);

  // ── Pad flash (no React state) ────────────────────────────────────────────
  const litUntilRef = useRef<Map<number, number>>(new Map());

  // ── Hit handler ───────────────────────────────────────────────────────────
  const onJudgementRef = useRef(onJudgement);
  useEffect(() => { onJudgementRef.current = onJudgement; });

  useEffect(() => {
    const handler = (midi: number) => {
      const lane = MIDI_TO_LANE[midi];
      if (lane === undefined) return;

      // Always flash the pad — even when idle or no note matched
      litUntilRef.current.set(lane as number, performance.now() + 130);

      if (!audioEngine.isPlaying()) return;

      const currentTime = audioEngine.getCurrentTime();
      const pool = poolRef.current;
      let bestIdx = -1;
      let bestDelta = Infinity;

      for (let i = Math.max(0, nextIdxRef.current - 20); i < pool.length; i++) {
        const n = pool[i];
        if (n.missed) continue;
        if (n.lane !== lane) continue;
        const delta = currentTime - n.timeSec - inputOffsetSec;
        // note already passed the ok window
        if (delta > WINDOWS_SEC.ok) continue;
        // note is too far in the future — stop searching (pool is sorted by time)
        if (delta < -WINDOWS_SEC.ok) break;
        if (Math.abs(delta) < Math.abs(bestDelta)) {
          bestDelta = delta;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        pool[bestIdx].missed = true;
        const j = judge(bestDelta);
        onJudgementRef.current(j);

        // Spawn feedback text — read dimensions from renderer (guaranteed ready here)
        if (!app.renderer) return;
        const W = app.screen.width;
        const H = app.screen.height;
        const LANE_W = W / LANE_COUNT;
        const HIT_LINE_Y = H * HIT_LINE_RATIO;

        const laneIdx = LANE_ORDER.indexOf(lane as (typeof LANE_ORDER)[number]);
        const fx = laneIdx >= 0 ? laneIdx * LANE_W + LANE_W / 2 : W / 2;
        const t = new Text({
          text: JUDGEMENT_LABELS[j],
          style: {
            fill: JUDGEMENT_HEX[j],
            fontSize: j === 'perfect' ? 24 : 19,
            fontWeight: 'bold',
            dropShadow: { color: 0x000000, distance: 2, alpha: 0.8 },
          },
        });
        t.anchor.set(0.5, 0.5);
        t.x = fx;
        t.y = HIT_LINE_Y - 40;
        app.stage.addChild(t);
        feedbacksRef.current.push({ text: t, birthMs: performance.now(), x: fx, baseY: HIT_LINE_Y - 40 });
      }
    };

    registerHitHandler(handler);
  }, [audioEngine, inputOffsetSec, registerHitHandler, LANE_COUNT, app]);

  // ── Main game loop — fully imperative ─────────────────────────────────────
  useTick(() => {
    const g = gRef.current;
    if (!g || !app.renderer) return;

    // Read dimensions fresh every frame — safe here, renderer is guaranteed ready
    const W = app.screen.width;
    const H = app.screen.height;
    const LANE_W = W / LANE_COUNT;
    const HIT_LINE_Y = H * HIT_LINE_RATIO;
    const PPS = HIT_LINE_Y / LOOK_AHEAD_SEC;

    const currentTime = audioEngine.getCurrentTime();
    const pool = poolRef.current;
    const now = performance.now();

    // Advance miss pointer
    while (
      nextIdxRef.current < pool.length &&
      currentTime - pool[nextIdxRef.current].timeSec > 0.5
    ) {
      nextIdxRef.current++;
    }

    // Mark missed notes (only while playing)
    if (audioEngine.isPlaying()) {
      for (let i = nextIdxRef.current; i < pool.length; i++) {
        const n = pool[i];
        if (n.missed) continue;
        if (n.timeSec - currentTime > LOOK_AHEAD_SEC) break;
        if (isMissWindow(currentTime - n.timeSec - inputOffsetSec)) {
          n.missed = true;
          onJudgementRef.current('miss');
        }
      }
    }

    // Update & expire feedback texts (imperative, no setState)
    feedbacksRef.current = feedbacksRef.current.filter((fb) => {
      const age = now - fb.birthMs;
      if (age >= FEEDBACK_DURATION_MS) {
        fb.text.destroy();
        app.stage.removeChild(fb.text);
        return false;
      }
      const progress = age / FEEDBACK_DURATION_MS;
      fb.text.alpha = 1 - progress;
      fb.text.y = fb.baseY - progress * 30;
      return true;
    });

    g.clear();

    // Background
    g.rect(0, 0, W, H);
    g.fill({ color: BG });

    // Lane backgrounds & dividers
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = i * LANE_W;
      g.rect(x, 0, LANE_W, HIT_LINE_Y);
      g.fill({ color: i % 2 === 0 ? 0x111122 : 0x0d0d1a });
      g.moveTo(x, 0);
      g.lineTo(x, HIT_LINE_Y);
      g.stroke({ color: 0x222244, width: 1 });
    }

    // Hit line — glow layer + solid core
    g.moveTo(0, HIT_LINE_Y);
    g.lineTo(W, HIT_LINE_Y);
    g.stroke({ color: 0xffffff, width: 10, alpha: 0.12 });
    g.moveTo(0, HIT_LINE_Y);
    g.lineTo(W, HIT_LINE_Y);
    g.stroke({ color: 0xffffff, width: 4, alpha: 0.55 });
    g.moveTo(0, HIT_LINE_Y);
    g.lineTo(W, HIT_LINE_Y);
    g.stroke({ color: 0xffffff, width: 1.5, alpha: 1.0 });

    // Notes
    for (let i = 0; i < pool.length; i++) {
      const n = pool[i];
      if (n.missed) continue;
      const timeAhead = n.timeSec - currentTime;
      if (timeAhead > LOOK_AHEAD_SEC + 0.2) break;
      if (timeAhead < -0.15) continue;

      const y = HIT_LINE_Y - timeAhead * PPS;

      if (n.lane === DrumLane.Kick) {
        g.rect(0, y - KICK_NOTE_H / 2, W, KICK_NOTE_H);
        g.fill({ color: LANE_COLORS[DrumLane.Kick] });
        g.rect(0, y - KICK_NOTE_H / 2, W, KICK_NOTE_H);
        g.stroke({ color: 0xffffff, width: 1, alpha: 0.35 });
      } else {
        const laneIdx = LANE_ORDER.indexOf(n.lane as (typeof LANE_ORDER)[number]);
        const x = laneIdx * LANE_W + LANE_W / 2;
        g.circle(x, y, NOTE_R);
        g.fill({ color: LANE_COLORS[n.lane] });
        g.circle(x, y, NOTE_R);
        g.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      }
    }

    // ── Drum kit ─────────────────────────────────────────────────────────────
    const KIT_Y = HIT_LINE_Y + 2;
    const KIT_H = H - KIT_Y - 4;
    if (KIT_H > 40) {
      g.rect(0, KIT_Y, W, KIT_H);
      g.fill({ color: 0x04040c });

      const bassR    = Math.min(KIT_H * 0.44, W * 0.14);
      const bassCX   = W * 0.5;
      const bassCY   = KIT_Y + KIT_H * 0.6;

      const litRed    = (litUntilRef.current.get(DrumLane.Red    as number) ?? 0) > now;
      const litYellow = (litUntilRef.current.get(DrumLane.Yellow as number) ?? 0) > now;
      const litBlue   = (litUntilRef.current.get(DrumLane.Blue   as number) ?? 0) > now;
      const litGreen  = (litUntilRef.current.get(DrumLane.Green  as number) ?? 0) > now;
      const litKickK  = (litUntilRef.current.get(DrumLane.Kick   as number) ?? 0) > now;

      // helper: draw a drum circle
      const drawKitDrum = (cx: number, cy: number, r: number, color: number, lit: boolean) => {
        if (lit) { g.circle(cx, cy, r + 10); g.fill({ color, alpha: 0.22 }); }
        g.circle(cx, cy, r + 2); g.fill({ color: 0x000000, alpha: 0.45 }); // shadow
        g.circle(cx, cy, r); g.fill({ color: lit ? color : darken(color, 0.5) });
        g.circle(cx, cy, r * 0.78); g.fill({ color: lit ? 0xf0f0f5 : 0x0c0c1a });
        g.circle(cx, cy, r * 0.13); g.fill({ color: lit ? color : 0x333355 });
        g.circle(cx, cy, r); g.stroke({ color: lit ? 0xffffff : color, width: lit ? 2.5 : 1.5, alpha: lit ? 0.95 : 0.55 });
      };

      // helper: draw a cymbal ellipse
      const drawKitCymbal = (cx: number, cy: number, rx: number, ry: number, color: number, lit: boolean, stacked: boolean) => {
        if (lit) { g.ellipse(cx, cy, rx + 14, ry + 7); g.fill({ color, alpha: 0.22 }); }
        g.ellipse(cx, cy + 3, rx, ry); g.fill({ color: 0x000000, alpha: 0.4 }); // shadow
        g.ellipse(cx, cy, rx, ry); g.fill({ color: lit ? color : darken(color, 0.5) });
        g.ellipse(cx, cy, rx, ry); g.stroke({ color: lit ? 0xffffff : color, width: lit ? 2 : 1.5, alpha: lit ? 0.9 : 0.5 });
        const bellR = rx * 0.18;
        g.circle(cx, cy, bellR); g.fill({ color: lit ? 0xffffff : lighten(color, 0.25) });
        if (stacked) {
          const ty = cy - ry - 4;
          g.ellipse(cx, ty, rx * 0.8, ry * 0.72); g.fill({ color: lit ? lighten(color, 0.1) : darken(color, 0.62) });
          g.ellipse(cx, ty, rx * 0.8, ry * 0.72); g.stroke({ color: lit ? 0xffffff : color, width: 1, alpha: lit ? 0.65 : 0.3 });
        }
      };

      const cymRX = bassR * 0.58;
      const cymRY = Math.max(cymRX * 0.27, 7);

      // Bass drum (center)
      drawKitDrum(bassCX, bassCY, bassR, LANE_COLORS[DrumLane.Kick], litKickK);

      // Snare (Red) — front left
      drawKitDrum(W * 0.30, bassCY + bassR * 0.05, bassR * 0.50, LANE_COLORS[DrumLane.Red], litRed);

      // Tom (Blue) — above bass drum
      drawKitDrum(W * 0.40, bassCY - bassR * 0.95, bassR * 0.44, LANE_COLORS[DrumLane.Blue], litBlue);

      // Hi-Hat (Yellow) — far left
      drawKitCymbal(W * 0.15, bassCY - bassR * 0.15, cymRX, cymRY, LANE_COLORS[DrumLane.Yellow], litYellow, true);

      // Crash (Green) — far right
      drawKitCymbal(W * 0.83, bassCY - bassR * 0.4, cymRX * 1.1, cymRY, LANE_COLORS[DrumLane.Green], litGreen, false);
    }
  });

  // No JSX — everything is drawn imperatively; this component renders nothing into React tree
  return null;
};
