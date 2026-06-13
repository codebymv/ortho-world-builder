import * as THREE from 'three';
import { SharedGeometry } from '@/lib/game/AssetManager';
import { applyEnemyVisuals, updateDeadEnemyVisual } from '@/game/runtime/EnemyVisualSystem';
import type { EnemyLoopContext } from '@/game/runtime/RuntimePhaseContexts';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import { getClimbVisualElevation } from '@/game/runtime/PlayerSimulationSystem';
import { updateEastRidgeBoulder } from '@/game/runtime/EastRidgeBoulder';
import { updateFailedRitualGlyphs, updateRevenantRituals } from '@/game/runtime/RevenantRituals';
import type { Enemy } from '@/lib/game/Combat';

const announcedHollowEclipses = new Set<number>();
type BossSfxState = { state: string; type: string | undefined; phase: number | undefined; combo: number | undefined };
const bossAttackSfxKeys = new Map<string, BossSfxState>();
type EnemyAttackSfxState = { state: string; type: string | undefined };
const enemyAttackSfxKeys = new Map<string, EnemyAttackSfxState>();
const plantIdleCooldowns = new Map<string, number>();
const liveProjectileIdsScratch = new Set<string>();
const liveHazardIdsScratch = new Set<string>();
const projectileRemovalScratch: string[] = [];
const hazardRemovalScratch: string[] = [];
const projectileSfxSprites = new Map<string, string>();
const projectileSfxCounts = new Map<string, number>();
const hazardSfxStates = new Map<string, string>();
type ChrysalisSlashVisual = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  timer: number;
  maxTimer: number;
};
const chrysalisSlashVisuals: ChrysalisSlashVisual[] = [];
let chrysalisSlashTexture: THREE.Texture | null = null;
let chrysalisSlashGeometry: THREE.PlaneGeometry | null = null;

