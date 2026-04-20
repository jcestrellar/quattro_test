import { useEffect, useState } from 'react';

type SystemColorScheme = 'light' | 'dark';

/**
 * OSのカラースキーム(prefers-color-scheme)を監視するカスタムフック
 *
 * OSのライトモード／ダークモードの設定をリアルタイムに取得し、
 * 変更があればstateを更新する。
 *
 * @returns {SystemColorScheme} 現在のカラースキーム ('light' | 'dark')
 */
export const useSystemColorScheme = (): SystemColorScheme => {
  // 現在のカラースキームを取得
  const getScheme = (): SystemColorScheme =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const [scheme, setScheme] = useState<SystemColorScheme>(getScheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      setScheme(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return scheme;
};
