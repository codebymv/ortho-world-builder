const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'playtest-screens');
const LOG = path.join(OUT, 'playtest-hollow-guardian-log.jsonl');
const URL = 'http://localhost:8081';
const CHROME = 'C:\\Users\\roxas\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';
const SNAPSHOT_FLAG = '__SOULS_ENABLE_PLAYTEST_SNAPSHOT';

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(LOG, '');

function log(entry) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  fs.appendFileSync(LOG, `${line}\n`);
  console.log(line);
}

function summarizeSnapshot(s) {
  const boss = liveEnemies(s).find(e => e.type === 'hollow_guardian') ?? null;
  const player = s?.player ?? null;
  return {
    mapId: s?.mapId,
    player: player
      ? {
          hp: player.health,
          stamina: Math.round(player.stamina),
          x: Number(player.x.toFixed(2)),
          y: Number(player.y.toFixed(2)),
          extracts: player.extracts,
          grass: player.tempestGrass,
          berserkerDraughts: player.berserkerDraughts,
          berserkerTimer: Number((player.berserkerTimer ?? 0).toFixed(1)),
        }
      : null,
    boss: boss
      ? {
          hp: boss.health,
          phase: boss.phase,
          state: boss.state,
          x: Number(boss.x.toFixed(2)),
          y: Number(boss.y.toFixed(2)),
        }
      : null,
    adds: liveAdds(s).map(add => ({
      type: add.type,
      hp: add.health,
      x: Number(add.x.toFixed(2)),
      y: Number(add.y.toFixed(2)),
    })),
    hazards: (s?.hazards ?? []).map(h => ({ source: h.source, state: h.state, x: Number(h.x.toFixed(2)), y: Number(h.y.toFixed(2)) })),
    projectiles: liveProjectiles(s).map(p => ({ sprite: p.sprite, x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)) })),
  };
}

const item = (id, name, type, sprite, stats = undefined) => ({
  id,
  name,
  description: name,
  type,
  sprite,
  ...(stats ? { stats } : {}),
});

const ITEMS = {
  health_potion: { ...item('health_potion', 'Ephemeral Extract', 'consumable', 'potion'), healAmount: 55 },
  tempest_grass: { ...item('tempest_grass', 'Tempest Grass', 'consumable', 'tempest_grass_item'), healAmount: 40 },
  berserker_draught: { ...item('berserker_draught', 'Berserker Draught', 'consumable', 'berserker_draught'), buffType: 'berserker', buffDuration: 10 },
  meek_short_sword: item('meek_short_sword', 'Meek Short Sword', 'equipment', 'sword', { damage: 20, range: 2 }),
  ornamental_broadsword: item('ornamental_broadsword', 'Ornamental Broadsword', 'equipment', 'broadsword', { damage: 28, range: 2.15 }),
  fort_gate_key: item('fort_gate_key', 'Fort Gate Key', 'key', 'fort_gate_key'),
  manuscript_fragment: item('manuscript_fragment', 'Manuscript Fragment', 'quest', 'loose_pages'),
  evacuation_order: item('evacuation_order', "Commander's Evacuation Order", 'quest', 'loose_pages'),
  wolf_ring: item('wolf_ring', 'Wolf Ring', 'ring', 'wolf_ring', { recoverySpeedMult: 1.22 }),
  highlanders_key: item('highlanders_key', "Highlander's Key", 'key', 'highlanders_key'),
};

function preparedSave() {
  const inventory = [
    ITEMS.ornamental_broadsword,
    ITEMS.meek_short_sword,
    ITEMS.fort_gate_key,
    ITEMS.manuscript_fragment,
    ITEMS.evacuation_order,
    ITEMS.wolf_ring,
    ITEMS.highlanders_key,
    ...Array.from({ length: 5 }, () => ITEMS.health_potion),
    ...Array.from({ length: 28 }, () => ITEMS.tempest_grass),
    ...Array.from({ length: 2 }, () => ITEMS.berserker_draught),
  ];

  return {
    version: 8,
    timestamp: Date.now(),
    player: {
      position: { x: -27.5, y: -130.2 },
      direction: 'up',
      health: 160,
      maxHealth: 160,
      gold: 0,
      essence: 0,
      cursedSediment: 0,
      attackDamage: 36,
      attackRange: 2.15,
      stamina: 140,
      maxStamina: 140,
      level: 6,
      vitality: 4,
      endurance: 2,
      strength: 3,
      maxEphemeralExtractCharges: 5,
      ephemeralExtractPotency: 1,
    },
    currentMap: 'forest',
    inventory,
    equippedWeaponId: 'ornamental_broadsword',
    equippedRingIds: ['wolf_ring', null],
    weaponLoadout: ['ornamental_broadsword', 'meek_short_sword', null],
    lastBonfire: { mapId: 'forest', x: -33.5, y: -87.5 },
    droppedEssence: null,
    worldItems: [],
    quests: [],
    gameFlags: {
      seen_region_whispering_woods: true,
      bonfire_first_forest_134_208: true,
      bonfire_first_forest_228_158: true,
      bonfire_first_forest_116_62: true,
      manuscript_fragment_collected: true,
      forest_hunter_chest_opened: true,
      forest_river_chest_opened: true,
      whispering_woods_shortcut_open: true,
      chapel_key_collected: true,
      fort_gate_key_collected: true,
      forest_fort_gate_open: true,
      manuscript_checkpoint_gate_open: true,
      north_fort_gate_open: true,
      evacuation_order_collected: true,
      olwen_ranger_cabin_hint: true,
      wolf_ring_received: true,
      ranger_wolf_ring_chest_opened: true,
      cliff_grotto_chest_opened: true,
      highlanders_plains_gate_open: true,
    },
    mapMarkers: [],
    visitedTiles: [],
    seenItemIds: Object.keys(ITEMS),
    killedEnemyIds: [],
  };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function start() {
  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME,
    args: ['--window-size=1220,820'],
  });
  const context = await browser.newContext({ viewport: { width: 1220, height: 820 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(URL);
  await page.waitForLoadState('domcontentloaded');
  return { browser, page };
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText ?? '';
    if (/RESTORING LAST BONFIRE|PREPARING THE WORLD|\bLOADING\b/i.test(text)) return false;
    if (/CONTINUE\s+NEW GAME\s+LOAD GAME/i.test(text)) return false;
    return /\d+\s*\/\s*\d+/.test(text);
  }, null, { timeout: 25000 }).catch(() => {});
  await wait(800);
}

