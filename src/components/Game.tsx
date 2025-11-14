import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ParticleSystem } from '@/lib/game/ParticleSystem';
import { CombatSystem, Enemy } from '@/lib/game/Combat';
import { allMaps } from '@/data/maps';
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
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());
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

    // Enemy meshes storage
    const enemyMeshes = new Map<string, THREE.Mesh>();

    // Smooth camera variables
    const cameraTarget = { x: state.player.position.x, y: state.player.position.y };
    const cameraLerpSpeed = 0.1;

    // Footstep timer
    let footstepTimer = 0;
    const footstepInterval = 0.3;

    // Map transition handler
    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      const newMap = allMaps[targetMap];
      if (!newMap) {
        console.error(`Map ${targetMap} not found`);
        return;
      }

      state.currentMap = targetMap;
      world.loadMap(newMap);
      
      // Convert target spawn position to world coordinates
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
      enemyMeshes.forEach(mesh => scene.remove(mesh));
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

      toast.success(`Entered ${newMap.name}`);
      setVisitedTiles(new Set()); // Reset visited tiles for new map
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

    // Keyboard controls
    const keys: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      
      // Interact key
      if (e.key.toLowerCase() === 'e' && !state.dialogueActive) {
        checkInteraction();
      }

      // Attack key
      if (e.key === ' ' && !state.dialogueActive) {
        e.preventDefault();
        performAttack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    const performAttack = () => {
      const currentTime = Date.now();
      if (currentTime - state.player.lastAttackTime < state.player.attackCooldown) {
        return; // Still on cooldown
      }

      state.player.lastAttackTime = currentTime;

      // Get enemies in attack range
      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        state.player.attackRange
      );

      if (enemiesInRange.length > 0) {
        const target = enemiesInRange[0];
        const died = combatSystem.playerAttack(target, state.player.attackDamage);

        particleSystem.emitDamage(
          new THREE.Vector3(target.position.x, target.position.y, 0.3)
        );

        if (died) {
          toast.success(`Defeated ${target.name}! +${target.goldReward} gold`);
          triggerUIUpdate();
        }
      } else {
        // Attack animation even if no target
        const attackPos = { ...state.player.position };
        if (state.player.direction === 'up') attackPos.y += 1;
        else if (state.player.direction === 'down') attackPos.y -= 1;
        else if (state.player.direction === 'left') attackPos.x -= 1;
        else if (state.player.direction === 'right') attackPos.x += 1;

        particleSystem.emit(
          new THREE.Vector3(attackPos.x, attackPos.y, 0.3),
          4,
          0xFFFFFF,
          0.3,
          1,
          1
        );
      }
    };

    const checkInteraction = () => {
      // Check for NPC interaction
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

      // Check for world object interaction
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
            toast.success('Found 20 gold and a health potion!');
            triggerUIUpdate();
            return;
          }

          if (interactionId === 'forest_chest' && !state.getFlag('forest_chest_opened')) {
            state.addItem(items.moonbloom);
            state.player.gold += 50;
            state.setFlag('forest_chest_opened', true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Found 50 gold and a Moonbloom!');
            triggerUIUpdate();
            return;
          }

          if (interactionId === 'ancient_chest' && !state.getFlag('ancient_chest_opened')) {
            state.addItem(items.ancient_map);
            state.player.gold += 100;
            state.setFlag('ancient_chest_opened', true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Found 100 gold and the Ancient Map!');
            triggerUIUpdate();
            return;
          }
          
          if (interactionId === 'well') {
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
            particleSystem.emitHeal(new THREE.Vector3(checkX, checkY, 0.3));
            toast.success('Refreshing water! Health restored.');
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
      
      // Check for quest-specific dialogue
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

    // Handle window resize
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

    // Delta time tracking
    let lastTime = performance.now();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (!state.dialogueActive) {
        let moveX = 0;
        let moveY = 0;
        let moved = false;
        let newDirection = state.player.direction;

        // Collect input
        if (keys['w'] || keys['arrowup']) {
          moveY += 1;
          newDirection = 'up';
          moved = true;
        }
        if (keys['s'] || keys['arrowdown']) {
          moveY -= 1;
          newDirection = 'down';
          moved = true;
        }
        if (keys['a'] || keys['arrowleft']) {
          moveX -= 1;
          newDirection = 'left';
          moved = true;
        }
        if (keys['d'] || keys['arrowright']) {
          moveX += 1;
          newDirection = 'right';
          moved = true;
        }

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }

        // Apply movement
        if (moved) {
          const newPos = {
            x: state.player.position.x + moveX * state.player.speed,
            y: state.player.position.y + moveY * state.player.speed,
          };

          if (world.isWalkable(newPos.x, newPos.y)) {
            state.player.position = newPos;
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

            // Track visited tiles for minimap
            const currentMap = world.getCurrentMap();
            const tileX = Math.floor(state.player.position.x + currentMap.width / 2);
            const tileY = Math.floor(state.player.position.y + currentMap.height / 2);
            const tileKey = `${tileX},${tileY}`;
            if (!visitedTiles.has(tileKey)) {
              setVisitedTiles(prev => new Set(prev).add(tileKey));
            }

            // Check for map transitions
            const transition = world.getTransitionAt(newPos.x, newPos.y);
            if (transition) {
              handleMapTransition(transition.targetMap, transition.targetX, transition.targetY);
            }
          } else {
            state.player.isMoving = false;
          }
        } else {
          state.player.isMoving = false;
          footstepTimer = 0;
        }

        // Update player mesh
        playerMesh.position.set(state.player.position.x, state.player.position.y, 0.2);

        // Smooth camera follow
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = state.player.position.y;
        camera.position.x += (cameraTarget.x - camera.position.x) * cameraLerpSpeed;
        camera.position.y += (cameraTarget.y - camera.position.y) * cameraLerpSpeed;

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

          enemyMesh.position.set(enemy.position.x, enemy.position.y, 0.2);
        }

        // Remove dead enemy meshes
        const deadEnemies = combatSystem.removeDeadEnemies();
        for (const dead of deadEnemies) {
          const mesh = enemyMeshes.get(dead.id);
          if (mesh) {
            scene.remove(mesh);
            enemyMeshes.delete(dead.id);
          }
        }

        // Check if player died
        if (state.player.health <= 0) {
          toast.error('You have been defeated!');
          state.player.health = state.player.maxHealth;
          state.player.position = world.getSpawnPoint();
          triggerUIUpdate();
        }
      }

      // Update particle system
      particleSystem.update(deltaTime);

      renderer.render(scene, camera);
    };

    animate();
    toast.success('Welcome to the adventure! Press SPACE to attack, E to interact.');

    // Cleanup
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
      toast.success(`New quest: ${quest.title}`);
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
            visitedTiles={visitedTiles}
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
