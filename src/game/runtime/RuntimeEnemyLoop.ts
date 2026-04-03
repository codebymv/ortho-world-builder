import * as THREE from 'three';
import { SharedGeometry } from '@/lib/game/AssetManager';
import type { Enemy } from '@/lib/game/Combat';
import { applyEnemyVisuals, updateDeadEnemyVisual } from '@/game/runtime/EnemyVisualSystem';
import type { EnemyLoopContext } from '@/game/runtime/RuntimePhaseContexts';

interface RunEnemyLoopOptions extends EnemyLoopContext {
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
  shadowGeometry,
  shadowMaterial,
  createOutlineMesh,
  getVisualYAt,
  getActorRenderOrder,
}: RunEnemyLoopOptions) {
  const playerHealthBeforeUpdate = state.player.health;
  const combatResult = combatSystem.updateEnemies(
    deltaTime,
    state.player.position,
    state.player.iFrameTimer > 0,
    isBlocking,
    blockStartTime,
    world,
    (enemy, phase) => {
      if (phase === 2) {
        floatingText.spawn(enemy.position.x, enemy.position.y + 1.0, 'The Guardian awakens...', '#CE93D8', 20);
        screenShake.shake(0.6, 0.3);
        screenShake.hitStop(0.3);
      }
    },
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
      particleSystem.emitSparkles(new THREE.Vector3(parriedEnemy.position.x, parriedEnemy.position.y, 0.3));
      particleSystem.emit(new THREE.Vector3(parriedEnemy.position.x, parriedEnemy.position.y, 0.4), 6, 0xFFD700, 0.5, 1.2, 1.0);
    }
  }

  const enemies = combatSystem.getEnemies();
  const enemyAudioNow = currentTime / 1000;
  const VISUAL_RANGE_SQ = 36 * 36;
  const px = state.player.position.x;
  const py = state.player.position.y;

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

      const enemyOutline = createOutlineMesh(enemyGeometry, enemyTexture);
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
      getOrCreateHPBar: () => registry.getOrCreateHPBar(enemy.id),
      getVisualYAt,
      getActorRenderOrder,
      getTexture: key => assetManager.getTexture(key),
    });
  }

  const fullyDeadEnemyIds = new Set<string>();
  for (const enemy of combatSystem.getAllEnemies()) {
    if (enemy.state === 'dead' && updateDeadEnemyVisual(enemy, registry)) {
      enemyAudio.clearEnemy(enemy.id);
      fullyDeadEnemyIds.add(enemy.id);
    }
  }

  if (fullyDeadEnemyIds.size > 0) {
    combatSystem.removeDeadEnemiesByIds(Array.from(fullyDeadEnemyIds));
  }

  if (state.player.health <= 0 && !isPlayerDead) {
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
