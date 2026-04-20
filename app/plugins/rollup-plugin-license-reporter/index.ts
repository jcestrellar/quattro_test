/* eslint-disable @typescript-eslint/no-explicit-any */
// このファイルでは、package.json の構造が柔軟であり、カスタムプロパティが追加される可能性があるため、
// 型を厳密に定義することが困難です。そのため、汎用的な型として any を使用しています。
// 必要に応じて型を拡張できるようにするための措置です。

import * as fs from 'fs';
import * as path from 'path';
import { Plugin } from 'vite';

// パッケージの依存関係の型
type Dependencies = Record<string, string>;

// AuthorやContributor情報の型
interface Person {
  name: string;
  email?: string;
  url?: string;
}

// package.jsonの型
interface PackageJson {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  bugs?: { url: string; email?: string; };
  license?: string;
  author?: string | Person;
  contributors?: (string | Person)[];
  funding?: string | { type: string; url: string; } | (string | { type: string; url: string; })[];
  main?: string;
  module?: string;
  exports?: Record<string, any>;
  files?: string[];
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
  optionalDependencies?: Dependencies;
  bundledDependencies?: string[];
  engines?: Record<string, string>;
  os?: string[];
  cpu?: string[];
  private?: boolean;
  publishConfig?: Record<string, any>;
  workspaces?: string[];
  type?: 'module' | 'commonjs';
  // その他、カスタムプロパティを許可
  [key: string]: any;
}

// 拡張したパッケージ情報の型
interface LicensePackageInfo {
  packageJson: PackageJson;
  licenseText: string | null;
}

interface LicenseReporterOptions {
  /**
   * ファイルの出力先を指定する
   * デフォルトは outputOptions.dir または 'dist'
   */
  outputDir?: string;

  /**
   * OSS対応リストを出力するかどうか
   */
  outputOssSupportList?: boolean;

  /**
   * ファイルの先頭に、含まれる OSS の数を記載するかどうか
   */
  includePackageCount?: boolean;

  /**
   * Quattro に含まれるライセンス情報を追加する.
   * - 未指定、'none' なら追加しない
   * - 'ios' なら iOS 向けのライセンス情報を追加する
   * - 'android' なら Android 向けのライセンス情報を追加する
   * - 'windows' なら Windows 向けのライセンス情報を追加する（未実装）
   * - 'mac' なら Mac 向けのライセンス情報を追加する
   * 
   * 複数指定することも可能.
   * - 指定例：
   *   - includeQuattroLicenses: 'ios'
   *   - includeQuattroLicenses: ['ios', 'android']
   */
  includeQuattroLicenses?: 'none' | 'ios' | 'android' | 'windows' | 'mac' | Array<'ios' | 'android' | 'windows' | 'mac'>;
}

