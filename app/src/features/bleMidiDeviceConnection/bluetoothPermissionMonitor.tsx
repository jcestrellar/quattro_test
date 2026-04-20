import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomDialog } from '../../components/customDialog';
import { Quattro } from '../../functions/quattro/quattro';
import { OsType, SystemDevice } from '../../functions/systemDevice';

export const BluetoothPermissionMonitor = () => {
  const [permissionDialogOpened, setPermissionDialogOpened] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Bluetooth 接続関連のパーミッションが許可されていない場合、アラートを表示して変更を促す
    const unsubscribeEventUnauthorized = Quattro.ble.onEventUnauthorized(() => {
      setPermissionDialogOpened(true);
    });

    return () => unsubscribeEventUnauthorized();
  }, []);

  // OS に応じて適切な権限名を設定
  const [titleText, contentText] = (() => {
    let permission = 'Unknown';
    switch (SystemDevice.os) {
      case OsType.Android:
        permission = t('Location');
        break;
      case OsType.iOS:
        permission = t('Bluetooth');
        break;
      default:
        break;
    }

    // 許可がない場合のタイトルとコンテンツを多言語対応で取得
    const title = t('Access to {{permission}} is not allowed', {
      permission: permission,
    });
    const content = t(
      'To connect to the device, please allow access to {{permission}}. You can change the permission from the settings screen',
      { permission: permission }
    );

    return [title, content];
  })();

  return (
    <CustomDialog
      opened={permissionDialogOpened}
      titleText={titleText}
      content={contentText}
      actionsAlignment='space-around'
      slotProps={{ dialog: { fullWidth: true, maxWidth: 'xs' } }}
      negativeButton={{
        title: t('Close'),
        variant: 'outlined',
        onClick: () => setPermissionDialogOpened(false),
        sx: { width: '40%' },
      }}
      positiveButton={{
        title: t('Open Settings'),
        variant: 'contained',
        onClick: () => {
          setPermissionDialogOpened(false);

          // OS の設定画面を開く
          Quattro.fs.exec('app-settings:');
        },
        sx: { width: '40%' },
      }}
    />
  );
};
