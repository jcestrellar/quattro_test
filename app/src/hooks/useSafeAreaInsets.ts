import { useLayoutEffect, useState } from 'react';

/**
 * Appleデバイスのセーフエリアインセット（画面の余白）を取得するカスタムフック
 *
 * このフックは、Appleデバイスにおけるセーフエリアのトップ、ボトム、左、右のインセットを取得し、画面サイズが変更されるたびに更新する。
 * セーフエリアインセットは、`--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right` CSSカスタムプロパティから取得する。
 *
 * @returns セーフエリアのインセットを表すオブジェクト
 *  - `top`: セーフエリアの上端の距離
 *  - `bottom`: セーフエリアの下端の距離
 *  - `left`: セーフエリアの左端の距離
 *  - `right`: セーフエリアの右端の距離
 */
export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useLayoutEffect(() => {
    const updateSafeArea = () => {
      const top =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--safe-top'
          )
        ) || 0;
      const bottom =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--safe-bottom'
          )
        ) || 0;
      const left =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--safe-left'
          )
        ) || 0;
      const right =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--safe-right'
          )
        ) || 0;

      // 現在の値と比較し、異なる場合のみ更新
      setInsets((prevInsets) => {
        if (
          prevInsets.top !== top ||
          prevInsets.bottom !== bottom ||
          prevInsets.left !== left ||
          prevInsets.right !== right
        ) {
          return { top, bottom, left, right };
        }
        return prevInsets;
      });
    };

    updateSafeArea(); // 初回実行

    window.addEventListener('resize', updateSafeArea); // リサイズ時に更新
    return () => window.removeEventListener('resize', updateSafeArea); // クリーンアップ
  }, []);

  return insets;
};
