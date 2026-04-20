import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { Quattro } from '../../functions/quattro/quattro';
import { RootState } from '../../stores/store';

/**
 * 現在の画面の情報を監視し、画面が遷移した直後に RCPLog へ post する
 * @todo React Hook へのリファクタリング検討
 */
export const RCPLogPageTransitionMonitor = () => {
  const optin = useSelector<RootState, boolean>(
    (state) => state.preference.optin
  );

  const location = useLocation();

  useEffect(() => {
    if (optin) {
      Quattro.rcpLog.post('pageTransition', {
        pageName: location.pathname.replace('/', ''),
      });
    }
  }, [location, optin]);

  return null;
};
