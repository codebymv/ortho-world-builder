export interface GameBootProgressSnapshot {
  /** Target fill 0–100; the overlay eases toward this so the bar never jumps backward. */
  target: number;
  label: string;
}

type BootProgressListener = (snapshot: GameBootProgressSnapshot) => void;

let target = 0;
let label = 'Kindling the bonfire...';
const listeners = new Set<BootProgressListener>();

function notify() {
  const snapshot: GameBootProgressSnapshot = { target, label };
  for (const listener of listeners) listener(snapshot);
}

/** Reset at the start of a menu → game transition. */
export function resetGameBootProgress(initialLabel: string) {
  target = 8;
  label = initialLabel;
  notify();
}

/** Monotonic target updates only — later milestones never regress the bar. */
export function setGameBootProgress(nextTarget: number, nextLabel?: string) {
  target = Math.max(target, Math.min(100, nextTarget));
  if (nextLabel) label = nextLabel;
  notify();
}

export function getGameBootProgressSnapshot(): GameBootProgressSnapshot {
  return { target, label };
}

export function subscribeGameBootProgress(listener: BootProgressListener): () => void {
  listeners.add(listener);
  listener({ target, label });
  return () => listeners.delete(listener);
}
