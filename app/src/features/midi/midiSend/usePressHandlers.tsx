import { useRef } from 'react';
import { SystemDevice } from '../../../functions/systemDevice';

/**
 * 押下開始・終了を検知するカスタムフック。
 *
 * 【目的、背景】
 * - pointer イベントは OS によって挙動が異なるため使用せず、デバイス種別に応じて touch / mouse イベントを使い分け。
 * - マウス操作時に押下中にカーソルが外れた場合も検知するため、`onMouseLeave` を追加。
 *
 * @param onPressStart 押下開始時の処理
 * @param onPressEnd 押下終了時の処理
 * @returns イベントハンドラーオブジェクト
 */
export function usePressHandlers({
  onPressStart,
  onPressEnd,
}: {
  onPressStart?: () => void;
  onPressEnd?: () => void;
}) {
  const isPressedRef = useRef(false);

  const handlers: {
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    onTouchStart?: () => void;
    onTouchEnd?: () => void;
  } = {};

  if (SystemDevice.isMobile) {
    handlers.onTouchStart = () => {
      onPressStart?.();
    };
    handlers.onTouchEnd = () => {
      onPressEnd?.();
    };
  } else {
    handlers.onMouseDown = () => {
      isPressedRef.current = true;
      onPressStart?.();
    };
    handlers.onMouseUp = () => {
      if (isPressedRef.current) {
        isPressedRef.current = false;
        onPressEnd?.();
      }
    };
    handlers.onMouseLeave = () => {
      if (isPressedRef.current) {
        isPressedRef.current = false;
        onPressEnd?.();
      }
    };
  }

  return handlers;
}
