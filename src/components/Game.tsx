import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ParticleSystem } from '@/lib/game/ParticleSystem';
import { CombatSystem, Enemy } from '@/lib/game/Combat';
import { allMaps, mapDefinitions } from '@/data/maps';
import { dialogues, DialogueNode } from '@/data/dialogues';
import { quests } from '@/data/quests';
import { items } from '@/data/items';
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { Minimap } from './game/Minimap';
import { toast } from 'sonner';

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [, forceUpdate] = useState(0);
  const [currentDialogue, setCurrentDialogue] = useState<{ node: DialogueNode; npcName: string } | null>(null);
  const visitedTilesRef = useRef<Set<string>>(new Set());
  const [visitedTilesVersion, setVisitedTilesVersion] = useState(0);
  const gameStateRef = useRef<GameState | null>(null);

  const triggerUIUpdate = () => forceUpdate(prev => prev + 1);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const assetManager = new AssetManager();
    assetManager.loadDefaultAssets();

    const state = new GameState(scene, camera);
    gameStateRef.current = state;
    setGameState(state);

    const particleSystem = new ParticleSystem(scene);
    const combatSystem = new CombatSystem(state);

    const world = new World(scene, assetManager, allMaps.village);
    const spawnPoint = world.getSpawnPoint();
    state.player.position = { x: spawnPoint.x, y: spawnPoint.y };
    world.updateChunks(spawnPoint.x, spawnPoint.y);

    const enemyMeshes = new Map<string, THREE.Mesh>();
    const cameraTarget = { x: state.player.position.x, y: state.player.position.y };

    let footstepTimer = 0;
    const footstepInterval = 0.3;
    let lastTime = performance.now();
    const MAX_DELTA = 0.1;
    let portalCooldown = 0;

    // Animation state
    let animFrame = 0;
    let animTimer = 0;
    const IDLE_FRAME_DURATION = 0.8; // slow idle breathing
    const WALK_FRAME_DURATION = 0.18; // fast walk cycle
    let playerAnimState: 'idle' | 'walk' | 'attack' = 'idle';
    let attackFrameTimer = 0;
    let attackFrame = 0;
    const ATTACK_FRAME_DURATION = 0.1; // 100ms per attack frame (3 frames = 300ms total)

    const getPlayerTextureName = (dir: string, animState: string, frame: number): string => {
      return `player_${dir}_${animState}_${frame}`;
    };

    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      const newMap = allMaps[targetMap];
      if (!newMap) return;

      state.currentMap = targetMap;
      world.loadMap(newMap);
      
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
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      enemyMeshes.clear();

      const mapDef = mapDefinitions[targetMap];
      if (mapDef?.enemyZones) {
        for (const zone of mapDef.enemyZones) {
          const enemySprite = zone.enemyType === 'wolf' ? 'enemy_wolf' : 'enemy_shadow';
          const enemyName = zone.enemyType === 'wolf' ? 'Forest Wolf' : 'Shadow Creature';
          const hp = zone.enemyType === 'wolf' ? 40 : 60;
          const dmg = zone.enemyType === 'wolf' ? 10 : 15;
          
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
      setVisitedTilesVersion(v => v + 1);
      portalCooldown = 0.5;
    };

    const playerGeometry = new THREE.PlaneGeometry(0.7, 0.7);
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
    ];

    state.npcs = npcData;
    const npcMeshes: THREE.Mesh[] = [];

    npcData.forEach(npc => {
      const npcGeometry = new THREE.PlaneGeometry(0.7, 0.7);
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
    let attackBuffered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e' && !state.dialogueActive) {
        interactBuffered = true;
      }
      if (e.key === ' ' && !state.dialogueActive) {
        e.preventDefault();
        attackBuffered = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    const performAttack = () => {
      const currentTime = Date.now();
      if (currentTime - state.player.lastAttackTime < state.player.attackCooldown) return;

      state.player.lastAttackTime = currentTime;

      // Start attack animation
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
        const dirOffsets: Record<string, {x: number, y: number}> = {
          up: {x: 0, y: 1}, down: {x: 0, y: -1},
          left: {x: -1, y: 0}, right: {x: 1, y: 0}
        };
        const dir = dirOffsets[state.player.direction];
        
        const facingEnemies = enemiesInRange.filter(e => {
          const edx = e.position.x - state.player.position.x;
          const edy = e.position.y - state.player.position.y;
          return (edx * dir.x + edy * dir.y) > 0;
        });
        if (facingEnemies.length > 0) target = facingEnemies[0];

        const died = combatSystem.playerAttack(target, state.player.attackDamage);

        // Show bonus damage text if recovering
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
        if (state.player.direction === 'up') attackPos.y += 1;
        else if (state.player.direction === 'down') attackPos.y -= 1;
        else if (state.player.direction === 'left') attackPos.x -= 1;
        else if (state.player.direction === 'right') attackPos.x += 1;

        particleSystem.emit(
          new THREE.Vector3(attackPos.x, attackPos.y, 0.3),
          4, 0xFFFFFF, 0.3, 1, 1
        );
      }
    };

    const checkInteraction = () => {
      const interactionRange = 1.5;
      for (const npc of state.npcs) {
        const distance = Math.sqrt(
          Math.pow(state.player.position.x - npc.position.x, 2) +
          Math.pow(state.player.position.y - npc.position.y, 2)
        );
        if (distance < interactionRange) {
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

    // ============= ANIMATION LOOP =============
    const animate = () => {
      requestAnimationFrame(animate);

      const currentTime = performance.now();
      let deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      if (deltaTime > MAX_DELTA) deltaTime = MAX_DELTA;

      // Process buffered inputs
      if (interactBuffered && !state.dialogueActive) {
        checkInteraction();
        interactBuffered = false;
      }
      if (attackBuffered && !state.dialogueActive) {
        performAttack();
        attackBuffered = false;
      }

      if (!state.dialogueActive) {
        let moveX = 0;
        let moveY = 0;
        let moved = false;
        let newDirection = state.player.direction;

        if (keys['w'] || keys['arrowup']) { moveY += 1; newDirection = 'up'; moved = true; }
        if (keys['s'] || keys['arrowdown']) { moveY -= 1; newDirection = 'down'; moved = true; }
        if (keys['a'] || keys['arrowleft']) { moveX -= 1; newDirection = 'left'; moved = true; }
        if (keys['d'] || keys['arrowright']) { moveX += 1; newDirection = 'right'; moved = true; }

        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }

        if (moved) {
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
          state.player.direction = newDirection;
          state.player.isMoving = true;

          // Walk animation if not attacking
          if (playerAnimState !== 'attack') {
            playerAnimState = 'walk';
          }

          footstepTimer += deltaTime;
          if (footstepTimer >= footstepInterval) {
            particleSystem.emitDust(
              new THREE.Vector3(state.player.position.x, state.player.position.y, 0)
            );
            footstepTimer = 0;
          }

          const currentMap = world.getCurrentMap();
          const tileX = Math.floor(state.player.position.x + currentMap.width / 2);
          const tileY = Math.floor(state.player.position.y + currentMap.height / 2);
          const tileKey = `${tileX},${tileY}`;
          if (!visitedTilesRef.current.has(tileKey)) {
            visitedTilesRef.current.add(tileKey);
            setVisitedTilesVersion(v => v + 1);
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
          if (playerAnimState !== 'attack') {
            playerAnimState = 'idle';
          }
        }

        // === PLAYER ANIMATION FRAME MANAGEMENT ===
        if (playerAnimState === 'attack') {
          attackFrameTimer -= deltaTime;
          if (attackFrameTimer <= 0) {
            attackFrame++;
            if (attackFrame >= 3) {
              // Attack animation done
              playerAnimState = moved ? 'walk' : 'idle';
              attackFrame = 0;
            } else {
              attackFrameTimer = ATTACK_FRAME_DURATION;
            }
          }
          state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
        }

        // Cycle idle/walk frames
        if (playerAnimState !== 'attack') {
          const frameDuration = playerAnimState === 'walk' ? WALK_FRAME_DURATION : IDLE_FRAME_DURATION;
          animTimer += deltaTime;
          if (animTimer >= frameDuration) {
            animFrame = (animFrame + 1) % 2;
            animTimer = 0;
          }
        }

        // Update player texture based on animation state
        const texName = playerAnimState === 'attack'
          ? getPlayerTextureName(state.player.direction, 'attack', Math.min(attackFrame, 2))
          : getPlayerTextureName(state.player.direction, playerAnimState, animFrame);
        
        const newTex = assetManager.getTexture(texName);
        if (newTex && playerMaterial.map !== newTex) {
          playerMaterial.map = newTex;
          playerMaterial.needsUpdate = true;
        }

        // === PLAYER POSITION WITH ANIMATION OFFSETS ===
        let attackOffsetX = 0;
        let attackOffsetY = 0;
        if (playerAnimState === 'attack' && attackFrame === 1) {
          // Lunge forward on the slash frame
          const lungeAmount = 0.15;
          if (state.player.direction === 'up') attackOffsetY = lungeAmount;
          else if (state.player.direction === 'down') attackOffsetY = -lungeAmount;
          else if (state.player.direction === 'left') attackOffsetX = -lungeAmount;
          else if (state.player.direction === 'right') attackOffsetX = lungeAmount;
        }

        playerMesh.position.set(
          state.player.position.x + attackOffsetX,
          state.player.position.y + attackOffsetY,
          0.2
        );

        // Player damage flash
        if (state.player.damageFlashTimer > 0) {
          state.player.damageFlashTimer -= deltaTime;
          const flashIntensity = Math.sin(state.player.damageFlashTimer * 30) > 0 ? 0xff0000 : 0xff6666;
          playerMaterial.color.setHex(flashIntensity);
        } else {
          playerMaterial.color.setHex(0xffffff);
        }

        // Smooth camera follow
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = state.player.position.y;
        const lerpFactor = 1 - Math.pow(0.001, deltaTime);
        camera.position.x += (cameraTarget.x - camera.position.x) * lerpFactor;
        camera.position.y += (cameraTarget.y - camera.position.y) * lerpFactor;

        // Update combat system
        combatSystem.updateEnemies(deltaTime, state.player.position);

        // === ENEMY RENDERING WITH STATE-BASED SPRITES ===
        const enemies = combatSystem.getEnemies();
        for (const enemy of enemies) {
          let enemyMesh = enemyMeshes.get(enemy.id);
          
          if (!enemyMesh) {
            const enemyGeometry = new THREE.PlaneGeometry(0.7, 0.7);
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

          // Choose sprite based on enemy state
          let spriteKey = enemy.sprite; // default idle
          if (enemy.state === 'telegraphing') {
            spriteKey = `${enemy.sprite}_telegraph`;
          } else if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) {
            spriteKey = `${enemy.sprite}_attack`;
          }

          const enemyTex = assetManager.getTexture(spriteKey);
          if (enemyTex && mat.map !== enemyTex) {
            mat.map = enemyTex;
            mat.needsUpdate = true;
          }

          // Enemy damage flash
          if (enemy.damageFlashTimer > 0) {
            enemy.damageFlashTimer -= deltaTime;
            mat.color.setHex(0xff0000);
          } else {
            mat.color.setHex(0xffffff);
          }

          let finalEnemyX = enemy.position.x;
          let finalEnemyY = enemy.position.y;

          // State-based animations
          if (enemy.state === 'chasing') {
            // Bobbing while chasing
            finalEnemyY += Math.sin(currentTime / 100 + parseFloat(enemy.id.split('_')[1] || "0")) * 0.05;
          } else if (enemy.state === 'telegraphing') {
            // Shake/vibrate during telegraph (warning!)
            const shakeIntensity = 0.06 * (1 - enemy.telegraphTimer / enemy.telegraphDuration);
            finalEnemyX += (Math.random() - 0.5) * shakeIntensity;
            finalEnemyY += (Math.random() - 0.5) * shakeIntensity;
            
            // Scale up slightly during telegraph
            const telegraphProgress = 1 - (enemy.telegraphTimer / enemy.telegraphDuration);
            const scale = 1 + telegraphProgress * 0.2;
            enemyMesh.scale.set(scale, scale, 1);

            // Pulsing glow
            if (Math.sin(currentTime / 50) > 0) {
              mat.color.setHex(0xffaa00);
            } else {
              mat.color.setHex(0xffffff);
            }
          } else if (enemy.state === 'recovering') {
            // Attack lunge then recoil
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
            // Shrink slightly during recovery (vulnerable)
            const recoverProgress = enemy.recoverTimer / enemy.recoverDuration;
            enemyMesh.scale.set(0.9 + recoverProgress * 0.1, 0.9 + recoverProgress * 0.1, 1);
            // Tint slightly blue to show vulnerability
            if (!enemy.damageFlashTimer || enemy.damageFlashTimer <= 0) {
              mat.color.setHex(0x8888ff);
            }
          } else if (enemy.state === 'idle') {
            // Gentle floating
            finalEnemyY += Math.sin(currentTime / 500 + parseFloat(enemy.id.split('_')[1] || "0") * 3) * 0.03;
            enemyMesh.scale.set(1, 1, 1);
          }

          enemyMesh.position.set(finalEnemyX, finalEnemyY, 0.2);
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
                mesh.geometry.dispose();
                deadMat.dispose();
                enemyMeshes.delete(enemy.id);
                fullyDeadEnemyIds.add(enemy.id);
              }
            } else {
              fullyDeadEnemyIds.add(enemy.id);
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
          state.player.position = world.getSpawnPoint();
          playerMesh.position.set(state.player.position.x, state.player.position.y, 0.2);
          camera.position.x = state.player.position.x;
          camera.position.y = state.player.position.y;
          triggerUIUpdate();
        }
      }

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
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      particleSystem.cleanup();
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
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {gameState && (
        <>
          <GameUI gameState={gameState} />
          <Minimap
            currentMap={allMaps[gameState.currentMap]}
            playerPosition={gameState.player.position}
            visitedTiles={visitedTilesRef.current}
            npcs={gameState.npcs}
          />
        </>
      )}
      
      {currentDialogue && (
        <DialogueBox
          node={currentDialogue.node}
          npcName={currentDialogue.npcName}
          onResponse={handleDialogueResponse}
          onClose={handleCloseDialogue}
        />
      )}
    </div>
  );
};

export default Game;