async function continueFromMenu(page) {
  await wait(600);
  const button = page.locator('text=CONTINUE').first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ force: true });
  } else {
    const viewport = page.viewportSize() ?? { width: 1220, height: 820 };
    await page.mouse.click(viewport.width / 2, Math.min(viewport.height - 260, viewport.height * 0.6));
  }
  await waitForGameReady(page);
}

async function setSave(page, save) {
  await page.evaluate(({ data, snapshotFlag }) => {
    localStorage.setItem(snapshotFlag, '1');
    localStorage.setItem('rpg_save_data', JSON.stringify(data));
    localStorage.removeItem('rpg_boss_attempt_checkpoint');
  }, { data: save, snapshotFlag: SNAPSHOT_FLAG });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await continueFromMenu(page);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`shot=${file}`);
}

async function press(page, key, delay = 160) {
  await page.keyboard.press(key);
  await wait(delay);
}

async function snap(page) {
  return page.evaluate(() => {
    const fn = window.__SOULS_PLAYTEST_SNAPSHOT;
    return typeof fn === 'function' ? fn() : null;
  });
}

function liveEnemies(s) {
  return (s?.enemies ?? []).filter(e => e.health > 0 && e.state !== 'dead');
}

function liveAdds(s) {
  return liveEnemies(s).filter(e => e.type !== 'hollow_guardian');
}

function liveProjectiles(s) {
  return (s?.projectiles ?? []).filter(p => p.alive !== false && !p.reflected);
}

function nearestHazard(s) {
  const p = s?.player;
  if (!p) return null;
  return (s.hazards ?? [])
    .map(h => ({ h, d: Math.hypot(h.x - p.x, h.y - p.y) }))
    .filter(x => x.d < x.h.radius + (x.h.state === 'warning' ? 2.2 : 1.4))
    .sort((a, b) => a.d - b.d)[0]?.h ?? null;
}

function arenaInwardVector(player, edge = 11.5) {
  let dx = 0;
  let dy = 0;
  if (player.x > edge) dx -= 1;
  if (player.x < -edge) dx += 1;
  if (player.y > edge) dy -= 1;
  if (player.y < -edge) dy += 1;
  return dx || dy ? { dx, dy } : null;
}

function arenaCenterVector(player, minDist = 7.5) {
  const dist = Math.hypot(player.x, player.y);
  if (dist < minDist) return null;
  return { dx: -player.x, dy: -player.y, dist };
}

function escapeVectorFrom(player, x, y) {
  const center = arenaCenterVector(player, 7.0);
  if (center) return center;
  const dx = player.x - x;
  const dy = player.y - y;
  if (Math.hypot(dx, dy) < 0.25) return { dx: -player.x || 0, dy: -player.y || 1 };
  return { dx, dy };
}

function choosePerpendicular(player, vx, vy, preferAwayFrom = null) {
  let dx = -vy;
  let dy = vx;
  const inward = arenaInwardVector(player, 8.0) ?? arenaCenterVector(player, 9.0);
  if (inward && dx * inward.dx + dy * inward.dy < 0) {
    dx = -dx;
    dy = -dy;
  }
  if (preferAwayFrom && dx * preferAwayFrom.dx + dy * preferAwayFrom.dy < 0) {
    dx = -dx;
    dy = -dy;
  }
  return { dx, dy };
}

