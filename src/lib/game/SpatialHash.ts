export class SpatialHash<T extends { position: { x: number; y: number }, id: string }> {
  private cellSize: number;
  private grid: Map<string, Set<T>>;

  constructor(cellSize: number = 2) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  clear() {
    this.grid.clear();
  }

  insert(entity: T) {
    const key = this.getCellKey(entity.position.x, entity.position.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(entity);
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

  query(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
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
