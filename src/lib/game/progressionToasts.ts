import { notify } from '@/lib/game/notificationBus';
import type { Quest } from '@/lib/game/GameState';

/** UTF-8 checkmark used across the codebase to mark completed quest objectives. */
export const CHECKMARK = '\u2713';

/**
 * Mark a quest objective as completed and emit a single short notification.
 *
 * Callers pass the *human-readable* objective label without the trailing
 * checkmark; this helper appends it. The notification is deduplicated per
 * `(questId, index)` so re-entering a trigger area does not re-spam.
 *
 * `silent: true` should be used when a quest-complete toast will fire on the
 * same frame — the step toast would otherwise be redundant.
 */
export function markObjectiveDone(
  quest: Quest,
  index: number,
  label: string,
  options: { silent?: boolean } = {},
) {
  const current = quest.objectives[index];
  const alreadyDone = typeof current === 'string' && current.includes(CHECKMARK);
  quest.objectives[index] = `${label} ${CHECKMARK}`;
  if (alreadyDone || options.silent) return;

  notify('Objective Complete', {
    id: `quest-step-${quest.id}-${index}`,
    type: 'info',
    description: label,
    duration: 3500,
  });
}
