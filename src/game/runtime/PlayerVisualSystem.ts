import * as THREE from 'three';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { GameState } from '@/lib/game/GameState';

interface PlayerVisualMeshes {
  playerMesh: THREE.Mesh;
  playerMaterial: THREE.MeshBasicMaterial;
  playerOutline: THREE.Mesh;
  playerShadow: THREE.Mesh;
  bladeOverlayMesh: THREE.Mesh;
  heldItemMesh: THREE.Mesh;
  heldItemMaterial: THREE.MeshBasicMaterial;
}

interface ApplyPlayerVisualsOptions {
  state: GameState;
  currentTime: number;
  deltaTime: number;
  playerAnimState: string;
  currentDir8: string;
  isChargingAttack: boolean;
  chargeLevel: number;
  visualScaleX: number;
  visualScaleY: number;
  visualRotation: number;
  attackOffsetX: number;
  attackOffsetY: number;
  outlinePad: number;
  getPlayerVisualY: (x: number, y: number) => number;
  getVisualYAt: (x: number, y: number) => number;
  getHeldItemTexture: (spriteId: string) => THREE.Texture | null;
  meshes: PlayerVisualMeshes;
}

export function applyPlayerVisuals({
  state,
  currentTime,
  deltaTime,
  playerAnimState,
  currentDir8,
  isChargingAttack,
  chargeLevel,
  visualScaleX,
  visualScaleY,
  visualRotation,
  attackOffsetX,
  attackOffsetY,
  outlinePad,
  getPlayerVisualY,
  getVisualYAt,
  getHeldItemTexture,
  meshes,
}: ApplyPlayerVisualsOptions) {
  const {
    playerMesh,
    playerMaterial,
    playerOutline,
    playerShadow,
    bladeOverlayMesh,
    heldItemMesh,
    heldItemMaterial,
  } = meshes;

  const outlineMat = playerOutline.material as THREE.MeshBasicMaterial;
  if (state.player.damageFlashTimer > 0) {
    playerMaterial.color.setHex(0xffaaaa);
    outlineMat.color.setHex(0xff0000);
  } else if (isChargingAttack && chargeLevel > 0) {
    const pulse = Math.sin(currentTime / 40) * 0.15 * chargeLevel;
    const brightness = 1 + pulse;
    playerMaterial.color.setRGB(brightness, brightness, brightness);
    outlineMat.color.setHex(0x000000);
  } else {
    playerMaterial.color.setHex(0xffffff);
    outlineMat.color.setHex(0x000000);
  }

  if (isChargingAttack) {
    const pulse = 1 + Math.sin(currentTime / 50) * 0.15 * (0.3 + chargeLevel * 0.7);
    playerMaterial.color.setRGB(pulse, pulse, pulse);
    bladeOverlayMesh.visible = false;
  } else {
    bladeOverlayMesh.visible = false;
  }

  const playerVisualX = state.player.position.x + attackOffsetX;
  const playerVisualY = getPlayerVisualY(playerVisualX, state.player.position.y + attackOffsetY);

  playerMesh.rotation.z = visualRotation;
  playerMesh.scale.set(visualScaleX, visualScaleY, 1);
  playerMesh.position.set(playerVisualX, playerVisualY, 0.8);
  playerMesh.renderOrder = 999999;

  const activeItem = state.inventory[state.activeItemIndex];
  const isHoldingConsumable = activeItem?.type === 'consumable' && playerAnimState !== 'drinking';

  if (isHoldingConsumable) {
    let itemOffsetX = 0.25;
    let itemOffsetY = 0.05;

    if (currentDir8 === 'left' || currentDir8 === 'up_left' || currentDir8 === 'down_left') {
      itemOffsetX = -0.25;
    }
    if (currentDir8 === 'up' || currentDir8 === 'up_left' || currentDir8 === 'up_right') {
      itemOffsetY = 0.35;
    }
    if (currentDir8 === 'down' || currentDir8 === 'down_left' || currentDir8 === 'down_right') {
      itemOffsetY = -0.15;
    }

    heldItemMesh.position.set(
      state.player.position.x + itemOffsetX,
      getVisualYAt(state.player.position.x + itemOffsetX, state.player.position.y + itemOffsetY),
      0.85,
    );
    heldItemMesh.visible = true;

    const heldItemTexture = getHeldItemTexture(activeItem.sprite);
    if (heldItemTexture !== heldItemMaterial.map) {
      heldItemMaterial.map = heldItemTexture;
    }
  } else {
    heldItemMesh.visible = false;
  }

  playerShadow.position.set(
    state.player.position.x,
    getPlayerVisualY(state.player.position.x, state.player.position.y) - 0.35,
    0.05,
  );

  playerOutline.position.set(
    state.player.position.x,
    getPlayerVisualY(state.player.position.x, state.player.position.y),
    0.79,
  );
  playerOutline.scale.set(visualScaleX * outlinePad, visualScaleY * outlinePad, 1);
  playerOutline.rotation.z = visualRotation;
  playerOutline.renderOrder = 999998;

  if (state.player.damageFlashTimer > 0) {
    state.player.damageFlashTimer -= deltaTime;
    const flashIntensity = Math.sin(state.player.damageFlashTimer * 30) > 0 ? 0xff0000 : 0xff6666;
    playerMaterial.color.setHex(flashIntensity);
  } else if (state.player.isDodging) {
    playerMaterial.opacity = 0.6;
  } else {
    playerMaterial.opacity = 1;
  }

  return {
    playerVisualX,
    playerVisualY,
  };
}

