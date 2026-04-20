type MidiMessageCallback = (message: string, timestamp: number) => void;
type DeviceChangeCallback = () => void;
type InputConnectCallback = (input: MIDIInput) => void;
type OutputConnectCallback = (output: MIDIOutput) => void;
type InputDisconnectCallback = (input: MIDIInput) => void;
type OutputDisconnectCallback = (output: MIDIOutput) => void;

/**
 * アプリケーション全体で Web MIDI API を通じた MIDI デバイスとの接続・通信を管理するシングルトンクラス。
 *
 * React に依存しないため、任意のレイヤーや環境から利用可能。
 */
export class WebMidiManager {
  private static _instance: WebMidiManager;

  // MIDI 入力一覧
  private _midiInputs: MIDIInput[] = [];
  get availableInputs() {
    return this._midiInputs;
  }

  // MIDI 出力一覧
  private _midiOutputs: MIDIOutput[] = [];
  get availableOutputs() {
    return this._midiOutputs;
  }

  // 現在接続中の MIDI 入力一覧
  private _connectedInputs: MIDIInput[] = [];
  get connectedInputs() {
    return this._connectedInputs;
  }

  // 現在接続中の MIDI 出力一覧
  private _connectedOutputs: MIDIOutput[] = [];
  get connectedOutputs() {
    return this._connectedOutputs;
  }

  private inputConnectedListeners: InputConnectCallback[] = [];
  private outputConnectedListeners: OutputConnectCallback[] = [];
  private inputDisconnectedListeners: InputDisconnectCallback[] = [];
  private outputDisconnectedListeners: OutputDisconnectCallback[] = [];
  private midiMessageListeners: MidiMessageCallback[] = [];
  private midiAccessStateChangeListeners: DeviceChangeCallback[] = [];

  private constructor() {
    this.initialize();
  }

  static get instance() {
    if (!WebMidiManager._instance) {
      WebMidiManager._instance = new WebMidiManager();
    }
    return WebMidiManager._instance;
  }

  /**
   * Web MIDI API を初期化し、入出力デバイスの一覧取得および監視処理をセットアップする。
   * 初期化完了後、現在の接続情報をもとに input/output の更新通知を即時送出する。
   */
  async initialize() {
    try {
      const access = await navigator.requestMIDIAccess({ sysex: true });
      this._midiInputs = Array.from(access.inputs.values());
      this._midiOutputs = Array.from(access.outputs.values());

      // statechange イベント登録
      access.onstatechange = () => {
        this._midiInputs = Array.from(access.inputs.values());
        this._midiOutputs = Array.from(access.outputs.values());
        this.midiAccessStateChangeListeners.forEach((cb) => cb());
      };

      // 初期化時にも通知
      this.midiAccessStateChangeListeners.forEach((cb) => cb());
    } catch (e) {
      console.error('MIDIアクセス失敗', e);
    }
  }

  /**
   * 任意の 16進文字列をバイト列に変換し、現在の出力デバイスに送信する
   */
  sendRawMessage(hexString: string) {
    if (!this._connectedOutputs.length) {
      console.warn('MIDI Output が接続されていません');
      return;
    }

    const clean = hexString.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (clean.length % 2 !== 0) {
      console.warn('奇数桁の入力です。16進数は2桁ずつで指定してください。');
      return;
    }

    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      const byte = parseInt(clean.slice(i, i + 2), 16);
      if (isNaN(byte)) {
        console.warn(`無効な16進数: "${clean.slice(i, i + 2)}"`);
        return;
      }
      bytes.push(byte);
    }

    if (bytes.length === 0) {
      console.warn('無効な送信データ');
      return;
    }

