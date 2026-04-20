import { useEffect, useState } from 'react';
import type { ChartMeta, ChartParser, MidiChart } from './chartTypes';
import { SystemDevice } from '../../functions/systemDevice';
import { Quattro } from '../../functions/quattro/quattro';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface ChartLoaderResult {
  chart: MidiChart | null;
  meta: ChartMeta | null;
  status: LoadStatus;
  error: string | null;
}

function parseSongIni(text: string): ChartMeta {
  const get = (key: string): string => {
    const match = text.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));
    return match ? match[1].trim().replace(/^"|"$/g, '') : '';
  };
  return {
    name: get('name'),
    artist: get('artist'),
    songLengthMs: parseInt(get('song_length')) || 0,
    previewStartMs: parseInt(get('preview_start_time')) || 0,
  };
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const clean = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

export function useChartLoader(parser: ChartParser): ChartLoaderResult {
  const [state, setState] = useState<ChartLoaderResult>({
    chart: null,
    meta: null,
    status: 'loading',
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let midBuffer: ArrayBuffer;
        let iniText: string;

        if (SystemDevice.isRunningOnQuattro) {
          const base = SystemDevice.currentIndexPath;
          const [midRaw, ini] = await Promise.all([
            Quattro.fs.readData(`${base}/assets/notes.mid`),
            Quattro.fs.readString(`${base}/assets/song.ini`),
          ]);
          midBuffer = hexToArrayBuffer(midRaw);
          iniText = ini;
        } else {
          const [midResp, iniResp] = await Promise.all([
            fetch('assets/notes.mid'),
            fetch('assets/song.ini'),
          ]);
          if (!midResp.ok) throw new Error(`notes.mid not found (${midResp.status})`);
          if (!iniResp.ok) throw new Error(`song.ini not found (${iniResp.status})`);
          [midBuffer, iniText] = await Promise.all([
            midResp.arrayBuffer(),
            iniResp.text(),
          ]);
        }

        if (cancelled) return;

        const chart = parser(midBuffer);
        const meta = parseSongIni(iniText);
        setState({ chart, meta, status: 'ready', error: null });
      } catch (e) {
        if (!cancelled) {
          console.error('[useChartLoader]', e);
          setState({ chart: null, meta: null, status: 'error', error: String(e) });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [parser]);

  return state;
}