function incomingProjectileThreat(s) {
  const player = s?.player;
  if (!player) return null;
  const enemies = liveEnemies(s);
  return liveProjectiles(s)
    .filter(projectile => (projectile.sprite ?? '').includes('scythe'))
    .map(projectile => {
      const vx = projectile.vx ?? 0;
      const vy = projectile.vy ?? 0;
      const speedSq = vx * vx + vy * vy;
      const relX = player.x - projectile.x;
      const relY = player.y - projectile.y;
      const currentDist = Math.hypot(relX, relY);
      if (speedSq < 0.001) return null;
      const timeToClosest = (relX * vx + relY * vy) / speedSq;
      const closestX = projectile.x + vx * timeToClosest;
      const closestY = projectile.y + vy * timeToClosest;
      const missDist = Math.hypot(player.x - closestX, player.y - closestY);
      const radius = (projectile.hitRadius ?? 0.45) + 0.95;
      const source = enemies.find(enemy => enemy.id === projectile.sourceEnemyId);
      const incoming = timeToClosest > -0.05 && timeToClosest < 0.95 && missDist <= radius;
      const alreadyHot = currentDist <= radius + 0.45;
      if (!incoming && !alreadyHot) return null;
      return {
        projectile,
        source,
        missDist,
        currentDist,
        timeToClosest,
        score: Math.max(0, timeToClosest) * 4 + missDist + (source?.type === 'hollow_reaver' ? -0.4 : 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)[0] ?? null;
}

function castingReaverThreat(s) {
  const player = s?.player;
  if (!player) return null;
  return liveAdds(s)
    .filter(enemy => enemy.type === 'hollow_reaver' && enemy.state === 'telegraphing')
    .map(enemy => ({ enemy, dist: Math.hypot(enemy.x - player.x, enemy.y - player.y) }))
    .filter(({ dist }) => dist > 1.7 && dist < 8.2)
    .sort((a, b) => a.dist - b.dist)[0] ?? null;
}

function keysForVector(dx, dy) {
  const dist = Math.hypot(dx, dy) || 1;
  const keys = [];
  if (Math.abs(dx) / dist > 0.34) keys.push(dx > 0 ? 'KeyD' : 'KeyA');
  if (Math.abs(dy) / dist > 0.34) keys.push(dy > 0 ? 'KeyW' : 'KeyS');
  if (keys.length === 0) keys.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'KeyD' : 'KeyA') : (dy > 0 ? 'KeyW' : 'KeyS'));
  return keys;
}

const DIR = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function cardinalForVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'up' : 'down';
}

function frontDot(dx, dy, direction) {
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) return 1;
  const dir = DIR[direction] ?? DIR.down;
  return (dx / dist) * dir.x + (dy / dist) * dir.y;
}

function canHit(player, target, rangePad = 0.94) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy);
  const direction = cardinalForVector(dx, dy);
  const dot = frontDot(dx, dy, direction);
  const range = (player.attackRange ?? 2.15) * rangePad;
  return { ok: dist <= range && dot >= 0.5, dist, direction, dot, range };
}

async function holdKeys(page, keys, ms, shift = false) {
  if (shift) await page.keyboard.down('ShiftLeft');
  for (const key of keys) await page.keyboard.down(key);
  await wait(ms);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  if (shift) await page.keyboard.up('ShiftLeft');
  await wait(50);
}

async function faceVector(page, dx, dy) {
  await holdKeys(page, keysForVector(dx, dy), 55);
}

async function dodgeVector(page, dx, dy) {
  const keys = keysForVector(dx, dy);
  for (const key of keys) await page.keyboard.down(key);
  await page.keyboard.press('Space');
  await wait(290);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  await wait(260);
}

async function blockMoment(page, ms = 260) {
  const p = await canvasCenter(page);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: 'right' });
  await wait(ms);
  await page.mouse.up({ button: 'right' });
  await wait(120);
}

async function canvasCenter(page) {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('No game canvas found');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function quickAttack(page) {
  const p = await canvasCenter(page);
  await page.mouse.click(p.x, p.y);
  await wait(420);
}

async function comboAttack(page, targetId, maxHits = 2) {
  const center = await canvasCenter(page);
  await page.mouse.click(center.x, center.y);
  await wait(210);

  for (let hit = 1; hit < maxHits; hit++) {
    const s = await snap(page).catch(() => null);
    const player = s?.player;
    const target = liveEnemies(s).find(e => e.id === targetId);
    if (!player || !target) break;
    if (player.health <= 0 || player.stamina < 14 || player.isDodging || (player.hurtTimer ?? 0) > 0.08) break;
    if (nearestHazard(s) || incomingProjectileThreat(s)) break;

    const boss = liveEnemies(s).find(e => e.type === 'hollow_guardian');
    const bossDist = boss ? Math.hypot(boss.x - player.x, boss.y - player.y) : 99;
    const hitCheck = canHit(player, target, 1.04);
    if (!hitCheck.ok) break;
    if (target.type !== 'hollow_guardian' && bossDist < 1.25 && player.health < 92) break;
    if (target.type === 'hollow_guardian' && boss?.state === 'slamming') break;

    await faceVector(page, target.x - player.x, target.y - player.y);
    await page.mouse.click(center.x, center.y);
    await wait(270);
  }

  for (let i = 0; i < 4; i++) {
    await wait(125);
    const s = await snap(page).catch(() => null);
    const player = s?.player;
    if (!player) return s;
    const projectileThreat = incomingProjectileThreat(s);
    if (projectileThreat) {
      if ((projectileThreat.timeToClosest ?? 1) < 0.4 && player.stamina >= 24) {
        await blockMoment(page, 240);
      } else {
        const awayFromSource = projectileThreat.source
          ? { dx: player.x - projectileThreat.source.x, dy: player.y - projectileThreat.source.y }
          : null;
        const side = choosePerpendicular(player, projectileThreat.projectile.vx, projectileThreat.projectile.vy, awayFromSource);
        await dodgeVector(page, side.dx, side.dy);
      }
      return await snap(page).catch(() => s);
    }
    const hazard = nearestHazard(s);
    if (hazard) {
      const escape = escapeVectorFrom(player, hazard.x, hazard.y);
      await dodgeVector(page, escape.dx, escape.dy);
      return await snap(page).catch(() => s);
    }
  }
  return await snap(page).catch(() => null);
}

async function chargedThrust(page, holdMs = 620) {
  const p = await canvasCenter(page);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: 'left' });
  await wait(holdMs);
  await page.mouse.up({ button: 'left' });
  await wait(1150);
}

