import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../stores/store';
import { AppLanguage } from '../stores/preference/preferenceSlice';
import i18n from '../functions/multilingual/i18n';

/**
 * アプリの言語設定を監視し、変更があった場合に i18n の言語を切り替える
 * @todo React Hook へのリファクタリング検討
 */
export const LanguageSwitcher = () => {
  const currentLanguage = useSelector<RootState, AppLanguage>(
    (state) => state.preference.language
  ); // 言語の現在の状態を取得

  useEffect(() => {
    switch (currentLanguage) {
      case AppLanguage.En:
        i18n.changeLanguage('en');
        break;
      case AppLanguage.Jp:
        i18n.changeLanguage('ja');
        break;
      default:
        break;
    }
  }, [currentLanguage]);

  return null;
};
