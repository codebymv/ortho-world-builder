import { useEffect } from 'react';

export function useGameRuntime(setupRuntime: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(setupRuntime, []);
}
