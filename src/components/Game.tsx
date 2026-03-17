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

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // Orthographic camera for 2D view
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

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Initialize game systems
    const assetManager = new AssetManager();
    assetManager.loadDefaultAssets();

    const state = new GameState(scene, camera);
    gameStateRef.current = state;
    setGameState(state);

    const particleSystem = new ParticleSystem(scene);
    const combatSystem = new CombatSystem(state);

    // Load world
    const world = new World(scene, assetManager, allMaps.village);
    const spawnPoint = world.getSpawnPoint();
    state.player.position = { x: spawnPoint.x, y: spawnPoint.y };
    // Initial chunk render
    world.updateChunks(spawnPoint.x, spawnPoint.y);

    // Enemy meshes storage
    const enemyMeshes = new Map<string, THREE.Mesh>();

    // Smooth camera variables
    const cameraTarget = { x: state.player.position.x, y: state.player.position.y };

    // Footstep timer
    let footstepTimer = 0;
    const footstepInterval = 0.3;

    // Delta time smoothing
    let lastTime = performance.now();
    const dtAccumulator = 0;
    const FIXED_STEP = 1 / 60;
    const MAX_DELTA = 0.1;
    let portalCooldown = 0; // Prevent instant re-transition

    // Map transition handler
    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      const newMap = allMaps[targetMap];
      if (!newMap) {
        console.error(`Map ${targetMap} not found`);
        return;
      }

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

      // Clear enemies when changing maps
      combatSystem.clearAllEnemies();
      enemyMeshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      enemyMeshes.clear();

      // Spawn enemies based on map
      if (targetMap === 'forest') {
        for (let i = 0; i < 3; i++) {
          combatSystem.spawnEnemy(
            'Forest Wolf',
            { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 },
            40,
            10,
            'enemy_wolf'
          );
        }
      } else if (targetMap === 'deep_woods') {
        for (let i = 0; i < 5; i++) {
          combatSystem.spawnEnemy(
            'Shadow Creature',
            { x: Math.random() * 8 - 4, y: Math.random() * 8 - 4 },
            60,
            15,
            'enemy_shadow'
          );
        }
      }

      toast(`Entered ${newMap.name}`, {
        className: "rpg-toast font-bold text-lg text-center justify-center",
        duration: 3000,
      });
      visitedTilesRef.current = new Set();
      setVisitedTilesVersion(v => v + 1);
      portalCooldown = 0.5; // Half second cooldown before next transition
    };

    // Create player mesh
    const playerGeometry = new THREE.PlaneGeometry(0.7, 0.7);
    const playerTexture = assetManager.getTexture('player_down');
    const playerMaterial = new THREE.MeshBasicMaterial({
      map: playerTexture,
      transparent: true,
    });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.set(spawnPoint.x, spawnPoint.y, 0.2);
    scene.add(playerMesh);

    // Add NPCs
    const npcData: NPC[] = [
      { id: 'elder', name: 'Village Elder', position: { x: -5, y: 3 }, dialogueId: 'elder', sprite: 'npc_elder', questGiver: true },
      { id: 'merchant', name: 'Traveling Merchant', position: { x: 5, y: 1 }, dialogueId: 'merchant', sprite: 'npc_merchant' },
      { id: 'guard', name: 'Village Guard', position: { x: 2, y: -3 }, dialogueId: 'guard', sprite: 'npc_guard' },
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

    // Keyboard controls with input buffering
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
      if (currentTime - state.player.lastAttackTime < state.player.attackCooldown) {
        return;
      }

      state.player.lastAttackTime = currentTime;

      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        state.player.attackRange
      );

      state.player.attackAnimationTimer = 0.2; // 200ms weapon swing/lunge

      if (enemiesInRange.length > 0) {
        // Target closest enemy in facing direction first, fallback to closest overall
        let target = enemiesInRange[0];
        const dirOffsets: Record<string, {x: number, y: number}> = {
          up: {x: 0, y: 1}, down: {x: 0, y: -1},
          left: {x: -1, y: 0}, right: {x: 1, y: 0}
        };
        const dir = dirOffsets[state.player.direction];
        
        // Prefer enemies in facing direction
        const facingEnemies = enemiesInRange.filter(e => {
          const dx = e.position.x - state.player.position.x;
          const dy = e.position.y - state.player.position.y;
          return (dx * dir.x + dy * dir.y) > 0;
        });
        if (facingEnemies.length > 0) target = facingEnemies[0];

        const died = combatSystem.playerAttack(target, state.player.attackDamage);

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
          if (interactionId === 'chest_1' && !state.getFlag('chest_1_opened')) {
            state.addItem(items.health_potion);
            state.player.gold += 20;
            state.setFlag('chest_1_opened', true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Chest Opened!', {
              description: 'Found 20 gold and a Health Potion.',
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }

          if (interactionId === 'forest_chest' && !state.getFlag('forest_chest_opened')) {
            state.addItem(items.moonbloom);
            state.player.gold += 50;
            state.setFlag('forest_chest_opened', true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Hidden Cache Found!', {
              description: 'Found 50 gold and a Moonbloom.',
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }

          if (interactionId === 'ancient_chest' && !state.getFlag('ancient_chest_opened')) {
            state.addItem(items.ancient_map);
            state.player.gold += 100;
            state.setFlag('ancient_chest_opened', true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Ancient Treasure!', {
              description: 'Found 100 gold and the Ancient Map.',
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }
          
          if (interactionId === 'well' || interactionId === 'fountain' || interactionId === 'ancient_fountain') {
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
            particleSystem.emitHeal(new THREE.Vector3(checkX, checkY, 0.3));
            toast.success('Refreshing Water!', {
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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const currentTime = performance.now();
      let deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Cap delta time to prevent physics explosion after tab-away
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

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }

        if (moved) {
          // Delta-time based movement (speed * 60 to normalize around 60fps feel)
          const frameSpeed = state.player.speed * deltaTime * 60;
          const newPos = {
            x: state.player.position.x + moveX * frameSpeed,
            y: state.player.position.y + moveY * frameSpeed,
          };

          // Try full movement, then axis-separated (wall sliding)
          if (world.isWalkable(newPos.x, newPos.y)) {
            state.player.position = newPos;
          } else if (world.isWalkable(newPos.x, state.player.position.y)) {
            state.player.position.x = newPos.x;
          } else if (world.isWalkable(state.player.position.x, newPos.y)) {
            state.player.position.y = newPos.y;
          }

          state.player.direction = newDirection;
          state.player.isMoving = true;

          // Update player texture
          const directionTexture = assetManager.getTexture(`player_${newDirection}`);
          if (directionTexture && playerMaterial.map !== directionTexture) {
            playerMaterial.map = directionTexture;
            playerMaterial.needsUpdate = true;
          }

          // Footstep particles
          footstepTimer += deltaTime;
          if (footstepTimer >= footstepInterval) {
            particleSystem.emitDust(
              new THREE.Vector3(state.player.position.x, state.player.position.y, 0)
            );
            footstepTimer = 0;
          }

          // Track visited tiles for minimap (use ref to avoid stale closure)
          const currentMap = world.getCurrentMap();
          const tileX = Math.floor(state.player.position.x + currentMap.width / 2);
          const tileY = Math.floor(state.player.position.y + currentMap.height / 2);
          const tileKey = `${tileX},${tileY}`;
          if (!visitedTilesRef.current.has(tileKey)) {
            visitedTilesRef.current.add(tileKey);
            setVisitedTilesVersion(v => v + 1);
          }

          // Check for map transitions (with cooldown)
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
        }

        // --- Animations & Visual Effects ---
        // Player bobbing animation while moving
        let bobbingOffset = 0;
        if (state.player.isMoving) {
          bobbingOffset = Math.sin(currentTime / 100) * 0.05;
        }

        // Player attack lunge animation
        let attackOffsetX = 0;
        let attackOffsetY = 0;
        if (state.player.attackAnimationTimer > 0) {
          state.player.attackAnimationTimer -= deltaTime;
          const lungeAmount = Math.sin((state.player.attackAnimationTimer / 0.2) * Math.PI) * 0.3;
          if (state.player.direction === 'up') attackOffsetY = lungeAmount;
          else if (state.player.direction === 'down') attackOffsetY = -lungeAmount;
          else if (state.player.direction === 'left') attackOffsetX = -lungeAmount;
          else if (state.player.direction === 'right') attackOffsetX = lungeAmount;
        }

        // Update player mesh position with animation offsets
        playerMesh.position.set(
          state.player.position.x + attackOffsetX,
          state.player.position.y + bobbingOffset + attackOffsetY,
          0.2
        );

        // Player damage flash
        if (state.player.damageFlashTimer > 0) {
          state.player.damageFlashTimer -= deltaTime;
          playerMaterial.color.setHex(0xff0000); // Red flash
        } else {
          playerMaterial.color.setHex(0xffffff); // Normal color
        }

        // Smooth camera follow (delta-time based lerp)
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = state.player.position.y;
        const lerpFactor = 1 - Math.pow(0.001, deltaTime); // frame-rate independent lerp
        camera.position.x += (cameraTarget.x - camera.position.x) * lerpFactor;
        camera.position.y += (cameraTarget.y - camera.position.y) * lerpFactor;

        // Update combat system
        combatSystem.updateEnemies(deltaTime, state.player.position);

        // Update/create enemy meshes
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

          // Enemy bobbing animation while chasing
          let enemyBobbingOffset = 0;
          if (enemy.state === 'chasing') {
            enemyBobbingOffset = Math.sin(currentTime / 100 + parseFloat(enemy.id.split('_')[1] || "0")) * 0.05;
          }

          // Enemy damage flash
          if (enemy.damageFlashTimer > 0) {
            enemy.damageFlashTimer -= deltaTime;
            (enemyMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
          } else {
            (enemyMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
          }

          let finalEnemyX = enemy.position.x;
          let finalEnemyY = enemy.position.y + enemyBobbingOffset;

          // Enemy attack lunge animation
          if (enemy.attackAnimationTimer && enemy.attackAnimationTimer > 0) {
            enemy.attackAnimationTimer -= deltaTime * 1000;
            const progress = enemy.attackAnimationTimer / 200; // 200ms animation
            if (progress > 0) {
              const lungeDistance = Math.sin(progress * Math.PI) * 0.3; // Lunge distance

              // Calculate direction to player
              const dx = state.player.position.x - enemy.position.x;
              const dy = state.player.position.y - enemy.position.y;
              const dist = Math.sqrt(dx*dx + dy*dy);

              if (dist > 0) {
                finalEnemyX += (dx / dist) * lungeDistance;
                finalEnemyY += (dy / dist) * lungeDistance;
              }
            } else {
              enemy.attackAnimationTimer = 0;
            }
          }

          enemyMesh.position.set(
            finalEnemyX,
            finalEnemyY,
            0.2
          );
        }

        // Handle dying enemies
        const allEnemies = combatSystem.getAllEnemies();
        const fullyDeadEnemyIds = new Set<string>();

        for (const enemy of allEnemies) {
          if (enemy.state === 'dead') {
            const mesh = enemyMeshes.get(enemy.id);
            if (mesh) {
              // Death animation: fade out and shrink
              mesh.scale.x *= 0.9;
              mesh.scale.y *= 0.9;
              const mat = mesh.material as THREE.MeshBasicMaterial;
              mat.opacity -= 0.05;

              if (mat.opacity <= 0) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mat.dispose();
                enemyMeshes.delete(enemy.id);
                fullyDeadEnemyIds.add(enemy.id);
              }
            } else {
               // If mesh is already gone but enemy is still in state, mark for removal
               fullyDeadEnemyIds.add(enemy.id);
            }
          }
        }

        // Remove completely dead enemies from logical state only after animation completes
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

      // Update particle system
      particleSystem.update(deltaTime);

      renderer.render(scene, camera);
    };

    animate();

    // Initial narrative hook instead of generic toast
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
