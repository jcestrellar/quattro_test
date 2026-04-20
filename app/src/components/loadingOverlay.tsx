import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
interface Props {
  open: boolean;
  message?: string;
  subMessage?: string;
}

/**
 * 画面全体、または特定の親要素を覆うローディングオーバーレイコンポーネント
 *
 * * 背景を暗くし（Backdrop）、中央にインジケーターとテキストを表示します
 */
export const LoadingOverlay = ({ open, message, subMessage }: Props) => {
  const { t } = useTranslation();
  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
      }}
    >
      <Stack alignItems='center' spacing={24}>
        <CircularProgress color='inherit' size={60} />
        <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
          {message ?? t('Connecting')}
        </Typography>
        {subMessage && (
          <Typography variant='body2' sx={{ opacity: 0.8 }}>
            {subMessage}
          </Typography>
        )}
      </Stack>
    </Backdrop>
  );
};
