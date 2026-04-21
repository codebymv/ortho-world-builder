import * as THREE from 'three';
import { applyPlayerVisuals, resolvePlayerTexture } from '@/game/runtime/PlayerVisualSystem';
import { applySmoothedCameraFollow, updateInteractionIndicator } from '@/game/runtime/RuntimePresentation';
import type { PlayerFrameContext } from '@/game/runtime/RuntimePhaseContexts';
import { items } from '@/data/items';

export interface RunPlayerFramePhaseOptions extends PlayerFrameContext {
  currentTime: number;
  deltaTime: number;
  playerAnimState: string;
  currentDir8: string;
  isChargingAttack: boolean;
  chargeLevel: number;
  animFrame: number;
  attackFrame: number;
  comboStep: number;
  spinDirIndex: number;
  spinDirections: string[];
  playerSmoothedElevation: number;
  swooshTimer: number;
  swooshFacing: string;
  spinSwooshTimer: number;
  spinSwooshDuration: number;
  heldConsumableSpriteId: string | null;
  camera: THREE.OrthographicCamera;
  cameraTarget: { x: number; y: number };
  lastInteractionPrompt: string | null;
  transitionDebug: boolean;
  lastTransitionDebugRefreshAt: number;
  portalCooldown: number;
  isMapModalOpen: boolean;
  isPlayerDead: boolean;
  particleSystem: import('@/lib/game/ParticleSystem').ParticleSystem;
  lungeState: {
    active: boolean;
    recovering: boolean;
    dirX: number;
    dirY: number;
    speed: number;
    distanceRemaining: number;
  };
}

