import {
  Button,
  ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
} from '@mui/material';
import React from 'react';
import { CSSProperties } from 'react';

export type DialogButtonConfig = Omit<ButtonProps, 'onClick'> & {
  title: string;
  onClick?: () => void;
};

interface CustomDialogProps {
  // ダイアログの開閉状態を制御
  opened: boolean;

  // ダイアログのタイトルとして表示されるテキスト
  titleText: React.ReactNode;

  // ダイアログの本文として表示される内容。React 要素を渡すことが可能
  content: React.ReactNode;

  // MUI Dialog本体に渡すProps
  slotProps?: {
    dialog?: Partial<DialogProps>;
  };

  // ボタンの配置（デフォルトは右寄せ）
  actionsAlignment?: CSSProperties['justifyContent'];

  // ポジティブボタンの設定
  positiveButton?: DialogButtonConfig;

  // ネガティブボタンの設定
  negativeButton?: DialogButtonConfig;

  // ダイアログの外側をクリックしたり、閉じるボタンを押したりしたときに実行される関数
  onClose?: () => void;
}

/**
 * カスタマイズ可能なダイアログコンポーネント
 * ボタンごとに色やボタンタイプ(contained等)を個別に指定可能
 * ボタンの並び順や配置(中央寄せ等)を調整可能
 */
export const CustomDialog = ({
  opened,
  titleText,
  content,
  slotProps,
  actionsAlignment = 'flex-end',
  positiveButton,
  negativeButton,
  onClose,
}: CustomDialogProps) => {
  return (
    <Dialog open={opened} onClose={() => onClose?.()} {...slotProps?.dialog}>
      <DialogTitle>{titleText}</DialogTitle>
      <DialogContent>{content}</DialogContent>

      {(negativeButton || positiveButton) && (
        <DialogActions sx={{ justifyContent: actionsAlignment, pb: 12 }}>
          {negativeButton && (
            <Button
              onClick={negativeButton.onClick}
              // 指定がなければテキストボタン
              variant={negativeButton.variant || 'text'}
              {...negativeButton}
            >
              {negativeButton.title}
            </Button>
          )}

          {positiveButton && (
            <Button
              onClick={positiveButton.onClick}
              // 指定がなければテキストボタン
              variant={positiveButton.variant || 'text'}
              {...positiveButton}
            >
              {positiveButton.title}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};
