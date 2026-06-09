import * as THREE from 'three';
import type { WorldItem } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import { SharedGeometry } from '@/lib/game/AssetManager';

const ITEM_SCALE = 0.55;
const BOB_AMPLITUDE = 0.07;
const BOB_SPEED = 2.2;
const SHADOW_SCALE = 0.38;
const SHADOW_OPACITY = 0.22;
const RENDER_Z = 0.25;
const DEFAULT_RENDER_RADIUS = 28;
const DEFAULT_RENDER_RADIUS_SQ = DEFAULT_RENDER_RADIUS * DEFAULT_RENDER_RADIUS;
const STALE_VISUAL_MS = 8000;

interface WorldItemVisual {
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  seedOffset: number;
  mapId: string;
  lastVisibleAt: number;
  visible: boolean;
}

interface WorldItemUpdateOptions {
  playerX: number;
  playerY: number;
  renderRadius?: number;
}

export function createWorldItemRenderer(scene: THREE.Scene) {
  const visuals = new Map<string, WorldItemVisual>();
  const visibleItems: WorldItem[] = [];
  const liveItemIds = new Set<string>();
  let visibleVisuals = 0;
  let lastMap = '';
  let lastTileX = Number.NaN;
  let lastTileY = Number.NaN;
  let lastWorldItemsRef: WorldItem[] | null = null;
  let lastWorldItemCount = -1;
  let lastRenderRadius = DEFAULT_RENDER_RADIUS;

  const _shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: SHADOW_OPACITY,
    depthWrite: false,
  });

  function getOrCreate(item: WorldItem, assetManager: AssetManager): WorldItemVisual {
    const existing = visuals.get(item.instanceId);
    if (existing) {
      existing.mapId = item.mapId;
      return existing;
    }

    const tex = assetManager.getTexture(item.itemId);
    const mat = new THREE.MeshBasicMaterial({
      map: tex ?? null,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(SharedGeometry.tile, mat);
    mesh.scale.set(ITEM_SCALE, ITEM_SCALE, 1);
    mesh.renderOrder = 100;
    scene.add(mesh);

    const shadow = new THREE.Mesh(SharedGeometry.tile, _shadowMat);
    shadow.scale.set(SHADOW_SCALE, SHADOW_SCALE * 0.4, 1);
    shadow.renderOrder = 99;
    scene.add(shadow);

    const visual: WorldItemVisual = {
      mesh,
      shadow,
      seedOffset: Math.random() * Math.PI * 2,
      mapId: item.mapId,
      lastVisibleAt: performance.now(),
      visible: true,
    };
    visuals.set(item.instanceId, visual);
    return visual;
  }

  function setVisible(visual: WorldItemVisual, visible: boolean) {
    if (visual.visible === visible) return;
    visual.visible = visible;
    visual.mesh.visible = visible;
    visual.shadow.visible = visible;
  }

  function remove(instanceId: string) {
    const v = visuals.get(instanceId);
    if (!v) return;
    scene.remove(v.mesh);
    (v.mesh.material as THREE.Material).dispose();
    scene.remove(v.shadow);
    visuals.delete(instanceId);
  }

  function update(
    worldItems: WorldItem[],
    currentMap: string,
    assetManager: AssetManager,
    currentTime: number,
    /** Match player/NPCs and interaction diamond - raw item.y ignores map elevation. */
    getVisualYAt: (x: number, y: number) => number,
    options: WorldItemUpdateOptions,
  ) {
    const tileX = Math.floor(options.playerX);
    const tileY = Math.floor(options.playerY);
    const renderRadius = options.renderRadius ?? DEFAULT_RENDER_RADIUS;
    const renderRadiusSq = renderRadius === DEFAULT_RENDER_RADIUS ? DEFAULT_RENDER_RADIUS_SQ : renderRadius * renderRadius;
    const needsVisibleSetRefresh =
      currentMap !== lastMap ||
      tileX !== lastTileX ||
      tileY !== lastTileY ||
      worldItems !== lastWorldItemsRef ||
      worldItems.length !== lastWorldItemCount ||
      renderRadius !== lastRenderRadius;

    if (needsVisibleSetRefresh) {
      visibleItems.length = 0;
      liveItemIds.clear();

      for (const item of worldItems) {
        if (item.mapId !== currentMap) continue;
        liveItemIds.add(item.instanceId);

        const dx = item.x - options.playerX;
        const dy = item.y - options.playerY;
        if (dx * dx + dy * dy <= renderRadiusSq) {
          visibleItems.push(item);
        }
      }

      for (const [id, visual] of visuals) {
        if (
          visual.mapId !== currentMap ||
          !liveItemIds.has(id) ||
          currentTime - visual.lastVisibleAt > STALE_VISUAL_MS
        ) {
          remove(id);
          continue;
        }
        setVisible(visual, false);
      }

      lastMap = currentMap;
      lastTileX = tileX;
      lastTileY = tileY;
      lastWorldItemsRef = worldItems;
      lastWorldItemCount = worldItems.length;
      lastRenderRadius = renderRadius;
    }

    visibleVisuals = 0;
    for (const item of visibleItems) {
      const v = getOrCreate(item, assetManager);
      setVisible(v, true);
      v.lastVisibleAt = currentTime;
      visibleVisuals++;

      const baseY = getVisualYAt(item.x, item.y);
      const wave = Math.sin(currentTime / 1000 * BOB_SPEED + v.seedOffset);
      const bob = wave * BOB_AMPLITUDE;
      v.mesh.position.set(item.x, baseY + bob, RENDER_Z);
      v.shadow.position.set(item.x, baseY - 0.3, RENDER_Z - 0.01);

      // Gentle pulse scale
      const pulse = 1 + wave * 0.04;
      v.mesh.scale.set(ITEM_SCALE * pulse, ITEM_SCALE * pulse, 1);
    }
  }

  function dispose() {
    for (const [id] of visuals) remove(id);
    _shadowMat.dispose();
  }

  function getPerformanceStats(): { activeVisuals: number; visibleVisuals: number; cachedVisibleItems: number } {
    return {
      activeVisuals: visuals.size,
      visibleVisuals,
      cachedVisibleItems: visibleItems.length,
    };
  }

  return { update, remove, dispose, getPerformanceStats };
}

export type WorldItemRendererInstance = ReturnType<typeof createWorldItemRenderer>;
