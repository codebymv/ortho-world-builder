/**
 * Shared typography/contrast tokens for in-game overlays.
 * Minimum readable sizes: 10px badges, 11px body secondary, 12px (text-xs) body.
 */
export const UI_TEXT = {
  body: 'text-[#F5DEB3]',
  muted: 'text-[#C9B8A8]',
  subtle: 'text-[#A1887F]',
  faint: 'text-[#8B7355]',
  gold: 'text-[#DAA520]',
  desc: 'text-[11px] leading-snug text-[#C9B8A8]',
  caption: 'text-[10px] leading-snug',
  badge: 'text-[10px] uppercase font-bold tracking-wider',
  micro: 'text-[10px]',
} as const;

/** Notification fade floor - never drop below ~65% opacity while visible. */
export const NOTIF_MIN_OPACITY = 0.65;
