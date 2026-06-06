import * as THREE from 'three';
import type { Enemy } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';
import type { EnemyVisualRegistry } from '@/game/runtime/EnemyVisualRegistry';

const _SIN_TABLE_SIZE = 1024;
const _TWO_PI = Math.PI * 2;
const _sinScale = _SIN_TABLE_SIZE / _TWO_PI;
const _SIN_TABLE = new Float32Array(_SIN_TABLE_SIZE);
for (let i = 0; i < _SIN_TABLE_SIZE; i++) {
  _SIN_TABLE[i] = Math.sin((i / _SIN_TABLE_SIZE) * _TWO_PI);
}
const fastSin = (t: number): number =>
  _SIN_TABLE[((t * _sinScale) | 0) & (_SIN_TABLE_SIZE - 1)];
const fastCos = (t: number): number => fastSin(t + Math.PI * 0.5);

type EnemyVisualProfile = {
  baseScale: number;
  footOffset: number;
  strideAmp: number;
  bobAmp: number;
  squashAmp: number;
  leanAmp: number;
  hpBarOffset: number;
};

type EnemyWalkAnimationConfig = {
  frameCount: number;
  frameRate: number;
};

const ENEMY_WALK_ANIMATIONS: Record<string, EnemyWalkAnimationConfig> = {
  bandit: { frameCount: 4, frameRate: 2.4 },
  skeleton: { frameCount: 4, frameRate: 2.4 },
  skeleton_captain: { frameCount: 4, frameRate: 2.2 },
  wolf: { frameCount: 4, frameRate: 2.2 },
  armored_wolf: { frameCount: 4, frameRate: 2.0 },
  spider: { frameCount: 4, frameRate: 1.35 },
  golem: { frameCount: 4, frameRate: 0.72 },
  stone_sentinel: { frameCount: 4, frameRate: 0.9 },
  corrupted_giant: { frameCount: 4, frameRate: 0.72 },
  slime: { frameCount: 4, frameRate: 2.0 },
  water_slime: { frameCount: 4, frameRate: 1.75 },
  plant: { frameCount: 4, frameRate: 1.4 },
  shadow: { frameCount: 4, frameRate: 1.2 },
  shadow_lurker: { frameCount: 4, frameRate: 1.0 },
  hollow_reaver: { frameCount: 4, frameRate: 1.1 },
  hollow_guardian: { frameCount: 4, frameRate: 0.8 },
  ashen_reaver: { frameCount: 4, frameRate: 0.75 },
  void_wisp: { frameCount: 4, frameRate: 1.3 },
  ridge_revenant: { frameCount: 4, frameRate: 0.85 },
};

const WATER_SLIME_SURFACE_VISUAL_DURATION = 0.45;

type EnemyRenderCache = { x: number; y: number; scaleX: number; scaleY: number; rot: number; hpBucket: number };
const _enemyRenderCache = new Map<string, EnemyRenderCache>();

type EnemySpriteCache = { key: string; state: string; facing: string; walkFrame: number; hasAttack: boolean; phase: number; chargeFrame: number };
const _enemySpriteCache = new Map<string, EnemySpriteCache>();

interface ApplyEnemyVisualsOptions {
  enemy: Enemy;
  state: GameState;
  currentTime: number;
  deltaTime: number;
  outlinePad: number;
  enemyVisualProfiles: Record<string, EnemyVisualProfile>;
  registry: EnemyVisualRegistry;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  getTexture: (key: string) => THREE.Texture | null;
}

function resolveWalkFrame(enemy: Enemy, enemyType: string): number {
  const config = ENEMY_WALK_ANIMATIONS[enemyType] ?? { frameCount: 2, frameRate: 2.0 };
  return Math.floor(enemy.moveCycle * config.frameRate) % config.frameCount;
}

