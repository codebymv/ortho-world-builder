import { useEffect } from 'react';

export function useGameRuntime(setupRuntime: () => void | (() => void)) {
  useEffect(setupRuntime, []);
}