    this._connectedOutputs.forEach((ep) => ep.send(bytes));
    console.log('送信:', bytes);
  }

  /**
   * 指定した MIDI 入力デバイスを接続し、MIDI メッセージ受信を開始する。
   * 引数を省略した場合は、現在検出されている全ての入力デバイスに接続する。
   * 接続済みのデバイスには再接続されない。
   *
   * @param input 接続対象の MIDIInput。省略可能。
   */
  connectInput(input?: MIDIInput) {
    if (!input) {
      this._midiInputs.forEach((i) => this.connectInput(i));
      return;
    }

    if (this._connectedInputs.some((i) => i.id === input.id)) {
      console.warn(`Input "${input.name}" はすでに接続されています。`);
      return;
    }

    const handleMessage = (event: MIDIMessageEvent) => {
      if (!event.data) return;

      const hex = Array.from(event.data)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase();

      if (hex === 'F8') return;

      const timestamp = Math.round(event.timeStamp);
      this.midiMessageListeners.forEach((cb) => cb(hex, timestamp));
    };

    input.onmidimessage = handleMessage;
    this._connectedInputs.push(input);
    this.inputConnectedListeners.forEach((cb) => cb(input));
  }

  /**
   * 指定した MIDI 出力デバイスを接続し、MIDI メッセージの送信対象として登録する。
   * 引数を省略した場合は、現在検出されている全ての出力デバイスに接続する。
   * 接続済みのデバイスには再接続されない。
   *
   * @param output 接続対象の MIDIOutput。省略可能。
   */
  connectOutput(output?: MIDIOutput) {
    if (!output) {
      this._midiOutputs.forEach((o) => this.connectOutput(o));
      return;
    }

    if (this._connectedOutputs.some((o) => o.id === output.id)) {
      console.warn(`Output "${output.name}" はすでに接続されています。`);
      return;
    }

    this._connectedOutputs.push(output);
    this.outputConnectedListeners.forEach((cb) => cb(output));
  }

  /**
   * 指定した MIDI 入力デバイスを切断し、MIDI メッセージの受信を停止する。
   * 引数を省略した場合は、すべての接続済み入力デバイスを切断する。
   *
   * @param input 切断対象の MIDIInput。省略可能。
   */
  disconnectInput(input?: MIDIInput) {
    if (!input) {
      // 登録済みをコピーしてループ（途中で _connectedInputs を変更するため）
      [...this._connectedInputs].forEach((i) => this.disconnectInput(i));
      return;
    }

    this._connectedInputs = this._connectedInputs.filter((i) => {
      if (i.id === input.id) {
        i.onmidimessage = null;
        return false;
      }
      return true;
    });

    this.inputDisconnectedListeners.forEach((cb) => cb(input));
  }

  /**
   * 指定した MIDI 出力デバイスを切断し、送信対象から除外する。
   * 引数を省略した場合は、すべての接続済み出力デバイスを切断する。
   *
   * @param output 切断対象の MIDIOutput。省略可能。
   */
  disconnectOutput(output?: MIDIOutput) {
    if (!output) {
      [...this._connectedOutputs].forEach((o) => this.disconnectOutput(o));
      return;
    }

    this._connectedOutputs = this._connectedOutputs.filter((o) => {
      if (o.id === output.id) {
        return false;
      }
      return true;
    });

    this.outputDisconnectedListeners.forEach((cb) => cb(output));
  }

  /**
   * 入力デバイス接続成功時のリスナーを登録する
   * @returns 登録解除関数
   */
  onInputConnected(callback: InputConnectCallback) {
    this.inputConnectedListeners.push(callback);
    return () => {
      this.inputConnectedListeners = this.inputConnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 出力デバイス接続成功時のリスナーを登録する
   * @returns 登録解除関数
   */
  onOutputConnected(callback: OutputConnectCallback) {
    this.outputConnectedListeners.push(callback);
    return () => {
      this.outputConnectedListeners = this.outputConnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 入力デバイス切断時のリスナーを登録する
   * @returns 登録解除関数
   */
  onInputDisconnected(callback: InputDisconnectCallback) {
    this.inputDisconnectedListeners.push(callback);
    return () => {
      this.inputDisconnectedListeners = this.inputDisconnectedListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 出力デバイス切断時のリスナーを登録する
   * @returns 登録解除関数
   */
  onOutputDisconnected(callback: OutputDisconnectCallback) {
    this.outputDisconnectedListeners.push(callback);
    return () => {
      this.outputDisconnectedListeners =
        this.outputDisconnectedListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * MIDI メッセージ受信時のリスナーを登録する
   * @returns 登録解除関数
   */
  onMidiMessage(callback: MidiMessageCallback) {
    this.midiMessageListeners.push(callback);
    return () => {
      this.midiMessageListeners = this.midiMessageListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 新しい MIDI ポートが追加されるか、既存のポート状態変化のリスナーを登録する
   * @returns 登録解除関数
   */
  onMidiAccessStateChange(callback: DeviceChangeCallback) {
    this.midiAccessStateChangeListeners.push(callback);
    return () => {
      this.midiAccessStateChangeListeners =
        this.midiAccessStateChangeListeners.filter((cb) => cb !== callback);
    };
  }
}
