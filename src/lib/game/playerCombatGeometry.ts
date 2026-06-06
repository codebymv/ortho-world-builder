/**
 * Single source of truth for the player's collision + combat geometry.
 *
 * Historically these magic numbers (0.2, 0.4, 0.45) were scattered across
 * movement, dodge, lunge, knockback, projectile, and AoE code with no shared
 * definition, which made "got hit / didn't hit" feel inconsistent between
 * damage types and hard to tune. Centralise them here.
 *
 * World units: tile size = 1.0.
 */

/**
 * Player movement collision hull radius. Used by every `world.canMoveTo(..., r)`
 * probe for input movement, dodge, lunge travel, and knockback slides. Smaller
 * than the enemy hull (0.3) so the player can slip through slightly tighter gaps.
 */
export const PLAYER_MOVE_RADIUS = 0.2;

/**
 * Player "hurtbox" radius — how far an incoming hit centre can be from the player
 * centre and still connect. Projectiles already padded by this; Phase 2 extends it
 * to melee/AoE so all incoming damage reads consistently.
 */
export const PLAYER_HIT_RADIUS = 0.4;
