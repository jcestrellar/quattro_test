import { QuattroMidiEndpoint } from '../quattro/quattroMidi/quattroMidiTypes';
import { WebMidiManager } from './webMidiManager';

// Quattro API は型定義ファイルが用意されていないので、例外的に any 型として扱う。
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
declare const $native: any;

/**
 * $native.midi に定義されている元の API メソッドを一時的に上書きし、
 * Web MIDI API を使用して MIDI の送受信やデバイスの管理を可能にします。
 * これにより、Web ブラウザ上で簡易的に MIDI 通信のデバッグが可能になります。
 *
 * ただし、Web MIDI を経由することで Quattro ネイティブ層をバイパスするため、
 * ネイティブ実装と異なる動作になる点に注意が必要です。
 * 特に、ネイティブ独自の制御処理や接続検証ロジックは通らなくなるため、挙動の差異に留意してください。
 *
 * ただし、以下の Quattro API には非対応です：
 * - $native.midi.panel
 * - $native.midi.event.connectfailed
 * - $native.midi.event.error
 */
export class WebMidiBridge {
  private static _instance: WebMidiBridge;
  static get instance() {
    if (!WebMidiBridge._instance) {
      WebMidiBridge._instance = new WebMidiBridge();
    }
    return WebMidiBridge._instance;
  }

  private isSetup = false;

  // キャッシュ変数
  private sendMethod?: (msg: string) => void;
  private inputEndpointsMethod?: () => QuattroMidiEndpoint[];
  private outputEndpointsMethod?: () => QuattroMidiEndpoint[];
  private connectInputEndpointMethod?: (ep?: QuattroMidiEndpoint) => void;
  private connectOutputEndpointMethod?: (ep?: QuattroMidiEndpoint) => void;
  private disconnectInputEndpointMethod?: (ep?: QuattroMidiEndpoint) => void;
  private disconnectOutputEndpointMethod?: (ep?: QuattroMidiEndpoint) => void;

  // イベントリスナー解除用関数
  private unsubscribeMidiMessage?: () => void;
  private unsubscribeMidiAccessStateChange?: () => void;

  private constructor() {
    // 元のメソッドをキャッシュ
    this.sendMethod = $native.midi.send;
    this.inputEndpointsMethod = $native.midi.input.endpoints;
    this.outputEndpointsMethod = $native.midi.output.endpoints;
    this.connectInputEndpointMethod = $native.midi.input.connect;
    this.connectOutputEndpointMethod = $native.midi.output.connect;
    this.disconnectInputEndpointMethod = $native.midi.input.disconnect;
    this.disconnectOutputEndpointMethod = $native.midi.output.disconnect;
  }

  /**
   * Web MIDI API の MIDIInput / MIDIOutput を
   * Quattro が期待する MIDI エンドポイント形式に変換します。
   */
  static toQuattroMidiEndpoint(
    device: MIDIInput | MIDIOutput
  ): QuattroMidiEndpoint {
    const indexKey = Number.isFinite(Number(device.id))
      ? parseInt(device.id)
      : 0;

    return {
      MIDIDeviceNameKey: device.name ?? '',
      MIDIEndpointIndexKey: indexKey,
      MIDIEndpointUIDKey: indexKey,
      MIDIEntityNameKey: device.name ?? '',
    };
  }

  /**
   * $native.midi APIのメソッドを
   * WebMidiManager連携版へ差し替える。
   * これによりMIDI入出力操作が WebMidiManager 経由で行われる。
   */
  setup() {
    if (this.isSetup) return;

    $native.midi.send = (msg: string) => {
      WebMidiManager.instance.sendRawMessage(msg);
    };

    this.unsubscribeMidiMessage = WebMidiManager.instance.onMidiMessage(
      (msg, timestamp) => {
        const sanitized = msg.replace(/\s+/g, ''); // 空白除去
        $native.midi.event.message(sanitized, timestamp);
      }
    );

    this.unsubscribeMidiAccessStateChange =
      WebMidiManager.instance.onMidiAccessStateChange(() => {
        $native.midi.event.changed();
      });

    $native.midi.input.endpoints = () => {
      return WebMidiManager.instance.availableInputs.map(
        (ep): QuattroMidiEndpoint => WebMidiBridge.toQuattroMidiEndpoint(ep)
      );
    };
    $native.midi.output.endpoints = () => {
      return WebMidiManager.instance.availableOutputs.map(
        (ep): QuattroMidiEndpoint => WebMidiBridge.toQuattroMidiEndpoint(ep)
      );
    };

    $native.midi.input.connect = (ep?: QuattroMidiEndpoint) => {
      const inputs = WebMidiManager.instance.availableInputs;
      const midiInput = inputs.find((i) => i.name === ep?.MIDIDeviceNameKey);
      WebMidiManager.instance.connectInput(midiInput);
    };
    $native.midi.output.connect = (ep?: QuattroMidiEndpoint) => {
      const outputs = WebMidiManager.instance.availableOutputs;
      const midiOutput = outputs.find((o) => o.name === ep?.MIDIDeviceNameKey);
      WebMidiManager.instance.connectOutput(midiOutput);
    };
    $native.midi.input.disconnect = (ep?: QuattroMidiEndpoint) => {
      const inputs = WebMidiManager.instance.connectedInputs;
      const midiInput = inputs.find((i) => i.name === ep?.MIDIDeviceNameKey);
      WebMidiManager.instance.disconnectInput(midiInput);
    };
    $native.midi.output.disconnect = (ep?: QuattroMidiEndpoint) => {
      const outputs = WebMidiManager.instance.connectedOutputs;
      const midiOutput = outputs.find((o) => o.name === ep?.MIDIDeviceNameKey);
      WebMidiManager.instance.disconnectOutput(midiOutput);
    };

    this.isSetup = true;
  }

  /**
   * $native.midi のAPIメソッドを元の実装に戻す
   * WebMidiManagerとの連携を解除する際に呼び出す
   */
  dispose() {
    if (!this.isSetup) return;

    // 元のメソッドに戻す
    if (this.sendMethod) $native.midi.send = this.sendMethod;
    if (this.inputEndpointsMethod)
      $native.midi.input.endpoints = this.inputEndpointsMethod;
    if (this.outputEndpointsMethod)
      $native.midi.output.endpoints = this.outputEndpointsMethod;
    if (this.connectInputEndpointMethod)
      $native.midi.input.connect = this.connectInputEndpointMethod;
    if (this.connectOutputEndpointMethod)
      $native.midi.output.connect = this.connectOutputEndpointMethod;
    if (this.disconnectInputEndpointMethod)
      $native.midi.input.disconnect = this.disconnectInputEndpointMethod;
    if (this.disconnectOutputEndpointMethod)
      $native.midi.output.disconnect = this.disconnectOutputEndpointMethod;

    // 登録したイベントリスナーを解除
    if (this.unsubscribeMidiMessage) this.unsubscribeMidiMessage();
    if (this.unsubscribeMidiAccessStateChange)
      this.unsubscribeMidiAccessStateChange();

    this.isSetup = false;
  }
}
