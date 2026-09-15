
import * as THREE from 'three';
import { BlockType } from '../types';
import { GAME_CONFIG, BLOCK_COLORS } from '../constants';
import { NoiseGenerator } from './Noise';

const CHUNK_SIZE = 16;

class Chunk {
  public meshes: Record<number, THREE.InstancedMesh> = {};
  public scene: THREE.Scene;
  public world: World;
  public cx: number;
  public cy: number;
  public cz: number;

  constructor(cx: number, cy: number, cz: number, scene: THREE.Scene, world: World) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.scene = scene;
    this.world = world;
  }

  public updateMeshes(geometry: THREE.BufferGeometry, materials: Record<number, THREE.Material>) {
    // Clean up old meshes
    Object.values(this.meshes).forEach(m => this.scene.remove(m));
    this.meshes = {};

    const typeInstances: Record<number, { x: number, y: number, z: number }[]> = {};

    // Collect all visible blocks in this chunk
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const wx = this.cx * CHUNK_SIZE + x;
          const wy = this.cy * CHUNK_SIZE + y;
          const wz = this.cz * CHUNK_SIZE + z;
          
          const type = this.world.getBlock(wx, wy, wz);
          if (type === BlockType.AIR) continue;

          if (this.world.isBlockExposed(wx, wy, wz)) {
            if (!typeInstances[type]) typeInstances[type] = [];
            typeInstances[type].push({ x: wx, y: wy, z: wz });
          }
        }
      }
    }

    // Create instanced meshes
    const dummy = new THREE.Object3D();
    for (const typeStr in typeInstances) {
      const type = Number(typeStr);
      const positions = typeInstances[type];
      const mesh = new THREE.InstancedMesh(geometry, materials[type], positions.length);
      
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.renderOrder = (type === BlockType.GLASS || type === BlockType.LEAVES) ? 10 : 0;
      mesh.castShadow = type !== BlockType.GLASS;
      mesh.receiveShadow = true;

      positions.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere(); // Necessary for raycasting
      this.meshes[type] = mesh;
      this.scene.add(mesh);
    }
  }

  public dispose() {
    Object.values(this.meshes).forEach(m => this.scene.remove(m));
    this.meshes = {};
  }
}

export class World {
  private data: Uint8Array;
  private chunks: Map<string, Chunk> = new Map();
  private noise = new NoiseGenerator(Date.now());
  private scene: THREE.Scene;
  private textures: Record<number, THREE.CanvasTexture> = {};
  private materials: Record<number, THREE.MeshStandardMaterial> = {};
  private sharedGeometry = new THREE.BoxGeometry(1, 1, 1);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.data = new Uint8Array(GAME_CONFIG.WORLD_SIZE * GAME_CONFIG.WORLD_HEIGHT * GAME_CONFIG.WORLD_SIZE);
    
