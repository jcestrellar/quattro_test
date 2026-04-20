import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Vite 公式による、React 環境デフォルトの設定を使用する。
export default tseslint.config(
  // ESLint の検査対象除外リスト
  {
    ignores: [
      "dist",
      "build",
      "**/labs/**"
    ]
  },
  {
    // 使用する設定ファイルや推奨ルールをリスト化
    extends: [
      // JavaScript の ESLint 推奨設定を適用
      // ルールの詳細: https://eslint.org/docs/latest/rules/
      js.configs.recommended,

      // TypeScript の ESLint 推奨設定を適用
      // ルールの詳細: https://typescript-eslint.io/rules/
      ...tseslint.configs.recommended,
    ],

    // 対象とするファイルを指定
    files: ["**/*.{ts,tsx}"],

    // 使用する ECMAScript のバージョンやグローバル変数の設定
    languageOptions: {
      // ECMAScript 2020 (ES11) の構文をサポート
      // Vite のデフォルト値とする.
      ecmaVersion: 2020,

      // ブラウザ環境で使用されるグローバル変数（window, document など）を許可
      globals: globals.browser,
    },

    // 使用するプラグインを設定
    plugins: {
      // React Hooks に関する ESLint プラグインを使用
      // ルールの詳細: https://www.npmjs.com/package/eslint-plugin-react-hooks
      "react-hooks": reactHooks,

      // React Fast Refresh の ESLint プラグインを使用
      // ルールの詳細: https://www.npmjs.com/package/eslint-plugin-react-refresh
      "react-refresh": reactRefresh,
    },

    // 各ルールの設定
    rules: {
      // React Hooks に関する推奨ルールを適用
      ...reactHooks.configs.recommended.rules,

      // React Refresh のルールを設定
      // コンポーネントをエクスポートすることを強制する
      "react-refresh/only-export-components": [
        "warn", // 警告として表示
        { allowConstantExport: true }, // 定数エクスポートには警告を表示しない
      ],

      // 未使用変数は警告とする.
      // ただし、引数の prefix にンダースコアを設定した場合は無視する.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_" }
      ]
    },
  },
);
