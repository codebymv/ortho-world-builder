import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Orthographic camera for 2D view
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;
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

    // Ground/Background plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228b22 }); // Forest green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.z = -1;
    scene.add(ground);

    // Player sprite (simple square for now)
    const playerGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0, 0);
    scene.add(player);

    // Keyboard controls
    const keys: { [key: string]: boolean } = {};
    const moveSpeed = 0.05;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
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

      // Player movement
      if (keys['w'] || keys['arrowup']) player.position.y += moveSpeed;
      if (keys['s'] || keys['arrowdown']) player.position.y -= moveSpeed;
      if (keys['a'] || keys['arrowleft']) player.position.x -= moveSpeed;
      if (keys['d'] || keys['arrowright']) player.position.x += moveSpeed;

      // Keep player in bounds
      player.position.x = Math.max(-9, Math.min(9, player.position.x));
      player.position.y = Math.max(-4.5, Math.min(4.5, player.position.y));

      renderer.render(scene, camera);
    };

    animate();

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

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded-lg">
        <p className="text-sm font-bold mb-2">Controls:</p>
        <p className="text-xs">WASD or Arrow Keys to move</p>
      </div>
    </div>
  );
};

export default Game;
