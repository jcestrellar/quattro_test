/**
 * Copyright (c) 2019 Ryoya Kawai. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

export class BLEMIDIUtils {
  private deviceConnected: boolean = false;
  private readonly MIDI_UUID: string = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
  private readonly MIDI_CHARA_UUID: string =
    '7772e5db-3868-4112-a1a9-f2669d106bf3';
  // private connectedDevice: BluetoothDevice | null = null;
  private connectedDevice: any | null = null;
  private timerId: number = 0;
  private connectedBleCallback: () => void = () =>
    console.log('[Called] connected_ble_callback');
  private disconnectedBleCallback: () => void = () =>
    console.log('[Called] disconnected_ble_callback');
  private onMidiEventHandleCallback: (event: Event) => void = (event) =>
    console.log(event);
  private parseMIDIMessage: (msg: number[]) => void = (msg) => {
    console.log("[Use 'setMIDIParser()' to set MIDI Parser]");
    console.log(msg);
  };

  getDeviceConnected(): boolean {
    return this.deviceConnected;
  }

  setDeviceConnected(state: boolean): void {
    this.deviceConnected = state;
  }

  async startBle(): Promise<void> {
    // const bleOptions: RequestDeviceOptions = {
    const bleOptions: any = {
      filters: [{ services: [this.MIDI_UUID] }],
    };

    try {
      // this.connectedDevice = await navigator.bluetooth.requestDevice(bleOptions);
      this.connectedDevice = await (navigator as any).bluetooth.requestDevice(
        bleOptions
      );
      const server = await this.connectedDevice.gatt?.connect();
      if (!server) throw new Error('GATTサーバーに接続できません');

      const service = await server.getPrimaryService(this.MIDI_UUID);
      await this.startBleMIDIService(service);
      this.connectedBleCallback();
    } catch (err) {
      console.error('[ERROR]', err);
    }
  }

  endBle(): void {
    if (!this.connectedDevice?.gatt?.connected) {
      console.log('[No devices are connected!]');
      return;
    }
    this.connectedDevice.gatt.disconnect();
    console.log('[Disconnected]');
    this.deviceConnected = false;
    this.disconnectedBleCallback();
  }

  // async startBleMIDIService(service: BluetoothRemoteGATTService): Promise<void> {
  async startBleMIDIService(service: any): Promise<void> {
    const characteristic = await service.getCharacteristic(
      this.MIDI_CHARA_UUID
    );
    await characteristic.startNotifications();

    this.deviceConnected = true;
    console.log('[Connected]', characteristic.uuid);

    characteristic.addEventListener(
      'characteristicvaluechanged',
      this.onMIDIEvent.bind(this)
    );
  }

  private onMIDIEvent(event: Event): void {
    // const target = event.target as BluetoothRemoteGATTCharacteristic;
    const target = event.target as any;
    const data = target?.value;

    if (!data) return;

    const out: number[] = [];
    let str = '';

    for (let i = 0; i < data.buffer.byteLength; i++) {
      const val = data.getUint8(i);
      str += val.toString(16) + ' ';
      out.push(val);
    }

    event = Object.assign(event, {
      detail: this.parseMIDIMessage(out.slice(2)),
    });
    this.onMidiEventHandleCallback(event);
  }

  setConnectedBleCallback(callback: () => void): void {
    this.connectedBleCallback = callback;
  }

  setDisconnectedBleCallback(callback: () => void): void {
    this.disconnectedBleCallback = callback;
  }

  setMidiEventHandleCallback(callback: (event: Event) => void): void {
    this.onMidiEventHandleCallback = callback;
  }

  setMIDIParser(parser: (msg: number[]) => void): void {
    this.parseMIDIMessage = parser;
  }
}
