export type Judgement = 'perfect' | 'good' | 'ok' | 'miss';

export const WINDOWS_SEC = {
  perfect: 0.025,  // ±25ms
  good:    0.050,  // ±50ms
  ok:      0.075,  // ±75ms
} as const;

export const JUDGEMENT_POINTS: Record<Judgement, number> = {
  perfect: 100,
  good: 50,
  ok: 20,
  miss: 0,
};

export const JUDGEMENT_COLORS: Record<Judgement, string> = {
  perfect: '#ffd700',
  good: '#4ade80',
  ok: '#60a5fa',
  miss: '#f87171',
};

export function judge(deltaSec: number): Judgement {
  const abs = Math.abs(deltaSec);
  if (abs <= WINDOWS_SEC.perfect) return 'perfect';
  if (abs <= WINDOWS_SEC.good) return 'good';
  if (abs <= WINDOWS_SEC.ok) return 'ok';
  return 'miss';
}

export function isMissWindow(deltaSec: number): boolean {
  return deltaSec > WINDOWS_SEC.ok;
}

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  totalNotes: number;
  hitNotes: number;
  lastJudgement: Judgement | null;
}

export function initialScore(): ScoreState {
  return { score: 0, combo: 0, maxCombo: 0, totalNotes: 0, hitNotes: 0, lastJudgement: null };
}

export function applyJudgement(state: ScoreState, j: Judgement): ScoreState {
  const points = JUDGEMENT_POINTS[j];
  const hit = j !== 'miss';
  const combo = hit ? state.combo + 1 : 0;
  const maxCombo = Math.max(state.maxCombo, combo);
  return {
    score: state.score + points * (hit ? 1 + Math.floor(combo / 10) * 0.1 : 1),
    combo,
    maxCombo,
    totalNotes: state.totalNotes + 1,
    hitNotes: state.hitNotes + (hit ? 1 : 0),
    lastJudgement: j,
  };
}
