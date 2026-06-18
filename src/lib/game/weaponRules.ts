import type { Item } from '@/lib/game/GameState';

export type WeaponImbueType = 'chrysalis';

export function isWeaponItem(item: Item | null | undefined): item is Item & { type: 'equipment' } {
  return item?.type === 'equipment';
}

export function canWeaponReceiveImbue(
  weapon: Item | null | undefined,
  imbueType: WeaponImbueType,
): boolean {
  if (!isWeaponItem(weapon)) return false;
  if (imbueType === 'chrysalis') {
    return weapon.weaponClass === 'standard' && weapon.canReceiveParchment !== false;
  }
  return false;
}

export function findEquippedWeapon(
  inventory: Item[],
  equippedWeaponId: string | null | undefined,
): Item | null {
  if (!equippedWeaponId) return null;
  return inventory.find(item => item.id === equippedWeaponId && item.type === 'equipment') ?? null;
}

export function canEquippedWeaponReceiveImbue(
  inventory: Item[],
  equippedWeaponId: string | null | undefined,
  imbueType: WeaponImbueType,
): boolean {
  return canWeaponReceiveImbue(findEquippedWeapon(inventory, equippedWeaponId), imbueType);
}

export function isEquippedWeaponImbueActive(
  inventory: Item[],
  equippedWeaponId: string | null | undefined,
  imbueType: WeaponImbueType,
  timer: number,
): boolean {
  return timer > 0 && canEquippedWeaponReceiveImbue(inventory, equippedWeaponId, imbueType);
}