export function runPlayerFramePhase({
  state,
  world,
  assetManager,
  textureCache,
  currentTime,
  deltaTime,
  playerAnimState,
  currentDir8,
  isChargingAttack,
  chargeLevel,
  animFrame,
  attackFrame,
  comboStep,
  spinDirIndex,
  spinDirections,
  playerBaseScale,
  outlinePad,
  playerSmoothedElevation,
  getPlayerTextureName,
  dir8to4,
  getPlayerVisualY,
  getVisualYAt,
  meshes,
  swooshTimer,
  swooshDuration,
  swooshFacing,
  spinSwooshTimer,
  spinSwooshDuration,
  heldConsumableSpriteId,
  camera,
  cameraTarget,
  screenShake,
  getInteractionPromptLabel,
  isNpcPriorityCueTarget,
  isPortalDestinationUnlocked,
  samplePortalNearPlayer,
  samplePortalForWarpFoot,
  getMapDisplayName,
  criticalItemInteractionIds,
  isCollectedCriticalItem,
  isChestOpened,
  isConsumablePickupCollected,
  lastInteractionPrompt,
  setInteractionPrompt,
  criticalItemVisuals,
  transitionDebug,
  lastTransitionDebugRefreshAt,
  transitionDebugManager,
  portalWarpManager,
  portalCooldown,
  isMapModalOpen,
  isPlayerDead,
  particleSystem,
  lungeState,
  notify,
  handlePortalTransition,
}: RunPlayerFramePhaseOptions) {
  const newTexture = resolvePlayerTexture({
    state,
    assetManager,
    textureCache,
    playerAnimState,
    currentDir8,
    animFrame,
    attackFrame,
    comboStep,
    spinDirIndex,
    spinDirections,
    getPlayerTextureName,
    dir8to4,
  });

  if (newTexture && meshes.playerMaterial.map !== newTexture) {
    meshes.playerMaterial.map = newTexture;
    (meshes.playerOutline.material as THREE.MeshBasicMaterial).map = newTexture;
    // Keep blade overlay in sync so the glow covers the current pose
    const bladeOverlayMat = meshes.bladeOverlayMesh.material as THREE.ShaderMaterial;
    bladeOverlayMat.uniforms.map.value = newTexture;
    bladeOverlayMat.uniformsNeedUpdate = true;
  }

  let attackOffsetX = 0;
  let attackOffsetY = 0;
  const facing4 = dir8to4(currentDir8);
  const walkCycleSpeed = state.player.isSprinting ? 70 : 95;
  const moveWave =
    playerAnimState === 'walk' || state.player.isDodging
      ? Math.sin(currentTime / walkCycleSpeed)
      : 0;
  const stride = Math.abs(moveWave);

  if (playerAnimState === 'attack') {
    // Step 0: standard forward lunge on frame 1
    // Step 1: backhand ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â body pulls back slightly on frame 0, then drifts perpendicular on frame 1
    // Step 2: finisher ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â slight wind-up pull on frame 0, heavy forward plunge on frame 1
    if (comboStep === 0 && attackFrame === 1) {
      const lungeAmount = 0.15;
      if (facing4 === 'up') attackOffsetY = lungeAmount;
      else if (facing4 === 'down') attackOffsetY = -lungeAmount;
      else if (facing4 === 'left') attackOffsetX = -lungeAmount;
      else if (facing4 === 'right') attackOffsetX = lungeAmount;
    } else if (comboStep === 1) {
      if (attackFrame === 0) {
        // Pull back slightly (recoil from step 0)
        const recoil = -0.06;
        if (facing4 === 'up') attackOffsetY = recoil;
        else if (facing4 === 'down') attackOffsetY = -recoil;
        else if (facing4 === 'left') attackOffsetX = -recoil;
        else if (facing4 === 'right') attackOffsetX = recoil;
      } else if (attackFrame === 1) {
        // Perpendicular drift with slight forward motion ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â the backhand whip
        const lungeAmount = 0.10;
        const perpDrift = 0.10;
        if (facing4 === 'up') { attackOffsetY = lungeAmount; attackOffsetX = -perpDrift; }
        else if (facing4 === 'down') { attackOffsetY = -lungeAmount; attackOffsetX = perpDrift; }
        else if (facing4 === 'left') { attackOffsetX = -lungeAmount; attackOffsetY = -perpDrift; }
        else if (facing4 === 'right') { attackOffsetX = lungeAmount; attackOffsetY = perpDrift; }
      }
    } else if (comboStep === 2) {
      if (attackFrame === 0) {
        // Wind-up pull: slight upward/backward lean
        const windUp = -0.08;
        if (facing4 === 'up') attackOffsetY = windUp;
        else if (facing4 === 'down') attackOffsetY = -windUp;
        else if (facing4 === 'left') attackOffsetX = -windUp;
        else if (facing4 === 'right') attackOffsetX = windUp;
      } else if (attackFrame === 1) {
        // Heavy forward slam
        const lungeAmount = 0.24;
        if (facing4 === 'up') attackOffsetY = lungeAmount;
        else if (facing4 === 'down') attackOffsetY = -lungeAmount;
        else if (facing4 === 'left') attackOffsetX = -lungeAmount;
        else if (facing4 === 'right') attackOffsetX = lungeAmount;
      }
    }
  } else if (playerAnimState === 'spin_attack') {
    const spinDir = spinDirections[Math.min(spinDirIndex, spinDirections.length - 1)];
    const lungeAmount = 0.1;
    const d4 = dir8to4(spinDir);
    if (d4 === 'up') attackOffsetY = lungeAmount;
    else if (d4 === 'down') attackOffsetY = -lungeAmount;
    else if (d4 === 'left') attackOffsetX = -lungeAmount;
    else if (d4 === 'right') attackOffsetX = lungeAmount;
  } else if (playerAnimState === 'lunge' && lungeState.active) {
    const lungeVizAmount = 0.2;
    attackOffsetX += lungeState.dirX * lungeVizAmount;
    attackOffsetY += lungeState.dirY * lungeVizAmount;

    if (Math.random() < 0.5) {
      const px = state.player.position.x - lungeState.dirX * 0.3 + (Math.random() - 0.5) * 0.3;
      const py = state.player.position.y - lungeState.dirY * 0.3 + (Math.random() - 0.5) * 0.3;
      particleSystem.emit(new THREE.Vector3(px, py, 0.1), 2, 0x8899bb, 0.15, 0.5, 0.3);
    }
    if (Math.random() < 0.3) {
      particleSystem.emit(
        new THREE.Vector3(state.player.position.x, state.player.position.y, 0.05),
        1, 0x998866, 0.2, 0.3, 0.4,
      );
    }
  }

  let visualScaleX = playerBaseScale;
  let visualScaleY = playerBaseScale;
  let visualRotation = 0;

  if (playerAnimState === 'walk') {
    const sprintMult = state.player.isSprinting ? 1.4 : 1.0;
    attackOffsetY += stride * 0.06 * sprintMult;
    if (facing4 === 'left') attackOffsetX -= stride * 0.04 * sprintMult;
    else if (facing4 === 'right') attackOffsetX += stride * 0.04 * sprintMult;
    visualScaleX *= 1 - stride * 0.035 * sprintMult;
    visualScaleY *= 1 + stride * 0.07 * sprintMult;
    visualRotation =
      moveWave *
      (facing4 === 'left' ? -0.035 : facing4 === 'right' ? 0.035 : 0.018) *
      sprintMult;
  }

  if (state.player.isDodging) {
    const t = 1 - state.player.dodgeTimer / state.player.dodgeDuration;
    const dodgeScaleX = 1 + Math.sin(t * Math.PI) * 0.3;
    const dodgeScaleY = 1 - Math.sin(t * Math.PI) * 0.2;
    visualScaleX *= dodgeScaleX;
    visualScaleY *= dodgeScaleY;
    visualRotation = t * Math.PI * 2 * (state.player.dodgeDirection.x >= 0 ? -1 : 1);
  }

  // Per-combo-step visual differentiation
  if (playerAnimState === 'attack') {
    if (comboStep === 0 && attackFrame === 1) {
      // Standard swing: lean into the slash
      visualRotation += facing4 === 'right' ? 0.06 : facing4 === 'left' ? -0.06 : 0.03;
    } else if (comboStep === 1) {
      if (attackFrame === 0) {
        // Coil back ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â slight opposite lean telegraphing the backhand
        visualRotation += facing4 === 'right' ? 0.05 : facing4 === 'left' ? -0.05 : -0.03;
      } else if (attackFrame === 1) {
        // Backhand whip: body twists opposite direction from step 0
        visualRotation += facing4 === 'right' ? -0.12 : facing4 === 'left' ? 0.12 : 0.08;
        visualScaleX *= 0.97; // slight horizontal squeeze for speed impression
      }
    } else if (comboStep === 2) {
      if (attackFrame === 0) {
        // Wind-up: body rises/coils ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â stretch tall, narrow
        visualScaleX *= 0.95;
        visualScaleY *= 1.08;
      } else if (attackFrame === 1) {
        // Slam impact: squash wide, strong forward rotation
        visualScaleX *= 1.08;
        visualScaleY *= 1.14;
        visualRotation += facing4 === 'right' ? 0.14 : facing4 === 'left' ? -0.14 : -0.09;
      } else {
        // Follow-through settle
        visualScaleX *= 1.03;
        visualScaleY *= 0.97;
      }
    }
  }

  const targetElevation = world.getElevationAt(state.player.position.x, state.player.position.y);
  playerSmoothedElevation += (targetElevation - playerSmoothedElevation) * Math.min(1, 12 * deltaTime);

  const { playerVisualX, playerVisualY } = applyPlayerVisuals({
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
    getHeldItemTexture: spriteId => assetManager.getTexture(spriteId) ?? null,
    heldConsumableSpriteId,
    meshes: {
      playerMesh: meshes.playerMesh,
      playerMaterial: meshes.playerMaterial,
      playerOutline: meshes.playerOutline,
      playerShadow: meshes.playerShadow,
      bladeOverlayMesh: meshes.bladeOverlayMesh,
      heldItemMesh: meshes.heldItemMesh,
      heldItemMaterial: meshes.potionMaterial,
    },
  });

  if (swooshTimer > 0) {
    swooshTimer -= deltaTime;
    const progress = 1 - swooshTimer / swooshDuration;
    meshes.swooshMesh.visible = true;
    meshes.swooshMaterial.opacity = (1 - progress) * 0.35;
    const rangeScale = state.player.attackRange * 0.5;
    const swooshScale = rangeScale * (0.5 + progress * 0.7);
    meshes.swooshMesh.scale.set(swooshScale, swooshScale, 1);

    const swooshDirAngles: Record<string, number> = {
      up: Math.PI * 0.5,
      down: -Math.PI * 0.5,
      left: Math.PI,
      right: 0,
    };
    const baseAngle = swooshDirAngles[swooshFacing] ?? 0;
    // Per-combo-step arc direction:
    //   Step 0: standard left-to-right sweep
    //   Step 1: reversed arc (right-to-left, matching backhand)
    //   Step 2: top-to-bottom vertical slam
    const comboArcOffset = comboStep === 1 ? Math.PI * 0.85 : comboStep === 2 ? Math.PI * 0.45 : 0;
    const arcSweep = comboStep === 2 ? progress * 0.35 : progress * 0.2;
    meshes.swooshMesh.rotation.z = baseAngle + comboArcOffset - Math.PI * 0.375 + arcSweep;

    const swooshDist = state.player.attackRange * 0.4;
    const swooshOffsets: Record<string, { x: number; y: number }> = {
      up: { x: 0, y: swooshDist },
      down: { x: 0, y: -swooshDist },
      left: { x: -swooshDist, y: 0 },
      right: { x: swooshDist, y: 0 },
    };
    const offset = swooshOffsets[swooshFacing] ?? { x: 0, y: 0 };
    meshes.swooshMesh.position.set(
      state.player.position.x + attackOffsetX + offset.x,
      getVisualYAt(
        state.player.position.x + attackOffsetX + offset.x,
        state.player.position.y + attackOffsetY + offset.y,
      ),
      0.3,
    );
  } else {
    meshes.swooshMesh.visible = false;
  }

  if (spinSwooshTimer > 0) {
    spinSwooshTimer -= deltaTime;
    const progress = 1 - spinSwooshTimer / spinSwooshDuration;
    meshes.spinSwooshMesh.visible = true;
    meshes.spinSwooshMaterial.opacity = (1 - progress) * 0.35;
    const chargeRange = state.player.attackRange * 1.5;
    const spinScale = chargeRange * (0.3 + progress * 0.7);
    meshes.spinSwooshMesh.scale.set(spinScale, spinScale, 1);
    meshes.spinSwooshMesh.rotation.z = progress * Math.PI * 2;
    meshes.spinSwooshMesh.position.set(playerVisualX, playerVisualY, 0.3);
  } else {
    meshes.spinSwooshMesh.visible = false;
  }

  if (state.player.damageFlashTimer > 0) {
    screenShake.shake(0.18, 0.12);
  }

  cameraTarget.x = state.player.position.x;
  cameraTarget.y = getPlayerVisualY(state.player.position.x, state.player.position.y);

  const nextInteractionPrompt = updateInteractionIndicator({
    state,
    world,
    currentTime,
    getVisualYAt,
    getInteractionPromptLabel,
    isNpcPriorityCueTarget,
    isPortalDestinationUnlocked,
    samplePortalNearPlayer,
    getMapDisplayName,
    criticalItemInteractionIds,
    isCollectedCriticalItem,
    isChestOpened,
    isConsumablePickupCollected,
    lastInteractionPrompt,
    setInteractionPrompt,
    worldItems: state.worldItems,
    getItemName: (itemId: string) => {
      const found = items[itemId];
      return found ? found.name : null;
    },
    meshes: {
      indicatorMesh: meshes.indicatorMesh,
      indicatorMaterial: meshes.indicatorMaterial,
      objectiveIndicatorRingMesh: meshes.objectiveIndicatorRingMesh,
      objectiveIndicatorRingMaterial: meshes.objectiveIndicatorRingMaterial,
      objectiveIndicatorOuterMesh: meshes.objectiveIndicatorOuterMesh,
      objectiveIndicatorOuterMaterial: meshes.objectiveIndicatorOuterMaterial,
    },
  });

  criticalItemVisuals.update(currentTime, deltaTime);

  let nextTransitionDebugRefreshAt = lastTransitionDebugRefreshAt;
  if (transitionDebug && currentTime - lastTransitionDebugRefreshAt > 180) {
    transitionDebugManager.rebuild(state.player.position);
    nextTransitionDebugRefreshAt = currentTime;
  }

  const stain = state.droppedEssence;
  if (stain && stain.mapId === state.currentMap && stain.amount > 0) {
    meshes.essenceOrbMesh.visible = true;
    const orbY = getVisualYAt(stain.x, stain.y) + 0.75 + Math.sin(currentTime / 280) * 0.08;
    meshes.essenceOrbMesh.position.set(stain.x, orbY, 0.55);
    meshes.essenceOrbMaterial.opacity = 0.78 + Math.sin(currentTime / 350) * 0.18;
    const scale = 0.9 + Math.sin(currentTime / 200) * 0.12;
    meshes.essenceOrbMesh.scale.set(scale, scale, 1);
  } else {
    meshes.essenceOrbMesh.visible = false;
  }

  applySmoothedCameraFollow(camera, cameraTarget, deltaTime);

  portalWarpManager.update({
    currentTime,
    deltaTime,
    playerPosition: state.player.position,
    portalCooldown,
    isDialogueActive: state.dialogueActive,
    isPlayerDead,
    isMapModalOpen,
    camera,
    particleSystem,
    samplePortalNearPlayer: samplePortalForWarpFoot,
    isPortalDestinationUnlocked,
    notify,
    handleMapTransition: handlePortalTransition,
  });

  return {
    playerSmoothedElevation,
    swooshTimer,
    spinSwooshTimer,
    lastInteractionPrompt: nextInteractionPrompt,
    lastTransitionDebugRefreshAt: nextTransitionDebugRefreshAt,
  };
}