async function useConsumable(page, desiredId) {
  for (let i = 0; i < 8; i++) {
    const s = await snap(page).catch(() => null);
    const active = s?.player?.activeItemId;
    if (active === desiredId) break;
    await press(page, 'ArrowRight', 100);
  }
  await press(page, 'KeyZ', 960);
}

async function retreatFromBoss(page, s, minHold = 420) {
  const p = s?.player;
  const boss = liveEnemies(s).find(e => e.type === 'hollow_guardian');
  if (!p || !boss) return;
  const center = arenaCenterVector(p, 7.5);
  const dx = center?.dx ?? p.x - boss.x;
  const dy = center?.dy ?? p.y - boss.y;
  await dodgeVector(page, Math.abs(dx) + Math.abs(dy) < 0.2 ? 0 : dx, Math.abs(dx) + Math.abs(dy) < 0.2 ? 1 : dy);
  const after = await snap(page).catch(() => null);
  const ap = after?.player;
  const ab = liveEnemies(after).find(e => e.type === 'hollow_guardian');
  if (ap && ab && Math.hypot(ap.x - ab.x, ap.y - ab.y) < 4.2) {
    await holdKeys(page, keysForVector(ap.x - ab.x, ap.y - ab.y), minHold, true);
  }
}

async function moveToward(page, target, desiredDist, maxMs, allowSprint = true) {
  const started = Date.now();
  let lastKeys = [];
  let shiftDown = false;
  const release = async () => {
    for (const key of [...lastKeys].reverse()) await page.keyboard.up(key);
    if (shiftDown) await page.keyboard.up('ShiftLeft').catch(() => {});
    lastKeys = [];
    shiftDown = false;
  };
  try {
    while (Date.now() - started < maxMs) {
      const s = await snap(page).catch(() => null);
      const p = s?.player;
      const current = liveEnemies(s).find(e => e.id === target.id);
      if (!p || !current) return s;
      const projectileThreat = incomingProjectileThreat(s);
      if (projectileThreat) {
        await release();
        if ((projectileThreat.timeToClosest ?? 1) < 0.42 && p.stamina >= 26) {
          await blockMoment(page, 280);
        } else {
          const awayFromSource = projectileThreat.source
            ? { dx: p.x - projectileThreat.source.x, dy: p.y - projectileThreat.source.y }
            : null;
          const side = choosePerpendicular(p, projectileThreat.projectile.vx, projectileThreat.projectile.vy, awayFromSource);
          await dodgeVector(page, side.dx, side.dy);
        }
        return await snap(page).catch(() => s);
      }
      const reaverCast = castingReaverThreat(s);
      if (reaverCast) {
        await release();
        const side = choosePerpendicular(p, p.x - reaverCast.enemy.x, p.y - reaverCast.enemy.y, { dx: -p.x, dy: -p.y });
        await dodgeVector(page, side.dx, side.dy);
        return await snap(page).catch(() => s);
      }
      const hazard = nearestHazard(s);
      if (hazard) {
        await release();
        const escape = escapeVectorFrom(p, hazard.x, hazard.y);
        await dodgeVector(page, escape.dx, escape.dy);
        return await snap(page).catch(() => s);
      }
      const dist = Math.hypot(current.x - p.x, current.y - p.y);
      if (dist <= desiredDist) return s;
      const keys = keysForVector(current.x - p.x, current.y - p.y);
      const changed = keys.length !== lastKeys.length || keys.some((k, i) => k !== lastKeys[i]);
      if (changed) {
        await release();
        for (const key of keys) await page.keyboard.down(key);
        lastKeys = keys;
      }
      if (allowSprint && dist > 5 && !shiftDown) {
        await page.keyboard.down('ShiftLeft');
        shiftDown = true;
      } else if ((!allowSprint || dist <= 5) && shiftDown) {
        await page.keyboard.up('ShiftLeft');
        shiftDown = false;
      }
      await wait(75);
    }
    return await snap(page).catch(() => null);
  } finally {
    await release();
    await wait(50);
  }
}

