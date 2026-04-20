import { extend, useTick } from '@pixi/react';
import { Container, Graphics, Rectangle } from 'pixi.js';
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

extend({ Container, Graphics });

type SpikeWaveDemoProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  /** 最大再生時間（ms）。mediaRef がある場合は min(この値, media.duration*1000) */
  durationMs?: number;

  /** 棒の横ピッチ（px） */
  stepPx?: number;
  /** 棒の線幅（px） */
  lineWidth?: number;

  showBase?: boolean;
  baseColor?: number;
  baseAlpha?: number;

  showFrame?: boolean;
  frameColor?: number;
  frameWidth?: number;

  colorUp?: number;
  colorDown?: number;

  baselineRatio?: number;

  showProgress?: boolean;
  progressHeight?: number;
  progressColor?: number;

  /** メディア（audio/video）と同期する場合に渡す */
  mediaRef?: RefObject<HTMLAudioElement | HTMLVideoElement | null>;
  /** true の時はメディアの play/pause/seek に追従（デフォルト: true） */
  followMedia?: boolean;
};

export const SpikeWaveDemo = ({
  x = 0,
  y = 0,
  width = 560,
  height = 140,

  durationMs = 180_000, // 最大3分
  stepPx = 3,
  lineWidth = 1,

  showBase = true,
  baseColor = 0x2b2b2b,
  baseAlpha = 0.12,

  showFrame = true,
  frameColor = 0x666666,
  frameWidth = 1,

  colorUp = 0xffe066,
  colorDown = 0xff8a00,

  baselineRatio = 0.62,
  showProgress = true,
  progressHeight = 8,
  progressColor = 0xffa500,

  mediaRef,
  followMedia = true,
}: SpikeWaveDemoProps) => {
  const bgRef = useRef<Graphics | null>(null);
  const spikesRef = useRef<Graphics | null>(null);
  const progressRef = useRef<Graphics | null>(null);

  // 「手動モード」でのみ使用
  const startTimeRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  // レイアウト・描画定数
  const step = Math.max(1, Math.floor(stepPx));
  const capacity = Math.max(1, Math.floor(width / step)); // 可視本数
  const baselineY = useMemo(
    () => y + height * baselineRatio,
    [y, height, baselineRatio]
  );
  const ampUp = useMemo(
    () => height * baselineRatio * 0.96,
    [height, baselineRatio]
  );
  const ampDown = useMemo(
    () => height * (1 - baselineRatio) * 0.96,
    [height, baselineRatio]
  );

  // 波形データ（列）[-1,1] を蓄積
  const columnsRef = useRef<number[]>([]);

  // 背景+枠+基準線
  const drawBackground = useCallback(() => {
    const g = bgRef.current;
    if (!g) return;
    g.clear();

    if (showBase) {
      g.roundRect(x, y, width, height, Math.min(6, height / 4));
      g.fill(baseColor, baseAlpha);
    }
    if (showFrame) {
      g.roundRect(x, y, width, height, Math.min(6, height / 4));
      g.stroke({
        color: frameColor,
        width: Math.max(1, Math.round(frameWidth)),
      });
    }

    // ベースライン
    g.moveTo(x, baselineY);
    g.lineTo(x + width, baselineY);
    g.stroke({ color: 0x999999, width: 1, alpha: 0.35 });
  }, [
    x,
    y,
    width,
    height,
    showBase,
    baseColor,
    baseAlpha,
    showFrame,
    frameColor,
    frameWidth,
    baselineY,
  ]);

  // 進捗バー
  const drawProgress = useCallback(
    (t01: number) => {
      const g = progressRef.current;
      if (!g || !showProgress) return;
      g.clear();
      const barW = Math.round(width * t01);
      const barH = Math.min(progressHeight, Math.floor(height * 0.25));
      const barY = y + height - barH - 2;
      g.roundRect(x, barY, barW, barH, Math.min(barH / 2, 4));
      g.fill(progressColor, 1);
    },
    [showProgress, width, height, y, x, progressHeight, progressColor]
  );

  // 1本描く
  const drawColumn = useCallback(
    (colIndex: number, value: number) => {
      const g = spikesRef.current;
      if (!g) return;
      const cx = x + colIndex * step + Math.floor(step / 2);

      if (value > 0) {
        const topY = baselineY - value * ampUp;
        g.moveTo(cx, baselineY);
        g.lineTo(cx, topY);
        g.stroke({ color: colorUp, width: Math.max(1, Math.round(lineWidth)) });
      } else if (value < 0) {
        const bottomY = baselineY - value * ampDown;
        g.moveTo(cx, baselineY);
        g.lineTo(cx, bottomY);
        g.stroke({
          color: colorDown,
          width: Math.max(1, Math.round(lineWidth)),
        });
      }
    },
    [x, step, baselineY, ampUp, ampDown, colorUp, colorDown, lineWidth]
  );

  // 全描画
  const redrawAll = useCallback(() => {
    const g = spikesRef.current;
    if (!g) return;
    g.clear();

    const cols = columnsRef.current;
    // 直近 capacity 本のみ表示（右詰め）
    const start = Math.max(0, cols.length - capacity);
    for (let i = 0; i < capacity; i++) {
      const v = cols[start + i] ?? 0;
      drawColumn(i, v);
    }
  }, [capacity, drawColumn]);

  // 値生成（慣性 + ランダム）
  const nextValue = useCallback((prev: number) => {
    const r = Math.random() * 2 - 1;
    const v = prev * 0.55 + r * 0.85;
    return Math.max(-1, Math.min(1, v));
  }, []);

  // 手動モード：開始/停止
  const manualStart = useCallback(() => {
    playingRef.current = true;
    startTimeRef.current = performance.now();
    columnsRef.current = [];
    spikesRef.current?.clear();
    drawBackground();
    drawProgress(0);
  }, [drawBackground, drawProgress]);

  // クリック（手動モード時のみ開始/リセット）
  const handlePointerDown = useCallback(() => {
    if (!followMedia) {
      manualStart();
    } else {
      // media追従時はクリックで「波形データだけリセット」
      columnsRef.current = [];
      spikesRef.current?.clear();
      drawBackground();
    }
  }, [followMedia, manualStart, drawBackground]);

  // 初期化/サイズ変更
  useEffect(() => {
    drawBackground();
    spikesRef.current?.clear();
    progressRef.current?.clear();
    columnsRef.current = [];
    playingRef.current = false;
    startTimeRef.current = null;
  }, [x, y, width, height, drawBackground]);

  // メディアイベント購読
  useEffect(() => {
    if (!followMedia) return;

    const media = mediaRef?.current;
    if (!media) return;

    const onPlay = () => {
      // 再生開始時は表示面をリセット（好みに応じてコメントアウト可）
      columnsRef.current = [];
      spikesRef.current?.clear();
      drawBackground();
    };

    const onPause = () => {
      // 何もしない（描画は useTick で currentTime ベースなので止まる）
    };

    const onEnded = () => {
      // 終了時に進捗を 100% にして止める
      drawProgress(1);
    };

    const onSeeked = () => {
      // シークに合わせて埋め直し（useTickで追従するのでここは軽め）
      redrawAll();
    };

    const onTimeUpdate = () => {
      // progressRef を軽量更新（1秒に数回）
      const dur = Math.max(0.001, media.duration || 0);
      const capMs = Math.min(durationMs, (dur || Infinity) * 1000);
      const t01 = Math.min(1, media.currentTime / (capMs / 1000));
      drawProgress(t01);
    };

    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onEnded);
    media.addEventListener('seeked', onSeeked);
    media.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('seeked', onSeeked);
      media.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [
    mediaRef,
    followMedia,
    drawBackground,
    redrawAll,
    drawProgress,
    durationMs,
  ]);

  // 毎フレーム（手動 or メディア追従のどちらでも動く）
  useTick(() => {
    let tSec: number | null = null;
    let capSec: number;

    if (followMedia && mediaRef?.current) {
      const media = mediaRef.current!;
      const dur = Math.max(0.001, media.duration || 0);
      capSec = Math.min(durationMs / 1000, dur || Infinity);
      tSec = Math.min(media.currentTime, capSec);
    } else {
      // 手動モード：performance.now ベース
      if (!playingRef.current || startTimeRef.current == null) return;
      capSec = durationMs / 1000;
      tSec = Math.min(
        (performance.now() - startTimeRef.current) / 1000,
        capSec
      );
      // cap 到達で停止
      if (tSec >= capSec) {
        playingRef.current = false;
      }
    }

    if (tSec == null) return;

    // 進捗→必要本数
    const colsPerSec = capacity / (durationMs / 1000);
    const shouldCount = Math.floor(colsPerSec * tSec);

    const cols = columnsRef.current;
    let prev = cols.length ? cols[cols.length - 1] : 0;

    while (cols.length < shouldCount) {
      const v = nextValue(prev);
      cols.push(v);
      prev = v;
    }

    redrawAll();
  });

  return (
    <pixiContainer
      eventMode='static'
      hitArea={new Rectangle(x, y, width, height)}
      onPointerDown={handlePointerDown}
      cursor='pointer'
    >
      <pixiGraphics ref={bgRef} draw={() => {}} />
      <pixiGraphics ref={spikesRef} draw={() => {}} />
      <pixiGraphics ref={progressRef} draw={() => {}} />
    </pixiContainer>
  );
};
