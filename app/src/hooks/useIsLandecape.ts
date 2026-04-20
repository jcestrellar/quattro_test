import { useMediaQuery } from '@mui/material';
import { SystemDevice } from '../functions/systemDevice';
import { useEffect, useState } from 'react';

/**
 * 画面が横向き（ランドスケープ）かどうかを判定するカスタムフック
 *
 * @returns {boolean} 横向きの場合は true, 縦向きの場合は false
 */
export const useIsLandscape = () => {
  const [isLandscape, setIsLandscape] = useState(false);
  const mediaQuery = useMediaQuery('(orientation: landscape)');

  useEffect(() => {
    if (!SystemDevice.isRunningOnQuattro) {
      // デバッグ用:
      //   Quattro 以外の場合は、window.innerWidth と window.innerHeight を使って手動で判定
      const handleResize = () => {
        setIsLandscape(window.innerWidth > window.innerHeight);
      };
      handleResize();

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  useEffect(() => {
    setIsLandscape(mediaQuery);
  }, [mediaQuery]);

  return isLandscape;
};
