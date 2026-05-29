import * as THREE from 'three';
import { SharedGeometry } from '@/lib/game/AssetManager';
import { applyEnemyVisuals, updateDeadEnemyVisual } from '@/game/runtime/EnemyVisualSystem';
import type { EnemyLoopContext } from '@/game/runtime/RuntimePhaseContexts';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import { getClimbVisualElevation } from '@/game/runtime/PlayerSimulationSystem';
import { updateEastRidgeBoulder } from '@/game/runtime/EastRidgeBoulder';

const announcedHollowEclipses = new Set<number>();
type BossSfxState = { state: string; type: string | undefined; phase: number | undefined; combo: number | undefined };
const bossAttackSfxKeys = new Map<string, BossSfxState>();
const liveProjectileIdsScratch = new Set<string>();
const liveHazardIdsScratch = new Set<string>();
const projectileRemovalScratch: string[] = [];
const hazardRemovalScratch: string[] = [];

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
  playPropBreak,
  shadowGeometry,
  shadowMaterial,
  createOutlineMesh,
  getVisualYAt,
  getActorRenderOrder,
}: RunEnemyLoopOptions) {
  const playerHealthBeforeUpdate = state.player.health;
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
      // Two Reavers per wave, corners vary by phase so each summon creates a different
      // crossfire angle. Phase 2 flanks the player's entry side (south corners); phase 3
      // creates a diagonal from NW → SE to force repositioning.
      const REAVER_CORNERS_PHASE2 = [
        { x: -7, y:  6 }, // SW
        { x:  6, y:  6 }, // SE
      ];
      const REAVER_CORNERS_PHASE3 = [
        { x: -7, y: -7 }, // NW
        { x:  6, y:  6 }, // SE (diagonal crossfire)
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
        // Violet corruption burst — veins rupture outward
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 70, 0x7B3FA0, 0.14, 3.0, 2.0);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.3, 30, 0xCC6EF0, 0.08, 2.0, 1.4);
        return;
      }

      if (phase === 2) {
        screenShake.shake(0.6, 0.3);
        screenShake.hitStop(0.3);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 20, 0x44FFEE, 0.1, 1.8, 1.2);
        // Summon 2 Hollow Shades flanking the boss
        for (const off of [{ x: -2.5, y: -1.5 }, { x: 2.5, y: 1.5 }]) {
          spawnShade(off);
        }
        // Two Reavers spawn at the south (player-entry) corners — flanks the player's
        // retreat line and forces them to fight toward the boss to clear the pressure.
        for (const corner of REAVER_CORNERS_PHASE2) {
          particleSystem.emitAt(corner.x, corner.y, 0.4, 10, 0xCC44FF, 0.1, 1.4, 1.0);
          spawnReaverAt(corner);
        }
      }

      if (phase === 3) {
        screenShake.shake(0.8, 0.4);
        screenShake.hitStop(0.4);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 35, 0x44FFEE, 0.12, 2.2, 1.5);
        // Summon 3 Hollow Shades surrounding the boss
        for (const off of [{ x: -3.0, y: 0.0 }, { x: 1.5, y: -2.5 }, { x: 1.5, y: 2.5 }]) {
          spawnShade(off);
        }
        // Two Reavers at NW + SE — diagonal crossfire that forces the player off any
        // safe axis they've been using, raising stakes for the final phase.
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

  if (state.player.health < playerHealthBeforeUpdate) {
    playPlayerHit();
  }

  /**
   * Fire fully immersive parry feedback at a world position. No floating text —
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
    screenShake.shake(shakeIntensity, shakeDuration);
    screenShake.hitStop(stopDuration);
    particleSystem.emitSparklesAt(x, y, 0.3);
    particleSystem.emitAt(x, y, 0.4, goldCount, 0xFFD700, 0.55, goldSpeed, 1.0);
    if (ringCount > 0) {
      // Thin ring of bright sparks at the impact point — reads as the deflected
      // edge of the strike spraying outward.
      particleSystem.emitAt(x, y, 0.42, ringCount, ringColor, 0.4, goldSpeed * 1.3, 1.6);
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
  // Silence the unused-import: floatingText is still wired through the context
  // for damage numbers elsewhere; the parry path intentionally no longer uses it.
  void floatingText;

  const enemies = combatSystem.getEnemies();
  const enemyAudioNow = currentTime / 1000;
  const VISUAL_RANGE_SQ = 36 * 36;
  const px = state.player.position.x;
  const py = state.player.position.y;
  const getTexture = (key: string): THREE.Texture | null => assetManager.getTexture(key) ?? null;

  for (const enemy of enemies) {
    const edx = enemy.position.x - px;
    const edy = enemy.position.y - py;
    const eDistSq = edx * edx + edy * edy;

    const existingVisuals = registry.meshes.get(enemy.id);
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
      continue;
    }

    let enemyMesh = existingVisuals;

    const isBossType = enemy.type === 'hollow_guardian' || enemy.type === 'golem' ||
      enemy.type === 'ashen_reaver' || enemy.type === 'corrupted_giant' ||
      enemy.type === 'stone_sentinel';
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

    if (enemy.type === 'hollow_guardian' && enemy.state === 'slamming' && enemy.currentAttackType === 'hail_mary') {
      const eclipsePhase = enemy.phase ?? 1;
      if (!announcedHollowEclipses.has(eclipsePhase)) {
        announcedHollowEclipses.add(eclipsePhase);
        screenShake.shake(0.55, 0.35);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 45, 0x44ffee, 0.18, 2.6, 1.8);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.4, 25, 0xcc44ff, 0.14, 2.2, 1.4);
      }
    }

    // Committed-attack lock indicator — paints the impact tile with rising
    // dust so the player can read where to sidestep. Throttled to ~once per
    // 4 frames to keep particle count reasonable.
    if (enemy.state === 'telegraphing' && enemy.attackLockedTarget &&
        (enemy.currentAttackType === 'sentinel_slab' ||
         enemy.currentAttackType === 'golem_stomp')) {
      const t = enemy.attackLockedTarget;
      // Use the rotation field for a per-enemy phase so the emit fires
      // asynchronously across multiple sentinels.
      const phase = Math.floor((currentTime + enemy.position.x * 17) / 60) % 4;
      if (phase === 0) {
        const color = enemy.currentAttackType === 'sentinel_slab' ? 0xA68A5A : 0x7C6A52;
        particleSystem.emitAt(t.x, t.y, 0.1, 4, color, 0.35, 0.9, 0.6);
      }
    }
    // Dash-attack motion trail — leaves a streak behind committed dashes so
    // the slide reads as kinetic rather than a snap teleport.
    if (enemy.state === 'telegraphing' &&
        (enemy.currentAttackType === 'giant_lunge' ||
         enemy.currentAttackType === 'reaver_rush' ||
         enemy.currentAttackType === 'golem_grab')) {
      const phase = Math.floor((currentTime + enemy.position.y * 19) / 50) % 3;
      if (phase === 0) {
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.2, 3, 0x5C4836, 0.3, 0.7, 0.5);
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

    if (!enemyMesh.visible) {
      enemyMesh.visible = true;
      const shadow = registry.shadows.get(enemy.id);
      const outline = registry.outlines.get(enemy.id);
      if (shadow) shadow.visible = true;
      if (outline) outline.visible = true;
    }

    enemyAudio.maybePlayWalk(enemy, enemyAudioNow, state.player.position);
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
  }

  const fullyDeadEnemyIds: string[] = [];
  for (const enemy of combatSystem.getAllEnemies()) {
    if (enemy.state === 'dead' && updateDeadEnemyVisual(enemy, registry)) {
      enemyAudio.clearEnemy(enemy.id);
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
    let mesh = registry.projectileMeshes.get(proj.id);
    if (!mesh) {
      const tex = assetManager.getTexture(proj.sprite);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      mesh = new THREE.Mesh(SharedGeometry.enemy, mat);
      mesh.position.z = 0.25;
      scene.add(mesh);
      registry.projectileMeshes.set(proj.id, mesh);
    }
    const reflectedPulse = proj.reflected ? Math.sin(currentTime / 45) * 0.08 + 1.08 : 1;
    mesh.scale.set(0.55 * reflectedPulse, 0.55 * reflectedPulse, 1);
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
    for (const id of projectileRemovalScratch) registry.removeProjectile(id);
  }

  const hazards = combatSystem.getFallingScytheHazards();
  const liveHazardIds = liveHazardIdsScratch;
  liveHazardIds.clear();
  for (const hazard of hazards) {
    liveHazardIds.add(hazard.id);
    let meshes = registry.hazardMeshes.get(hazard.id);
    if (!meshes) {
      const markerTex = assetManager.getTexture('hazard_scythe_marker');
      const scytheTex = assetManager.getTexture('projectile_scythe_falling');
      const marker = new THREE.Mesh(SharedGeometry.enemy, new THREE.MeshBasicMaterial({
        map: markerTex,
        transparent: true,
        depthWrite: false,
        color: 0x88ffff,
      }));
      const scythe = new THREE.Mesh(SharedGeometry.enemy, new THREE.MeshBasicMaterial({
        map: scytheTex,
        transparent: true,
        depthWrite: false,
      }));
      marker.position.z = 0.16;
      scythe.position.z = 0.28;
      scene.add(marker);
      scene.add(scythe);
      meshes = { marker, scythe };
      registry.hazardMeshes.set(hazard.id, meshes);
    }

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
    meshes.marker.scale.set(hazard.radius * 2 * pulse, hazard.radius * 2 * pulse, 1);
    meshes.marker.position.set(hazard.position.x, getVisualYAt(hazard.position.x, hazard.position.y), 0.16);
    meshes.marker.rotation.z = hazard.rotation * 0.25;
    meshes.marker.renderOrder = getActorRenderOrder(hazard.position.x, hazard.position.y, -0.2);

    const scytheMat = meshes.scythe.material as THREE.MeshBasicMaterial;
    meshes.scythe.visible = hazard.state === 'striking';
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
    }
  }

  if (registry.hazardMeshes.size > liveHazardIds.size) {
    hazardRemovalScratch.length = 0;
    registry.hazardMeshes.forEach((_mesh, id) => {
      if (!liveHazardIds.has(id)) hazardRemovalScratch.push(id);
    });
    for (const id of hazardRemovalScratch) registry.removeHazard(id);
  }

  if (state.player.health <= 0 && !isPlayerDead) {
    // Last Breath Charm — auto-consume to pull the player back from a killing blow.
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
