import { SystemDevice } from '../../functions/systemDevice';
import { Quattro } from '../../functions/quattro/quattro';

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const clean = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private startCtxTime = 0;
  private _isPlaying = false;

  async load(url: string): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    let arrayBuffer: ArrayBuffer;
    if (SystemDevice.isRunningOnQuattro) {
      const base = SystemDevice.currentIndexPath;
      const raw = await Quattro.fs.readData(`${base}/${url}`);
      arrayBuffer = hexToArrayBuffer(raw);
    } else {
      const resp = await fetch(url);
      arrayBuffer = await resp.arrayBuffer();
    }
    if (!this.ctx) return; // disposed while load was in-flight (React 18 strict mode)
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  start(): void {
    if (!this.ctx || !this.buffer || this._isPlaying) return;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.ctx.destination);
    this.startCtxTime = this.ctx.currentTime;
    this.source.start(0);
    this._isPlaying = true;
  }

  getCurrentTime(): number {
    if (!this.ctx || !this._isPlaying) return 0;
    return this.ctx.currentTime - this.startCtxTime;
  }

  getDuration(): number {
    return this.buffer?.duration ?? 0;
  }

  getOutputLatency(): number {
    if (!this.ctx) return 0;
    return (this.ctx as AudioContext & { outputLatency?: number }).outputLatency ??
      this.ctx.baseLatency ??
      0;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  stop(): void {
    this.source?.stop();
    this.source?.disconnect();
    this.source = null;
    this._isPlaying = false;
  }

  onEnded(cb: () => void): void {
    if (this.source) {
      this.source.onended = cb;
    }
  }

  dispose(): void {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
    this.buffer = null;
  }
}
