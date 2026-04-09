import * as THREE from 'three';
import type { Enemy } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';
import type { EnemyVisualRegistry, EnemyHPBar } from '@/game/runtime/EnemyVisualRegistry';

type EnemyVisualProfile = {
  baseScale: number;
  footOffset: number;
  strideAmp: number;
  bobAmp: number;
  squashAmp: number;
  leanAmp: number;
  hpBarOffset: number;
};

interface ApplyEnemyVisualsOptions {
  enemy: Enemy;
  state: GameState;
  currentTime: number;
  deltaTime: number;
  outlinePad: number;
  enemyVisualProfiles: Record<string, EnemyVisualProfile>;
  registry: EnemyVisualRegistry;
  getOrCreateHPBar: () => EnemyHPBar;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  getTexture: (key: string) => THREE.Texture | null;
}

function resolveSpriteKey(enemy: Enemy, enemyType: string): string {
  if (enemyType === 'bandit' || enemyType === 'skeleton_captain') {
    const animState = enemy.state === 'telegraphing'
      ? 'charge'
      : enemy.state === 'recovering' && enemy.attackAnimationTimer > 0
        ? 'attack'
        : enemy.moveBlend > 0.25
          ? 'walk'
          : 'idle';
    const animFrame = animState === 'walk'
      ? Math.floor(enemy.moveCycle * 2.4) % 2
      : animState === 'charge'
        ? Math.min(2, Math.floor((1 - enemy.telegraphTimer / enemy.telegraphDuration) * 3))
        : animState === 'attack'
          ? 1
          : 0;
    return `enemy_${enemyType}_${enemy.facing}_${animState}_${animFrame}`;
  }
  if (enemyType === 'golem') {
    const phase = ((enemy as any).phase as number ?? 1);
    const prefix = phase >= 2 ? 'enemy_golem_phase2' : 'enemy_golem';
    if (enemy.state === 'staggered') return `${prefix}_stagger`;
    if (enemy.state === 'telegraphing') return `${prefix}_telegraph`;
    if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return `${prefix}_attack`;
    if (enemy.moveBlend > 0.25) {
      const frame = Math.floor(enemy.moveCycle * 0.4) % 2;
      return `${prefix}_walk_${frame}`;
    }
    return prefix;
  }
  if (enemyType === 'stone_sentinel') {
    if (enemy.state === 'staggered') return 'enemy_stone_sentinel_stagger';
    if (enemy.state === 'telegraphing') return 'enemy_stone_sentinel_telegraph';
    if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return 'enemy_stone_sentinel_attack';
    if (enemy.moveBlend > 0.25) {
      const frame = Math.floor(enemy.moveCycle * 0.5) % 2;
      return `enemy_stone_sentinel_walk_${frame}`;
    }
    return 'enemy_stone_sentinel';
  }
  if (enemy.state === 'telegraphing') return `${enemy.sprite}_telegraph`;
  if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return `${enemy.sprite}_attack`;
  return enemy.sprite;
}

