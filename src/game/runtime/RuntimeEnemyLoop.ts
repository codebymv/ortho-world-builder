import * as THREE from 'three';
import { SharedGeometry } from '@/lib/game/AssetManager';
import { applyEnemyVisuals, updateDeadEnemyVisual } from '@/game/runtime/EnemyVisualSystem';
import type { EnemyLoopContext } from '@/game/runtime/RuntimePhaseContexts';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import { getClimbVisualElevation } from '@/game/runtime/PlayerSimulationSystem';

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
      const REAVER_CORNERS = [
        { x: -7, y: -7 },
        { x:  6, y: -7 },
        { x: -7, y:  6 },
        { x:  6, y:  6 },
      ];

      if (enemy.type === 'golem' && phase === 2) {
        screenShake.shake(0.9, 0.5);
        screenShake.hitStop(0.35);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 50, 0x997755, 0.12, 2.4, 1.6);
        return;
      }

      if (enemy.type === 'corrupted_giant' && phase === 2) {
        floatingText.spawn(enemy.position.x, enemy.position.y + 1.6, 'ENRAGED!', '#CC44FF', 24);
        screenShake.shake(1.0, 0.55);
        screenShake.hitStop(0.4);
        // Violet corruption burst — veins rupture outward
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 70, 0x7B3FA0, 0.14, 3.0, 2.0);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.3, 30, 0xCC6EF0, 0.08, 2.0, 1.4);
        return;
      }

      if (phase === 2) {
        floatingText.spawn(enemy.position.x, enemy.position.y + 1.2, 'Rise, my shades...', '#44FFEE', 20);
        screenShake.shake(0.6, 0.3);
        screenShake.hitStop(0.3);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 20, 0x44FFEE, 0.1, 1.8, 1.2);
        // Summon 2 Hollow Shades flanking the boss
        for (const off of [{ x: -2.5, y: -1.5 }, { x: 2.5, y: 1.5 }]) {
          spawnShade(off);
        }
        // Reavers respawn in the 4 arena corners alongside the shades.
        for (const corner of REAVER_CORNERS) {
          particleSystem.emitAt(corner.x, corner.y, 0.4, 10, 0xCC44FF, 0.1, 1.4, 1.0);
          spawnReaverAt(corner);
        }
      }

      if (phase === 3) {
        floatingText.spawn(enemy.position.x, enemy.position.y + 1.2, 'Darkness consumes all...', '#44FFEE', 20);
        screenShake.shake(0.8, 0.4);
        screenShake.hitStop(0.4);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 35, 0x44FFEE, 0.12, 2.2, 1.5);
        // Summon 3 Hollow Shades surrounding the boss
        for (const off of [{ x: -3.0, y: 0.0 }, { x: 1.5, y: -2.5 }, { x: 1.5, y: 2.5 }]) {
          spawnShade(off);
        }
        // Reavers respawn in the 4 arena corners alongside the shades.
        for (const corner of REAVER_CORNERS) {
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

  if (combatResult.parried && combatResult.parryEnemyId) {
    const parriedEnemy = combatSystem.getEnemies().find(e => e.id === combatResult.parryEnemyId);
    if (parriedEnemy) {
      floatingText.spawn(parriedEnemy.position.x, parriedEnemy.position.y + 0.5, 'PARRY!', '#00FFCC', 22);
      screenShake.shake(0.3, 0.1);
      screenShake.hitStop(0.08);
      particleSystem.emitSparklesAt(parriedEnemy.position.x, parriedEnemy.position.y, 0.3);
      particleSystem.emitAt(parriedEnemy.position.x, parriedEnemy.position.y, 0.4, 6, 0xFFD700, 0.5, 1.2, 1.0);
    }
  }

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
      enemy.type === 'ashen_reaver' || enemy.type === 'corrupted_giant';
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
        floatingText.spawn(enemy.position.x, enemy.position.y + 1.5, 'HOLLOW ECLIPSE', '#44FFEE', 24);
        screenShake.shake(0.55, 0.35);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 45, 0x44ffee, 0.18, 2.6, 1.8);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.4, 25, 0xcc44ff, 0.14, 2.2, 1.4);
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

  // Update + render thrown projectiles.
  combatSystem.updateProjectiles(
    deltaTime,
    state.player.position,
    state.player.iFrameTimer > 0,
    isBlocking,
    blockStartTime,
    world,
  );
  combatSystem.updateFallingScytheHazards(
    deltaTime,
    state.player.position,
    state.player.iFrameTimer > 0,
    isBlocking,
    blockStartTime,
  );

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
      floatingText.spawn(state.player.position.x, state.player.position.y + 0.8, 'LAST BREATH!', '#FF5252', 28);
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
