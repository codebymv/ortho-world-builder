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
  heldConsumableSpriteId: string | null;
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
  heldConsumableSpriteId,
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

  const isBlocking = playerAnimState === 'block';

  const outlineMat = playerOutline.material as THREE.MeshBasicMaterial;
  if (state.player.damageFlashTimer > 0) {
    playerMaterial.color.setHex(0xffaaaa);
    outlineMat.color.setHex(0xff0000);
  } else {
    playerMaterial.color.setHex(0xffffff);
    outlineMat.color.setHex(0x000000);
  }

  // Blade glow: shader-masked overlay only affects bright (sword) pixels.
  const isBroadsword = state.equippedWeaponId === 'ornamental_broadsword';
  if (isChargingAttack && chargeLevel > 0) {
    const bladeOverlayMat = bladeOverlayMesh.material as THREE.ShaderMaterial;

    if (chargeLevel >= 1) {
      const fastPulse = Math.sin(currentTime / 30) * 0.5 + 0.5;
      const peakIntensity = 0.85 + fastPulse * 0.15;
      if (isBroadsword) {
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(peakIntensity * 0.5, peakIntensity * 0.7, peakIntensity);
      } else {
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(peakIntensity, peakIntensity * 0.82, peakIntensity * 0.35);
      }
      bladeOverlayMat.uniforms.opacity.value = 0.7 + fastPulse * 0.2;
    } else {
      const pulseCycle = Math.sin(currentTime / 55) * 0.5 + 0.5;
      const intensity = 0.25 + chargeLevel * 0.45 + pulseCycle * 0.3 * chargeLevel;
      if (isBroadsword) {
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(intensity * 0.4, intensity * 0.6, intensity * 0.9);
      } else {
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(intensity, intensity * 0.65, 0);
      }
      bladeOverlayMat.uniforms.opacity.value = 0.35 + chargeLevel * 0.45;
    }
    bladeOverlayMesh.visible = true;
  } else {
    bladeOverlayMesh.visible = false;
  }

  const playerVisualX = state.player.position.x + attackOffsetX;
  const playerVisualY = getPlayerVisualY(playerVisualX, state.player.position.y + attackOffsetY);
  const effectiveScaleX = isBlocking ? visualScaleX * 0.98 : visualScaleX;
  const effectiveScaleY = isBlocking ? visualScaleY * 1.08 : visualScaleY;
  const effectiveVisualY = playerVisualY + (isBlocking ? 0.03 : 0);

  playerMesh.rotation.z = visualRotation;
  playerMesh.scale.set(effectiveScaleX, effectiveScaleY, 1);
  playerMesh.position.set(playerVisualX, effectiveVisualY, 0.8);
  playerMesh.renderOrder = 999999;

  bladeOverlayMesh.position.set(playerVisualX, effectiveVisualY, 0.81);
  bladeOverlayMesh.scale.set(effectiveScaleX, effectiveScaleY, 1);
  bladeOverlayMesh.rotation.z = visualRotation;

  const activeItem = state.inventory[state.activeItemIndex];
  const heldSpriteId =
    playerAnimState === 'drinking'
      ? heldConsumableSpriteId ?? (activeItem?.type === 'consumable' ? activeItem.sprite : null)
      : null;
  const isHoldingConsumable = Boolean(heldSpriteId);

  if (isHoldingConsumable) {
    let itemOffsetX = 0.25;
    let itemOffsetY = 0.05;

    if (playerAnimState === 'drinking') {
      itemOffsetX = 0.34;
      itemOffsetY = 0.14;
    }

    if (currentDir8 === 'left' || currentDir8 === 'up_left' || currentDir8 === 'down_left') {
      itemOffsetX = playerAnimState === 'drinking' ? -0.34 : -0.25;
    }
    if (currentDir8 === 'up' || currentDir8 === 'up_left' || currentDir8 === 'up_right') {
      itemOffsetY = playerAnimState === 'drinking' ? 0.42 : 0.35;
    }
    if (currentDir8 === 'down' || currentDir8 === 'down_left' || currentDir8 === 'down_right') {
      itemOffsetY = playerAnimState === 'drinking' ? -0.05 : -0.15;
    }

    heldItemMesh.position.set(
      state.player.position.x + itemOffsetX,
      getVisualYAt(state.player.position.x + itemOffsetX, state.player.position.y + itemOffsetY),
      0.85,
    );
    heldItemMesh.visible = true;

    const heldItemTexture = getHeldItemTexture(heldSpriteId!);
    if (heldItemTexture !== heldItemMaterial.map) {
      heldItemMaterial.map = heldItemTexture;
      heldItemMaterial.needsUpdate = true;
    }
  } else {
    heldItemMesh.visible = false;
  }

  // Shadow and outline track the visual (lunged) position so they don't separate from the
  // sprite body during attack swings, spin attacks, or lunge moves.
  playerShadow.position.set(
    playerVisualX,
    playerVisualY - 0.35,
    0.05,
  );

  playerOutline.position.set(
    playerVisualX,
    effectiveVisualY,
    0.79,
  );
  playerOutline.scale.set(effectiveScaleX * outlinePad, effectiveScaleY * outlinePad, 1);
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
