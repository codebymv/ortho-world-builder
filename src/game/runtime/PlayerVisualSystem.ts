import * as THREE from 'three';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { GameState } from '@/lib/game/GameState';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import type { ScreenShake } from '@/lib/game/ScreenShake';

let _lastDamageFlashActive = false;
let _lastHeldItemSprite = '';
let _lastBladeVisible = false;
// Charge-state trackers — used to detect the exact frame the player crosses
// the full-charge threshold so we can fire a one-shot peak burst (ring of
// embers + brief shake) instead of bleeding the same particle every frame.
let _lastChargeLevel = 0;
let _chargeEmberTimer = 0;
let _peakSustainEmberTimer = 0;
// Outline tint state machine — prevents the dirty-flag damage flash logic
// from fighting with the charge-peak outline. Single tracker, single write.
type OutlineMode = 'default' | 'damage' | 'charge-peak';
let _outlineMode: OutlineMode = 'default';

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
  /** Optional — when provided, charge attacks emit ember particles around the blade. */
  particleSystem?: ParticleSystem;
  /** Optional — when provided, a small camera kick fires at the moment the player hits full charge. */
  screenShake?: ScreenShake;
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
  particleSystem,
  screenShake,
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
  const isDamageFlashActive = state.player.damageFlashTimer > 0;
  // Resolve outline tint via priority: damage flash > charge peak > default.
  // Charge-peak outline reads as "this hit is loaded" — the player's silhouette
  // briefly glows in the weapon's accent color when fully charged.
  let desiredOutline: OutlineMode = 'default';
  if (isDamageFlashActive) {
    desiredOutline = 'damage';
  } else if (isChargingAttack && chargeLevel >= 1) {
    desiredOutline = 'charge-peak';
  }
  if (desiredOutline !== _outlineMode) {
    _outlineMode = desiredOutline;
    if (desiredOutline === 'damage') {
      playerMaterial.color.setHex(0xffaaaa);
      outlineMat.color.setHex(0xff0000);
    } else if (desiredOutline === 'charge-peak') {
      const peakOutlineHex = state.equippedWeaponId === 'ornamental_broadsword' ? 0x66CCFF
        : state.equippedWeaponId === 'terminus_scythe' ? 0xCC66FF
        : 0xFFCC44;
      outlineMat.color.setHex(peakOutlineHex);
    } else {
      playerMaterial.color.setHex(0xffffff);
      outlineMat.color.setHex(0x000000);
    }
  }
  _lastDamageFlashActive = isDamageFlashActive;

  // Blade glow: shader-masked overlay only affects bright (sword) pixels.
  // Four drivers, in priority order:
  //   1. Charge attack — three-tier ramp (spark → ember → solar-peak) with
  //      ember particles emitted from the blade and a one-shot burst on peak.
  //   2. Parry window open — fast cyan shimmer while the 0.25s window is live.
  //   3. Recent parry (parryBonusTimer) — lingering gold shine before next strike.
  //   4. Otherwise hidden.
  const isBroadsword = state.equippedWeaponId === 'ornamental_broadsword';
  const isScythe = state.equippedWeaponId === 'terminus_scythe';
  const bladeOverlayMat = bladeOverlayMesh.material as THREE.ShaderMaterial;
  if (isChargingAttack && chargeLevel > 0) {
    // ─── Charge ramp curve: easeOut so the early part feels "loading" and the
    // last 20% leans into peak — gives the player a clear "almost there" beat.
    const ramp = 1 - Math.pow(1 - chargeLevel, 2.0);

    if (chargeLevel >= 1) {
      // ── PEAK STATE — solar-bright, fast pulse, blade actively radiating ──
      const fastPulse = Math.sin(currentTime / 22) * 0.5 + 0.5;
      const microPulse = Math.sin(currentTime / 8) * 0.08; // high-freq shimmer
      const peakIntensity = 0.95 + fastPulse * 0.18 + microPulse;
      if (isBroadsword) {
        // Frozen-star blue-white at full charge.
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(peakIntensity * 0.75, peakIntensity * 0.9, peakIntensity * 1.1);
      } else if (isScythe) {
        // Eclipse-purple to white-hot — scythe goes through a different palette.
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(peakIntensity * 0.95, peakIntensity * 0.55, peakIntensity * 1.05);
      } else {
        // Solar gold-white for the default sword.
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
          .setRGB(peakIntensity * 1.1, peakIntensity * 0.95, peakIntensity * 0.5);
      }
      bladeOverlayMat.uniforms.opacity.value = 0.85 + fastPulse * 0.15;
    } else {
      // ── BUILDING STATE — color ramps from dim spark to bright ember.
      // Color also rotates: 0%→30% deep amber, 30%→70% orange, 70%→99% bright gold/white.
      const pulseCycle = Math.sin(currentTime / 50) * 0.5 + 0.5;
      const intensity = 0.18 + ramp * 0.7 + pulseCycle * 0.25 * ramp;
      if (isBroadsword) {
        // Cool blue ramp — deeper steel → bright cyan
        const r = intensity * (0.30 + ramp * 0.40);
        const g = intensity * (0.45 + ramp * 0.35);
        const b = intensity * (0.75 + ramp * 0.30);
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color).setRGB(r, g, b);
      } else if (isScythe) {
        // Violet → magenta ramp
        const r = intensity * (0.55 + ramp * 0.40);
        const g = intensity * (0.15 + ramp * 0.30);
        const b = intensity * (0.75 + ramp * 0.25);
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color).setRGB(r, g, b);
      } else {
        // Default sword: deep amber → bright gold
        const r = intensity * (0.85 + ramp * 0.20);
        const g = intensity * (0.40 + ramp * 0.50);
        const b = intensity * (0.05 + ramp * 0.25);
        (bladeOverlayMat.uniforms.glowColor.value as THREE.Color).setRGB(r, g, b);
      }
      bladeOverlayMat.uniforms.opacity.value = 0.30 + ramp * 0.55;
    }
    bladeOverlayMesh.visible = true;

    // ─── Ember particle emission ──────────────────────────────────────────
    // Past ~50% charge, small sparks drift off the blade. Past peak, a
    // continuous bright trickle. The one-shot burst on entering peak gives a
    // tactile "click" the moment max charge lands.
    if (particleSystem) {
      const playerX = state.player.position.x + attackOffsetX;
      const playerY = state.player.position.y + attackOffsetY;
      // Bias upward so embers appear to drift up off the blade rather than from
      // the player's feet.
      const blade_y = playerY + 0.35;

      // BUILD-UP: above 0.45 charge, periodically drop sparks. Rate scales with charge.
      if (chargeLevel >= 0.45 && chargeLevel < 1) {
        _chargeEmberTimer -= deltaTime;
        const emitInterval = 0.16 - chargeLevel * 0.10; // 0.16s → 0.06s as charge ramps
        if (_chargeEmberTimer <= 0) {
          _chargeEmberTimer = emitInterval;
          const color = isBroadsword ? 0x88BBEE : isScythe ? 0xCC55EE : 0xFFB347;
          particleSystem.emitAt(playerX + (Math.random() - 0.5) * 0.3, blade_y, 0.45, 2, color, 0.45, 0.7, 0.5);
        }
      }
      // PEAK BURST: one-shot the FRAME the player crosses chargeLevel = 1.
      if (chargeLevel >= 1 && _lastChargeLevel < 1) {
        const ringColor = isBroadsword ? 0xCCEEFF : isScythe ? 0xEEAAFF : 0xFFE680;
        const coreColor = isBroadsword ? 0xFFFFFF : isScythe ? 0xFFFFFF : 0xFFFFFF;
        // Small radial ring at the blade — reads as the weapon "locking in".
        particleSystem.emitAt(playerX, blade_y, 0.5, 10, ringColor, 0.5, 1.6, 1.8);
        particleSystem.emitAt(playerX, blade_y, 0.55, 5, coreColor, 0.35, 1.1, 1.2);
        if (screenShake) screenShake.shake(0.10, 0.08);
      }
      // SUSTAIN at peak: rare bright ember every ~0.12s so the blade looks alive.
      if (chargeLevel >= 1) {
        _peakSustainEmberTimer -= deltaTime;
        if (_peakSustainEmberTimer <= 0) {
          _peakSustainEmberTimer = 0.10 + Math.random() * 0.05;
          const color = isBroadsword ? 0xCCEEFF : isScythe ? 0xEEAAFF : 0xFFE680;
          particleSystem.emitAt(playerX + (Math.random() - 0.5) * 0.4, blade_y + Math.random() * 0.25, 0.5, 1, color, 0.45, 0.9, 0.4);
        }
      } else {
        _peakSustainEmberTimer = 0;
      }
    }
    _lastChargeLevel = chargeLevel;
  } else if (state.player.parryWindowTimer > 0) {
    _lastChargeLevel = 0;
    _chargeEmberTimer = 0;
    _peakSustainEmberTimer = 0;
    // Tight, fast cyan/white shimmer — the player has ~0.25s to feel this and
    // catch the strike. Pulses faster than charge so it reads as "primed,
    // urgent" rather than "charging up."
    const t = state.player.parryWindowTimer / 0.25;
    const shimmer = Math.sin(currentTime / 18) * 0.5 + 0.5;
    const intensity = 0.5 + shimmer * 0.5;
    (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
      .setRGB(intensity * 0.85, intensity, intensity);
    // Fades as the window closes so the cue tracks the actual mechanic.
    bladeOverlayMat.uniforms.opacity.value = 0.55 * t + 0.15;
    bladeOverlayMesh.visible = true;
  } else if (state.player.parryBonusTimer > 0) {
    _lastChargeLevel = 0;
    _chargeEmberTimer = 0;
    _peakSustainEmberTimer = 0;
    // Lingering gold halo after a successful parry — signals the next strike
    // will hit harder (parryBonus = 1.25x) without a UI tooltip.
    const t = Math.min(1, state.player.parryBonusTimer);
    const shimmer = Math.sin(currentTime / 40) * 0.5 + 0.5;
    const intensity = 0.6 + shimmer * 0.3;
    (bladeOverlayMat.uniforms.glowColor.value as THREE.Color)
      .setRGB(intensity, intensity * 0.85, intensity * 0.35);
    bladeOverlayMat.uniforms.opacity.value = 0.5 * t;
    bladeOverlayMesh.visible = true;
  } else {
    _lastChargeLevel = 0;
    _chargeEmberTimer = 0;
    _peakSustainEmberTimer = 0;
    bladeOverlayMesh.visible = false;
  }

  const playerVisualX = state.player.position.x + attackOffsetX;
  const playerVisualY = getPlayerVisualY(playerVisualX, state.player.position.y + attackOffsetY);
  // Charge "breath" — subtle vertical pulse on the player body as charge ramps,
  // so the wind-up reads kinaesthetically. Peaks contribute a tiny extra hold
  // (the player visibly tenses at full charge). Stacks multiplicatively with
  // any blocking pose adjustments below.
  let chargeScaleX = 1;
  let chargeScaleY = 1;
  if (isChargingAttack && chargeLevel > 0) {
    const breath = Math.sin(currentTime / 60) * 0.5 + 0.5;
    const breathAmt = 0.012 + chargeLevel * 0.025;
    chargeScaleX = 1 + breath * breathAmt;
    chargeScaleY = 1 - breath * breathAmt * 0.7;
    if (chargeLevel >= 1) {
      // At peak: tiny extra "held" stretch — like the player is bracing.
      const peakHold = Math.sin(currentTime / 18) * 0.5 + 0.5;
      chargeScaleX *= 1 + peakHold * 0.012;
      chargeScaleY *= 1 + peakHold * 0.020;
    }
  }
  const effectiveScaleX = (isBlocking ? visualScaleX * 0.98 : visualScaleX) * chargeScaleX;
  const effectiveScaleY = (isBlocking ? visualScaleY * 1.08 : visualScaleY) * chargeScaleY;
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
    playerMaterial.opacity = 1;
  } else if (state.player.isDodging) {
    playerMaterial.opacity = 0.6;
  } else if (state.player.stealthTimer > 0) {
    // Pulse between 0.35 and 0.55 to give a subtle shimmer while stealthed.
    const pulse = Math.sin(currentTime / 200) * 0.1 + 0.45;
    playerMaterial.opacity = pulse;
    playerMaterial.color.setHex(0xaaffcc);
  } else if (state.player.berserkerTimer > 0) {
    // Ember pulse — red tint that throbs with the heart-rate of the rage.
    const beat = Math.sin(currentTime / 120) * 0.15 + 0.85;
    const r = Math.floor(255 * beat);
    const gb = Math.floor(140 * beat);
    playerMaterial.color.setRGB(r / 255, gb / 255, gb / 255);
    playerMaterial.opacity = 1;
  } else {
    playerMaterial.color.setHex(0xffffff);
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
  comboStep: number;
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
  comboStep,
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
    // Use combo-step-specific texture: attack_0, attack_1, attack_2
    textureKey = getPlayerTextureName(currentDir8, `attack_${comboStep}`, Math.min(attackFrame, 2));
  } else if (playerAnimState === 'dodge') {
    textureKey = getPlayerTextureName(currentDir8, 'walk', animFrame);
  } else if (playerAnimState === 'climb') {
    // Reuse walk frames until dedicated climb sprites exist.
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
