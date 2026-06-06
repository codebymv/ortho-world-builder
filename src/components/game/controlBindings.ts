/**
 * Single source of truth for player-facing control bindings.
 *
 * Both the in-HUD collapsible panel (`GameUI`) and the pause menu (`PauseMenu`)
 * render from this list, so a binding added here appears in both places without
 * drift. Keep order intentional: the order shown is the order the player learns
 * the controls in.
 */

export interface ControlBinding {
  /** Key label, may include separators like "/" or "←/→". */
  keys: string;
  /** Human-readable action label. */
  action: string;
  /** Optional column-spanning hint for compact grids. */
  wide?: boolean;
}

export interface ControlGroup {
  title: string;
  bindings: ControlBinding[];
}

export const CONTROL_GROUPS: ControlGroup[] = [
  {
    title: 'Movement',
    bindings: [
      { keys: 'WASD', action: 'Move' },
      { keys: 'SHIFT', action: 'Sprint' },
      { keys: 'SPACE', action: 'Dodge Roll' },
    ],
  },
  {
    title: 'Combat',
    bindings: [
      { keys: 'LMB', action: 'Attack' },
      { keys: 'HOLD LMB', action: 'Charge' },
      { keys: 'RMB', action: 'Block' },
    ],
  },
  {
    title: 'Items',
    bindings: [
      { keys: '←/→', action: 'Cycle Item' },
      { keys: 'Z', action: 'Use Item' },
      { keys: 'Q/E', action: 'Cycle Weapon' },
    ],
  },
  {
    title: 'World',
    bindings: [
      { keys: 'F', action: 'Interact', wide: true },
      { keys: 'M', action: 'Map' },
      { keys: 'P', action: 'Player' },
      { keys: 'I', action: 'Inventory' },
      { keys: 'O', action: 'Objectives' },
      { keys: 'ESC', action: 'Pause', wide: true },
    ],
  },
];

/** Flat list (handy for tests and snapshot diffs). */
export const ALL_BINDINGS: ControlBinding[] = CONTROL_GROUPS.flatMap(g => g.bindings);