export function applyEnemyVisuals({
  enemy,
  state,
  currentTime,
  deltaTime,
  outlinePad,
  enemyVisualProfiles,
  registry,
  getOrCreateHPBar,
  getVisualYAt,
  getActorRenderOrder,
  getTexture,
}: ApplyEnemyVisualsOptions) {
  const enemyMesh = registry.meshes.get(enemy.id);
  if (!enemyMesh) return;

  const mat = enemyMesh.material as THREE.MeshBasicMaterial;
  const enemyType = enemy.sprite.replace('enemy_', '');
  const visual = enemyVisualProfiles[enemyType] ?? enemyVisualProfiles.wolf;
  const seed = parseFloat(enemy.id.split('_')[1] || '0') * 0.001;

  const spriteKey = resolveSpriteKey(enemy, enemyType);
  let enemyTex = getTexture(spriteKey);
  if (!enemyTex) {
    const fallbackKey = enemy.state === 'telegraphing'
      ? `${enemy.sprite}_telegraph`
      : enemy.state === 'recovering' && enemy.attackAnimationTimer > 0
        ? `${enemy.sprite}_attack`
        : enemy.sprite;
    enemyTex = getTexture(fallbackKey);
  }
  if (enemyTex && mat.map !== enemyTex) {
    mat.map = enemyTex;
  }

  const bossPhase = (enemyType === 'hollow_guardian' || enemyType === 'golem')
    ? ((enemy as any).phase as number ?? 1)
    : 1;
  const isPhase2 = bossPhase === 2;
  const isPhase3 = bossPhase === 3;
  const isGolem = enemyType === 'golem';
  const isStoneSentinel = enemyType === 'stone_sentinel';

  if (isGolem || isStoneSentinel) {
    // Distinct sprite frames handle all state cues — no color tinting
    if (enemy.damageFlashTimer > 0) {
      enemy.damageFlashTimer -= deltaTime;
      mat.opacity = 0.5 + Math.abs(Math.sin(enemy.damageFlashTimer * 25)) * 0.5;
    } else {
      mat.opacity = 1.0;
    }
    mat.color.setHex(0xffffff);
  } else if (enemy.damageFlashTimer > 0) {
    enemy.damageFlashTimer -= deltaTime;
    mat.color.setHex(0xff0000);
  } else if (enemy.state === 'telegraphing') {
    const flashPhase = enemy.telegraphTimer / enemy.telegraphDuration;
    if (isPhase3) {
      const flash = Math.sin(flashPhase * Math.PI * 10) * 0.45 + 0.55;
      mat.color.setRGB(flash * 0.4, flash, flash);
    } else if (isPhase2) {
      const flash = Math.sin(flashPhase * Math.PI * 8) * 0.4 + 0.6;
      mat.color.setRGB(flash * 0.3, flash, flash);
    } else {
      const flash = Math.sin(flashPhase * Math.PI * 6) * 0.3 + 0.7;
      mat.color.setRGB(1, flash, flash);
    }
  } else if (enemy.state === 'staggered') {
    mat.color.setHex(0xaaaaee);
  } else if ((enemy.state as string) === 'slamming') {
    const novaTimer = (enemy as any).novaSlamTimer as number ?? 0;
    const novaProgress = 1 - novaTimer / 0.5;
    const flash = Math.sin(novaProgress * Math.PI * 6) * 0.4 + 0.6;
    mat.color.setRGB(flash * 0.5, flash * 0.2, flash);
  } else if (isPhase3) {
    const pulse = Math.sin(currentTime / 200) * 0.15 + 0.85;
    mat.color.setRGB(pulse * 0.3, pulse, pulse);
    mat.opacity = 0.75 + Math.sin(currentTime / 120) * 0.15;
    mat.transparent = true;
  } else if (isPhase2) {
    const pulse = Math.sin(currentTime / 350) * 0.08 + 0.92;
    mat.color.setRGB(pulse * 0.35, pulse, pulse);
  } else {
    mat.color.setHex(0xffffff);
    mat.opacity = 1.0;
  }

  let finalEnemyX = enemy.position.x;
  let finalEnemyY = getVisualYAt(enemy.position.x, enemy.position.y);
  let scaleX = visual.baseScale;
  let scaleY = visual.baseScale;
  let rotation = 0;
  const moveWave = Math.sin(enemy.moveCycle);
  const stride = Math.abs(moveWave) * enemy.moveBlend;
  const lateralBias = Math.abs(enemy.velocity.x) > 0.001 ? Math.sign(enemy.velocity.x) : 0;

  if (enemy.state === 'chasing' || enemy.moveBlend > 0.2) {
    finalEnemyY += stride * visual.bobAmp;
    finalEnemyX += moveWave * visual.strideAmp * (enemyType === 'spider' ? 1 : lateralBias * 0.5);
    scaleX *= 1 - stride * visual.squashAmp;
    scaleY *= 1 + stride * visual.squashAmp * 1.35;
    rotation = moveWave * visual.leanAmp * (lateralBias !== 0 ? lateralBias : 1);

    switch (enemyType) {
      case 'shadow':
        finalEnemyY += Math.sin(currentTime / 180 + seed) * 0.05;
        finalEnemyX += Math.cos(currentTime / 220 + seed) * 0.025;
        scaleX *= 1 + stride * 0.02;
        scaleY *= 1 - stride * 0.02;
        rotation *= 0.4;
        break;
      case 'slime':
        finalEnemyY += stride * 0.02;
        scaleX *= 1 + stride * 0.08;
        scaleY *= 1 - stride * 0.08;
        rotation = moveWave * 0.015;
        break;
      case 'spider':
        finalEnemyY += Math.sin(enemy.moveCycle * 2) * 0.012;
        rotation = moveWave * 0.03;
        break;
      case 'golem': {
        const golemStep = Math.abs(Math.sin(enemy.moveCycle * 0.9));
        finalEnemyY += golemStep * 0.1;
        scaleX *= 1 + golemStep * 0.08;
        scaleY *= 1 - golemStep * 0.1;
        finalEnemyX += Math.sin(enemy.moveCycle * 0.9) * visual.strideAmp * (lateralBias !== 0 ? lateralBias * 0.8 : 0.4);
        rotation = Math.sin(enemy.moveCycle * 0.9) * 0.08 * (lateralBias !== 0 ? lateralBias : 1);
        break;
      }
      case 'stone_sentinel': {
        const sentinelStep = Math.abs(Math.sin(enemy.moveCycle * 1.2));
        finalEnemyY += sentinelStep * 0.06;
        scaleX *= 1 + sentinelStep * 0.05;
        scaleY *= 1 - sentinelStep * 0.07;
        finalEnemyX += Math.sin(enemy.moveCycle * 1.2) * visual.strideAmp * (lateralBias !== 0 ? lateralBias * 0.6 : 0.3);
        rotation = Math.sin(enemy.moveCycle * 1.2) * 0.05 * (lateralBias !== 0 ? lateralBias : 1);
        break;
      }
      case 'hollow_guardian':
        // Shade-like ethereal float — glides rather than stomps
        finalEnemyY += Math.sin(currentTime / 200 + seed) * 0.06;
        finalEnemyX += Math.cos(currentTime / 250 + seed) * 0.03;
        scaleX *= 1 + stride * 0.02;
        scaleY *= 1 - stride * 0.02;
        rotation *= 0.3;
        break;
      case 'plant':
        finalEnemyX += Math.sin(currentTime / 260 + seed) * 0.02;
        rotation = moveWave * 0.025;
        break;
    }
  } else if (enemy.state === 'telegraphing') {
    const telegraphProgress = 1 - enemy.telegraphTimer / enemy.telegraphDuration;
    const dx = state.player.position.x - enemy.position.x;
    const dy = state.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const isBoss = enemyType === 'hollow_guardian';
    const isSweep = (enemy as any).currentAttackType === 'sweep';
    const phaseMultiplier = isPhase3 ? 1.4 : isPhase2 ? 1.15 : 1.0;
    const scaleSwellX = ((isBoss ? 0.28 : isGolem ? 0.22 : 0.15) + (isSweep ? 0.18 : 0)) * phaseMultiplier;
    const scaleSwellY = ((isBoss ? 0.22 : isGolem ? 0.18 : 0.12) - (isSweep ? 0.06 : 0)) * phaseMultiplier;
    const windUp = isBoss ? 0.3 : isGolem ? 0.25 : 0.15;
    const shakeBase = ((isBoss ? 0.07 : isGolem ? 0.06 : 0.03) + (isSweep ? 0.04 : 0)) * phaseMultiplier;

    const pulseBeat = telegraphProgress < 0.5
      ? Math.sin(telegraphProgress * Math.PI * 4) * 0.08
      : 0;
    scaleX *= 1 + telegraphProgress * scaleSwellX + pulseBeat;
    scaleY *= 1 - telegraphProgress * scaleSwellY + pulseBeat * 0.5;

    const windUpDist = telegraphProgress * windUp;
    finalEnemyX += (dx / dist) * -windUpDist;
    finalEnemyY += (dy / dist) * -windUpDist;

    const shakeIntensity = shakeBase * telegraphProgress * telegraphProgress;
    finalEnemyX += Math.sin(currentTime / 25 + seed) * shakeIntensity;
    finalEnemyY += Math.cos(currentTime / 30 + seed) * shakeIntensity;
    if (isSweep) {
      finalEnemyX += Math.sin(currentTime / 12 + seed) * 0.08 * telegraphProgress;
    }
    rotation = Math.atan2(dy, dx) * (isBoss ? 0.12 : 0.08) * telegraphProgress;
  } else if (enemy.state === 'recovering') {
    if (enemy.attackAnimationTimer > 0) {
      enemy.attackAnimationTimer -= deltaTime;
      const dx = state.player.position.x - enemy.position.x;
      const dy = state.player.position.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const isBoss = enemyType === 'hollow_guardian';
        const lungeDist = isBoss ? 0.7 : 0.4;
        const lungeProgress = enemy.attackAnimationTimer / 0.3;
        const lungeDistance = Math.sin(lungeProgress * Math.PI) * lungeDist;
        finalEnemyX += (dx / dist) * lungeDistance;
        finalEnemyY += (dy / dist) * lungeDistance;
        if (isBoss) {
          scaleX *= 1 + Math.sin(lungeProgress * Math.PI) * 0.1;
          scaleY *= 1 - Math.sin(lungeProgress * Math.PI) * 0.15;
        }
      }
    }
    const recoverProgress = enemy.recoverTimer / enemy.recoverDuration;
    scaleX *= 0.92 + recoverProgress * 0.08;
    scaleY *= 0.88 + recoverProgress * 0.12;
    rotation = Math.sin(currentTime / 90 + seed) * 0.02;
  } else if (enemy.state === 'charging') {
    scaleX *= 1.15;
    scaleY *= 0.85;
    const shakeAmt = 0.05;
    finalEnemyX += Math.sin(currentTime / 15 + seed) * shakeAmt;
    finalEnemyY += Math.cos(currentTime / 20 + seed) * shakeAmt * 0.5;
  } else if ((enemy.state as string) === 'slamming') {
    const novaTimer = (enemy as any).novaSlamTimer as number ?? 0;
    const novaProgress = 1 - novaTimer / 0.5;
    const expand = Math.sin(novaProgress * Math.PI) * 0.35;
    scaleX *= 1 + expand;
    scaleY *= 1 + expand;
    const shakeAmt = 0.06 * novaProgress * novaProgress;
    finalEnemyX += Math.sin(currentTime / 10 + seed) * shakeAmt;
    finalEnemyY += Math.cos(currentTime / 12 + seed) * shakeAmt;
    finalEnemyY += Math.sin(novaProgress * Math.PI * 3) * 0.04;
  } else {
    const breathe = Math.sin(currentTime / 800 + seed * 3);
    if (enemyType === 'hollow_guardian') {
      // Deep, slow ethereal float — like a giant shade hovering
      finalEnemyY += breathe * 0.06;
      finalEnemyX += Math.cos(currentTime / 700 + seed) * 0.025;
      scaleX *= 1 + breathe * 0.018;
      scaleY *= 1 - breathe * 0.018;
    } else if (enemyType === 'shadow') {
      finalEnemyY += breathe * 0.05;
      finalEnemyX += Math.cos(currentTime / 900 + seed) * 0.02;
      scaleX *= 1 + breathe * 0.012;
      scaleY *= 1 - breathe * 0.012;
    } else if (enemyType === 'slime') {
      finalEnemyY += Math.abs(breathe) * 0.025;
      scaleX *= 1 + Math.abs(breathe) * 0.04;
      scaleY *= 1 - Math.abs(breathe) * 0.04;
    } else if (enemyType === 'spider') {
      finalEnemyX += breathe * 0.015;
      rotation = breathe * 0.02;
    } else if (enemyType === 'stone_sentinel') {
      const sentinelBreath = Math.sin(currentTime / 1000 + seed * 3);
      finalEnemyY += sentinelBreath * 0.028;
      scaleX *= 1 + sentinelBreath * 0.02;
      scaleY *= 1 - sentinelBreath * 0.018;
      rotation = sentinelBreath * 0.006;
    } else if (enemyType === 'golem') {
      const slowBreath = Math.sin(currentTime / 1200 + seed * 3);
      finalEnemyY += slowBreath * 0.035;
      scaleX *= 1 + slowBreath * 0.025;
      scaleY *= 1 - slowBreath * 0.02;
      rotation = slowBreath * 0.008;
    } else {
      finalEnemyY += breathe * 0.02;
      scaleX *= 1 + breathe * 0.015;
      scaleY *= 1 - breathe * 0.015;
    }
  }

  enemyMesh.rotation.z = rotation;
  enemyMesh.scale.set(scaleX, scaleY, 1);
  enemyMesh.position.set(finalEnemyX, finalEnemyY, 0.2);
  enemyMesh.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, visual.footOffset);

  const shadow = registry.shadows.get(enemy.id);
  if (shadow) {
    shadow.position.set(finalEnemyX, finalEnemyY - visual.footOffset * 0.7, 0.05);
  }

  const outline = registry.outlines.get(enemy.id);
  if (outline) {
    outline.position.set(finalEnemyX, finalEnemyY, 0.19);
    outline.scale.set(scaleX * outlinePad, scaleY * outlinePad, 1);
    outline.rotation.z = rotation;
    outline.renderOrder = enemyMesh.renderOrder - 1;
  }

  const hpBar = getOrCreateHPBar();
  const hpRatio = enemy.health / enemy.maxHealth;
  const barY = finalEnemyY + visual.hpBarOffset;
  hpBar.bg.position.set(finalEnemyX, barY, 0.35);
  hpBar.fill.position.set(finalEnemyX - 0.29 * (1 - hpRatio), barY, 0.36);
  hpBar.fill.scale.set(hpRatio, 1, 1);
  hpBar.bg.renderOrder = 10000;
  hpBar.fill.renderOrder = 10001;

  const fillMat = hpBar.fill.material as THREE.MeshBasicMaterial;
  if (hpRatio > 0.5) fillMat.color.setHex(0x4caf50);
  else if (hpRatio > 0.25) fillMat.color.setHex(0xffc107);
  else fillMat.color.setHex(0xf44336);

  hpBar.bg.visible = true;
  hpBar.fill.visible = true;
}

export function updateDeadEnemyVisual(enemy: Enemy, registry: EnemyVisualRegistry): boolean {
  const mesh = registry.meshes.get(enemy.id);
  if (mesh) {
    mesh.scale.x *= 0.9;
    mesh.scale.y *= 0.9;
    const deadMat = mesh.material as THREE.MeshBasicMaterial;
    deadMat.opacity -= 0.05;

    if (deadMat.opacity <= 0) {
      registry.removeEnemy(enemy.id);
      return true;
    }
  } else {
    return true;
  }

  const hpBar = registry.hpBars.get(enemy.id);
  if (hpBar) {
    hpBar.bg.visible = false;
    hpBar.fill.visible = false;
  }

  const shadow = registry.shadows.get(enemy.id);
  if (shadow) shadow.visible = false;

  const outline = registry.outlines.get(enemy.id);
  if (outline) outline.visible = false;

  return false;
}
