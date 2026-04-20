export type TempoChangeCallback = (tempo: number) => void;
export type TimestampsChangeCallback = (timestamps: number[]) => void;

/**
 * タップテンポを推定するクラス。
 *
 * - タップの間隔から BPM（テンポ）を推定する。
 * - 指定された sampleSize 分のタップ間隔の平均から BPM を算出します。
 * - タップ間隔が timeoutThreshold を超えると内部状態をリセットします。
 */
export class TapTempoEstimator {
  /** BPMの上限値 */
  private static readonly MaxBpm = 300;

  /** タップ時刻[ms] */
  private _timestamps: number[] = [];
  get timestamps() {
    return this._timestamps;
  }

  /**
   * BPM 計算に用いるタップ回数。
   * 最小値は 2。小数は切り捨てされます。
   */
  private _sampleSize: number = 3;
  get sampleSize() {
    return this._sampleSize;
  }
  set sampleSize(n: number) {
    this._sampleSize = Math.max(2, Math.floor(n));
    this._timestamps = [];
  }

  /**
   * タップ間隔の最大許容時間[ms]。
   * この時間を超えた場合は内部状態をリセットします。
   * 最小値は100msです。
   */
  private _timeoutThreshold: number = 3000;
  get timeoutThreshold() {
    return this._timeoutThreshold;
  }
  set timeoutThreshold(ms: number) {
    this._timeoutThreshold = Math.max(100, Math.floor(ms));
  }

  /**
   * 現在のタップ間隔に基づく BPM 値の配列を取得します。
   * 最新の値が最後に入ります。
   */
  getRecentBpms(): number[] {
    const times = this._timestamps;
    if (times.length < 2) return [];

    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      const delta = times[i] - times[i - 1];
      if (delta <= 0) return [];
      intervals.push(delta);
    }

    return intervals.map((delta) =>
      Math.min(60000 / delta, TapTempoEstimator.MaxBpm)
    );
  }

  /**
   * タップ時刻を追加し、BPM を計算します。
   * @param timestamp タップ時刻[ms]
   */
  addTap(timestamp: number = performance.now()): void {
    const times = this._timestamps;

    if (times.length === 0) {
      times.push(timestamp);
      this.notifyTimestampsChange();
      return;
    }

    const lastTime = times[times.length - 1];
    if (timestamp - lastTime > this.timeoutThreshold) {
      // 間隔が長すぎる場合は履歴をリセット
      this._timestamps = [timestamp];
      this.notifyTimestampsChange();
      this.notifyTempoChange(0);
      return;
    }

    times.push(timestamp);

    if (times.length > this.sampleSize) {
      times.shift();
    }
    this.notifyTimestampsChange();

    if (times.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        const delta = times[i] - times[i - 1];
        if (delta <= 0) return;
        intervals.push(delta);
      }

      const bpmSum = intervals.reduce((sum, delta) => sum + 60000 / delta, 0);
      const avgBpm = bpmSum / intervals.length;
      const tempo = Math.min(avgBpm, TapTempoEstimator.MaxBpm);
      this.notifyTempoChange(tempo);
    }
  }

  /** タップ履歴と状態をリセットします。*/
  reset(): void {
    this._timestamps = [];
    this.notifyTempoChange(0);
    this.notifyTimestampsChange();
  }

  private tempoChangeListeners: ((tempo: number) => void)[] = [];
  /**
   * BPM の変化を通知するリスナーを登録。
   * @param callback BPM を受け取る関数
   * @returns 登録解除用の関数
   */
  onTempoChange(callback: TempoChangeCallback): () => void {
    this.tempoChangeListeners.push(callback);
    return () => {
      this.tempoChangeListeners = this.tempoChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private notifyTempoChange(tempo: number): void {
    for (const listener of this.tempoChangeListeners) {
      listener(tempo);
    }
  }

  private timestampsChangeListeners: TimestampsChangeCallback[] = [];

  /**
   * タップ時刻の配列が変化した際に通知するリスナーを登録。
   * @param callback 現在の timestamps を受け取る関数
   * @returns 登録解除用の関数
   */
  onTimestampsChange(callback: TimestampsChangeCallback): () => void {
    this.timestampsChangeListeners.push(callback);
    return () => {
      this.timestampsChangeListeners = this.timestampsChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  private notifyTimestampsChange(): void {
    for (const listener of this.timestampsChangeListeners) {
      listener([...this._timestamps]);
    }
  }
}
