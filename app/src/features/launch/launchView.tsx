import {
  Box,
  Dialog,
  DialogContent,
  LinearProgress,
  Stack,
  Typography,
  lighten,
  useTheme,
} from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  InitializeState,
  initializeApp,
} from '../../stores/appSystem/appSystemSlice';
import { AppDispatch, RootState } from '../../stores/store';

export const LaunchView = ({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();

  /// 初期化作業の進捗率を 0〜100 で表す
  const initializeState = useSelector<RootState, InitializeState>(
    (state) => state.appSystem.initializeState
  );
  const { t } = useTranslation();

  const progressValue = (() => {
    switch (initializeState) {
      case InitializeState.Idle:
        return 0;
      case InitializeState.ProcessA:
        return 10;
      case InitializeState.ProcessB:
        return 30;
      case InitializeState.ProcessC:
        return 70;
      case InitializeState.Completed:
        return 100;
      case InitializeState.Error:
        return 0; // エラーの場合は進捗をリセットする
    }
  })();

  const progressText = (() => {
    switch (initializeState) {
      case InitializeState.Idle:
        return '\u00A0';
      case InitializeState.ProcessA:
        return `${t('Processing A')}...`;
      case InitializeState.ProcessB:
        return `${t('Processing B')}...`;
      case InitializeState.ProcessC:
        return `${t('Processing C')}...`;
      case InitializeState.Completed:
        return '\u00A0';
      case InitializeState.Error:
        return t('Initialization Failed');
    }
  })();

  useEffect(() => {
    if (opened) {
      dispatch(initializeApp());
    }
  }, [dispatch, opened]);

  useEffect(() => {
    switch (initializeState) {
      case InitializeState.Completed: {
        setTimeout(() => {
          onClose();
        }, 300);
        break;
      }
      case InitializeState.Error: {
        // 初期化失敗時に実行する処理を記述する
        // ...
      }
    }
  }, [initializeState, onClose, t]);

  return (
    <Dialog
      fullScreen
      open={opened}
      transitionDuration={{ enter: 0, exit: 1000 }}
    >
      <DialogContent sx={{ p: 0, m: 0 }}>
        <Stack
          width='100vw'
          height='100vh'
          justifyContent='center'
          alignItems='center'
          gap={6}
        >
          <img src={'./assets/roland_logo.png'} width={160} alt='' />

          <Stack width={1} justifyContent={'center'} alignItems={'center'}>
            <Typography>{progressText}</Typography>
            <Box width={0.7}>
              <LinearProgress
                variant='determinate'
                value={progressValue}
                sx={{
                  border: 1,
                  borderColor: lighten(theme.palette.primary.main, 0.5),
                  height: 10,
                  borderRadius: 5, // 外側の角を丸くする
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5, // 内側の進捗バーの角を丸くする
                  },
                }}
              />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
