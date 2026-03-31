import * as THREE from 'three';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';

interface PortalHint {
  targetMap: string;
  targetX: number;
  targetY: number;
}

interface UpdatePortalWarpOptions {
  currentTime: number;
  deltaTime: number;
  playerPosition: { x: number; y: number };
  portalCooldown: number;
  isDialogueActive: boolean;
  isPlayerDead: boolean;
  isMapModalOpen: boolean;
  camera: THREE.OrthographicCamera;
  vignette: HTMLDivElement | null;
  particleSystem: ParticleSystem;
  samplePortalNearPlayer: () => PortalHint | null;
  isPortalDestinationUnlocked: (targetMap: string) => boolean;
  notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
}

interface CreatePortalWarpManagerOptions {
  startPortalChargeLoop: () => void;
  stopPortalChargeLoop: () => void;
}

export function createPortalWarpManager({
  startPortalChargeLoop,
  stopPortalChargeLoop,
}: CreatePortalWarpManagerOptions) {
  let warpCharge = 0;
  let particleAccumulator = 0;
  let lastBarrierToastAt = -1e12;
  let blockedPortalHintTimer = 0;
  let portalLoopActive = false;
  const tmpVec3 = new THREE.Vector3();
  const PORTAL_CHARGE_SEC = 1.12;

  const stopLoop = () => {
    if (!portalLoopActive) return;
    portalLoopActive = false;
    stopPortalChargeLoop();
  };

  const startLoop = () => {
    if (portalLoopActive) return;
    portalLoopActive = true;
    startPortalChargeLoop();
  };

  return {
    update({
      currentTime,
      deltaTime,
      playerPosition,
      portalCooldown,
      isDialogueActive,
      isPlayerDead,
      isMapModalOpen,
      camera,
      vignette,
      particleSystem,
      samplePortalNearPlayer,
      isPortalDestinationUnlocked,
      notify,
      handleMapTransition,
    }: UpdatePortalWarpOptions) {
      const px = playerPosition.x;
      const py = playerPosition.y;

      if (portalCooldown > 0 || isDialogueActive || isPlayerDead || isMapModalOpen) {
        warpCharge = 0;
        particleAccumulator = 0;
        blockedPortalHintTimer = 0;
        stopLoop();
        if (vignette) {
          vignette.style.opacity = '0';
        }
        return;
      }

      const nearPortal = samplePortalNearPlayer();
      if (!nearPortal) {
        warpCharge = Math.max(0, warpCharge - deltaTime * 2.4);
        particleAccumulator = 0;
        blockedPortalHintTimer = 0;
        stopLoop();
        if (vignette) vignette.style.opacity = '0';
        return;
      }

      if (!isPortalDestinationUnlocked(nearPortal.targetMap)) {
        warpCharge = Math.max(0, warpCharge - deltaTime * 2.8);
        blockedPortalHintTimer += deltaTime;
        stopLoop();
        if (vignette) {
          const pulse = 0.18 + Math.sin(currentTime * 0.006) * 0.06;
          vignette.style.opacity = String(pulse);
          vignette.style.background =
            'radial-gradient(circle at 50% 52%, rgba(140,30,70,0.55) 0%, rgba(40,0,60,0.5) 50%, transparent 72%)';
        }
        particleAccumulator += deltaTime;
        if (particleAccumulator > 0.14) {
          particleAccumulator = 0;
          tmpVec3.set(px, py + 0.45, 0.28);
          particleSystem.emitPortalBlocked(tmpVec3);
        }
        if (blockedPortalHintTimer > 0.5 && currentTime - lastBarrierToastAt > 9000) {
          lastBarrierToastAt = currentTime;
          blockedPortalHintTimer = 0;
          notify('Magical barrier blocks this portal', {
            id: 'portal-barrier',
            description: 'Complete the right quest to unlock this route.',
            duration: 4500,
          });
        }
        return;
      }

      blockedPortalHintTimer = 0;
      warpCharge = Math.min(1, warpCharge + deltaTime / PORTAL_CHARGE_SEC);
      startLoop();
      if (vignette) {
        const opacity = warpCharge * (0.42 + Math.sin(currentTime * 0.01) * 0.08);
        vignette.style.opacity = String(Math.min(0.68, opacity));
        vignette.style.background =
          'radial-gradient(circle at 50% 46%, rgba(200,120,255,0.55) 0%, rgba(80,40,200,0.4) 38%, rgba(0,220,200,0.2) 62%, transparent 82%)';
      }

      particleAccumulator += deltaTime;
      const emitEvery = Math.max(0.028, 0.055 - warpCharge * 0.028);
      if (particleAccumulator >= emitEvery) {
        particleAccumulator = 0;
        tmpVec3.set(
          px + (Math.random() - 0.5) * 0.25,
          py + 0.4 + Math.random() * 0.2,
          0.22,
        );
        particleSystem.emitPortalWarp(tmpVec3, warpCharge);
      }

      camera.position.x += Math.sin(currentTime * 0.009) * 0.038 * warpCharge;
      camera.position.y += Math.cos(currentTime * 0.011) * 0.024 * warpCharge;

      if (warpCharge >= 1) {
        warpCharge = 0;
        particleAccumulator = 0;
        stopLoop();
        if (vignette) vignette.style.opacity = '0';
        handleMapTransition(nearPortal.targetMap, nearPortal.targetX, nearPortal.targetY);
      }
    },
    reset(vignette: HTMLDivElement | null) {
      warpCharge = 0;
      particleAccumulator = 0;
      blockedPortalHintTimer = 0;
      stopLoop();
      if (vignette) vignette.style.opacity = '0';
    },
  };
}
