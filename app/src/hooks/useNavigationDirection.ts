import { useEffect, useRef, useState } from 'react';

// ページ遷移方向を表す enum
export enum NavigationDirection {
  Forward = 'forward',
  Backward = 'backward',
}

/**
 * 現在の location.key を元にページ遷移の方向を判定するフック
 * - 新しい location.key が来た場合は NavigationDirection.Forward（進む）と判定
 * - 以前に遡る location.key が来た場合は NavigationDirection.Backward（戻る）と判定
 *
 * @param locationKey React Router の location.key
 * @returns NavigationDirection 遷移方向
 */
export function useNavigationDirection(
  locationKey: string
): NavigationDirection {
  const [direction, setDirection] = useState<NavigationDirection>(
    NavigationDirection.Forward
  );
  const historyStack = useRef<string[]>([]);

  useEffect(() => {
    const stack = historyStack.current;
    const prevIndex = stack.indexOf(locationKey);

    if (prevIndex === -1) {
      stack.push(locationKey);
      // TODO:
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirection(NavigationDirection.Forward);
    } else {
      stack.splice(prevIndex + 1);
      setDirection(NavigationDirection.Backward);
    }
  }, [locationKey]);

  return direction;
}
