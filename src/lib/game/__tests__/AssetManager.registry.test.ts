import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// These tests are intentionally static — they parse AssetManager source text
// rather than executing the class, so they survive any future file split
// (sprite extraction into art/sprites/*.ts) as long as the tests are updated
// to read the same set of source files.
//
// Their purpose is to catch registration-name collisions or accidental drops
// during refactors without requiring a browser canvas in the test environment.

const ASSET_MANAGER_SOURCES = [
  'src/lib/game/AssetManager.ts',
];

function collectRegisteredNames(): string[] {
  const names: string[] = [];
  for (const rel of ASSET_MANAGER_SOURCES) {
    const src = readFileSync(resolve(process.cwd(), rel), 'utf-8');
    const re = /registerTexture\(\s*['"]([a-zA-Z0-9_]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(src)) !== null) {
      names.push(match[1]);
    }
  }
  return names;
}

describe('AssetManager texture registry', () => {
  it('has at least one registered texture', () => {
    const names = collectRegisteredNames();
    expect(names.length).toBeGreaterThan(0);
  });

  it('has no duplicate registration names', () => {
    const names = collectRegisteredNames();
    const counts = new Map<string, number>();
    for (const n of names) {
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const duplicates = [...counts.entries()]
      .filter(([, c]) => c > 1)
      .map(([n, c]) => `${n} (${c})`);
    expect(duplicates).toEqual([]);
  });

  it('registers the core required textures', () => {
    const names = new Set(collectRegisteredNames());
    const required = [
      'npc_elder',
      'npc_merchant',
      'enemy_spider',
      'enemy_slime',
      'enemy_wolf',
      'enemy_golem',
      'enemy_hollow_guardian',
      'enemy_ashen_reaver',
    ];
    const missing = required.filter(n => !names.has(n));
    expect(missing).toEqual([]);
  });
});

