import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { SystemDevice } from '../../../../functions/systemDevice';
import { MidiFilter } from '../types';
import { runTest } from './testMidiFilterEngine';

export const MidiFilterTestIndex = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterFileName, setFilterFileName] = useState<string | null>(null);
  const [filterJson, setFilterJson] = useState<MidiFilter | undefined>(
    undefined
  );
  const [logLines, setLogLines] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

  // ファイル選択時の処理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: MidiFilter = JSON.parse(text);
      setFilterJson(parsed);
      setFilterFileName(file.name);
      setStatus('✅ フィルターを読み込みました');
    } catch (err) {
      setStatus('⚠️ フィルターJSONの読み込みに失敗しました:');
      console.log(err);
    }
  };

  // フィルターをクリアする
  const handleClearFilter = () => {
    setFilterJson(undefined);
    setFilterFileName(null);
    setStatus('⚠️ フィルターを未設定にしました');
  };

  // テスト実行
  const handleRunTest = async () => {
    setStatus('🟡 テスト実行中...');
    const lines: string[] = [];

    const filterToUse = filterJson;
    if (!filterToUse) return;

    await runTest(filterToUse, (line) => lines.push(line));

    setLogLines(lines);
    setStatus('✅ テスト完了。結果を表示しました。');
  };

  // 結果をダウンロード
  const handleDownload = () => {
    const blob = new Blob([logLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'midi_filter_test_log.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h5' gutterBottom>
        MIDI Recorder フィルターテスト
      </Typography>

      <Stack direction='column' spacing={2} sx={{ mb: 2 }}>
        <Button
          variant='outlined'
          onClick={() => fileInputRef.current?.click()}
        >
          フィルター（.json）を選択
        </Button>

        <Button
          variant='text'
          disabled={!filterJson}
          onClick={handleClearFilter}
        >
          フィルターをクリア
        </Button>
        <Button
          variant='contained'
          disabled={!filterJson}
          onClick={handleRunTest}
        >
          実行
        </Button>
      </Stack>

      <input
        type='file'
        accept='.json'
        hidden
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {filterFileName && (
        <Typography variant='body2' sx={{ mb: 1 }}>
          使用中のフィルター: <strong>{filterFileName}</strong>
        </Typography>
      )}

      <Typography variant='body1' sx={{ mb: 2 }}>
        {status}
      </Typography>

      {logLines.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant='h6'>テスト結果</Typography>
          <Box
            component='pre'
            sx={(theme) => ({
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 14,
              p: 2,
              borderRadius: 1,
              border: 1,
              borderColor: 'lightgray',
              maxHeight: 400,
              overflowY: 'auto',
              backgroundColor: theme.palette.background.default,
            })}
          >
            {logLines.join('\n')}
          </Box>

          {SystemDevice.isRunningOnQuattro ? null : (
            <Button variant='outlined' sx={{ mt: 2 }} onClick={handleDownload}>
              ログをダウンロード
            </Button>
          )}
        </>
      )}
    </Box>
  );
};
