// Cell coordinates are packed into a single 32-bit integer key. Maps reach ~300
// tiles with default 2-unit cells, so cell coords stay well within ±32k and the
// packing is collision-free. Using number keys avoids per-query string
// concatenation, which was a significant GC source in the combat AI loop.
const COORD_BIAS = 32768;
const packKey = (cx: number, cy: number): number =>
  ((cx + COORD_BIAS) << 16) | (cy + COORD_BIAS);

export class SpatialHash<T extends { position: { x: number; y: number }, id: string }> {
  private cellSize: number;
  private grid: Map<number, Set<T>>;

  constructor(cellSize: number = 2) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getCellKey(x: number, y: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return packKey(cx, cy);
  }

  clear() {
    this.grid.clear();
  }

  insert(entity: T) {
    const key = this.getCellKey(entity.position.x, entity.position.y);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = new Set();
      this.grid.set(key, cell);
    }
    cell.add(entity);
  }

  remove(entity: T, oldPos?: { x: number, y: number }) {
    const pos = oldPos || entity.position;
    const key = this.getCellKey(pos.x, pos.y);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(entity);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
  }

  update(entity: T, oldPos: { x: number, y: number }) {
    const oldKey = this.getCellKey(oldPos.x, oldPos.y);
    const newKey = this.getCellKey(entity.position.x, entity.position.y);

    if (oldKey !== newKey) {
      this.remove(entity, oldPos);
      this.insert(entity);
    }
  }

  query(x: number, y: number, radius: number, out?: T[]): T[] {
    const results: T[] = out ?? [];
    if (out) out.length = 0;
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const cell = this.grid.get(packKey(cx, cy));
        if (cell) {
          for (const entity of cell) {
            const dx = entity.position.x - x;
            const dy = entity.position.y - y;
            if (dx * dx + dy * dy <= radiusSq) {
              results.push(entity);
            }
          }
        }
      }
    }
    return results;
  }
}
