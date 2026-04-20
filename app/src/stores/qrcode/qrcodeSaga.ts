import { Quattro } from '../../functions/quattro/quattro';

export enum QRScanErrorType {
  CAMERA_NOT_PERMITTED = 'CAMERA_NOT_PERMITTED',
  USER_CANCELLED = 'USER_CANCELLED',
}

export class QRScanError extends Error {
  constructor(public type: QRScanErrorType) {
    super(type);
    this.name = 'QRScanError';
  }
}
/**
 * カメラを起動し、QRコードの文字列を読み取る
 */
export function* scanQRCodeSaga(): Generator {
  console.log('scanQRCodeSaga');
  let unsubscribeEventCommand: (() => void) | undefined;

  try {
    const scanResult = yield new Promise<string>((resolve, reject) => {
      unsubscribeEventCommand = Quattro.app.onEventCommand((command, text) => {
        if (command !== 'barcode') return;
        console.log(`qrcode text ${text}`);

        if (text === undefined) {
          // カメラが許可されていない場合
          reject(new QRScanError(QRScanErrorType.CAMERA_NOT_PERMITTED));
        } else if (text === '') {
          // ユーザーがキャンセルした場合
          reject(new QRScanError(QRScanErrorType.USER_CANCELLED));
        } else {
          // QRコード読み取り結果
          const resultText = Array.isArray(text) ? text[0] : text;
          resolve(resultText);
        }
      });
      Quattro.app.barcode();
    });

    return scanResult;
  } finally {
    unsubscribeEventCommand?.();
  }
}
