import * as THREE from 'three';

export class AssetManager {
  private textures: Map<string, THREE.Texture>;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.textures = new Map();
    this.textureLoader = new THREE.TextureLoader();
  }

  createColorTexture(color: number, width: number = 32, height: number = 32, pattern?: 'noise' | 'checker' | 'gradient'): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, width, height);

    if (pattern === 'noise') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const variation = Math.floor(Math.random() * 20) - 10;
          const nr = Math.max(0, Math.min(255, r + variation));
          const ng = Math.max(0, Math.min(255, g + variation));
          const nb = Math.max(0, Math.min(255, b + variation));
          ctx.fillStyle = `rgb(${nr}, ${ng}, ${nb})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (pattern === 'checker') {
      for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
          if ((x / 4 + y / 4) % 2 === 0) {
            ctx.fillStyle = `rgba(0,0,0,0.05)`;
            ctx.fillRect(x, y, 4, 4);
          }
        }
      }
    } else if (pattern === 'gradient') {
      for (let y = 0; y < height; y++) {
        const factor = y / height * 0.3;
        ctx.fillStyle = `rgba(0,0,0,${factor})`;
        ctx.fillRect(0, y, width, 1);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private hex(c: number): string {
    return `rgb(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255})`;
  }

  createSpriteTexture(
    colors: number[][],
    cellSize: number = 4
  ): THREE.Texture {
    const width = colors[0].length * cellSize;
    const height = colors.length * cellSize;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    for (let y = 0; y < colors.length; y++) {
      for (let x = 0; x < colors[y].length; x++) {
        const color = colors[y][x];
        if (color !== 0) {
          const r = (color >> 16) & 255;
          const g = (color >> 8) & 255;
          const b = color & 255;
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          
          ctx.fillStyle = `rgba(255,255,255,0.18)`;
          ctx.fillRect(x * cellSize, y * cellSize, 1, 1);
          
          ctx.fillStyle = `rgba(0,0,0,0.12)`;
          ctx.fillRect(x * cellSize + cellSize - 1, y * cellSize + cellSize - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  // Canvas-drawn chibi character sprite
  createChibiCharacter(
    dir: 'down' | 'up' | 'left' | 'right',
    state: 'idle' | 'walk' | 'attack' | 'charge' | 'hurt' = 'idle',
    frame: number = 0,
    palette: {
      hair: number; hairLight: number; hairDark: number;
      skin: number; skinLight: number; skinShadow: number;
      eyeIris: number; eyeIrisDark: number;
      tunicMain: number; tunicLight: number; tunicDark: number;
      trimColor: number; trimLight: number;
      capeMain: number; capeDark: number;
      pantColor: number; pantDark: number;
      bootColor: number; bootDark: number;
    }
  ): THREE.Texture {
    const W = 64, H = 80;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p = palette;
    const hex = this.hex.bind(this);

    const isLeft = dir === 'left';
    const isRight = dir === 'right';
    const isSide = isLeft || isRight;
    const isUp = dir === 'up';

    // Animation offsets
    let legOffset = 0;
    let bodyBob = 0;
    let armAngle = 0;
    let swordVisible = true;
    let swordAngle = 0;
    let squishX = 1, squishY = 1;

    if (state === 'walk') {
      legOffset = frame === 0 ? -3 : 3;
      bodyBob = Math.abs(legOffset) > 1 ? -1 : 0;
    } else if (state === 'attack') {
      if (frame === 0) { swordAngle = -0.8; armAngle = -0.5; }
      else if (frame === 1) { swordAngle = 0.5; armAngle = 0.3; }
      else { swordAngle = 1.5; armAngle = 0.6; }
    } else if (state === 'charge') {
      squishX = 1.05; squishY = 0.97;
      swordAngle = -0.5;
    }

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(squishX, squishY);
    ctx.translate(-W / 2, -H / 2);

    const cx = W / 2 + (isSide ? (isLeft ? 2 : -2) : 0);
    const headY = 20 + bodyBob;
    const bodyY = 42 + bodyBob;

    // ---- CAPE (behind character) ----
    if (!isUp || state !== 'idle') {
      ctx.fillStyle = hex(p.capeMain);
      if (isSide) {
        const capeX = isLeft ? cx + 6 : cx - 14;
        ctx.beginPath();
        ctx.moveTo(capeX, bodyY - 6);
        ctx.quadraticCurveTo(capeX + 4, bodyY + 20 + (state === 'walk' ? legOffset : 0), capeX + 2, bodyY + 28);
        ctx.quadraticCurveTo(capeX - 2, bodyY + 20, capeX + 2, bodyY - 6);
        ctx.fill();
      } else if (isUp) {
        // Full cape visible from back
        ctx.beginPath();
        ctx.moveTo(cx - 12, bodyY - 6);
        ctx.quadraticCurveTo(cx - 14, bodyY + 24, cx - 8, bodyY + 30);
        ctx.lineTo(cx + 8, bodyY + 30);
        ctx.quadraticCurveTo(cx + 14, bodyY + 24, cx + 12, bodyY - 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hex(p.capeDark);
        ctx.beginPath();
        ctx.moveTo(cx - 8, bodyY + 10);
        ctx.quadraticCurveTo(cx, bodyY + 14, cx + 8, bodyY + 10);
        ctx.quadraticCurveTo(cx, bodyY + 18, cx - 8, bodyY + 10);
        ctx.fill();
      } else {
        // Small cape peeks from behind (front view)
        ctx.fillStyle = hex(p.capeDark);
        ctx.fillRect(cx - 14, bodyY - 4, 3, 20);
        ctx.fillRect(cx + 11, bodyY - 4, 3, 20);
      }
    }

    // ---- SWORD (behind for some frames) ----
    if (swordVisible && !isUp) {
      ctx.save();
      const swordX = isSide ? (isLeft ? cx - 14 : cx + 14) : cx - 14;
      const swordY = bodyY + 2;
      ctx.translate(swordX, swordY);
      ctx.rotate(swordAngle * (isRight ? -1 : 1));
      // Blade
      ctx.fillStyle = hex(0xD8E0E8);
      ctx.fillRect(-1, -22, 3, 18);
      ctx.fillStyle = hex(0xF0F4FF);
      ctx.fillRect(0, -22, 1, 18);
      // Guard
      ctx.fillStyle = hex(p.trimColor);
      ctx.fillRect(-3, -4, 7, 2);
      // Grip
      ctx.fillStyle = hex(0x5A3020);
      ctx.fillRect(0, -2, 2, 6);
      // Pommel
      ctx.fillStyle = hex(p.trimColor);
      ctx.beginPath();
      ctx.arc(1, 5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- LEGS ----
    const legSpread = isSide ? 2 : 5;
    const leftLegX = cx - legSpread;
    const rightLegX = cx + legSpread - (isSide ? 1 : 0);
    const legTop = bodyY + 14;

    // Left leg
    ctx.fillStyle = hex(p.pantColor);
    ctx.fillRect(leftLegX - 2, legTop + (state === 'walk' ? legOffset : 0), 5, 10);
    ctx.fillStyle = hex(p.bootColor);
    ctx.fillRect(leftLegX - 3, legTop + 9 + (state === 'walk' ? legOffset : 0), 7, 5);
    ctx.fillStyle = hex(p.trimColor);
    ctx.fillRect(leftLegX - 3, legTop + 9 + (state === 'walk' ? legOffset : 0), 7, 1);

    if (!isSide) {
      // Right leg
      ctx.fillStyle = hex(p.pantColor);
      ctx.fillRect(rightLegX - 2, legTop + (state === 'walk' ? -legOffset : 0), 5, 10);
      ctx.fillStyle = hex(p.bootColor);
      ctx.fillRect(rightLegX - 3, legTop + 9 + (state === 'walk' ? -legOffset : 0), 7, 5);
      ctx.fillStyle = hex(p.trimColor);
      ctx.fillRect(rightLegX - 3, legTop + 9 + (state === 'walk' ? -legOffset : 0), 7, 1);
    }

    // ---- BODY / TUNIC ----
    // Tunic body
    ctx.fillStyle = hex(p.tunicMain);
    const tunicW = isSide ? 14 : 18;
    const tunicX = cx - tunicW / 2;
    ctx.beginPath();
    ctx.moveTo(tunicX, bodyY - 4);
    ctx.lineTo(tunicX + tunicW, bodyY - 4);
    ctx.lineTo(tunicX + tunicW + 2, bodyY + 16);
    ctx.lineTo(tunicX - 2, bodyY + 16);
    ctx.closePath();
    ctx.fill();

    // Tunic highlight
    ctx.fillStyle = hex(p.tunicLight);
    ctx.fillRect(cx - 3, bodyY - 2, 6, 12);

    // Gold trim lines
    ctx.fillStyle = hex(p.trimColor);
    ctx.fillRect(tunicX, bodyY - 4, tunicW, 2); // top trim
    ctx.fillRect(cx - 1, bodyY - 2, 2, 14); // center seam

    // Belt
    ctx.fillStyle = hex(p.bootDark);
    ctx.fillRect(tunicX + 1, bodyY + 10, tunicW - 2, 3);
    ctx.fillStyle = hex(p.trimColor);
    ctx.fillRect(cx - 2, bodyY + 10, 4, 3); // buckle

    // ---- ARMS ----
    if (!isUp) {
      // Left arm
      ctx.fillStyle = hex(p.tunicDark);
      const armX1 = isSide ? (isLeft ? cx - tunicW/2 - 3 : cx - tunicW/2 + 1) : cx - tunicW/2 - 4;
      ctx.fillRect(armX1, bodyY - 2, 5, 12);
      ctx.fillStyle = hex(p.skinShadow);
      ctx.fillRect(armX1 + 1, bodyY + 9, 3, 4);

      if (!isSide) {
        // Right arm
        ctx.fillStyle = hex(p.tunicDark);
        ctx.fillRect(cx + tunicW/2 - 1, bodyY - 2, 5, 12);
        ctx.fillStyle = hex(p.skinShadow);
        ctx.fillRect(cx + tunicW/2, bodyY + 9, 3, 4);
      }
    }

    // ---- HEAD ----
    const headR = 14;

    // Hair back volume (behind head)
    ctx.fillStyle = hex(p.hairDark);
    ctx.beginPath();
    ctx.ellipse(cx, headY - 2, headR + 3, headR + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head shape (skin circle)
    if (!isUp) {
      ctx.fillStyle = hex(p.skin);
      ctx.beginPath();
      ctx.ellipse(cx, headY, headR - 1, headR, 0, 0, Math.PI * 2);
      ctx.fill();

      // Skin highlight
      ctx.fillStyle = hex(p.skinLight);
      ctx.beginPath();
      ctx.ellipse(cx - 2, headY - 3, headR - 5, headR - 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- HAIR ----
    ctx.fillStyle = hex(p.hair);
    // Top hair volume
    ctx.beginPath();
    ctx.ellipse(cx, headY - 6, headR + 1, 10, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Hair highlight
    ctx.fillStyle = hex(p.hairLight);
    ctx.beginPath();
    ctx.ellipse(cx + 2, headY - 9, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Spiky hair tufts
    ctx.fillStyle = hex(p.hair);
    // Center spike
    ctx.beginPath();
    ctx.moveTo(cx - 3, headY - 14);
    ctx.lineTo(cx + 1, headY - 20);
    ctx.lineTo(cx + 4, headY - 14);
    ctx.fill();
    // Left spike
    ctx.beginPath();
    ctx.moveTo(cx - 8, headY - 11);
    ctx.lineTo(cx - 6, headY - 18);
    ctx.lineTo(cx - 2, headY - 13);
    ctx.fill();
    // Right spike
    ctx.beginPath();
    ctx.moveTo(cx + 2, headY - 13);
    ctx.lineTo(cx + 7, headY - 17);
    ctx.lineTo(cx + 9, headY - 10);
    ctx.fill();

    // Bangs
    if (!isUp) {
      ctx.fillStyle = hex(p.hair);
      if (isSide) {
        const bangDir = isLeft ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx - bangDir * 10, headY - 8);
        ctx.quadraticCurveTo(cx - bangDir * 8, headY + 2, cx - bangDir * 4, headY + 4);
        ctx.lineTo(cx - bangDir * 2, headY - 2);
        ctx.quadraticCurveTo(cx - bangDir * 6, headY - 4, cx - bangDir * 10, headY - 8);
        ctx.fill();
        // Side hair strand
        ctx.fillStyle = hex(p.hairDark);
        ctx.beginPath();
        ctx.moveTo(cx + bangDir * 8, headY - 2);
        ctx.quadraticCurveTo(cx + bangDir * 12, headY + 10, cx + bangDir * 10, headY + 20);
        ctx.lineTo(cx + bangDir * 8, headY + 18);
        ctx.quadraticCurveTo(cx + bangDir * 10, headY + 8, cx + bangDir * 6, headY);
        ctx.fill();
      } else {
        // Front bangs - swept
        ctx.beginPath();
        ctx.moveTo(cx - 12, headY - 6);
        ctx.quadraticCurveTo(cx - 10, headY + 3, cx - 6, headY + 4);
        ctx.lineTo(cx - 4, headY - 1);
        ctx.quadraticCurveTo(cx - 8, headY - 2, cx - 12, headY - 6);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 12, headY - 6);
        ctx.quadraticCurveTo(cx + 10, headY + 2, cx + 7, headY + 3);
        ctx.lineTo(cx + 5, headY - 1);
        ctx.quadraticCurveTo(cx + 8, headY - 2, cx + 12, headY - 6);
        ctx.fill();
        
        // Center bang wisps
        ctx.fillStyle = hex(p.hairDark);
        ctx.beginPath();
        ctx.moveTo(cx - 3, headY - 6);
        ctx.quadraticCurveTo(cx, headY - 2, cx + 3, headY - 6);
        ctx.lineTo(cx + 1, headY - 8);
        ctx.lineTo(cx - 1, headY - 8);
        ctx.fill();
      }
    } else {
      // Back of head - full hair coverage
      ctx.fillStyle = hex(p.hair);
      ctx.beginPath();
      ctx.ellipse(cx, headY, headR, headR + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hair texture lines
      ctx.strokeStyle = hex(p.hairDark);
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 4, headY - 10);
        ctx.quadraticCurveTo(cx + i * 3, headY + 5, cx + i * 5, headY + 14);
        ctx.stroke();
      }
    }

    // ---- FACE (front/side only) ----
    if (!isUp) {
      if (isSide) {
        const eyeX = isLeft ? cx - 4 : cx + 4;
        const eyeDir = isLeft ? -1 : 1;

        // Eye - sharp angular style
        // Outer eye shape (dark outline)
        ctx.fillStyle = hex(p.hairDark);
        ctx.fillRect(eyeX - eyeDir * 5, headY - 4, 8, 1); // top lid line
        ctx.fillRect(eyeX - eyeDir * 5, headY + 3, 8, 1); // bottom lid line

        // Eye white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(eyeX - eyeDir * 4, headY - 3, 6, 6);

        // Iris - positioned slightly forward
        ctx.fillStyle = state === 'charge' ? hex(0xFFD700) : state === 'hurt' ? hex(0x666666) : hex(p.eyeIris);
        ctx.fillRect(eyeX - eyeDir * 3, headY - 2, 4, 5);

        // Pupil
        if (state !== 'hurt') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(eyeX - eyeDir * 2, headY - 1, 2, 3);
        }

        // Highlight pixel
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(eyeX - eyeDir * 3, headY - 2, 1, 1);

        // Eyebrow - thick, angled down (fierce)
        ctx.fillStyle = hex(p.hairDark);
        ctx.fillRect(eyeX + eyeDir * 2, headY - 8, 2, 2);
        ctx.fillRect(eyeX + eyeDir * 0, headY - 7, 2, 2);
        ctx.fillRect(eyeX - eyeDir * 2, headY - 6, 2, 2);
        ctx.fillRect(eyeX - eyeDir * 4, headY - 6, 2, 2);

        // Nose - small angular
        ctx.fillStyle = hex(p.skinShadow);
        ctx.fillRect(eyeX - eyeDir * 6, headY + 2, 2, 2);

        // Mouth - firm, determined
        if (state === 'attack' || state === 'charge') {
          ctx.fillStyle = hex(0xB03020);
          ctx.fillRect(eyeX - eyeDir * 5, headY + 7, 4, 2);
          ctx.fillStyle = hex(0x801818);
          ctx.fillRect(eyeX - eyeDir * 4, headY + 8, 2, 1);
        } else if (state === 'hurt') {
          ctx.fillStyle = hex(p.skinShadow);
          ctx.fillRect(eyeX - eyeDir * 5, headY + 7, 2, 1);
          ctx.fillRect(eyeX - eyeDir * 2, headY + 8, 2, 1);
        } else {
          // Firm straight mouth - 2px line
          ctx.fillStyle = hex(p.skinShadow);
          ctx.fillRect(eyeX - eyeDir * 5, headY + 7, 5, 1);
        }

      } else {
        // FRONT VIEW - Two eyes, stoic warrior pixel style
        const eyeSpacing = 7;
        const eyeY = headY - 1;

        for (let side = -1; side <= 1; side += 2) {
          const eyeX = cx + side * eyeSpacing;

          // Eye outline (top and bottom lid)
          ctx.fillStyle = hex(p.hairDark);
          ctx.fillRect(eyeX - 4, eyeY - 4, 8, 1);
          ctx.fillRect(eyeX - 4, eyeY + 3, 8, 1);

          // Eye white
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(eyeX - 3, eyeY - 3, 6, 6);

          // Iris
          ctx.fillStyle = state === 'charge' ? hex(0xFFD700) : state === 'hurt' ? hex(0x666666) : hex(p.eyeIris);
          ctx.fillRect(eyeX - 2, eyeY - 2, 4, 5);

          // Pupil
          if (state !== 'hurt') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(eyeX - 1, eyeY - 1, 2, 3);
          }

          // Highlight pixel (top-left of iris)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(eyeX - 2, eyeY - 2, 1, 1);

          // Eyebrow - angled inward (fierce/determined)
          ctx.fillStyle = hex(p.hairDark);
          ctx.fillRect(eyeX - side * 4, headY - 8, 2, 2);
          ctx.fillRect(eyeX - side * 2, headY - 7, 2, 2);
          ctx.fillRect(eyeX + side * 0, headY - 7, 2, 2);
          ctx.fillRect(eyeX + side * 2, headY - 6, 2, 2);
        }

        // Nose - small triangle
        ctx.fillStyle = hex(p.skinShadow);
        ctx.fillRect(cx - 1, headY + 2, 2, 2);

        // Mouth
        if (state === 'attack' || state === 'charge') {
          ctx.fillStyle = hex(0xB03020);
          ctx.fillRect(cx - 3, headY + 7, 6, 3);
          ctx.fillStyle = hex(0x801818);
          ctx.fillRect(cx - 2, headY + 8, 4, 2);
        } else if (state === 'hurt') {
          ctx.fillStyle = hex(p.skinShadow);
          ctx.fillRect(cx - 3, headY + 8, 2, 1);
          ctx.fillRect(cx + 1, headY + 8, 2, 1);
        } else {
          // Firm straight mouth
          ctx.fillStyle = hex(p.skinShadow);
          ctx.fillRect(cx - 3, headY + 7, 6, 1);
          // Slight shadow below
          ctx.fillStyle = `rgba(0,0,0,0.1)`;
          ctx.fillRect(cx - 2, headY + 8, 4, 1);
        }
      }
    }

    // ---- NECK ----
    ctx.fillStyle = hex(p.skinShadow);
    ctx.fillRect(cx - 3, headY + headR - 4, 6, 6);

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  getTexture(name: string): THREE.Texture | undefined {
    return this.textures.get(name);
  }

  loadDefaultAssets() {
    const C = 0; // transparent

    const mirrorSprite = (sprite: number[][]): number[][] => {
      return sprite.map(row => [...row].reverse());
    };

    // ===== HERO PALETTE for canvas-drawn chibi =====
    const heroPalette = {
      hair: 0x8B6040, hairLight: 0xC09060, hairDark: 0x503018,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x5B8B3A, eyeIrisDark: 0x2A5A08,
      tunicMain: 0x3A8AC0, tunicLight: 0x50A0D8, tunicDark: 0x286890,
      trimColor: 0xE8C030, trimLight: 0xFFD850,
      capeMain: 0x3080B8, capeDark: 0x185078,
      pantColor: 0x5A4030, pantDark: 0x3E2818,
      bootColor: 0x6B4428, bootDark: 0x503018,
    };

    // Generate all player sprites using canvas drawing
    const dirs: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
    const states: Array<'idle' | 'walk' | 'attack' | 'charge' | 'hurt'> = ['idle', 'walk', 'attack', 'charge', 'hurt'];

    for (const dir of dirs) {
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const tex = this.createChibiCharacter(dir, state, f, heroPalette);
          this.textures.set(`player_${dir}_${state}_${f}`, tex);
        }
      }
    }

    // Diagonal sprites reuse side views
    const diagDirs = ['down_left', 'down_right', 'up_left', 'up_right'] as const;
    const diagBase = { down_left: 'left', down_right: 'right', up_left: 'left', up_right: 'right' } as const;
    
    for (const dDir of diagDirs) {
      const base = diagBase[dDir];
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const src = this.textures.get(`player_${base}_${state}_${f}`);
          if (src) this.textures.set(`player_${dDir}_${state}_${f}`, src);
        }
      }
    }

    // Legacy aliases
    this.textures.set('player_down', this.textures.get('player_down_idle_0')!);
    this.textures.set('player_up', this.textures.get('player_up_idle_0')!);
    this.textures.set('player_left', this.textures.get('player_left_idle_0')!);
    this.textures.set('player_right', this.textures.get('player_right_idle_0')!);

    // Shared NPC palette constants
    const SK = 0xFFE0BD; const SK_H = 0xFFF0D8; const SK_S = 0xE8C4A0; const SK_D = 0xD4A878;
    const EY_W = 0xFFFFFF; const BROW = 0x503018; const MOUTH = 0xD06050;
    const PANT = 0x5A4030; const BOOT = 0x6B4428; const BOOT_H = 0x8B6040; const BOOT_S = 0x503018;

    // ========== NPC SPRITES - Chibi Anime Style ==========
    const NPC_W = 14; // NPCs use 14-wide sprites at cellSize 3

    // Elder - wise old man, long white beard, purple robes, crystal staff
    const ELD_ROBE = 0x5A1A8A;
    const ELD_ROBE_H = 0x7828AA;
    const ELD_ROBE_S = 0x3A0A6A;
    const ELD_HAIR = 0xE8E8F0;
    const ELD_HAIR_S = 0xC0C0D0;
    const ELD_BEARD = 0xE0E0E8;
    const ELD_BEARD_S = 0xC0C0C8;
    const ELD_STAFF = 0xCCA800;
    const ELD_STAFF_S = 0x997700;
    const ELD_GEM = 0x44BBFF;
    const ELD_GEM_G = 0x88DDFF;

    this.textures.set('npc_elder', this.createSpriteTexture([
      [C,  C,  C,  C,  ELD_HAIR_S,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR_S,C,  C,  C,  C],
      [C,  C,  C,  ELD_HAIR_S,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR_S,C,  C,  C,  C],
      [C,  C,  C,  ELD_HAIR,SK, SK_H, SK, SK, SK_H, SK, ELD_HAIR,C,  C,  C],
      [C,  C,  C,  SK, BROW,0x5D4037,SK, SK, 0x5D4037,BROW,SK, C,  C,  C],
      [C,  C,  C,  C,  SK, SK, SK_S, SK_S, SK, SK, C,  C,  C,  C],
      [C,  C,  C,  C,  ELD_BEARD,ELD_BEARD,ELD_BEARD,ELD_BEARD,ELD_BEARD,ELD_BEARD,C,  C,  C,  C],
      [C,  C,  C,  C,  ELD_BEARD_S,ELD_BEARD,ELD_BEARD_S,ELD_BEARD,ELD_BEARD_S,C,  C,  C,  C,  C],
      [C,  ELD_STAFF,ELD_GEM,ELD_GEM_G,ELD_ROBE,ELD_ROBE_H,ELD_ROBE,ELD_ROBE_H,ELD_ROBE,ELD_ROBE,C,  C,  C,  C],
      [C,  ELD_STAFF,C,  C, ELD_ROBE_S,ELD_ROBE,ELD_ROBE_S,ELD_ROBE,ELD_ROBE_S,ELD_ROBE,C,  C,  C,  C],
      [C,  ELD_STAFF_S,C,  C, ELD_ROBE,ELD_ROBE,ELD_ROBE,ELD_ROBE,ELD_ROBE,ELD_ROBE,C,  C,  C,  C],
      [C,  C,  C,  C, ELD_ROBE,ELD_ROBE_S,C,  C,  ELD_ROBE_S,ELD_ROBE,C,  C,  C,  C],
      [C,  C,  C,  C, ELD_ROBE_S,ELD_ROBE,C,  C,  ELD_ROBE,ELD_ROBE_S,C,  C,  C,  C],
      [C,  C,  C,  BOOT_S,BOOT,BOOT_H,C,  C,  BOOT_H,BOOT,BOOT_S,C,  C,  C],
    ], 3));

    // Merchant - jolly with hat, orange vest, gold accents
    const MCH_VEST = 0xE06000;
    const MCH_VEST_H = 0xFF8800;
    const MCH_VEST_S = 0xBB4400;
    const MCH_HAT = 0x6D4C41;
    const MCH_HAT_H = 0x8D6E63;

    this.textures.set('npc_merchant', this.createSpriteTexture([
      [C,  C,  C,  MCH_HAT,MCH_HAT_H,MCH_HAT,MCH_HAT_H,MCH_HAT,MCH_HAT,C,  C,  C,  C,  C],
      [C,  C,  MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,C,  C,  C,  C],
      [C,  C,  C,  SK, SK_H,SK, SK, SK_H,SK, C,  C,  C,  C,  C],
      [C,  C,  C,  SK, EY_W,0x5D4037,SK, 0x5D4037,EY_W,SK, C,  C,  C,  C],
      [C,  C,  C,  C,  SK, SK, SK_S,SK, SK, C,  C,  C,  C,  C],
      [C,  C,  C,  C,  C,  SK, MOUTH,SK, C,  C,  C,  C,  C,  C],
      [C,  C,  MCH_VEST,MCH_VEST_H,0xFFD700,MCH_VEST,0xFFE850,MCH_VEST_H,MCH_VEST,MCH_VEST,C,  C,  C,  C],
      [C,  C,  MCH_VEST_S,MCH_VEST,MCH_VEST_S,MCH_VEST,MCH_VEST_S,MCH_VEST,MCH_VEST_S,C,  C,  C,  C,  C],
      [C,  SK, C,  MCH_VEST,MCH_VEST,MCH_VEST,MCH_VEST,MCH_VEST,C,  SK, C,  C,  C,  C],
      [C,  C,  C,  C,  PANT,C,  C,  PANT,C,  C,  C,  C,  C,  C],
      [C,  C,  C,  BOOT_S,BOOT_H,C,  C,  BOOT_H,BOOT_S,C,  C,  C,  C,  C],
    ], 3));

    // Guard - armored, helmet, stern
    const G_ARM = 0x607080;
    const G_ARM_H = 0x788898;
    const G_ARM_S = 0x485060;
    const G_HELM = 0x506070;
    const G_HELM_H = 0x687888;
    const G_SWD = 0xB0BEC5;

    this.textures.set('npc_guard', this.createSpriteTexture([
      [C,  C,  C,  G_HELM,G_HELM_H,G_HELM,G_HELM_H,G_HELM,G_HELM,C,  C,  C,  C,  C],
      [C,  C,  C,  G_HELM,G_HELM,G_HELM_H,G_HELM,G_HELM,G_HELM,C,  C,  C,  C,  C],
      [C,  C,  C,  SK, SK, SK, SK, SK, SK, C,  C,  C,  C,  C],
      [C,  C,  C,  SK, EY_W,0x37474F,SK,0x37474F,EY_W,SK, C,  C,  C,  C],
      [C,  C,  C,  C,  SK, SK, SK_S,SK, SK, C,  C,  C,  C,  C],
      [C,  G_SWD,G_ARM,G_ARM_H,G_ARM,G_ARM_H,G_ARM,G_ARM_H,G_ARM,G_ARM,C,  C,  C,  C],
      [C,  G_SWD,G_ARM_S,G_ARM,G_ARM_S,G_ARM,G_ARM_S,G_ARM,G_ARM_S,C,  C,  C,  C,  C],
      [C,  C,  G_ARM,G_ARM,G_ARM,G_ARM,G_ARM,G_ARM,G_ARM,C,  C,  C,  C,  C],
      [C,  C,  C,  C,  PANT,C,  C,  PANT,C,  C,  C,  C,  C,  C],
      [C,  C,  C,  G_ARM_S,G_ARM_S,C,  C,  G_ARM_S,G_ARM_S,C,  C,  C,  C,  C],
    ], 3));

    // ========== ENEMY SPRITES ==========
    const WOLF_FUR = 0x616161;
    const WOLF_FUR_H = 0x757575;
    const WOLF_FUR_S = 0x424242;
    const WOLF_EYE = 0xFFEB3B;
    const WOLF_SNOUT = 0x9E9E9E;
    const WOLF_FANG = 0xFAFAFA;

    this.textures.set('enemy_wolf', this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ]));

    const WOLF_EYE_GLOW = 0xFFFF00;
    const WOLF_WARN = 0xFF5722;
    this.textures.set('enemy_wolf_telegraph', this.createSpriteTexture([
      [C,        C,        C,        C,        C,       C,        C,        C,        C,        C],
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,       C],
      [C,        WOLF_FUR, WOLF_EYE_GLOW,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_EYE_GLOW, WOLF_FUR, C,C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_WARN,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_WARN,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR_S,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,C,C],
      [C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,      C],
    ]));

    this.textures.set('enemy_wolf_attack', this.createSpriteTexture([
      [C,        C,        WOLF_FUR_H,WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR_H,C,    C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE_GLOW,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_EYE_GLOW, WOLF_FUR, C,C],
      [C,        WOLF_FANG,WOLF_FUR,WOLF_WARN,WOLF_WARN,WOLF_WARN,WOLF_FUR,WOLF_FANG,C,        C],
      [C,        C,        WOLF_FANG,WOLF_WARN,WOLF_WARN,WOLF_WARN,WOLF_FANG,C,       C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ]));

    const SHADOW_BODY = 0x311B92;
    const SHADOW_BODY_H = 0x4527A0;
    const SHADOW_BODY_S = 0x1A0A5E;
    const SHADOW_EYE = 0xFF1744;
    const SHADOW_GLOW = 0xD500F9;
    const SHADOW_WISP = 0x7C4DFF;

    this.textures.set('enemy_shadow', this.createSpriteTexture([
      [C,          C,           SHADOW_WISP, SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_WISP,C,          C,          C],
      [C,          SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE,  SHADOW_BODY, SHADOW_EYE,   SHADOW_BODY_H,SHADOW_BODY,C,         C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,  SHADOW_GLOW, SHADOW_BODY,  SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [SHADOW_WISP,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY,SHADOW_WISP,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,  SHADOW_BODY, SHADOW_BODY,  SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,C,          C,         C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,  SHADOW_BODY_S,SHADOW_WISP,C,          C,         C],
      [C,          SHADOW_WISP, C,           C,            SHADOW_WISP,  C,            C,          SHADOW_WISP,C,         C],
    ]));

    const SHADOW_EYE_GLOW = 0xFF5252;
    const SHADOW_CHARGE = 0xEA80FC;
    this.textures.set('enemy_shadow_telegraph', this.createSpriteTexture([
      [SHADOW_CHARGE,C,       SHADOW_WISP, SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_WISP,C,         SHADOW_CHARGE,C],
      [C,          SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE_GLOW,SHADOW_BODY,SHADOW_EYE_GLOW,SHADOW_BODY_H,SHADOW_BODY,C,C],
      [C,          SHADOW_BODY_S,SHADOW_CHARGE,SHADOW_BODY,SHADOW_GLOW,SHADOW_BODY,SHADOW_CHARGE,SHADOW_BODY_S,C,  C],
      [SHADOW_CHARGE,SHADOW_BODY,SHADOW_BODY_S,SHADOW_CHARGE,SHADOW_GLOW,SHADOW_CHARGE,SHADOW_BODY_S,SHADOW_BODY,SHADOW_CHARGE,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY_S,C,     C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,C,        C,     C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_WISP,C,         C,     C],
      [C,          SHADOW_WISP, C,           C,           SHADOW_WISP, C,           C,          SHADOW_WISP,C,     C],
    ]));

    this.textures.set('enemy_shadow_attack', this.createSpriteTexture([
      [C,          SHADOW_WISP, SHADOW_CHARGE,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_CHARGE,SHADOW_WISP,C,C],
      [SHADOW_WISP,SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE_GLOW,SHADOW_GLOW,SHADOW_EYE_GLOW,SHADOW_BODY_H,SHADOW_BODY,SHADOW_WISP,C],
      [SHADOW_CHARGE,SHADOW_BODY_S,SHADOW_BODY,SHADOW_GLOW,SHADOW_CHARGE,SHADOW_GLOW,SHADOW_BODY,SHADOW_BODY_S,SHADOW_CHARGE,C],
      [SHADOW_WISP,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_WISP,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,C,        C,         C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_WISP,C,         C,         C],
      [C,          SHADOW_WISP, C,           C,           SHADOW_WISP, C,           C,          SHADOW_WISP,C,         C],
    ]));

    // ========== FIELD BOSS: Golem ==========
    const GOL = 0x607060;
    const GOL_H = 0x788878;
    const GOL_S = 0x485048;
    const GOL_D = 0x303830;
    const GOL_EYE = 0xFF4400;
    const GOL_RUNE = 0x44FFAA;

    this.textures.set('enemy_golem', this.createSpriteTexture([
      [C,    C,    C,    GOL_S,GOL, GOL_H,GOL, GOL_S,C,    C,    C,    C],
      [C,    C,    GOL_S,GOL,  GOL_H,GOL, GOL, GOL_H,GOL, GOL_S,C,    C],
      [C,    GOL_S,GOL,  GOL_EYE,GOL_D,GOL,GOL,GOL_D,GOL_EYE,GOL,GOL_S,C],
      [C,    GOL,  GOL_D,GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL_D,GOL,C],
      [GOL_S,GOL,  GOL_H,GOL_D,GOL, GOL, GOL, GOL, GOL_D,GOL_H,GOL,GOL_S],
      [GOL,  GOL_H,GOL,  GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL,GOL_H,GOL],
      [GOL_S,GOL,  GOL_D,GOL,  GOL, GOL, GOL, GOL, GOL, GOL_D,GOL,GOL_S],
      [C,    GOL_D,GOL,  GOL_D,GOL, GOL_D,GOL_D,GOL, GOL_D,GOL,GOL_D,C],
      [C,    C,    GOL_S,GOL,  GOL_D,C,   C,   GOL_D,GOL, GOL_S,C,    C],
      [C,    C,    GOL_D,GOL_S,GOL,  C,   C,   GOL, GOL_S,GOL_D,C,    C],
    ]));

    this.textures.set('enemy_golem_telegraph', this.textures.get('enemy_golem')!);
    this.textures.set('enemy_golem_attack', this.textures.get('enemy_golem')!);

    // ========== TERRAIN ==========
    this.textures.set('grass', this.createColorTexture(0x4CAF50, 32, 32, 'noise'));
    this.textures.set('dirt', this.createColorTexture(0x8D6E63, 32, 32, 'noise'));
    this.textures.set('water', this.createColorTexture(0x1E88E5, 32, 32, 'noise'));
    this.textures.set('stone', this.createColorTexture(0x78909C, 32, 32, 'checker'));
    this.textures.set('wood', this.createColorTexture(0x795548, 32, 32, 'gradient'));
    this.textures.set('tall_grass', this.createColorTexture(0x388E3C, 32, 32, 'noise'));
    this.textures.set('sand', this.createColorTexture(0xF5DEB3, 32, 32, 'noise'));
    this.textures.set('swamp', this.createColorTexture(0x556B2F, 32, 32, 'noise'));
    this.textures.set('bridge', this.createColorTexture(0x8D6E63, 32, 32, 'checker'));
    this.textures.set('lava', this.createColorTexture(0xE65100, 32, 32, 'noise'));
    this.textures.set('ice', this.createColorTexture(0xB3E5FC, 32, 32, 'checker'));
    this.textures.set('pressure_plate', this.createColorTexture(0x607D8B, 32, 32, 'checker'));
    this.textures.set('hidden_wall', this.createColorTexture(0x78909C, 32, 32, 'checker'));
    this.textures.set('push_block', this.createColorTexture(0x5D4037, 32, 32, 'gradient'));
    this.textures.set('switch_door', this.createColorTexture(0x4E342E, 32, 32, 'gradient'));
    this.textures.set('volcanic_rock', this.createColorTexture(0x3E2723, 32, 32, 'noise'));
    this.textures.set('ash', this.createColorTexture(0x616161, 32, 32, 'noise'));
    this.textures.set('ruins_floor', this.createColorTexture(0x6D4C41, 32, 32, 'checker'));
    this.textures.set('waterfall', this.createColorTexture(0x42A5F5, 32, 32, 'noise'));
    this.textures.set('snow', this.createColorTexture(0xECEFF1, 32, 32, 'noise'));

    // ========== OBJECTS ==========
    const TRUNK = 0x5D4037;
    const TRUNK_S = 0x3E2723;
    const LEAF = 0x2E7D32;
    const LEAF_H = 0x66BB6A;
    const LEAF_S = 0x1B5E20;

    // Tree - bigger, more detailed (12x14)
    this.textures.set('tree', this.createSpriteTexture([
      [C,     C,     C,     C,     LEAF_H,LEAF,  LEAF_H,LEAF,  C,     C,     C,     C],
      [C,     C,     C,     LEAF,  LEAF_H,LEAF,  LEAF,  LEAF_H,LEAF,  C,     C,     C],
      [C,     C,     LEAF,  LEAF_H,LEAF,  LEAF_H,LEAF,  LEAF,  LEAF_H,LEAF,  C,     C],
      [C,     LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF_H,LEAF,  C],
      [LEAF_S,LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_S],
      [LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF_S,LEAF,  LEAF_S],
      [C,     LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,C],
      [C,     C,     LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF_S,C,     C],
      [C,     C,     C,     LEAF_S,LEAF,  LEAF_S,LEAF_S,LEAF_S,LEAF_S,C,     C,     C],
      [C,     C,     C,     C,     C,     TRUNK, TRUNK_S,C,    C,     C,     C,     C],
      [C,     C,     C,     C,     C,     TRUNK_S,TRUNK,C,     C,     C,     C,     C],
      [C,     C,     C,     C,     C,     TRUNK, TRUNK_S,C,    C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK_S,TRUNK,TRUNK_S,TRUNK,C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK,TRUNK, TRUNK_S,C,    C,     C,     C],
    ]));

    // Dead tree
    this.textures.set('dead_tree', this.createSpriteTexture([
      [C,     C,     C,     TRUNK, C,     C,     TRUNK, C,     C,     C],
      [C,     C,     TRUNK, TRUNK_S,C,    C,     TRUNK_S,TRUNK, C,    C],
      [C,     TRUNK, C,     TRUNK, C,     TRUNK, C,     C,     TRUNK, C],
      [C,     C,     C,     TRUNK, C,     TRUNK, C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK, C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK, TRUNK_S,C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK_S,TRUNK, C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK_S,TRUNK, C,     C,     C],
    ]));

    // Statue
    const STATUE = 0x9E9E9E;
    const STATUE_H = 0xBDBDBD;
    const STATUE_S = 0x757575;
    this.textures.set('statue', this.createSpriteTexture([
      [C,     C,     C,     STATUE_H,STATUE_H,C,     C,     C],
      [C,     C,     STATUE_H,STATUE, STATUE, STATUE_H,C,     C],
      [C,     C,     STATUE, STATUE_S,STATUE_S,STATUE, C,     C],
      [C,     C,     STATUE, STATUE, STATUE, STATUE, C,     C],
      [C,     C,     STATUE_S,STATUE,STATUE,STATUE_S, C,     C],
      [C,     STATUE_S,STATUE_S,STATUE_S,STATUE_S,STATUE_S,STATUE_S,C],
      [C,     C,     STATUE_S,STATUE_S,STATUE_S,STATUE_S, C,     C],
    ]));

    // House - bigger (14x12)
    const WALL = 0x8D6E63;
    const WALL_H = 0xA1887F;
    const WALL_S = 0x6D4C41;
    const ROOF = 0xB71C1C;
    const ROOF_H = 0xD32F2F;
    const ROOF_S = 0x7F0000;
    const WINDOW = 0xBBDEFB;
    const DOOR = 0x4E342E;

    this.textures.set('house', this.createSpriteTexture([
      [C,     C,     C,     C,     C,     ROOF_S,ROOF, ROOF_H,ROOF, C,     C,     C,     C,     C],
      [C,     C,     C,     C,     ROOF_S,ROOF,  ROOF_H,ROOF, ROOF, ROOF_S,C,     C,     C,     C],
      [C,     C,     C,     ROOF_S,ROOF,  ROOF,  ROOF, ROOF,  ROOF, ROOF,  ROOF_S,C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF,  ROOF_H,ROOF, ROOF,  ROOF_H,ROOF, ROOF,  ROOF_S,C,     C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  WINDOW,WINDOW,WALL,  WALL_H,WALL, WINDOW,WINDOW,WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WINDOW,WINDOW,WALL_S,WALL, WALL_S,WINDOW,WINDOW,WALL_S,WALL_S,C,     C],
      [C,     C,     WALL,  WALL,  WALL,  WALL,  DOOR, DOOR,  WALL, WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  WALL,  DOOR, DOOR,  WALL, WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,C,   C],
    ]));

    // Destroyed house
    const RUBBLE = 0x795548;
    const RUBBLE_S = 0x5D4037;
    this.textures.set('destroyed_house', this.createSpriteTexture([
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     ROOF_S,ROOF,  C,     C,     C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF,  C,     C,     ROOF_S,C,     C],
      [C,     WALL,  WALL_H,C,     C,     C,     WALL_H,WALL,  C,     C],
      [C,     WALL,  C,     C,     RUBBLE,RUBBLE,C,     WALL,  C,     C],
      [C,     WALL_S,C,     RUBBLE_S,RUBBLE,RUBBLE_S,C, WALL_S,C,     C],
      [C,     WALL,  RUBBLE,RUBBLE_S,RUBBLE,RUBBLE,RUBBLE,WALL, C,     C],
      [C,     WALL_S,RUBBLE_S,RUBBLE,RUBBLE_S,RUBBLE,RUBBLE_S,WALL_S,C,C],
      [C,     RUBBLE_S,RUBBLE,RUBBLE_S,RUBBLE,RUBBLE_S,RUBBLE,RUBBLE_S,C,C],
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
    ]));

    const ROCK_L = 0x9E9E9E;
    const ROCK_M = 0x757575;
    const ROCK_D = 0x616161;
    const ROCK_H = 0xBDBDBD;

    this.textures.set('rock', this.createSpriteTexture([
      [C,     C,     C,     ROCK_H,ROCK_L,ROCK_H,C,     C,     C,     C],
      [C,     C,     ROCK_L,ROCK_M,ROCK_L,ROCK_M,ROCK_L,C,     C,     C],
      [C,     ROCK_L,ROCK_M,ROCK_D,ROCK_M,ROCK_D,ROCK_M,ROCK_L,C,     C],
      [ROCK_H,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_H,C],
      [ROCK_L,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_L,C],
      [C,     ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_D,ROCK_D,ROCK_D,C,     C],
      [C,     C,     ROCK_D,ROCK_D,ROCK_D,ROCK_D,ROCK_D,C,     C,     C],
      [C,     C,     C,     ROCK_D,ROCK_D,ROCK_D,C,     C,     C,     C],
    ]));

    const CHEST_WOOD = 0x6D4C41;
    const CHEST_WOOD_H = 0x8D6E63;
    const CHEST_WOOD_S = 0x4E342E;
    const CHEST_METAL = 0xFFB300;
    const CHEST_METAL_H = 0xFFD54F;
    const CHEST_LOCK = 0xFFC107;

    this.textures.set('chest', this.createSpriteTexture([
      [C,     C,     CHEST_WOOD,CHEST_WOOD_H,CHEST_WOOD,CHEST_WOOD_H,CHEST_WOOD,CHEST_WOOD,C,     C],
      [C,     CHEST_WOOD,CHEST_METAL,CHEST_METAL_H,CHEST_METAL,CHEST_METAL_H,CHEST_METAL,CHEST_METAL,CHEST_WOOD,C],
      [C,     CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD,CHEST_LOCK,CHEST_LOCK,CHEST_WOOD,CHEST_WOOD,CHEST_WOOD_S,C],
      [C,     CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD,C],
      [C,     CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,C],
    ]));

    const PORTAL_OUTER = 0x7B1FA2;
    const PORTAL_MID = 0xAB47BC;
    const PORTAL_INNER = 0xCE93D8;
    const PORTAL_CORE = 0xE1BEE7;
    const PORTAL_GLOW = 0xEA80FC;

    this.textures.set('portal', this.createSpriteTexture([
      [C,           C,           PORTAL_OUTER,PORTAL_OUTER,PORTAL_MID,  PORTAL_OUTER,PORTAL_OUTER,C,           C,           C],
      [C,           PORTAL_OUTER,PORTAL_MID,  PORTAL_MID,  PORTAL_INNER,PORTAL_MID,  PORTAL_MID,  PORTAL_OUTER,C,           C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_INNER,PORTAL_GLOW, PORTAL_CORE, PORTAL_GLOW, PORTAL_INNER,PORTAL_MID,  PORTAL_OUTER,C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_GLOW, PORTAL_CORE, 0xFFFFFF,    PORTAL_CORE, PORTAL_GLOW, PORTAL_MID,  PORTAL_OUTER,C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_INNER,PORTAL_GLOW, PORTAL_CORE, PORTAL_GLOW, PORTAL_INNER,PORTAL_MID,  PORTAL_OUTER,C],
      [C,           PORTAL_OUTER,PORTAL_MID,  PORTAL_MID,  PORTAL_INNER,PORTAL_MID,  PORTAL_MID,  PORTAL_OUTER,C,           C],
      [C,           C,           PORTAL_OUTER,PORTAL_OUTER,PORTAL_MID,  PORTAL_OUTER,PORTAL_OUTER,C,           C,           C],
    ]));

    // Small environmental sprites
    const PETAL = 0xF48FB1;
    const PETAL_H = 0xF8BBD0;
    const STEM = 0x388E3C;
    const STEM_S = 0x2E7D32;
    const POLLEN = 0xFFF176;

    this.textures.set('flower', this.createSpriteTexture([
      [C,     C,     PETAL_H,PETAL, C,     C],
      [C,     PETAL, POLLEN, POLLEN,PETAL_H,C],
      [PETAL_H,POLLEN,POLLEN,POLLEN,POLLEN,PETAL],
      [C,     PETAL, POLLEN, POLLEN,PETAL, C],
      [C,     C,     STEM,   STEM_S,C,     C],
      [C,     STEM,  STEM_S, STEM,  STEM,  C],
    ]));

    this.textures.set('mushroom', this.createSpriteTexture([
      [C,        C,        0xE53935,0xEF5350,0xE53935,0xEF5350,C,       C],
      [C,        0xE53935, 0xFFFFFF,0xE53935,0xE53935,0xFFFFFF, 0xE53935,C],
      [0xE53935, 0xE53935, 0xE53935,0xEF5350,0xE53935,0xE53935, 0xE53935,0xE53935],
      [C,        C,        C,       0xFFE0B2, 0xFFCC80,C,      C,       C],
      [C,        C,        C,       0xFFCC80,0xFFE0B2,C,       C,       C],
    ]));

    const SIGN_WOOD = 0x8D6E63;
    const SIGN_WOOD_H = 0xA1887F;
    const SIGN_WOOD_S = 0x6D4C41;
    const SIGN_POST = 0x5D4037;
    this.textures.set('sign', this.createSpriteTexture([
      [C,         C,         SIGN_WOOD,SIGN_WOOD_H,SIGN_WOOD,SIGN_WOOD_H,SIGN_WOOD,C,         C,         C],
      [C,         SIGN_WOOD, SIGN_WOOD_H,SIGN_WOOD_S,SIGN_WOOD,SIGN_WOOD_S,SIGN_WOOD_H,SIGN_WOOD,C,      C],
      [C,         SIGN_WOOD_S,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD_S,C,          C],
      [C,         C,         C,        C,         SIGN_POST,SIGN_POST,C,        C,         C,           C],
      [C,         C,         C,        C,         SIGN_POST,SIGN_POST,C,        C,         C,           C],
      [C,         C,         C,        C,         SIGN_POST,SIGN_POST,C,        C,         C,           C],
    ]));

    this.textures.set('well', this.createSpriteTexture([
      [C,          C,          0x795548,0x795548, 0x795548,0x795548, 0x795548,0x795548,C,          C],
      [C,          0x795548,  C,        C,         0x795548,C,        C,         0x795548,C,          C],
      [C,          0x78909C, 0x78909C,0x546E7A,0x1E88E5,0x546E7A,0x78909C,0x78909C,C, C],
      [C,          0x546E7A,0x78909C,0x1E88E5,0x1E88E5,0x1E88E5,0x78909C,0x546E7A,C,  C],
      [C,          C,          0x546E7A,0x78909C,0x78909C,0x78909C,0x546E7A,C,C,          C],
    ]));

    this.textures.set('campfire', this.createSpriteTexture([
      [C,     C,     C,     0xFFEB3B,0xFFEB3B,C,     C,     C],
      [C,     C,     0xFF9800,0xFFEB3B,0xFF9800,0xFF9800,C,     C],
      [C,     0xFF5722,0xFF9800,0xFFEB3B,0xFFEB3B,0xFF9800,0xFF5722,C],
      [C,     0xFF5722,0xFF5722,0xFF9800,0xFF9800,0xFF5722,0xFF5722,C],
      [0x5D4037,0x5D4037,0xFF5722,0xFF5722,0xFF5722,0xFF5722,0x5D4037,0x5D4037],
      [C,     0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,C],
    ]));

    this.textures.set('tombstone', this.createSpriteTexture([
      [C,     C,     0x9E9E9E,0x757575,0x757575,0x9E9E9E,C,     C],
      [C,     0x757575,0x757575,0x616161,0x616161,0x757575,0x757575,C],
      [C,     0x757575,0x616161,0x757575,0x757575,0x616161,0x757575,C],
      [C,     0x616161,0x757575,0x757575,0x757575,0x757575,0x616161,C],
      [C,     0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,C],
      [C,     C,     0x616161,0x616161,0x616161,0x616161,C,     C],
    ]));

    this.textures.set('stump', this.createSpriteTexture([
      [C,       0xBCAAA4,0x795548,0xBCAAA4,0x795548,0xBCAAA4,C],
      [0x795548, 0xBCAAA4,0x5D4037,0xBCAAA4,0x5D4037,0xBCAAA4,0x795548],
      [0x5D4037,0x795548,0x5D4037,0x795548,0x5D4037,0x795548,0x5D4037],
      [C,       0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,C],
    ]));

    this.textures.set('fence', this.createSpriteTexture([
      [0xA1887F, C,      0xA1887F, C,      0xA1887F, C,      0xA1887F, C],
      [0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41],
      [0x6D4C41, C,      0x6D4C41, C,      0x6D4C41, C,      0x6D4C41, C],
      [0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F],
    ]));

    this.textures.set('barrel', this.createSpriteTexture([
      [C,        0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,C],
      [0x546E7A, 0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x546E7A],
      [0x6D4C41, 0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41],
      [0x546E7A, 0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x546E7A],
      [C,        0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,C],
    ]));

    this.textures.set('crate', this.createSpriteTexture([
      [0x5D4037, 0x795548,0x795548,0x795548,0x795548,0x795548,0x5D4037],
      [0x795548, 0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x795548],
      [0x795548, 0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x795548],
      [0x795548, 0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x795548],
      [0x5D4037, 0x795548,0x795548,0x795548,0x795548,0x795548,0x5D4037],
    ]));

    this.textures.set('gate', this.createSpriteTexture([
      [0xA1887F, C,      C,      C,      C,      C,      0xA1887F],
      [0x6D4C41, C,      C,      C,      C,      C,      0x6D4C41],
      [0x6D4C41, C,      C,      C,      C,      C,      0x6D4C41],
      [0x6D4C41, C,      C,      C,      C,      C,      0x6D4C41],
      [0xA1887F, C,      C,      C,      C,      C,      0xA1887F],
    ]));

    // Spike trap
    const SPIKE = 0x90A4AE;
    const SPIKE_S = 0x546E7A;
    this.textures.set('spike_trap', this.createSpriteTexture([
      [C,      SPIKE, C,      SPIKE,  C,      SPIKE,  C,     C],
      [SPIKE_S,SPIKE, SPIKE_S,SPIKE,  SPIKE_S,SPIKE,  SPIKE_S,C],
      [C,      SPIKE_S,C,     SPIKE_S,C,      SPIKE_S,C,     C],
      [0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,0x616161],
    ]));

    this.textures.set('bones', this.createSpriteTexture([
      [C,     0xEEEEEE,C,     C,     0xEEEEEE,C],
      [0xEEEEEE,0xBDBDBD,0xEEEEEE,0xEEEEEE,0xBDBDBD,0xEEEEEE],
      [C,     C,     0xBDBDBD,0xEEEEEE,C,     C],
      [C,     0xEEEEEE,0xEEEEEE,0xBDBDBD,0xEEEEEE,C],
      [0xEEEEEE,0xBDBDBD,C,     C,     0xBDBDBD,0xEEEEEE],
    ]));
  }
}