function resolveSpriteKey(enemy: Enemy, enemyType: string, walkFrame: number, chargeFrame: number): string {
  if (enemyType === 'bandit' || enemyType === 'skeleton' || enemyType === 'skeleton_captain') {
    const animState = enemy.state === 'telegraphing'
      ? 'charge'
      : enemy.state === 'recovering' && enemy.attackAnimationTimer > 0
        ? 'attack'
        : enemy.moveBlend > 0.25
          ? 'walk'
          : 'idle';
    const animFrame = animState === 'walk'
      ? walkFrame
      : animState === 'charge'
        ? chargeFrame
        : animState === 'attack'
          ? 1
          : 0;
    return `enemy_${enemyType}_${enemy.facing}_${animState}_${animFrame}`;
  }
  if (enemyType === 'golem') {
    const phase = enemy.phase ?? 1;
    const prefix = phase >= 2 ? 'enemy_golem_phase2' : 'enemy_golem';
    if (enemy.state === 'staggered') return `${prefix}_stagger`;
    if (enemy.state === 'telegraphing') return `${prefix}_telegraph`;
    if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return `${prefix}_attack`;
    if (enemy.moveBlend > 0.25) return `${prefix}_walk_${walkFrame}`;
    return prefix;
  }
  if (enemyType === 'stone_sentinel') {
    if (enemy.state === 'staggered') return 'enemy_stone_sentinel_stagger';
    if (enemy.state === 'telegraphing') return 'enemy_stone_sentinel_telegraph';
    if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return 'enemy_stone_sentinel_attack';
    if (enemy.moveBlend > 0.25) return `enemy_stone_sentinel_walk_${walkFrame}`;
    return 'enemy_stone_sentinel';
  }
  if (enemyType === 'ridge_revenant') {
    if (enemy.state === 'telegraphing') return 'enemy_ridge_revenant_telegraph';
    if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return 'enemy_ridge_revenant_attack';
    if (enemy.moveBlend > 0.25) return `enemy_ridge_revenant_walk_${walkFrame}`;
    return 'enemy_ridge_revenant';
  }
  if (enemy.state === 'telegraphing') return `${enemy.sprite}_telegraph`;
  if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) return `${enemy.sprite}_attack`;
  if (enemy.moveBlend > 0.25 && ENEMY_WALK_ANIMATIONS[enemyType]) {
    return `${enemy.sprite}_walk_${walkFrame}`;
  }
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
  getVisualYAt,
  getActorRenderOrder,
  getTexture,
}: ApplyEnemyVisualsOptions) {
  const enemyMesh = registry.meshes.get(enemy.id);
  if (!enemyMesh) return;

  const mat = enemyMesh.material as THREE.MeshBasicMaterial;
  const enemyType = enemy.sprite.replace('enemy_', '');
  if (enemyType === 'water_slime' && enemy.waterDiveTimer > 0) {
    enemyMesh.visible = false;
    const shadow = registry.shadows.get(enemy.id);
    if (shadow) shadow.visible = false;
    const outline = registry.outlines.get(enemy.id);
    if (outline) outline.visible = false;
    const hpBar = registry.hpBars.get(enemy.id);
    if (hpBar) {
      hpBar.bg.visible = false;
      hpBar.fill.visible = false;
    }
    return;
  }

  const visual = enemyVisualProfiles[enemyType] ?? enemyVisualProfiles.wolf;
  // Stable per-enemy jitter seed; matches the historical scale of the previous
  // `parseFloat(id.split('_')[1]) * 0.001` formula so visuals don't change shape.
  const seed = enemy.visualSeed * 1000;

  const walkFrame = resolveWalkFrame(enemy, enemyType);
  const hasAttackAnim = enemy.attackAnimationTimer > 0;
  const animPhase = enemy.phase ?? 1;
  const chargeFrame = (enemy.state === 'telegraphing' && enemy.telegraphDuration > 0)
    ? Math.min(2, Math.floor((1 - enemy.telegraphTimer / enemy.telegraphDuration) * 3))
    : 0;

  const sc = _enemySpriteCache.get(enemy.id);
  if (!sc ||
      sc.state !== enemy.state ||
      sc.facing !== enemy.facing ||
      sc.walkFrame !== walkFrame ||
      sc.hasAttack !== hasAttackAnim ||
      sc.phase !== animPhase ||
      sc.chargeFrame !== chargeFrame) {
    const spriteKey = resolveSpriteKey(enemy, enemyType, walkFrame, chargeFrame);
    if (sc) {
      sc.key = spriteKey;
      sc.state = enemy.state;
      sc.facing = enemy.facing;
      sc.walkFrame = walkFrame;
      sc.hasAttack = hasAttackAnim;
      sc.phase = animPhase;
      sc.chargeFrame = chargeFrame;
    } else {
      _enemySpriteCache.set(enemy.id, { key: spriteKey, state: enemy.state, facing: enemy.facing, walkFrame, hasAttack: hasAttackAnim, phase: animPhase, chargeFrame });
    }
    let enemyTex = getTexture(spriteKey);
    if (!enemyTex) {
      const fallbackKey = enemy.state === 'telegraphing'
        ? `${enemy.sprite}_telegraph`
        : hasAttackAnim
          ? `${enemy.sprite}_attack`
          : enemy.sprite;
      enemyTex = getTexture(fallbackKey);
    }
    if (enemyTex && mat.map !== enemyTex) {
      mat.map = enemyTex;
    }
  }

  const bossPhase = (enemyType === 'hollow_guardian' || enemyType === 'golem')
    ? (enemy.phase ?? 1)
    : 1;
  const isPhase2 = bossPhase === 2;
  const isPhase3 = bossPhase === 3;
  const isGolem = enemyType === 'golem';
  const isStoneSentinel = enemyType === 'stone_sentinel';

  if (isGolem || isStoneSentinel) {
    // Distinct sprite frames handle all state cues — no color tinting
    if (enemy.poiseAbsorbFlashTimer > 0) {
      enemy.poiseAbsorbFlashTimer -= deltaTime;
      const pulse = Math.abs(fastSin(enemy.poiseAbsorbFlashTimer * 18)) * 0.35 + 0.65;
      mat.color.setRGB(1.0, pulse * 0.85, pulse * 0.2);
      mat.opacity = 0.7 + pulse * 0.3;
    } else if (enemy.damageFlashTimer > 0) {
      enemy.damageFlashTimer -= deltaTime;
      mat.opacity = 0.5 + Math.abs(fastSin(enemy.damageFlashTimer * 25)) * 0.5;
      mat.color.setHex(0xffffff);
    } else {
      mat.opacity = 1.0;
      mat.color.setHex(0xffffff);
    }
  } else if (enemy.poiseAbsorbFlashTimer > 0) {
    enemy.poiseAbsorbFlashTimer -= deltaTime;
    const pulse = Math.abs(fastSin(enemy.poiseAbsorbFlashTimer * 18)) * 0.35 + 0.65;
    mat.color.setRGB(1.0, pulse * 0.85, pulse * 0.2);
    mat.opacity = 1.0;
  } else if (enemy.damageFlashTimer > 0) {
    enemy.damageFlashTimer -= deltaTime;
    mat.color.setHex(0xff0000);
  } else if (enemy.state === 'telegraphing') {
    // Attack wind-ups intentionally do NOT tint the body. Souls-like NPCs read
    // their telegraph from the dedicated `_telegraph` sprite pose + particle
    // cues (e.g. the crusher warning ring), never a colored strobe on the mesh.
    // Boss identity glows (phase 2/3) still apply below if the boss is enraged.
    if (isPhase3) {
      const pulse = fastSin(currentTime / 200) * 0.15 + 0.85;
      mat.color.setRGB(pulse * 0.3, pulse, pulse);
      mat.opacity = 0.75 + fastSin(currentTime / 120) * 0.15;
      mat.transparent = true;
    } else if (isPhase2) {
      const pulse = fastSin(currentTime / 350) * 0.08 + 0.92;
      mat.color.setRGB(pulse * 0.35, pulse, pulse);
      mat.opacity = 1.0;
    } else {
      mat.color.setHex(0xffffff);
      mat.opacity = 1.0;
    }
  } else if (enemy.state === 'staggered') {
    // Hit-result feedback (player broke poise), not an attack telegraph — kept.
    mat.color.setHex(0xaaaaee);
  } else if (enemy.state === 'slamming') {
    const novaTimer = enemy.novaSlamTimer ?? 0;
    const novaDuration = enemy.currentAttackType === 'hail_mary' ? 2.2 : 0.5;
    const novaProgress = 1 - novaTimer / novaDuration;
    const flash = fastSin(novaProgress * Math.PI * 6) * 0.4 + 0.6;
    if (enemy.currentAttackType === 'hail_mary') {
      mat.color.setRGB(flash * 0.3, flash, flash);
    } else {
      mat.color.setRGB(flash * 0.5, flash * 0.2, flash);
    }
  } else if (isPhase3) {
    const pulse = fastSin(currentTime / 200) * 0.15 + 0.85;
    mat.color.setRGB(pulse * 0.3, pulse, pulse);
    mat.opacity = 0.75 + fastSin(currentTime / 120) * 0.15;
    mat.transparent = true;
  } else if (isPhase2) {
    const pulse = fastSin(currentTime / 350) * 0.08 + 0.92;
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
  const moveWave = fastSin(enemy.moveCycle);
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
        finalEnemyY += fastSin(currentTime / 180 + seed) * 0.05;
        finalEnemyX += fastCos(currentTime / 220 + seed) * 0.025;
        scaleX *= 1 + stride * 0.035;
        scaleY *= 1 - stride * 0.025;
        rotation += fastSin(currentTime / 260 + seed) * 0.01;
        rotation *= 0.4;
        break;
      case 'hollow_reaver':
        finalEnemyY += fastSin(currentTime / 170 + seed) * 0.06;
        finalEnemyX += fastCos(currentTime / 210 + seed) * 0.03;
        scaleX *= 1 + stride * 0.025;
        scaleY *= 1 - stride * 0.025;
        rotation *= 0.4;
        break;
      case 'slime':
      case 'water_slime':
        finalEnemyY += stride * 0.02;
        scaleX *= 1 + stride * 0.08;
        scaleY *= 1 - stride * 0.08;
        rotation = moveWave * 0.015;
        break;
      case 'spider':
        finalEnemyY += fastSin(enemy.moveCycle * 1.35) * 0.004;
        scaleX *= 1 + stride * 0.006;
        scaleY *= 1 - stride * 0.004;
        rotation = moveWave * 0.008;
        break;
      case 'golem': {
        const golemStep = Math.abs(fastSin(enemy.moveCycle * 0.72));
        const plant = golemStep > 0.82 ? (golemStep - 0.82) / 0.18 : 0;
        finalEnemyY += golemStep * 0.045 - plant * 0.035;
        scaleX *= 1 + plant * 0.075;
        scaleY *= 1 - plant * 0.085;
        finalEnemyX += fastSin(enemy.moveCycle * 0.72) * visual.strideAmp * (lateralBias !== 0 ? lateralBias * 0.32 : 0.12);
        rotation = fastSin(enemy.moveCycle * 0.72) * 0.028 * (lateralBias !== 0 ? lateralBias : 1);
        break;
      }
      case 'stone_sentinel': {
        const sentinelStep = Math.abs(fastSin(enemy.moveCycle * 0.95));
        const shoulderDrop = sentinelStep > 0.78 ? (sentinelStep - 0.78) / 0.22 : 0;
        finalEnemyY += sentinelStep * 0.035 - shoulderDrop * 0.02;
        scaleX *= 1 + shoulderDrop * 0.045;
        scaleY *= 1 - shoulderDrop * 0.055;
        finalEnemyX += fastSin(enemy.moveCycle * 0.95) * visual.strideAmp * (lateralBias !== 0 ? lateralBias * 0.28 : 0.1);
        rotation = fastSin(enemy.moveCycle * 0.95) * 0.024 * (lateralBias !== 0 ? lateralBias : 1);
        break;
      }
      case 'hollow_guardian':
        // Shade-like ethereal float — glides rather than stomps
        finalEnemyY += fastSin(currentTime / 200 + seed) * 0.06;
        finalEnemyX += fastCos(currentTime / 250 + seed) * 0.03;
        scaleX *= 1 + stride * 0.02;
        scaleY *= 1 - stride * 0.02;
        rotation *= 0.3;
        break;
      case 'ridge_revenant':
        // Bound wraith — drifts on a gentle hover with a slow figure-eight sway
        // and a faint robe billow, NOT a side-to-side PNG rock. Kill the lateral
        // lean entirely so it reads as gliding, not tipping.
        finalEnemyY += fastSin(currentTime / 190 + seed) * 0.07;
        finalEnemyX += fastCos(currentTime / 330 + seed) * 0.035;
        scaleX *= 1 + fastSin(currentTime / 240 + seed) * 0.012;
        scaleY *= 1 - fastSin(currentTime / 240 + seed) * 0.012;
        rotation = fastSin(currentTime / 420 + seed) * 0.012;
        break;
      case 'plant':
        finalEnemyX += fastSin(enemy.moveCycle * 0.7 + seed) * 0.008;
        scaleX *= 1 + stride * 0.012;
        scaleY *= 1 - stride * 0.01;
        rotation = fastSin(enemy.moveCycle * 0.7 + seed) * 0.018;
        break;
    }
  } else if (enemy.state === 'telegraphing') {
    const telegraphProgress = 1 - enemy.telegraphTimer / enemy.telegraphDuration;
    const dx = state.player.position.x - enemy.position.x;
    const dy = state.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const isBoss = enemyType === 'hollow_guardian';
    const isSweep = enemy.currentAttackType === 'sweep' || enemy.currentAttackType === 'combo_sweep';
    const isComboFinisher = enemy.currentAttackType === 'combo_finisher';
    const phaseMultiplier = isPhase3 ? 1.4 : isPhase2 ? 1.15 : 1.0;
    const scaleSwellX = ((isBoss ? 0.28 : isGolem ? 0.22 : 0.15) + (isSweep ? 0.18 : isComboFinisher ? 0.12 : 0)) * phaseMultiplier;
    const scaleSwellY = ((isBoss ? 0.22 : isGolem ? 0.18 : 0.12) - (isSweep ? 0.06 : 0)) * phaseMultiplier;
    const windUp = isBoss ? 0.3 : isGolem ? 0.25 : 0.15;
    const shakeBase = ((isBoss ? 0.07 : isGolem ? 0.06 : 0.03) + (isSweep ? 0.04 : 0)) * phaseMultiplier;

    const pulseBeat = telegraphProgress < 0.5
      ? fastSin(telegraphProgress * Math.PI * 4) * 0.08
      : 0;
    scaleX *= 1 + telegraphProgress * scaleSwellX + pulseBeat;
    scaleY *= 1 - telegraphProgress * scaleSwellY + pulseBeat * 0.5;

    const windUpDist = telegraphProgress * windUp;
    finalEnemyX += (dx / dist) * -windUpDist;
    finalEnemyY += (dy / dist) * -windUpDist;

    const shakeIntensity = shakeBase * telegraphProgress * telegraphProgress;
    finalEnemyX += fastSin(currentTime / 25 + seed) * shakeIntensity;
    finalEnemyY += fastCos(currentTime / 30 + seed) * shakeIntensity;
    if (isSweep || isComboFinisher) {
      finalEnemyX += fastSin(currentTime / 12 + seed) * 0.08 * telegraphProgress;
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
        const lungeDistance = fastSin(lungeProgress * Math.PI) * lungeDist;
        finalEnemyX += (dx / dist) * lungeDistance;
        finalEnemyY += (dy / dist) * lungeDistance;
        if (isBoss) {
          scaleX *= 1 + fastSin(lungeProgress * Math.PI) * 0.1;
          scaleY *= 1 - fastSin(lungeProgress * Math.PI) * 0.15;
        }
      }
    }
    const recoverProgress = enemy.recoverTimer / enemy.recoverDuration;
    scaleX *= 0.92 + recoverProgress * 0.08;
    scaleY *= 0.88 + recoverProgress * 0.12;
    rotation = fastSin(currentTime / 90 + seed) * 0.02;
  } else if (enemy.state === 'charging') {
    scaleX *= 1.15;
    scaleY *= 0.85;
    const shakeAmt = 0.05;
    finalEnemyX += fastSin(currentTime / 15 + seed) * shakeAmt;
    finalEnemyY += fastCos(currentTime / 20 + seed) * shakeAmt * 0.5;
  } else if (enemy.state === 'slamming') {
    const novaTimer = enemy.novaSlamTimer ?? 0;
    const novaDuration = enemy.currentAttackType === 'hail_mary' ? 2.2 : 0.5;
    const novaProgress = 1 - novaTimer / novaDuration;
    const expand = fastSin(novaProgress * Math.PI) * (enemy.currentAttackType === 'hail_mary' ? 0.5 : 0.35);
    scaleX *= 1 + expand;
    scaleY *= 1 + expand;
    const shakeAmt = 0.06 * novaProgress * novaProgress;
    finalEnemyX += fastSin(currentTime / 10 + seed) * shakeAmt;
    finalEnemyY += fastCos(currentTime / 12 + seed) * shakeAmt;
    finalEnemyY += fastSin(novaProgress * Math.PI * 3) * 0.04;
  } else {
    const breathe = fastSin(currentTime / 800 + seed * 3);
    if (enemyType === 'hollow_guardian') {
      // Deep, slow ethereal float — like a giant shade hovering
      finalEnemyY += breathe * 0.06;
      finalEnemyX += fastCos(currentTime / 700 + seed) * 0.025;
      scaleX *= 1 + breathe * 0.018;
      scaleY *= 1 - breathe * 0.018;
    } else if (enemyType === 'shadow') {
      finalEnemyY += breathe * 0.05;
      finalEnemyX += fastCos(currentTime / 900 + seed) * 0.02;
      scaleX *= 1 + breathe * 0.018;
      scaleY *= 1 - breathe * 0.016;
      rotation = fastSin(currentTime / 1100 + seed) * 0.01;
    } else if (enemyType === 'hollow_reaver') {
      finalEnemyY += breathe * 0.065;
      finalEnemyX += fastCos(currentTime / 760 + seed) * 0.028;
      scaleX *= 1 + breathe * 0.014;
      scaleY *= 1 - breathe * 0.018;
      rotation = fastSin(currentTime / 850 + seed) * 0.014;
    } else if (enemyType === 'ridge_revenant') {
      // Suspended hover at rest — slow vertical bob and a faint robe billow.
      finalEnemyY += breathe * 0.07;
      finalEnemyX += fastCos(currentTime / 760 + seed) * 0.03;
      scaleX *= 1 + breathe * 0.012;
      scaleY *= 1 - breathe * 0.016;
      rotation = fastSin(currentTime / 900 + seed) * 0.01;
    } else if (enemyType === 'slime' || enemyType === 'water_slime') {
      finalEnemyY += Math.abs(breathe) * 0.025;
      scaleX *= 1 + Math.abs(breathe) * 0.04;
      scaleY *= 1 - Math.abs(breathe) * 0.04;
    } else if (enemyType === 'spider') {
      finalEnemyX += breathe * 0.015;
      rotation = breathe * 0.02;
    } else if (enemyType === 'stone_sentinel') {
      const sentinelBreath = fastSin(currentTime / 1000 + seed * 3);
      finalEnemyY += sentinelBreath * 0.028;
      scaleX *= 1 + sentinelBreath * 0.02;
      scaleY *= 1 - sentinelBreath * 0.018;
      rotation = sentinelBreath * 0.006;
    } else if (enemyType === 'golem') {
      const slowBreath = fastSin(currentTime / 1200 + seed * 3);
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

  if (enemyType === 'water_slime' && enemy.waterSurfaceTimer > 0) {
    const progress = 1 - Math.min(1, enemy.waterSurfaceTimer / WATER_SLIME_SURFACE_VISUAL_DURATION);
    const easeOut = 1 - Math.pow(1 - progress, 2);
    scaleX *= 0.5 + easeOut * 0.5;
    scaleY *= 0.18 + easeOut * 0.82;
    finalEnemyY -= (1 - easeOut) * 0.16;
    mat.transparent = true;
    mat.opacity = Math.max(mat.opacity, 0.35 + easeOut * 0.65);
  }

  enemyMesh.rotation.z = rotation;
  enemyMesh.scale.set(scaleX, scaleY, 1);
  enemyMesh.position.set(finalEnemyX, finalEnemyY, 0.2);
  enemyMesh.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, visual.footOffset);

  let cache = _enemyRenderCache.get(enemy.id);
  const posChanged = !cache || cache.x !== finalEnemyX || cache.y !== finalEnemyY
    || cache.scaleX !== scaleX || cache.scaleY !== scaleY || cache.rot !== rotation;

  if (posChanged) {
    if (!cache) {
      cache = { x: 0, y: 0, scaleX: 0, scaleY: 0, rot: 0, hpBucket: -1 };
      _enemyRenderCache.set(enemy.id, cache);
    }
    cache.x = finalEnemyX;
    cache.y = finalEnemyY;
    cache.scaleX = scaleX;
    cache.scaleY = scaleY;
    cache.rot = rotation;

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
  }

  const usesScreenBossBar = enemy.type === 'hollow_guardian';
  if (usesScreenBossBar) {
    const existingHpBar = registry.hpBars.get(enemy.id);
    if (existingHpBar) {
      existingHpBar.bg.visible = false;
      existingHpBar.fill.visible = false;
    }
    return;
  }

  const hpBar = registry.getOrCreateHPBar(enemy.id);
  const hpRatio = enemy.health / enemy.maxHealth;
  const barY = finalEnemyY + visual.hpBarOffset;
  hpBar.bg.position.set(finalEnemyX, barY, 0.35);
  hpBar.fill.position.set(finalEnemyX - 0.29 * (1 - hpRatio), barY, 0.36);
  hpBar.fill.scale.set(hpRatio, 1, 1);
  hpBar.bg.renderOrder = 10000;
  hpBar.fill.renderOrder = 10001;

  const fillMat = hpBar.fill.material as THREE.MeshBasicMaterial;
  const hpBucket = hpRatio > 0.5 ? 2 : hpRatio > 0.25 ? 1 : 0;
  if (!cache || cache.hpBucket !== hpBucket) {
    if (cache) cache.hpBucket = hpBucket;
    if (hpBucket === 2) fillMat.color.setHex(0x4caf50);
    else if (hpBucket === 1) fillMat.color.setHex(0xffc107);
    else fillMat.color.setHex(0xf44336);
  }

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
      _enemyRenderCache.delete(enemy.id);
      _enemySpriteCache.delete(enemy.id);
      return true;
    }
  } else {
    _enemyRenderCache.delete(enemy.id);
    _enemySpriteCache.delete(enemy.id);
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
