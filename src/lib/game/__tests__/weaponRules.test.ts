import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { items } from '@/data/items';
import { getComboActiveFrame, WEAPON_MOVESETS } from '@/data/weaponMovesets';
import { GameState } from '@/lib/game/GameState';
import {
  canEquippedWeaponReceiveImbue,
  canWeaponReceiveImbue,
  isEquippedWeaponImbueActive,
} from '@/lib/game/weaponRules';

describe('weapon imbue rules', () => {
  it('allows Chrysalis only on standard weapons', () => {
    for (const id of ['meek_short_sword', 'iron_sword', 'ornamental_broadsword']) {
      expect(canWeaponReceiveImbue(items[id], 'chrysalis'), id).toBe(true);
    }

    for (const id of ['shadow_blade', 'terminus_scythe', 'crystal_greatsword', 'clockwork_axe']) {
      expect(canWeaponReceiveImbue(items[id], 'chrysalis'), id).toBe(false);
    }
  });

  it('checks the currently equipped weapon through inventory metadata', () => {
    const inventory = [
      { ...items.meek_short_sword },
      { ...items.iron_sword },
      { ...items.clockwork_axe },
    ];

    expect(canEquippedWeaponReceiveImbue(inventory, 'iron_sword', 'chrysalis')).toBe(true);
    expect(canEquippedWeaponReceiveImbue(inventory, 'clockwork_axe', 'chrysalis')).toBe(false);
    expect(isEquippedWeaponImbueActive(inventory, 'iron_sword', 'chrysalis', 12)).toBe(true);
    expect(isEquippedWeaponImbueActive(inventory, 'clockwork_axe', 'chrysalis', 12)).toBe(false);
    expect(isEquippedWeaponImbueActive(inventory, 'iron_sword', 'chrysalis', 0)).toBe(false);
  });

  it('does not start new games with the temporary Clockwork Axe grant', () => {
    const state = new GameState(new THREE.Scene(), new THREE.OrthographicCamera());

    expect(state.inventory.some(item => item.id === 'clockwork_axe')).toBe(false);
    expect(state.weaponLoadout).toEqual(['meek_short_sword', null, null]);
  });
});

describe('weapon active frames', () => {
  it('lands every authored combo after the button-press frame', () => {
    for (const [weaponId, moveset] of Object.entries(WEAPON_MOVESETS)) {
      moveset.steps.forEach((_, step) => {
        expect(getComboActiveFrame(weaponId, step), `${weaponId} step ${step}`).toBeGreaterThanOrEqual(1);
      });
    }
  });
});
