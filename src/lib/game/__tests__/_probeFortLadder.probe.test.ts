import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';

function glyph(t: any): string {
  if (!t) return ' ?? ';
  const e = t.elevation ?? 0;
  let c = '?';
  switch (t.type) {
    case 'grass': c = t.walkable ? 'g' : 'G'; break;
    case 'cliff': c = '#'; break;
    case 'cliff_edge': c = '='; break;
    case 'ladder': c = 'L'; break;
    case 'gate_ladder': c = '@'; break;
    case 'dirt': c = t.walkable ? 'd' : 'D'; break;
    case 'stone': c = 's'; break;
    case 'gate': c = 'T'; break;
    default: c = t.type[0]; break;
  }
  return `${c}${e}${t.spinePath ? '*' : ' '}`;
}

describe('PROBE fort west ladder', () => {
  it('gate on el1 shelf at world (89,22); drop to (88,20)', () => {
    const map = generateMap(forestDef);
    const x0 = 234, x1 = 244, y0 = 163, y1 = 177;
    const lines: string[] = [];
    let header = '       ';
    for (let x = x0; x <= x1; x++) header += String(x).padStart(4, ' ');
    lines.push(header);
    for (let y = y0; y <= y1; y++) {
      let row = String(y).padStart(5, ' ') + '  ';
      for (let x = x0; x <= x1; x++) row += ' ' + glyph(map.tiles[y]?.[x]);
      lines.push(row);
    }
    writeFileSync('probegrid.txt', lines.join('\n'), 'utf8');

    const t = (tx: number, ty: number) => map.tiles[ty][tx];
    // C7 west rim over the cliff void (world 90-92, 13) must not be a walkable grass shelf.
    for (let tx = 240; tx <= 242; tx++) {
      expect({ type: t(tx, 163).type, w: t(tx, 163).walkable, e: t(tx, 163).elevation })
        .toEqual({ type: 'cliff', w: false, e: 1 });
    }
    // Player shelf row (world 92,22 = tile 242,172) shares elevation with gate row.
    expect({ type: t(242, 172).type, w: t(242, 172).walkable, e: t(242, 172).elevation })
      .toEqual({ type: 'grass', w: true, e: 1 });
    expect(t(239, 172).walkable).toBe(false);
    expect({ type: t(240, 172).type, w: t(240, 172).walkable, e: t(240, 172).elevation })
      .toEqual({ type: 'grass', w: true, e: 1 });
    expect(t(240, 172).enemyBlocked).toBe(true);
    // Clean walkable landing at the ladder foot (world 87-88, 21 = tiles 237-238, 171).
    expect({ type: t(238, 171).type, w: t(238, 171).walkable, e: t(238, 171).elevation })
      .toEqual({ type: 'grass', w: true, e: 0 });
    expect({ type: t(237, 171).type, w: t(237, 171).walkable, e: t(237, 171).elevation })
      .toEqual({ type: 'grass', w: true, e: 0 });
    expect(t(239, 177).type).toBe('grass');

    // Ensure world (87, 18)-(89, 18) are unwalkable cliffs
    for (let tx = 237; tx <= 239; tx++) {
      expect({ type: t(tx, 168).type, w: t(tx, 168).walkable, e: t(tx, 168).elevation })
        .toEqual({ type: 'cliff', w: false, e: 0 });
    }

    // Cliff-sprite bleed buffer: rows 169-170 (world y=19-20) stay grass-typed but NON-walkable
    // so the player never stands on a tile that visually reads as cliff.
    for (let ty = 169; ty <= 170; ty++) {
      for (let tx = 237; tx <= 239; tx++) {
        expect({ type: t(tx, ty).type, w: t(tx, ty).walkable, e: t(tx, ty).elevation })
          .toEqual({ type: 'grass', w: false, e: 0 });
      }
    }

    // Ensure world (90, 19) (tile 240, 169) is an unwalkable cliff
    expect({ type: t(240, 169).type, w: t(240, 169).walkable, e: t(240, 169).elevation })
      .toEqual({ type: 'cliff', w: false, e: 0 });

    // North cap above the ladder column (world y=23-26) seals bypass north of the pocket.
    for (let ty = 173; ty <= 176; ty++) {
      for (let tx = 237; tx <= 239; tx++) {
        expect({ type: t(tx, ty).type, w: t(tx, ty).walkable, e: t(tx, ty).elevation })
          .toEqual({ type: 'cliff', w: false, e: 1 });
      }
    }

    // Shelf-mouth plug at world (92,23).
    expect({ type: t(242, 173).type, w: t(242, 173).walkable, e: t(242, 173).elevation })
      .toEqual({ type: 'cliff', w: false, e: 1 });

    // Rock at world ~93,25 replaced with cliff.
    expect({ type: t(243, 175).type, w: t(243, 175).walkable, e: t(243, 175).elevation })
      .toEqual({ type: 'cliff', w: false, e: 1 });

    // East cliff face fill (world x=91-94, y=23-27): continuous cliff wall east of the pocket.
    for (let ty = 173; ty <= 177; ty++) {
      for (let tx = 241; tx <= 244; tx++) {
        expect({ type: t(tx, ty).type, w: t(tx, ty).walkable, e: t(tx, ty).elevation })
          .toEqual({ type: 'cliff', w: false, e: 1 });
      }
    }
    expect({ type: t(240, 174).type, w: t(240, 174).walkable, e: t(240, 174).elevation })
      .toEqual({ type: 'cliff', w: false, e: 1 });

    // Spine corridor at the el0/el=1 seam must survive the east wall fill.
    expect(t(240, 176).spinePath).toBe(true);
    expect(t(240, 177).spinePath).toBe(true);

    map.tiles[172][239] = { ...t(239, 172), type: 'ladder', walkable: true, elevation: 1 } as any;
    map.tiles[171][239] = { ...t(239, 171), type: 'ladder', walkable: true, elevation: 0 } as any;
    expect(map.tiles[172][242].walkable).toBe(true);
    expect(map.tiles[172][240].walkable).toBe(true);
    expect(map.tiles[171][238].walkable).toBe(true);
  });
});
