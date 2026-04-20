export const DROP_THRESHOLD = 0.05;
export const MIN_HITS_REQUIRED = 8;

export const secPerBeat = (bpm: number) => 60 / bpm;

/**
 * Signed measurement of a rhythm-game calibration session.
 *
 * Semantics:
 *   hit_time_measured = beat_time_scheduled
 *                     + audio_output_latency   (user hears the beat late)
 *                     + human_reaction_noise   (random, ~0 on median)
 *                     + input_lag              (MIDI device → USB/BT → native → WebView → JS)
 *
 * So `signedTotalMs` (median of hit - nearest_beat) ≈ total end-to-end latency
 * that the rhythm-game engine needs to COMPENSATE. Do NOT subtract audio output
 * from it — the player's perception already includes that latency.
 *
 * `audioOutputLatencyMs` comes from AudioContext.outputLatency (browser-reported).
 * `inputPlusReactionMs` = signedTotalMs - audioOutputLatencyMs. It isolates the
 * component downstream of the speakers: mostly input lag, with residual human
 * reaction noise that averages toward zero for a trained player.
 */
export interface CalibrationResult {
  signedTotalMs: number;           // end-to-end, for compensation (signed)
  audioOutputLatencyMs: number;    // reported by AudioContext
  inputPlusReactionMs: number;     // signedTotal - audioOutput
  deviationsMs: number[];          // signed per-hit deviations
  stdDevMs: number;
  hitCount: number;
}

export function dropOutliers(hits: number[], bpm: number): number[] {
  const spb = secPerBeat(bpm);
  const result = [...hits];
  for (let i = result.length - 1; i >= 1; i--) {
    const expected = result[i - 1] + spb;
    if (Math.abs(result[i] - expected) > DROP_THRESHOLD) {
      result.splice(i, 1);
    }
  }
  return result;
}

// Signed deviation per hit: positive = late, negative = early
export function computeSignedDeviations(hits: number[], bpm: number): number[] {
  const spb = secPerBeat(bpm);
  return hits.map((hit) => {
    const nearestBeat = Math.round(hit / spb) * spb;
    return hit - nearestBeat;
  });
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid] + sorted[mid - 1]) / 2;
}

export function stdDev(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateCalibrationResult(
  rawHits: number[],
  bpm: number,
  audioOutputLatencySec: number,
): CalibrationResult | null {
  const hits = dropOutliers(rawHits, bpm);
  if (hits.length < MIN_HITS_REQUIRED) return null;

  const signedDeviations = computeSignedDeviations(hits, bpm);
  const signedTotalSec = median(signedDeviations);

  const signedTotalMs = Math.round(signedTotalSec * 1000);
  const audioOutputLatencyMs = Math.round(audioOutputLatencySec * 1000);
  const inputPlusReactionMs = signedTotalMs - audioOutputLatencyMs;
  const deviationsMs = signedDeviations.map((d) => Math.round(d * 1000));
  const stdDevMs = Math.round(stdDev(signedDeviations) * 1000);

  return {
    signedTotalMs,
    audioOutputLatencyMs,
    inputPlusReactionMs,
    deviationsMs,
    stdDevMs,
    hitCount: hits.length,
  };
}