interface ResolvePlayerTextureOptions {
  state: GameState;
  assetManager: AssetManager;
  textureCache: Map<string, THREE.Texture>;
  playerAnimState: string;
  currentDir8: string;
  animFrame: number;
  attackFrame: number;
  spinDirIndex: number;
  spinDirections: string[];
  getPlayerTextureName: (direction: string, state: string, frame: number) => string;
  dir8to4: (direction: string) => string;
}

export function resolvePlayerTexture({
  state,
  assetManager,
  textureCache,
  playerAnimState,
  currentDir8,
  animFrame,
  attackFrame,
  spinDirIndex,
  spinDirections,
  getPlayerTextureName,
  dir8to4,
}: ResolvePlayerTextureOptions) {
  let textureKey: string;
  if (state.player.damageFlashTimer > 0) {
    textureKey = getPlayerTextureName(currentDir8, 'hurt', 0);
  } else if (playerAnimState === 'spin_attack') {
    const spinDir = spinDirections[Math.min(spinDirIndex, spinDirections.length - 1)];
    textureKey = getPlayerTextureName(spinDir, 'attack', 1);
  } else if (playerAnimState === 'charge') {
    textureKey = getPlayerTextureName(currentDir8, 'charge', Math.min(animFrame, 2));
  } else if (playerAnimState === 'attack') {
    textureKey = getPlayerTextureName(currentDir8, 'attack', Math.min(attackFrame, 2));
  } else if (playerAnimState === 'dodge') {
    textureKey = getPlayerTextureName(currentDir8, 'walk', animFrame);
  } else if (playerAnimState === 'drinking') {
    textureKey = getPlayerTextureName(currentDir8, 'attack', 2);
  } else if (playerAnimState === 'block') {
    textureKey = getPlayerTextureName(currentDir8, 'block', 0);
  } else {
    textureKey = getPlayerTextureName(currentDir8, playerAnimState, animFrame);
  }

  const getCachedTexture = (key: string) => {
    if (textureCache.has(key)) {
      return textureCache.get(key) ?? null;
    }
    const texture = assetManager.getTexture(key);
    if (texture) {
      textureCache.set(key, texture);
    }
    return texture;
  };

  let texture = getCachedTexture(textureKey);
  if (!texture) {
    const fallbackDir = dir8to4(
      playerAnimState === 'spin_attack'
        ? spinDirections[Math.min(spinDirIndex, spinDirections.length - 1)]
        : currentDir8,
    );
    const fallbackState =
      playerAnimState === 'dodge'
        ? 'walk'
        : playerAnimState === 'charge'
          ? 'charge'
          : playerAnimState === 'spin_attack'
            ? 'attack'
            : playerAnimState === 'hurt'
              ? 'hurt'
              : playerAnimState;
    const fallbackFrame =
      playerAnimState === 'attack'
        ? Math.min(attackFrame, 2)
        : playerAnimState === 'spin_attack'
          ? 1
          : playerAnimState === 'charge'
            ? Math.min(animFrame, 2)
            : animFrame;
    textureKey = `player_${fallbackDir}_${fallbackState}_${fallbackFrame}`;
    texture = getCachedTexture(textureKey);
  }

  return texture ?? null;
}