function getChrysalisSlashTexture(): THREE.Texture {
  if (chrysalisSlashTexture) return chrysalisSlashTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(48, 48);
    ctx.rotate(-Math.PI / 4);

    const glow = ctx.createLinearGradient(-44, 0, 44, 0);
    glow.addColorStop(0, 'rgba(120, 220, 255, 0)');
    glow.addColorStop(0.18, 'rgba(160, 240, 255, 0.35)');
    glow.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    glow.addColorStop(0.82, 'rgba(160, 240, 255, 0.35)');
    glow.addColorStop(1, 'rgba(120, 220, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(-44, -5);
    ctx.lineTo(36, -14);
    ctx.lineTo(46, 0);
    ctx.lineTo(36, 14);
    ctx.lineTo(-44, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(-28, -2, 58, 4);
    ctx.fillStyle = 'rgba(190, 245, 255, 0.7)';
    ctx.fillRect(-38, 5, 22, 3);
    ctx.fillRect(12, -10, 24, 3);
  }
  chrysalisSlashTexture = new THREE.CanvasTexture(canvas);
  chrysalisSlashTexture.colorSpace = THREE.SRGBColorSpace;
  chrysalisSlashTexture.magFilter = THREE.NearestFilter;
  chrysalisSlashTexture.minFilter = THREE.NearestFilter;
  return chrysalisSlashTexture;
}

function spawnChrysalisSlashVisual(scene: THREE.Scene, x: number, y: number, variant: number) {
  if (!chrysalisSlashGeometry) chrysalisSlashGeometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: getChrysalisSlashTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(chrysalisSlashGeometry, material);
  mesh.position.set(x, y, 0.92);
  mesh.rotation.z = variant % 2 === 0 ? 0.68 : -0.68;
  mesh.scale.set(1.7, 1.05, 1);
  mesh.renderOrder = 1000002;
  scene.add(mesh);
  chrysalisSlashVisuals.push({ mesh, timer: 0.34, maxTimer: 0.34 });
}

function updateChrysalisSlashVisuals(scene: THREE.Scene, deltaTime: number) {
  for (let i = chrysalisSlashVisuals.length - 1; i >= 0; i--) {
    const visual = chrysalisSlashVisuals[i];
    visual.timer -= deltaTime;
    const t = Math.max(0, visual.timer / visual.maxTimer);
    const grow = 1 + (1 - t) * 0.28;
    visual.mesh.scale.set(1.7 * grow, 1.05 * grow, 1);
    visual.mesh.material.opacity = Math.min(1, t * 1.35);
    if (visual.timer <= 0) {
      scene.remove(visual.mesh);
      visual.mesh.material.dispose();
      chrysalisSlashVisuals.splice(i, 1);
    }
  }
}

function isBoulderProjectile(sprite: string, sourceEnemyId?: string | null): boolean {
  return sprite === 'rock' || sourceEnemyId === 'east_ridge_boulder';
}

function getPlantLashReach(enemy: { attackRange: number }): number {
  return enemy.attackRange * 1.3;
}

function getProjectileVisualScale(sprite: string): { x: number; y: number } {
  if (sprite === 'projectile_spectral_blade') return { x: 0.78, y: 0.42 };
  if (sprite === 'projectile_scythe') return { x: 0.68, y: 0.5 };
  if (sprite === 'projectile_shell') return { x: 0.48, y: 0.42 };
  if (sprite === 'projectile_throwing_barb') return { x: 0.42, y: 0.24 };
  return { x: 0.55, y: 0.55 };
}

function getPlantLashProgress(enemy: { state: string; telegraphTimer: number; telegraphDuration: number; telegraphTotal: number; attackAnimationTimer: number }): number {
  if (enemy.state === 'telegraphing') {
    // Normalize against the actual variance-rolled windup so the lash snap
    // lands exactly when the hit resolves.
    const windup = enemy.telegraphTotal > 0 ? enemy.telegraphTotal : enemy.telegraphDuration;
    const raw = windup > 0
      ? Math.min(1, Math.max(0, 1 - enemy.telegraphTimer / windup))
      : 1;
    if (raw < 0.68) return 0;
    const snap = (raw - 0.68) / 0.32;
    return Math.max(0, Math.min(1, snap * snap * (3 - 2 * snap)));
  }

  if (enemy.state === 'recovering') {
    const raw = Math.max(0, Math.min(1, enemy.attackAnimationTimer / 0.3));
    return raw;
  }

  return 0;
}

function updatePlantLashVisual({
  scene,
  assetManager,
  registry,
  enemy,
  state,
  currentTime,
  getVisualYAt,
  getActorRenderOrder,
}: Pick<RunEnemyLoopOptions, 'scene' | 'assetManager' | 'registry' | 'state' | 'currentTime' | 'getVisualYAt' | 'getActorRenderOrder'> & {
  enemy: Enemy;
}): boolean {
  if (enemy.type !== 'plant' ||
      (enemy.state !== 'telegraphing' && !(enemy.state === 'recovering' && enemy.attackAnimationTimer > 0))) {
    return false;
  }

  let aux = registry.auxMeshes.get(enemy.id);
  if (!aux) {
    const lashMesh = new THREE.Mesh(SharedGeometry.tile, new THREE.MeshBasicMaterial({
      map: assetManager.getTexture('fx_vine_lash'),
      transparent: true,
      depthWrite: false,
    }));
    lashMesh.position.z = 0.23;
    scene.add(lashMesh);
    const tipMesh = new THREE.Mesh(SharedGeometry.enemy, new THREE.MeshBasicMaterial({
      map: assetManager.getTexture('fx_vine_lash_tip'),
      transparent: true,
      depthWrite: false,
    }));
    tipMesh.position.z = 0.24;
    scene.add(tipMesh);
    aux = [lashMesh, tipMesh];
    registry.auxMeshes.set(enemy.id, aux);
  }

  const lash = aux[0];
  const tip = aux[1];
  const fullReach = getPlantLashReach(enemy);
  const progress = getPlantLashProgress(enemy);
  if (progress <= 0.01) {
    lash.visible = false;
    if (tip) tip.visible = false;
    lash.userData.aimLocked = false;
    return true;
  }

  if (!lash.userData.aimLocked) {
    const target = state.player.position;
    const dx = target.x - enemy.position.x;
    const dy = target.y - enemy.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    lash.userData.aimLocked = true;
    lash.userData.aimX = dx / dist;
    lash.userData.aimY = dy / dist;
  }
  const nx = typeof lash.userData.aimX === 'number' ? lash.userData.aimX : 1;
  const ny = typeof lash.userData.aimY === 'number' ? lash.userData.aimY : 0;
  const flicker = Math.floor(currentTime / 36 + enemy.visualSeed * 11) % 3;
  const whipSnap = enemy.state === 'telegraphing'
    ? 0.55 + progress * 0.5
    : 0.5 + Math.sin(progress * Math.PI) * 0.38;
  const reach = fullReach * whipSnap;
  const originOffset = 0.28;
  const startX = enemy.position.x + nx * originOffset;
  const startY = enemy.position.y + ny * originOffset;
  const side = flicker === 1 ? 1 : flicker === 2 ? -1 : 0;
  const snapBend = Math.sin(progress * Math.PI);
  const lateral = side * (enemy.state === 'recovering' ? 0.18 : 0.11) * snapBend;
  const centerX = startX + nx * reach * 0.5 + -ny * lateral;
  const centerY = startY + ny * reach * 0.5 + nx * lateral;
  const mat = lash.material as THREE.MeshBasicMaterial;

  lash.visible = reach > 0.05;
  lash.position.set(centerX, getVisualYAt(centerX, centerY) + 0.24, 0.23);
  lash.rotation.z = Math.atan2(ny, nx) + side * 0.08 * snapBend;
  lash.scale.set(Math.max(0.08, reach), 0.18 + snapBend * 0.18, 1);
  lash.renderOrder = getActorRenderOrder(centerX, centerY, 0.3) + 3;
  mat.opacity = enemy.state === 'telegraphing'
    ? (0.7 + (flicker === 0 ? 0.1 : 0.3)) * progress
    : Math.max(0.12, progress * (flicker === 2 ? 0.55 : 0.9));

  if (tip) {
    const tipMat = tip.material as THREE.MeshBasicMaterial;
    const tipX = startX + nx * reach + -ny * lateral * 1.6;
    const tipY = startY + ny * reach + nx * lateral * 1.6;
    tip.visible = enemy.state === 'telegraphing' ? progress > 0.72 : progress > 0.2;
    tip.position.set(tipX, getVisualYAt(tipX, tipY) + 0.26, 0.24);
    tip.rotation.z = Math.atan2(ny, nx) + side * 0.12 * snapBend;
    const tipScale = 0.34 + snapBend * 0.16;
    tip.scale.set(tipScale, tipScale, 1);
    tip.renderOrder = lash.renderOrder + 1;
    tipMat.opacity = Math.min(1, mat.opacity + 0.15);
  }

  return true;
}

function updateHollowGuardianAttackVisual({
  scene,
  assetManager,
  registry,
  enemy,
  currentTime,
  getVisualYAt,
  getActorRenderOrder,
}: Pick<RunEnemyLoopOptions, 'scene' | 'assetManager' | 'registry' | 'currentTime' | 'getVisualYAt' | 'getActorRenderOrder'> & {
  enemy: Enemy;
}): boolean {
  if (enemy.type !== 'hollow_guardian' || enemy.state !== 'slamming') return false;

  let aux = registry.auxMeshes.get(enemy.id);
  if (!aux) {
    const crackMesh = new THREE.Mesh(SharedGeometry.tile, new THREE.MeshBasicMaterial({
      map: assetManager.getTexture('fx_hollow_nova_cracks'),
      transparent: true,
      depthWrite: false,
    }));
    crackMesh.position.z = 0.17;
    scene.add(crackMesh);
    aux = [crackMesh];
    registry.auxMeshes.set(enemy.id, aux);
  }

  const crack = aux[0];
  const duration = enemy.currentAttackType === 'hail_mary' ? 2.2 : 0.5;
  const timer = enemy.novaSlamTimer ?? 0;
  const progress = Math.max(0, Math.min(1, 1 - timer / duration));
  const pulse = 1 + Math.sin(currentTime / 55 + enemy.visualSeed * 9) * 0.04;
  const radius = enemy.currentAttackType === 'hail_mary' ? 5.7 : 3.0;
  const scale = Math.max(0.6, radius * (0.45 + progress * 0.85) * pulse);
  const mat = crack.material as THREE.MeshBasicMaterial;

  crack.visible = true;
  crack.position.set(enemy.position.x, getVisualYAt(enemy.position.x, enemy.position.y), 0.17);
  crack.rotation.z = enemy.visualSeed * Math.PI * 2 + progress * 0.25;
  crack.scale.set(scale, scale, 1);
  crack.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, -0.3);
  mat.opacity = enemy.currentAttackType === 'hail_mary'
    ? 0.18 + progress * 0.42
    : 0.25 + progress * 0.5;
  mat.color.setHex(enemy.currentAttackType === 'hail_mary' ? 0xaa66ff : 0x55ffee);

  return true;
}

