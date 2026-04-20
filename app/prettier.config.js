/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */

// 一般的によく使用される項目のみ列挙する。
// その他のオプションについては、以下を参照する。
// https://prettier.io/docs/options
const config = {
  // 配列やオブジェクトの最後の要素にコンマを追加するかどうか
  // "es5" は、ES5以降の構文でサポートされている場合のみ、末尾にコンマを追加
  trailingComma: "es5",

  // 1行の最大文字数
  // Prettier は 80 文字を推奨している
  // @see https://prettier.io/docs/options/#print-width
  printWidth: 80,

  // インデントにタブを使用するかスペースを使用するかどうか
  useTabs: false,

  // インデントを何スペース分使うか
  tabWidth: 2,

  // ステートメントの後にセミコロンを付けるかどうか
  semi: true,

  // 文字列をシングルクォートで囲むかどうか
  singleQuote: true,

  // JSX ではシングルクォートで囲むかどうか
  jsxSingleQuote: true,

  // 行末の改行コード
  endOfLine: "lf"
};

export default config;