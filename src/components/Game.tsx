import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { villageMap } from '@/data/maps';
import { dialogues, DialogueNode } from '@/data/dialogues';
import { quests } from '@/data/quests';
import { items } from '@/data/items';
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { toast } from 'sonner';

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [, forceUpdate] = useState(0);
  const [currentDialogue, setCurrentDialogue] = useState<{ node: DialogueNode; npcName: string } | null>(null);
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

    // Load world
    const world = new World(scene, assetManager, villageMap);
    const spawnPoint = world.getSpawnPoint();
    state.player.position = { x: spawnPoint.x, y: spawnPoint.y };

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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
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
            toast.success('Found 20 gold and a health potion!');
            return;
          }
          
          if (interactionId === 'well') {
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (!state.dialogueActive) {
        let moved = false;
        const newPos = { ...state.player.position };
        let newDirection = state.player.direction;

        if (keys['w'] || keys['arrowup']) {
          newPos.y += state.player.speed;
          newDirection = 'up';
          moved = true;
        }
        if (keys['s'] || keys['arrowdown']) {
          newPos.y -= state.player.speed;
          newDirection = 'down';
          moved = true;
        }
        if (keys['a'] || keys['arrowleft']) {
          newPos.x -= state.player.speed;
          newDirection = 'left';
          moved = true;
        }
        if (keys['d'] || keys['arrowright']) {
          newPos.x += state.player.speed;
          newDirection = 'right';
          moved = true;
        }

        if (moved && world.isWalkable(newPos.x, newPos.y)) {
          state.player.position = newPos;
          state.player.direction = newDirection;
          state.player.isMoving = true;

          // Update player texture based on direction
          const directionTexture = assetManager.getTexture(`player_${newDirection}`);
          if (directionTexture && playerMaterial.map !== directionTexture) {
            playerMaterial.map = directionTexture;
            playerMaterial.needsUpdate = true;
          }
        } else {
          state.player.isMoving = false;
        }

        playerMesh.position.set(state.player.position.x, state.player.position.y, 0.2);

        // Camera follows player
        camera.position.x = state.player.position.x;
        camera.position.y = state.player.position.y;
      }

      renderer.render(scene, camera);
    };

    animate();
    toast.success('Welcome to the adventure!');

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
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
      
      {gameState && <GameUI gameState={gameState} />}
      
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
