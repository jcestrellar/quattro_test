// このスクリプトは、プラットフォームに応じて Android 実機デバッグ用のスクリプトを実行します。
//
// 受け付ける引数：
//   -b, --build     → デバッグビルドを生成して実機にインストールします
//   -i, --inspect   → （macOS のみ）chrome://inspect を開いて WebView のデバッグを行います
//
// 動作概要：
//   - macOS の場合：引数をそのまま `deviceDebug/run-android.sh` に渡して実行
//   - Windows の場合：引数を PowerShell スクリプト用に変換して `deviceDebug/run-android.ps1` に渡して実行
//
// 使用例：
//   node scripts/run-android.js -b
//   node scripts/run-android.js --build --inspect

import { execSync } from 'child_process';
import os from 'os';

const rawArgs = process.argv.slice(2); // ['-b', '-i'] など
const platform = os.platform();

// Windows 用の引数マッピング
function mapArgsToPs1(args) {
  return args
    .map(arg => {
      if (arg === '-b' || arg === '--build') return '-Build';
      // 不要なら他のマッピングを削除 or 追加
      return ''; // その他の引数は渡さない
    })
    .filter(Boolean) // 空文字を除去
    .join(' ');
}

try {
  if (platform === 'darwin') {
    console.log('🍎 macOS detected: running run-android.sh...');
    const args = rawArgs.join(' '); // 元の引数をそのまま渡す
    execSync(`cd ./deviceDebug && sh run-android.sh ${args}`, {
      stdio: 'inherit',
      shell: true,
    });
  } else if (platform === 'win32') {
    console.log('🪟 Windows detected: running run-android.ps1...');
    const args = mapArgsToPs1(rawArgs);
    execSync(`pwsh -ExecutionPolicy Bypass -File ./deviceDebug/run-android.ps1 ${args}`, {
      stdio: 'inherit',
      shell: true,
    });
  } else {
    console.error(`❌ Unsupported platform: ${platform}`);
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Script execution failed:', err.message);
  process.exit(1);
}
