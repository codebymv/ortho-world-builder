import type { Direction8 } from '@/game/runtime/PlayerSimulationSystem';

export function getDirection8FromVector(mx: number, my: number): Direction8 {
  if (mx === 0 && my > 0) return 'up';
  if (mx === 0 && my < 0) return 'down';
  if (mx < 0 && my === 0) return 'left';
  if (mx > 0 && my === 0) return 'right';
  if (mx < 0 && my > 0) return 'up_left';
  if (mx > 0 && my > 0) return 'up_right';
  if (mx < 0 && my < 0) return 'down_left';
  if (mx > 0 && my < 0) return 'down_right';
  return 'down';
}

export function direction8ToCardinal(d: Direction8): 'up' | 'down' | 'left' | 'right' {
  if (d === 'up' || d === 'up_left' || d === 'up_right') return 'up';
  if (d === 'left' || d === 'down_left') return 'left';
  if (d === 'right' || d === 'down_right') return 'right';
  return 'down';
}