//引数にlicenseReporterOptionsを指定する
function licenseReporter(option: LicenseReporterOptions = {
  outputOssSupportList: false,
  includePackageCount: false,
}): Plugin {
  // `packageJson`と`licenseText`を保持する新しい型でMapを定義
  const modules = new Map<string, LicensePackageInfo>();

  /**
   * @description 一般的なライセンスファイル名を探索し、パスを返す
   * @param packagePath - 検索対象のパッケージディレクトリパス
   * @returns ライセンスファイルのパス、見つからない場合はnull
   */
  const findLicenseFile = (packagePath: string): string | null => {
    const licenseFiles = [
      'LICENSE', 'LICENSE.md', 'LICENSE.txt',
      'license', 'license.md', 'license.txt',
      'UNLICENSE', 'UNLICENSE.md', 'UNLICENSE.txt',
    ];
    for (const file of licenseFiles) {
      const filePath = path.join(packagePath, file);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  };

  return {
    name: 'licenseReporter',
    enforce: 'pre',
    /**
     * @description ビルドプロセスが完了した後に実行されるフック
     * ここで、バンドルに含まれる全てのモジュールをスキャンし、ライセンス情報を収集する
     */
    buildEnd() {
      // Step 1: バンドルに含まれる全てのモジュールのIDを走査
      // `this.getModuleIds()`は、ツリーシェイキングで残ったすべてのモジュールのパスを返す
      for (const id of this.getModuleIds()) {
        const moduleInfo = this.getModuleInfo(id);

        // Step 2: 必要なモジュールをフィルタリング
        // - `moduleInfo?.isIncluded`: 最終的なバンドルに含められたモジュールか？
        // - `id.includes('node_modules')`: node_modules内の外部パッケージか？
        if (moduleInfo?.isIncluded && moduleInfo.id.includes(path.sep + 'node_modules' + path.sep)) {

          // Step 3: パスをクリーンアップ
          // 一部のモジュールIDは、Vite/Rollupによって先頭にヌルバイト（\x00）が付加される
          // Node.jsのファイルシステムはこれを処理できないため、取り除く
          // 例:
          //   変換前：'\x00/Users/.../node_modules/react/index.js'
          //   変換後：'/Users/.../node_modules/react/index.js'
          const cleanId = moduleInfo.id.startsWith('\x00') ? moduleInfo.id.substring(1) : moduleInfo.id;

          // Step 4: パッケージのルートディレクトリを特定する
          // `package.json`ファイルを探すことで、どのパッケージに属するかを正確に判断する
          // 例:
          //   /.../node_modules/react-router/node_modules/react-is/index.js
          //   このモジュールは、`react-is`パッケージに属する
          let currentDir = cleanId;
          let packageJsonFound = false;

          // 親ディレクトリを一つずつ遡りながら、`package.json`を探す
          // `/` (ルートディレクトリ)に到達するか、node_modulesの階層を抜けるまで続ける
          while (currentDir.includes(path.sep + 'node_modules' + path.sep) && path.dirname(currentDir) !== currentDir) {
            const packageJsonPath = path.join(currentDir, 'package.json');

            // Step 5: `package.json`の存在と内容を検証
            // `fs.existsSync`でファイルが存在するか確認
            if (fs.existsSync(packageJsonPath)) {
              try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

                // パッケージ情報として必須のプロパティ（name, version）が存在するか確認
                if (packageJson && packageJson.name && packageJson.version) {
                  // バージョンが異なる場合はそれぞれ認識したいので、
                  // 「パッケージ名@バージョン」をキーとしてMapに追加
                  const key = `${packageJson.name}@${packageJson.version}`;
                  if (!modules.has(key)) {
                    // ライセンスファイルの内容を読み込む
                    const licenseFilePath = findLicenseFile(currentDir);
                    const licenseText = licenseFilePath ? fs.readFileSync(licenseFilePath, 'utf-8') : null;

                    // 新しい型`LicensePackageInfo`のオブジェクトとしてMapに保存
                    modules.set(key, { packageJson, licenseText });
                  }
                  packageJsonFound = true;
                  break;
                }
              } catch (err) {
                // JSONパースエラーなど、読み込みに失敗した場合のログ
                console.error(`❌ Failed to read package.json at ${packageJsonPath}: ${err}`);
              }
            }
            // `package.json`が見つからなかった場合、親ディレクトリに移動して再試行
            currentDir = path.dirname(currentDir);
          }

          // どのモジュールもpackage.jsonを見つけられなかった場合の警告
          if (!packageJsonFound) {
            console.error(`❌ Could not find a valid package.json for module: ${cleanId}`);
          }
        }
      }
    },

    /**
     * @description 最終的なバンドルが生成される直前に実行されるフック
     * ここで、`buildEnd`で収集したパッケージ情報をもとに、ライセンスレポートファイルを作成する
     */
    generateBundle(outputOptions) {
      // 警告を格納する配列を初期化
      const warnings: string[] = [];
      const warningsWithoutLicenseFile: string[] = [];

      // Step 1: デフォルトのレポート内容を生成
      const outputLines: string[] = [];


      if (option.includePackageCount) {
        const packageCount = modules.size;
        outputLines.push(`Total Bundled Packages: ${packageCount}`);
        outputLines.push('');
      }

      // Step 2: パッケージ情報をソート
      const sortedPackages = Array.from(modules.values()).sort((a, b) => {
        const nameCompare = a.packageJson.name.localeCompare(b.packageJson.name);
        if (nameCompare !== 0) {
          return nameCompare;
        }
        return a.packageJson.version.localeCompare(b.packageJson.version);
      });

      // Step 3: 各パッケージの情報をフォーマットして追加
      for (const pkgInfo of sortedPackages) {
        // 各パッケージを「---」で区切る
        outputLines.push('---');
        outputLines.push(`Name: ${pkgInfo.packageJson.name}`);
        outputLines.push(`Version: ${pkgInfo.packageJson.version || ''}`);
        outputLines.push(`License: ${pkgInfo.packageJson.license || 'N/A'}`);

        // Repository と Homepage は存在すれば出力
        const repositoryUrl = typeof pkgInfo.packageJson.repository === 'object' && pkgInfo.packageJson.repository !== null
          ? pkgInfo.packageJson.repository.url
          : pkgInfo.packageJson.repository;
        if (repositoryUrl) {
          outputLines.push(`Repository: ${repositoryUrl}`);
        }
        if (pkgInfo.packageJson.homepage) {
          outputLines.push(`Homepage: ${pkgInfo.packageJson.homepage}`);
        }

        // ライセンス文を出力
        outputLines.push(`License Copyright:`);
        outputLines.push(`===`);
        outputLines.push(pkgInfo.licenseText || 'License file not found.');
        outputLines.push('');

        // package.jsonに`license`プロパティがない場合、警告に追加
        if (!pkgInfo.packageJson.license) {
          warnings.push(`${pkgInfo.packageJson.name}@${pkgInfo.packageJson.version}`);
        }
        // ライセンス文が見つからなかった場合、警告に追加
        if (!pkgInfo.licenseText) {
          warningsWithoutLicenseFile.push(`${pkgInfo.packageJson.name}@${pkgInfo.packageJson.version}`);
        }
      }

      // Step 4: Quattro のライセンス情報を追加する
      interface QuattroOssInfo {
        name: string;
        version: string;
        license: string;
        licenseText: string;
        source: 'quattro_ios' | 'quattro_android' | 'quattro_windows' | 'quattro_mac';
      }
      const quattroOssList: QuattroOssInfo[] = [];

      // iOS 向けの場合
      if (option.includeQuattroLicenses === 'ios' ||
        (Array.isArray(option.includeQuattroLicenses) && option.includeQuattroLicenses.includes('ios'))) {
        // iOS 向けの場合、Quattro は ZipArchive を含める
        // Zip Archive のライセンス分は vite.config.ts をカレントとした場合、../quattro2/contributed/ZipArchive/AUTHORS.txt にある
        // Name は "Zip Archive", Version は "1.2", License は "MIT", License 文は AUTHORS.txt の内容
        const zipArchiveAuthorsPath = path.resolve(__dirname, '../../../quattro2/contributed/ZipArchive/AUTHORS.txt');
        let authorsText = '';
        try {
          authorsText = fs.readFileSync(zipArchiveAuthorsPath, 'utf-8');
        } catch (err) {
          authorsText = 'Failed to read AUTHORS.txt for Zip Archive.';
          console.error(`❌ Failed to read AUTHORS.txt at ${zipArchiveAuthorsPath}: ${err}`);
        }
        quattroOssList.push({
          name: 'Zip Archive',
          version: '1.2',
          license: 'MIT',
          licenseText: authorsText,
          source: 'quattro_ios'
        });
      }

      // Android 向けの場合
      if (option.includeQuattroLicenses === 'android' ||
        (Array.isArray(option.includeQuattroLicenses) && option.includeQuattroLicenses.includes('android'))) {
        // Android 向けの場合、ライセンス表記が必要なライブラリは特にない
      }

      // Windows 向けの場合（未実装）
      if (option.includeQuattroLicenses === 'windows' ||
        (Array.isArray(option.includeQuattroLicenses) && option.includeQuattroLicenses.includes('windows'))) {
        // 未実装
        console.warn('Adding Quattro license information for Windows is not implemented yet.');
      }

      // Mac 向けの場合
      if (option.includeQuattroLicenses === 'mac' ||
        (Array.isArray(option.includeQuattroLicenses) && option.includeQuattroLicenses.includes('mac'))) {
        // Mac 向けの場合、ライセンス表記が必要なライブラリは特にない
      }

      // Quattro の OSS 情報があれば、出力に追加
      if (quattroOssList.length > 0) {
        for (const oss of quattroOssList) {
          outputLines.push('---');
          outputLines.push(`Name: ${oss.name}`);
          outputLines.push(`Version: ${oss.version}`);
          outputLines.push(`License: ${oss.license}`);
          outputLines.push(`License Copyright:`);
          outputLines.push(`===`);
          outputLines.push(oss.licenseText);
          outputLines.push('');
        }
      }

      const outputContent = outputLines.join('\n');

      // Step 5: ファイルへの書き込み
      const outputPath = path.join(option.outputDir || outputOptions.dir || 'dist', 'licenseNotices.txt');
      try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, outputContent, 'utf-8');
        console.log(`✅ License report successfully written to ${outputPath}`);
      } catch (err) {
        console.error(`❌ Failed to write license report: ${err}`);
      }

      // Step 6: 警告セクションをコンソールに出力
      // `license`プロパティがないパッケージがあれば、警告リストをコンソールに出力
      if (warnings.length > 0) {
        const warningMessage = [
          '---',
          '### [WARNING] Missing License Property',
          'The following packages do not have a "license" property in their package.json:',
          ...warnings.map(pkgName => `- ${pkgName}`),
          ''
        ].join('\n');
        this.warn(warningMessage);
      }

      // ライセンス文が見つからなかったパッケージがあれば、警告リストをコンソールに出力
      if (warningsWithoutLicenseFile.length > 0) {
        const warningMessage = [
          '---',
          '### [WARNING] Missing License File',
          'The following packages do not have a license file:',
          ...warningsWithoutLicenseFile.map(pkgName => `- ${pkgName}`),
          ''
        ].join('\n');
        this.warn(warningMessage);
      }

      // Step 7: OSS 対応リストを出力する
      // 列は、Name, Version, License, source（どこから抽出したか）, Action（どのような対応をしたか）の5列
      // source は、"node_modeules", "quattro_ios", "quattro_android", "quattro_windows", "quattro_mac" のいずれか
      // Quattro のライセンス情報も含める
      if (option.outputOssSupportList) {
        const ossLines: string[] = [];
        ossLines.push('Name,Version,License,Source,Action');
        for (const pkgInfo of sortedPackages) {
          const line = `"${pkgInfo.packageJson.name}","${pkgInfo.packageJson.version || ''}","${pkgInfo.packageJson.license || 'N/A'}","node_modules",""`;
          ossLines.push(line);
        }

        // Quattro に含まれる OSS も追加（source を利用）
        for (const oss of quattroOssList) {
          const line = `"${oss.name}","${oss.version}","${oss.license}","${oss.source}",""`;
          ossLines.push(line);
        }

        const ossContent = ossLines.join('\n');
        const ossOutputPath = path.join(option.outputDir || outputOptions.dir || 'dist', 'ossSupportList.csv');
        try {
          fs.mkdirSync(path.dirname(ossOutputPath), { recursive: true });
          fs.writeFileSync(ossOutputPath, ossContent, 'utf-8');
          console.log(`✅ OSS support list successfully written to ${ossOutputPath}`);
        } catch (err) {
          console.error(`❌ Failed to write OSS support list: ${err}`);
        }
      }
    },
  };
}

export default licenseReporter;