import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Quattro } from '../functions/quattro/quattro';
import { StorageKey } from '../functions/quattro/quattroApp/storageKey';
import { WebMidiBridge } from '../functions/webMidi/webMidiBridge';
import { WebMidiManager } from '../functions/webMidi/webMidiManager';
import {
  connectMidiEndpoints,
  disconnectMidiEndpoints,
} from '../stores/midiDevice/midiDeviceSlice';
import { AppDispatch, RootState } from '../stores/store';

/**
 * Web MIDI 環境の有効化/無効化を制御するための非表示コンポーネント。
 *
 * - Redux ストアの `preference.webMidiEnabled` の状態を監視
 * - true になったら、WebMidiBridge を介して Web MIDI の初期化処理（$native.midi APIの差し替え）を実行
 */
export const WebMidiInitializer = () => {
  const dispatch = useDispatch<AppDispatch>();
  const webMidiEnabled = useSelector(
    (state: RootState) => state.preference.webMidiEnabled
  );

  useEffect(() => {
    if (webMidiEnabled) {
      WebMidiBridge.instance.setup();
    } else {
      WebMidiBridge.instance.dispose();
      dispatch(disconnectMidiEndpoints());
    }

    // デバッグ用として、前回接続されていたデバイス ID をストレージに保存し、
    // ブラウザ更新後の再接続に活用する（StarterKit では接続先は1つのみと仮定）
    const unsubscribeStateChange =
      WebMidiManager.instance.onMidiAccessStateChange(() => {
        const inputId = Quattro.app.storage2(
          StorageKey.WebMidiLastConnectedInputId
        );
        const outputId = Quattro.app.storage2(
          StorageKey.WebMidiLastConnectedOutputId
        );
        if (inputId && outputId) {
          const input = WebMidiManager.instance.availableInputs.find(
            (i) => i.id === inputId
          );
          const output = WebMidiManager.instance.availableOutputs.find(
            (i) => i.id === outputId
          );
          if (input && output) {
            dispatch(
              connectMidiEndpoints({
                input: [WebMidiBridge.toQuattroMidiEndpoint(input)],
                output: [WebMidiBridge.toQuattroMidiEndpoint(output)],
              })
            );
          }
        }

        unsubscribeStateChange();
      });

    const unsubscribeInputConnected = WebMidiManager.instance.onInputConnected(
      (input) => {
        Quattro.app.setStorage2(
          StorageKey.WebMidiLastConnectedInputId,
          input.id
        );
      }
    );

    const unsubscribeOutputConnected =
      WebMidiManager.instance.onOutputConnected((output) => {
        Quattro.app.setStorage2(
          StorageKey.WebMidiLastConnectedOutputId,
          output.id
        );
      });

    const unsubscribeInputDisconnected =
      WebMidiManager.instance.onInputDisconnected(() => {
        Quattro.app.setStorage2(StorageKey.WebMidiLastConnectedInputId, '');
      });

    const unsubscribeOutputDisconnected =
      WebMidiManager.instance.onOutputDisconnected(() => {
        Quattro.app.setStorage2(StorageKey.WebMidiLastConnectedOutputId, '');
      });

    return () => {
      unsubscribeStateChange();
      unsubscribeInputConnected();
      unsubscribeOutputConnected();
      unsubscribeInputDisconnected();
      unsubscribeOutputDisconnected();
    };
  }, [dispatch, webMidiEnabled]);

  return null;
};
