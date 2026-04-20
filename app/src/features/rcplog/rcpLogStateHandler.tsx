import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Quattro } from '../../functions/quattro/quattro';
import { RcpLogServiceName } from '../../functions/quattro/quattroRcpLog/rcpLogTypes';
import { StageUrls } from '../../functions/webApi/webApi';
import { RootState } from '../../stores/store';

/**
 * RCPLog インスタンスの状態を扱う
 * @todo React Hook へのリファクタリング検討
 */
export const RCPLogStateHandler = () => {
  const optin = useSelector<RootState, boolean>(
    (state) => state.preference.optin
  );

  useEffect(() => {
    const url = `${StageUrls.rcpSvcEndpoint}/log/${RcpLogServiceName}`;
    Quattro.rcpLog.initialize(url, false);
  }, []);

  useEffect(() => {
    if (optin) {
      Quattro.rcpLog.optin();
    } else {
      Quattro.rcpLog.optout();
    }
  }, [optin]);

  return null;
};
