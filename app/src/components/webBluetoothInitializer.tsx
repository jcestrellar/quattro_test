import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { WebBleBridge } from '../functions/webBluetooth/webBluetoothBridge';
import { AppDispatch } from '../stores/store';
import { SystemDevice } from '../functions/systemDevice';
/**
 * Web Bluetooth 環境の有効化/無効化を制御するための非表示コンポーネント。
 *
 * - 実行環境を判定
 * - ブラウザ環境の場合、WebBleBridge を介して $native.ble API を Web Bluetooth 実装に差し替え
 * - ネイティブアプリ環境の場合、OS 標準の BLE 通信を使用するため Bridge を無効化
 */
export const WebBluetoothInitializer = () => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    if (!SystemDevice.isRunningOnQuattro) {
      console.log('Running in Web Browser mode: Enabling WebBleBridge');
      WebBleBridge.instance.setup();
    } else {
      // Android/iOS アプリ内の場合は、Bridge は何もしない（ネイティブの $native.ble をそのまま使う）
      console.log('Running in Native App or Disabled: WebBleBridge is skipped');
      WebBleBridge.instance.dispose();
    }
  }, [dispatch]);

  return null;
};
