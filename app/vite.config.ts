import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import licenseReporter from './plugins/rollup-plugin-license-reporter';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {

  const isDebugBuild = mode === 'development'; // 'development' モードの場合をデバッグビルドとする
  const isProductionBuild = mode === 'production'; // 'production' モードの場合をリリースビルドとする

  return {
    base: './',
    resolve: {
      alias: {
        /*
         * 本来は vite-plugin-node-polyfills の nodePolyfills() を使う想定だが、
         * 実行すると browser build で error が発生するため、ここでは呼び出さない。
         * 代わりに vite の alias 設定で必要な polyfill を個別に適用し、
         * browser 版の型・実装を参照させることで動作させている。
         */
        'url': path.resolve(__dirname, 'node_modules/url/url.js'),
        'util': path.resolve(__dirname, 'node_modules/util/util.js'),
        'aws-iot-device-sdk-v2': path.resolve(__dirname, 'node_modules/aws-iot-device-sdk-v2/dist/browser'),
      }
    },
    plugins: [
      isProductionBuild && licenseReporter({
        outputDir: "./output/licenses",
        outputOssSupportList: true,
        includePackageCount: false,
        includeQuattroLicenses: ['ios', 'android']
      }),
      react(),
      {
        name: 'inject-script',
        transformIndexHtml(html) {
          // ネイティブの WebView 上で表示できるように html の内容を修正する
          if (command === 'build') {
            // head タグ内のスクリプトは不要なので、削除する
            html = html.replace(/\n?\s*<script[^>]*><\/script>\s*\n?/g, '');

            html = html.replace(
              '</head>',
              '<script src="./assets/native.js"></script>\n<script src="./assets/rcp_log.js"></script></head>')

            // body タグ内にスクリプトを挿入
            html = html.replace('</body>', `<script type="module" src="./assets/bundle.js"></script>\n</body>`);

            // crossorigin 属性を削除
            html = html.replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
          }
          return html;
        },
      },
    ],
    build: {
      // iOS 14, Android 10.0 を最小対応バージョンとすることを想定
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      // Android の場合、soucemap を別ファイルで出力すると Chrome の DevTools で読み込んでくれないので、inline 化する
      sourcemap: isDebugBuild ? "inline" : false,
      // iOS 15.4 だと、minify を無効化しないと、Safari の Web インスペクタ機能で正しい位置にブレークポイントが止まってくれなかった
      minify: isDebugBuild ? false : true,
      rolldownOptions: {
        output: {
          entryFileNames: 'assets/bundle.js', // エントリーファイル名を固定

          // すべてのアセットファイルを dist/assets に配置
          assetFileNames: assetInfo => {

            // assetInfo.names[0] からファイル名を取得（拡張子込み）
            const fileName = assetInfo.names[0];
            const extType = fileName.split('.').pop(); // 拡張子を取得

            // フォントファイルは font フォルダに格納
            if (['woff', 'woff2', 'ttf', 'eot'].includes(extType || '')) {
              return `assets/font/[name].[ext]`; // フォントファイルのみ assets/font フォルダに配置
            }

            // その他のアセットは dist/assets に格納
            return `assets/[name].[ext]`;
          },
        },
      },
    },
    server: {
      port: 3000, // 任意のポート番号に変更
      allowedHosts: true,
    },
    preview: {
      port: 3000, // 任意のポート番号に変更
    },
  }
});