function pickAddTarget(s) {
  const p = s.player;
  const boss = liveEnemies(s).find(e => e.type === 'hollow_guardian');
  return liveAdds(s)
    .map(e => {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      const bossD = boss ? Math.hypot(e.x - boss.x, e.y - boss.y) : 8;
      const typeBias = e.type === 'hollow_reaver' ? -6.0 : 0;
      const woundedBias = e.health < e.maxHealth ? -2.2 : 0;
      const isolatedBonus = bossD > 5 ? -1.4 : bossD > 3.5 ? -0.5 : 1.2;
      return { e, score: d + e.health / 120 + typeBias + woundedBias + isolatedBonus, d, bossD };
    })
    .sort((a, b) => a.score - b.score)[0]?.e ?? null;
}

function chooseCombatPolicy(s, boss) {
  const player = s.player;
  const adds = liveAdds(s);
  const shades = adds.filter(add => add.type === 'hollow_shade' || add.type === 'shadow');
  const reavers = adds.filter(add => add.type === 'hollow_reaver');
  const bossDist = Math.hypot(boss.x - player.x, boss.y - player.y);
  const pressureRange = boss.phase >= 2 ? 7.2 : 5.8;
  const pressuredReaver = reavers
    .map(add => ({
      add,
      playerDist: Math.hypot(add.x - player.x, add.y - player.y),
      bossDist: Math.hypot(add.x - boss.x, add.y - boss.y),
    }))
    .filter(({ add, playerDist, bossDist: addBossDist }) => {
      if (boss.phase === 1) {
        return boss.health <= 500 || playerDist < 3.2 || (add.health < add.maxHealth && playerDist < 4.0);
      }
      return playerDist < pressureRange || addBossDist < 4.8 || add.health < add.maxHealth;
    })
    .sort((a, b) => a.playerDist + a.add.health / 80 - (b.playerDist + b.add.health / 80))[0]?.add ?? null;

  const shade = shades
    .map(add => ({
      add,
      playerDist: Math.hypot(add.x - player.x, add.y - player.y),
      bossDist: Math.hypot(add.x - boss.x, add.y - boss.y),
    }))
    .sort((a, b) => a.playerDist + a.add.health / 100 + (a.bossDist < 3 ? 3 : 0) - (b.playerDist + b.add.health / 100 + (b.bossDist < 3 ? 3 : 0)))[0]?.add ?? null;

  if (boss.phase >= 3 && boss.health <= 260) {
    return { mode: 'burn-boss', target: boss, addMode: false, bossDist };
  }
  if (boss.health <= 120 && bossDist < 4.8) {
    return { mode: 'burn-boss', target: boss, addMode: false, bossDist };
  }
  if (boss.phase === 1 && pressuredReaver) {
    return { mode: 'clear-reaver', target: pressuredReaver, addMode: true, bossDist };
  }
  const shadeDist = shade ? Math.hypot(shade.x - player.x, shade.y - player.y) : 99;
  if (boss.phase >= 2 && shade && boss.health > 230 && (shade.health > 25 || shadeDist < 2.2)) {
    return { mode: 'clear-shade', target: shade, addMode: true, bossDist };
  }
  if (boss.phase >= 2 && pressuredReaver && boss.health > 260) {
    return { mode: 'clear-reaver', target: pressuredReaver, addMode: true, bossDist };
  }
  return { mode: 'boss', target: boss, addMode: false, bossDist };
}

async function kiteBossAwayFromAdd(page, s, add) {
  const p = s?.player;
  const boss = liveEnemies(s).find(e => e.type === 'hollow_guardian');
  if (!p || !boss || !add) return;
  const inward = arenaInwardVector(p, 8.5);
  if (inward) {
    await holdKeys(page, keysForVector(inward.dx, inward.dy), 700, true);
    return;
  }
  const awayFromAddX = boss.x - add.x;
  const awayFromAddY = boss.y - add.y;
  const fallbackX = p.x - boss.x;
  const fallbackY = p.y - boss.y;
  const dx = Math.hypot(awayFromAddX, awayFromAddY) > 0.5 ? awayFromAddX : fallbackX;
  const dy = Math.hypot(awayFromAddX, awayFromAddY) > 0.5 ? awayFromAddY : fallbackY;
  await holdKeys(page, keysForVector(dx, dy), 900, true);
}

async function waitForArena(page, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const s = await snap(page).catch(() => null);
    const boss = s?.enemies?.find(e => e.type === 'hollow_guardian' && e.health > 0);
    if (s?.mapId === 'interior_hollow_arena' && boss) return s;
    await wait(250);
  }
  return null;
}

async function getSave(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('rpg_save_data') || 'null'));
}

async function enterArena(page) {
  await setSave(page, preparedSave());
  await shot(page, '170-kite-fog-ready.png');
  await page.waitForFunction(() => typeof window.__SOULS_PLAYTEST_SNAPSHOT === 'function', null, { timeout: 15000 });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await press(page, 'KeyF', 800);
    const response = page.getByText('Yes. Enter the fog.', { exact: true }).first();
    if (await response.isVisible({ timeout: 5000 }).catch(() => false)) {
      await response.click({ force: true });
    } else {
      await press(page, 'Space', 300);
      await press(page, 'Digit1', 300);
    }
    const arena = await waitForArena(page, 10000);
    if (arena) {
      log({ event: 'arena-entered', attempt, mapId: arena.mapId });
      const p = await canvasCenter(page);
      await page.mouse.click(p.x, p.y);
      await shot(page, '171-kite-arena-entry.png');
      return;
    }
    log({ event: 'arena-entry-retry', attempt, snapshot: await snap(page).catch(() => null) });
  }
  throw new Error('Failed to enter Hollow arena');
}

