import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GroundInstanceLayer } from '@/lib/game/GroundInstanceLayer';

const geo = new THREE.PlaneGeometry(1, 1);
const mat = new THREE.MeshBasicMaterial();

function readSlot(layer: GroundInstanceLayer, scene: THREE.Scene, matKey: string, slot: number): THREE.Matrix4 {
  const mesh = scene.children.find(c => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(slot, m);
  void matKey;
  return m;
}

describe('GroundInstanceLayer', () => {
  it('places an instance and reports stats', () => {
    const scene = new THREE.Scene();
    const layer = new GroundInstanceLayer(scene);
    expect(layer.set(1, 'grass', geo, mat, 2, 3, -0.5)).toBe(true);
    expect(layer.has(1)).toBe(true);
    expect(layer.getStats()).toEqual({ materials: 1, instances: 1 });
    const m = readSlot(layer, scene, 'grass', 0);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect([pos.x, pos.y, pos.z]).toEqual([2, 3, -0.5]);
  });

  it('reuses a freed slot rather than growing', () => {
    const scene = new THREE.Scene();
    const layer = new GroundInstanceLayer(scene);
    layer.set(10, 'grass', geo, mat, 0, 0, 0); // slot 0
    layer.set(11, 'grass', geo, mat, 1, 0, 0); // slot 1
    layer.remove(10);                          // frees slot 0
    layer.set(12, 'grass', geo, mat, 2, 0, 0); // should reuse slot 0
    const mesh = scene.children.find(c => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    expect(mesh.count).toBe(2); // high-water mark stays at 2 — slot reused, not grown
    expect(layer.getStats().instances).toBe(2);
  });

  it('separates instances by material key (own draw call each)', () => {
    const scene = new THREE.Scene();
    const layer = new GroundInstanceLayer(scene);
    layer.set(1, 'grass', geo, mat, 0, 0, 0);
    layer.set(2, 'dirt', geo, mat, 0, 0, 0);
    expect(layer.getStats().materials).toBe(2);
    expect(scene.children.filter(c => c instanceof THREE.InstancedMesh).length).toBe(2);
  });

  it('moving a tile to a new material frees the old slot', () => {
    const scene = new THREE.Scene();
    const layer = new GroundInstanceLayer(scene);
    layer.set(5, 'grass', geo, mat, 0, 0, 0);
    layer.set(5, 'dirt', geo, mat, 0, 0, 0); // same tile, new material
    expect(layer.getStats().instances).toBe(1);
    // grass slot was freed and is reusable
    layer.set(6, 'grass', geo, mat, 0, 0, 0);
    const grassMesh = scene.children.filter(c => c instanceof THREE.InstancedMesh)[0] as THREE.InstancedMesh;
    expect(grassMesh.count).toBe(1); // reused the freed grass slot 0
  });

  it('clear() drops all instances', () => {
    const scene = new THREE.Scene();
    const layer = new GroundInstanceLayer(scene);
    layer.set(1, 'grass', geo, mat, 0, 0, 0);
    layer.set(2, 'dirt', geo, mat, 0, 0, 0);
    layer.clear();
    expect(layer.getStats().instances).toBe(0);
    expect(layer.has(1)).toBe(false);
  });

  it('idempotent set on the same tile keeps one slot', () => {
    const scene = new THREE.Scene();
    const layer = new GroundInstanceLayer(scene);
    layer.set(7, 'grass', geo, mat, 0, 0, 0);
    layer.set(7, 'grass', geo, mat, 9, 9, 0); // update position, same slot
    expect(layer.getStats().instances).toBe(1);
    const mesh = scene.children.find(c => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    expect(mesh.count).toBe(1);
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect([pos.x, pos.y]).toEqual([9, 9]);
  });
});
