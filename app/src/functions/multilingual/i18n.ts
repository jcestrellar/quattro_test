import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import ja from './locales/ja/common.json';
import enError from './locales/en/error.json';
import jaError from './locales/ja/error.json';

const resources = {
  en: { common: en, error: enError },
  ja: { common: ja, error: jaError },
} as const;

// i18n の初期化
i18n.use(initReactI18next).init({
  // 翻訳リソースを指定
  resources,

  // 使用する名前空間を指定
  ns: ['common', 'error'],

  // 空文字列を翻訳結果として返さないように設定
  returnEmptyString: false,

  // デフォルトの名前空間を指定
  defaultNS: 'common',

  // 初期表示言語を日本語に設定
  lng: 'ja',

  // 翻訳が見つからない場合にフォールバックする言語を英語に設定
  fallbackLng: 'en',

  // 出力時のエスケープ処理を無効化（React の XSS 対策を利用）
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