async function smartFight(page) {
  let lastHealAt = 0;
  let lastShotAt = 0;
  let lastBossHp = 800;
  let lastAttackAt = 0;
  let lastDodgeLogAt = 0;
  let usedOpeningBerserker = false;
  let usedLateBerserker = false;
  let snapshotFailures = 0;
  const started = Date.now();

  for (let tick = 0; tick < 360; tick++) {
    const s = await snap(page).catch(error => {
      log({ result: 'snapshot-failed', error: String(error?.message ?? error) });
      return null;
    });
    if (!s?.player) {
      snapshotFailures += 1;
      if (snapshotFailures > 30) {
        await shot(page, '191-hollow-snapshot-failed.png');
        log({ result: 'snapshot-failed', failures: snapshotFailures });
        return false;
      }
      await wait(180);
      continue;
    }
    snapshotFailures = 0;

    const save = await getSave(page).catch(() => null);
    if (save?.gameFlags?.hollow_guardian_defeated) {
      await shot(page, '190-hollow-guardian-defeated.png');
      log({ result: 'pass', defeated: true, levelComplete: Boolean(save?.gameFlags?.hollow_guardian_defeated), final: summarizeSnapshot(s), log: LOG });
      return true;
    }

    const boss = liveEnemies(s).find(e => e.type === 'hollow_guardian');
    const player = s.player;
    if (!boss) {
      await shot(page, '190-hollow-no-boss.png');
      log({ result: 'fail', reason: 'no-boss', final: summarizeSnapshot(s), log: LOG });
      return false;
    }
    if (player.health <= 0) {
      await shot(page, '191-hollow-guardian-dead.png');
      log({ result: 'fail', reason: 'dead', final: summarizeSnapshot(s), log: LOG });
      return false;
    }

    const adds = liveAdds(s);
    const policy = chooseCombatPolicy(s, boss);
    const addMode = policy.addMode;
    const burnBossNow = policy.mode === 'burn-boss';
    const bossDist = policy.bossDist;

    if (!usedOpeningBerserker && (player.berserkerDraughts ?? 0) > 0 && (player.berserkerTimer ?? 0) <= 0.2 && boss.health >= 700) {
      log({ action: 'use-berserker-opener', tick, bossHp: boss.health });
      await useConsumable(page, 'berserker_draught');
      usedOpeningBerserker = true;
      continue;
    }

    const projectileThreat = incomingProjectileThreat(s);
    if (projectileThreat) {
      const shouldBlock = (projectileThreat.timeToClosest ?? 1) < 0.42 && player.stamina >= 26;
      if (Date.now() - lastDodgeLogAt > 900) {
        log({
          action: shouldBlock ? 'block-projectile' : 'sidestep-projectile',
          tick,
          projectile: projectileThreat.projectile.sprite,
          t: Number(projectileThreat.timeToClosest.toFixed(2)),
          miss: Number(projectileThreat.missDist.toFixed(2)),
          source: projectileThreat.source?.type ?? null,
        });
        lastDodgeLogAt = Date.now();
      }
      if (shouldBlock) {
        await blockMoment(page, 280);
      } else {
        const awayFromSource = projectileThreat.source
          ? { dx: player.x - projectileThreat.source.x, dy: player.y - projectileThreat.source.y }
          : null;
        const side = choosePerpendicular(player, projectileThreat.projectile.vx, projectileThreat.projectile.vy, awayFromSource);
        await dodgeVector(page, side.dx, side.dy);
      }
      continue;
    }

    if (player.health < 42 && (player.health < 35 || Date.now() - lastHealAt > 900)) {
      if (bossDist < 3.0) await retreatFromBoss(page, s, 500);
      if ((player.extracts ?? 0) > 0) {
        await useConsumable(page, 'health_potion');
        lastHealAt = Date.now();
        continue;
      }
      if ((player.tempestGrass ?? 0) > 0) {
        await useConsumable(page, 'tempest_grass');
        lastHealAt = Date.now();
        continue;
      }
    }

    if (
      boss.phase >= 2 &&
      (player.health < 84 || player.stamina < 42) &&
      (player.tempestGrass ?? 0) > 0 &&
      (player.health < 45 || Date.now() - lastHealAt > 1800) &&
      !(burnBossNow && boss.health <= 85 && player.health >= 46)
    ) {
      if (bossDist < 2.6) await retreatFromBoss(page, s, 380);
      await useConsumable(page, 'tempest_grass');
      lastHealAt = Date.now();
      continue;
    }

    const reaverCast = castingReaverThreat(s);
    if (reaverCast) {
      const side = choosePerpendicular(player, player.x - reaverCast.enemy.x, player.y - reaverCast.enemy.y, { dx: -player.x, dy: -player.y });
      if (Date.now() - lastDodgeLogAt > 900) {
        log({ action: 'sidestep-reaver-cast', tick, dist: Number(reaverCast.dist.toFixed(2)) });
        lastDodgeLogAt = Date.now();
      }
      await dodgeVector(page, side.dx, side.dy);
      continue;
    }

    const hazard = nearestHazard(s);
    if (hazard) {
      const escape = escapeVectorFrom(player, hazard.x, hazard.y);
      await dodgeVector(page, escape.dx, escape.dy);
      continue;
    }

    if (boss.health <= 35 && player.health >= 30) {
      const executeHit = canHit(player, boss, 1.08);
      if (executeHit.ok && player.stamina >= 18 && !player.isDodging && (player.hurtTimer ?? 0) <= 0.08) {
        await faceVector(page, boss.x - player.x, boss.y - player.y);
        lastAttackAt = Date.now();
        const before = boss.health;
        const afterSnap = await comboAttack(page, boss.id, player.stamina >= 48 ? 3 : 2);
        const after = afterSnap?.enemies?.find(e => e.id === boss.id)?.health ?? before;
        log({ action: 'execute-boss', tick, before, after, dealt: before - after });
        continue;
      }
      await moveToward(page, boss, 1.45, 900, true);
      continue;
    }

    const inward = arenaInwardVector(player, 8.5) ?? arenaCenterVector(player, 10.0);
    if (inward && (bossDist < 6 || adds.some(add => Math.hypot(add.x - player.x, add.y - player.y) < 5))) {
      await holdKeys(page, keysForVector(inward.dx, inward.dy), 760, true);
      continue;
    }

    if (Date.now() - lastShotAt > 9000 || boss.health !== lastBossHp) {
      await shot(page, `kite-${String(tick).padStart(3, '0')}-boss-${Math.max(0, Math.round(boss.health))}.png`);
      log({
        tick,
        elapsedMs: Date.now() - started,
        mode: policy.mode,
        player: { x: Number(player.x.toFixed(2)), y: Number(player.y.toFixed(2)), hp: player.health, stamina: Math.round(player.stamina), grass: player.tempestGrass, extracts: player.extracts, berserker: player.berserkerDraughts, berserkerTimer: Number((player.berserkerTimer ?? 0).toFixed(1)) },
        boss: { hp: boss.health, state: boss.state, attack: boss.currentAttackType, phase: boss.phase, dist: Number(bossDist.toFixed(2)) },
        adds: adds.map(a => ({ type: a.type, hp: a.health, d: Number(Math.hypot(a.x - player.x, a.y - player.y).toFixed(2)), bd: Number(Math.hypot(a.x - boss.x, a.y - boss.y).toFixed(2)) })),
        projectiles: liveProjectiles(s).map(p => ({ sprite: p.sprite, d: Number(Math.hypot(p.x - player.x, p.y - player.y).toFixed(2)) })),
      });
      lastShotAt = Date.now();
      lastBossHp = boss.health;
    }

    let target = policy.target ?? (addMode ? pickAddTarget(s) : boss);
    if (!target) target = boss;
    const targetHit = canHit(player, target);
    const attackReady = !player.isDodging && (player.hurtTimer ?? 0) <= 0.08 && Date.now() - lastAttackAt > 680;
    const cleanShot = attackReady && targetHit.ok && player.stamina >= 22 && bossDist > (addMode ? 1.65 : 1.05);
    const lethalishBossShot = target.type === 'hollow_guardian' && boss.health <= 95 && player.health >= 42 && cleanShot;

    if (
      !usedLateBerserker &&
      boss.health <= 260 &&
      (player.berserkerDraughts ?? 0) > 0 &&
      (player.berserkerTimer ?? 0) <= 0.2 &&
      !lethalishBossShot &&
      bossDist > 2.4
    ) {
      log({ action: 'use-berserker-late', tick, bossHp: boss.health, phase: boss.phase });
      await useConsumable(page, 'berserker_draught');
      usedLateBerserker = true;
      continue;
    }

    if (player.health < (lethalishBossShot ? 30 : 56) && (player.extracts ?? 0) > 0 && Date.now() - lastHealAt > 2300) {
      if (bossDist < 3.2) await retreatFromBoss(page, s, 560);
      await useConsumable(page, 'health_potion');
      lastHealAt = Date.now();
      continue;
    }

    if (!lethalishBossShot && (player.tempestGrass ?? 0) > 0 && Date.now() - lastHealAt > 2100) {
      const shouldGrass =
        (addMode && (player.health < 92 || player.stamina < 78)) ||
        (burnBossNow && (player.health < 84 || player.stamina < 60)) ||
        (player.stamina < 22 && player.health < 96) ||
        ((player.extracts ?? 0) === 0 && player.health < 55);
      if (shouldGrass) {
        if (bossDist < 3.4) await retreatFromBoss(page, s, 560);
        await useConsumable(page, 'tempest_grass');
        lastHealAt = Date.now();
        continue;
      }
    }

    if (!lethalishBossShot && player.health < 72 && (player.extracts ?? 0) > 0 && Date.now() - lastHealAt > 3300) {
      if (bossDist < 3.0) await retreatFromBoss(page, s, 520);
      await useConsumable(page, 'health_potion');
      lastHealAt = Date.now();
      continue;
    }

    if (addMode && target.type !== 'hollow_guardian') {
      const targetBossDist = Math.hypot(target.x - boss.x, target.y - boss.y);
      if (bossDist < 2.35 && !targetHit.ok) {
        await kiteBossAwayFromAdd(page, s, target);
        continue;
      }
      if (targetBossDist < 3.4 && bossDist < 4.0) {
        await kiteBossAwayFromAdd(page, s, target);
        continue;
      }
    }

    if (!cleanShot && bossDist < 2.1 && player.stamina >= 34 && (boss.state === 'telegraphing' || boss.state === 'attacking')) {
      log({ action: 'block-boss', tick, bossState: boss.state, dist: Number(bossDist.toFixed(2)) });
      await blockMoment(page, 320);
      continue;
    }

    if (bossDist < 1.05 && (boss.state === 'attacking' || boss.state === 'slamming' || addMode)) {
      await retreatFromBoss(page, s, 440);
      continue;
    }

    if (player.stamina < 20 && bossDist < 2.8) {
      await retreatFromBoss(page, s, 500);
      continue;
    }

    if (targetHit.dist < 0.9) {
      await holdKeys(page, keysForVector(player.x - target.x, player.y - target.y || -1), 180);
      continue;
    }

    if (attackReady && targetHit.ok && player.stamina >= 22) {
      await faceVector(page, target.x - player.x, target.y - player.y);
      const verifySnap = await snap(page);
      const verifyPlayer = verifySnap?.player;
      const verifyTarget = liveEnemies(verifySnap).find(e => e.id === target.id);
      const verify = verifyPlayer && verifyTarget ? canHit(verifyPlayer, verifyTarget) : null;
      if (verify?.ok && verify.dist < 0.9) {
        await holdKeys(page, keysForVector(verifyPlayer.x - verifyTarget.x, verifyPlayer.y - verifyTarget.y || -1), 180);
        continue;
      }
      if (verify?.ok && !verifyPlayer.isDodging && (verifyPlayer.hurtTimer ?? 0) <= 0.08 && Date.now() - lastAttackAt > 680) {
        const before = verifyTarget.health;
        lastAttackAt = Date.now();
        const maxHits = verifyTarget.type === 'hollow_guardian'
          ? (verifyTarget.phase >= 3 && verifyTarget.health <= 130 && verifyPlayer.health >= 70 && verifyPlayer.stamina >= 32 ? 3 : verifyTarget.phase >= 3 && verifyPlayer.health < 105 ? 2 : verifyPlayer.health >= 72 && verifyPlayer.stamina >= 58 ? 3 : 2)
          : 3;
        const afterSnap = await comboAttack(page, verifyTarget.id, maxHits);
        const after = afterSnap?.enemies?.find(e => e.id === target.id)?.health ?? before;
        log({ action: addMode ? 'add-combo' : 'boss-combo', mode: policy.mode, tick, target: verifyTarget.type, hits: maxHits, dist: Number(verify.dist.toFixed(2)), before, after, dealt: before - after });
        if (verifyTarget.type === 'hollow_guardian' && before > after && (after <= 500 || player.health < 88)) {
          await retreatFromBoss(page, afterSnap, 380);
        }
        const afterPlayer = afterSnap?.player;
        if (
          verifyTarget.type === 'hollow_guardian' &&
          after <= 170 &&
          afterPlayer &&
          afterPlayer.health > 0 &&
          afterPlayer.health < 104 &&
          (afterPlayer.health < 45 || Date.now() - lastHealAt > 1800)
        ) {
          if ((afterPlayer.tempestGrass ?? 0) > 0) {
            await useConsumable(page, 'tempest_grass');
            lastHealAt = Date.now();
          } else if ((afterPlayer.extracts ?? 0) > 0) {
            await useConsumable(page, 'health_potion');
            lastHealAt = Date.now();
          }
        }
        continue;
      }
    }

    if (!addMode && boss.phase === 1 && target.type === 'hollow_guardian' && targetHit.dist >= 2.0 && targetHit.dist <= 3.1 && player.stamina >= 42 && attackReady && boss.state !== 'slamming') {
      await faceVector(page, target.x - player.x, target.y - player.y);
      const before = target.health;
      lastAttackAt = Date.now();
      await chargedThrust(page);
      const after = (await snap(page))?.enemies?.find(e => e.id === target.id)?.health ?? before;
      log({ action: 'boss-thrust', tick, dist: Number(targetHit.dist.toFixed(2)), before, after, dealt: before - after });
      continue;
    }

    const desiredDist = addMode ? 1.45 : 1.75;
    const maxMs = addMode ? 1800 : Math.min(5800, Math.max(800, (targetHit.dist - desiredDist) * 850));
    await moveToward(page, target, desiredDist, maxMs, true);
  }

  const final = await snap(page).catch(() => null);
  await shot(page, '192-hollow-guardian-timeout.png');
  log({ result: 'fail', reason: 'timeout', final: summarizeSnapshot(final), log: LOG });
  return false;
}

async function main() {
  const { browser, page } = await start();
  let won = false;
  try {
    await enterArena(page);
    won = await smartFight(page);
  } finally {
    await browser.close();
  }
  process.exitCode = won ? 0 : 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
