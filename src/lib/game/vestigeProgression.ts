import {
  MAX_EPHEMERAL_EXTRACT_CHARGES,
  EPHEMERAL_EXTRACT_CHARGES_PER_UPGRADE,
  MAX_EPHEMERAL_EXTRACT_UPGRADES,
  VESTIGE_COST_BY_UPGRADE_LEVEL,
} from '../../data/balance';

/** How many bonfire "Increase Healing" upgrades have already been applied. */
export function getEphemeralExtractUpgradeLevel(maxCharges: number): number {
  const delta = maxCharges - MAX_EPHEMERAL_EXTRACT_CHARGES;
  if (delta <= 0) return 0;
  return Math.round(delta / EPHEMERAL_EXTRACT_CHARGES_PER_UPGRADE);
}

export function isEphemeralExtractUpgradeMaxed(upgradeLevel: number): boolean {
  return upgradeLevel >= MAX_EPHEMERAL_EXTRACT_UPGRADES;
}

/** Vestiges required for the next upgrade at the given level (already-applied count). */
export function getVestigeCostForUpgradeLevel(upgradeLevel: number): number {
  if (isEphemeralExtractUpgradeMaxed(upgradeLevel)) return Infinity;
  const tierCost = VESTIGE_COST_BY_UPGRADE_LEVEL[upgradeLevel];
  if (tierCost != null) return tierCost;
  return VESTIGE_COST_BY_UPGRADE_LEVEL[VESTIGE_COST_BY_UPGRADE_LEVEL.length - 1] ?? 1;
}

export function canAffordEphemeralExtractUpgrade(
  vestigeCount: number,
  upgradeLevel: number,
): boolean {
  if (isEphemeralExtractUpgradeMaxed(upgradeLevel)) return false;
  return vestigeCount >= getVestigeCostForUpgradeLevel(upgradeLevel);
}

export function formatVestigeCostLabel(cost: number): string {
  if (!Number.isFinite(cost)) return 'Maxed';
  return cost === 1 ? '1 Radiant Vestige' : `${cost} Radiant Vestiges`;
}
