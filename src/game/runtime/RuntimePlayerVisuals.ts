import * as THREE from 'three';

export interface RuntimePlayerVisuals {
  shadowGeometry: THREE.CircleGeometry;
  shadowMaterial: THREE.MeshBasicMaterial;
  playerShadow: THREE.Mesh;
  playerMaterial: THREE.MeshBasicMaterial;
  playerMesh: THREE.Mesh;
  playerOutline: THREE.Mesh;
  bladeOverlayMaterial: THREE.MeshBasicMaterial;
  bladeOverlayMesh: THREE.Mesh;
  heldItemMaterial: THREE.MeshBasicMaterial;
  heldItemMesh: THREE.Mesh;
  dispose: () => void;
}

interface CreateRuntimePlayerVisualsOptions {
  scene: THREE.Scene;
  playerGeometry: THREE.BufferGeometry;
  playerTexture: THREE.Texture | null;
  heldItemTexture: THREE.Texture | null;
  playerBaseScale: number;
  initialPosition: { x: number; y: number };
  getPlayerVisualY: (x: number, y: number) => number;
  createOutlineMesh: (geometry: THREE.BufferGeometry, texture: THREE.Texture | null) => THREE.Mesh;
}

export function createRuntimePlayerVisuals({
  scene,
  playerGeometry,
  playerTexture,
  heldItemTexture,
  playerBaseScale,
  initialPosition,
  getPlayerVisualY,
  createOutlineMesh,
}: CreateRuntimePlayerVisualsOptions): RuntimePlayerVisuals {
  const shadowGeometry = new THREE.CircleGeometry(0.25, 12);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  const playerShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
  playerShadow.position.z = 0.05;
  playerShadow.scale.set(1.0, 0.4, 1);
  playerShadow.renderOrder = 1;
  scene.add(playerShadow);

  const playerMaterial = new THREE.MeshBasicMaterial({
    map: playerTexture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    alphaTest: 0,
    side: THREE.DoubleSide,
  });
  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.position.set(
    initialPosition.x,
    getPlayerVisualY(initialPosition.x, initialPosition.y),
    0.8,
  );
  playerMesh.scale.setScalar(playerBaseScale);
  playerMesh.renderOrder = 999999;
  scene.add(playerMesh);

  const playerOutline = createOutlineMesh(playerGeometry, playerTexture);
  playerOutline.position.z = 0.79;
  playerOutline.renderOrder = 999998;
  scene.add(playerOutline);

  const bladeOverlayMaterial = new THREE.MeshBasicMaterial({
    map: playerTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const bladeOverlayMesh = new THREE.Mesh(playerGeometry, bladeOverlayMaterial);
  bladeOverlayMesh.position.z = 0.81;
  bladeOverlayMesh.renderOrder = 9999999;
  bladeOverlayMesh.visible = false;
  scene.add(bladeOverlayMesh);

  const heldItemMaterial = new THREE.MeshBasicMaterial({
    map: heldItemTexture,
    transparent: true,
    depthWrite: false,
  });
  const heldItemMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), heldItemMaterial);
  heldItemMesh.position.z = 0.85;
  heldItemMesh.renderOrder = 1000000;
  heldItemMesh.visible = false;
  scene.add(heldItemMesh);

  return {
    shadowGeometry,
    shadowMaterial,
    playerShadow,
    playerMaterial,
    playerMesh,
    playerOutline,
    bladeOverlayMaterial,
    bladeOverlayMesh,
    heldItemMaterial,
    heldItemMesh,
    dispose: () => {
      scene.remove(playerMesh);
      (playerMesh.material as THREE.Material).dispose();

      scene.remove(playerShadow);
      (playerShadow.material as THREE.Material).dispose();

      scene.remove(playerOutline);
      (playerOutline.material as THREE.Material).dispose();

      scene.remove(bladeOverlayMesh);
      bladeOverlayMaterial.dispose();

      scene.remove(heldItemMesh);
      (heldItemMesh.material as THREE.Material).dispose();

      shadowMaterial.dispose();
      shadowGeometry.dispose();
    },
  };
}
