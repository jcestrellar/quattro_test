import { useLayoutEffect, useState } from 'react';
import { useSafeAreaInsets } from './useSafeAreaInsets';

/**
 * MUI の AppBar の高さを取得するカスタムフック
 *
 * このフックは、AppBar の高さを取得し、ウィンドウのリサイズ時に高さを更新する。
 *
 * @returns {number} 現在の AppBar の高さ[px]
 */
export const useAppBarHeight = () => {
  const [appbarHeight, setAppbarHeight] = useState(0);
  const insets = useSafeAreaInsets();

  // 現在の AppBar の高さを取得し、状態を更新する
  function updateHeight() {
    const appBar = document.querySelector('header.MuiAppBar-root');
    setAppbarHeight(appBar?.clientHeight || 0);
  }

  /**
   * iOS (15.4) にて、
   * React Router を使用した画面遷移直後に SafeArea を考慮した高さが取得できなかったため、
   * SafeArea の領域が変化したら更新する.
   */
  useLayoutEffect(() => {
    /**
     * AppBar の高さは DOM レイアウト確定後の値を参照する必要があり、
     * 初回および SafeArea 変化時に同期的に DOM を読み取って state を更新する必要がある。
     * このパターンは useLayoutEffect の正当な用途のため、
     * "set-state-in-effect" ルールを意図的に無効化する。
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateHeight();
  }, [insets]);

  /**
   * iOS (15.4) にて、
   * useEffect だと初回起動時のみ appBar の clientHeight が 0 になってしまうため、
   * useLayoutEffect を採用した。
   */
  useLayoutEffect(() => {
    /**
     * iOS Safari 環境では useEffect だと初回の clientHeight が 0 になるため、
     * レイアウト後に同期的に高さを計測する必要がある。
     * DOM レイアウト依存ロジックのため、useLayoutEffect + state 更新は意図したもの。
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateHeight(); // 初回実行

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return appbarHeight;
};
