export type QuattroBatteryEventLevelChangedCallback = (level: number) => void;
export type QuattroBatteryEventStateChangedCallback = (
  state: BatteryState
) => void;
export enum BatteryState {
  Unknown = 0, // 充電状態を取得できなかった
  NotCharging = 1, // 充電中ではない
  Charging = 2, // 充電中であり 100% 未満
  Full = 3, // 充電中であり、100% である
}
