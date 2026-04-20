import { Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

export const WebBluetoothIndex = () => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [knownDevices, setKnownDevices] = useState<BluetoothDevice[]>([]);

  // ページロード時に既に許可されたデバイスを取得
  useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.bluetooth.getDevices();
        // MIDIサービスを持つデバイスだけ絞るのも可能
        setKnownDevices(devices);
      } catch (error) {
        console.error('既存デバイスの取得に失敗:', error);
      }
    })();
  }, []);

  const parseTimestamp = (bytes: Uint8Array): number => {
    let timestamp = 0;
    let i = 0;

    // MSBが1のバイトはタイムスタンプの一部
    while (i < bytes.length && (bytes[i] & 0x80) !== 0) {
      // 7ビット分を左にずらして加算
      timestamp = (timestamp << 7) | (bytes[i] & 0x7f);
      i++;
    }

    // 最後のバイト（MSB=0）もタイムスタンプに含む
    if (i < bytes.length) {
      timestamp = (timestamp << 7) | (bytes[i] & 0x7f);
      i++;
    }

    return timestamp;
  };

  const connectToDevice = async (selectedDevice: BluetoothDevice) => {
    try {
      const server = await selectedDevice.gatt?.connect();
      const service = await server?.getPrimaryService(MIDI_SERVICE_UUID);
      const characteristic = await service?.getCharacteristic(
        MIDI_CHARACTERISTIC_UUID
      );

      await characteristic?.startNotifications();

      characteristic?.addEventListener(
        'characteristicvaluechanged',
        (event) => {
          const value = (event.target as BluetoothRemoteGATTCharacteristic)
            .value;
          if (value) {
            const bytes = new Uint8Array(value.buffer);

            // タイムスタンプを解析
            const timestamp = parseTimestamp(bytes);

            // タイムスタンプ分のバイトを除いた残りがMIDIメッセージ本体
            const midiData = bytes.slice(
              bytes.findIndex((b) => (b & 0x80) === 0, 0) + 1
            );

            // MIDIデータを16進数文字列化
            const hexString = Array.from(midiData)
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ');

            console.log(
              `タイムスタンプ: ${timestamp}, MIDIデータ: ${hexString}`
            );
          }
        }
      );

      setDevice(selectedDevice);
      setIsConnected(true);

      selectedDevice.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDevice(null);
        console.log('デバイスの接続が切断されました');
      });
    } catch (error) {
      console.error('デバイスへの接続中にエラー:', error);
    }
  };

  const requestNewDevice = async () => {
    try {
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MIDI_SERVICE_UUID] }],
        optionalServices: [MIDI_SERVICE_UUID],
      });
      // 新規デバイスは既知デバイスリストに追加
      setKnownDevices((prev) => [...prev, selectedDevice]);
      await connectToDevice(selectedDevice);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        console.log('デバイス選択がキャンセルされました');
      } else {
        console.error('デバイス選択中にエラー:', error);
      }
    }
  };

  const disconnectDevice = () => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
      console.log('デバイスの接続を切断しました');
    }
  };

  return (
    <>
      <Typography variant='body1' gutterBottom>
        接続状態:{' '}
        {isConnected
          ? `接続済み (${device?.name || '不明なデバイス'})`
          : '未接続'}
      </Typography>

      {isConnected ? (
        <Button onClick={disconnectDevice}>切断</Button>
      ) : (
        <>
          <Button onClick={requestNewDevice}>新しいデバイスを選択</Button>

          {/* 既知デバイス一覧を表示して選択できるように */}
          {knownDevices.length > 0 && (
            <>
              <Typography variant='subtitle1' gutterBottom>
                既知のデバイスから再接続
              </Typography>
              {knownDevices.map((d) => (
                <Button
                  key={d.id}
                  onClick={() => connectToDevice(d)}
                  disabled={isConnected}
                  variant='outlined'
                  sx={{ m: 0.5 }}
                >
                  {d.name || '不明なデバイス'}
                </Button>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
};
