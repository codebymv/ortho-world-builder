import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager, SharedGeometry } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ParticleSystem } from '@/lib/game/ParticleSystem';
import { BiomeAmbience } from '@/lib/game/BiomeAmbience';
import { WeatherSystem } from '@/lib/game/WeatherSystem';
import { CombatSystem, Enemy } from '@/lib/game/Combat';
import { allMaps, mapDefinitions } from '@/data/maps';
import { dialogues, DialogueNode } from '@/data/dialogues';
import { quests } from '@/data/quests';
import { items } from '@/data/items';
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { Minimap } from './game/Minimap';
import { toast } from 'sonner';

type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up_left' | 'up_right' | 'down_left' | 'down_right';

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [uiVersion, setUiVersion] = useState(0);
  const [currentDialogue, setCurrentDialogue] = useState<{ node: DialogueNode; npcName: string } | null>(null);
  const [npcScreenPos, setNpcScreenPos] = useState<{ x: number; y: number } | null>(null);
  const activeNpcWorldPos = useRef<{ x: number; y: number } | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const visitedTilesRef = useRef<Set<string>>(new Set());
  const [minimapVersion, setMinimapVersion] = useState(0);
  const lastMinimapRefreshRef = useRef(0);
  const gameStateRef = useRef<GameState | null>(null);

  const triggerUIUpdate = () => setUiVersion(prev => prev + 1);
  const triggerMinimapUpdate = (force: boolean = false, now: number = performance.now()) => {
    if (force || now - lastMinimapRefreshRef.current >= 120) {
      lastMinimapRefreshRef.current = now;
      setMinimapVersion(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 12;
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const assetManager = new AssetManager();
    assetManager.loadDefaultAssets();

    const state = new GameState(scene, camera);
    gameStateRef.current = state;
    setGameState(state);

    const particleSystem = new ParticleSystem(scene);
    const combatSystem = new CombatSystem(state);
    const biomeAmbience = new BiomeAmbience(scene);
    const weatherSystem = new WeatherSystem(scene);

    const world = new World(scene, assetManager, allMaps.village);
    const spawnPoint = world.getSpawnPoint();
    state.player.position = { x: spawnPoint.x, y: spawnPoint.y };
    world.updateChunks(spawnPoint.x, spawnPoint.y);
    biomeAmbience.setBiome('grassland');

    const enemyMeshes = new Map<string, THREE.Mesh>();
    const enemyHPBars = new Map<string, { bg: THREE.Mesh; fill: THREE.Mesh }>();
    const cameraTarget = { x: state.player.position.x, y: state.player.position.y };

    // Interaction indicator
    const indicatorTexture = assetManager.getTexture('interact_indicator');
    const indicatorGeometry = new THREE.PlaneGeometry(0.4, 0.4);
    const indicatorMaterial = new THREE.MeshBasicMaterial({
      map: indicatorTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicatorMesh.position.z = 0.5;
    indicatorMesh.visible = false;
    scene.add(indicatorMesh);

    let footstepTimer = 0;
    const footstepInterval = 0.3;
    let lastTime = performance.now();
    const MAX_DELTA = 0.1;
    let portalCooldown = 0;

    // Reusable vectors to avoid per-frame allocation
    const _tmpVec3 = new THREE.Vector3();
    const _worldPosVec3 = new THREE.Vector3();

    // Animation state
    let animFrame = 0;
    let animTimer = 0;
    const IDLE_FRAME_DURATION = 0.8;
    const WALK_FRAME_DURATION = 0.18;
    let playerAnimState: 'idle' | 'walk' | 'attack' | 'dodge' | 'charge' | 'hurt' | 'spin_attack' = 'idle';
    let attackFrameTimer = 0;
    let attackFrame = 0;
    const ATTACK_FRAME_DURATION = 0.1;
    let currentDir8: Direction8 = 'down';

    // Charge attack state
    let isChargingAttack = false;
    let chargeTimer = 0;
    const CHARGE_TIME_MIN = 0.4;   // minimum hold for charged attack
    const CHARGE_TIME_MAX = 1.2;    // fully charged
    const CHARGE_DAMAGE_MULT = 2.5; // damage multiplier at full charge
    let chargeLevel = 0; // 0-1

    // Spin attack animation state
    const SPIN_DIRECTIONS: Direction8[] = ['down', 'left', 'up', 'right'];
    let spinDirIndex = 0;
    let spinFrameTimer = 0;
    const SPIN_FRAME_DURATION = 0.06; // Very fast frame cycling for spin

    // Map biome lookup
    const mapBiomes: Record<string, string> = {
      village: 'grassland',
      forest: 'forest',
      deep_woods: 'swamp',
      ruins: 'ruins',
    };

    const getPlayerTextureName = (dir: Direction8, animState: string, frame: number): string => {
      return `player_${dir}_${animState}_${frame}`;
    };

    const getDirection8 = (mx: number, my: number): Direction8 => {
      if (mx === 0 && my > 0) return 'up';
      if (mx === 0 && my < 0) return 'down';
      if (mx < 0 && my === 0) return 'left';
      if (mx > 0 && my === 0) return 'right';
      if (mx < 0 && my > 0) return 'up_left';
      if (mx > 0 && my > 0) return 'up_right';
      if (mx < 0 && my < 0) return 'down_left';
      if (mx > 0 && my < 0) return 'down_right';
      return 'down';
    };

    const dir8to4 = (d: Direction8): 'up' | 'down' | 'left' | 'right' => {
      if (d === 'up' || d === 'up_left' || d === 'up_right') return 'up';
      if (d === 'left' || d === 'down_left') return 'left';
      if (d === 'right' || d === 'down_right') return 'right';
      return 'down';
    };

    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      const newMap = allMaps[targetMap];
      if (!newMap) return;

      state.currentMap = targetMap;
      world.loadMap(newMap);
      biomeAmbience.setBiome(mapBiomes[targetMap] || 'grassland');
      
      const worldX = targetX - newMap.width / 2;
      const worldY = targetY - newMap.height / 2;
      
      state.player.position = { x: worldX, y: worldY };
      playerMesh.position.set(worldX, worldY, 0.2);
      cameraTarget.x = worldX;
      cameraTarget.y = worldY;
      camera.position.x = worldX;
      camera.position.y = worldY;
      world.updateChunks(worldX, worldY);

      combatSystem.clearAllEnemies();
      enemyMeshes.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      enemyMeshes.clear();
      // Clear HP bars
      enemyHPBars.forEach(({ bg, fill }) => {
        scene.remove(bg);
        scene.remove(fill);
        (bg.material as THREE.Material).dispose();
        (fill.material as THREE.Material).dispose();
      });
      enemyHPBars.clear();

      const mapDef = mapDefinitions[targetMap];
      if (mapDef?.enemyZones) {
        for (const zone of mapDef.enemyZones) {
          let enemySprite: string;
          let enemyName: string;
          let hp: number;
          let dmg: number;

          switch (zone.enemyType) {
            case 'wolf':
              enemySprite = 'enemy_wolf'; enemyName = 'Forest Wolf'; hp = 40; dmg = 10; break;
            case 'shadow':
              enemySprite = 'enemy_shadow'; enemyName = 'Shadow Creature'; hp = 60; dmg = 15; break;
            case 'plant':
              enemySprite = 'enemy_plant'; enemyName = 'Vine Terror'; hp = 50; dmg = 12; break;
            case 'skeleton':
              enemySprite = 'enemy_skeleton'; enemyName = 'Skeleton Warrior'; hp = 55; dmg = 14; break;
            case 'bandit':
              enemySprite = 'enemy_bandit'; enemyName = 'Bandit'; hp = 45; dmg = 11; break;
            case 'golem':
              enemySprite = 'enemy_golem'; enemyName = 'Stone Golem'; hp = 200; dmg = 25; break;
            case 'spider':
              enemySprite = 'enemy_spider'; enemyName = 'Giant Spider'; hp = 35; dmg = 8; break;
            case 'slime':
              enemySprite = 'enemy_slime'; enemyName = 'Green Slime'; hp = 25; dmg = 5; break;
            default:
              enemySprite = 'enemy_wolf'; enemyName = 'Wild Beast'; hp = 40; dmg = 10;
          }
          
          for (let i = 0; i < zone.count; i++) {
            const ex = (zone.x + Math.random() * zone.width) - newMap.width / 2;
            const ey = (zone.y + Math.random() * zone.height) - newMap.height / 2;
            combatSystem.spawnEnemy(enemyName, { x: ex, y: ey }, hp, dmg, enemySprite);
          }
        }
      }

      toast(`Entered ${newMap.name}`, {
        className: "rpg-toast font-bold text-lg text-center justify-center",
        duration: 3000,
      });
      visitedTilesRef.current = new Set();
      triggerMinimapUpdate(true);
      portalCooldown = 0.5;
    };

    const playerGeometry = SharedGeometry.player;
    const playerTexture = assetManager.getTexture('player_down_idle_0');
    const playerMaterial = new THREE.MeshBasicMaterial({
      map: playerTexture,
      transparent: true,
    });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.set(spawnPoint.x, spawnPoint.y, 0.2);
    scene.add(playerMesh);

    const npcData: NPC[] = [
      { id: 'elder', name: 'Village Elder', position: { x: -18, y: -10 }, dialogueId: 'elder', sprite: 'npc_elder', questGiver: true },
      { id: 'merchant', name: 'Traveling Merchant', position: { x: 20, y: -2 }, dialogueId: 'merchant', sprite: 'npc_merchant' },
      { id: 'guard', name: 'Village Guard', position: { x: 0, y: 5 }, dialogueId: 'guard', sprite: 'npc_guard' },
      { id: 'blacksmith', name: 'Blacksmith', position: { x: 35, y: -8 }, dialogueId: 'blacksmith', sprite: 'npc_blacksmith' },
      { id: 'healer', name: 'Healer', position: { x: -10, y: 15 }, dialogueId: 'healer', sprite: 'npc_healer' },
      { id: 'farmer', name: 'Old Farmer', position: { x: -40, y: -30 }, dialogueId: 'farmer', sprite: 'npc_farmer' },
      { id: 'child', name: 'Village Child', position: { x: 5, y: -5 }, dialogueId: 'child', sprite: 'npc_child' },
    ];

    state.npcs = npcData;
    const npcMeshes: THREE.Mesh[] = [];

    npcData.forEach(npc => {
      const npcGeometry = SharedGeometry.player;
      const npcTexture = assetManager.getTexture(npc.sprite);
      const npcMaterial = new THREE.MeshBasicMaterial({
        map: npcTexture,
        transparent: true,
      });
      const npcMesh = new THREE.Mesh(npcGeometry, npcMaterial);
      npcMesh.position.set(npc.position.x, npc.position.y, 0.2);
      npcMesh.userData = { npcId: npc.id };
      scene.add(npcMesh);
      npcMeshes.push(npcMesh);
    });

    const keys: { [key: string]: boolean } = {};
    let interactBuffered = false;
    let dodgeBuffered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e' && !state.dialogueActive) {
        interactBuffered = true;
      }
      if (e.key === ' ' && !state.dialogueActive) {
        e.preventDefault();
        // Start charging instead of immediate attack
        if (!isChargingAttack && !state.player.isDodging && playerAnimState !== 'attack') {
          const currentTime = Date.now();
          if (currentTime - state.player.lastAttackTime >= state.player.attackCooldown) {
            isChargingAttack = true;
            chargeTimer = 0;
            chargeLevel = 0;
            playerAnimState = 'charge';
          }
        }
      }
      if (e.key === 'Shift' && !state.dialogueActive) {
        dodgeBuffered = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') {
        keys['shift'] = false;
      }
      if (e.key === ' ' && isChargingAttack) {
        // Release: perform attack (charged or normal)
        if (chargeTimer >= CHARGE_TIME_MIN) {
          performChargeAttack(chargeLevel);
        } else {
          performAttack();
        }
        isChargingAttack = false;
        chargeTimer = 0;
        chargeLevel = 0;
      }
    };

    const performDodge = (moveX: number, moveY: number) => {
      const now = Date.now();
      if (now - state.player.lastDodgeTime < state.player.dodgeCooldown) return;
      if (state.player.stamina < 25) return;
      if (state.player.isDodging) return;

      // Use facing direction if not moving
      let dx = moveX;
      let dy = moveY;
      if (dx === 0 && dy === 0) {
        const dirMap: Record<string, { x: number; y: number }> = {
          up: { x: 0, y: 1 }, down: { x: 0, y: -1 },
          left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
          up_left: { x: -1, y: 1 }, up_right: { x: 1, y: 1 },
          down_left: { x: -1, y: -1 }, down_right: { x: 1, y: -1 },
        };
        const d = dirMap[currentDir8] || { x: 0, y: -1 };
        dx = d.x;
        dy = d.y;
      }

      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) { dx /= len; dy /= len; }

      state.player.isDodging = true;
      state.player.dodgeTimer = state.player.dodgeDuration;
      state.player.dodgeDirection = { x: dx, y: dy };
      state.player.lastDodgeTime = now;
      state.player.stamina -= 25;
      state.player.lastStaminaUseTime = now / 1000;
      playerAnimState = 'dodge';
      triggerUIUpdate();
    };

    const performAttack = () => {
      const currentTime = Date.now();
      if (currentTime - state.player.lastAttackTime < state.player.attackCooldown) return;
      if (state.player.isDodging) return;

      state.player.lastAttackTime = currentTime;
      playerAnimState = 'attack';
      attackFrame = 0;
      attackFrameTimer = ATTACK_FRAME_DURATION;
      state.player.attackAnimationTimer = ATTACK_FRAME_DURATION * 3;

      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        state.player.attackRange
      );

      if (enemiesInRange.length > 0) {
        let target = enemiesInRange[0];
        const d4 = dir8to4(currentDir8);
        const dirOffsets: Record<string, {x: number, y: number}> = {
          up: {x: 0, y: 1}, down: {x: 0, y: -1},
          left: {x: -1, y: 0}, right: {x: 1, y: 0}
        };
        const dir = dirOffsets[d4];
        
        const facingEnemies = enemiesInRange.filter(e => {
          const edx = e.position.x - state.player.position.x;
          const edy = e.position.y - state.player.position.y;
          return (edx * dir.x + edy * dir.y) > 0;
        });
        if (facingEnemies.length > 0) target = facingEnemies[0];

        const died = combatSystem.playerAttack(target, state.player.attackDamage);

        if (target.state === 'recovering' || (target.health > 0 && target.damageFlashTimer > 0)) {
          particleSystem.emitDamage(
            new THREE.Vector3(target.position.x, target.position.y + 0.5, 0.5)
          );
        }

        particleSystem.emitDamage(
          new THREE.Vector3(target.position.x, target.position.y, 0.3)
        );

        if (died) {
          toast(`Defeated ${target.name}!`, {
            description: `Gained ${target.goldReward} gold.`,
            className: "rpg-toast",
          });
          triggerUIUpdate();
        }
      } else {
        const attackPos = { ...state.player.position };
        const d4 = dir8to4(currentDir8);
        if (d4 === 'up') attackPos.y += 1;
        else if (d4 === 'down') attackPos.y -= 1;
        else if (d4 === 'left') attackPos.x -= 1;
        else if (d4 === 'right') attackPos.x += 1;

        particleSystem.emit(
          new THREE.Vector3(attackPos.x, attackPos.y, 0.3),
          4, 0xFFFFFF, 0.3, 1, 1
        );
      }
    };

    const performChargeAttack = (level: number) => {
      const currentTime = Date.now();
      if (state.player.isDodging) return;

      state.player.lastAttackTime = currentTime;
      // Use spin_attack animation: rapidly cycle through directional attack frames
      playerAnimState = 'spin_attack';
      spinDirIndex = 0;
      spinFrameTimer = SPIN_FRAME_DURATION;
      attackFrame = 1; // mid-swing frame
      state.player.attackAnimationTimer = SPIN_FRAME_DURATION * SPIN_DIRECTIONS.length;

      const dmgMult = 1 + (CHARGE_DAMAGE_MULT - 1) * level;
      const chargeDamage = Math.floor(state.player.attackDamage * dmgMult);
      const chargeRange = state.player.attackRange * (1 + level * 0.5);

      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        chargeRange
      );

      if (enemiesInRange.length > 0) {
        // Charged attack hits ALL enemies in range
        for (const target of enemiesInRange) {
          const died = combatSystem.playerAttack(target, chargeDamage);

          particleSystem.emitDamage(
            new THREE.Vector3(target.position.x, target.position.y, 0.3)
          );

          // Extra sparkle particles for charged hits
          particleSystem.emitSparkles(
            new THREE.Vector3(target.position.x, target.position.y + 0.3, 0.5)
          );

          if (died) {
            toast(`Defeated ${target.name}!`, {
              description: `Charged strike! Gained ${target.goldReward} gold.`,
              className: "rpg-toast",
            });
            triggerUIUpdate();
          }
        }
      } else {
        // Whiff particles (bigger for charge)
        const attackPos = { ...state.player.position };
        const d4 = dir8to4(currentDir8);
        if (d4 === 'up') attackPos.y += 1.5;
        else if (d4 === 'down') attackPos.y -= 1.5;
        else if (d4 === 'left') attackPos.x -= 1.5;
        else if (d4 === 'right') attackPos.x += 1.5;

        particleSystem.emit(
          new THREE.Vector3(attackPos.x, attackPos.y, 0.3),
          8, 0xFFD700, 0.5, 1.5, 2
        );
      }
    };

    const checkInteraction = () => {
      const interactionRange = 1.5;
      const interactionRangeSq = interactionRange * interactionRange;
      for (const npc of state.npcs) {
        const dx = state.player.position.x - npc.position.x;
        const dy = state.player.position.y - npc.position.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < interactionRangeSq) {
          startDialogue(npc.dialogueId, npc.name);
          return;
        }
      }

      const checkX = state.player.position.x;
      const checkY = state.player.position.y;
      const directions = [
        { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
      ];

      for (const dir of directions) {
        const interactionId = world.getInteractableAt(
          checkX + dir.x * 0.5,
          checkY + dir.y * 0.5
        );
        
        if (interactionId) {
          if (interactionId.includes('chest') && !state.getFlag(`${interactionId}_opened`)) {
            const goldAmount = interactionId.includes('ancient') ? 100 : 
                             interactionId.includes('ruins') ? 75 :
                             interactionId.includes('wolf') || interactionId.includes('shadow') ? 60 :
                             interactionId.includes('hidden') ? 50 : 
                             interactionId.includes('forest') ? 40 : 20;
            state.player.gold += goldAmount;
            if (items.health_potion) state.addItem(items.health_potion);
            state.setFlag(`${interactionId}_opened`, true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Chest Opened!', {
              description: `Found ${goldAmount} gold and a Health Potion.`,
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }
          
          if (interactionId === 'well' || interactionId === 'fountain' || interactionId === 'ancient_fountain' || interactionId === 'healing_mushroom' || interactionId === 'campfire') {
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
            particleSystem.emitHeal(new THREE.Vector3(checkX, checkY, 0.3));
            const label = interactionId === 'campfire' ? 'Resting by the Fire' : 
                         interactionId === 'healing_mushroom' ? 'Mushroom Energy!' : 'Refreshing Water!';
            toast.success(label, {
              description: 'Health restored.',
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }
          
          if (dialogues[interactionId]) {
            startDialogue(interactionId, undefined);
            return;
          }
        }
      }
    };

    const startDialogue = (dialogueId: string, npcName?: string) => {
      const dialogue = dialogues[dialogueId];
      if (!dialogue) return;

      state.dialogueActive = true;
      state.currentDialogue = dialogueId;

      // Track the NPC's world position for chat bubble
      const npc = state.npcs.find(n => n.dialogueId === dialogueId);
      if (npc) {
        activeNpcWorldPos.current = { x: npc.position.x, y: npc.position.y };
      } else {
        activeNpcWorldPos.current = null;
      }

      let startNode = dialogue.nodes.find(n => n.id === 'start');
      
      if (dialogueId === 'elder') {
        const hunterQuest = state.quests.find(q => q.id === 'find_hunter');
        if (hunterQuest?.completed) {
          startNode = dialogue.nodes.find(n => n.id === 'quest_complete');
        } else if (hunterQuest?.active) {
          startNode = dialogue.nodes.find(n => n.id === 'quest_active');
        }
      }

      if (startNode) {
        setCurrentDialogue({ node: startNode, npcName: npcName || '' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = frustumSize * aspect / -2;
      camera.right = frustumSize * aspect / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Helper: create/update HP bar for an enemy
    const getOrCreateHPBar = (enemy: Enemy) => {
      let hpBar = enemyHPBars.get(enemy.id);
      if (!hpBar) {
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8, depthWrite: false });
        const bg = new THREE.Mesh(SharedGeometry.hpBarBg, bgMat);

        const fillMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9, depthWrite: false });
        const fill = new THREE.Mesh(SharedGeometry.hpBarFill, fillMat);

        scene.add(bg);
        scene.add(fill);
        hpBar = { bg, fill };
        enemyHPBars.set(enemy.id, hpBar);
      }
      return hpBar;
    };

    // ============= ANIMATION LOOP =============
    const animate = () => {
      requestAnimationFrame(animate);

      const currentTime = performance.now();
      let deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      if (deltaTime > MAX_DELTA) deltaTime = MAX_DELTA;

      // Stamina regen
      const nowSec = currentTime / 1000;
      if (nowSec - state.player.lastStaminaUseTime > state.player.staminaRegenDelay) {
        state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + state.player.staminaRegenRate * deltaTime);
      }

      // Process buffered inputs
      if (interactBuffered && !state.dialogueActive) {
        checkInteraction();
        interactBuffered = false;
      }
      // Update charge timer
      if (isChargingAttack) {
        chargeTimer += deltaTime;
        chargeLevel = Math.min(1, Math.max(0, (chargeTimer - CHARGE_TIME_MIN) / (CHARGE_TIME_MAX - CHARGE_TIME_MIN)));
        playerAnimState = 'charge';
      }

      if (!state.dialogueActive) {
        let moveX = 0;
        let moveY = 0;
        let moved = false;

        if (keys['w'] || keys['arrowup']) { moveY += 1; moved = true; }
        if (keys['s'] || keys['arrowdown']) { moveY -= 1; moved = true; }
        if (keys['a'] || keys['arrowleft']) { moveX -= 1; moved = true; }
        if (keys['d'] || keys['arrowright']) { moveX += 1; moved = true; }

        // Handle dodge input
        if (dodgeBuffered && !state.dialogueActive) {
          performDodge(moveX, moveY);
          dodgeBuffered = false;
        }

        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }

        // Dodge roll movement
        if (state.player.isDodging) {
          state.player.dodgeTimer -= deltaTime;
          const dodgeFrameSpeed = state.player.dodgeSpeed * deltaTime * 60;
          const newPos = {
            x: state.player.position.x + state.player.dodgeDirection.x * dodgeFrameSpeed,
            y: state.player.position.y + state.player.dodgeDirection.y * dodgeFrameSpeed,
          };
          if (world.isWalkable(newPos.x, newPos.y)) {
            state.player.position = newPos;
          }
          world.updateChunks(state.player.position.x, state.player.position.y);

          if (state.player.dodgeTimer <= 0) {
            state.player.isDodging = false;
            playerAnimState = moved ? 'walk' : 'idle';
          }
        } else if (moved && !isChargingAttack && playerAnimState !== 'spin_attack') {
          // Determine 8-direction
          const rawDir = getDirection8(moveX > 0 ? 1 : moveX < 0 ? -1 : 0, moveY > 0 ? 1 : moveY < 0 ? -1 : 0);
          currentDir8 = rawDir;
          state.player.direction = dir8to4(rawDir);

          const frameSpeed = state.player.speed * deltaTime * 60;
          const newPos = {
            x: state.player.position.x + moveX * frameSpeed,
            y: state.player.position.y + moveY * frameSpeed,
          };

          if (world.isWalkable(newPos.x, newPos.y)) {
            state.player.position = newPos;
          } else if (world.isWalkable(newPos.x, state.player.position.y)) {
            state.player.position.x = newPos.x;
          } else if (world.isWalkable(state.player.position.x, newPos.y)) {
            state.player.position.y = newPos.y;
          }

          world.updateChunks(state.player.position.x, state.player.position.y);
          state.player.isMoving = true;

          if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge') {
            playerAnimState = 'walk';
          }

          footstepTimer += deltaTime;
          if (footstepTimer >= footstepInterval) {
          _tmpVec3.set(state.player.position.x, state.player.position.y, 0);
          particleSystem.emitDust(_tmpVec3);
            footstepTimer = 0;
          }

          const currentMap = world.getCurrentMap();
          const tileX = Math.floor(state.player.position.x + currentMap.width / 2);
          const tileY = Math.floor(state.player.position.y + currentMap.height / 2);
          const tileKey = `${tileX},${tileY}`;
          if (!visitedTilesRef.current.has(tileKey)) {
            visitedTilesRef.current.add(tileKey);
            triggerMinimapUpdate(false, currentTime);
          }

          if (portalCooldown > 0) {
            portalCooldown -= deltaTime;
          } else {
            const transition = world.getTransitionAt(state.player.position.x, state.player.position.y);
            if (transition) {
              handleMapTransition(transition.targetMap, transition.targetX, transition.targetY);
            }
          }
        } else {
          state.player.isMoving = false;
          footstepTimer = 0;
          if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'spin_attack') {
            playerAnimState = 'idle';
          }
        }

        // === PLAYER ANIMATION FRAME MANAGEMENT ===
        if (playerAnimState === 'attack') {
          attackFrameTimer -= deltaTime;
          if (attackFrameTimer <= 0) {
            attackFrame++;
            if (attackFrame >= 3) {
              playerAnimState = moved ? 'walk' : 'idle';
              attackFrame = 0;
            } else {
              attackFrameTimer = ATTACK_FRAME_DURATION;
            }
          }
          state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
        }

        // Spin attack: rapidly cycle through directional attack frames
        if (playerAnimState === 'spin_attack') {
          spinFrameTimer -= deltaTime;
          if (spinFrameTimer <= 0) {
            spinDirIndex++;
            if (spinDirIndex >= SPIN_DIRECTIONS.length) {
              playerAnimState = moved ? 'walk' : 'idle';
              spinDirIndex = 0;
            } else {
              spinFrameTimer = SPIN_FRAME_DURATION;
            }
          }
          state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
        }

        // Cycle idle/walk frames
        if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'spin_attack') {
          const frameDuration = playerAnimState === 'walk' ? WALK_FRAME_DURATION : IDLE_FRAME_DURATION;
          animTimer += deltaTime;
          if (animTimer >= frameDuration) {
            animFrame = (animFrame + 1) % 2;
            animTimer = 0;
          }
        }

        // Update charge animation frame
        if (playerAnimState === 'charge') {
          animTimer += deltaTime;
          if (animTimer >= 0.15) {
            animFrame = (animFrame + 1) % 3;
            animTimer = 0;
          }
        }

        // Update player texture based on animation state
        let texName: string;
        if (state.player.damageFlashTimer > 0) {
          texName = getPlayerTextureName(currentDir8, 'hurt', 0);
        } else if (playerAnimState === 'spin_attack') {
          // Use attack frame 1 (mid-swing) cycling through directions
          const spinDir = SPIN_DIRECTIONS[Math.min(spinDirIndex, SPIN_DIRECTIONS.length - 1)];
          texName = getPlayerTextureName(spinDir, 'attack', 1);
        } else if (playerAnimState === 'charge') {
          texName = getPlayerTextureName(currentDir8, 'charge', Math.min(animFrame, 2));
        } else if (playerAnimState === 'attack') {
          texName = getPlayerTextureName(currentDir8, 'attack', Math.min(attackFrame, 2));
        } else if (playerAnimState === 'dodge') {
          texName = getPlayerTextureName(currentDir8, 'walk', animFrame);
        } else {
          texName = getPlayerTextureName(currentDir8, playerAnimState, animFrame);
        }
        
        // Fallback to 4-dir texture if 8-dir not found
        let newTex = assetManager.getTexture(texName);
        if (!newTex) {
          const fallbackDir = dir8to4(playerAnimState === 'spin_attack' 
            ? SPIN_DIRECTIONS[Math.min(spinDirIndex, SPIN_DIRECTIONS.length - 1)] 
            : currentDir8);
          const fallbackState = playerAnimState === 'dodge' ? 'walk' : 
                               playerAnimState === 'charge' ? 'charge' : 
                               playerAnimState === 'spin_attack' ? 'attack' :
                               playerAnimState === 'hurt' ? 'hurt' : playerAnimState;
          const fallbackFrame = playerAnimState === 'attack' ? Math.min(attackFrame, 2) : 
                               playerAnimState === 'spin_attack' ? 1 :
                               playerAnimState === 'charge' ? Math.min(animFrame, 2) : animFrame;
          texName = `player_${fallbackDir}_${fallbackState}_${fallbackFrame}`;
          newTex = assetManager.getTexture(texName);
        }
        
        if (newTex && playerMaterial.map !== newTex) {
          playerMaterial.map = newTex;
        }

        // === PLAYER POSITION WITH ANIMATION OFFSETS ===
        let attackOffsetX = 0;
        let attackOffsetY = 0;
        if (playerAnimState === 'attack' && attackFrame === 1) {
          const lungeAmount = 0.15;
          const d4 = dir8to4(currentDir8);
          if (d4 === 'up') attackOffsetY = lungeAmount;
          else if (d4 === 'down') attackOffsetY = -lungeAmount;
          else if (d4 === 'left') attackOffsetX = -lungeAmount;
          else if (d4 === 'right') attackOffsetX = lungeAmount;
        } else if (playerAnimState === 'spin_attack') {
          // Small radial offset during spin for visual feedback
          const spinDir = SPIN_DIRECTIONS[Math.min(spinDirIndex, SPIN_DIRECTIONS.length - 1)];
          const lungeAmount = 0.1;
          const d4 = dir8to4(spinDir);
          if (d4 === 'up') attackOffsetY = lungeAmount;
          else if (d4 === 'down') attackOffsetY = -lungeAmount;
          else if (d4 === 'left') attackOffsetX = -lungeAmount;
          else if (d4 === 'right') attackOffsetX = lungeAmount;
        }

        // Dodge roll visual: squish + spin
        let dodgeScaleX = 1, dodgeScaleY = 1;
        if (state.player.isDodging) {
          const t = 1 - (state.player.dodgeTimer / state.player.dodgeDuration);
          dodgeScaleX = 1 + Math.sin(t * Math.PI) * 0.3;
          dodgeScaleY = 1 - Math.sin(t * Math.PI) * 0.2;
          playerMesh.rotation.z = t * Math.PI * 2 * (state.player.dodgeDirection.x >= 0 ? -1 : 1);
        } else if (isChargingAttack) {
          // Charge: pulsing scale + slight shake, NO rotation
          const pulse = 1 + chargeLevel * 0.15;
          const shake = chargeLevel * Math.sin(currentTime / 30) * 0.02;
          dodgeScaleX = pulse;
          dodgeScaleY = pulse;
          attackOffsetX += shake;
          playerMesh.rotation.z = 0;
        } else {
          playerMesh.rotation.z = 0;
        }
        playerMesh.scale.set(dodgeScaleX, dodgeScaleY, 1);

        playerMesh.position.set(
          state.player.position.x + attackOffsetX,
          state.player.position.y + attackOffsetY,
          0.2
        );

        // Player damage flash (skip during dodge i-frames)
        if (state.player.damageFlashTimer > 0) {
          state.player.damageFlashTimer -= deltaTime;
          const flashIntensity = Math.sin(state.player.damageFlashTimer * 30) > 0 ? 0xff0000 : 0xff6666;
          playerMaterial.color.setHex(flashIntensity);
        } else if (state.player.isDodging) {
          // Semi-transparent during dodge (i-frames visual)
          playerMaterial.color.setHex(0xaaaaff);
          playerMaterial.opacity = 0.6;
        } else if (isChargingAttack && chargeLevel > 0) {
          // Golden glow during charge
          const glow = Math.sin(currentTime / 100) > 0 ? 0xFFD700 : 0xFFA000;
          playerMaterial.color.setHex(glow);
          playerMaterial.opacity = 1;
        } else {
          playerMaterial.color.setHex(0xffffff);
          playerMaterial.opacity = 1;
        }

        // Smooth camera follow
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = state.player.position.y;

        // === INTERACTION INDICATOR ===
        let showIndicator = false;
        let indicatorX = 0, indicatorY = 0;
        const interactionRange = 1.5;

        // Check NPC proximity
        const interactionRangeSq = interactionRange * interactionRange;
        for (const npc of state.npcs) {
          const ndx = state.player.position.x - npc.position.x;
          const ndy = state.player.position.y - npc.position.y;
          const distSq = ndx * ndx + ndy * ndy;
          if (distSq < interactionRangeSq) {
            showIndicator = true;
            indicatorX = npc.position.x;
            indicatorY = npc.position.y;
            break;
          }
        }

        // Check tile interactables
        if (!showIndicator) {
          const directions = [
            { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
          ];
          for (const dir of directions) {
            const cx = state.player.position.x + dir.x * 0.5;
            const cy = state.player.position.y + dir.y * 0.5;
            const intId = world.getInteractableAt(cx, cy);
            if (intId) {
              showIndicator = true;
              indicatorX = state.player.position.x + dir.x * 0.5;
              indicatorY = state.player.position.y + dir.y * 0.5;
              break;
            }
          }
        }

        if (showIndicator) {
          indicatorMesh.visible = true;
          const bobY = Math.sin(currentTime / 200) * 0.12;
          const pulse = 0.7 + Math.sin(currentTime / 300) * 0.3;
          indicatorMesh.position.set(indicatorX, indicatorY + 0.8 + bobY, 0.5);
          indicatorMaterial.opacity = pulse;
          indicatorMesh.scale.set(0.8 + Math.sin(currentTime / 250) * 0.15, 0.8 + Math.sin(currentTime / 250) * 0.15, 1);
        } else {
          indicatorMesh.visible = false;
        }

        const lerpFactor = 1 - Math.pow(0.001, deltaTime);
        camera.position.x += (cameraTarget.x - camera.position.x) * lerpFactor;
        camera.position.y += (cameraTarget.y - camera.position.y) * lerpFactor;

        // Update combat system — pass dodge state for i-frames
        combatSystem.updateEnemies(deltaTime, state.player.position, state.player.isDodging);

        // === ENEMY RENDERING WITH HP BARS ===
        const enemies = combatSystem.getEnemies();
        for (const enemy of enemies) {
          let enemyMesh = enemyMeshes.get(enemy.id);
          
          if (!enemyMesh) {
            const enemyGeometry = SharedGeometry.enemy;
            const enemyTexture = assetManager.getTexture(enemy.sprite);
            const enemyMaterial = new THREE.MeshBasicMaterial({
              map: enemyTexture,
              transparent: true,
            });
            enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
            enemyMesh.position.z = 0.2;
            scene.add(enemyMesh);
            enemyMeshes.set(enemy.id, enemyMesh);
          }

          const mat = enemyMesh.material as THREE.MeshBasicMaterial;

          let spriteKey = enemy.sprite;
          if (enemy.state === 'telegraphing') {
            spriteKey = `${enemy.sprite}_telegraph`;
          } else if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) {
            spriteKey = `${enemy.sprite}_attack`;
          }

          const enemyTex = assetManager.getTexture(spriteKey);
          if (enemyTex && mat.map !== enemyTex) {
            mat.map = enemyTex;
          }

          if (enemy.damageFlashTimer > 0) {
            enemy.damageFlashTimer -= deltaTime;
            mat.color.setHex(0xff0000);
          } else {
            mat.color.setHex(0xffffff);
          }

          let finalEnemyX = enemy.position.x;
          let finalEnemyY = enemy.position.y;

          if (enemy.state === 'chasing') {
            finalEnemyY += Math.sin(currentTime / 100 + parseFloat(enemy.id.split('_')[1] || "0")) * 0.05;
          } else if (enemy.state === 'telegraphing') {
            const shakeIntensity = 0.06 * (1 - enemy.telegraphTimer / enemy.telegraphDuration);
            finalEnemyX += (Math.random() - 0.5) * shakeIntensity;
            finalEnemyY += (Math.random() - 0.5) * shakeIntensity;
            
            const telegraphProgress = 1 - (enemy.telegraphTimer / enemy.telegraphDuration);
            const scale = 1 + telegraphProgress * 0.2;
            enemyMesh.scale.set(scale, scale, 1);

            if (Math.sin(currentTime / 50) > 0) {
              mat.color.setHex(0xffaa00);
            } else {
              mat.color.setHex(0xffffff);
            }
          } else if (enemy.state === 'recovering') {
            if (enemy.attackAnimationTimer > 0) {
              enemy.attackAnimationTimer -= deltaTime;
              const dx = state.player.position.x - enemy.position.x;
              const dy = state.player.position.y - enemy.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                const lungeProgress = enemy.attackAnimationTimer / 0.3;
                const lungeDistance = Math.sin(lungeProgress * Math.PI) * 0.4;
                finalEnemyX += (dx / dist) * lungeDistance;
                finalEnemyY += (dy / dist) * lungeDistance;
              }
            }
            const recoverProgress = enemy.recoverTimer / enemy.recoverDuration;
            enemyMesh.scale.set(0.9 + recoverProgress * 0.1, 0.9 + recoverProgress * 0.1, 1);
            if (!enemy.damageFlashTimer || enemy.damageFlashTimer <= 0) {
              mat.color.setHex(0x8888ff);
            }
          } else if (enemy.state === 'idle') {
            finalEnemyY += Math.sin(currentTime / 500 + parseFloat(enemy.id.split('_')[1] || "0") * 3) * 0.03;
            enemyMesh.scale.set(1, 1, 1);
          }

          enemyMesh.position.set(finalEnemyX, finalEnemyY, 0.2);

          // === HP BAR ===
          const hpBar = getOrCreateHPBar(enemy);
          const hpRatio = enemy.health / enemy.maxHealth;
          const barY = finalEnemyY + 0.5;
          
          hpBar.bg.position.set(finalEnemyX, barY, 0.35);
          hpBar.fill.position.set(finalEnemyX - 0.29 * (1 - hpRatio), barY, 0.36);
          hpBar.fill.scale.set(hpRatio, 1, 1);

          // Color HP bar based on health
          const fillMat = hpBar.fill.material as THREE.MeshBasicMaterial;
          if (hpRatio > 0.5) fillMat.color.setHex(0x4CAF50);
          else if (hpRatio > 0.25) fillMat.color.setHex(0xFFC107);
          else fillMat.color.setHex(0xF44336);

          // Only show HP bar when enemy is engaged or damaged
          const showBar = enemy.state !== 'idle' || enemy.health < enemy.maxHealth;
          hpBar.bg.visible = showBar;
          hpBar.fill.visible = showBar;
        }

        // Handle dying enemies
        const allEnemies = combatSystem.getAllEnemies();
        const fullyDeadEnemyIds = new Set<string>();

        for (const enemy of allEnemies) {
          if (enemy.state === 'dead') {
            const mesh = enemyMeshes.get(enemy.id);
            if (mesh) {
              mesh.scale.x *= 0.9;
              mesh.scale.y *= 0.9;
              const deadMat = mesh.material as THREE.MeshBasicMaterial;
              deadMat.opacity -= 0.05;

              if (deadMat.opacity <= 0) {
                scene.remove(mesh);
                deadMat.dispose();
                enemyMeshes.delete(enemy.id);

                // Remove HP bar
                const hpBar = enemyHPBars.get(enemy.id);
                if (hpBar) {
                  scene.remove(hpBar.bg);
                  scene.remove(hpBar.fill);
                  (hpBar.bg.material as THREE.Material).dispose();
                  (hpBar.fill.material as THREE.Material).dispose();
                  enemyHPBars.delete(enemy.id);
                }

                fullyDeadEnemyIds.add(enemy.id);
              }
            } else {
              fullyDeadEnemyIds.add(enemy.id);
            }

            // Hide HP bars for dead enemies immediately
            const hpBar = enemyHPBars.get(enemy.id);
            if (hpBar) {
              hpBar.bg.visible = false;
              hpBar.fill.visible = false;
            }
          }
        }

        if (fullyDeadEnemyIds.size > 0) {
          combatSystem.removeDeadEnemiesByIds(Array.from(fullyDeadEnemyIds));
        }

        // Check if player died
        if (state.player.health <= 0) {
          toast.error('You have been defeated!');
          state.player.health = state.player.maxHealth;
          state.player.stamina = state.player.maxStamina;
          state.player.isDodging = false;
          state.player.position = world.getSpawnPoint();
          playerMesh.position.set(state.player.position.x, state.player.position.y, 0.2);
          playerMesh.rotation.z = 0;
          playerMesh.scale.set(1, 1, 1);
          camera.position.x = state.player.position.x;
          camera.position.y = state.player.position.y;
          triggerUIUpdate();
        }
      }

      // Project active NPC world pos to screen for chat bubble
      if (activeNpcWorldPos.current && state.dialogueActive) {
        _worldPosVec3.set(activeNpcWorldPos.current.x, activeNpcWorldPos.current.y + 1.2, 0);
        _worldPosVec3.project(camera);
        const sx = (_worldPosVec3.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const sy = (-_worldPosVec3.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        setNpcScreenPos({ x: sx, y: sy });
      }

      // Update systems
      const currentBiome = mapBiomes[state.currentMap] || 'grassland';
      biomeAmbience.update(deltaTime, state.player.position.x, state.player.position.y);
      weatherSystem.update(deltaTime, state.player.position.x, state.player.position.y, currentBiome);
      particleSystem.update(deltaTime);
      renderer.render(scene, camera);
    };

    animate();

    setTimeout(() => {
      toast("The Village Elder looks deeply troubled...", {
        description: "Perhaps you should speak with him. (Press E to interact)",
        icon: "📜",
        duration: 8000,
        className: "rpg-toast",
      });
    }, 1000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      particleSystem.cleanup();
      biomeAmbience.cleanup();
      renderer.dispose();
    };
  }, []);

  const handleDialogueResponse = (nextId: string, givesQuest?: string) => {
    if (!gameState || !currentDialogue) return;

    if (givesQuest && quests[givesQuest]) {
      const quest = { ...quests[givesQuest], active: true };
      gameState.addQuest(quest);
      toast.success(`Quest Accepted: ${quest.title}`, {
        description: quest.description,
        icon: "📜",
        className: "rpg-toast",
        duration: 5000,
      });
      triggerUIUpdate();
    }

    if (nextId === 'end' || !gameState.currentDialogue) {
      setCurrentDialogue(null);
      setNpcScreenPos(null);
      activeNpcWorldPos.current = null;
      gameState.dialogueActive = false;
      gameState.currentDialogue = null;
      return;
    }

    const dialogue = dialogues[gameState.currentDialogue];
    const nextNode = dialogue.nodes.find(n => n.id === nextId);
    
    if (nextNode) {
      setCurrentDialogue({ node: nextNode, npcName: currentDialogue.npcName });
    }
  };

  const handleCloseDialogue = () => {
    if (gameState) {
      gameState.dialogueActive = false;
      gameState.currentDialogue = null;
    }
    setCurrentDialogue(null);
    setNpcScreenPos(null);
    activeNpcWorldPos.current = null;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <audio src="/audio/ortho_loop.mp3" autoPlay loop style={{ display: 'none' }} ref={(el) => { if (el) el.volume = 0.15; }} />
      <div ref={mountRef} className="w-full h-full" />
      
      {gameState && (
        <>
          <GameUI gameState={gameState} refreshToken={uiVersion} />
          <Minimap
            currentMap={allMaps[gameState.currentMap]}
            playerPosition={gameState.player.position}
            visitedTiles={visitedTilesRef.current}
            npcs={gameState.npcs}
            refreshToken={minimapVersion}
          />
        </>
      )}
      
      {currentDialogue && (
        <DialogueBox
          node={currentDialogue.node}
          npcName={currentDialogue.npcName}
          npcScreenPos={npcScreenPos}
          onResponse={handleDialogueResponse}
          onClose={handleCloseDialogue}
        />
      )}
    </div>
  );
};

export default Game;
