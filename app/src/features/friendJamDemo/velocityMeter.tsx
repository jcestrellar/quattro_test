import { extend, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import { useEffect, useMemo, useRef } from 'react';
import { Quattro } from '../../functions/quattro/quattro';

extend({ Container, Graphics });

type VelocityStepMeterProps = {
  x?: number;
  y?: number;
  barCount?: number;

  /** メーター全体の幅（従来通り） */
  width?: number;

  /** 旧：バー1本の高さ。非推奨（後方互換）。 */
  height?: number;

  /** 新：メーター全体の高さ（これが指定されていれば優先） */
  totalHeight?: number;

  /** バー間ギャップ(px) */
  gap?: number;

  riseStepMs?: number;
  holdMs?: number;
  fallStepMs?: number;
  fallFadeMs?: number;
  additive?: boolean;
  velocityMax?: number;
  testVelocity?: number;
  maxSchedules?: number;
  activeColor?: number; // ★ 固定色（既定: オレンジ）
  noteNumbers?: number[];
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// velocity → 何段点けるか（1..barCount）
const velocityToCount = (
  velocity: number,
  barCount: number,
  velocityMax: number
) => {
  const v = clamp(Math.round(velocity), 1, velocityMax);
  const step = velocityMax / barCount;
  const raw = Math.ceil(v / step);
  return clamp(raw, 1, barCount);
};

type Schedule = {
  onTimes: number[]; // 底から index（0=最下段）ごとの点灯開始
  offStartTimes: number[]; // 同 消灯開始
  offEndTimes: number[]; // 同 消灯終了
  endAt: number; // スケジュールの最終終了
};

export const VelocityStepMeter = ({
  x = 0,
  y = 0,
  barCount = 10,
  width = 240,

  // 旧・バー1本の高さ（残すが非推奨）
  height = 12,

  // 新・メーター全体の高さ（こちらが指定されていれば優先）
  totalHeight,

  gap = 6,
  riseStepMs = 5,
  holdMs = 180,
  fallStepMs = 40,
  fallFadeMs = 320,
  additive = true,
  velocityMax = 100,
  testVelocity = 100,
  maxSchedules = 8,
  activeColor = 0xff8a00,
  noteNumbers = [0x24, 0x26, 0x2e, 0x31],
}: VelocityStepMeterProps) => {
  const gfxRefs = useRef<(Graphics | null)[]>([]);
  const prevAlphaRef = useRef<number[]>(Array(barCount).fill(0));
  const schedulesRef = useRef<Schedule[]>([]);

  /** ── 各バーの高さを「全体高さ」から逆算 ── */
  // totalHeight が与えられていない場合は従来ロジック（height=バー高）を維持
  const barH = (() => {
    if (typeof totalHeight === 'number' && isFinite(totalHeight)) {
      const usable = totalHeight - gap * (barCount - 1);
      // totalHeight が小さすぎる場合の安全化
      return Math.max(1, Math.floor(usable / barCount));
    }
    // 従来の「1本の高さ」を使う
    return height;
  })();

  const updateBar = (iTop: number, alpha: number) => {
    const g = gfxRefs.current[iTop];
    if (!g) return;

    const bx = x;
    const by = y + iTop * (barH + gap);

    g.clear();

    // 下地
    g.roundRect(bx, by, width, barH, Math.min(6, barH));
    g.fill(0x2b2b2b, 0.35); // v8: fill(color, alpha)

    // アクティブ（固定色 + α）
    if (alpha > 0) {
      g.roundRect(bx, by, width, barH, Math.min(6, barH));
      g.fill(activeColor, alpha);
    }

    g.blendMode = additive ? 'add' : 'normal';
  };

  // 初期ベース
  const bars = useMemo(
    () =>
      new Array(barCount).fill(0).map((_, i) => (
        <pixiGraphics
          key={i}
          ref={(el) => {
            gfxRefs.current[i] = el;
          }}
          draw={(g) => {
            const bx = x;
            const by = y + i * (barH + gap);
            g.clear();
            g.roundRect(bx, by, width, barH, Math.min(6, barH));
            g.fill(0x2b2b2b, 0.35);
            g.blendMode = additive ? 'add' : 'normal';
          }}
        />
      )),
    [barCount, x, y, width, barH, gap, additive]
  );

  // 新規発火 → 既存を壊さず「追加」
  const triggerByVelocity = (velocity: number) => {
    const now = performance.now();

    const count = velocityToCount(velocity, barCount, velocityMax);

    const onTimes = new Array(barCount).fill(Infinity);
    const offStartTimes = new Array(barCount).fill(-Infinity);
    const offEndTimes = new Array(barCount).fill(-Infinity);

    // 下から順に点灯
    for (let k = 0; k < count; k++) {
      onTimes[k] = now + k * riseStepMs;
    }

    // 天井 → ホールド → 上から順に消灯（フェードアウト）
    const topOnAt = onTimes[count - 1];
    const fallStart = topOnAt + holdMs;
    for (let k = 0; k < count; k++) {
      const orderFromTop = count - 1 - k;
      const offStart = fallStart + orderFromTop * fallStepMs;
      offStartTimes[k] = offStart;
      offEndTimes[k] = offStart + fallFadeMs;
    }
    const lastOffEnd = fallStart + (count - 1) * fallStepMs + fallFadeMs;

    const list = schedulesRef.current;
    list.push({ onTimes, offStartTimes, offEndTimes, endAt: lastOffEnd });
    if (list.length > maxSchedules) list.shift();
  };

  // α算出（1スケジュール分）
  const computeAlphaFor = (s: Schedule, iBottom: number, now: number) => {
    const onT = s.onTimes[iBottom];
    const offStartT = s.offStartTimes[iBottom];
    const offEndT = s.offEndTimes[iBottom];

    if (!Number.isFinite(onT)) return 0; // 対象外の段

    if (now < onT) return 0;
    if (now < offStartT) return 1;
    if (now < offEndT) {
      const t = (now - offStartT) / Math.max(1, offEndT - offStartT);
      return 1 - clamp(t, 0, 1); // 1 → 0 フェード
    }
    return 0;
  };

  // 毎フレーム：全スケジュールの α を合成（最大値）
  useTick(() => {
    const now = performance.now();
    const schedules = schedulesRef.current;

    for (let iTop = 0; iTop < barCount; iTop++) {
      const iBottom = barCount - 1 - iTop;

      let bestAlpha = 0;
      for (const s of schedules) {
        const a = computeAlphaFor(s, iBottom, now);
        if (a > bestAlpha) bestAlpha = a;
      }

      const prevA = prevAlphaRef.current[iTop];
      if (Math.abs(bestAlpha - prevA) > 0.001) {
        prevAlphaRef.current[iTop] = bestAlpha;
        updateBar(iTop, bestAlpha);
      }
    }

    // 終了スケジュールを掃除
    if (schedules.length) {
      schedulesRef.current = schedules.filter((s) => {
        if (now <= s.endAt) return true;
        for (let iBottom = 0; iBottom < barCount; iBottom++) {
          if (computeAlphaFor(s, iBottom, now) > 0) return true;
        }
        return false;
      });
    }
  });

  // クリックテスト
  const handlePointerDown = () => {
    triggerByVelocity(testVelocity);
  };

  // MIDI入力
  useEffect(() => {
    const unsubscribe = Quattro.midi.onEventMessage((msg: string) => {
      const items = msg.match(/.{1,2}/g) ?? [];
      if (items.length < 3) return;

      const isNoteOn = items[0]?.charAt(0) === '9';
      if (!isNoteOn) return;

      const velocity = parseInt(items[2], 16);
      if (!Number.isFinite(velocity) || velocity <= 0) return;

      const noteNumber = parseInt(items[1], 16);
      if (!noteNumbers.includes(noteNumber)) return;
      triggerByVelocity(velocity);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    barCount,
    riseStepMs,
    holdMs,
    fallStepMs,
    fallFadeMs,
    velocityMax,
    noteNumbers,
  ]);

  // レイアウト変更時の初期化
  useEffect(() => {
    prevAlphaRef.current = Array(barCount).fill(0);
    schedulesRef.current = [];
    for (let iTop = 0; iTop < barCount; iTop++) {
      updateBar(iTop, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barCount, x, y, width, barH, gap, additive, activeColor]);

  return (
    <pixiContainer
      eventMode='static'
      onPointerDown={handlePointerDown}
      cursor='pointer'
    >
      {bars}
    </pixiContainer>
  );
};