    this.createTextures();
    this.createMaterials();
    this.generateTerrain();
    this.initChunks();
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + y * GAME_CONFIG.WORLD_SIZE + z * GAME_CONFIG.WORLD_SIZE * GAME_CONFIG.WORLD_HEIGHT;
  }

  private createTextures() {
    const size = 16;
    for (const typeStr in BlockType) {
      const type = Number(typeStr);
      if (isNaN(type) || type === BlockType.AIR) continue;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const baseColor = BLOCK_COLORS[type as BlockType];
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, size, size);

      if (type === BlockType.GLASS) {
        // Pixelated glass look
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(2, 2, 4, 1);
        ctx.fillRect(2, 2, 1, 4);
      } else {
        // Standard noise texture
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const rand = Math.random();
            let brightness = (rand - 0.5) * 50;
            
            // Special wood pattern
            if (type === BlockType.WOOD && y % 4 === 0) brightness = -30;
            
            ctx.fillStyle = this.adjustColor(baseColor, brightness);
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures[type] = texture;
    }
  }

  private createMaterials() {
    for (const typeStr in BlockType) {
      const type = Number(typeStr);
      if (isNaN(type) || type === BlockType.AIR) continue;

      const isTransparent = type === BlockType.GLASS || type === BlockType.LEAVES;
      this.materials[type] = new THREE.MeshStandardMaterial({
        map: this.textures[type],
        transparent: isTransparent,
        opacity: type === BlockType.GLASS ? 0.6 : 1.0,
        alphaTest: isTransparent ? 0.1 : 0,
        side: type === BlockType.GLASS ? THREE.DoubleSide : THREE.FrontSide,
        roughness: 0.8,
        metalness: 0.1,
      });
    }
  }

  private adjustColor(hex: string, amount: number): string {
    const color = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.max(0, Math.min(1, hsl.l + amount / 255));
    color.setHSL(hsl.h, hsl.s, hsl.l);
    return `#${color.getHexString()}`;
  }

  private generateTerrain() {
    const saved = localStorage.getItem('voxel_world_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([idx, val]) => this.data[Number(idx)] = val as number);
        return;
      } catch (e) { console.error(e); }
    }

    const { WORLD_SIZE, WORLD_HEIGHT } = GAME_CONFIG;

    for (let x = 0; x < WORLD_SIZE; x++) {
      for (let z = 0; z < WORLD_SIZE; z++) {
        const nx = x / WORLD_SIZE - 0.5;
        const nz = z / WORLD_SIZE - 0.5;
        const h = Math.floor(this.noise.perlin2d(nx * 3, nz * 3) * 8 + 10);

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          let type = BlockType.AIR;
          if (y < h - 4) type = BlockType.STONE;
          else if (y < h - 1) type = BlockType.DIRT;
          else if (y === h - 1) type = BlockType.GRASS;
          
          if (type !== BlockType.AIR) {
            this.data[this.getIndex(x, y, z)] = type;
          }
        }

        if (Math.random() < 0.012 && h < WORLD_HEIGHT - 7) {
          this.generateTree(x, h, z);
        }
      }
    }
  }

  private generateTree(x: number, y: number, z: number) {
    const height = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < height; i++) {
      if (y + i < GAME_CONFIG.WORLD_HEIGHT) this.data[this.getIndex(x, y + i, z)] = BlockType.WOOD;
    }
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        for (let ly = 0; ly <= 2; ly++) {
          if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly) < 4) {
            const tx = x + lx, ty = y + height + ly - 1, tz = z + lz;
            if (tx >= 0 && tx < GAME_CONFIG.WORLD_SIZE && ty >= 0 && ty < GAME_CONFIG.WORLD_HEIGHT && tz >= 0 && tz < GAME_CONFIG.WORLD_SIZE) {
              const idx = this.getIndex(tx, ty, tz);
              if (this.data[idx] === BlockType.AIR) this.data[idx] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }

  private initChunks() {
    const nx = Math.ceil(GAME_CONFIG.WORLD_SIZE / CHUNK_SIZE);
    const ny = Math.ceil(GAME_CONFIG.WORLD_HEIGHT / CHUNK_SIZE);
    
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        for (let z = 0; z < nx; z++) {
          const chunk = new Chunk(x, y, z, this.scene, this);
          this.chunks.set(`${x},${y},${z}`, chunk);
          chunk.updateMeshes(this.sharedGeometry, this.materials);
        }
      }
    }
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= GAME_CONFIG.WORLD_SIZE || y < 0 || y >= GAME_CONFIG.WORLD_HEIGHT || z < 0 || z >= GAME_CONFIG.WORLD_SIZE) return BlockType.AIR;
    return this.data[this.getIndex(Math.floor(x), Math.floor(y), Math.floor(z))];
  }

  public isBlockExposed(x: number, y: number, z: number) {
    const type = this.getBlock(x, y, z);
    const neighbors = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    
    for (const [dx, dy, dz] of neighbors) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const nt = this.getBlock(nx, ny, nz);
      
      // Face is visible if neighbor is Air
      if (nt === BlockType.AIR) return true;
      
      // Face is visible if we are solid and neighbor is transparent
      if (type !== BlockType.GLASS && nt === BlockType.GLASS) return true;
      
      // Face is visible if we are glass and neighbor is NOT glass (prevents inner face flickering)
      if (type === BlockType.GLASS && nt !== BlockType.GLASS) return true;
    }
    return false;
  }

  public setBlock(x: number, y: number, z: number, type: BlockType) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    if (ix < 0 || ix >= GAME_CONFIG.WORLD_SIZE || iy < 0 || iy >= GAME_CONFIG.WORLD_HEIGHT || iz < 0 || iz >= GAME_CONFIG.WORLD_SIZE) return;
    
    this.data[this.getIndex(ix, iy, iz)] = type;
    
    const cx = Math.floor(ix / CHUNK_SIZE), cy = Math.floor(iy / CHUNK_SIZE), cz = Math.floor(iz / CHUNK_SIZE);
    const affected = new Set([`${cx},${cy},${cz}`]);
    
    // Check if we need to update neighbors
    if (ix % CHUNK_SIZE === 0 && cx > 0) affected.add(`${cx-1},${cy},${cz}`);
    if (ix % CHUNK_SIZE === CHUNK_SIZE - 1) affected.add(`${cx+1},${cy},${cz}`);
    if (iy % CHUNK_SIZE === 0 && cy > 0) affected.add(`${cx},${cy-1},${cz}`);
    if (iy % CHUNK_SIZE === CHUNK_SIZE - 1) affected.add(`${cx},${cy+1},${cz}`);
    if (iz % CHUNK_SIZE === 0 && cz > 0) affected.add(`${cx},${cy},${cz-1}`);
    if (iz % CHUNK_SIZE === CHUNK_SIZE - 1) affected.add(`${cx},${cy},${cz+1}`);

    affected.forEach(key => {
      this.chunks.get(key)?.updateMeshes(this.sharedGeometry, this.materials);
    });
    
    this.saveWorld();
  }

  public getRaycastTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = [];
    this.chunks.forEach(c => {
      Object.values(c.meshes).forEach(m => targets.push(m));
    });
    return targets;
  }

  public saveWorld() {
    const obj: Record<number, number> = {};
    this.data.forEach((v, i) => { if (v !== 0) obj[i] = v; });
    localStorage.setItem('voxel_world_v3', JSON.stringify(obj));
  }
}