export interface RunEnemyLoopOptions extends EnemyLoopContext {
  currentTime: number;
  deltaTime: number;
  isBlocking: boolean;
  blockStartTime: number;
  isPlayerDead: boolean;
}

export function runEnemyLoop({
  scene,
  assetManager,
  combatSystem,
  state,
  world,
  currentTime,
  deltaTime,
  isBlocking,
  blockStartTime,
  isPlayerDead,
  floatingText,
  screenShake,
  particleSystem,
  outlinePad,
  enemyVisualProfiles,
  registry,
  enemyAudio,
  playPlayerHit,
  playBossAttack,
  playParrySuccess,
  playParryProjectile,
  playGuardBreak,
  playPropBreak,
  playRitualSummonStart,
  playPlantIdle,
  playPlantLash,
  playHollowReaverAttack,
  playProjectileCast,
  startProjectileFly,
  stopProjectileFly,
  playProjectileImpact,
  playProjectileReflect,
  playHazardWarningPulse,
  playHazardScytheFall,
  playHazardScytheImpact,
  startBoulderRollLoop,
  stopBoulderRollLoop,
  playBoulderImpact,
  shadowGeometry,
  shadowMaterial,
  createOutlineMesh,
  getVisualYAt,
  getActorRenderOrder,
  onEnemyKilled,
}: RunEnemyLoopOptions) {
  updateChrysalisSlashVisuals(scene, deltaTime);

  const playerHealthBeforeUpdate = state.player.health;
  const guardBreakBeforeUpdate = state.player.guardBrokenTimer;
  const playerCombatElevation = state.player.isClimbing
    ? getClimbVisualElevation(world, state.player.position.x, state.player.position.y)
    : world.getElevationAt(state.player.position.x, state.player.position.y);
  const combatResult = combatSystem.updateEnemies(
    deltaTime,
    state.player.position,
    state.player.iFrameTimer > 0,
    isBlocking,
    blockStartTime,
    world,
    (enemy, phase) => {
      const spawnShade = (offset: { x: number; y: number }) => {
        const bp = ENEMY_BLUEPRINTS.shadow_lurker;
        if (!bp) return;
        combatSystem.spawnEnemy(
          bp.name,
          { x: enemy.position.x + offset.x, y: enemy.position.y + offset.y },
          bp.hp,
          bp.damage,
          bp.sprite,
          {
            speed: bp.speed,
            attackRange: bp.attackRange,
            chaseRange: bp.chaseRange,
            essenceReward: 0,
            telegraphDuration: bp.telegraphDuration,
            recoverDuration: bp.recoverDuration,
            poise: bp.poise,
            staggerDuration: bp.staggerDuration,
            behaviorOverrides: bp.behaviorOverrides,
          },
        );
      };

      // Spawn a Hollow Reaver at an ABSOLUTE arena-corner position (not boss-relative).
      // Reavers are pelters anchored to the arena corners; the boss controls the center.
      const spawnReaverAt = (absPos: { x: number; y: number }) => {
        const bp = ENEMY_BLUEPRINTS.hollow_reaver;
        if (!bp) return;
        combatSystem.spawnEnemy(
          bp.name,
          { x: absPos.x, y: absPos.y },
          bp.hp,
          bp.damage,
          bp.sprite,
          {
            speed: bp.speed,
            attackRange: bp.attackRange,
            chaseRange: bp.chaseRange,
            essenceReward: 0,
            telegraphDuration: bp.telegraphDuration,
            recoverDuration: bp.recoverDuration,
            poise: bp.poise,
            staggerDuration: bp.staggerDuration,
            behaviorOverrides: bp.behaviorOverrides,
          },
        );
      };
      // Phase two now leans on a single Shade; the entry Reaver already supplies
      // enough scythe pressure if the player brings it into the phase break.
      const REAVER_CORNERS_PHASE2: Array<{ x: number; y: number }> = [];
      const REAVER_CORNERS_PHASE3 = [
        { x: -7, y: -7 }, // NW
      ];

      if (enemy.type === 'golem' && phase === 2) {
        screenShake.shake(0.9, 0.5);
        screenShake.hitStop(0.35);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 50, 0x997755, 0.12, 2.4, 1.6);
        return;
      }

      if (enemy.type === 'corrupted_giant' && phase === 2) {
        screenShake.shake(1.0, 0.55);
        screenShake.hitStop(0.4);
        // Violet corruption burst - veins rupture outward
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 70, 0x7B3FA0, 0.14, 3.0, 2.0);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.3, 30, 0xCC6EF0, 0.08, 2.0, 1.4);
        return;
      }

      if (phase === 2) {
        if (enemy.type === 'hollow_guardian') {
          enemy.state = 'slamming';
          enemy.currentAttackType = 'phase_transition';
          enemy.novaSlamTimer = 0.4;
          particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 45, 0x8844CC, 0.12, 2.4, 1.6);
          particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.4, 25, 0x44FFEE, 0.1, 1.8, 1.2);
        }
        screenShake.shake(0.6, 0.3);
        screenShake.hitStop(0.3);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 20, 0x44FFEE, 0.1, 1.8, 1.2);
        // Summon one Hollow Shade instead of a full flanking pair.
        for (const off of [{ x: -2.5, y: -1.5 }]) {
          spawnShade(off);
        }
        for (const corner of REAVER_CORNERS_PHASE2) {
          particleSystem.emitAt(corner.x, corner.y, 0.4, 10, 0xCC44FF, 0.1, 1.4, 1.0);
          spawnReaverAt(corner);
        }
      }

      if (phase === 3) {
        if (enemy.type === 'hollow_guardian') {
          enemy.state = 'slamming';
          enemy.currentAttackType = 'phase_transition';
          enemy.novaSlamTimer = 0.4;
          particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.7, 55, 0x44FFEE, 0.14, 2.8, 1.8);
          particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 30, 0xCCAAFF, 0.1, 2.2, 1.4);
        }
        screenShake.shake(0.8, 0.4);
        screenShake.hitStop(0.4);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 35, 0x44FFEE, 0.12, 2.2, 1.5);
        // One Reaver at NW changes the safe axis for the final phase.
        for (const corner of REAVER_CORNERS_PHASE3) {
          particleSystem.emitAt(corner.x, corner.y, 0.4, 14, 0xCC44FF, 0.12, 1.6, 1.2);
          spawnReaverAt(corner);
        }
      }
    },
    state.player.stealthDetectionMult,
    particleSystem,
    playPropBreak,
    state.player.isClimbing,
    playerCombatElevation,
  );

  for (const enemy of combatSystem.getAllEnemies()) {
    if (enemy.state === 'dead') continue;
    if (enemy.type === 'ridge_revenant'
      && enemy.state === 'telegraphing'
      && enemy.currentAttackType === 'revenant_crusher'
      && !enemy.crusherTelegraphWarned) {
      enemy.crusherTelegraphWarned = true;
      const center = enemy.attackLockedTarget ?? enemy.position;
      particleSystem.emitAt(center.x, center.y, 0.5, 18, 0xFF4400, 0.14, 2.2, 1.4);
      particleSystem.emitAt(center.x, center.y, 0.35, 10, 0xFF8800, 0.08, 1.6, 1.0);
    } else if (enemy.state !== 'telegraphing' || enemy.currentAttackType !== 'revenant_crusher') {
      enemy.crusherTelegraphWarned = false;
    }
  }

  if (state.player.health < playerHealthBeforeUpdate) {
    playPlayerHit();
  }
  if (guardBreakBeforeUpdate <= 0 && state.player.guardBrokenTimer > 0) {
    playGuardBreak?.();
  }

  /**
   * Fire fully immersive parry feedback at a world position. No floating text -
   * the player reads parries from the camera kick, the freeze-frame, the gold
   * spark burst on their blade, and the boss's stagger pose.
   *
   * Intensity scales with the source so a melee parry has more impact than a
   * deflected scythe blade, and a parried boss slam is the loudest of all.
   */
  const fireParryFeedback = (x: number, y: number, source: 'melee' | 'aoe' | 'projectile' | 'hazard') => {
    let shakeIntensity = 0.35;
    let shakeDuration = 0.12;
    let stopDuration = 0.1;
    let goldCount = 7;
    let goldSpeed = 1.4;
    let ringCount = 0;
    let ringColor = 0xCCEEFF;
    switch (source) {
      case 'melee':
        shakeIntensity = 0.4;
        shakeDuration = 0.14;
        stopDuration = 0.12;
        goldCount = 9;
        goldSpeed = 2.0;
        ringCount = 12;
        ringColor = 0xffffff;
        break;
      case 'aoe':
        shakeIntensity = 0.5;
        shakeDuration = 0.18;
        stopDuration = 0.14;
        goldCount = 11;
        goldSpeed = 1.8;
        ringCount = 14;
        ringColor = 0xFFF1A8;
        break;
      case 'projectile':
        shakeIntensity = 0.22;
        shakeDuration = 0.08;
        stopDuration = 0.06;
        goldCount = 5;
        goldSpeed = 1.1;
        ringCount = 8;
        ringColor = 0x9CE0FF;
        break;
      case 'hazard':
        shakeIntensity = 0.42;
        shakeDuration = 0.14;
        stopDuration = 0.11;
        goldCount = 9;
        goldSpeed = 1.6;
        ringCount = 12;
        ringColor = 0xEEDDFF;
        break;
    }
    const px = state.player.position.x;
    const py = state.player.position.y;
    const clashX = source === 'melee' ? (px + x) * 0.5 : x;
    const clashY = source === 'melee' ? (py + y) * 0.5 + 0.35 : y;

    screenShake.shake(shakeIntensity, shakeDuration);
    screenShake.hitStop(stopDuration);
    if (source === 'projectile' || source === 'hazard') {
      playParryProjectile?.();
    } else {
      playParrySuccess?.();
    }
    if (source === 'melee') {
      particleSystem.emitParryClashSparkAt(clashX, clashY, 0.38);
    } else {
      particleSystem.emitSparklesAt(clashX, clashY, 0.3);
    }
    particleSystem.emitAt(clashX, clashY, 0.4, goldCount, 0xFFD700, 0.55, goldSpeed, 1.0);
    if (ringCount > 0) {
      // Thin ring of bright sparks at the impact point - reads as the deflected
      // edge of the strike spraying outward.
      particleSystem.emitAt(clashX, clashY, 0.42, ringCount, ringColor, 0.4, goldSpeed * 1.3, 1.6);
    }
    // Brief blade kick on the player (parryBonusTimer already drives the next-hit
    // damage boost; this also makes the blade glow shader read as "primed").
    if (state.player.parryBonusTimer < 0.95) {
      state.player.parryBonusTimer = 1.0;
    }
  };

  if (combatResult.parried && combatResult.parryEnemyId) {
    const parriedEnemy = combatSystem.getEnemies().find(e => e.id === combatResult.parryEnemyId);
    if (parriedEnemy) {
      // Boss heavy AoE attacks (nova/charge/combo-finisher) use the 'aoe' source
      // for a heavier reward; routine melee strikes use 'melee'.
      const isHeavyState = parriedEnemy.state === 'staggered' &&
        (parriedEnemy.currentAttackType === 'sweep' ||
         parriedEnemy.currentAttackType === 'combo_finisher' ||
         parriedEnemy.currentAttackType === 'combo_sweep' ||
         parriedEnemy.currentAttackType === 'nova');
      fireParryFeedback(
        parriedEnemy.position.x,
        parriedEnemy.position.y + 0.5,
        isHeavyState ? 'aoe' : 'melee',
      );
    }
  }
  const enemies = combatSystem.getEnemies();
  const chrysalisEchoes = combatSystem.updateChrysalisEchoes(deltaTime);
  for (const echo of chrysalisEchoes) {
    if (echo.phase === 'telegraph') {
      spawnChrysalisSlashVisual(scene, echo.slashX, echo.slashY, Math.round((echo.slashX + echo.slashY) * 10));
      particleSystem.emitAt(echo.slashX, echo.slashY, 0.62, 12, 0xD9FFFF, 0.22, 0.45, 1.0);
      particleSystem.emitAt(echo.slashX, echo.slashY, 0.66, 6, 0xFFFFFF, 0.16, 0.3, 0.8);
      particleSystem.emitAt(echo.x, echo.y + 0.38, 0.48, 6, 0x8FD8FF, 0.30, 0.45, 0.75);
      continue;
    }

    floatingText.spawnDamage(echo.x, echo.y, echo.damage, false);
    particleSystem.emitAt(echo.slashX, echo.slashY, 0.58, 20, 0xD9FFFF, 0.20, 1.9, 1.2);
    particleSystem.emitAt(echo.slashX, echo.slashY, 0.64, 10, 0xFFFFFF, 0.14, 1.35, 0.65);
    particleSystem.emitAt(echo.x, echo.y + 0.25, 0.45, 8, 0x8FD8FF, 0.24, 1.25, 0.95);
    screenShake.shake(echo.killed ? 0.08 : 0.04, 0.05);
    if (echo.killed) onEnemyKilled(echo.enemy);
  }
  const enemyAudioNow = currentTime / 1000;
  const FULL_VISUAL_RANGE_SQ = 28 * 28;
  const VISUAL_RANGE_SQ = 36 * 36;
  const px = state.player.position.x;
  const py = state.player.position.y;
  const getTexture = (key: string): THREE.Texture | null => assetManager.getTexture(key) ?? null;

  for (const enemy of enemies) {
    const edx = enemy.position.x - px;
    const edy = enemy.position.y - py;
    const eDistSq = edx * edx + edy * edy;

    const existingVisuals = registry.meshes.get(enemy.id);
    const isBossType = enemy.type === 'hollow_guardian' || enemy.type === 'golem' ||
      enemy.type === 'ashen_reaver' || enemy.type === 'corrupted_giant' ||
      enemy.type === 'stone_sentinel';
    if (eDistSq > VISUAL_RANGE_SQ) {
      if (existingVisuals) {
        existingVisuals.visible = false;
        const shadow = registry.shadows.get(enemy.id);
        const outline = registry.outlines.get(enemy.id);
        if (shadow) shadow.visible = false;
        if (outline) outline.visible = false;
        const hpBar = registry.hpBars.get(enemy.id);
        if (hpBar) {
          hpBar.bg.visible = false;
          hpBar.fill.visible = false;
        }
      }
      registry.removeAux(enemy.id);
      continue;
    }

    let enemyMesh = existingVisuals;

    const isBossAttackState = enemy.state === 'telegraphing' || enemy.state === 'charging' ||
      enemy.state === 'slamming';
    if (isBossType && isBossAttackState) {
      const cached = bossAttackSfxKeys.get(enemy.id);
      if (!cached ||
          cached.state !== enemy.state ||
          cached.type !== enemy.currentAttackType ||
          cached.phase !== enemy.phase ||
          cached.combo !== enemy.comboHitsRemaining) {
        bossAttackSfxKeys.set(enemy.id, { state: enemy.state, type: enemy.currentAttackType, phase: enemy.phase, combo: enemy.comboHitsRemaining });
        playBossAttack?.();
      }
    } else {
      bossAttackSfxKeys.delete(enemy.id);
    }

    if (
      enemy.state === 'telegraphing' &&
      (enemy.type === 'plant' || enemy.type === 'hollow_reaver')
    ) {
      const cached = enemyAttackSfxKeys.get(enemy.id);
      if (!cached || cached.state !== enemy.state || cached.type !== enemy.currentAttackType) {
        enemyAttackSfxKeys.set(enemy.id, { state: enemy.state, type: enemy.currentAttackType });
        if (enemy.type === 'plant') {
          playPlantLash?.();
        } else {
          playHollowReaverAttack?.();
        }
      }
    } else {
      enemyAttackSfxKeys.delete(enemy.id);
    }

    if (enemy.type === 'hollow_guardian' && enemy.state === 'slamming' && enemy.currentAttackType === 'hail_mary') {
      const eclipsePhase = enemy.phase ?? 1;
      if (!announcedHollowEclipses.has(eclipsePhase)) {
        announcedHollowEclipses.add(eclipsePhase);
        screenShake.shake(0.55, 0.35);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 45, 0x44ffee, 0.18, 2.6, 1.8);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.4, 25, 0xcc44ff, 0.14, 2.2, 1.4);
      }
    }

    // Committed-attack lock indicator - paints the impact tile with rising
    // dust so the player can read where to sidestep. Throttled to ~once per
    // 4 frames to keep particle count reasonable.
    if (eDistSq <= FULL_VISUAL_RANGE_SQ &&
        enemy.state === 'telegraphing' && enemy.attackLockedTarget &&
        (enemy.currentAttackType === 'sentinel_slab' ||
         enemy.currentAttackType === 'golem_stomp' ||
         enemy.currentAttackType === 'revenant_crusher')) {
      const t = enemy.attackLockedTarget;
      // Use the rotation field for a per-enemy phase so the emit fires
      // asynchronously across multiple sentinels.
      const phase = Math.floor((currentTime + enemy.position.x * 17) / 60) % 4;
      if (phase === 0) {
        const color = enemy.currentAttackType === 'revenant_crusher'
          ? 0x6e4cb8
          : enemy.currentAttackType === 'sentinel_slab'
            ? 0xA68A5A
            : 0x7C6A52;
        particleSystem.emitAt(t.x, t.y, 0.1, 4, color, 0.35, 0.9, 0.6, { important: false });
      }
    }
    // Dash-attack motion trail - leaves a streak behind committed dashes so
    // the slide reads as kinetic rather than a snap teleport.
    if (eDistSq <= FULL_VISUAL_RANGE_SQ &&
        enemy.state === 'telegraphing' &&
        (enemy.currentAttackType === 'giant_lunge' ||
         enemy.currentAttackType === 'reaver_rush' ||
         enemy.currentAttackType === 'golem_grab' ||
         enemy.currentAttackType === 'revenant_rush')) {
      const phase = Math.floor((currentTime + enemy.position.y * 19) / 50) % 3;
      if (phase === 0) {
        const color = enemy.currentAttackType === 'revenant_rush' ? 0x7651d1 : 0x5C4836;
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.2, 3, color, 0.3, 0.7, 0.5, { important: false });
      }
    }

    if (!enemyMesh) {
      const enemyGeometry = SharedGeometry.enemy;
      const enemyTexture = assetManager.getTexture(enemy.sprite);
      const enemyMaterial = new THREE.MeshBasicMaterial({
        map: enemyTexture,
        transparent: true,
        depthWrite: false,
      });
      enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
      enemyMesh.position.z = 0.2;
      enemyMesh.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, 0);
      scene.add(enemyMesh);

      const enemyShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
      const enemyType = enemy.sprite.replace('enemy_', '');
      const enemyVisual = enemyVisualProfiles[enemyType] ?? enemyVisualProfiles.wolf;
      enemyShadow.scale.set(enemyVisual.baseScale * 0.6, enemyVisual.baseScale * 0.25, 1);
      enemyShadow.renderOrder = 1;
      scene.add(enemyShadow);

      const enemyOutline = createOutlineMesh(enemyGeometry, enemyTexture ?? null);
      enemyOutline.position.z = 0.19;
      scene.add(enemyOutline);

      registry.registerEnemyVisuals(enemy.id, {
        mesh: enemyMesh,
        shadow: enemyShadow,
        outline: enemyOutline,
      });
    }

    if (!isBossType && eDistSq > FULL_VISUAL_RANGE_SQ) {
      const enemyType = enemy.sprite.replace('enemy_', '');
      const enemyVisual = enemyVisualProfiles[enemyType] ?? enemyVisualProfiles.wolf;
      const visualY = getVisualYAt(enemy.position.x, enemy.position.y);
      enemyMesh.visible = true;
      enemyMesh.position.set(enemy.position.x, visualY, 0.2);
      enemyMesh.scale.set(enemyVisual.baseScale, enemyVisual.baseScale, 1);
      enemyMesh.rotation.z = 0;
      enemyMesh.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, 0);
      const material = enemyMesh.material as THREE.MeshBasicMaterial;
      if (enemy.damageFlashTimer > 0) {
        enemy.damageFlashTimer = Math.max(0, enemy.damageFlashTimer - deltaTime);
      }
      if (enemy.damageFlashTimer <= 0) {
        material.opacity = 1;
      }
      const shadow = registry.shadows.get(enemy.id);
      const outline = registry.outlines.get(enemy.id);
      if (shadow) shadow.visible = false;
      if (outline) outline.visible = false;
      const hpBar = registry.hpBars.get(enemy.id);
      if (hpBar) {
        hpBar.bg.visible = false;
        hpBar.fill.visible = false;
      }
      registry.removeAux(enemy.id);
      continue;
    }

    enemyMesh.visible = true;
    const shadow = registry.shadows.get(enemy.id);
    const outline = registry.outlines.get(enemy.id);
    if (shadow) shadow.visible = true;
    if (outline) outline.visible = true;

    enemyAudio.maybePlayWalk(enemy, enemyAudioNow, state.player.position);
    if (
      enemy.type === 'plant' &&
      enemy.state !== 'telegraphing' &&
      enemy.state !== 'recovering' &&
      eDistSq <= 25
    ) {
      const nextIdleAllowed = plantIdleCooldowns.get(enemy.id) ?? 0;
      if (enemyAudioNow >= nextIdleAllowed) {
        playPlantIdle?.();
        plantIdleCooldowns.set(enemy.id, enemyAudioNow + 3.2 + Math.random() * 1.4);
      }
    } else if (enemy.type !== 'plant') {
      plantIdleCooldowns.delete(enemy.id);
    }
    applyEnemyVisuals({
      enemy,
      state,
      currentTime,
      deltaTime,
      outlinePad,
      enemyVisualProfiles,
      registry,
      getVisualYAt,
      getActorRenderOrder,
      getTexture,
    });
    let auxHandled = updatePlantLashVisual({
      scene,
      assetManager,
      registry,
      enemy,
      state,
      currentTime,
      getVisualYAt,
      getActorRenderOrder,
    });
    auxHandled = updateHollowGuardianAttackVisual({
      scene,
      assetManager,
      registry,
      enemy,
      currentTime,
      getVisualYAt,
      getActorRenderOrder,
    }) || auxHandled;
    // Ridge Revenant summoned blade array - during the bladestorm cast an arc of
    // spectral blades materializes behind the wraith, lifts overhead, points at
    // the player, and converges into firing position as the telegraph completes.
    // The aura is torn down the instant the cast resolves (the real projectiles
    // spawned in Combat take over).
    if (enemy.type === 'ridge_revenant'
        && enemy.state === 'telegraphing'
        && enemy.currentAttackType === 'revenant_bladestorm') {
      auxHandled = true;
      // Aux layout: [0..BLADE_AURA_COUNT-1] = summoned blades, [last] = casting arm.
      // Blade count + fan are kept in lockstep with the projectile volley in Combat.ts.
      const BLADE_AURA_COUNT = 9;
      const ARM_INDEX = BLADE_AURA_COUNT;
      let aura = registry.auxMeshes.get(enemy.id);
      if (!aura) {
        aura = [];
        const bladeTex = assetManager.getTexture('projectile_spectral_blade');
        for (let i = 0; i < BLADE_AURA_COUNT; i++) {
          const bladeMesh = new THREE.Mesh(SharedGeometry.enemy, new THREE.MeshBasicMaterial({
            map: bladeTex,
            transparent: true,
            depthWrite: false,
            color: 0x9be8ff,
          }));
          bladeMesh.position.z = 0.22;
          scene.add(bladeMesh);
          aura.push(bladeMesh);
        }
        // Casting arm overlay - sweeps up toward the aim as the cast charges (the hand-wave).
        const armMesh = new THREE.Mesh(SharedGeometry.enemy, new THREE.MeshBasicMaterial({
          map: assetManager.getTexture('fx_revenant_cast_arm'),
          transparent: true,
          depthWrite: false,
          color: 0xffffff,
        }));
        armMesh.position.z = 0.24;
        scene.add(armMesh);
        aura.push(armMesh);
        registry.auxMeshes.set(enemy.id, aura);
      }
      const castWindup = enemy.telegraphTotal > 0 ? enemy.telegraphTotal : enemy.telegraphDuration;
      const progress = castWindup > 0
        ? Math.min(1, Math.max(0, 1 - enemy.telegraphTimer / castWindup))
        : 0;
      const aim = enemy.attackLockedTarget ?? state.player.position;
      const baseAngle = Math.atan2(aim.y - enemy.position.y, aim.x - enemy.position.x);
      const ex = enemy.position.x;
      const ey = getVisualYAt(enemy.position.x, enemy.position.y) + 0.4;
      const fan = (80 * Math.PI) / 180;
      const ringRadius = 1.5 - progress * 0.55;
      const auraRenderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, 0.5) + 2;
      for (let i = 0; i < BLADE_AURA_COUNT; i++) {
        const bladeMesh = aura[i];
        const fanOffset = -fan / 2 + (fan * i) / (BLADE_AURA_COUNT - 1);
        // Hover behind the wraith (opposite the aim), curving overhead.
        const orbitAngle = baseAngle + Math.PI + fanOffset * 0.7
          + Math.sin(currentTime / 200 + i) * 0.05;
        const r = ringRadius + Math.sin(currentTime / 160 + i * 1.3) * 0.08;
        bladeMesh.position.x = ex + Math.cos(orbitAngle) * r;
        bladeMesh.position.y = ey + Math.sin(orbitAngle) * r * 0.6 + 0.5;
        bladeMesh.position.z = 0.22;
        // Each blade already aims where it will launch.
        bladeMesh.rotation.z = baseAngle + fanOffset;
        const bladeScale = 0.5 + progress * 0.15;
        bladeMesh.scale.set(bladeScale, bladeScale, 1);
        const bladeMat = bladeMesh.material as THREE.MeshBasicMaterial;
        bladeMat.opacity = Math.min(1, progress * 1.6) * (0.7 + Math.sin(currentTime / 90 + i) * 0.3);
        bladeMesh.renderOrder = auraRenderOrder;
        bladeMesh.visible = true;
      }

      // Casting arm: anchored at the wraith's shoulder, it eases from a lowered rest pose
      // up to a fully-extended point toward the aim, with a sharp forward "flick" right
      // before release - selling the gesture that looses the storm.
      const armMesh = aura[ARM_INDEX];
      if (armMesh) {
        const shoulderX = ex + Math.cos(baseAngle) * 0.22;
        const shoulderY = ey + 0.35;
        const restAngle = baseAngle - 1.15;            // arm hangs below the aim line at rest
        const ease = progress * progress * (3 - 2 * progress); // smoothstep
        const flick = progress > 0.82 ? (progress - 0.82) / 0.18 * 0.35 : 0; // overshoot near release
        const armAngle = restAngle + (baseAngle - restAngle) * ease + flick;
        const armLen = 0.55 + progress * 0.25;         // extends as it charges
        armMesh.position.x = shoulderX + Math.cos(armAngle) * armLen * 0.5;
        armMesh.position.y = shoulderY + Math.sin(armAngle) * armLen * 0.5;
        armMesh.position.z = 0.24;
        armMesh.rotation.z = armAngle;
        // Rotation alone aims the +X-pointing arm sprite in any direction - no mirror needed.
        const armScale = 0.85 + progress * 0.2;
        armMesh.scale.set(armScale, armScale, 1);
        const armMat = armMesh.material as THREE.MeshBasicMaterial;
        armMat.opacity = Math.min(1, 0.4 + progress * 0.6);
        armMesh.renderOrder = auraRenderOrder + 1;
        armMesh.visible = true;
      }
    }

    if (!auxHandled && registry.auxMeshes.has(enemy.id)) {
      registry.removeAux(enemy.id);
    }
  }

  const fullyDeadEnemyIds: string[] = [];
  for (const enemy of combatSystem.getAllEnemies()) {
    if (enemy.state === 'dead' && updateDeadEnemyVisual(enemy, registry)) {
      enemyAudio.clearEnemy(enemy.id);
      plantIdleCooldowns.delete(enemy.id);
      fullyDeadEnemyIds.push(enemy.id);
    }
  }

  if (fullyDeadEnemyIds.length > 0) {
    combatSystem.removeDeadEnemiesByIds(fullyDeadEnemyIds);
  }

  // One-shot scripted boulder on the East Ridge Ascent (spawns a projectile that rolls down the
  // climb the first time the player crosses it). Runs before updateProjectiles so it animates
  // and resolves collision this same frame.
  if (!isPlayerDead) {
    updateEastRidgeBoulder({ state, combatSystem, screenShake, particleSystem, playPropBreak });
    // Heresy summoning rituals: materialize a Ridge Revenant when a sufficiently-heretical
    // player (3+ cursed sediment) steps onto a summoning glyph.
    updateRevenantRituals({ state, world, combatSystem, screenShake, particleSystem, deltaTime, currentTime, playRitualSummonStart });
    updateFailedRitualGlyphs({ state, world });
  }

  // Update + render thrown projectiles. A reflected projectile = a parry, so
  // its return value drives the same immersive feedback as a melee parry.
  const projectileParry = combatSystem.updateProjectiles(
    deltaTime,
    state.player.position,
    state.player.iFrameTimer > 0,
    isBlocking,
    blockStartTime,
    world,
  );
  if (projectileParry) {
    fireParryFeedback(projectileParry.x, projectileParry.y, 'projectile');
    playProjectileReflect?.();
  }
  const hazardParry = combatSystem.updateFallingScytheHazards(
    deltaTime,
    state.player.position,
    state.player.iFrameTimer > 0,
    isBlocking,
    blockStartTime,
  );
  if (hazardParry) {
    fireParryFeedback(hazardParry.x, hazardParry.y, 'hazard');
  }

  const projectiles = combatSystem.getProjectiles();
  const liveProjectileIds = liveProjectileIdsScratch;
  liveProjectileIds.clear();
  for (const proj of projectiles) {
    liveProjectileIds.add(proj.id);
    if (!projectileSfxSprites.has(proj.id)) {
      projectileSfxSprites.set(proj.id, proj.sprite);
      if (isBoulderProjectile(proj.sprite, proj.sourceEnemyId)) {
        const count = projectileSfxCounts.get('rock') ?? 0;
        if (count === 0) startBoulderRollLoop?.();
        projectileSfxCounts.set('rock', count + 1);
      } else {
        playProjectileCast?.(proj.sprite);
        const count = projectileSfxCounts.get(proj.sprite) ?? 0;
        if (count === 0) startProjectileFly?.(proj.sprite);
        projectileSfxCounts.set(proj.sprite, count + 1);
      }
    }
    const mesh = registry.acquireProjectile(proj.id, assetManager.getTexture(proj.sprite));
    mesh.position.z = 0.25;
    const reflected = proj.reflected || false;
    const reflectedPulse = reflected ? Math.sin(currentTime / 45) * 0.08 + 1.08 : 1;
    const projectileScale = getProjectileVisualScale(proj.sprite);
    mesh.scale.set(projectileScale.x * reflectedPulse, projectileScale.y * reflectedPulse, 1);
    mesh.position.x = proj.position.x;
    mesh.position.y = getVisualYAt(proj.position.x, proj.position.y) + 0.35;
    mesh.rotation.z = proj.rotation;
    mesh.renderOrder = getActorRenderOrder(proj.position.x, proj.position.y, 0.2);
    // Fade out in the last 0.25s of life so the disappearance reads cleanly.
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.min(1, proj.lifetime / 0.25);
    mat.transparent = true;
    mat.color.setHex(proj.reflected ? 0x88ffff : 0xffffff);
  }

  // Dispose meshes for projectiles that died this frame.
  if (registry.projectileMeshes.size > liveProjectileIds.size) {
    projectileRemovalScratch.length = 0;
    registry.projectileMeshes.forEach((_mesh, id) => {
      if (!liveProjectileIds.has(id)) projectileRemovalScratch.push(id);
    });
    for (const id of projectileRemovalScratch) {
      const sprite = projectileSfxSprites.get(id);
      if (sprite) {
        if (isBoulderProjectile(sprite)) {
          const count = (projectileSfxCounts.get('rock') ?? 1) - 1;
          if (count <= 0) {
            projectileSfxCounts.delete('rock');
            stopBoulderRollLoop?.();
          } else {
            projectileSfxCounts.set('rock', count);
          }
          playBoulderImpact?.();
        } else {
          const count = (projectileSfxCounts.get(sprite) ?? 1) - 1;
          if (count <= 0) {
            projectileSfxCounts.delete(sprite);
            stopProjectileFly?.(sprite);
          } else {
            projectileSfxCounts.set(sprite, count);
          }
          playProjectileImpact?.(sprite);
        }
        projectileSfxSprites.delete(id);
      }
      registry.removeProjectile(id);
    }
  }

  const hazards = combatSystem.getFallingScytheHazards();
  const liveHazardIds = liveHazardIdsScratch;
  liveHazardIds.clear();
  for (const hazard of hazards) {
    liveHazardIds.add(hazard.id);
    const previousHazardState = hazardSfxStates.get(hazard.id);
    if (!previousHazardState) {
      hazardSfxStates.set(hazard.id, hazard.state);
      playHazardWarningPulse?.();
    } else if (previousHazardState !== hazard.state) {
      hazardSfxStates.set(hazard.id, hazard.state);
      if (hazard.state === 'striking') {
        playHazardScytheFall?.();
      }
    }
    const meshes = registry.acquireHazard(
      hazard.id,
      assetManager.getTexture('hazard_scythe_marker'),
      assetManager.getTexture('projectile_scythe_falling'),
    );

    const warningProgress = 1 - hazard.warningTimer / hazard.maxWarningTimer;
    const strikeProgress = hazard.state === 'striking'
      ? 1 - hazard.strikeTimer / hazard.maxStrikeTimer
      : 0;
    const pulse = hazard.state === 'warning'
      ? 0.9 + Math.sin(currentTime / 45) * 0.12 + warningProgress * 0.25
      : 1.2 + Math.sin(currentTime / 25) * 0.08;
    const markerMat = meshes.marker.material as THREE.MeshBasicMaterial;
    markerMat.opacity = hazard.state === 'warning'
      ? 0.35 + warningProgress * 0.45
      : Math.max(0, hazard.strikeTimer / hazard.maxStrikeTimer) * 0.55;
    markerMat.color.setHex(hazard.source === 'eclipse' ? 0xcc44ff : 0x44ffee);
    meshes.marker.visible = true;
    meshes.marker.scale.set(hazard.radius * 2.2 * pulse, hazard.radius * 2.2 * pulse, 1);
    meshes.marker.position.set(hazard.position.x, getVisualYAt(hazard.position.x, hazard.position.y), 0.16);
    meshes.marker.rotation.z = hazard.rotation * 0.25;
    meshes.marker.renderOrder = getActorRenderOrder(hazard.position.x, hazard.position.y, -0.2);

    const scytheMat = meshes.scythe.material as THREE.MeshBasicMaterial;
    meshes.scythe.visible = hazard.state === 'striking' || warningProgress > 0.38;
    if (hazard.state === 'striking') {
      const lift = (1 - strikeProgress) * 0.9;
      const scytheScale = hazard.source === 'eclipse' ? 0.95 : 0.82;
      meshes.scythe.scale.set(scytheScale, scytheScale, 1);
      meshes.scythe.position.set(
        hazard.position.x,
        getVisualYAt(hazard.position.x, hazard.position.y) + 0.4 + lift,
        0.28,
      );
      meshes.scythe.rotation.z = hazard.rotation;
      meshes.scythe.renderOrder = getActorRenderOrder(hazard.position.x, hazard.position.y, 0.3);
      scytheMat.opacity = Math.max(0, hazard.strikeTimer / hazard.maxStrikeTimer);
      scytheMat.color.setHex(hazard.source === 'eclipse' ? 0xff99ff : 0xffffff);
    } else if (meshes.scythe.visible) {
      const fallProgress = Math.max(0, Math.min(1, (warningProgress - 0.38) / 0.62));
      const lift = 2.2 - fallProgress * 1.7;
      const scytheScale = hazard.source === 'eclipse' ? 0.88 : 0.74;
      meshes.scythe.scale.set(scytheScale, scytheScale, 1);
      meshes.scythe.position.set(
        hazard.position.x,
        getVisualYAt(hazard.position.x, hazard.position.y) + 0.4 + lift,
        0.28,
      );
      meshes.scythe.rotation.z = hazard.rotation + Math.sin(currentTime / 70) * 0.08;
      meshes.scythe.renderOrder = getActorRenderOrder(hazard.position.x, hazard.position.y, 0.3);
      scytheMat.opacity = 0.12 + fallProgress * 0.68;
      scytheMat.color.setHex(hazard.source === 'eclipse' ? 0xdd99ff : 0xdffcff);
    }
  }

  if (registry.hazardMeshes.size > liveHazardIds.size) {
    hazardRemovalScratch.length = 0;
    registry.hazardMeshes.forEach((_mesh, id) => {
      if (!liveHazardIds.has(id)) hazardRemovalScratch.push(id);
    });
    for (const id of hazardRemovalScratch) {
      if (hazardSfxStates.delete(id)) {
        playHazardScytheImpact?.();
      }
      registry.removeHazard(id);
    }
  }

  if (state.player.health <= 0 && !isPlayerDead) {
    // Last Breath Charm - auto-consume to pull the player back from a killing blow.
    // Hard cap of one revive per life (cleared on bonfire rest or true death). Without
    // the cap, a stacked inventory of charms would trivialise mortality entirely.
    const charmIdx = state.player.lastBreathUsedThisLife
      ? -1
      : state.inventory.findIndex(i => i.id === 'last_breath_charm');
    if (charmIdx >= 0) {
      state.inventory.splice(charmIdx, 1);
      if (state.activeItemIndex >= state.inventory.length) {
        state.activeItemIndex = Math.max(0, state.inventory.length - 1);
      }
      state.player.lastBreathUsedThisLife = true;
      state.player.health = 1;
      state.player.iFrameTimer = 1.5;
      particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
      screenShake.shake(0.3, 0.25);
      return {
        playerDied: false,
        lostEssence: 0,
        lastBreathTriggered: true,
      };
    }

    const lostEssence = state.player.essence;
    if (lostEssence > 0) {
      state.droppedEssence = {
        mapId: state.currentMap,
        x: state.player.position.x,
        y: state.player.position.y,
        amount: lostEssence,
      };
      state.player.essence = 0;
    } else {
      state.droppedEssence = null;
    }

    // Per-life reset: the Ironbark Band's parry-built reveal bonus is lost on death.
    state.player.ironbarkParryStacks = 0;

    return {
      playerDied: true,
      lostEssence,
    };
  }

  return {
    playerDied: false,
    lostEssence: 0,
  };
}
