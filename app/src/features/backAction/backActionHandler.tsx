import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Quattro } from '../../functions/quattro/quattro';
import { RouteMap } from '../../routes';

/**
 * Android のバックボタンを処理するハンドラ
 * @todo React Hook へのリファクタリング検討
 */
export const BackActionHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribeEventCommand = Quattro.app.onEventCommand((param1) => {
      if (param1 === 'exit') {
        if (location.pathname !== RouteMap.home.path) {
          navigate(-1);
        }
      }
    });

    return () => {
      unsubscribeEventCommand();
    };
  }, [navigate, location]);

  return undefined;
};
