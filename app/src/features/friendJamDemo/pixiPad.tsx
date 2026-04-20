import { extend, useTick } from '@pixi/react';
import { Container, Graphics, Text, Rectangle } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Quattro } from '../../functions/quattro/quattro';

extend({ Container, Graphics, Text });

const TOTAL_EFFECT_DURATION_MS = 400; // 波紋の拡大・消滅
const FILL_HOLD_MS = 10; // オレンジのホールド時間
const FILL_FADE_MS = 110; // フェード時間
const COLOR_ORANGE = 0xffa500;
const COLOR_GREY = 0x888888;

/** 波紋エフェクト（色をオレンジに変更）*/
const PadEffect = ({
  x,
  y,
  maxRadius = 200,
  color = COLOR_ORANGE,
  onComplete,
}: {
  x: number;
  y: number;
  maxRadius?: number;
  color?: number;
  onComplete: () => void;
}) => {
  const [radius, setRadius] = useState(10);
  const [alpha, setAlpha] = useState(1);
  const elapsedRef = useRef<number>(0);

  useTick((ticker) => {
    elapsedRef.current += ticker.deltaMS;
    const progress = Math.min(1, elapsedRef.current / TOTAL_EFFECT_DURATION_MS);
    setRadius(progress * maxRadius);
    setAlpha(1 - progress);
    if (progress >= 1) onComplete();
  });

  const draw = useCallback(
    (g: Graphics): void => {
      g.clear();
      g.circle(x, y, radius);
      g.fill({ color, alpha });
    },
    [x, y, radius, alpha, color]
  );

  return <pixiGraphics draw={draw} />;
};

/** オレンジの塗りつぶし（HOLD→FADE） */
const PadFill = ({
  x,
  y,
  radius,
  /** 外部からトリガされるたびに点灯をリセット */
  triggerKey,
  color = COLOR_ORANGE,
  holdMs = FILL_HOLD_MS,
  fadeMs = FILL_FADE_MS,
}: {
  x: number;
  y: number;
  radius: number;
  triggerKey: number; // 変化で再トリガ（velocity 受信タイミングで更新）
  color?: number;
  holdMs?: number;
  fadeMs?: number;
}) => {
  const [alpha, setAlpha] = useState(0);
  const elapsed = useRef(0);
  const active = useRef(false);

  // triggerKey が変わるたびに HOLD→FADE を開始
  useEffect(() => {
    elapsed.current = 0;
    active.current = true;
  }, [triggerKey]);

  useTick((ticker) => {
    if (!active.current) return;
    elapsed.current += ticker.deltaMS;

    if (elapsed.current <= holdMs) {
      // HOLD 区間：alpha = 1 を維持
      setAlpha(1);
    } else if (elapsed.current <= holdMs + fadeMs) {
      // FADE 区間：1 → 0 へ減衰
      const t = (elapsed.current - holdMs) / fadeMs; // 0..1
      setAlpha(1 - t);
    } else {
      // 終了
      setAlpha(0);
      active.current = false;
    }
  });

  const draw = useCallback(
    (g: Graphics): void => {
      g.clear();
      if (alpha <= 0) return;
      g.circle(x, y, radius);
      g.fill({ color, alpha });
    },
    [x, y, radius, alpha, color]
  );

  return <pixiGraphics draw={draw} />;
};

export const PixiPad = ({
  noteNumbers = [],
  title = '',
  x = 0,
  y = 0,
  width = 80,
  height = 80,
  effectScale = 2.0,
  /** ストローク色／太さ */
  ringColor = COLOR_GREY,
  ringWidth = 3,
  /** テキスト色 */
  labelColor = 0xffffff,
  titleColor = 0xffffff,
}: {
  noteNumbers?: number[];
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  effectScale?: number;
  ringColor?: number;
  ringWidth?: number;
  labelColor?: number;
  titleColor?: number;
}) => {
  const [pulses, setPulses] = useState<number[]>([]);
  const nextPulsId = useRef(1);

  // フィルトリガ用カウンタ（velocity 受信のたびにインクリメント）
  const [fillTrigger, setFillTrigger] = useState(0);

  // サイズ
  const CX = width / 2;
  const CY = height / 2;
  const padRadius = Math.min(width, height) / 2;
  const effectMaxRadius = padRadius * effectScale;

  // Note セット
  const noteSet = useMemo<Set<number>>(
    () => new Set(Array.isArray(noteNumbers) ? noteNumbers : []),
    [noteNumbers]
  );

  const triggerPulse = () => {
    setPulses((arr) => [...arr, nextPulsId.current++]);
  };

  // 受信処理
  useEffect(() => {
    const unsubscribe = Quattro.midi.onEventMessage((msg: string) => {
      const items = msg.match(/.{1,2}/g);
      if (!items || items.length < 3) return;

      const statusHi = items[0].charAt(0); // '9' なら Note On
      const noteOn = statusHi === '9';

      const receivedNoteNumber = parseInt(items[1], 16);
      const velocity = parseInt(items[2], 16) || 0;

      if (!Number.isFinite(receivedNoteNumber)) return;

      // velocity > 0 の Note On のみ反応（Note On vel=0 を Note Off とみなす）
      if (noteOn && velocity > 0 && noteSet.has(receivedNoteNumber)) {
        // 波紋
        triggerPulse();
        // オレンジ塗りつぶし（HOLD→FADE）
        setFillTrigger((n) => n + 1);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [noteSet]);

  const removePulse = useCallback((id: number) => {
    setPulses((arr) => arr.filter((p) => p !== id));
  }, []);

  // ラベル（先頭のみ）
  const displayText = useMemo(() => {
    const arr = Array.from(noteSet.values());
    if (arr.length === 0) return '';
    return arr[0].toString(16).toUpperCase();
  }, [noteSet]);

  // フォント
  const labelFontSize = Math.max(10, Math.round(padRadius * 0.35));
  const titleFontSize = Math.max(8, Math.round(Math.min(width, height) * 0.12));

  return (
    <pixiContainer
      x={x}
      y={y}
      width={width}
      height={height}
      eventMode='static'
      hitArea={new Rectangle(0, 0, width, height)}
      onPointerDown={() => {
        // マウス/タッチでも挙動確認したい場合の仮想トリガ
        triggerPulse();
        setFillTrigger((n) => n + 1);
      }}
      cursor='pointer'
    >
      {/* ストロークのみのリング（灰色） */}
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.circle(CX, CY, padRadius);
          g.stroke({ color: ringColor, width: ringWidth });
        }}
      />

      {/* オレンジの塗りつぶし（HOLD→FADE アニメーション） */}
      <PadFill
        x={CX}
        y={CY}
        radius={padRadius}
        triggerKey={fillTrigger}
        color={COLOR_ORANGE}
        holdMs={FILL_HOLD_MS}
        fadeMs={FILL_FADE_MS}
      />

      {/* ラベル（中央） */}
      <pixiText
        x={CX}
        y={CY}
        text={displayText}
        anchor={{ x: 0.5, y: 0.5 }}
        style={{ fontSize: labelFontSize, fill: labelColor }}
      />

      {/* タイトル（任意・左上） */}
      {title && (
        <pixiText
          x={6}
          y={6}
          text={title}
          style={{ fontSize: titleFontSize, fill: titleColor }}
        />
      )}

      {/* 既存の波紋エフェクト（色をオレンジに変更） */}
      {pulses.map((p) => (
        <PadEffect
          key={p}
          x={CX}
          y={CY}
          maxRadius={effectMaxRadius}
          color={COLOR_ORANGE}
          onComplete={() => removePulse(p)}
        />
      ))}
    </pixiContainer>
  );
};
