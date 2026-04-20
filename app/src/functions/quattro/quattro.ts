import { QuattroApp } from './quattroApp/quattroApp';
import { QuattroBle } from './quattroBle/quattroBle';
import { QuattroEvent } from './quattroEvent/quattroEvent';
import { QuattroBattery } from './quattroExtensions/quattroBattery/quattroBattery';
import { QuattroCalculate } from './quattroExtensions/quattroCalculate/quattroCalculate';
import { QuattroFs } from './quattroFs/quattroFs';
import { QuattroMidi } from './quattroMidi/quattroMidi';
import { QuattroRcpLog } from './quattroRcpLog/quattroRcpLog';
import { QuattroSeq } from './quattroSeq/quattroSeq';

/**
 * Quattro の機能をラップした各インスタンスへのエイリアスを提供する
 */
export const Quattro = {
  app: QuattroApp.instance,
  midi: QuattroMidi.instance,
  seq: QuattroSeq.instance,
  fs: QuattroFs.instance,
  ble: QuattroBle.instance,
  rcpLog: QuattroRcpLog.instance,
  event: QuattroEvent.instance,
  extention: {
    calc: QuattroCalculate.instance,
    battery: QuattroBattery.instance,
  },
};
