import { useEffect, useState } from 'react';

/**
 * OS の「視差効果を減らす」などの設定に応じて、
 * アニメーションを控えるべきかどうかを判定する Hook。
 *
 * - macOS: システム設定 > アクセシビリティ > ディスプレイ > 動きを減らす
 * - Windows: 設定 > アクセシビリティ > 視覚効果 > アニメーションを表示する
 * - iOS/Android: OS の視覚効果設定
 */
export function useSystemReducedMotion(): boolean {
  const getPreference = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(getPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
